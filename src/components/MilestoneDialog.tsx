import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Flame } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  days: number;
}

const messages: Record<number, { title: string; body: string; emoji: string }> = {
  3: {
    emoji: "✨",
    title: "3 days in a row",
    body: "Momentum is real now. The hardest part is behind you.",
  },
  7: {
    emoji: "🌱",
    title: "A full week",
    body: "Seven days of showing up. This is who you are now.",
  },
  14: {
    emoji: "🔥",
    title: "Two weeks strong",
    body: "Fourteen tiny yeses. You're rewriting the loop.",
  },
  30: {
    emoji: "🏆",
    title: "30 days. Legendary.",
    body: "A whole month of choosing yourself. Take a moment to feel it.",
  },
};

export const MilestoneDialog = ({ open, onOpenChange, days }: Props) => {
  const data = messages[days] ?? {
    emoji: "🎉",
    title: `${days} day streak`,
    body: "Keep going — you're building something real.",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl max-w-sm">
        <div className="text-center py-3">
          <div className="text-6xl mb-3 animate-float">{data.emoji}</div>
          <DialogTitle className="font-display text-2xl">{data.title}</DialogTitle>
          <DialogDescription className="mt-2 text-[15px]">{data.body}</DialogDescription>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full gradient-primary px-4 py-2 text-primary-foreground soft-shadow">
            <Flame className="h-4 w-4 fill-current" />
            <span className="font-semibold text-sm">{days} day streak</span>
          </div>
          <div className="mt-6">
            <Button variant="hero" size="lg" className="w-full" onClick={() => onOpenChange(false)}>
              Keep going
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
