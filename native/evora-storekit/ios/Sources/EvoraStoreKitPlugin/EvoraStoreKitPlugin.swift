import Foundation
import Capacitor
import StoreKit

/// Evora's StoreKit 2 bridge.
/// - Passes Apple's signed transaction (JWS) to JavaScript so the server can verify it.
/// - Never finishes a transaction until JavaScript calls `finish` after the server confirms.
/// - Runs the app's only `Transaction.updates` listener.
@objc(EvoraStoreKitPlugin)
public class EvoraStoreKitPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "EvoraStoreKitPlugin"
    public let jsName = "EvoraStoreKit"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getProducts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "finish", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "currentEntitlements", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "sync", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "manageSubscriptions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "drainPendingUpdates", returnType: CAPPluginReturnPromise)
    ]

    private let manager = StoreKitManager()
    private var updatesTask: Task<Void, Never>?

    override public func load() {
        guard #available(iOS 15.0, *) else { return }
        updatesTask = Task.detached { [weak self] in
            for await result in Transaction.updates {
                guard let self = self else { return }
                let payload = await self.manager.remember(result)
                // retainUntilConsumed queues the event if JS hasn't attached yet.
                self.notifyListeners("transactionUpdated", data: payload, retainUntilConsumed: true)
            }
        }
        // Surface anything left unfinished from a previous launch.
        Task { [weak self] in
            guard let self = self else { return }
            for await result in Transaction.unfinished {
                let payload = await self.manager.remember(result)
                self.notifyListeners("transactionUpdated", data: payload, retainUntilConsumed: true)
            }
        }
    }

    deinit { updatesTask?.cancel() }

    @objc func getProducts(_ call: CAPPluginCall) {
        let ids = call.getArray("ids", String.self) ?? []
        Task {
            do {
                let products = try await Product.products(for: ids)
                call.resolve(["products": products.map { p in
                    [
                        "id": p.id,
                        "displayName": p.displayName,
                        "description": p.description,
                        "displayPrice": p.displayPrice,
                        "price": NSDecimalNumber(decimal: p.price).doubleValue,
                        "currencyCode": p.priceFormatStyle.currencyCode
                    ] as [String: Any]
                }])
            } catch {
                call.reject("Couldn't load products: \(error.localizedDescription)")
            }
        }
    }

    @objc func purchase(_ call: CAPPluginCall) {
        guard let productId = call.getString("productId") else {
            call.reject("productId is required"); return
        }
        guard let tokenString = call.getString("appAccountToken"),
              let token = UUID(uuidString: tokenString) else {
            call.reject("A valid appAccountToken (account UUID) is required"); return
        }
        Task {
            do {
                guard let product = try await Product.products(for: [productId]).first else {
                    call.resolve(["status": "failed", "message": "Product not found"]); return
                }
                let result = try await product.purchase(options: [.appAccountToken(token)])
                switch result {
                case .success(let verification):
                    var payload = await self.manager.remember(verification)
                    payload["status"] = "success"
                    call.resolve(payload)
                case .userCancelled:
                    call.resolve(["status": "cancelled"])
                case .pending:
                    call.resolve(["status": "pending"])
                @unknown default:
                    call.resolve(["status": "failed", "message": "Unknown purchase result"])
                }
            } catch {
                call.resolve(["status": "failed", "message": error.localizedDescription])
            }
        }
    }

    @objc func finish(_ call: CAPPluginCall) {
        guard let id = call.getString("transactionId") else {
            call.reject("transactionId is required"); return
        }
        Task {
            let finished = await self.manager.finish(id)
            call.resolve(["finished": finished])
        }
    }

    @objc func currentEntitlements(_ call: CAPPluginCall) {
        Task {
            var items: [[String: Any]] = []
            for await result in Transaction.currentEntitlements {
                let payload = await self.manager.remember(result)
                items.append(payload)
            }
            call.resolve(["transactions": items])
        }
    }

    @objc func sync(_ call: CAPPluginCall) {
        Task {
            do {
                try await AppStore.sync()
                call.resolve(["synced": true])
            } catch {
                call.reject("Couldn't reach the App Store: \(error.localizedDescription)")
            }
        }
    }

    @objc func manageSubscriptions(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard let scene = UIApplication.shared.connectedScenes
                .first(where: { $0.activationState == .foregroundActive }) as? UIWindowScene else {
                call.reject("No active window"); return
            }
            do {
                try await AppStore.showManageSubscriptions(in: scene)
                call.resolve()
            } catch {
                call.reject(error.localizedDescription)
            }
        }
    }

    /// Returns transactions remembered but not yet finished (safety net for JS).
    @objc func drainPendingUpdates(_ call: CAPPluginCall) {
        Task {
            call.resolve(["transactions": await self.manager.pendingPayloads()])
        }
    }
}
