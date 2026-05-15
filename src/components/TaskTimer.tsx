import { useEffect, useMemo, useRef, useState } from "react";
import { Suggestion, categoryLabels } from "@/data/suggestions";
import { Button } from "@/components/ui/button";
import { Pause, Play, Check, X, Volume2, VolumeX } from "lucide-react";
import { sfx, isTimerSoundEnabled, setTimerSoundEnabled, playTimerComplete } from "@/lib/feedback";
import { cn } from "@/lib/utils";

interface Props {
  suggestion: Suggestion;
  onComplete: () => void;
  onCancel: () => void;
}

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export const TaskTimer = ({ suggestion, onComplete, onCancel }: Props) => {
  const totalSeconds = useMemo(
    () => Math.max(1, Math.round((suggestion.minutes ?? 1) * 60)),
    [suggestion],
  );
  const [remaining, setRemaining] = useState(totalSeconds);
  const [running, setRunning] = useState(true);
  const [done, setDone] = useState(false);
  const completedRef = useRef(false);

  useEffect(() => {
    setRemaining(totalSeconds);
    setRunning(true);
    setDone(false);
    completedRef.current = false;
  }, [suggestion.id, totalSeconds]);

  useEffect(() => {
    if (!running || done) return;
    const id = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          window.clearInterval(id);
          if (!completedRef.current) {
            completedRef.current = true;
            setDone(true);
            setRunning(false);
            sfx.celebrate();
          }
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, done]);

  const progress = 1 - remaining / totalSeconds;
  const size = 260;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="flex flex-col items-center gap-6 w-full animate-scale-in">
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          {categoryLabels[suggestion.category]}
        </span>
        <h2 className="mt-3 font-display text-xl font-semibold text-foreground leading-tight">
          {suggestion.emoji} {suggestion.title}
        </h2>
      </div>

      <div
        className={cn(
          "relative flex items-center justify-center",
          done && "animate-float",
        )}
        style={{ width: size, height: size }}
      >
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--secondary))"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 1s linear" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-5xl font-semibold tabular-nums text-foreground">
            {fmt(remaining)}
          </span>
          <span className="mt-1 text-xs text-muted-foreground">
            {done ? "Time's up — nice work!" : `of ${suggestion.duration}`}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-md">
        {done ? (
          <Button onClick={onComplete} variant="hero" size="lg" className="w-full">
            <Check className="h-5 w-5" />
            Mark done
          </Button>
        ) : (
          <>
            <Button
              onClick={() => {
                sfx.tap();
                setRunning((r) => !r);
              }}
              variant="hero"
              size="lg"
              className="w-full"
            >
              {running ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              {running ? "Pause" : "Resume"}
            </Button>
            <Button
              onClick={() => {
                sfx.tap();
                onComplete();
              }}
              variant="ghost"
              size="lg"
              className="w-full text-muted-foreground hover:text-foreground"
            >
              <Check className="h-4 w-4" />
              I'm done early
            </Button>
          </>
        )}
        <Button
          onClick={() => {
            sfx.tap();
            onCancel();
          }}
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground"
        >
          <X className="h-4 w-4" />
          Cancel
        </Button>
      </div>
    </div>
  );
};
