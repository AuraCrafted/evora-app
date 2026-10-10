import { registerPlugin, type PluginListenerHandle } from "@capacitor/core";

export interface StoreKitTransaction {
  jws: string;
  transactionId: string;
  originalTransactionId: string;
  productId: string;
  verifiedOnDevice: boolean;
  deviceError?: string;
}

export interface StoreKitProduct {
  id: string;
  displayName: string;
  description: string;
  displayPrice: string;
  price: number;
  currencyCode: string;
}

export type PurchaseResult =
  | ({ status: "success" } & StoreKitTransaction)
  | { status: "cancelled" | "pending" }
  | { status: "failed"; message?: string };

export interface EvoraStoreKitPlugin {
  getProducts(options: { ids: string[] }): Promise<{ products: StoreKitProduct[] }>;
  purchase(options: { productId: string; appAccountToken: string }): Promise<PurchaseResult>;
  finish(options: { transactionId: string }): Promise<{ finished: boolean }>;
  currentEntitlements(): Promise<{ transactions: StoreKitTransaction[] }>;
  sync(): Promise<{ synced: boolean }>;
  manageSubscriptions(): Promise<void>;
  drainPendingUpdates(): Promise<{ transactions: StoreKitTransaction[] }>;
  addListener(
    eventName: "transactionUpdated",
    listener: (tx: StoreKitTransaction) => void,
  ): Promise<PluginListenerHandle>;
}

export const EvoraStoreKit = registerPlugin<EvoraStoreKitPlugin>("EvoraStoreKit");
