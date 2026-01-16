export type CardDeckId =
  | "fibonacci"
  | "fibonacci-short"
  | "doubling"
  | "tshirt"
  | "planet-scale"
  | "yes-no"
  | "simple"
  | "hours";

export const cardDecks: Record<CardDeckId, { options: Array<string | number> }> =
  {
    fibonacci: {
      options: [0, 1, 2, 3, 5, 8, 13, 21, 34],
    },
    "fibonacci-short": {
      options: [1, 2, 3, 5, 8, 13, 21],
    },
    doubling: {
      options: [2, 4, 8, 16, 32],
    },
    tshirt: {
      options: ["XS", "S", "M", "L", "XL"],
    },
    "planet-scale": {
      options: [
        "🌑 Moon",
        "🌍 Earth",
        "🔴 Mars",
        "🟠 Jupiter",
        "🪐 Saturn",
        "🔵 Uranus",
        "🌊 Neptune",
        "❄️ Pluto",
      ],
    },
    "yes-no": {
      options: ["Yes", "No"],
    },
    simple: {
      options: [1, 2, 3, 4, 5, 6, 7, 8],
    },
    hours: {
      options: [2, 4, 8, 16, 24],
    },
  };
