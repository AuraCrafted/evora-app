import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export default function Auth() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const initialMode = (params.get("mode") === "signup" ? "signup" : "signin") as "signin" | "signup";
  const redirect = params.get("redirect") || "/plans";
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) navigate(redirect, { replace: true });
  }, [user, navigate, redirect]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}${redirect}` },
        });
        if (error) throw error;
        toast.success("Account created. You're in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate(redirect, { replace: true });
    } catch (err: any) {
      toast.error(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <Link to="/" className="flex items-center gap-2 mb-8 justify-center">
          <div className="h-9 w-9 rounded-2xl gradient-primary flex items-center justify-center soft-shadow">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-semibold">Evora</span>
        </Link>
        <h1 className="font-display text-2xl font-semibold text-center mb-1">
          {mode === "signup" ? "Create your account" : "Welcome back"}
        </h1>
        <p className="text-center text-sm text-muted-foreground mb-6">
          {mode === "signup" ? "Save your plan across devices." : "Sign in to manage your plan."}
        </p>
        <form onSubmit={submit} className="space-y-4 bg-card border border-border rounded-3xl p-5 soft-shadow">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} />
          </div>
          <Button type="submit" variant="hero" className="w-full" disabled={submitting}>
            {submitting ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground mt-4">
          {mode === "signup" ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            type="button"
            onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
            className="text-primary font-medium hover:underline"
          >
            {mode === "signup" ? "Sign in" : "Sign up"}
          </button>
        </p>
        <div className="mt-6 text-center">
          <div className="text-[10px] text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Notice</Link>
            <span className="mx-1">·</span>
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <span className="mx-1">·</span>
            <Link to="/refunds" className="hover:text-foreground transition-colors">Refunds</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
