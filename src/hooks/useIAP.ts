import { useCallback, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Purchases, LOG_LEVEL } from "@revenuecat/purchases-capacitor";
import { supabase } from "@/integrations/supabase/client";

// ============================================================================
// RevenueCat configuration
// ============================================================================
// Paste your iOS PUBLIC SDK key from RevenueCat → Project settings → API keys.
// (Public keys are safe to ship in client code. Do NOT use a secret key here.)
const REVENUECAT_IOS_API_KEY = "appl_REPLACE_ME";

// Apple App Store Connect product identifiers
export const IAP_PRODUCT_IDS = [
  "com.thiskid7.evora.weekly",
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
): "evora_weekly" | "evora_monthly" | "evora_yearly" | null {
  if (productId === "com.thiskid7.evora.weekly") return "evora_weekly";
  if (productId === "com.thiskid7.evora.monthly") return "evora_monthly";
  if (productId === "com.thiskid7.evora.yearly") return "evora_yearly";
  return null;
}

export function isIAPPlatform(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
}

// ============================================================================
// SDK init (singleton)
// ============================================================================
let configurePromise: Promise<void> | null = null;

const configureRevenueCat = async (): Promise<void> => {
  if (configurePromise) return configurePromise;
  configurePromise = (async () => {
    if (!REVENUECAT_IOS_API_KEY || REVENUECAT_IOS_API_KEY.includes("REPLACE_ME")) {
      throw new Error(
        "RevenueCat iOS API key is not set. Edit src/hooks/useIAP.ts and paste your appl_… key.",
      );
    }

    // Tie purchases to the Supabase user when signed in.
    const { data } = await supabase.auth.getUser();
    const appUserID = data.user?.id;

    await Purchases.setLogLevel({ level: LOG_LEVEL.WARN });
    await Purchases.configure({
      apiKey: REVENUECAT_IOS_API_KEY,
      appUserID,
    });
  })();
  return configurePromise;
};

// Sync the latest entitlement state from RevenueCat → our subscriptions table.
const syncSubscriptionToBackend = async () => {
  const { error } = await supabase.functions.invoke(
    "sync-revenuecat-subscription",
    { body: {} },
  );
  if (error) throw error;
};

// ============================================================================
// Hook
// ============================================================================
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
      await configureRevenueCat();
      const result = await Purchases.getProducts({
        productIdentifiers: [...IAP_PRODUCT_IDS],
      });
      const mapped: IAPProduct[] = (result.products || []).map((p: any) => ({
        identifier: p.identifier,
        title: p.title ?? p.identifier,
        description: p.description ?? "",
        priceString: p.priceString ?? "",
        price: typeof p.price === "number" ? p.price : 0,
        currencyCode: p.currencyCode,
      }));
      setProducts(mapped);
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
        await configureRevenueCat();
        const result = await Purchases.getProducts({
          productIdentifiers: [productId],
        });
        const storeProduct = result.products?.[0];
        if (!storeProduct) {
          throw new Error("This Apple product is not available yet. Check App Store Connect and RevenueCat.");
        }
        await Purchases.purchaseStoreProduct({ product: storeProduct as any });
        await syncSubscriptionToBackend();
        return { ok: true };
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
      await configureRevenueCat();
      await Purchases.restorePurchases();
      await syncSubscriptionToBackend();
      return { ok: true };
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
