// Live check: asks Apple (Sandbox) for a real signed test notification and
// runs full verification (chain, Apple root, extensions, OCSP, signature).
import { assert, assertEquals, assertRejects } from "jsr:@std/assert@1";
import { clientFor, Environment, verifyNotification } from "../_shared/apple.ts";

const hasCreds = !!Deno.env.get("APPLE_IAP_PRIVATE_KEY");

Deno.test({ name: "real Apple sandbox signed payload verifies", ignore: !hasCreds, sanitizeResources: false, sanitizeOps: false, fn: async () => {
  const c = clientFor(Environment.SANDBOX);
  let testNotificationToken: string | undefined;
  try { ({ testNotificationToken } = await c.requestTestNotification()); } catch (e) { const x = e as any; if (x.apiError === 4040007) { console.log("SKIPPED: no Sandbox notification URL set in App Store Connect"); return; } throw e; }
  let signed: string | undefined;
  for (let i = 0; i < 10 && !signed; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    try { signed = (await c.getTestNotificationStatus(testNotificationToken!)).signedPayload; } catch { /* not ready */ }
  }
  assert(signed, "Apple returned no signed payload");
  const { note, env } = await verifyNotification(signed);
  assertEquals(env, Environment.SANDBOX);
  assertEquals(note.notificationType, "TEST");
  console.log("verified real Apple sandbox notification", note.notificationUUID);

  // Tampered signature must fail.
  const parts = signed.split(".");
  const sig = parts[2];
  const bad = `${parts[0]}.${parts[1]}.${(sig[0] === "A" ? "B" : "A") + sig.slice(1)}`;
  await assertRejects(() => verifyNotification(bad));
  // Tampered payload must fail.
  await assertRejects(() => verifyNotification(`${parts[0]}.${parts[1].slice(0, -2)}AA.${sig}`));
}});
