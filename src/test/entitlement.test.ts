// @ts-nocheck node fs used only in tests
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { pickEntitlement, pickDisplayRow, isEvolve } from "@/lib/entitlement";

const now = Date.parse("2026-10-14T00:00:00Z");
const future = "2026-11-14T00:00:00Z";
const past = "2026-10-01T00:00:00Z";
const row = (price_id: string, status: string, end: string | null, created_at = "2026-10-01T00:00:00Z") =>
  ({ price_id, status, current_period_end: end, created_at });

describe("entitlement", () => {
  it("newer expired record does not hide an older active one", () => {
    const rows = [row("evora_monthly", "active", future, "2026-09-01"), row("evora_yearly", "expired", past, "2026-10-10")];
    expect(pickEntitlement(rows, now)?.price_id).toBe("evora_monthly");
    expect(isEvolve(pickEntitlement(rows, now))).toBe(false);
  });
  it("Evolve wins over Elevate when both valid", () => {
    const rows = [row("evora_monthly", "active", future, "2026-10-10"), row("evora_yearly", "trialing", "2026-10-20T00:00:00Z")];
    expect(pickEntitlement(rows, now)?.price_id).toBe("evora_yearly");
  });
  it("Elevate never unlocks Evolve", () => {
    expect(isEvolve(pickEntitlement([row("evora_monthly", "active", future)], now))).toBe(false);
  });
  it("expired, revoked, billing retry past end grant nothing", () => {
    const rows = [row("evora_yearly", "expired", future), row("evora_yearly", "revoked", future), row("evora_yearly", "past_due", past)];
    expect(pickEntitlement(rows, now)).toBeNull();
  });
  it("cancelled keeps access until its own end, not extended", () => {
    expect(pickEntitlement([row("evora_yearly", "canceled", future)], now)?.current_period_end).toBe(future);
    expect(pickEntitlement([row("evora_yearly", "canceled", past)], now)).toBeNull();
  });
  it("display falls back to newest record when nothing valid", () => {
    const rows = [row("evora_monthly", "expired", past, "2026-09-01"), row("evora_yearly", "expired", past, "2026-10-10")];
    expect(pickDisplayRow(rows, now)?.price_id).toBe("evora_yearly");
  });
  it("server copy matches app copy", () => {
    const strip = (s: string) => s.split("\n").slice(2).join("\n");
    expect(strip(readFileSync("supabase/functions/_shared/entitlement.ts", "utf8")))
      .toBe(strip(readFileSync("src/lib/entitlement.ts", "utf8")));
  });
});
