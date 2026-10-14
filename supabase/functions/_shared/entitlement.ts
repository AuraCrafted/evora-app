// Picks a user's entitlement from ALL their subscription records.
// Mirror of src/lib/entitlement.ts — keep both identical.

export interface EntitlementRow {
  price_id: string;
  status: string;
  current_period_end: string | null;
  created_at?: string | null;
}

const RANK: Record<string, number> = { evora_yearly: 2, evora_monthly: 1 };

/** A single record grants access only inside its own verified period. */
export function rowIsValid(row: EntitlementRow, now = Date.now()): boolean {
  const end = row.current_period_end ? new Date(row.current_period_end).getTime() : null;
  if (["active", "trialing", "past_due"].includes(row.status) && (end === null || end > now)) return true;
  if (row.status === "canceled" && end !== null && end > now) return true;
  return false;
}

/** Highest valid plan (Evolve over Elevate), then latest expiry. Never merges rows. */
export function pickEntitlement<T extends EntitlementRow>(rows: T[] | null | undefined, now = Date.now()): T | null {
  const valid = (rows ?? []).filter((r) => RANK[r.price_id] && rowIsValid(r, now));
  valid.sort((a, b) => {
    const r = RANK[b.price_id] - RANK[a.price_id];
    if (r) return r;
    const ea = a.current_period_end ? new Date(a.current_period_end).getTime() : Infinity;
    const eb = b.current_period_end ? new Date(b.current_period_end).getTime() : Infinity;
    return eb - ea;
  });
  return valid[0] ?? null;
}

/** Row to display: the entitling one, else the newest record (to show expired/cancelled state). */
export function pickDisplayRow<T extends EntitlementRow>(rows: T[] | null | undefined, now = Date.now()): T | null {
  const ent = pickEntitlement(rows, now);
  if (ent) return ent;
  const sorted = [...(rows ?? [])].sort(
    (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
  );
  return sorted[0] ?? null;
}

export const isEvolve = (row: EntitlementRow | null) => row?.price_id === "evora_yearly";
