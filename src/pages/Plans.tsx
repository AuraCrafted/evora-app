import { Check, Sparkles, X, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSpins, type PlanTier } from "@/hooks/useSpins";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import {
  appleIAPErrorMessage,
  isApplePurchaseCancelled,
  useIAP,
  type IAPProductId,
} from "@/hooks/useIAP";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { sfx } from "@/lib/feedback";
import { toast } from "sonner";

const APPLE_PRODUCT_BY_PLAN: Record<"month" | "year", IAPProductId> = {
  month: "com.thiskid7.evora.monthly",
  year: "com.thiskid7.evora.yearly",
};

interface Plan {
  id: PlanTier;
  name: string;
  price: string;
  period: string;
  perDay: string;
  badge?: string;
  highlight?: boolean;
  tagline: string;
  features: string[];
  priceId?: "evora_monthly" | "evora_yearly";
}

const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    perDay: "No card needed",
    tagline: "Get unstuck, occasionally.",
    features: [
      "10 rolls per day",
      "🔋 1 energy-aware roll per day",
      "Mixed categories",
      "Skip freely",
      "Visual streak",
    ],
  },
  {
    id: "month",
    name: "Monthly",
    price: "$8.99",
    period: "/ month",
    perDay: "$0.30/day",
    badge: "Most useful",
    highlight: true,
    tagline: "Right-Time Rolls — context-aware.",
    priceId: "evora_monthly",
    features: [
      "Unlimited rolls",
      "Choose your category",
      "Custom evoras",
      "⏰ Time-of-day filtering",
      "🔋 Energy-aware tasks (low / normal / push)",
      "🏷️ Tag your custom evoras",
      "✋ Commit Mode (soft accountability)",
      "📊 Activity patterns",
      "Ad-free",
    ],
  },
  {
    id: "year",
    name: "Yearly",
    price: "$49.99",
    period: "/ year",
    perDay: "$0.14/day",
    badge: "Best value",
    tagline: "A long-term action system.",
    priceId: "evora_yearly",
    features: [
      "Everything in Monthly",
      "🤖 AI Coach — your personal guide",
      "🔥 Personal Action System (your own taxonomy)",
      "🛤️ Guided Paths (slump, focus, less scrolling)",
      "🪞 Reflection layer after tasks",
      "📈 Insights dashboard",
      "Save 54% vs monthly",
    ],
  },
];

const Plans = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, signOut } = useAuth();
  const { streak } = useSpins();
  const { tier, isPro, cancelAtPeriodEnd, periodEnd, refetch } = useSubscription();
  const { openCheckout, closeCheckout, isOpen, checkoutElement } = useStripeCheckout();
  const iap = useIAP();
  const [pendingPlan, setPendingPlan] = useState<Plan | null>(null);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (searchParams.get("checkout") === "success") {
      toast.success("Payment received — activating your plan…");
      const t = setTimeout(() => refetch(), 2500);
      searchParams.delete("checkout");
      searchParams.delete("session_id");
      setSearchParams(searchParams, { replace: true });
      return () => clearTimeout(t);
    }
  }, [searchParams, setSearchParams, refetch]);

  const requireAuth = (next: () => void) => {
    if (!user) {
      navigate("/auth?mode=signup&redirect=/plans");
      return;
    }
    next();
  };

  const handleChoose = (plan: Plan) => {
    sfx.tap();
    requireAuth(() => setPendingPlan(plan));
  };

  const confirmCheckout = async () => {
    if (!pendingPlan || !user) return;

    // iOS native: Apple In-App Purchase
    if (iap.enabled) {
      const productId =
        pendingPlan.id === "month" || pendingPlan.id === "year"
          ? APPLE_PRODUCT_BY_PLAN[pendingPlan.id]
          : null;
      if (!productId) {
        console.error("[IAP] Missing Apple product ID for selected plan", {
          planId: pendingPlan.id,
        });
        toast.error("This plan is missing an Apple product ID.");
        setPendingPlan(null);
        return;
      }
      console.info("[IAP] Continue to payment tapped", {
        planId: pendingPlan.id,
        requestedProductId: productId,
        expectedProductIds: APPLE_PRODUCT_BY_PLAN,
      });
      setPendingPlan(null);
      try {
        await iap.purchase(productId);
        toast.success("Purchase successful — activating your plan…");
        setTimeout(() => refetch(), 1500);
      } catch (e: any) {
        const cancelledByUser = isApplePurchaseCancelled(e);
        console.error("[IAP] Checkout failed", {
          productId,
          cancelledByUser,
          error: e,
        });
        if (cancelledByUser) {
          toast.message("Purchase cancelled.");
          return;
        }
        toast.error(appleIAPErrorMessage(e), {
          description:
            "Verify your Xcode StoreKit file contains this exact product ID: " + productId,
        });
      }
      return;
    }

    // Web: Stripe embedded checkout
    if (!pendingPlan.priceId) return;
    const priceId = pendingPlan.priceId;
    setPendingPlan(null);
    try {
      openCheckout({
        priceId,
        quantity: 1,
        customerEmail: user.email,
        userId: user.id,
        returnUrl: `${window.location.origin}/plans?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      });
    } catch (e: any) {
      console.error("Checkout error:", e);
      toast.error(e?.message || "Couldn't open checkout.");
    }
  };

  const handleRestore = async () => {
    sfx.tap();
    setRestoring(true);
    try {
      await iap.restore();
      toast.success("Purchases restored.");
      setTimeout(() => refetch(), 1000);
    } catch (e: any) {
      toast.error(e?.message || "Couldn't restore purchases.");
    } finally {
      setRestoring(false);
    }
  };

  const confirmCancel = async () => {
    setCancelling(true);
    try {
      if (iap.enabled) {
        // Apple requires subscription cancellation through App Store settings.
        toast.message("Manage your subscription in the App Store", {
          description:
            "Open Settings → [Your Name] → Subscriptions to cancel. Changes sync back on next launch.",
        });
        setShowCancel(false);
        return;
      }
      const { error } = await supabase.functions.invoke("cancel-subscription");
      if (error) throw error;
      toast.success("Cancellation scheduled.", {
        description: periodEnd
          ? `You keep access until ${new Date(periodEnd).toLocaleDateString()}.`
          : "You keep access until the end of the current billing period.",
      });
      setShowCancel(false);
      setTimeout(() => refetch(), 1500);
    } catch (e: any) {
      toast.error(e.message || "Couldn't cancel subscription.");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-5 pt-6 pb-3 max-w-2xl mx-auto w-full">
        <div className="flex items-center gap-2 mb-6">
          <div className="h-9 w-9 rounded-2xl gradient-primary flex items-center justify-center soft-shadow">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-semibold">Plans</span>
          <div className="ml-auto flex items-center gap-2">
            {user ? (
              <>
                <span className="text-xs text-muted-foreground hidden sm:inline">{user.email}</span>
                <Button variant="ghost" size="sm" onClick={() => signOut()}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => navigate("/auth?redirect=/plans")}>
                Sign in
              </Button>
            )}
          </div>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
          Pick what fits
          <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-[hsl(14_80%_55%)] to-[hsl(22_90%_65%)]">
            right now.
          </span>
        </h1>
        <p className="mt-3 text-muted-foreground text-[15px] max-w-md">
          Start free. Upgrade when randomness stops being enough — cancel anytime.
        </p>

        {isPro && (
          <div className="mt-5 rounded-2xl border border-primary/40 bg-accent/40 px-4 py-3 flex items-center gap-3 soft-shadow">
            <Sparkles className="h-4 w-4 text-primary" />
            <div className="text-sm flex-1">
              <span className="font-semibold text-foreground">
                You're on {tier === "year" ? "Yearly" : "Monthly"}.
              </span>{" "}
              <span className="text-muted-foreground">
                {cancelAtPeriodEnd && periodEnd
                  ? `Ends ${new Date(periodEnd).toLocaleDateString()}.`
                  : "All features unlocked."}
              </span>
            </div>
            {!cancelAtPeriodEnd && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { sfx.tap(); setShowCancel(true); }}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
            )}
          </div>
        )}
      </header>

      <section className="px-5 pt-4 pb-32 max-w-2xl mx-auto w-full">
        <div className="grid gap-4 sm:grid-cols-2">
          {plans.map((plan) => {
            const isCurrent = tier === plan.id;
            return (
              <div
                key={plan.id}
                className={`relative rounded-3xl p-5 flex flex-col soft-shadow transition-transform hover:-translate-y-0.5 ${
                  isCurrent
                    ? "bg-card border-2 border-primary"
                    : plan.highlight
                    ? "bg-card border-2 border-primary/40"
                    : "bg-card border border-border"
                }`}
              >
                {plan.badge && (
                  <span className="absolute -top-2 right-4 rounded-full gradient-primary px-2.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                    {plan.badge}
                  </span>
                )}

                <div className="flex items-baseline justify-between">
                  <h3 className="font-display text-lg font-semibold text-foreground">{plan.name}</h3>
                  <div className="text-right">
                    <div className="font-display text-2xl font-semibold text-foreground">{plan.price}</div>
                    <div className="text-[11px] text-muted-foreground">{plan.period}</div>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground mt-1">{plan.perDay}</div>
                <p className="text-sm text-foreground/80 mt-3 italic">{plan.tagline}</p>

                <ul className="mt-4 space-y-2 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-foreground">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full gradient-primary">
                        <Check className="h-2.5 w-2.5 text-primary-foreground" strokeWidth={3} />
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <Button variant="ghost" size="sm" disabled className="mt-5 w-full">
                    <Check className="h-4 w-4" />
                    Selected Plan
                  </Button>
                ) : plan.id === "free" ? (
                  isPro ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-5 w-full"
                      disabled={cancelAtPeriodEnd}
                      onClick={() => { sfx.tap(); setShowCancel(true); }}
                    >
                      {cancelAtPeriodEnd ? "Cancellation scheduled" : "Cancel & downgrade"}
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" disabled className="mt-5 w-full">
                      You're on Free
                    </Button>
                  )
                ) : (
                  <Button
                    onClick={() => handleChoose(plan)}
                    variant={plan.highlight ? "hero" : "outline"}
                    size="sm"
                    className="mt-5 w-full"
                  >
                    {isPro ? `Switch to ${plan.name}` : `Choose ${plan.name}`}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {iap.enabled && (
          <div className="mt-6 flex flex-col items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRestore}
              disabled={restoring || iap.busy}
            >
              {restoring ? <Loader2 className="h-4 w-4 animate-spin" /> : "Restore Purchases"}
            </Button>
            <p className="text-[11px] text-muted-foreground text-center max-w-xs">
              Already subscribed on another device? Tap Restore. Manage or cancel anytime in
              Settings → Subscriptions.
            </p>
          </div>
        )}

        <p className="text-center text-[11px] text-muted-foreground mt-6">
          {iap.enabled ? "Billed by Apple. Cancel anytime in App Store settings." : "Secure checkout. Cancel anytime."}
        </p>
      </section>

      <BottomNav streak={streak} />

      <AlertDialog open={pendingPlan !== null} onOpenChange={(v) => !v && setPendingPlan(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isPro
                ? `Switch to ${pendingPlan?.name}?`
                : `Subscribe to ${pendingPlan?.name}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isPro
                ? "Your current plan will end and the new plan will start at checkout."
                : `You'll be charged ${pendingPlan?.price} ${pendingPlan?.period}. Cancel anytime.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not now</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCheckout}>Continue to checkout</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isOpen} onOpenChange={(v) => !v && closeCheckout()}>
        <DialogContent className="max-w-2xl rounded-3xl p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Complete your purchase</DialogTitle>
          </DialogHeader>
          <div className="max-h-[80vh] overflow-y-auto px-2 pb-2">
            {checkoutElement}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showCancel} onOpenChange={setShowCancel}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel your subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll keep access until {periodEnd ? new Date(periodEnd).toLocaleDateString() : "the end of your billing period"}, then move to Free.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep my plan</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancel}
              disabled={cancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : "Yes, cancel"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
};

export default Plans;
