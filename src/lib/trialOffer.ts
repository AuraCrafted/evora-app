// Pure free-trial display logic for Apple plans. No side effects; unit-tested.

export interface AppleIntroOffer {
  paymentMode: string;
  periodValue: number;
  periodUnit: string;
  periodCount: number;
}

export interface TrialInfo {
  days: number;
  label: string;
}

/** Describes Apple's introductory offer, only when it is a free trial with a known length. */
export function trialOfferFrom(o: AppleIntroOffer | null | undefined): TrialInfo | null {
  if (!o || o.paymentMode !== "freeTrial") return null;
  const count = Math.max(1, o.periodCount || 1);
  const perUnit: Record<string, number> = { day: 1, week: 7 };
  const mult = perUnit[o.periodUnit];
  if (mult && o.periodValue > 0) {
    const days = o.periodValue * mult * count;
    return { days, label: `${days}-day free trial` };
  }
  if (o.periodUnit === "month" && o.periodValue > 0) {
    const m = o.periodValue * count;
    return { days: m * 30, label: `${m}-month free trial` };
  }
  return null;
}

export type TrialDisplay =
  | { kind: "eligible"; trial: TrialInfo }
  | { kind: "ineligible"; trial: TrialInfo }
  | { kind: "none" };

/**
 * eligible: Apple reports a free trial, Apple says this Apple ID is eligible,
 *           AND the Evora account is confirmed to have never redeemed a trial.
 * ineligible: Apple reports a free trial, but Apple or the Evora account says no.
 * none: no Apple offer, or eligibility unknown. Never promise a trial.
 */
export function trialDisplay(args: {
  offer: TrialInfo | null | undefined;
  appleEligible: boolean | undefined;
  /** true = account redeemed one, false = confirmed never, null = unknown. */
  accountTrialUsed: boolean | null;
}): TrialDisplay {
  const { offer, appleEligible, accountTrialUsed } = args;
  if (!offer) return { kind: "none" };
  if (appleEligible === false || accountTrialUsed === true) return { kind: "ineligible", trial: offer };
  if (appleEligible === true && accountTrialUsed === false) return { kind: "eligible", trial: offer };
  return { kind: "none" };
}
