// Shared Apple App Store verification for Evora.
// Verifies StoreKit 2 signed data against Apple's root CA and asks the
// App Store Server API for the authoritative subscription status.
// Never trusts client-supplied product IDs, dates or success flags.

import {
  AppStoreServerAPIClient,
  Environment,
  SignedDataVerifier,
  Status,
  type JWSTransactionDecodedPayload,
  type JWSRenewalInfoDecodedPayload,
} from "npm:@apple/app-store-server-library@3.1.0";
import { Buffer } from "node:buffer";

export const BUNDLE_ID = "app.lovable.5c75fe72ae1145bc8efdd365adcddfd1";

// Apple product ID -> internal price key (unchanged mapping).
export const APPLE_PRODUCT_TO_PRICE_ID: Record<string, string> = {
  evora_id_monthly: "evora_monthly",
  evora_id_yearly: "evora_yearly",
};

// Apple Root CA - G3 (public certificate, SHA-256
// 63:34:3A:BF:B8:9A:6A:03:EB:B5:7E:9B:3F:5F:A7:BE:7C:4F:5C:75:6F:30:17:B3:A8:C4:88:C3:65:3E:91:79)
const APPLE_ROOT_CA_G3_B64 = "MIICQzCCAcmgAwIBAgIILcX8iNLFS5UwCgYIKoZIzj0EAwMwZzEbMBkGA1UEAwwSQXBwbGUgUm9vdCBDQSAtIEczMSYwJAYDVQQLDB1BcHBsZSBDZXJ0aWZpY2F0aW9uIEF1dGhvcml0eTETMBEGA1UECgwKQXBwbGUgSW5jLjELMAkGA1UEBhMCVVMwHhcNMTQwNDMwMTgxOTA2WhcNMzkwNDMwMTgxOTA2WjBnMRswGQYDVQQDDBJBcHBsZSBSb290IENBIC0gRzMxJjAkBgNVBAsMHUFwcGxlIENlcnRpZmljYXRpb24gQXV0aG9yaXR5MRMwEQYDVQQKDApBcHBsZSBJbmMuMQswCQYDVQQGEwJVUzB2MBAGByqGSM49AgEGBSuBBAAiA2IABJjpLz1AcqTtkyJygRMc3RCV8cWjTnHcFBbZDuWmBSp3ZHtfTjjTuxxEtX/1H7YyYl3J6YRbTzBPEVoA/VhYDKX1DyxNB0cTddqXl5dvMVztK517IDvYuVTZXpmkOlEKMaNCMEAwHQYDVR0OBBYEFLuw3qFYM4iapIqZ3r6966/ayySrMA8GA1UdEwEB/wQFMAMBAf8wDgYDVR0PAQH/BAQDAgEGMAoGCCqGSM49BAMDA2gAMGUCMQCD6cHEFl4aXTQY2e3v9GwOAEZLuN+yRhHFD/3meoyhpmvOwgPUnPWTxnS4at+qIxUCMG1mihDK1A3UT82NQz60imOlM27jbdoXt2QfyFMm+YhidDkLF1vLUagM6BgD56KyKA==";

export class AppleConfigError extends Error {}

function requireEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new AppleConfigError(`Missing server secret ${name}`);
  return v;
}

function appAppleId(): number | undefined {
  const raw = Deno.env.get("APPLE_APP_APPLE_ID");
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

const roots = [Buffer.from(APPLE_ROOT_CA_G3_B64, "base64")];
const verifiers = new Map<Environment, SignedDataVerifier>();

export function verifierFor(env: Environment): SignedDataVerifier {
  let v = verifiers.get(env);
  if (!v) {
    const appId = appAppleId();
    if (env === Environment.PRODUCTION && appId === undefined) {
      throw new AppleConfigError("Missing server secret APPLE_APP_APPLE_ID");
    }
    v = new SignedDataVerifier(roots, true, env, BUNDLE_ID, appId);
    verifiers.set(env, v);
  }
  return v;
}

/** Rebuilds a valid PEM from a .p8 pasted with spaces, "\\n" or no line breaks. */
function normalizeP8(raw: string): string {
  const body = raw
    .replace(/\\n/g, "\n")
    .replace(/-----(BEGIN|END) PRIVATE KEY-----/g, "")
    .replace(/[^A-Za-z0-9+/=]/g, "");
  const lines = body.match(/.{1,64}/g) ?? [];
  return `-----BEGIN PRIVATE KEY-----\n${lines.join("\n")}\n-----END PRIVATE KEY-----\n`;
}

const clients = new Map<Environment, AppStoreServerAPIClient>();
function clientFor(env: Environment): AppStoreServerAPIClient {
  let c = clients.get(env);
  if (!c) {
    const key = normalizeP8(requireEnv("APPLE_IAP_PRIVATE_KEY"));
    c = new AppStoreServerAPIClient(
      key,
      requireEnv("APPLE_IAP_KEY_ID"),
      requireEnv("APPLE_IAP_ISSUER_ID"),
      BUNDLE_ID,
      env,
    );
    clients.set(env, c);
  }
  return c;
}

/** Reads the (unverified) environment claim only to pick the right verifier. */
function claimedEnvironment(jws: string): Environment {
  try {
    const payload = JSON.parse(Buffer.from(jws.split(".")[1], "base64url").toString("utf8"));
    if (payload?.environment === "Sandbox") return Environment.SANDBOX;
    if (payload?.environment === "Xcode") return Environment.XCODE;
    if (payload?.environment === "LocalTesting") return Environment.LOCAL_TESTING;
  } catch { /* fall through */ }
  return Environment.PRODUCTION;
}

export async function verifyTransaction(jws: string): Promise<{
  tx: JWSTransactionDecodedPayload;
  env: Environment;
}> {
  const env = claimedEnvironment(jws);
  if (env !== Environment.PRODUCTION && env !== Environment.SANDBOX) {
    throw new Error("Transactions from local Xcode StoreKit testing cannot be verified by Apple.");
  }
  const tx = await verifierFor(env).verifyAndDecodeTransaction(jws);
  if (tx.bundleId !== BUNDLE_ID) throw new Error("Bundle ID mismatch");
  return { tx, env };
}

export async function verifyNotification(signedPayload: string) {
  const env = claimedEnvironment(signedPayload);
  return { note: await verifierFor(env).verifyAndDecodeNotification(signedPayload), env };
}

export interface AppleState {
  originalTransactionId: string;
  productId: string;
  priceId: string;
  status: "active" | "trialing" | "past_due" | "expired" | "revoked";
  periodStart: string | null;
  periodEnd: string | null;
  autoRenew: boolean | null;
  appAccountToken: string | null;
  environment: "Production" | "Sandbox";
}

/** Authoritative status from Apple's App Store Server API. */
export async function fetchAppleState(
  originalTransactionId: string,
  env: Environment,
): Promise<AppleState | null> {
  const res = await clientFor(env).getAllSubscriptionStatuses(originalTransactionId);
  const verifier = verifierFor(env);
  let best: { tx: JWSTransactionDecodedPayload; renewal: JWSRenewalInfoDecodedPayload | null; status: Status | undefined } | null = null;

  for (const group of res.data ?? []) {
    for (const last of group.lastTransactions ?? []) {
      if (!last.signedTransactionInfo) continue;
      const tx = await verifier.verifyAndDecodeTransaction(last.signedTransactionInfo);
      if (!tx.productId || !APPLE_PRODUCT_TO_PRICE_ID[tx.productId]) continue;
      const renewal = last.signedRenewalInfo
        ? await verifier.verifyAndDecodeRenewalInfo(last.signedRenewalInfo)
        : null;
      if (!best || (tx.expiresDate ?? 0) > (best.tx.expiresDate ?? 0)) {
        best = { tx, renewal, status: last.status };
      }
    }
  }
  if (!best) return null;

  const { tx, renewal, status } = best;
  let mapped: AppleState["status"];
  let end = tx.expiresDate ?? null;
  switch (status) {
    case Status.ACTIVE:
      mapped = tx.offerType === 1 ? "trialing" : "active";
      break;
    case Status.BILLING_GRACE_PERIOD:
      mapped = "active";
      end = renewal?.gracePeriodExpiresDate ?? end;
      break;
    case Status.BILLING_RETRY:
      mapped = "past_due"; // no access: period end is already in the past
      break;
    case Status.REVOKED:
      mapped = "revoked";
      end = tx.revocationDate ?? Date.now();
      break;
    default:
      mapped = "expired";
  }

  return {
    originalTransactionId: String(tx.originalTransactionId),
    productId: tx.productId!,
    priceId: APPLE_PRODUCT_TO_PRICE_ID[tx.productId!],
    status: mapped,
    periodStart: tx.purchaseDate ? new Date(tx.purchaseDate).toISOString() : null,
    periodEnd: end ? new Date(end).toISOString() : null,
    autoRenew: renewal ? renewal.autoRenewStatus === 1 : null,
    appAccountToken: tx.appAccountToken ?? null,
    environment: env === Environment.SANDBOX ? "Sandbox" : "Production",
  };
}

export { Environment };

/**
 * Writes Apple's authoritative state to public.subscriptions for userId.
 * Rows are keyed by Apple's original transaction ID. environment stays
 * "live" so both App Review (sandbox) and customers read the same row.
 */
// deno-lint-ignore no-explicit-any
export async function saveAppleState(supabase: any, userId: string, s: AppleState) {
  const now = new Date().toISOString();
  const payload = {
    user_id: userId,
    product_id: s.productId,
    price_id: s.priceId,
    status: s.status,
    current_period_start: s.periodStart,
    current_period_end: s.periodEnd,
    cancel_at_period_end: s.autoRenew === false,
    environment: "live",
    apple_original_transaction_id: s.originalTransactionId,
    apple_environment: s.environment,
    apple_auto_renew: s.autoRenew,
    last_verified_at: now,
    stripe_subscription_id: `apple:${s.originalTransactionId}`,
    stripe_customer_id: `apple:${userId}`,
    updated_at: now,
  };

  const { data: byTx } = await supabase
    .from("subscriptions")
    .select("id, user_id")
    .eq("apple_original_transaction_id", s.originalTransactionId)
    .maybeSingle();
  if (byTx) {
    if (byTx.user_id !== userId) throw new OwnershipError();
    const { error } = await supabase.from("subscriptions").update(payload).eq("id", byTx.id);
    if (error) throw error;
    return;
  }
  // Adopt a legacy unverified Apple row for this user, if one exists.
  const { data: legacy } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .is("apple_original_transaction_id", null)
    .like("stripe_customer_id", "apple:%")
    .limit(1)
    .maybeSingle();
  const { error } = legacy
    ? await supabase.from("subscriptions").update(payload).eq("id", legacy.id)
    : await supabase.from("subscriptions").insert({ ...payload, created_at: now });
  if (error) throw error;
}

export class OwnershipError extends Error {
  constructor() {
    super("This Apple subscription belongs to a different Evora account.");
  }
}
