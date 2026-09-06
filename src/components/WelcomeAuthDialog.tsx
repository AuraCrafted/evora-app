import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const SEEN_KEY = "evora.welcomeAuth.seen.v1";

export function WelcomeAuthDialog() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (user) return;
    if (localStorage.getItem(SEEN_KEY)) return;
    setOpen(true);
  }, [loading, user]);

  const dismiss = () => {
    try {
      localStorage.setItem(SEEN_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  const go = (mode: "signin" | "signup") => {
    dismiss();
    navigate(`/auth?mode=${mode}&redirect=/`);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? dismiss() : undefined)}>
      <DialogContent className="max-w-xs rounded-3xl text-center">
        <h2 className="font-display text-3xl font-semibold tracking-[0.2em] mt-2">EVORA</h2>
        <p className="text-sm text-muted-foreground">
          Sign in to save your spins, streak and plan.
        </p>
        <div className="space-y-2.5 mt-3">
          <Button variant="hero" className="w-full" onClick={() => go("signin")}>
            Sign in
          </Button>
          <Button variant="outline" className="w-full" onClick={() => go("signup")}>
            Sign up
          </Button>
          <button
            type="button"
            onClick={dismiss}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors pt-1"
          >
            Maybe later
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
