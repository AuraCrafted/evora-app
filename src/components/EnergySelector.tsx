import { useEffect, useState } from "react";
import { Slider } from "@/components/ui/slider";
import {
  ENERGY_MAX,
  ENERGY_MIN,
  energyLevelEmoji,
  energyLevelLabel,
  type Energy,
} from "@/lib/context";
import { cn } from "@/lib/utils";
import { sfx } from "@/lib/feedback";

interface Props {
  value: Energy;
  onChange: (e: Energy) => void;
  compact?: boolean;
  locked?: boolean;
  onLockedClick?: () => void;
}

export const EnergySelector = ({
  value,
  onChange,
  compact,
  locked,
  onLockedClick,
}: Props) => {
  // Local mirror so the slider feels snappy while dragging
  const [draft, setDraft] = useState<number>(value);
  const lastTickRef = useState<{ v: number }>(() => ({ v: value }))[0];

  useEffect(() => {
    setDraft(value);
    lastTickRef.v = value;
  }, [value, lastTickRef]);

  const handleChange = (vals: number[]) => {
    if (locked) {
      onLockedClick?.();
      return;
    }
    const next = vals[0] ?? value;
    setDraft(next);
    if (next !== lastTickRef.v) {
      lastTickRef.v = next;
      sfx.tap();
    }
  };

  const handleCommit = (vals: number[]) => {
    if (locked) return;
    const next = vals[0] ?? value;
    onChange(next);
  };

  const display = locked ? value : draft;
  const label = energyLevelLabel(display);
  const emoji = energyLevelEmoji(display);

  return (
    <div className="w-full">
      {!compact && (
        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              How's your energy right now?
            </p>
            <p className="mt-1 text-sm font-semibold">
              <span className="mr-1.5">{emoji}</span>
              {label}
            </p>
          </div>
          <div className="text-right">
            <div className="font-display text-2xl font-semibold leading-none">
              {display}
              <span className="text-sm font-normal text-muted-foreground">
                /{ENERGY_MAX}
              </span>
            </div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1">
              Energy
            </div>
          </div>
        </div>
      )}

      <div
        className={cn("px-1", locked && "opacity-60")}
        onPointerDown={(e) => {
          if (locked) {
            e.preventDefault();
            onLockedClick?.();
          }
        }}
      >
        <Slider
          value={[display]}
          min={ENERGY_MIN}
          max={ENERGY_MAX}
          step={1}
          onValueChange={handleChange}
          onValueCommit={handleCommit}
          aria-label="Energy level from 1 to 10"
          aria-valuetext={`${display} of ${ENERGY_MAX} — ${label}`}
          disabled={locked}
        />
      </div>

      <div className="mt-2 flex justify-between text-[10px] uppercase tracking-wide text-muted-foreground px-1">
        <span>1 · Lightest</span>
        <span>10 · Most demanding</span>
      </div>

      {locked && (
        <p className="text-[11px] text-muted-foreground text-center mt-3">
          Energy-aware rolls are part of Monthly+
        </p>
      )}
    </div>
  );
};
