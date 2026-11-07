import { POINTS_PER_LEVEL, PREMIUM_COST, SEASON_LEVELS, lifetimeScore, seasonKey, seasonReward, weekKey } from "./season";
import { bonusMult, shopPrice } from "./bonus";
import {
  ANIMALS,
  BLESSINGS,
  FISHING_COOLDOWN_MS,
  BUILDINGS,
  EQUIPMENT,
  GLOBALS,
  UPGRADES,
  constructionPrice,
  plotsForGarden,
  pondsForLevel,
  CAGE_SPECIES,
  CROPS,
  ITEMS,
  JOBS,
  MINES,
  NEWS,
  POND_SPECIES,
  PROMOTIONS,
  PVZ,
  RECIPES,
  SHOP_KEYS,
  barnCapacity,
  dayKey,
  fishingCursor,
  inventoryVolume,
  marketPrice,
  upgradeCost,
  WHEEL,
  xpNeeded,
  type CropKey,
} from "./game-config";

export type Plot = { crop: CropKey | null; plantedAt: number; readyAt: number; watered: boolean };
export type WaterSlot = { species: string | null; startedAt: number; readyAt: number; fed: boolean };
export type Pen = { animal: string | null; startedAt: number; readyAt: number };
export type CellarJob = { id: number; recipe: string; readyAt: number };
export type ActiveFishing = { startedAt: number; expiresAt: number; target: number; width: number; period: number; species: string };
export type CityOrder = { id: string; itemKey: string; quantity: number; rewardCoins: number; rewardXp: number };

export type GameState = {
  version: 1;
  level: number;
  xp: number;
  coins: number;
  gems: number;
  energy: number;
  maxEnergy: number;
  energyLevel: number;
  lastEnergyAt: number;
  inventory: Record<string, number>;
  plots: Plot[];
  ponds: WaterSlot[];
  pens: Pen[];
  cages: WaterSlot[];
  cellar: { level: number; jobs: CellarJob[]; nextJobId: number };
  mines: Record<string, { depth: number; lastAt: number }>;
  diamond: { depth: number; lastAt: number };
  fishing: ActiveFishing | null;
  lastCastAt: number;
  job: { key: string; startedAt: number; readyAt: number } | null;
  barnLevel: number;
  buildings: { barn: number; garden: number; pond: number };
  equipment: { feeder: number; harvester: number; aerator: number };
  elysium: { blessing: string | null; until: number; lastRitual: number; aether: number };
  orders: { day: string; items: CityOrder[]; completed: string[] };
  stats: { harvested: number; fishCaught: number; mined: number; produced: number; earned: number; orders: number; collected: number };
  activity: { playMs: number; lastPing: number; streak: number; bestStreak: number; lastDay: string; daysActive: number };
  wheel: { freeDay: string; paidDay: string; paidToday: number; last: { index: number; at: number } };
  pvz: { startedAt: number; best: number; plays: number; winDay: string };
  claimedPromos: string[];
  claimedAchievements: string[];
  readNews: string[];
  weekly: { week: string; base: number };
  season: { key: string; base: number; premium: boolean; claimedFree: number[]; claimedPremium: number[] };
  createdAt: number;
  lastTick: number;
};

export type GameAction = { type: string; [key: string]: unknown };
export type ActionResult = { state: GameState; message: string };

export class GameError extends Error {}

// Момент текущего действия — нужен, чтобы бонусы считались по серверному времени.
let ctxNow = 0;

export const ACHIEVEMENTS = [
  { id: "harvest10", name: "Хозяин грядок", description: "Соберите 10 урожаев", stat: "harvested", goal: 10, coins: 60, gems: 0 },
  { id: "fish5", name: "Удачный клёв", description: "Поймайте 5 рыб", stat: "fishCaught", goal: 5, coins: 0, gems: 1 },
  { id: "mine10", name: "Голос глубины", description: "Сделайте 10 спусков в шахты", stat: "mined", goal: 10, coins: 90, gems: 0 },
  { id: "produce5", name: "Домашние запасы", description: "Приготовьте 5 продуктов в погребе", stat: "produced", goal: 5, coins: 110, gems: 0 },
  { id: "orders3", name: "Свой человек в городе", description: "Выполните 3 городских заказа", stat: "orders", goal: 3, coins: 0, gems: 1 },
] as const;

const emptyPlot = (): Plot => ({ crop: null, plantedAt: 0, readyAt: 0, watered: false });
const emptyWater = (): WaterSlot => ({ species: null, startedAt: 0, readyAt: 0, fed: false });

export function initialGameState(now = Date.now()): GameState {
  return {
    version: 1,
    level: 1,
    xp: 0,
    coins: 320,
    gems: 6,
    energy: 30,
    maxEnergy: 30,
    energyLevel: 1,
    lastEnergyAt: now,
    inventory: { carrot_seed: 6, wheat_seed: 4, onion_seed: 2, potato_seed: 2, cucumber_seed: 2, feed: 4, compound_feed: 2, carp_fry: 1, crucian_fry: 1, catfish_fry: 1, pickaxe: 3, honey_cake: 1 },
    plots: Array.from({ length: 6 }, emptyPlot),
    ponds: Array.from({ length: 2 }, emptyWater),
    pens: Array.from({ length: 2 }, () => ({ animal: null, startedAt: 0, readyAt: 0 })),
    cages: [emptyWater()],
    cellar: { level: 1, jobs: [], nextJobId: 1 },
    mines: { copper: { depth: 0, lastAt: 0 }, iron: { depth: 0, lastAt: 0 }, gold: { depth: 0, lastAt: 0 } },
    diamond: { depth: 0, lastAt: 0 },
    fishing: null,
    lastCastAt: 0,
    job: null,
    barnLevel: 1,
    buildings: { barn: 1, garden: 1, pond: 1 },
    equipment: { feeder: 0, harvester: 0, aerator: 0 },
    elysium: { blessing: null, until: 0, lastRitual: 0, aether: 0 },
    orders: { day: "", items: [], completed: [] },
    stats: { harvested: 0, fishCaught: 0, mined: 0, produced: 0, earned: 0, orders: 0, collected: 0 },
    activity: { playMs: 0, lastPing: 0, streak: 0, bestStreak: 0, lastDay: "", daysActive: 0 },
    wheel: { freeDay: "", paidDay: "", paidToday: 0, last: { index: -1, at: 0 } },
    pvz: { startedAt: 0, best: 0, plays: 0, winDay: "" },
    claimedPromos: [],
    claimedAchievements: [],
    readNews: [],
    weekly: { week: weekKey(now), base: 0 },
    season: { key: seasonKey(now), base: 0, premium: false, claimedFree: [], claimedPremium: [] },
    createdAt: now,
    lastTick: now,
  };
}

function hash(value: string) {
  let result = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    result ^= value.charCodeAt(i);
    result = Math.imul(result, 16777619);
  }
  return Math.abs(result);
}

function orderPool(level: number) {
  const pool = ["carrot", "wheat", "onion", "egg", "carp", "crucian", "stone", "coal", "copper"];
  if (level >= 2) pool.push("potato", "tomato", "milk", "duck_egg", "trout", "cheese", "juice", "iron", "bread");
  if (level >= 3) pool.push("cucumber", "cabbage", "pepper", "wool", "goat_milk", "pickles", "sturgeon", "butter", "soup");
  if (level >= 4) pool.push("corn", "strawberry", "perch", "eel", "honey", "jam", "gold", "truffle", "pike", "meat");
  if (level >= 5) pool.push("pumpkin", "salmon", "pie", "feather", "fur");
  if (level >= 6) pool.push("beet", "eggplant", "bream", "tench");
  if (level >= 8) pool.push("broccoli", "garlic", "zander");
  return pool;
}

function generateOrders(state: GameState, userId: number, now: number) {
  const day = dayKey(new Date(now));
  if (state.orders.day === day && state.orders.items.length === 3) return;
  const pool = orderPool(state.level);
  const items = Array.from({ length: 3 }, (_, index) => {
    const seed = hash(`${day}:${userId}:${index}`);
    const itemKey = pool[(seed + index * 5) % pool.length];
    const quantity = 2 + (seed % 3) + (index === 2 ? 1 : 0);
    return {
      id: `${day}-${index}`,
      itemKey,
      quantity,
      rewardCoins: Math.round(marketPrice(itemKey, new Date(now)) * quantity * 1.55 + 18 + index * 8),
      rewardXp: 15 + quantity * 5 + index * 4,
    };
  });
  state.orders = { day, items, completed: [] };
}

// Если админ удалил/выключил контент, игровое состояние не должно ломаться.
function sanitizeState(state: GameState) {
  for (const plot of state.plots) if (plot.crop && !CROPS[plot.crop]) Object.assign(plot, emptyPlot());
  const ponds = POND_SPECIES as Record<string, unknown>;
  const cages = CAGE_SPECIES as Record<string, unknown>;
  for (const slot of state.ponds) if (slot.species && !ponds[slot.species]) Object.assign(slot, emptyWater());
  for (const slot of state.cages) if (slot.species && !cages[slot.species]) Object.assign(slot, emptyWater());
  for (const pen of state.pens) if (pen.animal && !(ANIMALS as Record<string, unknown>)[pen.animal]) Object.assign(pen, { animal: null, startedAt: 0, readyAt: 0 });
  state.cellar.jobs = state.cellar.jobs.filter((job) => RECIPES[job.recipe]);
  if (state.job && !(JOBS as Record<string, unknown>)[state.job.key]) state.job = null;
}

export function prepareGameState(raw: unknown, userId: number, now = Date.now()): GameState {
  const base = initialGameState(now);
  const source = raw && typeof raw === "object" ? raw as Partial<GameState> : {};
  const state: GameState = {
    ...base,
    ...source,
    inventory: { ...base.inventory, ...(source.inventory ?? {}) },
    cellar: { ...base.cellar, ...(source.cellar ?? {}) },
    mines: { ...base.mines, ...(source.mines ?? {}) },
    diamond: { ...base.diamond, ...(source.diamond ?? {}) },
    elysium: { ...base.elysium, ...(source.elysium ?? {}) },
    orders: { ...base.orders, ...(source.orders ?? {}) },
    stats: { ...base.stats, ...(source.stats ?? {}) },
    activity: { ...base.activity, ...(source.activity ?? {}) },
    wheel: { ...base.wheel, ...(source.wheel ?? {}) },
    pvz: { ...base.pvz, ...(source.pvz ?? {}) },
    buildings: { ...base.buildings, ...(source.buildings ?? {}) },
    equipment: { ...base.equipment, ...(source.equipment ?? {}) },
    plots: Array.isArray(source.plots) && source.plots.length ? source.plots : base.plots,
    ponds: Array.isArray(source.ponds) && source.ponds.length ? source.ponds : base.ponds,
    pens: Array.isArray(source.pens) && source.pens.length ? source.pens : base.pens,
    cages: Array.isArray(source.cages) && source.cages.length ? source.cages : base.cages,
    claimedPromos: Array.isArray(source.claimedPromos) ? source.claimedPromos : [],
    claimedAchievements: Array.isArray(source.claimedAchievements) ? source.claimedAchievements : [],
    readNews: Array.isArray(source.readNews) ? source.readNews : [],
    weekly: { ...base.weekly, ...(source.weekly ?? {}) },
    season: {
      ...base.season,
      ...(source.season ?? {}),
      claimedFree: Array.isArray(source.season?.claimedFree) ? source.season.claimedFree : [],
      claimedPremium: Array.isArray(source.season?.claimedPremium) ? source.season.claimedPremium : [],
    },
  };
  // Совместимость: уровни строек выводятся из размеров массивов старых сохранений.
  if (!source.buildings) {
    state.buildings = {
      barn: Math.max(1, Math.round(Number(source.barnLevel ?? 1))),
      garden: Math.max(1, Math.round((state.plots.length - 4) / 2)),
      pond: Math.max(1, state.ponds.length - 1),
    };
  }
  if (!source.equipment) state.equipment = { feeder: 0, harvester: 0, aerator: 0 };
  const plotTarget = Math.min(20, plotsForGarden(state.buildings.garden));
  while (state.plots.length < plotTarget) state.plots.push(emptyPlot());
  const pondTarget = Math.min(7, pondsForLevel(state.buildings.pond));
  while (state.ponds.length < pondTarget) state.ponds.push(emptyWater());
  state.barnLevel = Math.max(state.barnLevel, state.buildings.barn);
  state.lastCastAt = Math.max(Number(source.lastCastAt) || 0, source.fishing?.startedAt || 0);
  const score = lifetimeScore(state.stats);
  if (!source.weekly) state.weekly.base = score;
  if (!source.season) state.season.base = score;
  if (state.weekly.week !== weekKey(now)) state.weekly = { week: weekKey(now), base: score };
  if (state.season.key !== seasonKey(now)) state.season = { key: seasonKey(now), base: score, premium: false, claimedFree: [], claimedPremium: [] };
  state.energy = Math.max(0, Math.min(state.maxEnergy, Number(state.energy) || 0));
  sanitizeState(state);
  const regenInterval = Math.max(1000, Math.round(GLOBALS.energyRegenSec * 1000 / ((state.elysium.blessing === "energy" && state.elysium.until > now ? 2 : 1) * bonusMult("energy", now))));
  if (state.energy < state.maxEnergy) {
    const steps = Math.floor(Math.max(0, now - state.lastEnergyAt) / regenInterval);
    if (steps > 0) {
      state.energy = Math.min(state.maxEnergy, state.energy + steps);
      state.lastEnergyAt += steps * regenInterval;
    }
  } else {
    state.lastEnergyAt = now;
  }
  if (state.elysium.until <= now) state.elysium.blessing = null;
  if (state.fishing && state.fishing.expiresAt + 60_000 < now) state.fishing = null;
  generateOrders(state, userId, now);
  state.lastTick = now;
  return state;
}

function text(action: GameAction, key: string) {
  const value = action[key];
  if (typeof value !== "string" || !value) throw new GameError("Некорректные параметры действия");
  return value;
}

function integer(action: GameAction, key: string, min = 0, max = 99) {
  const raw = action[key];
  if (typeof raw === "boolean" || raw === null || raw === undefined || raw === "") throw new GameError("Некорректное количество");
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) throw new GameError("Некорректное количество");
  return value;
}

function needLevel(state: GameState, level: number) {
  if (state.level < level) throw new GameError(`Откроется на ${level} уровне`);
}

function needEnergy(state: GameState, amount: number, now: number) {
  if (state.energy < amount) throw new GameError(`Нужно ${amount} энергии. Она восстанавливается со временем`);
  if (state.energy === state.maxEnergy) state.lastEnergyAt = now;
  state.energy -= amount;
}

export function removeItem(state: GameState, key: string, quantity: number) {
  if (!Number.isInteger(quantity) || quantity <= 0 || (state.inventory[key] ?? 0) < quantity) {
    throw new GameError(`Недостаточно: ${ITEMS[key]?.name ?? key}`);
  }
  state.inventory[key] -= quantity;
  if (state.inventory[key] <= 0) delete state.inventory[key];
}

export function addItem(state: GameState, key: string, quantity: number) {
  if (!ITEMS[key]) throw new GameError("Неизвестный предмет");
  if (!Number.isInteger(quantity) || quantity <= 0) throw new GameError("Некорректное количество предметов");
  if (inventoryVolume(state.inventory) + quantity > barnCapacity(state.barnLevel)) {
    throw new GameError("Амбар переполнен. Продайте товар или расширьте хранилище");
  }
  state.inventory[key] = (state.inventory[key] ?? 0) + quantity;
}

function gainXp(state: GameState, amount: number) {
  state.xp += amount > 0 ? Math.max(1, Math.round(amount * bonusMult("xp", ctxNow))) : 0;
  let levels = 0;
  while (state.xp >= xpNeeded(state.level) && state.level < GLOBALS.maxLevel) {
    state.xp -= xpNeeded(state.level);
    state.level += 1;
    state.maxEnergy += 1;
    state.energy = Math.min(state.maxEnergy, state.energy + 5);
    state.coins += 20 * state.level;
    if (state.level % 2 === 0) state.gems += 1;
    levels += 1;
  }
  if (state.level >= GLOBALS.maxLevel) state.xp = Math.min(state.xp, xpNeeded(state.level) - 1);
  return levels;
}

function finishMessage(base: string, levels: number) {
  return levels ? `${base} Новый уровень!` : base;
}

function weightedLoot(entries: readonly (readonly [string, number])[], random: number) {
  const total = entries.reduce((sum, entry) => sum + entry[1], 0);
  let cursor = random * total;
  for (const [key, weight] of entries) {
    cursor -= weight;
    if (cursor <= 0) return key;
  }
  return entries[entries.length - 1][0];
}

function hasBlessing(state: GameState, key: string, now: number) {
  return state.elysium.blessing === key && state.elysium.until > now;
}

export type ActionOverrides = { buildings?: import("./game-config").CostOverrides; equipment?: import("./game-config").CostOverrides };

export function applyGameAction(source: GameState, action: GameAction, now = Date.now(), random: () => number = Math.random, overrides: ActionOverrides = {}): ActionResult {
  const state = source;
  ctxNow = now;
  let message = "Готово";
  let levels = 0;
  const type = text(action, "type");

  if (type === "plant") {
    const index = integer(action, "index", 0, state.plots.length - 1);
    const crop = text(action, "crop") as CropKey;
    const config = CROPS[crop];
    const plot = state.plots[index];
    if (!config || !plot) throw new GameError("Такой грядки или культуры нет");
    if (plot.crop) throw new GameError("Грядка уже занята");
    needLevel(state, config.level);
    removeItem(state, config.seed, 1);
    const aeration = 1 - Math.min(0.5, state.equipment.aerator * 0.1);
    Object.assign(plot, { crop, plantedAt: now, readyAt: now + Math.round((config.duration * aeration) / bonusMult("speed", now)), watered: state.equipment.aerator > 0 });
    message = `Посажено: ${config.name}`;
  } else if (type === "water") {
    const plot = state.plots[integer(action, "index", 0, state.plots.length - 1)];
    if (!plot?.crop) throw new GameError("Здесь пока нечего поливать");
    if (plot.watered) throw new GameError("Грядка уже полита");
    plot.readyAt = Math.max(now, plot.readyAt - CROPS[plot.crop].duration * 0.25);
    plot.watered = true;
    message = "Полито: созревание ускорено на 25%";
  } else if (type === "harvest") {
    const plot = state.plots[integer(action, "index", 0, state.plots.length - 1)];
    if (!plot?.crop) throw new GameError("Грядка пуста");
    if (plot.readyAt > now) throw new GameError("Урожай ещё созревает");
    const config = CROPS[plot.crop];
    const amount = Math.max(1, Math.round((config.yield + (hasBlessing(state, "harvest", now) ? 1 : 0)) * bonusMult("yield", now)));
    addItem(state, plot.crop, amount);
    Object.assign(plot, { crop: null, plantedAt: 0, readyAt: 0, watered: false });
    state.stats.harvested += 1;
    levels = gainXp(state, config.xp);
    message = `Собрано: ${config.name} ×${amount}, +${Math.round(config.xp * bonusMult("xp", now))} опыта`;
  } else if (type === "pond-start" || type === "cage-start") {
    const isPond = type === "pond-start";
    const slots = isPond ? state.ponds : state.cages;
    const slot = slots[integer(action, "index", 0, slots.length - 1)];
    const species = text(action, "species");
    const config = isPond ? POND_SPECIES[species as keyof typeof POND_SPECIES] : CAGE_SPECIES[species as keyof typeof CAGE_SPECIES];
    if (!slot || !config) throw new GameError("Неверный водоём или порода");
    if (slot.species) throw new GameError("Сначала соберите текущий улов");
    needLevel(state, config.level);
    removeItem(state, config.fry, 1);
    Object.assign(slot, { species, startedAt: now, readyAt: now + Math.round(config.duration / bonusMult("speed", now)), fed: false });
    message = `${config.name}: малёк запущен`;
  } else if (type === "pond-feed" || type === "cage-feed") {
    const isPond = type === "pond-feed";
    const slots = isPond ? state.ponds : state.cages;
    const slot = slots[integer(action, "index", 0, slots.length - 1)];
    if (!slot?.species) throw new GameError("Водоём пуст");
    if (slot.fed) throw new GameError("Дополнительный корм уже дан");
    removeItem(state, isPond ? "feed" : "compound_feed", 1);
    slot.readyAt = Math.max(now, slot.readyAt - (slot.readyAt - now) * 0.25);
    slot.fed = true;
    message = "Рыба накормлена: рост ускорен";
  } else if (type === "pond-collect" || type === "cage-collect") {
    const isPond = type === "pond-collect";
    const slots = isPond ? state.ponds : state.cages;
    const slot = slots[integer(action, "index", 0, slots.length - 1)];
    if (!slot?.species) throw new GameError("Водоём пуст");
    if (slot.readyAt > now) throw new GameError("Рыба ещё растёт");
    const config = isPond ? POND_SPECIES[slot.species as keyof typeof POND_SPECIES] : CAGE_SPECIES[slot.species as keyof typeof CAGE_SPECIES];
    if (!config) throw new GameError("Неизвестная порода");
    const bonus = slot.fed && random() < 0.3 ? 1 : 0;
    const total = Math.max(1, Math.round((config.yield + bonus) * bonusMult("yield", now)));
    addItem(state, slot.species, total);
    Object.assign(slot, { species: null, startedAt: 0, readyAt: 0, fed: false });
    state.stats.fishCaught += total;
    levels = gainXp(state, config.xp);
    message = `Улов: ${config.name} ×${total}`;
  } else if (type === "pen-start") {
    const pen = state.pens[integer(action, "index", 0, state.pens.length - 1)];
    const animal = text(action, "animal") as keyof typeof ANIMALS;
    const config = ANIMALS[animal];
    if (!pen || !config) throw new GameError("Неверный загон");
    if (pen.animal) throw new GameError("Загон занят");
    if (((config as { gems?: number }).gems ?? 0) > 0 && !state.claimedPromos.includes(`animal:${animal}`)) throw new GameError("Это животное нужно сначала купить за алмазы");
    needLevel(state, config.level);
    removeItem(state, "feed", config.feed);
    const feederSpeed = 1 + state.equipment.feeder * 0.08;
    Object.assign(pen, { animal, startedAt: now, readyAt: now + Math.round(config.duration / (bonusMult("speed", now) * feederSpeed)) });
    message = `${config.name}: корм дан, продукт скоро будет готов`;
  } else if (type === "pen-collect") {
    const pen = state.pens[integer(action, "index", 0, state.pens.length - 1)];
    if (!pen?.animal) throw new GameError("Загон пуст");
    if (pen.readyAt > now) throw new GameError("Животным нужно ещё время");
    const config = ANIMALS[pen.animal as keyof typeof ANIMALS];
    if (!config) throw new GameError("Неизвестный загон");
    const feederBonus = Math.floor(state.equipment.feeder / 2);
    const total = Math.max(1, Math.round((config.yield + feederBonus) * bonusMult("yield", now)));
    addItem(state, config.product, total);
    state.stats.collected += total;
    Object.assign(pen, { animal: null, startedAt: 0, readyAt: 0 });
    levels = gainXp(state, Math.round(config.xp * (1 + state.equipment.feeder * 0.08)));
    message = `Получено: ${ITEMS[config.product].name} ×${total}${feederBonus > 0 ? " (кормушки)" : ""}`;
  } else if (type === "cellar-start") {
    const recipeKey = text(action, "recipe");
    const recipe = RECIPES[recipeKey];
    if (!recipe) throw new GameError("Рецепт не найден");
    needLevel(state, recipe.level);
    if (state.cellar.jobs.length >= state.cellar.level + 1) throw new GameError("Все полки погреба заняты");
    for (const [key, amount] of Object.entries(recipe.inputs)) removeItem(state, key, amount);
    const id = state.cellar.nextJobId++;
    state.cellar.jobs.push({ id, recipe: recipeKey, readyAt: now + Math.round(recipe.duration / bonusMult("speed", now)) });
    message = `${recipe.name}: производство начато`;
  } else if (type === "cellar-collect") {
    const id = integer(action, "id", 1, 1_000_000_000);
    const index = state.cellar.jobs.findIndex((job) => job.id === id);
    const job = state.cellar.jobs[index];
    if (!job) throw new GameError("Заготовка не найдена");
    if (job.readyAt > now) throw new GameError("Продукт ещё готовится");
    const recipe = RECIPES[job.recipe];
    const total = Math.max(1, Math.round(recipe.amount * bonusMult("yield", now)));
    addItem(state, recipe.output, total);
    state.cellar.jobs.splice(index, 1);
    state.stats.produced += total;
    levels = gainXp(state, recipe.xp);
    message = `Готово: ${recipe.name} ×${total}`;
  } else if (type === "mine") {
    const key = text(action, "mine") as keyof typeof MINES;
    const config = MINES[key];
    if (!config) throw new GameError("Шахта не найдена");
    needLevel(state, config.level);
    const mine = state.mines[key];
    if (now - mine.lastAt < 1500) throw new GameError("Переведите дух перед следующим ударом");
    needEnergy(state, config.energy, now);
    mine.lastAt = now;
    mine.depth += 1;
    const rich = mine.depth % 5 === 0;
    const loot = weightedLoot(config.loot, random());
    const amount = Math.max(1, Math.round((loot === "stone" || loot === "coal" ? 2 : 1) * (rich ? 2 : 1) * bonusMult("mine", now)));
    addItem(state, loot, amount);
    state.stats.mined += 1;
    levels = gainXp(state, config.xp + (rich ? 5 : 0));
    message = `${rich ? "Богатая жила! " : ""}${ITEMS[loot].name} ×${amount}`;
  } else if (type === "diamond-mine") {
    needLevel(state, 3);
    if (now - state.diamond.lastAt < 2500) throw new GameError("Свод ещё оседает, подождите пару секунд");
    removeItem(state, "pickaxe", 1);
    needEnergy(state, 10, now);
    state.diamond.lastAt = now;
    state.diamond.depth += 1;
    state.stats.mined += 1;
    const roll = random();
    if (roll < 0.08) {
      state.gems += 2;
      message = "Редкая друза: +2 алмаза";
    } else if (roll < 0.34) {
      state.gems += 1;
      message = "Алмаз найден: +1 алмаз";
    } else {
      addItem(state, "stone", 2);
      message = "Порода пустая, но получено: Камень ×2";
    }
    levels = gainXp(state, 18);
  } else if (type === "fish-start") {
    if (state.fishing && state.fishing.expiresAt > now) throw new GameError("Удочка уже заброшена");
    const wait = Math.max(0, state.lastCastAt + FISHING_COOLDOWN_MS - now);
    if (wait > 0) {
      const totalSeconds = Math.ceil(wait / 1000);
      throw new GameError(`Озеро отдыхает. Следующий заброс через ${Math.floor(totalSeconds / 60)} мин ${totalSeconds % 60} сек`);
    }
    needEnergy(state, 3, now);
    state.lastCastAt = now;
    const available = state.level >= 6
      ? ["carp", "crucian", "perch", "trout", "pike", "eel", "salmon"]
      : state.level >= 5
        ? ["carp", "crucian", "perch", "trout", "pike", "eel"]
        : state.level >= 4
          ? ["carp", "crucian", "perch", "trout", "pike"]
          : state.level >= 2
            ? ["carp", "crucian", "perch"]
            : ["carp", "crucian"];
    const species = random() < 0.03 && state.level >= 3 ? "golden_fish" : available[Math.floor(random() * available.length)];
    state.fishing = {
      startedAt: now,
      expiresAt: now + 12_000,
      target: 0.18 + random() * 0.64,
      width: Math.max(0.2, 0.34 - state.level * 0.01),
      period: 1400 + Math.floor(random() * 700),
      species,
    };
    message = "Клюёт! Подсекайте, когда бегунок будет в светлой зоне";
  } else if (type === "fish-catch") {
    const fishing = state.fishing;
    if (!fishing) throw new GameError("Сначала забросьте удочку");
    state.fishing = null;
    // Игрок видит бегунок с задержкой сети: засчитываем момент нажатия на его экране, но не старше 0,8 с.
    const pressedAt = typeof action.at === "number" && Number.isFinite(action.at) ? Math.min(now, Math.max(action.at, now - 800, fishing.startedAt)) : now;
    if (pressedAt > fishing.expiresAt) {
      message = "Рыба ушла: поплавок простоял слишком долго";
    } else {
      const distance = Math.abs(fishingCursor(fishing.startedAt, fishing.period, pressedAt) - fishing.target);
      if (distance <= fishing.width / 2) {
        const amount = distance <= fishing.width * 0.16 ? 2 : 1;
        addItem(state, fishing.species, amount);
        state.stats.fishCaught += amount;
        const xp = fishing.species === "golden_fish" ? 50 : 12 + amount * 4;
        levels = gainXp(state, xp);
        message = `${amount === 2 ? "Точная подсечка! " : "Поймано: "}${ITEMS[fishing.species].name} ×${amount}`;
      } else {
        message = "Сорвалась! Попробуйте подсечь ближе к центру зоны";
      }
    }
  } else if (type === "job-start") {
    const key = text(action, "job") as keyof typeof JOBS;
    const config = JOBS[key];
    if (!config) throw new GameError("Работа не найдена");
    if (state.job) throw new GameError(state.job.readyAt <= now ? "Сначала получите оплату за смену" : "Вы уже на смене");
    needLevel(state, config.level);
    needEnergy(state, config.energy, now);
    state.job = { key, startedAt: now, readyAt: now + Math.round(config.duration / bonusMult("speed", now)) };
    message = `${config.name}: смена началась`;
  } else if (type === "job-finish") {
    if (!state.job) throw new GameError("Вы не на смене");
    if (state.job.readyAt > now) throw new GameError("Смена ещё не закончилась");
    const config = JOBS[state.job.key as keyof typeof JOBS];
    if (!config) throw new GameError("Работа не найдена");
    const pay = Math.round(config.coins * bonusMult("reward", now));
    state.coins += pay;
    state.stats.earned += pay;
    state.job = null;
    levels = gainXp(state, config.xp);
    message = `Смена оплачена: +${pay} монет, +${Math.round(config.xp * bonusMult("xp", now))} опыта`;
  } else if (type === "shop-buy") {
    const key = text(action, "item");
    const quantity = integer(action, "quantity", 1, 99);
    if (!SHOP_KEYS.includes(key)) throw new GameError("Этот товар не продаётся в магазине");
    const cost = shopPrice(key, now) * quantity;
    if (state.coins < cost) throw new GameError(`Нужно ${cost} монет`);
    addItem(state, key, quantity);
    state.coins -= cost;
    message = `Куплено: ${ITEMS[key].name} ×${quantity}`;
  } else if (type === "npc-sell") {
    const key = text(action, "item");
    const quantity = integer(action, "quantity", 1, 9999);
    if (!ITEMS[key]) throw new GameError("Предмет не найден");
    removeItem(state, key, quantity);
    const price = Math.max(1, Math.round(marketPrice(key, new Date(now)) * (hasBlessing(state, "fortune", now) ? 1.15 : 1) * bonusMult("sell", now)));
    const total = price * quantity;
    state.coins += total;
    state.stats.earned += total;
    message = `Продано за ${total} монет (${price} за шт.)`;
  } else if (type === "use-item") {
    const key = text(action, "item");
    if (key !== "honey_cake") throw new GameError("Этот предмет нельзя использовать напрямую");
    if (state.energy >= state.maxEnergy) throw new GameError("Энергия уже полная");
    removeItem(state, key, 1);
    state.energy = Math.min(state.maxEnergy, state.energy + 12);
    message = "Медовик съеден: +12 энергии";
  } else if (type === "upgrade") {
    const kind = text(action, "kind");
    const current = kind === "barn" ? state.barnLevel : kind === "energy" ? state.energyLevel : kind === "garden" ? state.plots.length : kind === "pond" ? state.ponds.length : kind === "pen" ? state.pens.length : kind === "cage" ? state.cages.length : kind === "cellar" ? state.cellar.level : 0;
    const meta = UPGRADES[kind];
    if (!meta) throw new GameError("Неизвестное улучшение");
    if (current >= meta.max) throw new GameError("Достигнут максимальный уровень");
    const cost = upgradeCost(kind, current);
    if (state.coins < cost) throw new GameError(`Для улучшения нужно ${cost} монет`);
    state.coins -= cost;
    if (kind === "barn") state.barnLevel += 1;
    if (kind === "energy") { state.energyLevel += 1; state.maxEnergy += GLOBALS.energyUpgradeBonus; state.energy += GLOBALS.energyUpgradeBonus; }
    if (kind === "garden") state.plots.push(emptyPlot());
    if (kind === "pond") state.ponds.push(emptyWater());
    if (kind === "pen") state.pens.push({ animal: null, startedAt: 0, readyAt: 0 });
    if (kind === "cage") state.cages.push(emptyWater());
    if (kind === "cellar") state.cellar.level += 1;
    message = `Улучшение завершено за ${cost} монет`;
  } else if (type === "build-upgrade") {
    const kind = text(action, "kind");
    const level = (state.buildings as Record<string, number>)[kind];
    if (typeof level !== "number") throw new GameError("Неизвестная постройка");
    const price = constructionPrice(kind, level, overrides.buildings);
    if (!price) throw new GameError("Неизвестная постройка");
    if (level >= price.meta.max) throw new GameError("Постройка уже максимального уровня");
    if (state.coins < price.coins) throw new GameError(`Нужно ${price.coins} монет`);
    if ((state.inventory[price.ore] ?? 0) < price.oreAmount) throw new GameError(`Нужно ещё ${price.oreAmount - (state.inventory[price.ore] ?? 0)} ${ITEMS[price.ore]?.name ?? price.ore} из шахты`);
    removeItem(state, price.ore, price.oreAmount);
    state.coins -= price.coins;
    state.buildings[kind as "barn" | "garden" | "pond"] = level + 1;
    if (kind === "barn") state.barnLevel = level + 1;
    if (kind === "garden") {
      const target = plotsForGarden(level + 1);
      while (state.plots.length < target) state.plots.push(emptyPlot());
    }
    if (kind === "pond") {
      const target = pondsForLevel(level + 1);
      while (state.ponds.length < target) state.ponds.push(emptyWater());
    }
    levels = gainXp(state, 20 * (level + 1));
    message = `${price.meta.name}: уровень ${level + 1}. Потрачено ${price.coins} монет и ${price.oreAmount} ${ITEMS[price.ore]?.name ?? price.ore}`;
  } else if (type === "equipment-buy") {
    const kind = text(action, "kind");
    const level = (state.equipment as Record<string, number>)[kind];
    if (typeof level !== "number") throw new GameError("Неизвестная техника");
    const price = constructionPrice(kind, level + 1, overrides.equipment);
    if (!price) throw new GameError("Неизвестная техника");
    if (level >= price.meta.max) throw new GameError("Техника уже максимального уровня");
    if (state.coins < price.coins) throw new GameError(`Нужно ${price.coins} монет`);
    if ((state.inventory[price.ore] ?? 0) < price.oreAmount) throw new GameError(`Нужно ещё ${price.oreAmount - (state.inventory[price.ore] ?? 0)} ${ITEMS[price.ore]?.name ?? price.ore} из шахты`);
    removeItem(state, price.ore, price.oreAmount);
    state.coins -= price.coins;
    state.equipment[kind as "feeder" | "harvester" | "aerator"] = level + 1;
    levels = gainXp(state, 25 * (level + 1));
    message = `${price.meta.name}: уровень ${level + 1}. ${price.meta.effect}`;
  } else if (type === "harvest-all") {
    if (state.equipment.harvester < 1) throw new GameError("Сначала постройте комбайн");
    let collected = 0;
    let xp = 0;
    const parts: string[] = [];
    state.plots.forEach((plot) => {
      if (!plot.crop || plot.readyAt > now) return;
      const config = CROPS[plot.crop];
      const amount = Math.max(1, Math.round((config.yield + (hasBlessing(state, "harvest", now) ? 1 : 0)) * bonusMult("yield", now)));
      addItem(state, plot.crop, amount);
      collected += amount;
      xp += Math.round(config.xp * (1 + state.equipment.harvester * 0.1));
      parts.push(`${config.name} ×${amount}`);
      Object.assign(plot, { crop: null, plantedAt: 0, readyAt: 0, watered: false });
    });
    if (!parts.length) throw new GameError("Готового урожая нет");
    state.stats.harvested += parts.length;
    state.stats.collected += collected;
    levels = gainXp(state, xp);
    message = `Комбайн собрал: ${parts.slice(0, 4).join(", ")}${parts.length > 4 ? "…" : ""}, +${xp} опыта`;
  } else if (type === "order-fulfill") {
    const id = text(action, "id");
    const order = state.orders.items.find((entry) => entry.id === id);
    if (!order || state.orders.completed.includes(id)) throw new GameError("Заказ не найден или уже выполнен");
    removeItem(state, order.itemKey, order.quantity);
    state.orders.completed.push(id);
    const pay = Math.round(order.rewardCoins * bonusMult("reward", now));
    state.coins += pay;
    state.stats.earned += pay;
    state.stats.orders += 1;
    levels = gainXp(state, order.rewardXp);
    message = `Городской заказ выполнен: +${pay} монет`;
  } else if (type === "promo-claim") {
    const claim = `daily:${dayKey(new Date(now))}`;
    if (state.claimedPromos.includes(claim)) throw new GameError("Сегодняшний подарок уже получен");
    addItem(state, "feed", 2);
    state.claimedPromos.push(claim);
    state.claimedPromos = [...state.claimedPromos.filter((entry) => entry.startsWith("avatar:") || entry.startsWith("cover:") || entry.startsWith("animal:")), ...state.claimedPromos.filter((entry) => !entry.startsWith("avatar:") && !entry.startsWith("cover:") && !entry.startsWith("animal:")).slice(-20)];
    state.coins += 40;
    state.energy = Math.min(state.maxEnergy, state.energy + 8);
    message = "Ежедневный подарок: 40 монет, 2 корма и 8 энергии";
  } else if (type === "promo-buy") {
    const id = text(action, "id");
    const promo = PROMOTIONS.find((entry) => entry.id === id);
    if (!promo) throw new GameError("Набор не найден");
    const claim = `${dayKey(new Date(now))}:${id}`;
    if (state.claimedPromos.includes(claim)) throw new GameError("Этот набор сегодня уже куплен");
    if (state.gems < promo.gems) throw new GameError(`Нужно ${promo.gems} алмаза`);
    for (const [key, amount] of Object.entries(promo.items)) addItem(state, key, amount);
    state.gems -= promo.gems;
    state.coins += promo.coins;
    state.claimedPromos.push(claim);
    message = `Набор «${promo.name}» добавлен в амбар`;
  } else if (type === "elysium-ritual") {
    needLevel(state, 3);
    const blessing = text(action, "blessing");
    if (!BLESSINGS[blessing as keyof typeof BLESSINGS]) throw new GameError("Благословение не найдено");
    if (now - state.elysium.lastRitual < 120_000) throw new GameError("Ритуал восстанавливается 2 минуты");
    if (state.gems < 2) throw new GameError("Для ритуала нужно 2 алмаза");
    state.gems -= 2;
    state.elysium.blessing = blessing;
    state.elysium.until = now + 300_000;
    state.elysium.lastRitual = now;
    state.elysium.aether += 1;
    levels = gainXp(state, 10);
    message = `${BLESSINGS[blessing as keyof typeof BLESSINGS].name}: благословение активно, +1 эфир`;
  } else if (type === "elysium-ascend") {
    needLevel(state, 3);
    if (state.elysium.aether < 5) throw new GameError("Нужно 5 частиц эфира");
    state.elysium.aether -= 5;
    state.maxEnergy += 4;
    state.energy += 4;
    message = "Вознесение: постоянный запас энергии увеличен на 4";
  } else if (type === "achievement-claim") {
    const id = text(action, "id");
    const achievement = ACHIEVEMENTS.find((entry) => entry.id === id);
    if (!achievement || state.claimedAchievements.includes(id)) throw new GameError("Награда недоступна");
    if (state.stats[achievement.stat] < achievement.goal) throw new GameError("Условие достижения ещё не выполнено");
    state.coins += achievement.coins;
    state.gems += achievement.gems;
    state.claimedAchievements.push(id);
    message = `Достижение «${achievement.name}»: награда получена`;
  } else if (type === "news-read") {
    const id = text(action, "id");
    if (!NEWS.some((entry) => entry.id === id) && !/^n\d{1,9}$/.test(id)) throw new GameError("Новость не найдена");
    if (!state.readNews.includes(id)) state.readNews.push(id);
    message = "Новость прочитана";
  } else if (type === "animal-buy") {
    const key = text(action, "animal");
    const config = (ANIMALS as Record<string, { name: string; gems?: number }>)[key];
    const gems = config?.gems ?? 0;
    if (!config || gems <= 0) throw new GameError("Это животное нельзя купить за алмазы");
    const claim = `animal:${key}`;
    if (state.claimedPromos.includes(claim)) throw new GameError("Вы уже купили это животное");
    if (state.gems < gems) throw new GameError(`Нужно ${gems} алмазов`);
    state.gems -= gems;
    state.claimedPromos.push(claim);
    message = `${config.name}: куплены навсегда`;
  } else if (type === "shop-buy-gems") {
    const key = text(action, "item");
    const quantity = integer(action, "quantity", 1, 99);
    const gemPrice = ITEMS[key]?.gemPrice ?? 0;
    if (gemPrice <= 0) throw new GameError("Этот товар не продаётся за алмазы");
    const cost = gemPrice * quantity;
    if (state.gems < cost) throw new GameError(`Нужно ${cost} алмазов`);
    addItem(state, key, quantity);
    state.gems -= cost;
    message = `Куплено за алмазы: ${ITEMS[key].name} ×${quantity}`;
  } else if (type === "wheel-spin") {
    const today = dayKey(new Date(now));
    if (state.wheel.freeDay !== today) {
      state.wheel.freeDay = today;
    } else {
      if (state.wheel.paidDay !== today) { state.wheel.paidDay = today; state.wheel.paidToday = 0; }
      if (state.wheel.paidToday >= GLOBALS.wheelPaidDaily) throw new GameError("Лимит платных вращений на сегодня исчерпан");
      if (state.gems < GLOBALS.wheelSpinGems) throw new GameError(`Нужно ${GLOBALS.wheelSpinGems} алмаза для вращения`);
      state.gems -= GLOBALS.wheelSpinGems;
      state.wheel.paidToday += 1;
    }
    const total = WHEEL.reduce((sum, entry) => sum + entry.weight, 0);
    let cursor = random() * total;
    let index = WHEEL.length - 1;
    for (let i = 0; i < WHEEL.length; i += 1) { cursor -= WHEEL[i].weight; if (cursor <= 0) { index = i; break; } }
    const prize = WHEEL[index];
    let prizeText = "";
    if (prize.kind === "coins") { state.coins += prize.amount; prizeText = `+${prize.amount} монет`; }
    else if (prize.kind === "gems") { state.gems += prize.amount; prizeText = `+${prize.amount} алмазов`; }
    else if (prize.kind === "energy") { state.energy = Math.min(state.maxEnergy, state.energy + prize.amount); prizeText = `+${prize.amount} энергии`; }
    else if (inventoryVolume(state.inventory) + prize.amount > barnCapacity(state.barnLevel)) { state.coins += prize.amount * 20; prizeText = `амбар полон, вместо предмета +${prize.amount * 20} монет`; }
    else { addItem(state, prize.item as string, prize.amount); prizeText = `${ITEMS[prize.item as string].name} ×${prize.amount}`; }
    state.wheel.last = { index, at: now };
    message = `Колесо фортуны: ${prizeText}`;
  } else if (type === "pvz-start") {
    needEnergy(state, PVZ.energy, now);
    state.pvz.startedAt = now;
    message = "Зомби на подходе! Защитите ферму";
  } else if (type === "pvz-finish") {
    const started = state.pvz.startedAt;
    if (!started) throw new GameError("Сначала начните защиту фермы");
    if (now - started > 2 * 3_600_000) throw new GameError("Эта защита устарела. Начните новую");
    const waves = integer(action, "waves", 0, PVZ.waves);
    const win = action.win === true && waves >= PVZ.waves;
    if (now - started < waves * PVZ.minWaveMs) throw new GameError("Слишком быстро: зомби ещё не дошли до фермы");
    state.pvz.startedAt = 0;
    state.pvz.plays += 1;
    state.pvz.best = Math.max(state.pvz.best, waves);
    const coins = waves * PVZ.coinsPerWave + (win ? PVZ.winCoins : 0);
    state.coins += coins;
    const today = dayKey(new Date(now));
    let gemText = "";
    if (win && state.pvz.winDay !== today) { state.gems += PVZ.winGems; state.pvz.winDay = today; gemText = ` и ${PVZ.winGems} алмаза`; }
    levels = gainXp(state, waves * 5 + (win ? 40 : 0));
    message = win ? `Победа! Награда: ${coins} монет${gemText}` : `Отбито волн: ${waves}. Награда: ${coins} монет`;
  } else if (type === "season-premium") {
    if (state.season.premium) throw new GameError("Премиум-пропуск уже активирован");
    if (state.gems < PREMIUM_COST) throw new GameError(`Нужно ${PREMIUM_COST} алмазов`);
    state.gems -= PREMIUM_COST;
    state.season.premium = true;
    message = "Премиум-пропуск активирован: награды доступны за все пройденные уровни";
  } else if (type === "season-claim") {
    const track = action.track === "premium" ? "premium" : "free";
    const level = integer(action, "level", 1, SEASON_LEVELS);
    const reached = Math.min(SEASON_LEVELS, Math.floor(Math.max(0, lifetimeScore(state.stats) - state.season.base) / POINTS_PER_LEVEL));
    if (level > reached) throw new GameError("Этот уровень пропуска ещё не достигнут");
    if (track === "premium" && !state.season.premium) throw new GameError("Для этой награды нужен премиум-пропуск");
    const claimed = track === "premium" ? state.season.claimedPremium : state.season.claimedFree;
    if (claimed.includes(level)) throw new GameError("Награда уже получена");
    const reward = seasonReward(track, level);
    for (const [key, quantity] of Object.entries(reward.items ?? {})) addItem(state, key, quantity);
    state.coins += reward.coins ?? 0;
    state.gems += reward.gems ?? 0;
    if (reward.avatar && !state.claimedPromos.includes(`avatar:${reward.avatar}`)) state.claimedPromos.push(`avatar:${reward.avatar}`);
    claimed.push(level);
    message = `Награда пропуска за ${level} уровень получена`;
  } else {
    throw new GameError("Неизвестное игровое действие");
  }

  return { state, message: finishMessage(message, levels) };
}

export function weeklyPoints(state: GameState) {
  return Math.max(0, lifetimeScore(state.stats) - state.weekly.base);
}

export function seasonPoints(state: GameState) {
  return Math.max(0, lifetimeScore(state.stats) - state.season.base);
}

// Время в игре: учитывается, пока игрок активен. Паузы длиннее 90 секунд не считаются.
export const IDLE_LIMIT_MS = 90_000;
export function trackActivity(state: GameState, now = Date.now()) {
  const a = state.activity;
  if (a.lastPing && now > a.lastPing && now - a.lastPing <= IDLE_LIMIT_MS) a.playMs += now - a.lastPing;
  a.lastPing = now;
  const today = dayKey(new Date(now));
  if (a.lastDay !== today) {
    const yesterday = dayKey(new Date(now - 86_400_000));
    a.streak = a.lastDay === yesterday ? a.streak + 1 : 1;
    a.bestStreak = Math.max(a.bestStreak, a.streak);
    a.daysActive += 1;
    a.lastDay = today;
  }
}

export function totalXp(state: Pick<GameState, "level" | "xp">) {
  let sum = state.xp;
  for (let level = 1; level < state.level; level += 1) sum += xpNeeded(level);
  return sum;
}

export const RANKS: { level: number; title: string }[] = [
  { level: 1, title: "Новичок" }, { level: 3, title: "Садовник" }, { level: 5, title: "Фермер" },
  { level: 7, title: "Агроном" }, { level: 10, title: "Хозяин долины" }, { level: 15, title: "Легенда долины" },
];
export function rankInfo(level: number) {
  let current = RANKS[0];
  let next: (typeof RANKS)[number] | null = null;
  for (const rank of RANKS) {
    if (level >= rank.level) current = rank;
    else { next = rank; break; }
  }
  return { title: current.title, next };
}
