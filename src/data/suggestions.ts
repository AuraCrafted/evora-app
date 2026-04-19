export type Category = "any" | "outside" | "social" | "fitness" | "mind" | "tidy" | "create" | "care" | "custom";

export interface Suggestion {
  id: string;
  emoji: string;
  title: string;
  description: string;
  duration: string;
  category: Exclude<Category, "any">;
}

export const categoryLabels: Record<Category, string> = {
  any: "Surprise me",
  outside: "Outside",
  social: "Social",
  fitness: "Health & Fitness",
  mind: "Mind",
  tidy: "Tidy",
  create: "Create",
  care: "Self-care",
  custom: "My nudges",
};

export const categoryEmoji: Record<Category, string> = {
  any: "🎲",
  outside: "🌳",
  social: "👋",
  fitness: "💪",
  mind: "🧠",
  tidy: "🧹",
  create: "🎨",
  care: "💛",
  custom: "✨",
};

export const suggestions: Suggestion[] = [
  // Outside
  { id: "o1", emoji: "🚶", title: "Take a 10-minute walk outside", description: "Around the block, in a park, anywhere with sky above you.", duration: "10 min", category: "outside" },
  { id: "o2", emoji: "🌤️", title: "Sit outside and notice 5 things", description: "A bird, a cloud, a leaf, a sound, a smell. Just look.", duration: "5 min", category: "outside" },
  { id: "o3", emoji: "☀️", title: "Get 5 minutes of sunlight", description: "Step out, face the sun, close your eyes. Let it warm you.", duration: "5 min", category: "outside" },
  { id: "o4", emoji: "📸", title: "Photograph one beautiful thing outside", description: "Walk until you find it. Trust that you will.", duration: "15 min", category: "outside" },
  { id: "o5", emoji: "🌳", title: "Find a tree and stand under it", description: "Look up through the branches. Breathe slowly five times.", duration: "5 min", category: "outside" },
  { id: "o6", emoji: "🏞️", title: "Walk a route you've never taken", description: "Turn left where you'd usually turn right. See what's there.", duration: "20 min", category: "outside" },

  // Social
  { id: "s1", emoji: "📞", title: "Text someone you care about", description: "Just a 'thinking of you'. No agenda. Connection matters.", duration: "2 min", category: "social" },
  { id: "s2", emoji: "📱", title: "Call someone for 5 minutes", description: "A friend, a parent, a sibling. Hearing a voice helps.", duration: "5 min", category: "social" },
  { id: "s3", emoji: "💌", title: "Send a thank-you message", description: "To anyone who's been kind to you recently. Be specific.", duration: "5 min", category: "social" },
  { id: "s4", emoji: "🤝", title: "Compliment someone genuinely", description: "Out loud or in a message. Specific compliments land hardest.", duration: "2 min", category: "social" },
  { id: "s5", emoji: "☕", title: "Invite someone for coffee this week", description: "Just send the message now. Pick a day, suggest a place.", duration: "3 min", category: "social" },
  { id: "s6", emoji: "👋", title: "Reconnect with an old friend", description: "Send a 'hey, been thinking about you' message. That's enough.", duration: "5 min", category: "social" },
  { id: "s7", emoji: "🎉", title: "Tell someone what you appreciate about them", description: "The thing you've been meaning to say. Say it now.", duration: "5 min", category: "social" },

  // Fitness
  { id: "f1", emoji: "🤸", title: "Do 10 gentle stretches", description: "Reach for the sky, roll your shoulders, touch your toes.", duration: "5 min", category: "fitness" },
  { id: "f2", emoji: "💧", title: "Drink a full glass of water", description: "Slowly. Notice it. Your body will thank you.", duration: "3 min", category: "fitness" },
  { id: "f3", emoji: "🏃", title: "Do 20 jumping jacks", description: "Wake your body up. Feel your heart for a moment.", duration: "2 min", category: "fitness" },
  { id: "f4", emoji: "🧘", title: "5 minutes of deep breathing", description: "Four seconds in, six seconds out. Eyes closed.", duration: "5 min", category: "fitness" },
  { id: "f5", emoji: "🍎", title: "Eat something fresh", description: "An apple, some berries, a carrot. Nourish yourself.", duration: "5 min", category: "fitness" },
  { id: "f6", emoji: "💪", title: "Do 10 push-ups (knees ok)", description: "Strength is built one rep at a time. This counts.", duration: "3 min", category: "fitness" },
  { id: "f7", emoji: "🧎", title: "Hold a 30-second plank", description: "Just thirty seconds. Breathe through it. Then rest.", duration: "2 min", category: "fitness" },
  { id: "f8", emoji: "🚿", title: "Take a refreshing shower", description: "Even just five minutes. Warm water can reset everything.", duration: "10 min", category: "fitness" },
  { id: "f9", emoji: "🥗", title: "Make a real meal for yourself", description: "Even something simple. Sit down to eat it.", duration: "20 min", category: "fitness" },

  // Mind
  { id: "m1", emoji: "📓", title: "Write down 3 good things", description: "Tiny things count. Coffee. Sunlight. A song you like.", duration: "5 min", category: "mind" },
  { id: "m2", emoji: "📚", title: "Read one page of anything", description: "A book, an article, a poem. One page. Then decide if you want more.", duration: "5 min", category: "mind" },
  { id: "m3", emoji: "🧘", title: "Sit still and breathe", description: "Four seconds in, six seconds out. Do this ten times.", duration: "3 min", category: "mind" },
  { id: "m4", emoji: "📝", title: "Write what's on your mind", description: "Three messy sentences. Doesn't need to make sense.", duration: "5 min", category: "mind" },
  { id: "m5", emoji: "🎶", title: "Play a song you love — fully", description: "No skipping. Listen all the way through. No phone.", duration: "4 min", category: "mind" },
  { id: "m6", emoji: "🤔", title: "Write a question you don't know the answer to", description: "Sit with it for a minute. Don't try to solve it.", duration: "3 min", category: "mind" },

  // Tidy
  { id: "t1", emoji: "🛏️", title: "Make your bed", description: "Pull the covers up, fluff the pillows. One small win.", duration: "2 min", category: "tidy" },
  { id: "t2", emoji: "🧹", title: "Clear one surface", description: "Pick a desk, nightstand, or counter. Make it visibly cleaner.", duration: "10 min", category: "tidy" },
  { id: "t3", emoji: "🧺", title: "Put 5 things away", description: "Just five. Anything. Stop when you hit five.", duration: "5 min", category: "tidy" },
  { id: "t4", emoji: "🚮", title: "Throw away 3 things", description: "Trash. Old papers. Empty bottles. Out they go.", duration: "3 min", category: "tidy" },
  { id: "t5", emoji: "🧼", title: "Wash the dishes that are out", description: "Don't think about it, just start. Music helps.", duration: "10 min", category: "tidy" },
  { id: "t6", emoji: "🧦", title: "Sort one drawer", description: "Just one. Toss what you don't need. Done.", duration: "10 min", category: "tidy" },

  // Create
  { id: "c1", emoji: "✏️", title: "Doodle for 5 minutes", description: "No rules, no judgment. Just shapes and lines.", duration: "5 min", category: "create" },
  { id: "c2", emoji: "🎨", title: "Rearrange one small thing", description: "Move a chair, restyle a shelf. Small change, fresh feeling.", duration: "10 min", category: "create" },
  { id: "c3", emoji: "📸", title: "Take 3 photos of things you like", description: "In your room, out the window. Look for what's beautiful.", duration: "5 min", category: "create" },
  { id: "c4", emoji: "✍️", title: "Write a 6-word story", description: "Just six words. About anything. Have fun with it.", duration: "5 min", category: "create" },
  { id: "c5", emoji: "🎵", title: "Make a 5-song playlist", description: "Theme: 'how I want to feel today'. Save it.", duration: "10 min", category: "create" },

  // Care
  { id: "ca1", emoji: "🦷", title: "Brush your teeth right now", description: "If you haven't today. It's a tiny act of self-respect.", duration: "3 min", category: "care" },
  { id: "ca2", emoji: "👟", title: "Put on real clothes", description: "Even just clean ones. Even just a t-shirt and pants.", duration: "5 min", category: "care" },
  { id: "ca3", emoji: "🌤️", title: "Open a window", description: "Let some real air in. Notice the temperature change.", duration: "1 min", category: "care" },
  { id: "ca4", emoji: "🌱", title: "Water a plant (or notice one)", description: "If you have none, look out the window at any greenery.", duration: "3 min", category: "care" },
  { id: "ca5", emoji: "🛀", title: "Wash your face with cold water", description: "It will feel like a small reset. Try it.", duration: "2 min", category: "care" },
  { id: "ca6", emoji: "🧴", title: "Moisturize your hands or face", description: "A small ritual of taking care of yourself.", duration: "2 min", category: "care" },
];
