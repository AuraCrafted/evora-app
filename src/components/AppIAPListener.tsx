import { useEffect } from "react";
import { App as CapApp } from "@capacitor/app";
import { useAuth } from "@/hooks/useAuth";
import {
  isIAPPlatform,
  processTransactions,
  reconcileAppleSubscription,
} from "@/hooks/useIAP";

/**
 * iOS only. Forwards StoreKit transaction updates (renewals, upgrades,
 * Ask to Buy approvals) to the server, finishing them after verification,
 * and re-checks the subscription with Apple when the app opens or resumes.
 */
export const AppIAPListener = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!isIAPPlatform() || !user) return;
    let cancelled = false;
    const handles: { remove: () => Promise<void> }[] = [];

    const refreshed = () => window.dispatchEvent(new Event("evora:subscription-changed"));

    (async () => {
      const { EvoraStoreKit } = await import("evora-storekit");
      if (cancelled) return;

      handles.push(
        await EvoraStoreKit.addListener("transactionUpdated", async (tx) => {
          try {
            await processTransactions([tx]);
            refreshed();
          } catch (e) {
            // Left unfinished: StoreKit redelivers it on the next launch.
            console.warn("[IAP] update not verified yet", e);
          }
        }),
      );

      try {
        const { transactions } = await EvoraStoreKit.drainPendingUpdates();
        if (transactions.length) {
          await processTransactions(transactions);
          refreshed();
        }
      } catch (e) {
        console.warn("[IAP] pending updates not verified yet", e);
      }

      await reconcileAppleSubscription();
      refreshed();

      handles.push(
        await CapApp.addListener("resume", async () => {
          await reconcileAppleSubscription();
          refreshed();
        }),
      );
    })();

    return () => {
      cancelled = true;
      handles.forEach((h) => h.remove());
    };
  }, [user]);

  return null;
};
