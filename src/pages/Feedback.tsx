import { useState } from "react";
import { Lightbulb, Bug, Heart, MessageCircle, Send, Trash2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { BottomNav } from "@/components/BottomNav";
import { useSpins } from "@/hooks/useSpins";
import { useFeedback, feedbackSchema, type FeedbackCategory } from "@/hooks/useFeedback";
import { sfx } from "@/lib/feedback";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const categories: {
  id: FeedbackCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  hint: string;
}[] = [
  { id: "idea", label: "Idea", icon: Lightbulb, hint: "A feature or nudge you'd love." },
  { id: "bug", label: "Bug", icon: Bug, hint: "Something broke or felt off." },
  { id: "love", label: "Love", icon: Heart, hint: "Tell us what's working." },
  { id: "other", label: "Other", icon: MessageCircle, hint: "Anything else on your mind." },
];

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

const FeedbackPage = () => {
  const { streak } = useSpins();
  const { items, add, remove, clear, max } = useFeedback();
  const { toast } = useToast();

  const [category, setCategory] = useState<FeedbackCategory>("idea");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const activeCat = categories.find((c) => c.id === category)!;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = feedbackSchema.safeParse({ category, message });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check your input.");
      return;
    }
    setError(null);
    const res = add(parsed.data);
    if (!res.ok) {
      toast({ title: "Couldn't save", description: res.error, variant: "destructive" });
      return;
    }
    sfx.accept();
    toast({ title: "Thanks for the nudge", description: "Your suggestion was saved." });
    setMessage("");
  };

  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-5 pt-6 pb-3 max-w-2xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-2xl gradient-primary flex items-center justify-center soft-shadow">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-semibold">Feedback</span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Help shape Nudge. Your suggestions stay on this device.
        </p>
      </header>

      <section className="flex-1 px-5 py-4 max-w-2xl mx-auto w-full space-y-6">
        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl bg-card p-5 soft-shadow border border-border/60 space-y-4"
        >
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Type
            </Label>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {categories.map(({ id, label, icon: Icon }) => {
                const active = category === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      sfx.tap();
                      setCategory(id);
                    }}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-2xl px-2 py-3 text-xs font-medium transition-all border",
                      active
                        ? "gradient-primary text-primary-foreground border-transparent soft-shadow"
                        : "bg-secondary text-muted-foreground border-border/60 hover:text-foreground",
                    )}
                    aria-pressed={active}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">{activeCat.hint}</p>
          </div>

          <div>
            <Label htmlFor="fb-msg" className="text-xs uppercase tracking-wide text-muted-foreground">
              Your suggestion
            </Label>
            <Textarea
              id="fb-msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What would make Nudge better for you?"
              maxLength={500}
              rows={4}
              className="mt-2"
              aria-invalid={!!error}
            />
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className={cn("text-destructive", !error && "invisible")}>
                {error ?? "placeholder"}
              </span>
              <span className="text-muted-foreground">{message.length}/500</span>
            </div>
          </div>

          <Button type="submit" variant="hero" size="lg" className="w-full">
            <Send className="h-4 w-4" />
            Send suggestion
          </Button>
        </form>

        {/* Submitted list */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-semibold">
              Your suggestions{" "}
              <span className="text-sm font-normal text-muted-foreground">
                ({items.length}/{max})
              </span>
            </h2>
            {items.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  sfx.reject();
                  clear();
                }}
                className="text-muted-foreground hover:text-destructive"
              >
                Clear all
              </Button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="rounded-2xl bg-secondary p-6 text-center text-sm text-muted-foreground">
              No suggestions yet. Drop your first one above.
            </div>
          ) : (
            <ul className="space-y-2">
              {items.map((entry) => {
                const cat = categories.find((c) => c.id === entry.category) ?? categories[3];
                const Icon = cat.icon;
                return (
                  <li
                    key={entry.id}
                    className="rounded-2xl bg-card p-3 soft-shadow border border-border/60 flex gap-3"
                  >
                    <div className="h-9 w-9 shrink-0 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="font-medium uppercase tracking-wide">{cat.label}</span>
                        <span>·</span>
                        <span>{timeAgo(entry.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-sm whitespace-pre-wrap break-words">
                        {entry.message}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        sfx.reject();
                        remove(entry.id);
                      }}
                      aria-label="Delete suggestion"
                      className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-secondary transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <BottomNav streak={streak} />
    </main>
  );
};

export default FeedbackPage;
