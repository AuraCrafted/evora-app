import { useCallback, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    CdvPurchase?: any;
    store?: any;
  }
}

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

type ReceiptValidator = (receipt: string, productId?: string) => Promise<any>;

type PendingPurchase = {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
  timer: number;
};

let storeInitPromise: Promise<{ cdv: any; store: any }> | null = null;
let activeValidator: ReceiptValidator | null = null;
const pendingPurchases = new Map<string, PendingPurchase>();

const waitForPurchaseGlobal = async () => {
  if (window.CdvPurchase?.store) return window.CdvPurchase;

  await new Promise<void>((resolve) => {
    let attempts = 0;
    const done = () => resolve();
    document.addEventListener("deviceready", done, { once: true });
    const poll = window.setInterval(() => {
      attempts += 1;
      if (window.CdvPurchase?.store || attempts >= 80) {
        window.clearInterval(poll);
        document.removeEventListener("deviceready", done);
        resolve();
      }
    }, 125);
  });

  if (!window.CdvPurchase?.store) {
    throw new Error("Apple purchases are not available in this iOS build. Run npm install, then npx cap sync ios.");
  }
  return window.CdvPurchase;
};

const extractReceipt = (store: any, transaction?: any): string | null => {
  const fromTransaction = transaction?.parentReceipt?.nativeData?.appStoreReceipt;
  if (fromTransaction) return fromTransaction;

  const receipts = store?.localReceipts || [];
  for (const receipt of receipts) {
    const appStoreReceipt = receipt?.nativeData?.appStoreReceipt;
    if (appStoreReceipt) return appStoreReceipt;
  }
  return null;
};

const productIdFromTransaction = (transaction: any): string | undefined =>
  transaction?.products?.[0]?.id || transaction?.productId;

const rejectPending = (productId: string | undefined, error: any) => {
  if (!productId) return;
  const pending = pendingPurchases.get(productId);
  if (!pending) return;
  window.clearTimeout(pending.timer);
  pendingPurchases.delete(productId);
  pending.reject(error);
};

const resolvePending = (productId: string | undefined, value: any) => {
  if (!productId) return;
  const pending = pendingPurchases.get(productId);
  if (!pending) return;
  window.clearTimeout(pending.timer);
  pendingPurchases.delete(productId);
  pending.resolve(value);
};

const initializePurchaseStore = async (validateReceipt: ReceiptValidator) => {
  activeValidator = validateReceipt;
  if (storeInitPromise) return storeInitPromise;

  storeInitPromise = (async () => {
    const cdv = await waitForPurchaseGlobal();
    const store = cdv.store;
    const platform = cdv.Platform.APPLE_APPSTORE;

    store.verbosity = cdv.LogLevel?.WARNING ?? 2;
    store.register(
      IAP_PRODUCT_IDS.map((id) => ({
        id,
        type: cdv.ProductType.PAID_SUBSCRIPTION,
        platform,
        group: "evora_subscription",
      })),
    );

    store.error((error: any) => {
      console.error("[IAP] store error:", error);
      rejectPending(error?.productId, new Error(error?.message || "Apple purchase failed."));
    });

    store.when().approved(async (transaction: any) => {
      const productId = productIdFromTransaction(transaction);
      try {
        let receipt = extractReceipt(store, transaction);
        if (!receipt) {
          await store.update();
          receipt = extractReceipt(store, transaction);
        }
        if (!receipt) throw new Error("No App Store receipt returned from StoreKit.");
        const result = await activeValidator?.(receipt, productId);
        await transaction.finish();
        resolvePending(productId, result);
      } catch (error) {
        rejectPending(productId, error);
      }
    });

    const errors = await store.initialize([{ platform, options: { needAppReceipt: false, autoFinish: false } }]);
    const setupError = errors?.find((error: any) => error?.isError);
    if (setupError) throw new Error(setupError.message || "Apple purchases failed to initialize.");
    await store.update();

    return { cdv, store };
  })();

  return storeInitPromise;
};

/**
 * Native Apple In-App Purchases hook using cordova-plugin-purchase, which avoids
 * the @capgo/native-purchases SPM package that was causing Xcode conflicts.
 * Web (and Android, for now) falls back to no-op so existing Stripe flow keeps working.
 */
export function useIAP() {
  const enabled = isIAPPlatform();
  const [products, setProducts] = useState<IAPProduct[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [busy, setBusy] = useState(false);

  /**
   * Sends the StoreKit receipt to the validate-apple-receipt edge function,
   * which verifies with Apple and upserts the subscription row.
   */
  const validateReceipt = useCallback(
    async (receipt: string, productId?: string) => {
      const { data, error } = await supabase.functions.invoke("validate-apple-receipt", {
        body: { receipt, productId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    [],
  );

  const loadProducts = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    try {
      const { cdv, store } = await initializePurchaseStore(validateReceipt);
      const mapped: IAPProduct[] = IAP_PRODUCT_IDS.map((id) => store.get(id, cdv.Platform.APPLE_APPSTORE))
        .filter(Boolean)
        .map((p: any) => {
          const pricing = p.pricing || p.offers?.[0]?.pricingPhases?.[0];
          return {
            identifier: p.id,
            title: p.title,
            description: p.description,
            priceString: pricing?.price ?? "",
            price: typeof pricing?.priceMicros === "number" ? pricing.priceMicros / 1_000_000 : 0,
            currencyCode: pricing?.currency,
          };
        });
      setProducts(mapped);
    } catch (err) {
      console.error("[IAP] getProducts failed:", err);
    } finally {
      setLoading(false);
    }
  }, [enabled, validateReceipt]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const purchase = useCallback(
    async (productId: IAPProductId) => {
      if (!enabled) throw new Error("In-App Purchases are only available in the iOS app.");
      setBusy(true);
      try {
        const { cdv, store } = await initializePurchaseStore(validateReceipt);
        const product = store.get(productId, cdv.Platform.APPLE_APPSTORE);
        const offer = product?.getOffer();
        if (!offer) throw new Error("This Apple product is not available yet. Check App Store Connect and try again.");

        const result = new Promise((resolve, reject) => {
          const timer = window.setTimeout(() => {
            pendingPurchases.delete(productId);
            reject(new Error("Apple purchase timed out before a receipt was returned."));
          }, 120_000);
          pendingPurchases.set(productId, { resolve, reject, timer });
        });

        const orderError = await offer.order();
        if (orderError) {
          rejectPending(productId, new Error(orderError.message || "Apple purchase failed."));
        }

        return await result;
      } finally {
        setBusy(false);
      }
    },
    [enabled, validateReceipt],
  );

  const restore = useCallback(async () => {
    if (!enabled) throw new Error("Restore is only available in the iOS app.");
    setBusy(true);
    try {
      const { store } = await initializePurchaseStore(validateReceipt);
      const restoreError = await store.restorePurchases();
      if (restoreError) throw new Error(restoreError.message || "Couldn't restore Apple purchases.");
      await store.update();

      const receipt = extractReceipt(store);
      if (receipt) return await validateReceipt(receipt);

      const { data, error } = await supabase.functions.invoke("validate-apple-receipt", {
        body: { restore: true },
      });
      if (error) throw error;
      return data;
    } finally {
      setBusy(false);
    }
  }, [enabled, validateReceipt]);

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
