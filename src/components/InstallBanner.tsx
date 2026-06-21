import { useEffect, useState } from "react";
import { Download, X, Share, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { sfx } from "@/lib/feedback";
import { Capacitor } from "@capacitor/core";

const isNative = () => Capacitor.isNativePlatform();

const DISMISS_KEY = "nudge.installDismissed.v1";
const DISMISS_DAYS = 7;

const InstallBannerContent = () => {
  const { canPrompt, installed, platform, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(true); // start hidden, decide after mount
  const [showIosSheet, setShowIosSheet] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) {
      setDismissed(false);
      return;
    }
    const ts = Number(raw);
    if (!Number.isFinite(ts)) {
      setDismissed(false);
      return;
    }
    const age = Date.now() - ts;
    setDismissed(age < DISMISS_DAYS * 24 * 60 * 60 * 1000);
  }, []);

  if (installed || dismissed) return null;
  // Only show when we can actually do something useful
  if (!canPrompt && platform !== "ios") return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  };

  const handleInstall = async () => {
    sfx.tap();
    if (platform === "ios") {
      setShowIosSheet(true);
      return;
    }
    const outcome = await promptInstall();
    if (outcome === "accepted") sfx.celebrate();
    if (outcome === "dismissed") dismiss();
  };

  return (
    <>
      <div className="px-4 pt-3 max-w-2xl mx-auto w-full animate-fade-in-up">
        <div className="rounded-2xl bg-card border border-border/60 soft-shadow p-3 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center shrink-0">
            <Download className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold leading-tight">Add Evora to your home screen</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              One tap to roll. Feels like a real app.
            </p>
          </div>
          <Button size="sm" variant="hero" onClick={handleInstall} className="shrink-0">
            Install
          </Button>
          <button
            onClick={() => {
              sfx.tap();
              dismiss();
            }}
            aria-label="Dismiss"
            className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {showIosSheet && (
        <div
          className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in-up"
          onClick={() => setShowIosSheet(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-card p-6 soft-shadow"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="text-4xl mb-2">📱</div>
              <h3 className="font-display text-xl font-semibold">Install on iPhone</h3>
              <p className="text-sm text-muted-foreground mt-1">Two quick taps in Safari.</p>
            </div>
            <ol className="mt-5 space-y-3 text-sm">
              <li className="flex items-center gap-3 rounded-2xl bg-secondary p-3">
                <span className="h-7 w-7 rounded-full gradient-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                  1
                </span>
                <span className="flex-1">Tap the</span>
                <Share className="h-4 w-4 text-primary" />
                <span>Share button</span>
              </li>
              <li className="flex items-center gap-3 rounded-2xl bg-secondary p-3">
                <span className="h-7 w-7 rounded-full gradient-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                  2
                </span>
                <span className="flex-1">Choose</span>
                <Plus className="h-4 w-4 text-primary" />
                <span>Add to Home Screen</span>
              </li>
            </ol>
            <Button
              variant="soft"
              className="w-full mt-5"
              onClick={() => {
                setShowIosSheet(false);
                dismiss();
              }}
            >
              Got it
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export const InstallBanner = () => {
  // Never render PWA install UI inside the native Capacitor app — it's already installed.
  if (isNative()) return null;

  return <InstallBannerContent />;
};
