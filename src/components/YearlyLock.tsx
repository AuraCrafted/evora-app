import { Link } from "react-router-dom";
import { ArrowLeft, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { sfx } from "@/lib/feedback";

export const YearlyLock = ({ title, body, streak }: { title: string; body: string; streak: number }) => (
  <main className="min-h-screen flex flex-col">
    <header className="px-5 pt-6 pb-3 max-w-2xl lg:max-w-4xl mx-auto w-full">
      <Link to="/" onClick={() => sfx.tap()} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />
        <span className="font-display text-sm font-medium">Home</span>
      </Link>
    </header>
    <section className="flex-1 flex flex-col items-center justify-center px-6 text-center max-w-md mx-auto">
      <div className="h-16 w-16 rounded-3xl gradient-primary flex items-center justify-center mb-5 soft-shadow">
        <Lock className="h-7 w-7 text-primary-foreground" />
      </div>
      <h1 className="font-display text-2xl font-semibold mb-2">{title}</h1>
      <p className="text-muted-foreground text-[15px] mb-6">{body}</p>
      <Link to="/plans" className="w-full">
        <Button variant="hero" size="lg" className="w-full">
          <Sparkles className="h-4 w-4" />
          See Evolve plan
        </Button>
      </Link>
    </section>
    <div className="pb-24" />
    <BottomNav streak={streak} />
  </main>
);
