import { Suggestion, categoryLabels } from "@/data/suggestions";
import { Button } from "@/components/ui/button";
import { Check, X, ThumbsDown, Sparkles, Clock } from "lucide-react";
import type { FeedbackKind } from "@/hooks/useTaskFeedback";

interface Props {
  suggestion: Suggestion;
  onFeedback: (kind: FeedbackKind) => void;
  canReroll: boolean;
}

export const SuggestionCard = ({ suggestion, onFeedback, canReroll }: Props) => {
  return (
    <div className="w-full max-w-md rounded-3xl bg-card p-7 soft-shadow animate-scale-in">
      <div className="flex items-center justify-between mb-5">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          {categoryLabels[suggestion.category]}
          {suggestion.ai && (
            <span className="ml-1 inline-flex items-center gap-0.5 text-[10px] text-primary">
              <Sparkles className="h-2.5 w-2.5" /> For you
            </span>
          )}
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
        <Button onClick={() => onFeedback("did")} variant="hero" size="lg" className="w-full">
          <Check className="h-5 w-5" />
          I'll do it
        </Button>
        <div className="grid grid-cols-3 gap-2">
          <Button
            onClick={() => onFeedback("later")}
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
            Not today
          </Button>
          <Button
            onClick={() => onFeedback("dislike")}
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            disabled={!canReroll}
          >
            <ThumbsDown className="h-4 w-4" />
            Not helpful
          </Button>
          <Button
            onClick={() => onFeedback("more")}
            variant="ghost"
            size="sm"
            className="text-primary hover:text-primary"
            disabled={!canReroll}
          >
            <Sparkles className="h-4 w-4" />
            More like this
          </Button>
        </div>
        {!canReroll && (
          <p className="text-[11px] text-center text-muted-foreground">
            No more rerolls right now.
          </p>
        )}
      </div>
    </div>
  );
};
