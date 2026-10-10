# Evora native StoreKit 2 bridge (Capacitor 8, iOS)

## Key facts found
- The repo has no `ios/` folder. The Xcode project exists only on your Mac, so nothing written here reaches Xcode until you `git pull` and run `npx cap sync ios`.
- Current plugin calls (all must be replaced):
  - `src/pages/Plans.tsx`: `Subscriptions.getProductDetails` (line 214), `purchaseProduct` (237), `getLatestTransaction` (259), plus its import (27).
  - `src/hooks/useIAP.ts`: dynamic import (96-103), `getProductDetails` (149), `purchaseProduct` (196), `getLatestTransaction` (214), `getCurrentEntitlements` (256).
- The old plugin starts its own `Transaction.updates` and `Transaction.unfinished` listeners at launch and finishes every transaction before the app sees it. Two listeners would race and the server would miss renewals, so the old plugin cannot coexist.

## 1. Where the native code lives (survives `npx cap sync`)
A local Capacitor plugin package inside the repo, installed as a file dependency:

```text
native/evora-storekit/
  package.json            name "evora-storekit", "capacitor": { "ios": { "src": "ios" } }
  Package.swift           SPM target, depends on capacitor-swift-pm 8.x, iOS 15+
  ios/Sources/EvoraStoreKitPlugin/
    EvoraStoreKitPlugin.swift   CAPPlugin + CAPBridgedPlugin, method table
    StoreKitManager.swift       StoreKit 2 logic (actor)
  src/index.ts, definitions.ts  registerPlugin("EvoraStoreKit") + types
```
Root `package.json` gets `"evora-storekit": "file:./native/evora-storekit"`. `npx cap sync ios` then adds it to the generated `CapApp-SPM` package automatically. No manual Xcode registration, no storyboard or ViewController edits, and nothing in `ios/App/App` that sync could overwrite. Lovable can write and update the Swift because it lives in the repo.

## 2. Native API (StoreKit 2)
- `getProducts({ ids })`: localized name and price.
- `purchase({ productId, appAccountToken })`: `Product.purchase(options: [.appAccountToken(uuid)])`. Returns `{ status: success|cancelled|pending|failed, jws, transactionId, originalTransactionId }`. **Does not finish** the transaction.
- `finish({ transactionId })`: finishes only after the server confirms.
- `currentEntitlements()`: array of `{ jws, productId, transactionId, originalTransactionId }`.
- `sync()`: `AppStore.sync()` for Restore (may show an Apple sign-in prompt).
- `manageSubscriptions()`: opens Apple's management sheet.
- Event `transactionUpdated` with `{ jws, ... }`: a single `Transaction.updates` listener started at plugin load. Updates are queued natively until JS attaches, so launch-time renewals are not lost.
- All transactions are passed through as `jwsRepresentation`. Native verification is only a pre-check; the server re-verifies.

## 3. TypeScript changes
- `src/lib/storekit.ts` (new): thin wrapper over `evora-storekit`, no-op on web.
- `src/hooks/useIAP.ts`: rewrite on the new API. Flow: purchase -> send JWS to the server -> server verifies with Apple and saves -> then `finish`. Restore: `sync()` -> `currentEntitlements()` -> send JWS -> show "restored", "no active purchases" or an error.
- `src/pages/Plans.tsx`: remove the direct plugin calls and debug probes; use `useIAP().purchase`. Product ID mapping unchanged.
- `src/hooks/useSubscription.ts`: on app open or resume (`@capacitor/app` `resume`), call the server reconcile, throttled.
- `src/components/AppIAPListener.tsx` (new, mounted in `App.tsx`): handles `transactionUpdated` -> server -> `finish`.
- `src/pages/Settings.tsx`: restore messages.
- appAccountToken = the signed-in user's id (UUID). Purchase is blocked when signed out, as today.

## 4. Server (Supabase stays the source of truth)
As in the earlier plan: rewrite `sync-apple-subscription` to verify the JWS (Apple certificate chain), check bundle ID, then confirm the subscription through the App Store Server API, falling back from Production to Sandbox. Add `apple-notifications` (Notifications V2, idempotent), add the additive `subscriptions` columns and the `apple_notification_events` table, and reject an `appAccountToken` that doesn't match the caller. The `price_id` values `evora_monthly`/`evora_yearly` and every feature gate stay unchanged. This needs the In-App Purchase key, Key ID, Issuer ID and Apple ID listed earlier.

## 5. Remove the old plugin
Yes. Uninstall `@squareetlabs/capacitor-subscriptions` in the same release as the new bridge, never both active. On your Mac, `npx cap sync ios` removes it from `CapApp-SPM` automatically.

## 6. Safest order
1. Server first (no app impact): DB columns, shared Apple verification, new `sync-apple-subscription` accepting JWS, `apple-notifications`. Keep the old endpoint behavior off: unverified requests are rejected.
2. Native package `native/evora-storekit` plus TS wrapper.
3. Switch `useIAP.ts`, `Plans.tsx`, Settings, add the listener and resume reconcile; uninstall the old plugin.
4. You, on the Mac: `git pull`, `npm install`, `npx cap sync ios`, then in Xcode confirm `EvoraStoreKit` appears under package dependencies and run with the `.storekit` file for local tests.
5. Set the V2 notification URLs in App Store Connect (production and sandbox).
6. Sandbox tester on a real iPhone: buy, renew (5-minute months), upgrade Elevate to Evolve, cancel, refund via StoreKit test, restore on a reinstall.

## Technical notes
- Minimum iOS 15 (StoreKit 2). Your Xcode deployment target must be 15+.
- Local `.storekit` testing signs transactions with a local Xcode certificate that the server can't verify against Apple. Server verification is only testable with Sandbox on a device or TestFlight. Local Xcode tests cover the purchase UI only.
