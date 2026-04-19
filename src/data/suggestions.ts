export type Category = "move" | "tidy" | "mind" | "connect" | "create" | "care";

export interface Suggestion {
  id: string;
  emoji: string;
  title: string;
  description: string;
  duration: string;
  category: Category;
}

export const categoryLabels: Record<Category, string> = {
  move: "Move",
  tidy: "Tidy",
  mind: "Mind",
  connect: "Connect",
  create: "Create",
  care: "Self-care",
};

export const suggestions: Suggestion[] = [
  { id: "1", emoji: "🛏️", title: "Make your bed", description: "Pull the covers up, fluff the pillows. One small win to start.", duration: "2 min", category: "tidy" },
  { id: "2", emoji: "💧", title: "Drink a full glass of water", description: "Slowly. Notice it. Your body will thank you.", duration: "3 min", category: "care" },
  { id: "3", emoji: "🚶", title: "Step outside for fresh air", description: "Just to your porch, balcony, or front step. Breathe deep five times.", duration: "5 min", category: "move" },
  { id: "4", emoji: "🧹", title: "Clear one surface", description: "Pick a desk, nightstand, or counter. Make it visibly cleaner.", duration: "10 min", category: "tidy" },
  { id: "5", emoji: "🤸", title: "Do 10 gentle stretches", description: "Reach for the sky, roll your shoulders, touch your toes. Wake your body up.", duration: "5 min", category: "move" },
  { id: "6", emoji: "📞", title: "Text someone you care about", description: "Just a 'thinking of you'. No agenda. Connection matters.", duration: "2 min", category: "connect" },
  { id: "7", emoji: "🍎", title: "Eat something fresh", description: "An apple, some berries, a carrot. Nourish yourself.", duration: "5 min", category: "care" },
  { id: "8", emoji: "🚿", title: "Take a refreshing shower", description: "Even just five minutes. Warm water can reset everything.", duration: "10 min", category: "care" },
  { id: "9", emoji: "📓", title: "Write down 3 good things", description: "Tiny things count. Coffee. Sunlight. A song you like.", duration: "5 min", category: "mind" },
  { id: "10", emoji: "🎶", title: "Play a song you love", description: "Stand up. Move a little if you feel it.", duration: "4 min", category: "mind" },
  { id: "11", emoji: "🧺", title: "Put 5 things away", description: "Just five. Anything. Stop when you hit five.", duration: "5 min", category: "tidy" },
  { id: "12", emoji: "🌱", title: "Water a plant (or notice one)", description: "If you have none, look out the window at any greenery for a moment.", duration: "3 min", category: "care" },
  { id: "13", emoji: "📚", title: "Read one page of anything", description: "A book, an article, a poem. One page. Then decide if you want more.", duration: "5 min", category: "mind" },
  { id: "14", emoji: "🧘", title: "Sit still and breathe", description: "Four seconds in, six seconds out. Do this ten times.", duration: "3 min", category: "mind" },
  { id: "15", emoji: "🍳", title: "Make yourself a real meal", description: "Even something simple. Eggs, toast, pasta. Sit down to eat it.", duration: "20 min", category: "care" },
  { id: "16", emoji: "✏️", title: "Doodle for 5 minutes", description: "No rules, no judgment. Just shapes and lines.", duration: "5 min", category: "create" },
  { id: "17", emoji: "🚮", title: "Throw away 3 things", description: "Trash. Old papers. Empty bottles. Out they go.", duration: "3 min", category: "tidy" },
  { id: "18", emoji: "🦷", title: "Brush your teeth right now", description: "If you haven't today. It's a tiny act of self-respect.", duration: "3 min", category: "care" },
  { id: "19", emoji: "🌤️", title: "Open a window", description: "Let some real air in. Notice the temperature change.", duration: "1 min", category: "care" },
  { id: "20", emoji: "💃", title: "Dance to one full song", description: "Door closed. No one watching. Just move however you want.", duration: "4 min", category: "move" },
  { id: "21", emoji: "📝", title: "Write what's on your mind", description: "Three messy sentences. Doesn't need to make sense.", duration: "5 min", category: "mind" },
  { id: "22", emoji: "👟", title: "Put on real clothes", description: "Even just clean ones. Even just a t-shirt and pants.", duration: "5 min", category: "care" },
  { id: "23", emoji: "🤝", title: "Compliment someone (or yourself)", description: "Genuine and specific. Out loud or in a message.", duration: "2 min", category: "connect" },
  { id: "24", emoji: "🎨", title: "Rearrange one small thing", description: "Move a chair, restyle a shelf. Small change, fresh feeling.", duration: "10 min", category: "create" },
];
