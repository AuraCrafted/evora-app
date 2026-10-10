import { useCallback, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import type { StoreKitTransaction } from "evora-storekit";

// Apple App Store Connect product identifiers
export const IAP_PRODUCT_IDS = [
  "evora_id_monthly",
  "evora_id_yearly",
] as const;

export type IAPProductId = (typeof IAP_PRODUCT_IDS)[number];

export interface IAPProduct {
  identifier: string;
  title: string;
  description: string;
  priceString: string;
  price: number;
  currencyCode?: string;
}

export function priceIdForApple(
  productId: string,
): "evora_monthly" | "evora_yearly" | null {
  if (productId === "evora_id_monthly") return "evora_monthly";
  if (productId === "evora_id_yearly") return "evora_yearly";
  return null;
}

export function isIAPPlatform(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
}

export class AppleIAPError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = "AppleIAPError";
    this.code = code;
  }
}

export function isApplePurchaseCancelled(error: unknown): boolean {
  return (error as AppleIAPError)?.code === "cancelled";
}

export function appleIAPErrorMessage(error: unknown): string {
  return (error as Error)?.message || "Apple purchase failed. Please try again.";
}

const loadStoreKit = () => import("evora-storekit").then((m) => m.EvoraStoreKit);

export type VerifyResult = {
  result: "active" | "inactive" | "none";
  price_id: string | null;
  current_period_end: string | null;
};

/** Sends signed transactions to the server, which verifies them with Apple. */
async function verifyWithServer(body: {
  signedTransactions?: string[];
  reconcile?: boolean;
}): Promise<VerifyResult> {
  const { data, error } = await supabase.functions.invoke("sync-apple-subscription", { body });
  if (error) {
    let msg = "Couldn't verify the purchase with Apple. Please try again.";
    try {
      const ctx = await (error as any).context?.json?.();
      if (ctx?.error) msg = ctx.error;
    } catch { /* keep default */ }
    throw new AppleIAPError(msg, "verify");
  }
  if (data?.error) throw new AppleIAPError(data.error, data.code ?? "verify");
  return data as VerifyResult;
}

/**
 * Verifies transactions with the server and only then finishes them in
 * StoreKit, so an unconfirmed purchase is redelivered on the next launch.
 */
export async function processTransactions(txs: StoreKitTransaction[]): Promise<VerifyResult> {
  if (!txs.length) return { result: "none", price_id: null, current_period_end: null };
  const res = await verifyWithServer({ signedTransactions: txs.map((t) => t.jws) });
  const sk = await loadStoreKit();
  for (const t of txs) {
    try {
      await sk.finish({ transactionId: t.transactionId });
    } catch (e) {
      console.warn("[IAP] finish failed", t.transactionId, e);
    }
  }
  return res;
}

/** Server-side re-check of stored Apple subscriptions (throttled on the server). */
export async function reconcileAppleSubscription(): Promise<void> {
  if (!isIAPPlatform()) return;
  try {
    await verifyWithServer({ reconcile: true });
  } catch (e) {
    console.warn("[IAP] reconcile failed", e);
  }
}

export type RestoreOutcome = "restored" | "none";

/**
 * Native Apple In-App Purchases backed by Evora's StoreKit 2 bridge.
 * Web and Android are no-ops so the existing Stripe flow keeps working.
 */
export function useIAP() {
  const enabled = isIAPPlatform();
  const [products, setProducts] = useState<IAPProduct[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [busy, setBusy] = useState(false);

  const loadProducts = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    try {
      const sk = await loadStoreKit();
      const res = await sk.getProducts({ ids: [...IAP_PRODUCT_IDS] });
      setProducts(
        res.products.map((p) => ({
          identifier: p.id,
          title: p.displayName,
          description: p.description,
          priceString: p.displayPrice,
          price: p.price,
          currencyCode: p.currencyCode,
        })),
      );
    } catch (e) {
      console.error("[IAP] Failed to load products", e);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  /** Purchases, then waits for the server's verdict. Resolves only when Apple confirmed access. */
  const purchase = useCallback(
    async (productId: IAPProductId): Promise<VerifyResult> => {
      if (!enabled) throw new AppleIAPError("In-App Purchases are only available in the iOS app.");
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (!userId) throw new AppleIAPError("Please sign in before purchasing.", "auth");
      setBusy(true);
      try {
        const sk = await loadStoreKit();
        const res = await sk.purchase({ productId, appAccountToken: userId });
        if (res.status === "cancelled") throw new AppleIAPError("Purchase cancelled.", "cancelled");
        if (res.status === "pending") {
          throw new AppleIAPError(
            "Your purchase is waiting for approval. Access unlocks once Apple confirms it.",
            "pending",
          );
        }
        if (res.status !== "success") {
          throw new AppleIAPError(("message" in res && res.message) || "Apple purchase failed.", "failed");
        }
        const verdict = await processTransactions([res]);
        if (verdict.result !== "active") {
          throw new AppleIAPError("Apple didn't confirm an active subscription.", "inactive");
        }
        return verdict;
      } finally {
        setBusy(false);
      }
    },
    [enabled],
  );

  /** AppStore.sync, then server verification of current entitlements. */
  const restore = useCallback(async (): Promise<RestoreOutcome> => {
    if (!enabled) throw new AppleIAPError("Restore is only available in the iOS app.");
    setBusy(true);
    try {
      const sk = await loadStoreKit();
      await sk.sync();
      const { transactions } = await sk.currentEntitlements();
      const ours = transactions.filter((t) => priceIdForApple(t.productId));
      if (!ours.length) return "none";
      const verdict = await processTransactions(ours);
      return verdict.result === "active" ? "restored" : "none";
    } finally {
      setBusy(false);
    }
  }, [enabled]);

  return {
    enabled,
    loading,
    busy,
    products,
    purchase,
    restore,
    reloadProducts: loadProducts,
  };
}
