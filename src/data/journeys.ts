export interface JourneyStep {
  emoji: string;
  title: string;
  description: string;
  minutes: number;
}

export interface Journey {
  id: string;
  emoji: string;
  title: string;
  tagline: string;
  steps: JourneyStep[];
}

export const journeys: Journey[] = [
  {
    id: "rut",
    emoji: "🌱",
    title: "Get out of a rut",
    tagline: "Seven small moves to shake things loose.",
    steps: [
      { emoji: "🪟", title: "Open a window", description: "Let fresh air in and take five slow breaths.", minutes: 2 },
      { emoji: "🚶", title: "Walk a new block", description: "Take a short walk on a street you rarely use.", minutes: 10 },
      { emoji: "🧺", title: "Clear one surface", description: "Pick one table or shelf and reset it.", minutes: 5 },
      { emoji: "🎵", title: "New song, full volume", description: "Play something you have never heard before.", minutes: 4 },
      { emoji: "📝", title: "Write one wish", description: "Write one thing you want next month to hold.", minutes: 3 },
      { emoji: "🍳", title: "Cook something simple", description: "Make one meal or snack from scratch.", minutes: 20 },
      { emoji: "🌅", title: "Plan tomorrow's first hour", description: "Decide the first three things you will do.", minutes: 5 },
    ],
  },
  {
    id: "social",
    emoji: "🤝",
    title: "Be more social",
    tagline: "Gentle steps toward people you care about.",
    steps: [
      { emoji: "💬", title: "Reply to an old message", description: "Answer one message you have been sitting on.", minutes: 3 },
      { emoji: "👋", title: "Say hi to a neighbor", description: "A small hello counts.", minutes: 2 },
      { emoji: "📱", title: "Send a memory", description: "Text a friend a photo or memory you share.", minutes: 3 },
      { emoji: "☕", title: "Ask someone for coffee", description: "Suggest a simple, specific time.", minutes: 5 },
      { emoji: "📞", title: "Call instead of text", description: "Have one short voice conversation.", minutes: 10 },
      { emoji: "🎉", title: "Join something", description: "Look up one local group or event.", minutes: 10 },
    ],
  },
  {
    id: "new",
    emoji: "✨",
    title: "Try new things",
    tagline: "Small experiments, zero pressure.",
    steps: [
      { emoji: "🥭", title: "Taste something new", description: "Try a food or drink you have never had.", minutes: 10 },
      { emoji: "🎨", title: "Draw for five minutes", description: "Anything at all. Nobody needs to see it.", minutes: 5 },
      { emoji: "📚", title: "Read outside your lane", description: "Read one article on a topic you know nothing about.", minutes: 10 },
      { emoji: "🗺️", title: "Visit a new place", description: "A shop, park or café you have never been to.", minutes: 30 },
      { emoji: "🧠", title: "Learn five words", description: "Five words in a language you do not speak.", minutes: 5 },
      { emoji: "🎤", title: "Try a new skill", description: "Watch one beginner video and give it a go.", minutes: 15 },
    ],
  },
  {
    id: "energy",
    emoji: "⚡",
    title: "Improve your energy",
    tagline: "Build steady energy, one habit at a time.",
    steps: [
      { emoji: "💧", title: "Drink a full glass of water", description: "Before anything else.", minutes: 1 },
      { emoji: "☀️", title: "Get daylight", description: "Step outside for a few minutes of natural light.", minutes: 5 },
      { emoji: "🤸", title: "Move for five", description: "Stretch, dance or walk for five minutes.", minutes: 5 },
      { emoji: "🥗", title: "Add one whole food", description: "Add fruit, veg or nuts to your next meal.", minutes: 5 },
      { emoji: "📵", title: "Screen-free break", description: "Ten minutes with no screens at all.", minutes: 10 },
      { emoji: "🌙", title: "Set a wind-down time", description: "Pick a time tonight to start winding down.", minutes: 2 },
      { emoji: "😴", title: "Protect your sleep", description: "Go to bed within 30 minutes of your wind-down time.", minutes: 5 },
    ],
  },
];
