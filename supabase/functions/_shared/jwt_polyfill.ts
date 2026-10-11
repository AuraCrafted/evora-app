// Fills a Deno gap in node:crypto KeyObject so jsonwebtoken (used by Apple's
// @apple/app-store-server-library) can verify ES256 signatures.
//
// jsonwebtoken's validateAsymmetricKey reads keyObject.asymmetricKeyDetails
// to confirm the EC curve matches the JWT "alg". Deno's KeyObject does not
// expose asymmetricKeyDetails, so every ES256 verification failed with
// '"alg" parameter "ES256" requires curve "prime256v1"'.
//
// This patch attaches real asymmetricKeyDetails (read from the key itself,
// never assumed) to KeyObjects returned by createPublicKey/createPrivateKey.
// No verification is weakened: jsonwebtoken still checks the curve against
// the algorithm and verifies the signature cryptographically.
//
// Import this module BEFORE @apple/app-store-server-library is used.

import nodeCrypto from "node:crypto";

// deno-lint-ignore no-explicit-any
const cryptoAny = nodeCrypto as any;

if (!cryptoAny.__evoraJwtPolyfilled) {
  const EC_CURVES: Record<string, string> = {
    "1.2.840.10045.3.1.7": "prime256v1", // P-256
    "1.3.132.0.34": "secp384r1", // P-384
    "1.3.132.0.35": "secp521r1", // P-521
  };

  // deno-lint-ignore no-explicit-any
  function attachDetails(keyObject: any): any {
    if (!keyObject || keyObject.asymmetricKeyDetails) return keyObject;
    try {
      const jwk = keyObject.export({ format: "jwk" });
      if (jwk?.kty === "EC" && typeof jwk.crv === "string") {
        const namedCurve =
          jwk.crv === "P-256" ? "prime256v1"
          : jwk.crv === "P-384" ? "secp384r1"
          : jwk.crv === "P-521" ? "secp521r1"
          : undefined;
        if (namedCurve) {
          Object.defineProperty(keyObject, "asymmetricKeyDetails", {
            value: { namedCurve },
            enumerable: true,
            configurable: true,
          });
        }
      } else if (jwk?.kty === "RSA" && typeof jwk.n === "string") {
        const modulusLength = jwk.n.replace(/=+$/, "").length * 6 -
          (jwk.n.endsWith("==") ? 2 : jwk.n.endsWith("=") ? 1 : 0);
        Object.defineProperty(keyObject, "asymmetricKeyDetails", {
          value: { modulusLength: modulusLength * 8 },
          enumerable: true,
          configurable: true,
        });
      }
    } catch {
      // If details cannot be derived, leave the key untouched; verification
      // will fail closed rather than silently accept a wrong curve.
    }
    return keyObject;
  }

  for (const fn of ["createPublicKey", "createPrivateKey"] as const) {
    const original = cryptoAny[fn];
    if (typeof original !== "function") continue;
    cryptoAny[fn] = function (...args: unknown[]) {
      return attachDetails(original.apply(this, args));
    };
  }

  cryptoAny.__evoraJwtPolyfilled = true;
}

export {};
