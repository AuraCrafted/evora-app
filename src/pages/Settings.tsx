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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { useSpins } from "@/hooks/useSpins";
import { useSubscription } from "@/hooks/useSubscription";
import { useIAP } from "@/hooks/useIAP";
import { sfx } from "@/lib/feedback";
import { haptic, isIOS } from "@/lib/native";
import { toast } from "sonner";
import { useState } from "react";

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
      <header className="px-5 pt-6 pb-3 max-w-2xl mx-auto w-full flex items-center gap-3">
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

      <section className="px-5 pt-2 pb-32 max-w-2xl mx-auto w-full space-y-5">
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
