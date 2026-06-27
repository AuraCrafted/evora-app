export type Category =
  | "any"
  | "outside"
  | "social"
  | "fitness"
  | "mind"
  | "tidy"
  | "create"
  | "care"
  | "custom";

export type Effort = "low" | "medium" | "high";
export type TimeOfDay = "morning" | "midday" | "evening" | "night";
export type Tag = "focus" | "social" | "physical" | "quick" | "reflective" | "outdoors" | "create";

export type TaskType = "physical" | "mental" | "creative" | "admin" | "social";
export type Mood = "calm" | "focused" | "playful" | "reflective" | "energizing";
export type Goal =
  | "wellbeing"
  | "productivity"
  | "connection"
  | "creativity"
  | "learning"
  | "fitness"
  | "mindfulness";
export type Setting = "indoor" | "outdoor" | "either";
export type SocialMode = "solo" | "social" | "either";

export interface SuggestionMeta {
  energyMin: number; // 1-10 inclusive
  energyMax: number;
  type: TaskType;
  mood: Mood;
  goals: Goal[];
  setting: Setting;
  social: SocialMode;
  difficulty: "easy" | "moderate" | "hard";
}

export interface Suggestion {
  id: string;
  emoji: string;
  title: string;
  description: string;
  duration: string;
  /** Minutes, used for filtering and quick-start mode */
  minutes: number;
  effort: Effort;
  timeOfDay: TimeOfDay[];
  tags: Tag[];
  category: Exclude<Category, "any">;
  /** Optional explicit metadata; otherwise derived from category/effort/tags. */
  meta?: Partial<SuggestionMeta>;
  /** Marks AI-personalized tasks */
  ai?: boolean;
}

export const categoryLabels: Record<Category, string> = {
  any: "Surprise me",
  outside: "Nature",
  social: "Social",
  fitness: "Movement",
  mind: "Mind",
  tidy: "Tidying",
  create: "Creativity",
  care: "Self-care",
  custom: "My Spins",
};

export const categoryEmoji: Record<Category, string> = {
  any: "🎲",
  outside: "🌿",
  social: "🤝",
  fitness: "🏃",
  mind: "🧠",
  tidy: "🧹",
  create: "🎨",
  care: "🧼",
  custom: "✨",
};

const ALL_TIMES: TimeOfDay[] = ["morning", "midday", "evening", "night"];

// Energy bands derived from effort + minutes.
function deriveEnergyBand(effort: Effort, minutes: number): [number, number] {
  if (effort === "low" && minutes <= 2) return [1, 6];
  if (effort === "low" && minutes <= 5) return [2, 7];
  if (effort === "low") return [3, 8];
  if (effort === "medium" && minutes <= 10) return [4, 9];
  if (effort === "medium") return [5, 9];
  if (effort === "high" && minutes <= 15) return [6, 10];
  return [7, 10];
}

const TYPE_BY_CATEGORY: Record<Exclude<Category, "any">, TaskType> = {
  outside: "physical",
  social: "social",
  fitness: "physical",
  mind: "mental",
  tidy: "admin",
  create: "creative",
  care: "mental",
  custom: "mental",
};

const GOAL_BY_CATEGORY: Record<Exclude<Category, "any">, Goal[]> = {
  outside: ["wellbeing", "mindfulness"],
  social: ["connection"],
  fitness: ["fitness", "wellbeing"],
  mind: ["productivity", "mindfulness"],
  tidy: ["productivity"],
  create: ["creativity"],
  care: ["wellbeing", "mindfulness"],
  custom: [],
};

function deriveMood(tags: Tag[], effort: Effort): Mood {
  if (tags.includes("reflective")) return "reflective";
  if (tags.includes("focus")) return "focused";
  if (tags.includes("create")) return "playful";
  if (effort === "high" || tags.includes("physical")) return "energizing";
  return "calm";
}

/** Resolves the full metadata, deriving any missing fields from the base task. */
export function getMeta(s: Suggestion): SuggestionMeta {
  const [emin, emax] = deriveEnergyBand(s.effort, s.minutes);
  const cat = s.category;
  const social: SocialMode =
    s.meta?.social ?? (cat === "social" || s.tags.includes("social") ? "social" : "solo");
  const setting: Setting =
    s.meta?.setting ?? (cat === "outside" || s.tags.includes("outdoors") ? "outdoor" : "indoor");
  const difficulty: "easy" | "moderate" | "hard" =
    s.meta?.difficulty ??
    (s.effort === "low" ? "easy" : s.effort === "medium" ? "moderate" : "hard");
  return {
    energyMin: s.meta?.energyMin ?? emin,
    energyMax: s.meta?.energyMax ?? emax,
    type: s.meta?.type ?? TYPE_BY_CATEGORY[cat] ?? "mental",
    mood: s.meta?.mood ?? deriveMood(s.tags, s.effort),
    goals: s.meta?.goals ?? GOAL_BY_CATEGORY[cat] ?? [],
    setting,
    social,
    difficulty,
  };
}

// Helper to keep the list readable
const s = (
  id: string,
  emoji: string,
  title: string,
  description: string,
  minutes: number,
  effort: Effort,
  category: Exclude<Category, "any">,
  tags: Tag[] = [],
  timeOfDay: TimeOfDay[] = ALL_TIMES,
): Suggestion => ({
  id,
  emoji,
  title,
  description,
  duration: minutes < 1 ? "< 1 min" : `${minutes} min`,
  minutes,
  effort,
  timeOfDay,
  tags,
  category,
});

export const suggestions: Suggestion[] = [
  // 🟢 Level 1: Ultra-Light (0–2 min)
  s("l1-1", "🧠", "Take one slow deep breath", "Just one. In through the nose, out through the mouth.", 1, "low", "mind", ["reflective", "quick"]),
  s("l1-2", "🧼", "Drink a sip of water", "Reach for your glass. One small sip is enough.", 1, "low", "care", ["quick"]),
  s("l1-3", "🏃", "Stand up", "Get out of your chair for a moment. That's the whole task.", 1, "low", "fitness", ["physical", "quick"]),
  s("l1-4", "🏃", "Stretch your arms overhead", "Reach for the ceiling. Hold for a breath. Release.", 1, "low", "fitness", ["physical", "quick"]),
  s("l1-5", "🧠", "Name 3 things you can see", "Look around. Say them out loud or in your head.", 1, "low", "mind", ["reflective", "quick"]),
  s("l1-6", "🧠", "Put your phone down for 30 seconds", "Set it face down. Count to thirty. That's it.", 1, "low", "mind", ["reflective", "quick"]),
  s("l1-7", "🌿", "Open a window or step outside briefly", "Let real air touch your face for a moment.", 2, "low", "outside", ["outdoors", "quick"]),
  s("l1-8", "🧼", "Fix your posture", "Shoulders back, chin level, spine tall. Hold it.", 1, "low", "care", ["quick"]),
  s("l1-9", "🧠", "Smile, even slightly", "Fake works too. Your body doesn't know the difference.", 1, "low", "mind", ["reflective", "quick"]),
  s("l1-10", "🧹", "Clear one small item near you", "A wrapper, a cup, a stray paper. Just one.", 2, "low", "tidy", ["quick"]),
  s("l1-11", "🏃", "Roll your shoulders", "Forward five times, backward five times. Feel it loosen.", 1, "low", "fitness", ["physical", "quick"]),
  s("l1-12", "🧠", "Take 3 slow breaths", "Four in, six out. Three rounds. Eyes soft.", 1, "low", "mind", ["reflective", "quick"]),
  s("l1-13", "🧠", "Close your eyes for 10 seconds", "Let them rest. Count slowly. Open again.", 1, "low", "mind", ["reflective", "quick"]),
  s("l1-14", "🏃", "Wiggle and stretch your legs", "Flex your feet, roll your ankles. Wake them up.", 1, "low", "fitness", ["physical", "quick"]),
  s("l1-15", "🧼", "Drink another sip of water", "Hydration is cumulative. One more sip.", 1, "low", "care", ["quick"]),
  s("l1-16", "🏃", "Tap your feet for 10 seconds", "Both feet, any rhythm. Get some blood moving.", 1, "low", "fitness", ["physical", "quick"]),
  s("l1-17", "🌿", "Look out a window", "Find the furthest thing you can see. Rest your eyes on it.", 1, "low", "outside", ["outdoors", "reflective", "quick"]),
  s("l1-18", "🧼", "Adjust your seat or position", "Shift how you're sitting. Small comfort is still comfort.", 1, "low", "care", ["quick"]),
  s("l1-19", "🧹", "Pick up one piece of trash", "Wherever you are. One piece. Into the bin.", 1, "low", "tidy", ["quick"]),
  s("l1-20", "🧠", "Relax your jaw and face", "Unclench. Let your tongue rest. Soften your forehead.", 1, "low", "mind", ["reflective", "quick"]),

  // 🟡 Level 2: Light Actions (1–3 min)
  s("l2-1", "🧼", "Drink a full glass of water", "All the way down. Your body has been waiting.", 2, "low", "care", ["quick"]),
  s("l2-2", "🧹", "Make or straighten your bed", "Pull the covers up. Fluff the pillows. One small win.", 3, "low", "tidy", ["quick"], ["morning", "midday"]),
  s("l2-3", "🧼", "Wash your face or hands", "Cool water works best. A tiny reset.", 3, "low", "care", ["quick"]),
  s("l2-4", "🤝", "Send one quick message", "A 'thinking of you'. No agenda. Connection matters.", 2, "low", "social", ["social", "quick"]),
  s("l2-5", "🧹", "Put away 3 items", "Just three. Stop when you hit three. Done.", 3, "low", "tidy", ["quick"]),
  s("l2-6", "🌿", "Step outside for 2 minutes", "Sky above, ground below. Just be out there.", 2, "low", "outside", ["outdoors", "quick"]),
  s("l2-7", "🧠", "Write down one thought", "Whatever's in your head. One sentence is enough.", 3, "low", "mind", ["reflective", "quick"]),
  s("l2-8", "🧠", "Change the lighting or room", "Brighter, dimmer, somewhere new. Shift the scene.", 2, "low", "mind", ["quick"]),
  s("l2-9", "🏃", "Do 5 squats or pushups", "Just five. Slow and controlled. Feel your body.", 2, "low", "fitness", ["physical", "quick"]),
  s("l2-10", "🎨", "Doodle something small", "No rules. Shapes, lines, a face. Two minutes.", 3, "low", "create", ["create", "quick"]),
  s("l2-11", "🧹", "Organize 3 digital files or apps", "Delete, rename, tuck into a folder. Three things.", 3, "low", "tidy", ["focus", "quick"]),
  s("l2-12", "🧠", "Drink water slowly and mindfully", "Taste it. Feel it. No phone while you sip.", 2, "low", "mind", ["reflective", "quick"]),
  s("l2-13", "🤝", "Say hi to someone nearby", "In person or online. Acknowledge another human.", 1, "low", "social", ["social", "quick"]),
  s("l2-14", "🏃", "Take a quick stretch break", "Neck, arms, back, legs. Two minutes of softening.", 3, "low", "fitness", ["physical", "quick"]),
  s("l2-15", "🧠", "Open something you've been avoiding", "Just open it. Look at it. You don't have to do more.", 2, "low", "mind", ["focus", "quick"]),
  s("l2-16", "🧹", "Throw away unnecessary items", "A few pieces of clutter. Trash them. Feel lighter.", 3, "low", "tidy", ["quick"]),
  s("l2-17", "🎨", "Listen to part of a song fully", "No multitasking. Just the sound and you.", 3, "low", "create", ["create", "reflective", "quick"]),
  s("l2-18", "🌿", "Step outside and breathe deeply", "Five slow breaths under the sky. Let it fill you.", 3, "low", "outside", ["outdoors", "reflective", "quick"]),
  s("l2-19", "🧠", "Write one thing you're grateful for", "Small counts. Coffee. Warmth. A working body.", 2, "low", "mind", ["reflective", "quick"]),
  s("l2-20", "🧹", "Adjust your workspace slightly", "Clear one corner, move one thing. Tiny refresh.", 3, "low", "tidy", ["quick"]),

  // 🟠 Level 3: Activation (3–7 min)
  s("l3-1", "🧠", "Work on something for 3 minutes", "Pick the smallest version of the task. Start a timer.", 3, "low", "mind", ["focus"], ["morning", "midday", "evening"]),
  s("l3-2", "🧹", "Clean one small area", "A counter, a shelf, a corner of the desk.", 5, "low", "tidy", ["focus"]),
  s("l3-3", "🤝", "Respond to 2 messages", "The ones that have been sitting there. Two replies.", 5, "low", "social", ["social", "quick"]),
  s("l3-4", "🌿", "Take a short walk", "Five minutes outside. Any direction. Phone optional.", 5, "low", "outside", ["outdoors", "physical"], ["morning", "midday", "evening"]),
  s("l3-5", "🧠", "Write a 3-task to-do list", "Just three. The most important, the easiest, the dreaded one.", 5, "low", "mind", ["focus", "reflective"]),
  s("l3-6", "🧠", "Read 1–2 pages", "Any book, article, poem. Two pages max. Then decide.", 5, "low", "mind", ["focus", "reflective"]),
  s("l3-7", "🧹", "Organize a small category", "Pens, chargers, socks, apps. One small group.", 7, "low", "tidy", ["focus"]),
  s("l3-8", "🧠", "Start a task you've been delaying", "The first micro-step only. Opening the doc counts.", 5, "low", "mind", ["focus"], ["morning", "midday", "evening"]),
  s("l3-9", "🧼", "Change into more productive clothes", "Even just a clean shirt. Your body gets the signal.", 5, "low", "care", ["quick"], ["morning", "midday"]),
  s("l3-10", "🎨", "Listen to a full song without distraction", "Eyes closed if you can. No scrolling. Just the song.", 4, "low", "create", ["create", "reflective"]),
  s("l3-11", "🏃", "Do 10 squats or pushups", "Slow and controlled. Breathe through each rep.", 3, "medium", "fitness", ["physical", "quick"]),
  s("l3-12", "🧠", "Journal for 3 minutes", "Stream of thought. Grammar doesn't matter.", 3, "low", "mind", ["reflective"]),
  s("l3-13", "🧹", "Clean your desk surface", "Clear it, wipe it, reset it. Fresh workspace.", 7, "medium", "tidy", ["focus"]),
  s("l3-14", "🌿", "Step outside and walk briefly", "A loop around the building. Just move outdoors.", 7, "medium", "outside", ["outdoors", "physical"], ["morning", "midday", "evening"]),
  s("l3-15", "🤝", "Send a thoughtful message", "Someone specific. Say something real. Hit send.", 5, "low", "social", ["social", "reflective"]),
  s("l3-16", "🧠", "Brain-dump your thoughts", "Everything cluttering your head, onto paper. No filter.", 5, "low", "mind", ["reflective", "focus"]),
  s("l3-17", "🏃", "Stretch your whole body", "Top to bottom. Neck, shoulders, back, hips, legs.", 5, "low", "fitness", ["physical"]),
  s("l3-18", "🧹", "Do a quick tidy-up sweep", "Walk through one room. Put 5–10 things where they go.", 5, "medium", "tidy", ["focus"]),
  s("l3-19", "🎨", "Try a small creative idea", "Sketch, write, hum, build. Five minutes of play.", 7, "low", "create", ["create"]),
  s("l3-20", "🧼", "Drink water and step away from the screen", "Hydrate. Look at anything that isn't a screen.", 3, "low", "care", ["quick", "reflective"]),

  // 🔵 Level 4: Focused Effort (5–15 min)
  s("l4-1", "🧠", "Do a 5-minute work sprint", "Timer on. One task. No tabs. Five minutes of real focus.", 5, "medium", "mind", ["focus"], ["morning", "midday", "evening"]),
  s("l4-2", "🧹", "Clean for 10 minutes", "Set a timer. Go hard. Stop when it rings.", 10, "medium", "tidy", ["focus", "physical"]),
  s("l4-3", "🌿", "Walk outside for 10 minutes", "No destination. Just walk. Let your mind wander.", 10, "medium", "outside", ["outdoors", "physical", "reflective"], ["morning", "midday", "evening"]),
  s("l4-4", "🤝", "Call or text someone meaningful", "Not small talk. Someone you actually want to hear from.", 10, "medium", "social", ["social"], ["midday", "evening"]),
  s("l4-5", "🏃", "Do a quick workout", "10 minutes. Bodyweight. Break a light sweat.", 10, "medium", "fitness", ["physical"], ["morning", "midday"]),
  s("l4-6", "🧼", "Prep something for later", "Clothes for tomorrow, a snack, a bag. Future-you thanks you.", 10, "medium", "care", []),
  s("l4-7", "🧠", "Journal for 5–10 minutes", "What's on your mind, what you want, what you fear.", 10, "medium", "mind", ["reflective", "focus"], ["evening", "night", "morning"]),
  s("l4-8", "🧹", "Organize a drawer or bag", "Dump it out. Sort. Toss what you don't need. Refill.", 10, "medium", "tidy", ["focus"]),
  s("l4-9", "🎨", "Do something creative for 10 minutes", "Draw, write, play, build. No product required.", 10, "medium", "create", ["create"]),
  s("l4-10", "🧠", "Start something you've been avoiding", "Ten minutes of actual work on the avoided thing.", 10, "medium", "mind", ["focus"], ["morning", "midday", "evening"]),
  s("l4-11", "🧠", "Read for 10 minutes", "Real reading. Book or long article. No skimming.", 10, "medium", "mind", ["focus", "reflective"]),
  s("l4-12", "🧹", "Declutter a small section", "One shelf, one corner, one box. Ruthless but kind.", 12, "medium", "tidy", ["focus"]),
  s("l4-13", "🌿", "Go outside without your phone", "Leave it inside. Walk, sit, exist. Ten minutes.", 10, "medium", "outside", ["outdoors", "reflective"], ["morning", "midday", "evening"]),
  s("l4-14", "🧠", "Plan your next hour", "What will you do? In what order? Write it down.", 5, "medium", "mind", ["focus", "reflective"], ["morning", "midday", "evening"]),
  s("l4-15", "🏃", "Stretch or mobility session", "10 minutes. Slow, deep, deliberate. Feel every joint.", 10, "medium", "fitness", ["physical"]),
  s("l4-16", "🧹", "Clean up your digital space", "Desktop, downloads, inbox. Ten minutes of sorting.", 10, "medium", "tidy", ["focus"]),
  s("l4-17", "🧠", "Write ideas or goals", "What do you want? What's bugging you? Dump it on paper.", 10, "medium", "mind", ["reflective", "focus"]),
  s("l4-18", "🎨", "Try a creative challenge", "10-minute sketch, a short poem, a silly song. Have fun.", 10, "medium", "create", ["create"]),
  s("l4-19", "🧠", "Do focused breathing for 5 minutes", "Box breathing: 4 in, 4 hold, 4 out, 4 hold. Repeat.", 5, "low", "mind", ["reflective"]),
  s("l4-20", "🧹", "Reset your environment", "Tidy + freshen up. Open a window. Light a candle.", 15, "medium", "tidy", ["focus"]),

  // 🔴 Level 5: Challenging (10–25+ min)
  s("l5-1", "🧠", "Do 15 minutes of deep work", "One task. No phone. No tabs. Real focus for 15.", 15, "high", "mind", ["focus"], ["morning", "midday", "evening"]),
  s("l5-2", "🧠", "Complete a full small task", "Something you can actually finish. Take it to done.", 20, "high", "mind", ["focus"], ["morning", "midday", "evening"]),
  s("l5-3", "🏃", "Do a 15-minute workout", "Real effort. Push yourself. Then rest and hydrate.", 15, "high", "fitness", ["physical"], ["morning", "midday", "evening"]),
  s("l5-4", "🧹", "Clean a full area", "A whole room or a whole desk. See it transform.", 20, "high", "tidy", ["focus", "physical"]),
  s("l5-5", "🤝", "Have a meaningful conversation", "Real talk with someone who matters. In person or on a call.", 20, "medium", "social", ["social", "reflective"], ["midday", "evening"]),
  s("l5-6", "🌿", "Spend 15 minutes outside", "Walk, sit, wander. Feel weather on your skin.", 15, "medium", "outside", ["outdoors", "physical", "reflective"], ["morning", "midday", "evening"]),
  s("l5-7", "🧠", "Start a project you've delayed", "The real one. 20 minutes of actual progress.", 20, "high", "mind", ["focus"], ["morning", "midday", "evening"]),
  s("l5-8", "🧠", "Plan your next day", "Top 3 priorities, time blocks, one thing to look forward to.", 15, "medium", "mind", ["focus", "reflective"], ["evening", "night"]),
  s("l5-9", "🧠", "Do something uncomfortable but helpful", "The message, the email, the decision. Face it now.", 15, "high", "mind", ["focus"], ["morning", "midday", "evening"]),
  s("l5-10", "🧠", "Commit to 25 minutes of focus", "One pomodoro. One task. Everything else waits.", 25, "high", "mind", ["focus"], ["morning", "midday", "evening"]),
  s("l5-11", "🌿", "Go for a longer walk", "20+ minutes. Let your thoughts settle while you move.", 20, "medium", "outside", ["outdoors", "physical", "reflective"], ["morning", "midday", "evening"]),
  s("l5-12", "🤝", "Help someone with something", "Offer, listen, do. Being useful to another person.", 20, "medium", "social", ["social"], ["morning", "midday", "evening"]),
  s("l5-13", "🧹", "Deep clean a specific area", "Not just tidy, actually clean. Scrub, wipe, rearrange.", 25, "high", "tidy", ["focus", "physical"]),
  s("l5-14", "🧠", "Reflect on your week", "What went well? What didn't? What's next? Write it out.", 20, "medium", "mind", ["reflective", "focus"], ["evening", "night"]),
  s("l5-15", "🎨", "Try something new", "A recipe, a craft, a route, an instrument. Beginner energy.", 25, "high", "create", ["create"]),
  s("l5-16", "🏃", "Do a structured workout", "Proper warm-up, real sets, cool down. 20+ minutes.", 25, "high", "fitness", ["physical"], ["morning", "midday", "evening"]),
  s("l5-17", "🧹", "Organize a larger space", "Closet, pantry, garage corner. Take before-and-after pics.", 25, "high", "tidy", ["focus", "physical"]),
  s("l5-18", "🌿", "Spend time in nature quietly", "Park, trail, garden. No podcast. Just presence.", 20, "medium", "outside", ["outdoors", "reflective"], ["morning", "midday", "evening"]),
  s("l5-19", "🧠", "Complete something you've been avoiding", "Not start, finish. Take the dreaded thing to done.", 25, "high", "mind", ["focus"], ["morning", "midday", "evening"]),
  s("l5-20", "🧠", "Focus deeply with no distractions", "Phone in another room. 25 minutes. One thing only.", 25, "high", "mind", ["focus"], ["morning", "midday", "evening"]),
];
