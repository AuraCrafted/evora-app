import { useState } from "react";
import { useSpins } from "@/hooks/useSpins";
import { BottomNav } from "@/components/BottomNav";
import { ReminderSettings } from "@/components/ReminderSettings";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Flame, Check, X, Clock, Trash2, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { categoryEmoji, categoryLabels, Category } from "@/data/suggestions";
import { sfx } from "@/lib/feedback";

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

const HistoryPage = () => {
  const { history, allHistory, streak, completed, hasNudgedToday, clearHistory } = useSpins();
  const navigate = useNavigate();
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const decided = allHistory.filter((h) => h.accepted !== null).length;
  const acceptanceRate =
    decided > 0
      ? Math.round((allHistory.filter((h) => h.accepted).length / decided) * 100)
      : 0;

  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-5 pt-6 pb-2 max-w-2xl mx-auto w-full">
        <h1 className="font-display text-2xl font-semibold">Your journey</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Every yes builds momentum.
        </p>
      </header>

      <section className="px-5 pt-4 max-w-2xl mx-auto w-full">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-3xl bg-card p-4 soft-shadow text-center">
            <div className="flex items-center justify-center gap-1 text-primary mb-1">
              <Flame className="h-5 w-5 fill-current" />
              <span className="font-display text-2xl font-semibold text-foreground">
                {streak}
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground font-medium">
              Day streak
            </div>
          </div>
          <div className="rounded-3xl bg-card p-4 soft-shadow text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Check className="h-5 w-5 text-primary" />
              <span className="font-display text-2xl font-semibold text-foreground">
                {completed}
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground font-medium">
              Completed
            </div>
          </div>
          <div className="rounded-3xl bg-card p-4 soft-shadow text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="font-display text-2xl font-semibold text-foreground">
                {acceptanceRate}%
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground font-medium">
              Yes rate
            </div>
          </div>
        </div>

        {/* Streak banner */}
        {streak > 0 && (
          <div className="mt-4 rounded-3xl gradient-primary p-5 soft-shadow text-primary-foreground animate-fade-in-up">
            <div className="flex items-center gap-3">
              <div className="text-3xl">🔥</div>
              <div>
                <div className="font-display text-lg font-semibold">
                  {streak} day{streak === 1 ? "" : "s"} in a row
                </div>
                <div className="text-xs opacity-90">
                  Show up tomorrow to keep it going.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Daily reminder */}
        <div className="mt-4">
          <ReminderSettings streak={streak} hasNudgedToday={hasNudgedToday} />
        </div>
      </section>

      {/* History list */}
      <section className="px-5 pt-6 pb-32 max-w-2xl mx-auto w-full flex-1">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-semibold">Recent rolls</h2>
          {history.length > 0 && (
            <button
              onClick={() => {
                sfx.tap();
                setConfirmClearOpen(true);
              }}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="rounded-3xl bg-card p-8 soft-shadow text-center">
            <div className="text-4xl mb-3">🎲</div>
            <p className="text-sm text-muted-foreground mb-4">
              No rolls yet. Your nudges will show up here.
            </p>
            <Button
              variant="hero"
              onClick={() => {
                sfx.tap();
                navigate("/roll");
              }}
            >
              Roll your first dice
            </Button>
          </div>
        ) : (
          <ul className="space-y-2">
            {history.map((h) => (
              <li
                key={h.id}
                className="flex items-center gap-3 rounded-2xl bg-card p-3 soft-shadow"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-xl">
                  {h.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm text-foreground truncate">
                    {h.title}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                    <span>{categoryEmoji[h.category as Category] ?? "🎲"}</span>
                    <span>{categoryLabels[h.category as Category] ?? h.category}</span>
                    <span>·</span>
                    <Clock className="h-3 w-3" />
                    <span>{timeAgo(h.ts)}</span>
                  </div>
                </div>
                <div className="shrink-0">
                  {h.accepted === true && (
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Check className="h-4 w-4" />
                    </span>
                  )}
                  {h.accepted === false && (
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <X className="h-4 w-4" />
                    </span>
                  )}
                  {h.accepted === null && (
                    <span className="inline-flex h-7 items-center rounded-full bg-muted px-2 text-[10px] font-medium text-muted-foreground">
                      pending
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <BottomNav streak={streak} />
    </main>
  );
};

export default HistoryPage;
