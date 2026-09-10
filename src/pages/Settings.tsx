import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ChevronRight,
  FileText,
  Lock,
  LogOut,
  RefreshCw,
  Settings as SettingsIcon,
  Sparkles,
  CreditCard,
  Heart,
  Volume2,
  Vibrate,
  Trash2,
} from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { useSpins } from "@/hooks/useSpins";
import { useSubscription } from "@/hooks/useSubscription";
import { useIAP } from "@/hooks/useIAP";
import { sfx } from "@/lib/feedback";
import {
  getSoundSettings,
  setSoundEnabled,
  setHapticsEnabled,
  setVolume,
  subscribeSoundSettings,
  playSound,
} from "@/lib/sounds";
import { haptic, isIOS } from "@/lib/native";
import { toast } from "sonner";
import { useEffect, useState } from "react";

const Row = ({
  icon: Icon,
  label,
  onClick,
  to,
  right,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
  to?: string;
  right?: React.ReactNode;
}) => {
  const content = (
    <div className="flex items-center gap-3 px-4 py-3.5 active:bg-muted/60 transition-colors">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="flex-1 text-sm text-foreground">{label}</span>
      {right ?? <ChevronRight className="h-4 w-4 text-muted-foreground" />}
    </div>
  );
  if (to) {
    return (
      <Link to={to} onClick={() => sfx.tap()}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className="w-full text-left">
      {content}
    </button>
  );
};

const Settings = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { streak } = useSpins();
  const { tier, isPro } = useSubscription();
  const iap = useIAP();
  const [restoring, setRestoring] = useState(false);
  const [sound, setSound] = useState(getSoundSettings());

  useEffect(() => subscribeSoundSettings(setSound), []);

  const handleToggleSound = (v: boolean) => {
    setSoundEnabled(v);
    if (v) playSound("tab");
    haptic("selection");
  };

  const handleToggleHaptics = (v: boolean) => {
    setHapticsEnabled(v);
    if (v) haptic("light");
  };

  const handleVolume = (vals: number[]) => {
    setVolume((vals[0] ?? 70) / 100);
  };

  const handleRestore = async () => {
    sfx.tap();
    haptic("light");
    setRestoring(true);
    try {
      await iap.restore();
      haptic("success");
      toast.success("Purchases restored.");
    } catch (e: any) {
      haptic("error");
      toast.error(e?.message || "Couldn't restore purchases.");
    } finally {
      setRestoring(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col pt-safe">
      <header className="px-5 pt-6 pb-3 max-w-2xl lg:max-w-4xl mx-auto w-full flex items-center gap-3">
        <button
          onClick={() => {
            sfx.tap();
            navigate(-1);
          }}
          aria-label="Back"
          className="h-9 w-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-2xl gradient-primary flex items-center justify-center soft-shadow">
            <SettingsIcon className="h-4 w-4 text-primary-foreground" />
          </div>
          <h1 className="font-display text-xl font-semibold">Settings</h1>
        </div>
      </header>

      <section className="px-5 pt-2 pb-32 max-w-2xl lg:max-w-4xl mx-auto w-full space-y-5">
        {/* Account */}
        <div>
          <div className="px-2 pb-1.5 text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
            Account
          </div>
          <div className="rounded-2xl bg-card border border-border/60 soft-shadow overflow-hidden divide-y divide-border/60">
            {user ? (
              <>
                <div className="px-4 py-3.5">
                  <div className="text-[11px] text-muted-foreground">Signed in as</div>
                  <div className="text-sm font-medium truncate">{user.email}</div>
                </div>
                <Row
                  icon={LogOut}
                  label="Sign out"
                  onClick={() => {
                    sfx.tap();
                    signOut();
                  }}
                  right={null}
                />
              </>
            ) : (
              <Row
                icon={LogOut}
                label="Sign in"
                onClick={() => {
                  sfx.tap();
                  navigate("/auth");
                }}
              />
            )}
          </div>
        </div>

        {/* Subscription */}
        <div>
          <div className="px-2 pb-1.5 text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
            Subscription
          </div>
          <div className="rounded-2xl bg-card border border-border/60 soft-shadow overflow-hidden divide-y divide-border/60">
            <div className="px-4 py-3.5 flex items-center gap-3">
              <Sparkles className="h-4 w-4 text-primary" />
              <div className="flex-1">
                <div className="text-sm font-medium">
                  {isPro ? (tier === "year" ? "Yearly" : "Monthly") : "Free"}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {isPro ? "All features unlocked" : "10 rolls / day"}
                </div>
              </div>
            </div>
            <Row icon={CreditCard} label="Manage plans" to="/plans" />
            {iap.enabled && (
              <Row
                icon={RefreshCw}
                label={restoring ? "Restoring…" : "Restore purchases"}
                onClick={handleRestore}
                right={null}
              />
            )}
          </div>
          {isIOS() && isPro && (
            <p className="px-2 pt-2 text-[11px] text-muted-foreground">
              Cancel or change your plan in Settings → Apple ID → Subscriptions.
            </p>
          )}
        </div>

        {/* Personalization */}
        <div>
          <div className="px-2 pb-1.5 text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
            Personalization
          </div>
          <div className="rounded-2xl bg-card border border-border/60 soft-shadow overflow-hidden divide-y divide-border/60">
            <Row icon={Heart} label="Edit your preferences" to="/onboarding" />
          </div>
          <p className="px-2 pt-2 text-[11px] text-muted-foreground">
            Evora uses these to tailor your rolls over time.
          </p>
        </div>

        {/* Sound & haptics */}
        <div>
          <div className="px-2 pb-1.5 text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
            Sound & haptics
          </div>
          <div className="rounded-2xl bg-card border border-border/60 soft-shadow overflow-hidden divide-y divide-border/60">
            <div className="flex items-center gap-3 px-4 py-3.5">
              <Volume2 className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 text-sm">Sounds</span>
              <Switch checked={sound.enabled} onCheckedChange={handleToggleSound} />
            </div>
            {sound.enabled && (
              <div className="px-4 py-3.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Volume</span>
                  <span className="text-[11px] tabular-nums text-muted-foreground">
                    {Math.round(sound.volume * 100)}%
                  </span>
                </div>
                <Slider
                  value={[Math.round(sound.volume * 100)]}
                  min={0}
                  max={100}
                  step={5}
                  onValueChange={handleVolume}
                  onValueCommit={() => playSound("tab")}
                />
              </div>
            )}
            <div className="flex items-center gap-3 px-4 py-3.5">
              <Vibrate className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 text-sm">Haptics</span>
              <Switch checked={sound.haptics} onCheckedChange={handleToggleHaptics} />
            </div>
          </div>
          <p className="px-2 pt-2 text-[11px] text-muted-foreground">
            Subtle, calming sounds. Long-press a setting in iOS Control Center to mute the device entirely.
          </p>
        </div>


        {/* Danger zone */}
        {user && (
          <div>
            <div className="px-2 pb-1.5 text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
              Danger zone
            </div>
            <div className="rounded-2xl bg-card border border-destructive/40 soft-shadow overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  sfx.tap();
                  setDeleteOpen(true);
                }}
                className="w-full text-left flex items-center gap-3 px-4 py-3.5 active:bg-destructive/10 transition-colors"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
                <span className="flex-1 text-sm font-medium text-destructive">Delete account</span>
              </button>
            </div>
            <p className="px-2 pt-2 text-[11px] text-muted-foreground">
              Permanently deletes your account, your spins, your chats, and your progress.
            </p>
          </div>
        )}

        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your account?</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3 text-left">
                  <p>
                    This permanently deletes your Evora account and all data tied to it: your
                    custom spins, coach chats, streak, and preferences. This cannot be undone.
                  </p>
                  {isPro && (
                    <p className="rounded-xl bg-destructive/10 p-3 text-destructive">
                      Heads up: deleting your Evora account does not cancel your App Store
                      subscription. Cancel it in Settings → Apple ID → Subscriptions, or you may
                      keep getting billed by Apple.
                    </p>
                  )}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Keep my account</AlertDialogCancel>
              <AlertDialogAction
                disabled={deleting}
                onClick={async (e) => {
                  e.preventDefault();
                  setDeleting(true);
                  try {
                    const { error } = await supabase.functions.invoke("delete-account");
                    if (error) throw error;
                    await signOut();
                    setDeleteOpen(false);
                    toast.success("Your account has been deleted.");
                    navigate("/", { replace: true });
                  } catch (err: any) {
                    haptic("error");
                    toast.error(err?.message || "Couldn't delete your account. Please try again.");
                  } finally {
                    setDeleting(false);
                  }
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? "Deleting…" : "Delete permanently"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Legal */}
        <div>
          <div className="px-2 pb-1.5 text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
            About
          </div>
          <div className="rounded-2xl bg-card border border-border/60 soft-shadow overflow-hidden divide-y divide-border/60">
            <Row icon={Lock} label="Privacy Policy" to="/privacy" />
            <Row icon={FileText} label="Terms of Service" to="/terms" />
            <Row icon={RefreshCw} label="Refund Policy" to="/refunds" />
          </div>
        </div>
      </section>

      <BottomNav streak={streak} />
    </main>
  );
};

export default Settings;
