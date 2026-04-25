import { Energy, energyLabel, energyEmoji } from "@/lib/context";
import { cn } from "@/lib/utils";
import { sfx } from "@/lib/feedback";

interface Props {
  value: Energy;
  onChange: (e: Energy) => void;
  compact?: boolean;
  locked?: boolean;
  onLockedClick?: () => void;
}

const order: Energy[] = ["low", "normal", "push"];

export const EnergySelector = ({ value, onChange, compact, locked, onLockedClick }: Props) => {
  const handle = (e: Energy) => {
    if (locked) {
      onLockedClick?.();
      return;
    }
    if (e !== value) sfx.tap();
    onChange(e);
  };

  return (
    <div className="w-full">
      {!compact && (
        <p className="text-xs font-medium text-muted-foreground mb-2 text-center">
          How's your energy right now?
        </p>
      )}
      <div className="flex gap-2 w-full">
        {order.map((e) => {
          const active = value === e && !locked;
          return (
            <button
              key={e}
              type="button"
              onClick={() => handle(e)}
              aria-pressed={active}
              className={cn(
                "flex-1 rounded-2xl px-3 py-2.5 text-xs font-medium transition-all flex flex-col items-center gap-1 active:scale-95",
                active
                  ? "gradient-primary text-primary-foreground soft-shadow"
                  : "bg-card text-muted-foreground border border-border hover:text-foreground",
                locked && "opacity-60",
              )}
            >
              <span className="text-base leading-none">{energyEmoji[e]}</span>
              <span>{energyLabel[e]}</span>
            </button>
          );
        })}
      </div>
      {locked && (
        <p className="text-[11px] text-muted-foreground text-center mt-2">
          Energy-aware rolls are part of Monthly+
        </p>
      )}
    </div>
  );
};
