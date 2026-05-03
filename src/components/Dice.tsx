import { cn } from "@/lib/utils";

interface DiceProps {
  rolling: boolean;
  face?: number; // 1-6
  className?: string;
}

const dotPositions: Record<number, { row: number; col: number }[]> = {
  1: [{ row: 2, col: 2 }],
  2: [{ row: 1, col: 1 }, { row: 3, col: 3 }],
  3: [{ row: 1, col: 1 }, { row: 2, col: 2 }, { row: 3, col: 3 }],
  4: [{ row: 1, col: 1 }, { row: 1, col: 3 }, { row: 3, col: 1 }, { row: 3, col: 3 }],
  5: [{ row: 1, col: 1 }, { row: 1, col: 3 }, { row: 2, col: 2 }, { row: 3, col: 1 }, { row: 3, col: 3 }],
  6: [{ row: 1, col: 1 }, { row: 1, col: 3 }, { row: 2, col: 1 }, { row: 2, col: 3 }, { row: 3, col: 1 }, { row: 3, col: 3 }],
};

export const Dice = ({ rolling, face = 1, className }: DiceProps) => {
  const dots = dotPositions[Math.max(1, Math.min(6, face))];
  return (
    <div
      className={cn(
        "relative aspect-square w-full max-w-[260px] rounded-[2rem] gradient-dice dice-shadow",
        "flex items-center justify-center select-none",
        rolling && "animate-dice-roll",
        !rolling && "animate-float",
        className,
      )}
    >
      <div className="grid h-3/4 w-3/4 grid-cols-3 grid-rows-3 gap-2 p-3">
        {Array.from({ length: 9 }).map((_, i) => {
          const row = Math.floor(i / 3) + 1;
          const col = (i % 3) + 1;
          const hasDot = dots.some((d) => d.row === row && d.col === col);
          return (
            <div key={i} className="flex items-center justify-center">
              {hasDot && (
                <span
                  className="block h-full w-full rounded-full gradient-primary soft-shadow"
                  style={{ aspectRatio: "1 / 1" }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
