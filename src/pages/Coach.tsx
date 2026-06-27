import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Send, Sparkles, Trash2, Menu, Lock } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BottomNav } from "@/components/BottomNav";
import { useSpins } from "@/hooks/useSpins";
import { supabase } from "@/integrations/supabase/client";
import { sfx } from "@/lib/feedback";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const THREADS_KEY = "evora.coach.threads.v1";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  ts: number;
}

interface Thread {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
}

function loadThreads(): Thread[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(THREADS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as Thread[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveThreads(threads: Thread[]) {
  localStorage.setItem(THREADS_KEY, JSON.stringify(threads));
}

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function titleFromMessage(text: string) {
  const trimmed = text.trim().replace(/\s+/g, " ");
  return trimmed.length > 40 ? trimmed.slice(0, 40) + "…" : trimmed || "New chat";
}

const Coach = () => {
  const { tier, streak } = useSpins();
  const navigate = useNavigate();
  const { threadId } = useParams<{ threadId?: string }>();

  const [threads, setThreads] = useState<Thread[]>(() => loadThreads());
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isYearly = tier === "year";

  // Bootstrap: if no threadId in URL, pick latest or create one.
  useEffect(() => {
    if (!isYearly) return;
    if (threadId) return;
    if (threads.length === 0) {
      const t: Thread = {
        id: newId(),
        title: "New chat",
        updatedAt: Date.now(),
        messages: [],
      };
      const next = [t];
      setThreads(next);
      saveThreads(next);
      navigate(`/coach/${t.id}`, { replace: true });
    } else {
      navigate(`/coach/${threads[0].id}`, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId, isYearly]);

  const activeThread = useMemo(
    () => threads.find((t) => t.id === threadId) ?? null,
    [threads, threadId],
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, [threadId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [activeThread?.messages.length, sending]);

  if (!isYearly) {
    return (
      <main className="min-h-screen flex flex-col">
        <header className="px-5 pt-6 pb-3 max-w-2xl mx-auto w-full">
          <Link
            to="/"
            onClick={() => sfx.tap()}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="font-display text-sm font-medium">Home</span>
          </Link>
        </header>
        <section className="flex-1 flex flex-col items-center justify-center px-6 text-center max-w-md mx-auto">
          <div className="h-16 w-16 rounded-3xl gradient-primary flex items-center justify-center mb-5 soft-shadow">
            <Lock className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="font-display text-2xl font-semibold mb-2">AI Coach is a Yearly perk</h1>
          <p className="text-muted-foreground text-[15px] mb-6">
            Your warm, grounded guide that helps you turn vague feelings into one small next step ,
            available on the Yearly plan.
          </p>
          <Link to="/plans" className="w-full">
            <Button variant="hero" size="lg" className="w-full">
              <Sparkles className="h-4 w-4" />
              See Yearly plan
            </Button>
          </Link>
        </section>
        <div className="pb-24" />
        <BottomNav streak={streak} />
      </main>
    );
  }

  const createThread = () => {
    sfx.tap();
    const t: Thread = { id: newId(), title: "New chat", updatedAt: Date.now(), messages: [] };
    const next = [t, ...threads];
    setThreads(next);
    saveThreads(next);
    setSidebarOpen(false);
    navigate(`/coach/${t.id}`);
  };

  const deleteThread = (id: string) => {
    const next = threads.filter((t) => t.id !== id);
    setThreads(next);
    saveThreads(next);
    if (id === threadId) {
      if (next.length > 0) navigate(`/coach/${next[0].id}`, { replace: true });
      else navigate(`/coach`, { replace: true });
    }
  };

  const selectThread = (id: string) => {
    sfx.tap();
    setSidebarOpen(false);
    navigate(`/coach/${id}`);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !activeThread || sending) return;
    sfx.tap();

    const userMsg: ChatMessage = { id: newId(), role: "user", content: text, ts: Date.now() };
    const isFirstMessage = activeThread.messages.length === 0;
    const updated: Thread = {
      ...activeThread,
      title: isFirstMessage ? titleFromMessage(text) : activeThread.title,
      messages: [...activeThread.messages, userMsg],
      updatedAt: Date.now(),
    };
    const nextThreads = threads.map((t) => (t.id === activeThread.id ? updated : t));
    setThreads(nextThreads);
    saveThreads(nextThreads);
    setInput("");
    setSending(true);

    try {
      const { data, error } = await supabase.functions.invoke("coach-chat", {
        body: {
          messages: updated.messages.map((m) => ({ role: m.role, content: m.content })),
        },
      });
      if (error) throw error;
      const content = (data as { content?: string })?.content?.trim();
      if (!content) throw new Error("Empty response from coach");

      const assistantMsg: ChatMessage = {
        id: newId(),
        role: "assistant",
        content,
        ts: Date.now(),
      };
      const withAssistant: Thread = {
        ...updated,
        messages: [...updated.messages, assistantMsg],
        updatedAt: Date.now(),
      };
      setThreads((prev) => {
        const out = prev.map((t) => (t.id === withAssistant.id ? withAssistant : t));
        saveThreads(out);
        return out;
      });
      sfx.coachMessage();
    } catch (err) {
      console.error(err);
      toast.error("Coach is taking a breath.", {
        description: (err as Error).message || "Please try again in a moment.",
      });
      sfx.error();
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const sortedThreads = [...threads].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-5 pt-6 pb-3 max-w-3xl mx-auto w-full flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              sfx.tap();
              setSidebarOpen(true);
            }}
            className="md:hidden h-9 w-9 rounded-full bg-card soft-shadow flex items-center justify-center"
            aria-label="Open chats"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="h-9 w-9 rounded-2xl gradient-primary flex items-center justify-center soft-shadow">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <div className="font-display text-base font-semibold leading-tight">Coach</div>
            <div className="text-[11px] text-muted-foreground">Your gentle guide</div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={createThread}>
          <Plus className="h-4 w-4" />
          New
        </Button>
      </header>

      <div className="flex-1 max-w-3xl mx-auto w-full px-3 sm:px-5 pb-28 flex gap-4">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm md:static md:bg-transparent md:backdrop-blur-none md:z-auto",
            sidebarOpen ? "block" : "hidden md:block",
          )}
          onClick={() => setSidebarOpen(false)}
        >
          <div
            className="absolute left-0 top-0 bottom-0 w-72 bg-card md:bg-transparent md:static md:w-56 p-3 overflow-y-auto md:p-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="md:sticky md:top-2 space-y-1">
              <Button variant="outline" size="sm" className="w-full justify-start" onClick={createThread}>
                <Plus className="h-4 w-4" />
                New chat
              </Button>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground px-2 pt-3 pb-1">
                Chats
              </div>
              {sortedThreads.length === 0 && (
                <p className="text-xs text-muted-foreground px-2">No chats yet.</p>
              )}
              {sortedThreads.map((t) => (
                <div
                  key={t.id}
                  className={cn(
                    "group flex items-center gap-1 rounded-xl px-2 py-1.5 text-sm transition-colors",
                    t.id === threadId
                      ? "bg-accent text-foreground"
                      : "hover:bg-muted text-muted-foreground",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => selectThread(t.id)}
                    className="flex-1 text-left truncate"
                  >
                    {t.title}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteThread(t.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive"
                    aria-label="Delete chat"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Chat */}
        <section className="flex-1 flex flex-col min-w-0">
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto rounded-3xl bg-card soft-shadow p-4 space-y-3 min-h-[55vh]"
          >
            {!activeThread || activeThread.messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4 py-10">
                <div className="text-4xl mb-3">🌿</div>
                <h2 className="font-display text-lg font-semibold">Hey, I'm here.</h2>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  Tell me what's on your mind, stuck, restless, foggy, hopeful, and we'll find a
                  small next step together.
                </p>
              </div>
            ) : (
              activeThread.messages.map((m) => (
                <div
                  key={m.id}
                  className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                      m.role === "user"
                        ? "gradient-primary text-primary-foreground"
                        : "bg-secondary text-foreground",
                    )}
                  >
                    {m.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-strong:text-foreground">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    )}
                  </div>
                </div>
              ))
            )}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-secondary rounded-2xl px-4 py-2.5 text-sm text-muted-foreground inline-flex gap-1">
                  <span className="animate-bounce">·</span>
                  <span className="animate-bounce [animation-delay:120ms]">·</span>
                  <span className="animate-bounce [animation-delay:240ms]">·</span>
                </div>
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="mt-3 rounded-3xl bg-card soft-shadow p-2 flex items-end gap-2">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tell your coach what's going on…"
              rows={1}
              className="resize-none border-0 focus-visible:ring-0 shadow-none bg-transparent min-h-[44px] max-h-40"
              disabled={sending}
            />
            <Button
              variant="hero"
              size="icon"
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            Coach can be wrong sometimes. For mental health emergencies, please reach out to a professional.
          </p>
        </section>
      </div>

      <BottomNav streak={streak} />
    </main>
  );
};

export default Coach;
