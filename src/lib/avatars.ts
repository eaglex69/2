export type AvatarConfig = { key: string; name: string; bg: string; icon: string; coins?: number; gems?: number; level: number };
export const AVATARS: Record<string, AvatarConfig> = {
  sprout: { key: "sprout", name: "Росток", bg: "#bfe8a0", icon: "sprout", level: 1 },
  sun: { key: "sun", name: "Солнышко", bg: "#ffe08a", icon: "sun", level: 1 },
  river: { key: "river", name: "Речка", bg: "#a9dcf0", icon: "waves", level: 1 },
  mountain: { key: "mountain", name: "Гора", bg: "#d4ded2", icon: "mountain", level: 1 },
  cow: { key: "cow", name: "Бурёнка", bg: "#f6dfc0", icon: "cow", level: 1, coins: 750 },
  chicken: { key: "chicken", name: "Курочка", bg: "#ffe3b0", icon: "bird", level: 1, coins: 500 },
  cat: { key: "cat", name: "Мурзик", bg: "#e6d6f0", icon: "cat", level: 1, coins: 900 },
  dog: { key: "dog", name: "Дружок", bg: "#e8d2b8", icon: "dog", level: 1, coins: 900 },
  fox: { key: "fox", name: "Лисичка", bg: "#ffd2a8", icon: "fox", level: 3, coins: 1500 },
  rabbit: { key: "rabbit", name: "Зайка", bg: "#f6e4ee", icon: "rabbit", level: 2, coins: 1100 },
  pig: { key: "pig", name: "Хрюша", bg: "#ffd8de", icon: "pig", level: 2, coins: 1100 },
  fish: { key: "fish", name: "Рыбак", bg: "#bfe6f2", icon: "fish", level: 3, coins: 1400 },
  duck: { key: "duck", name: "Уточка", bg: "#f4e3b0", icon: "duck", level: 2, coins: 800 },
  tractor: { key: "tractor", name: "Тракторист", bg: "#ffd9b0", icon: "tractor", level: 4, gems: 5 },
  crown: { key: "crown", name: "Барон долины", bg: "#f7e2a8", icon: "crown", level: 6, gems: 15 },
  wizard: { key: "wizard", name: "Чародей", bg: "#dcd0f4", icon: "wand", level: 5, gems: 10 },
  honey: { key: "honey", name: "Пасечник", bg: "#f8e7a6", icon: "hexagon", level: 4, coins: 2200 },
  chef: { key: "chef", name: "Шеф-повар", bg: "#f6e2d4", icon: "chef", level: 4, coins: 2000 },
  captain: { key: "captain", name: "Капитан", bg: "#c6e0ef", icon: "anchor", level: 5, gems: 8 },
  robot: { key: "robot", name: "Агробот", bg: "#d2e4e6", icon: "bot", level: 7, gems: 20 },
};
export const DEFAULT_AVATARS = ["sprout", "sun", "river", "mountain"];
export function avatarConfig(key: string) { return AVATARS[key] ?? AVATARS.sprout; }
