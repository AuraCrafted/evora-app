import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface Plan {
  id: string;
  name: string;
  price: string;
  period: string;
  badge?: string;
  perDay: string;
}

const plans: Plan[] = [
  { id: "month", name: "Monthly", price: "$8.99", period: "/ month", badge: "Popular", perDay: "$0.30/day" },
  { id: "year", name: "Yearly", price: "$49.99", period: "/ year", badge: "Best value", perDay: "$0.14/day" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpgrade: (tier: "month" | "year") => void;
}

export const UpgradeDialog = ({ open, onOpenChange, onUpgrade }: Props) => {
  const [selected, setSelected] = useState<string>("month");

  const handleUpgrade = () => {
    const plan = plans.find((p) => p.id === selected);
    const tier = (plan?.id === "year" ? "year" : "month") as "month" | "year";
    onUpgrade(tier);
    onOpenChange(false);
    toast.success(`Welcome to Evora ${plan?.name}!`, {
      description: "Unlimited rolls unlocked. Take it gently.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl border-0 soft-shadow">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto mb-2 inline-flex h-12 w-12 items-center justify-center rounded-2xl gradient-primary glow-shadow">
            <Sparkles className="h-6 w-6 text-primary-foreground" />
          </div>
          <DialogTitle className="font-display text-2xl text-center">
            You've used your free rolls
          </DialogTitle>
          <DialogDescription className="text-center">
            Keep the momentum going with unlimited evoras.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-3">
          {plans.map((plan) => {
            const isSelected = selected === plan.id;
            return (
              <button
                key={plan.id}
                onClick={() => setSelected(plan.id)}
                className={`w-full rounded-2xl border-2 p-4 text-left transition-all ${
                  isSelected
                    ? "border-primary bg-accent/40"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                        isSelected ? "border-primary bg-primary" : "border-border"
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{plan.name}</span>
                        {plan.badge && (
                          <span className="rounded-full gradient-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                            {plan.badge}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">{plan.perDay}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-xl font-semibold text-foreground">
                      {plan.price}
                    </div>
                    <div className="text-xs text-muted-foreground">{plan.period}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <Button onClick={handleUpgrade} variant="hero" size="lg" className="w-full mt-4">
          Unlock unlimited rolls
        </Button>
        <p className="text-center text-[11px] text-muted-foreground -mt-1">
          Demo paywall, no real charge will be made.
        </p>
      </DialogContent>
    </Dialog>
  );
};
