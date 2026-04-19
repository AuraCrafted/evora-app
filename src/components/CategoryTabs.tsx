import { Category, categoryLabels, categoryEmoji } from "@/data/suggestions";
import { cn } from "@/lib/utils";
import { sfx } from "@/lib/feedback";

interface Props {
  value: Category;
  onChange: (c: Category) => void;
}

const order: Category[] = ["any", "outside", "social", "fitness", "mind", "tidy", "create", "care"];

export const CategoryTabs = ({ value, onChange }: Props) => {
  return (
    <div className="w-full -mx-5 px-5 overflow-x-auto scrollbar-none">
      <div className="flex gap-2 pb-1 min-w-max">
        {order.map((cat) => {
          const active = value === cat;
          return (
            <button
              key={cat}
              onClick={() => {
                if (!active) sfx.tap();
                onChange(cat);
              }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition-all whitespace-nowrap active:scale-95",
                active
                  ? "gradient-primary text-primary-foreground soft-shadow scale-[1.03]"
                  : "bg-card text-muted-foreground hover:text-foreground border border-border",
              )}
              aria-pressed={active}
            >
              <span className="text-sm leading-none">{categoryEmoji[cat]}</span>
              {categoryLabels[cat]}
            </button>
          );
        })}
      </div>
    </div>
  );
};
