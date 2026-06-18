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

// Maps an Apple product ID to the price_id used in the subscriptions table
export function priceIdForApple(productId: string): "evora_monthly" | "evora_yearly" | null {
  if (productId === "com.thiskid7.evora.monthly") return "evora_monthly";
  if (productId === "com.thiskid7.evora.yearly") return "evora_yearly";
  return null;
}

export function isIAPPlatform(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
}

/**
 * Native Apple In-App Purchases hook (uses @capgo/native-purchases).
 * Web (and Android, for now) falls back to no-op so existing Stripe flow keeps working.
 */
export function useIAP() {
  const enabled = isIAPPlatform();
  const [products, setProducts] = useState<IAPProduct[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [busy, setBusy] = useState(false);

  // Lazy-load the plugin only on native so the web bundle doesn't try to use it.
  const getPlugin = useCallback(async () => {
    const mod = await import("@capgo/native-purchases");
    return mod.NativePurchases;
  }, []);

  const loadProducts = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    try {
      const NativePurchases = await getPlugin();
      const { products: list } = await NativePurchases.getProducts({
        productIdentifiers: [...IAP_PRODUCT_IDS],
        // subs
        productType: "subs" as any,
      });
      const mapped: IAPProduct[] = (list || []).map((p: any) => ({
        identifier: p.identifier,
        title: p.title,
        description: p.description,
        priceString: p.priceString ?? `${p.price}`,
        price: p.price,
        currencyCode: p.currencyCode,
      }));
      setProducts(mapped);
    } catch (err) {
      console.error("[IAP] getProducts failed:", err);
    } finally {
      setLoading(false);
    }
  }, [enabled, getPlugin]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  /**
   * Sends the StoreKit receipt to the validate-apple-receipt edge function,
   * which verifies with Apple and upserts the subscription row.
   */
  const validateReceipt = useCallback(
    async (receipt: string, productId: string) => {
      const { data, error } = await supabase.functions.invoke("validate-apple-receipt", {
        body: { receipt, productId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    [],
  );

  const purchase = useCallback(
    async (productId: IAPProductId) => {
      if (!enabled) throw new Error("In-App Purchases are only available in the iOS app.");
      setBusy(true);
      try {
        const NativePurchases = await getPlugin();
        const tx: any = await NativePurchases.purchaseProduct({
          productIdentifier: productId,
          productType: "subs" as any,
        });
        const receipt: string | undefined = tx?.receipt;
        if (!receipt) throw new Error("No receipt returned from StoreKit.");
        const result = await validateReceipt(receipt, productId);
        return result;
      } finally {
        setBusy(false);
      }
    },
    [enabled, getPlugin, validateReceipt],
  );

  const restore = useCallback(async () => {
    if (!enabled) throw new Error("Restore is only available in the iOS app.");
    setBusy(true);
    try {
      const NativePurchases = await getPlugin();
      // Triggers StoreKit refresh; on iOS the app receipt is updated on disk.
      await NativePurchases.restorePurchases();

      // Re-read the up-to-date app receipt and send it to the server for validation.
      // The plugin exposes the receipt on each transaction; easiest portable way is to
      // attempt a no-op getProducts then read the bundled receipt via StoreKit. Since
      // the plugin doesn't expose a standalone "get receipt" call, we ask the server
      // to look up by user_id — the server will see the most recent valid receipt the
      // next time the user purchases. For "restore", server-side state lookup is enough:
      const { data, error } = await supabase.functions.invoke("validate-apple-receipt", {
        body: { restore: true },
      });
      if (error) throw error;
      return data;
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
