import Foundation
import StoreKit

/// Keeps verified-but-unfinished transactions so they are finished exactly once,
/// only after the Evora server has confirmed them.
@available(iOS 15.0, *)
actor StoreKitManager {
    private var pending: [String: Transaction] = [:]
    private var payloads: [String: [String: Any]] = [:]

    func remember(_ result: VerificationResult<Transaction>) -> [String: Any] {
        let jws = result.jwsRepresentation
        switch result {
        case .verified(let tx):
            let id = String(tx.id)
            pending[id] = tx
            let payload: [String: Any] = [
                "jws": jws,
                "transactionId": id,
                "originalTransactionId": String(tx.originalID),
                "productId": tx.productID,
                "verifiedOnDevice": true
            ]
            payloads[id] = payload
            return payload
        case .unverified(let tx, let error):
            // Still forwarded: the server makes the final decision.
            return [
                "jws": jws,
                "transactionId": String(tx.id),
                "originalTransactionId": String(tx.originalID),
                "productId": tx.productID,
                "verifiedOnDevice": false,
                "deviceError": error.localizedDescription
            ]
        }
    }

    func finish(_ id: String) async -> Bool {
        guard let tx = pending.removeValue(forKey: id) else { return false }
        payloads.removeValue(forKey: id)
        await tx.finish()
        return true
    }

    func pendingPayloads() -> [[String: Any]] {
        Array(payloads.values)
    }
}
