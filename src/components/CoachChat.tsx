import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Sparkles, Lock } from "lucide-react";
import { getCoachReply, coachWelcome } from "@/lib/coachReplies";
import { sfx } from "@/lib/feedback";

interface Message {
  id: string;
  role: "coach" | "user";
  text: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPro: boolean;
  onUpgrade: () => void;
}

const STORAGE_KEY = "nudge.coach.history.v1";
const MAX_HISTORY = 50;

function loadHistory(): Message[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.slice(-MAX_HISTORY);
  } catch {
    /* ignore */
  }
  return [];
}

function saveHistory(messages: Message[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_HISTORY)));
  } catch {
    /* ignore */
  }
}

export const CoachChat = ({ open, onOpenChange, isPro, onUpgrade }: Props) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Seed welcome on first open
  useEffect(() => {
    if (!open || !isPro) return;
    setMessages((prev) => {
      if (prev.length > 0) return prev;
      const stored = loadHistory();
      if (stored.length > 0) return stored;
      return [{ id: "welcome", role: "coach", text: coachWelcome }];
    });
  }, [open, isPro]);

  // Persist + auto-scroll
  useEffect(() => {
    saveHistory(messages);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  }, [messages, typing]);

  // Focus input when opening
  useEffect(() => {
    if (open && isPro) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open, isPro]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || typing) return;
    sfx.tap();

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setTyping(true);

    // Simulated thinking delay
    const delay = 600 + Math.random() * 700;
    window.setTimeout(() => {
      const reply: Message = {
        id: crypto.randomUUID(),
        role: "coach",
        text: getCoachReply(text),
      };
      setMessages((prev) => [...prev, reply]);
      setTyping(false);
    }, delay);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickPrompts = [
    "I'm feeling stuck",
    "Give me a tiny idea",
    "I'm anxious",
    "I missed my streak",
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border-0 soft-shadow h-[85vh] flex flex-col p-0"
      >
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl gradient-primary flex items-center justify-center glow-shadow">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex-1 text-left">
              <SheetTitle className="font-display text-lg">Nudge Coach</SheetTitle>
              <p className="text-xs text-muted-foreground">
                {isPro ? "Pro feature • here whenever you need" : "Pro feature"}
              </p>
            </div>
          </div>
        </SheetHeader>

        {!isPro ? (
          <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-accent/40 flex items-center justify-center">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-display text-xl font-semibold">
                Unlock your Nudge Coach
              </h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-xs">
                A gentle chat companion to help when you're stuck, tired, or just need a tiny idea.
                Available on any paid plan.
              </p>
            </div>
            <Button variant="hero" size="lg" onClick={onUpgrade} className="mt-2">
              See plans
            </Button>
          </div>
        ) : (
          <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      m.role === "user"
                        ? "gradient-primary text-primary-foreground rounded-br-md"
                        : "bg-card text-foreground rounded-bl-md soft-shadow"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {typing && (
                <div className="flex justify-start">
                  <div className="bg-card text-foreground rounded-2xl rounded-bl-md soft-shadow px-4 py-3">
                    <div className="flex gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" />
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
                        style={{ animationDelay: "0.15s" }}
                      />
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
                        style={{ animationDelay: "0.3s" }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {messages.length <= 1 && !typing && (
                <div className="pt-2 flex flex-wrap gap-2 justify-center">
                  {quickPrompts.map((q) => (
                    <button
                      key={q}
                      onClick={() => {
                        setInput(q);
                        setTimeout(() => handleSend(), 0);
                      }}
                      className="rounded-full bg-accent/40 hover:bg-accent text-foreground text-xs px-3 py-1.5 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-border p-3 flex items-center gap-2 bg-background">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tell your coach how you feel…"
                className="rounded-full bg-card border-border"
                aria-label="Message your Nudge Coach"
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || typing}
                size="icon"
                variant="hero"
                className="rounded-full shrink-0 h-10 w-10"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
