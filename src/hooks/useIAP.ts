import { useCallback, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

// Apple App Store Connect product identifiers (must match RevenueCat product IDs)
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

// RevenueCat iOS public SDK key. Add VITE_REVENUECAT_IOS_KEY to your .env.
const RC_IOS_KEY = import.meta.env.VITE_REVENUECAT_IOS_KEY as string | undefined;

type RCModule = typeof import("@revenuecat/purchases-capacitor");

let rcInitPromise: Promise<{
  Purchases: RCModule["Purchases"];
  packagesById: Map<string, any>;
}> | null = null;

const loadRevenueCat = async (appUserId: string) => {
  if (rcInitPromise) return rcInitPromise;

  rcInitPromise = (async () => {
    if (!RC_IOS_KEY) {
      throw new Error(
        "VITE_REVENUECAT_IOS_KEY is missing. Add it to your .env to enable Apple purchases.",
      );
    }
    const mod = await import("@revenuecat/purchases-capacitor");
    const { Purchases, LOG_LEVEL } = mod;
    await Purchases.setLogLevel({ level: LOG_LEVEL.WARN });
    await Purchases.configure({ apiKey: RC_IOS_KEY, appUserID: appUserId });

    const offerings = await Purchases.getOfferings();
    const packagesById = new Map<string, any>();
    const all = [
      ...(offerings.current?.availablePackages ?? []),
      ...Object.values(offerings.all ?? {}).flatMap(
        (o: any) => o.availablePackages ?? [],
      ),
    ];
    for (const pkg of all) {
      const id = pkg?.product?.identifier;
      if (id && !packagesById.has(id)) packagesById.set(id, pkg);
    }
    return { Purchases, packagesById };
  })();

  return rcInitPromise;
};

const syncSubscription = async () => {
  const { data, error } = await supabase.functions.invoke(
    "sync-revenuecat-subscription",
    { body: {} },
  );
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
};

/**
 * Native Apple In-App Purchases hook backed by RevenueCat (SPM-compatible).
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
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) {
        setLoading(false);
        return;
      }
      const { packagesById } = await loadRevenueCat(userId);
      const mapped: IAPProduct[] = IAP_PRODUCT_IDS.map((id) => {
        const pkg = packagesById.get(id);
        const p = pkg?.product;
        if (!p) return null;
        return {
          identifier: p.identifier,
          title: p.title ?? "",
          description: p.description ?? "",
          priceString: p.priceString ?? "",
          price: typeof p.price === "number" ? p.price : 0,
          currencyCode: p.currencyCode,
        } satisfies IAPProduct;
      }).filter((x): x is IAPProduct => !!x);
      setProducts(mapped);
    } catch (err) {
      console.error("[IAP] getProducts failed:", err);
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
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;
        if (!userId) throw new Error("You must be signed in to purchase.");

        const { Purchases, packagesById } = await loadRevenueCat(userId);
        const pkg = packagesById.get(productId);
        if (!pkg)
          throw new Error(
            "This Apple product is not available yet. Check RevenueCat offerings and App Store Connect.",
          );
        await Purchases.purchasePackage({ aPackage: pkg });
        return await syncSubscription();
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
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("You must be signed in to restore.");
      const { Purchases } = await loadRevenueCat(userId);
      await Purchases.restorePurchases();
      return await syncSubscription();
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
