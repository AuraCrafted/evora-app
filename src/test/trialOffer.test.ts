import { describe, it, expect } from "vitest";
import { trialOfferFrom, trialDisplay } from "@/lib/trialOffer";
import { priceIdForApple } from "@/hooks/useIAP";
import { pickEntitlement, rowIsValid } from "@/lib/entitlement";

const elevate = trialOfferFrom({ paymentMode: "freeTrial", periodValue: 1, periodUnit: "week", periodCount: 1 })!;
const evolve = trialOfferFrom({ paymentMode: "freeTrial", periodValue: 3, periodUnit: "day", periodCount: 1 })!;

describe("trial offers", () => {
  it("reads durations from Apple and maps products", () => {
    expect(elevate).toEqual({ days: 7, label: "7-day free trial" });
    expect(evolve).toEqual({ days: 3, label: "3-day free trial" });
    expect(priceIdForApple("evora_id_monthly")).toBe("evora_monthly");
    expect(priceIdForApple("evora_id_yearly")).toBe("evora_yearly");
    expect(trialOfferFrom({ paymentMode: "payAsYouGo", periodValue: 3, periodUnit: "day", periodCount: 1 })).toBeNull();
  });

  it("eligible only when Apple and account both confirm", () => {
    expect(trialDisplay({ offer: elevate, appleEligible: true, accountTrialUsed: false }).kind).toBe("eligible");
    expect(trialDisplay({ offer: evolve, appleEligible: true, accountTrialUsed: false }).kind).toBe("eligible");
  });

  it("one redeemed trial blocks both plans, permanently", () => {
    // Record persists after expiry/cancel/reinstall/restore: account flag stays true.
    for (const offer of [elevate, evolve]) {
      const d = trialDisplay({ offer, appleEligible: true, accountTrialUsed: true });
      expect(d.kind).toBe("ineligible");
    }
  });

  it("Apple-ineligible shows the secondary pill, never Start Free Trial", () => {
    expect(trialDisplay({ offer: elevate, appleEligible: false, accountTrialUsed: false }).kind).toBe("ineligible");
    expect(trialDisplay({ offer: evolve, appleEligible: false, accountTrialUsed: null }).kind).toBe("ineligible");
  });

  it("unknown eligibility or no offer promises nothing", () => {
    expect(trialDisplay({ offer: elevate, appleEligible: undefined, accountTrialUsed: false }).kind).toBe("none");
    expect(trialDisplay({ offer: elevate, appleEligible: true, accountTrialUsed: null }).kind).toBe("none");
    expect(trialDisplay({ offer: null, appleEligible: true, accountTrialUsed: false }).kind).toBe("none");
  });

  it("active trial unlocks its plan; expired trial removes access", () => {
    const now = Date.now();
    const trial = { price_id: "evora_yearly", status: "trialing", current_period_end: new Date(now + 3600e3).toISOString() };
    expect(pickEntitlement([trial], now)?.price_id).toBe("evora_yearly");
    const expired = { ...trial, current_period_end: new Date(now - 1000).toISOString() };
    expect(rowIsValid(expired, now)).toBe(false);
    expect(pickEntitlement([expired], now)).toBeNull();
  });
});
