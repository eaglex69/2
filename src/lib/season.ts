// Клиентобезопасные правила сезонного пропуска, недельных рейтингов и очков.
export type Reward = { coins?: number; gems?: number; items?: Record<string, number>; avatar?: string };

export const SEASON_LEVELS = 30;
export const POINTS_PER_LEVEL = 120;
export const PREMIUM_COST = 30;

export type StatsLike = { harvested: number; fishCaught: number; mined: number; produced: number; orders: number; earned: number };

// Монотонно растущие «очки активности». Недельные и сезонные очки — разница с базой периода.
export function lifetimeScore(stats: StatsLike) {
  return stats.harvested * 5 + stats.fishCaught * 4 + stats.mined * 3 + stats.produced * 6 + stats.orders * 20 + Math.floor(stats.earned / 20);
}

export function weekKey(ms: number) {
  const d = new Date(ms);
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((date.getTime() - yearStart) / 86_400_000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function weekEnd(ms: number) {
  const d = new Date(ms);
  const day = d.getUTCDay() || 7;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + (8 - day));
}

export function seasonKey(ms: number) {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function seasonEnd(ms: number) {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
}

const SEASON_NAMES = ["Снежная сказка", "Метельный февраль", "Весенняя капель", "Цветущий апрель", "Майские грозы", "Золотое лето", "Жаркий июль", "Медовый август", "Урожайная осень", "Тыквенный октябрь", "Туманный ноябрь", "Зимняя ярмарка"];
export function seasonName(ms: number) {
  return SEASON_NAMES[new Date(ms).getUTCMonth()];
}

const FREE_ITEMS = ["feed", "carrot_seed", "wheat_seed", "compound_feed", "honey_cake", "pickaxe"];
const PREMIUM_ITEMS = ["honey_cake", "pickaxe", "carp_fry", "catfish_fry", "compound_feed", "onion_seed"];

export function seasonReward(track: "free" | "premium", level: number): Reward {
  if (track === "free") {
    const reward: Reward = { coins: 40 + level * 12 };
    if (level % 3 === 0) reward.items = { [FREE_ITEMS[(level / 3 - 1) % FREE_ITEMS.length]]: 2 + Math.floor(level / 10) };
    if (level % 5 === 0) reward.gems = 2;
    return reward;
  }
  const reward: Reward = { coins: 120 + level * 30, items: { [PREMIUM_ITEMS[level % PREMIUM_ITEMS.length]]: 2 + Math.floor(level / 8) } };
  if (level % 3 === 0) reward.gems = 3;
  if (level === 10) reward.avatar = "chef";
  if (level === 20) reward.avatar = "captain";
  if (level === 30) { reward.avatar = "robot"; reward.gems = 15; }
  return reward;
}

// Награды топ-5 каждую неделю. Для кооперативов — каждому участнику.
export const WEEKLY_FARMER_REWARDS: Reward[] = [
  { coins: 3000, gems: 12, items: { honey_cake: 3, pickaxe: 3 } },
  { coins: 2000, gems: 8, items: { honey_cake: 2, pickaxe: 2 } },
  { coins: 1200, gems: 5, items: { honey_cake: 1, pickaxe: 1 } },
  { coins: 700, gems: 3 },
  { coins: 400, gems: 1 },
];
export const WEEKLY_COOP_REWARDS: Reward[] = [
  { coins: 1500, gems: 6, items: { honey_cake: 2 } },
  { coins: 1000, gems: 4, items: { honey_cake: 1 } },
  { coins: 700, gems: 3 },
  { coins: 450, gems: 2 },
  { coins: 250, gems: 1 },
];
