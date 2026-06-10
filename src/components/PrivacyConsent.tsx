import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, BookOpen, Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { sfx } from "@/lib/feedback";

const STORAGE_KEY = "nudge:privacy-accepted-v1";

export const PrivacyConsent = () => {
  const { user, loading } = useAuth();
  const [accepted, setAccepted] = useState<boolean>(() => {
    try {
      return !!localStorage.getItem(STORAGE_KEY);
    } catch {
      return true;
    }
  });

  useEffect(() => {
    const onStorage = () => {
      try {
        setAccepted(!!localStorage.getItem(STORAGE_KEY));
      } catch {
        // ignore
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  if (loading || !user || accepted) return null;

  const accept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    sfx.tap();
    setAccepted(true);
    window.dispatchEvent(new Event("privacy-accepted"));
  };

  return (
    <div className="fixed inset-0 z-[110] bg-background/95 backdrop-blur-sm flex items-center justify-center px-5 animate-fade-in-up">
      <div className="w-full max-w-md rounded-3xl bg-card p-6 soft-shadow border border-border">
        <div className="mx-auto mb-4 h-14 w-14 rounded-3xl gradient-primary flex items-center justify-center soft-shadow">
          <Shield className="h-6 w-6 text-primary-foreground" />
        </div>
        <h2 className="font-display text-2xl font-semibold tracking-tight text-center">
          Your privacy matters
        </h2>
        <p className="mt-3 text-center text-sm text-muted-foreground leading-relaxed">
          Before you get started, please review how we handle your data. We keep it simple: your
          info is used to personalize your nudges and sync your plan — never sold.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <Button asChild variant="soft" size="lg" className="w-full">
            <Link to="/privacy" target="_blank" rel="noopener noreferrer">
              <BookOpen className="h-4 w-4" />
              Read
            </Link>
          </Button>
          <Button variant="hero" size="lg" className="w-full" onClick={accept}>
            <Check className="h-4 w-4" />
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
};
