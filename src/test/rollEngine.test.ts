import { describe, it, expect } from "vitest";
import { buildEligiblePool, selectSpin } from "@/lib/rollEngine";
import type { Suggestion } from "@/data/suggestions";

function mk(id: string, overrides: Partial<Suggestion> = {}): Suggestion {
  return {
    id,
    title: id,
    category: "mind",
    effort: "low",
    minutes: 5,
    tags: [],
    ...overrides,
  } as Suggestion;
}

const builtIn = [mk("b1"), mk("b2"), mk("b3")];
const custom = [mk("c1"), mk("c2"), mk("c3"), mk("c4"), mk("c5")];

describe("rollEngine.buildEligiblePool", () => {
  it("custom mode returns all custom spins (5 in => 5 out)", () => {
    const pool = buildEligiblePool({
      mode: "custom",
      builtInSuggestions: builtIn,
      customSuggestions: custom,
    });
    expect(pool).toHaveLength(5);
    expect(pool.map((s) => s.id)).toEqual(["c1", "c2", "c3", "c4", "c5"]);
  });

  it("custom mode ignores filters meant for built-in", () => {
    const pool = buildEligiblePool({
      mode: "custom",
      builtInSuggestions: builtIn,
      customSuggestions: custom,
      filters: { quickStart: true, energy: 10 },
    });
    expect(pool).toHaveLength(5);
  });

  it("mixed mode combines built-in and custom", () => {
    const pool = buildEligiblePool({
      mode: "mixed",
      builtInSuggestions: builtIn,
      customSuggestions: custom,
    });
    expect(pool).toHaveLength(8);
    expect(pool.map((s) => s.id)).toEqual(
      expect.arrayContaining(["b1", "b2", "b3", "c1", "c2", "c3", "c4", "c5"]),
    );
  });

  it("builtin mode excludes custom spins", () => {
    const pool = buildEligiblePool({
      mode: "builtin",
      builtInSuggestions: builtIn,
      customSuggestions: custom,
    });
    expect(pool.map((s) => s.id)).toEqual(["b1", "b2", "b3"]);
  });
});

describe("rollEngine.selectSpin repeat-prevention", () => {
  it("does not repeat the last spin when pool size > 1", () => {
    for (let i = 0; i < 20; i++) {
      const { spin, repeatPrevented } = selectSpin({
        mode: "custom",
        builtInSuggestions: [],
        customSuggestions: custom,
        lastRolledId: "c1",
      });
      expect(spin?.id).not.toBe("c1");
      expect(repeatPrevented).toBe(true);
    }
  });

  it("allows repeating when pool size is 1", () => {
    const single = [mk("only")];
    const { spin, repeatPrevented } = selectSpin({
      mode: "custom",
      builtInSuggestions: [],
      customSuggestions: single,
      lastRolledId: "only",
    });
    expect(spin?.id).toBe("only");
    expect(repeatPrevented).toBe(false);
  });

  it("returns null when pool is empty", () => {
    const { spin } = selectSpin({
      mode: "custom",
      builtInSuggestions: [],
      customSuggestions: [],
    });
    expect(spin).toBeNull();
  });

  it("custom selection eventually hits every spin (full pool randomization)", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const { spin } = selectSpin({
        mode: "custom",
        builtInSuggestions: [],
        customSuggestions: custom,
      });
      if (spin) seen.add(spin.id);
    }
    expect(seen.size).toBe(5);
  });
});
