import { Button } from "@/components/ui/button";
import { Sparkles, Check, X } from "lucide-react";
import { sfx } from "@/lib/feedback";

interface Props {
  onAgree: () => void;
  onNotNow: () => void;
}

/**
 * Apple 5.1.1(i)/5.1.2(i) disclosure shown before the first AI request.
 * Names the providers, lists the exact data categories sent, and offers a
 * real choice. No prechecked boxes; declining never blocks the rest of the app.
 */
export const AiConsentDialog = ({ onAgree, onNotNow }: Props) => {
  return (
    <div className="fixed inset-0 z-[120] bg-background/95 backdrop-blur-sm flex items-center justify-center px-5 animate-fade-in-up">
      <div className="w-full max-w-md rounded-3xl bg-card p-6 soft-shadow border border-border">
        <div className="mx-auto mb-4 h-14 w-14 rounded-3xl gradient-primary flex items-center justify-center soft-shadow">
          <Sparkles className="h-6 w-6 text-primary-foreground" />
        </div>
        <h2 className="font-display text-2xl font-semibold tracking-tight text-center">
          Allow AI features?
        </h2>
        <p className="mt-3 text-center text-sm text-muted-foreground leading-relaxed">
          Evora uses AI to personalize task suggestions, power your AI Coach, and guide Journeys.
          To do this, the app sends the following to our AI providers —{" "}
          <span className="text-foreground font-medium">Google (Gemini) and OpenAI</span>, via our
          AI gateway <span className="text-foreground font-medium">Lovable</span>:
        </p>
        <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground leading-relaxed list-disc list-inside">
          <li>Your interests, goals, struggles, and avoid list</li>
          <li>Your current energy level</li>
          <li>What you write to the AI Coach and in Journey check-ins</li>
        </ul>
        <p className="mt-3 text-center text-sm text-muted-foreground leading-relaxed">
          This is used only to generate your personal suggestions and coach replies. Your data is
          never sold. You can change this choice anytime in Settings → AI features. Everything
          else in Evora works either way.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <Button
            variant="hero"
            size="lg"
            className="w-full"
            onClick={() => {
              sfx.tap();
              onAgree();
            }}
          >
            <Check className="h-4 w-4" />
            Agree &amp; Continue
          </Button>
          <Button
            variant="soft"
            size="lg"
            className="w-full"
            onClick={() => {
              sfx.tap();
              onNotNow();
            }}
          >
            <X className="h-4 w-4" />
            Not Now
          </Button>
        </div>
      </div>
    </div>
  );
};
