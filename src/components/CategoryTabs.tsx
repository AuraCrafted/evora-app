import { Category, categoryLabels, categoryEmoji } from "@/data/suggestions";
import { cn } from "@/lib/utils";
import { sfx } from "@/lib/feedback";
import { Lock } from "lucide-react";

interface Props {
  value: Category;
  onChange: (c: Category) => void;
  /** Categories that are gated behind a paid plan. Clicking them fires onLockedClick instead of selecting. */
  lockedCategories?: Category[];
  onLockedClick?: (c: Category) => void;
}

const order: Category[] = ["any", "custom", "outside", "social", "fitness", "mind", "tidy", "create", "care"];

export const CategoryTabs = ({ value, onChange, lockedCategories = [], onLockedClick }: Props) => {
  return (
    <div className="w-full -mx-5 px-5 overflow-x-auto scrollbar-none">
      <div className="flex gap-2 pb-1 min-w-max">
        {order.map((cat) => {
          const active = value === cat;
          const locked = lockedCategories.includes(cat);
          return (
            <button
              key={cat}
              onClick={() => {
                if (locked) {
                  sfx.tap();
                  onLockedClick?.(cat);
                  return;
                }
                if (!active) sfx.tap();
                onChange(cat);
              }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition-all whitespace-nowrap active:scale-95",
                active
                  ? "gradient-primary text-primary-foreground soft-shadow scale-[1.03]"
                  : locked
                    ? "bg-card text-muted-foreground/70 border border-border"
                    : "bg-card text-muted-foreground hover:text-foreground border border-border",
              )}
              aria-pressed={active}
              aria-disabled={locked}
            >
              <span className="text-sm leading-none">{categoryEmoji[cat]}</span>
              {categoryLabels[cat]}
              {locked && <Lock className="h-3 w-3 opacity-70" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};
