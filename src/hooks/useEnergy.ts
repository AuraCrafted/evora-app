import { useEffect, useState } from "react";
import { clampEnergy, ENERGY_DEFAULT, type Energy } from "@/lib/context";

const KEY = "nudge.energy.v2";

interface Stored {
  energy: Energy;
  ts: number;
}

function load(): Energy {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return ENERGY_DEFAULT;
    const parsed = JSON.parse(raw) as Stored;
    // Reset if older than 4 hours, energy changes through the day
    if (Date.now() - parsed.ts > 4 * 60 * 60 * 1000) return ENERGY_DEFAULT;
    return clampEnergy(parsed.energy);
  } catch {
    return ENERGY_DEFAULT;
  }
}

export function useEnergy() {
  const [energy, setEnergyState] = useState<Energy>(() => load());

  useEffect(() => {
    const stored: Stored = { energy, ts: Date.now() };
    try {
      localStorage.setItem(KEY, JSON.stringify(stored));
    } catch {
      /* noop */
    }
  }, [energy]);

  const setEnergy = (n: number) => setEnergyState(clampEnergy(n));

  return { energy, setEnergy };
}
