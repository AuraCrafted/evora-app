import { Suggestion, categoryLabels } from "@/data/suggestions";
import { Button } from "@/components/ui/button";
import { Check, RotateCcw, Clock } from "lucide-react";

interface Props {
  suggestion: Suggestion;
  onAccept: () => void;
  onReject: () => void;
  canReroll: boolean;
}

export const SuggestionCard = ({ suggestion, onAccept, onReject, canReroll }: Props) => {
  return (
    <div className="w-full max-w-md rounded-3xl bg-card p-7 soft-shadow animate-scale-in">
      <div className="flex items-center justify-between mb-5">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          {categoryLabels[suggestion.category]}
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          {suggestion.duration}
        </span>
      </div>

      <div className="text-center">
        <div className="text-6xl mb-4 animate-float">{suggestion.emoji}</div>
        <h2 className="font-display text-2xl font-semibold text-foreground mb-2 leading-tight">
          {suggestion.title}
        </h2>
        <p className="text-muted-foreground text-[15px] leading-relaxed">
          {suggestion.description}
        </p>
      </div>

      <div className="mt-7 flex flex-col gap-3">
        <Button onClick={onAccept} variant="hero" size="lg" className="w-full">
          <Check className="h-5 w-5" />
          I'll do it
        </Button>
        <Button
          onClick={onReject}
          variant="ghost"
          size="lg"
          className="w-full text-muted-foreground hover:text-foreground"
          disabled={!canReroll}
        >
          <RotateCcw className="h-4 w-4" />
          {canReroll ? "Not this one, reroll" : "No more rerolls this week"}
        </Button>
      </div>
    </div>
  );
};
