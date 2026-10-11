// Fills gaps in Deno's node:crypto X509Certificate so Apple's official
// @apple/app-store-server-library can run its full verification unchanged:
// certificate chain, Apple root, validity dates, Apple extensions,
// signature and OCSP revocation checks.
//
// Deno (2.x) does not implement X509Certificate.raw, toString, verify and
// infoAccess. This subclass adds them with the same semantics as Node.js,
// using jsrsasign (already a dependency of Apple's library). Signature checks
// are real cryptographic verification; nothing is skipped or stubbed.
//
// Import this module BEFORE @apple/app-store-server-library is used.

import nodeCrypto from "node:crypto";
import { Buffer } from "node:buffer";
// @ts-ignore: untyped CJS package
import jsrsasign from "npm:jsrsasign@^11.0.0";

const { X509, KEYUTIL } = jsrsasign as any;
const Native = nodeCrypto.X509Certificate as any;

if (!Native.__evoraPolyfilled) {
  const needsPolyfill = (() => {
    try {
      // deno-lint-ignore no-explicit-any
      (Native.prototype as any).toString.call(Object.create(Native.prototype));
      return false;
    } catch (e) {
      return String((e as Error)?.message ?? "").includes("Not implemented");
    }
  })();

  if (needsPolyfill) {
    class PolyfilledX509Certificate extends Native {
      #der: Buffer;
      #js: any;
      constructor(input: Buffer | string | Uint8Array) {
        super(input);
        let der: Buffer;
        if (typeof input === "string" || (Buffer.isBuffer(input) && input.toString("latin1", 0, 10).startsWith("-----BEGIN"))) {
          const pem = typeof input === "string" ? input : input.toString("latin1");
          const b64 = pem.replace(/-----(BEGIN|END) CERTIFICATE-----/g, "").replace(/\s+/g, "");
          der = Buffer.from(b64, "base64");
        } else {
          der = Buffer.from(input);
        }
        this.#der = der;
        this.#js = new X509();
        this.#js.readCertHex(der.toString("hex"));
      }

      get raw(): Buffer {
        return Buffer.from(this.#der);
      }

      toString(): string {
        const lines = this.#der.toString("base64").match(/.{1,64}/g) ?? [];
        return `-----BEGIN CERTIFICATE-----\n${lines.join("\n")}\n-----END CERTIFICATE-----\n`;
      }

      toJSON(): string {
        return this.toString();
      }

      /** Same as Node: does `publicKey` verify this certificate's signature? */
      verify(publicKey: any): boolean {
        try {
          const pem = publicKey.export({ type: "spki", format: "pem" });
          const key = KEYUTIL.getKey(pem);
          return this.#js.verifySignature(key) === true;
        } catch {
          return false;
        }
      }

      /** Same text format as Node, e.g. "OCSP - URI:http://...". */
      get infoAccess(): string | undefined {
        let info: any;
        try {
          info = this.#js.getExtAIAInfo();
        } catch {
          return undefined;
        }
        if (!info) return undefined;
        const out: string[] = [];
        for (const u of info.ocsp ?? []) out.push(`OCSP - URI:${u}`);
        for (const u of info.caissuer ?? []) out.push(`CA Issuers - URI:${u}`);
        return out.length ? out.join("\n") + "\n" : undefined;
      }
    }
    (PolyfilledX509Certificate as any).__evoraPolyfilled = true;
    (nodeCrypto as any).X509Certificate = PolyfilledX509Certificate;
  }
  Native.__evoraPolyfilled = true;
}

export {};
