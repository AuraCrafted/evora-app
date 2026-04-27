import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, X } from "lucide-react";
import { sfx } from "@/lib/feedback";

interface AdDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpgrade?: () => void;
}

const COUNTDOWN = 5;

export function AdDialog({ open, onOpenChange, onUpgrade }: AdDialogProps) {
  const [seconds, setSeconds] = useState(COUNTDOWN);

  useEffect(() => {
    if (!open) {
      setSeconds(COUNTDOWN);
      return;
    }
    const id = window.setInterval(() => {
      setSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [open]);

  const canClose = seconds === 0;

  return (
    <Dialog open={open} onOpenChange={(v) => (!v && canClose ? onOpenChange(false) : v && onOpenChange(true))}>
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
