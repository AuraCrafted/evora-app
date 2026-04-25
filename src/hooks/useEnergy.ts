import { useEffect, useState } from "react";
import type { Energy } from "@/lib/context";

const KEY = "nudge.energy.v1";

interface Stored {
  energy: Energy;
  ts: number;
}

function load(): Energy {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return "normal";
    const parsed = JSON.parse(raw) as Stored;
    // Reset if older than 4 hours — energy changes through the day
    if (Date.now() - parsed.ts > 4 * 60 * 60 * 1000) return "normal";
    return parsed.energy;
  } catch {
    return "normal";
  }
}

export function useEnergy() {
  const [energy, setEnergyState] = useState<Energy>(() => load());

  useEffect(() => {
    const stored: Stored = { energy, ts: Date.now() };
    localStorage.setItem(KEY, JSON.stringify(stored));
  }, [energy]);

  return { energy, setEnergy: setEnergyState };
}
