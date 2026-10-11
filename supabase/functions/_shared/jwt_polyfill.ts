// Fixes a Deno naming difference in node:crypto so jsonwebtoken (used by
// Apple's @apple/app-store-server-library) accepts real P-256 keys.
//
// Deno reports EC curves in KeyObject.asymmetricKeyDetails.namedCurve as
// "p256"/"p384"/"p521", while Node (and jsonwebtoken's
// validateAsymmetricKey) use the OpenSSL names "prime256v1"/"secp384r1"/
// "secp521r1". Every ES256 verify/sign therefore failed with
// '"alg" parameter "ES256" requires curve "prime256v1"'.
//
// The patch wraps the asymmetricKeyDetails getter on the KeyObject
// prototype, so it applies to every key regardless of how it was created
// (including functions jsonwebtoken captured at module load). It only renames
// the curve label reported by the runtime; the actual key and curve are
// unchanged. Unknown curves pass through untouched, so jsonwebtoken still
// rejects mismatched curves, and the signature is still verified
// cryptographically.
//
// Import this module BEFORE @apple/app-store-server-library is used.

import nodeCrypto from "node:crypto";

// deno-lint-ignore no-explicit-any
const cryptoAny = nodeCrypto as any;

const CURVE_ALIASES: Record<string, string> = {
  p256: "prime256v1",
  "p-256": "prime256v1",
  p384: "secp384r1",
  "p-384": "secp384r1",
  p521: "secp521r1",
  "p-521": "secp521r1",
};

if (!cryptoAny.__evoraJwtPolyfilled) {
  const { publicKey } = nodeCrypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  let proto = Object.getPrototypeOf(publicKey);
  let desc: PropertyDescriptor | undefined;
  while (proto && !(desc = Object.getOwnPropertyDescriptor(proto, "asymmetricKeyDetails"))) {
    proto = Object.getPrototypeOf(proto);
  }
  if (proto && desc?.get) {
    const originalGet = desc.get;
    Object.defineProperty(proto, "asymmetricKeyDetails", {
      configurable: true,
      enumerable: desc.enumerable,
      get() {
        const details = originalGet.call(this);
        if (details && typeof details.namedCurve === "string") {
          const mapped = CURVE_ALIASES[details.namedCurve.toLowerCase()];
          if (mapped) return { ...details, namedCurve: mapped };
        }
        return details;
      },
    });
  }
  cryptoAny.__evoraJwtPolyfilled = true;
}

export {};
