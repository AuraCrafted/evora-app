import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Plan {
  id: string;
  name: string;
  price: string;
  period: string;
  perDay: string;
  badge?: string;
  highlight?: boolean;
  features: string[];
}

const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    perDay: "No card needed",
    features: [
      "5 rolls per day",
      "🔋 1 energy-aware roll per day",
      "All built-in categories",
      "Streaks & history",
    ],
  },
  {
    id: "month",
    name: "Evora Elevate",
    price: "$9.99",
    period: "/ month",
    perDay: "Billed monthly",
    badge: "Popular",
    highlight: true,
    features: [
      "Unlimited rolls",
      "🔋 Full energy-aware tasks",
      "⏰ Time-of-day filtering",
      "Ad-free",
    ],
  },
  {
    id: "year",
    name: "Evora Evolve",
    price: "$24.99",
    period: "/ month",
    perDay: "Billed monthly",
    badge: "Most complete",
    features: [
      "Everything in Elevate",
      "🤖 AI Coach",
      "🧠 Smart Spins",
      "📅 Weekly Recap",
      "🛤️ Journeys",
    ],
  },
];

interface Props {
  isPro: boolean;
  onChoosePlan: () => void;
}

export const PlansSection = ({ isPro, onChoosePlan }: Props) => {
  return (
    <section
      id="plans"
      className="px-5 py-12 max-w-2xl lg:max-w-4xl mx-auto w-full"
      aria-labelledby="plans-heading"
    >
      <div className="text-center mb-8">
        <div className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl gradient-primary glow-shadow">
          <Sparkles className="h-5 w-5 text-primary-foreground" />
        </div>
        <h2
          id="plans-heading"
          className="font-display text-2xl sm:text-3xl font-semibold tracking-tight"
        >
          Pick the plan that fits
        </h2>
        <p className="mt-2 text-muted-foreground text-[15px] max-w-md mx-auto">
          Start free. Upgrade whenever you want more rolls, cancel anytime.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative rounded-3xl p-5 flex flex-col soft-shadow transition-transform hover:-translate-y-0.5 ${
              plan.highlight
                ? "bg-card border-2 border-primary"
                : "bg-card border border-border"
            }`}
          >
            {plan.badge && (
              <span className="absolute -top-2 right-4 rounded-full gradient-primary px-2.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                {plan.badge}
              </span>
            )}

            <div className="flex items-baseline justify-between">
              <h3 className="font-display text-lg font-semibold text-foreground">
                {plan.name}
              </h3>
              <div className="text-right">
                <div className="font-display text-2xl font-semibold text-foreground">
                  {plan.price}
                </div>
                <div className="text-[11px] text-muted-foreground">{plan.period}</div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground mt-1">{plan.perDay}</div>

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

            {plan.id === "free" ? (
              <Button
                variant="ghost"
                size="sm"
                disabled
                className="mt-5 w-full"
                aria-label="Free plan, currently active"
              >
                {isPro ? "Included with Pro" : "You're on Free"}
              </Button>
            ) : isPro ? null : (
              <Button
                onClick={onChoosePlan}
                variant={plan.highlight ? "hero" : "outline"}
                size="sm"
                className="mt-5 w-full"
              >
                {`Choose ${plan.name}`}
              </Button>
            )}
          </div>
        ))}
      </div>

      <p className="text-center text-[11px] text-muted-foreground mt-6">
        Demo paywall, no real charge will be made.
      </p>
    </section>
  );
};
