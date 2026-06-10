import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, X, Gift, PlayCircle, Infinity as InfinityIcon, Wand2, Clock, ShieldOff, Check } from "lucide-react";
import { sfx } from "@/lib/feedback";

export type AdMode = "interstitial" | "rewarded";

interface AdDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpgrade?: () => void;
  mode?: AdMode;
  /** Called when a rewarded ad completes successfully (user earned reward). */
  onReward?: () => void;
}

const COUNTDOWN = 5;
const REWARDED_DURATION = 15;

export function AdDialog({
  open,
  onOpenChange,
  onUpgrade,
  mode = "interstitial",
  onReward,
}: AdDialogProps) {
  // "offer" | "playing" | "complete" — only used in rewarded mode
  const [stage, setStage] = useState<"offer" | "playing" | "complete">("offer");
  const [seconds, setSeconds] = useState(COUNTDOWN);
  const [rewardClaimed, setRewardClaimed] = useState(false);

  // Reset whenever the dialog opens or mode changes
  useEffect(() => {
    if (!open) return;
    setRewardClaimed(false);
    if (mode === "rewarded") {
      setStage("offer");
      setSeconds(REWARDED_DURATION);
    } else {
      setStage("playing");
      setSeconds(COUNTDOWN);
    }
  }, [open, mode]);

  // Countdown ticker (runs while "playing")
  useEffect(() => {
    if (!open || stage !== "playing") return;
    const id = window.setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          window.clearInterval(id);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [open, stage]);

  // When rewarded ad finishes, grant the reward exactly once
  useEffect(() => {
    if (mode !== "rewarded") return;
    if (stage !== "playing") return;
    if (seconds === 0 && !rewardClaimed) {
      setRewardClaimed(true);
      setStage("complete");
      onReward?.();
      sfx.celebrate();
    }
  }, [mode, stage, seconds, rewardClaimed, onReward]);

  const canClose = mode === "rewarded" ? stage !== "playing" : seconds === 0;

  const handleStartRewarded = () => {
    sfx.tap();
    setStage("playing");
    setSeconds(REWARDED_DURATION);
  };

  // ------- Rewarded: offer stage -------
  if (mode === "rewarded" && stage === "offer") {
    return (
      <Dialog open={open} onOpenChange={(v) => (!v ? onOpenChange(false) : onOpenChange(true))}>
        <DialogContent className="max-w-sm rounded-3xl p-0 overflow-hidden">
          <div className="relative gradient-primary px-6 py-10 text-center text-primary-foreground">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm mb-4">
              <Gift className="h-7 w-7" />
            </div>
            <DialogHeader className="space-y-2">
              <DialogTitle className="font-display text-xl font-semibold text-primary-foreground">
                Out of rolls?
              </DialogTitle>
              <DialogDescription className="text-primary-foreground/90 text-sm">
                Watch a short ad to earn one extra roll — or go Pro for unlimited.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="px-6 py-5 space-y-3">
            <Button variant="hero" size="lg" className="w-full" onClick={handleStartRewarded}>
              <PlayCircle className="h-4 w-4" />
              Watch ad for +1 roll
            </Button>
            {onUpgrade && (
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => {
                  sfx.tap();
                  onUpgrade();
                  onOpenChange(false);
                }}
              >
                Upgrade to Pro
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={() => {
                sfx.tap();
                onOpenChange(false);
              }}
            >
              Not now
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ------- Rewarded: complete stage -------
  if (mode === "rewarded" && stage === "complete") {
    return (
      <Dialog open={open} onOpenChange={(v) => (!v ? onOpenChange(false) : onOpenChange(true))}>
        <DialogContent className="max-w-sm rounded-3xl p-0 overflow-hidden [&>button]:hidden">
          <div className="relative gradient-primary px-6 py-10 text-center text-primary-foreground">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm mb-4">
              <Sparkles className="h-7 w-7" />
            </div>
            <DialogHeader className="space-y-2">
              <DialogTitle className="font-display text-xl font-semibold text-primary-foreground">
                +1 roll unlocked
              </DialogTitle>
              <DialogDescription className="text-primary-foreground/90 text-sm">
                Thanks for watching! Your bonus roll is ready.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="px-6 py-5">
            <Button
              variant="hero"
              size="lg"
              className="w-full"
              onClick={() => {
                sfx.tap();
                onOpenChange(false);
              }}
            >
              Roll now
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ------- Playing stage (interstitial OR rewarded playback) -------

  // Rewarded playback: promote Pro benefits persuasively.
  if (mode === "rewarded") {
    const perks = [
      { icon: InfinityIcon, title: "Unlimited rolls", desc: "Never hit a daily cap again." },
      { icon: Wand2, title: "Custom evoras", desc: "Build your own personal task library." },
      { icon: Clock, title: "Smart timing", desc: "Nudges tuned to your time & energy." },
      { icon: ShieldOff, title: "Zero ads", desc: "Clean, distraction-free momentum." },
    ];

    return (
      <Dialog
        open={open}
        onOpenChange={(v) => (!v && canClose ? onOpenChange(false) : v && onOpenChange(true))}
      >
        <DialogContent className="max-w-sm rounded-3xl p-0 overflow-hidden [&>button]:hidden">
          <div className="relative gradient-primary px-6 pt-8 pb-6 text-center text-primary-foreground">
            <div className="absolute top-3 right-3 text-[11px] font-medium opacity-80 uppercase tracking-wide">
              Ad
            </div>
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm mb-3">
              <Sparkles className="h-6 w-6" />
            </div>
            <DialogHeader className="space-y-1.5">
              <DialogTitle className="font-display text-xl font-semibold text-primary-foreground">
                Skip the wait. Go Pro.
              </DialogTitle>
              <DialogDescription className="text-primary-foreground/90 text-sm">
                One roll isn't enough when momentum is building. Here's everything Pro unlocks — instantly.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="px-6 py-5 space-y-4">
            <ul className="space-y-2.5">
              {perks.map(({ icon: Icon, title, desc }) => (
                <li key={title} className="flex items-start gap-3">
                  <div className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      {title}
                      <Check className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="text-xs text-muted-foreground leading-snug">{desc}</div>
                  </div>
                </li>
              ))}
            </ul>

            {onUpgrade && (
              <Button
                variant="hero"
                size="lg"
                className="w-full"
                onClick={() => {
                  sfx.tap();
                  onUpgrade();
                  onOpenChange(false);
                }}
              >
                Unlock Pro — skip the ad
              </Button>
            )}
            <Button
              variant="ghost"
              size="lg"
              className="w-full"
              disabled={!canClose}
              onClick={() => {
                sfx.tap();
                onOpenChange(false);
              }}
            >
              {canClose ? (
                <span className="inline-flex items-center gap-1.5">
                  <Check className="h-4 w-4" /> Claim +1 roll
                </span>
              ) : (
                <>Reward in {seconds}s</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ------- Interstitial playback -------
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => (!v && canClose ? onOpenChange(false) : v && onOpenChange(true))}
    >
      <DialogContent className="max-w-sm rounded-3xl p-0 overflow-hidden [&>button]:hidden">
        <div className="relative gradient-primary px-6 py-10 text-center text-primary-foreground">
          <div className="absolute top-3 right-3 text-[11px] font-medium opacity-80 uppercase tracking-wide">
            Ad
          </div>
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm mb-4">
            <Sparkles className="h-7 w-7" />
          </div>
          <DialogHeader className="space-y-2">
            <DialogTitle className="font-display text-xl font-semibold text-primary-foreground">
              Enjoying Nudge?
            </DialogTitle>
            <DialogDescription className="text-primary-foreground/90 text-sm">
              Go Pro to remove ads, unlock unlimited rolls, custom nudges, and smart filters.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 py-5 space-y-3">
          {onUpgrade && (
            <Button
              variant="hero"
              size="lg"
              className="w-full"
              onClick={() => {
                sfx.tap();
                onUpgrade();
                onOpenChange(false);
              }}
            >
              Upgrade to Pro
            </Button>
          )}
          <Button
            variant="ghost"
            size="lg"
            className="w-full"
            disabled={!canClose}
            onClick={() => {
              sfx.tap();
              onOpenChange(false);
            }}
          >
            {canClose ? (
              <span className="inline-flex items-center gap-1.5">
                <X className="h-4 w-4" /> Close
              </span>
            ) : (
              <>Continue in {seconds}s</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
