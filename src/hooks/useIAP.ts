import { useCallback, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

// Apple App Store Connect product identifiers
export const IAP_PRODUCT_IDS = [
  "com.thiskid7.evora.monthly",
  "com.thiskid7.evora.yearly",
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
  if (productId === "com.thiskid7.evora.monthly") return "evora_monthly";
  if (productId === "com.thiskid7.evora.yearly") return "evora_yearly";
  return null;
}

export function isIAPPlatform(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
}

type SubscriptionsModule = typeof import("@squareetlabs/capacitor-subscriptions");
type SubsApi = SubscriptionsModule["Subscriptions"];

let subsPromise: Promise<SubsApi> | null = null;

const loadSubscriptions = async (): Promise<SubsApi> => {
  if (subsPromise) return subsPromise;
  subsPromise = import("@squareetlabs/capacitor-subscriptions").then(
    (m) => m.Subscriptions,
  );
  return subsPromise;
};

const syncEntitlement = async (payload: {
  productId: string;
  transactionId?: string | number | null;
  expirationDateMs?: number | null;
  isTrial?: boolean;
}) => {
  const { data, error } = await supabase.functions.invoke(
    "sync-apple-subscription",
    { body: payload },
  );
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
};

/**
 * Native Apple In-App Purchases hook backed by StoreKit 2 via
 * @squareetlabs/capacitor-subscriptions (SPM-compatible, no Cordova).
 * Web and Android fall back to no-op so the existing Stripe flow keeps working.
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
      const Subscriptions = await loadSubscriptions();
      const results = await Promise.all(
        IAP_PRODUCT_IDS.map(async (id): Promise<IAPProduct | null> => {
          try {
            const res: any = await Subscriptions.getProductDetails({
              productIdentifier: id,
            });
            const d = res?.data;
            if (!d) return null;
            const priceString: string = d.displayPrice ?? d.price ?? "";
            const numeric = parseFloat(
              priceString.replace(/[^0-9.,-]/g, "").replace(",", "."),
            );
            return {
              identifier: d.id ?? id,
              title: d.displayName ?? "",
              description: d.description ?? "",
              priceString,
              price: Number.isFinite(numeric) ? numeric : 0,
              currencyCode: d.currencyCode,
            };
          } catch (err) {
            console.error("[IAP] getProductDetails failed for", id, err);
            return null;
          }
        }),
      );
      setProducts(results.filter((x): x is IAPProduct => x !== null));
    } catch (err) {
      console.error("[IAP] loadProducts failed:", err);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const purchase = useCallback(
    async (productId: IAPProductId) => {
      if (!enabled) throw new Error("In-App Purchases are only available in the iOS app.");
      setBusy(true);
      try {
        const Subscriptions = await loadSubscriptions();
        const res: any = await Subscriptions.purchaseProduct({
          productIdentifier: productId,
        });
        // responseCode: 0 success, others = failure / user cancelled
        if (res?.responseCode !== 0) {
          throw new Error(res?.responseMessage || "Apple purchase failed.");
        }
        const transactionId = res?.data ?? null;

        // Pull the latest transaction so we can populate expiry / trial state.
        let expirationDateMs: number | null = null;
        let isTrial = false;
        try {
          const latest: any = await Subscriptions.getLatestTransaction({
            productIdentifier: productId,
          });
          const tx = latest?.data;
          if (tx?.expirationDate)
            expirationDateMs = new Date(tx.expirationDate).getTime();
          if (tx?.isTrial === true || tx?.offerType === "introductory") isTrial = true;
        } catch (err) {
          console.warn("[IAP] getLatestTransaction failed:", err);
        }

        return await syncEntitlement({
          productId,
          transactionId,
          expirationDateMs,
          isTrial,
        });
      } finally {
        setBusy(false);
      }
    },
    [enabled],
  );

  const restore = useCallback(async () => {
    if (!enabled) throw new Error("Restore is only available in the iOS app.");
    setBusy(true);
    try {
      const Subscriptions = await loadSubscriptions();
      const res: any = await Subscriptions.getCurrentEntitlements();
      const entitlements: any[] = Array.isArray(res?.data) ? res.data : [];

      // Pick the entitlement with the latest expirationDate.
      let pick: any = null;
      for (const e of entitlements) {
        const exp = e?.expirationDate ? new Date(e.expirationDate).getTime() : 0;
        const cur = pick?.expirationDate
          ? new Date(pick.expirationDate).getTime()
          : 0;
        if (!pick || exp > cur) pick = e;
      }

      if (!pick) {
        return await syncEntitlement({ productId: "", expirationDateMs: 0 });
      }

      return await syncEntitlement({
        productId: pick.productIdentifier ?? pick.productId ?? "",
        transactionId: pick.transactionId ?? null,
        expirationDateMs: pick.expirationDate
          ? new Date(pick.expirationDate).getTime()
          : null,
        isTrial: pick.isTrial === true || pick.offerType === "introductory",
      });
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
