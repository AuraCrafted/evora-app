// Scripted "Nudge Coach" replies. Lightweight keyword routing — easy to swap
// for a real AI backend later by replacing getCoachReply with an API call.

type Reply = string;

const greetings: Reply[] = [
  "Hey, I'm here. What's on your mind today?",
  "Hi friend. How are you feeling right now — 1 to 10?",
  "Glad you popped in. Want a tiny nudge or just to talk?",
];

const stuck: Reply[] = [
  "Stuck is okay. Try this: stand up, drink a glass of water, and come back. That counts.",
  "When everything feels heavy, shrink the task. What's the smallest 2-minute version?",
  "You don't have to feel motivated to start. Pick the easiest first step and just do that one.",
];

const tired: Reply[] = [
  "Rest is productive too. Could you give yourself 20 minutes guilt-free, then reassess?",
  "Tired brains love tiny wins. A 5-minute walk or stretch can shift the whole day.",
  "Sleep, water, light. Pick one and tend to it before anything else.",
];

const anxious: Reply[] = [
  "Try a slow box breath: in 4, hold 4, out 4, hold 4. Three rounds. I'll wait.",
  "Name 5 things you can see right now. Anxiety shrinks when attention widens.",
  "What's one thing in the next hour you can control? Start there.",
];

const streakHelp: Reply[] = [
  "Streaks reward showing up, not being perfect. Even a tiny nudge today keeps it alive.",
  "If today feels too much, roll for a Mind nudge — they're usually 2 minutes.",
  "Missed yesterday? No drama. Today is a fresh roll.",
];

const ideas: Reply[] = [
  "Want a nudge idea? Try: text someone you miss, step outside for 60 seconds, or tidy one surface.",
  "Three easy ones: drink water, open a window, list 3 things you're grateful for.",
  "Small + outside usually wins. Even just standing on the doorstep counts.",
];

const thanks: Reply[] = [
  "Anytime. Be kind to yourself today.",
  "You got it. I'm proud of you for showing up.",
  "💛 Go gently.",
];

const fallback: Reply[] = [
  "Tell me a bit more — are you stuck, tired, or just looking for an idea?",
  "I hear you. Want me to suggest a tiny nudge, or talk it through?",
  "Got it. What would feel like a small win in the next hour?",
];

function pick(pool: Reply[]): Reply {
  return pool[Math.floor(Math.random() * pool.length)];
}

export function getCoachReply(userText: string): Reply {
  const t = userText.toLowerCase();

  if (/\b(hi|hello|hey|yo|sup|morning|evening)\b/.test(t)) return pick(greetings);
  if (/\b(thanks|thank you|ty|appreciate)\b/.test(t)) return pick(thanks);
  if (/\b(stuck|frozen|paralyz|can'?t start|procrastinat)\b/.test(t)) return pick(stuck);
  if (/\b(tired|exhausted|drained|burn(ed)? out|sleepy|low energy)\b/.test(t)) return pick(tired);
  if (/\b(anx|panic|stress|overwhelm|worry|worried|nervous)\b/.test(t)) return pick(anxious);
  if (/\b(streak|missed|broke|lost my)\b/.test(t)) return pick(streakHelp);
  if (/\b(idea|suggest|nudge|what should|recommend|help me)\b/.test(t)) return pick(ideas);

  return pick(fallback);
}

export const coachWelcome =
  "Hi, I'm your Nudge Coach 💛 Tell me how you're feeling, or ask for a tiny idea to get unstuck.";
