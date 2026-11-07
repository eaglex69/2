import {
  ANIMALS, CAGE_SPECIES, CROPS, GLOBALS, ITEMS, JOBS, MINES, POND_SPECIES, RECIPES, SHOP_KEYS, UPGRADES,
} from "./game-config";
import { WORKER_TYPES } from "./workers-config";

// Весь игровой контент и баланс собираются здесь: встроенный конфиг + контент админов
// (таблица game_items) + правки баланса (game_settings.balance). Модуль безопасен для клиента.
export type CustomItemRow = { key: string; kind: string; data: Record<string, unknown>; enabled: boolean };
export type Balance = {
  upgrades: Record<string, Record<string, number>>;
  globals: Record<string, number>;
  overrides: Record<string, Record<string, number>>;
};
export const EMPTY_BALANCE: Balance = { upgrades: {}, globals: {}, overrides: {} };

type Rec = Record<string, Record<string, unknown>>;
type Src = { items: Rec; crops: Rec; ponds: Rec; cages: Rec; animals: Rec; recipes: Rec; jobs: Rec; mines: Rec; workers: Rec };

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function makePristine() {
  return {
    items: clone(ITEMS), crops: clone(CROPS), ponds: clone(POND_SPECIES), cages: clone(CAGE_SPECIES), animals: clone(ANIMALS),
    recipes: clone(RECIPES), jobs: clone(JOBS), mines: clone(MINES), shop: [...SHOP_KEYS],
    upgrades: clone(UPGRADES), globals: { ...GLOBALS }, workers: clone(WORKER_TYPES),
  };
}
// Исходное состояние запоминается один раз, чтобы удаление/выключение правок возвращало стандартные значения.
const stash = globalThis as typeof globalThis & { __valleyPristine?: ReturnType<typeof makePristine> };
const PRISTINE = stash.__valleyPristine ?? (stash.__valleyPristine = makePristine());

export const FIELDS: Record<string, { k: string; label: string; step?: number }[]> = {
  crop: [{ k: "duration", label: "Время, сек" }, { k: "yield", label: "Урожай" }, { k: "xp", label: "Опыт" }, { k: "level", label: "Уровень" }, { k: "price", label: "Цена" }, { k: "seedPrice", label: "Цена семян" }, { k: "seedGems", label: "Семена за алмазы (0 — за монеты)" }],
  pond: [{ k: "duration", label: "Время, сек" }, { k: "yield", label: "Улов" }, { k: "xp", label: "Опыт" }, { k: "level", label: "Уровень" }, { k: "price", label: "Цена рыбы" }, { k: "fryPrice", label: "Цена малька" }, { k: "fryGems", label: "Малёк за алмазы (0 — за монеты)" }],
  cage: [{ k: "duration", label: "Время, сек" }, { k: "yield", label: "Улов" }, { k: "xp", label: "Опыт" }, { k: "level", label: "Уровень" }, { k: "price", label: "Цена рыбы" }, { k: "fryPrice", label: "Цена малька" }, { k: "fryGems", label: "Малёк за алмазы (0 — за монеты)" }],
  animal: [{ k: "duration", label: "Время, сек" }, { k: "yield", label: "Продукта" }, { k: "xp", label: "Опыт" }, { k: "level", label: "Уровень" }, { k: "feed", label: "Корм" }, { k: "price", label: "Цена продукта" }, { k: "gems", label: "Покупка за алмазы (0 — свободно)" }],
  recipe: [{ k: "duration", label: "Время, сек" }, { k: "amount", label: "Выход" }, { k: "xp", label: "Опыт" }, { k: "level", label: "Уровень" }, { k: "price", label: "Цена продукта" }],
  job: [{ k: "duration", label: "Время, сек" }, { k: "energy", label: "Энергия" }, { k: "coins", label: "Монеты" }, { k: "xp", label: "Опыт" }, { k: "level", label: "Уровень" }],
  mine: [{ k: "energy", label: "Энергия" }, { k: "level", label: "Уровень" }, { k: "xp", label: "Опыт" }],
  item: [{ k: "price", label: "Цена" }, { k: "gemPrice", label: "Цена в алмазах (0 — нет)" }],
  worker: [{ k: "price", label: "Цена за 8 ч" }],
};

export const KIND_TITLES: Record<string, string> = {
  crop: "Растения", pond: "Рыба прудов", cage: "Рыба садков", animal: "Животные", recipe: "Рецепты погреба",
  job: "Работа", mine: "Шахты", item: "Прочие предметы", worker: "Работники",
};

const LIMITS: Record<string, [number, number]> = {
  duration: [1, 8_640_000], yield: [1, 1000], xp: [0, 1_000_000], level: [1, 100], price: [1, 10_000_000],
  seedPrice: [1, 10_000_000], fryPrice: [1, 10_000_000], seedGems: [0, 100_000], fryGems: [0, 100_000], gems: [0, 100_000], gemPrice: [0, 100_000], feed: [1, 100], amount: [1, 1000], energy: [0, 1000], coins: [0, 10_000_000],
};
const UPGRADE_LIMITS: Record<string, [number, number]> = { max: [1, 100], baseCost: [1, 100_000_000], mult: [1, 5] };
const GLOBAL_LIMITS: Record<string, [number, number]> = { barnBase: [10, 100_000], barnPerLevel: [1, 10_000], energyRegenSec: [1, 3600], energyUpgradeBonus: [1, 1000], maxLevel: [1, 1000], wheelSpinGems: [1, 1000], wheelPaidDaily: [0, 100] };

function clamp(value: unknown, [low, high]: [number, number], decimals = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const factor = 10 ** decimals;
  return Math.min(high, Math.max(low, Math.round(n * factor) / factor));
}

export function sanitizeBalance(raw: unknown): Balance {
  const source = (raw && typeof raw === "object" ? raw : {}) as Partial<Balance>;
  const out: Balance = { upgrades: {}, globals: {}, overrides: {} };
  let count = 0;
  for (const [id, values] of Object.entries(source.overrides ?? {})) {
    const [kind, key] = id.split(":");
    if (!FIELDS[kind] || !key || !/^[a-z0-9_]+$/.test(key) || count > 700 || !values || typeof values !== "object") continue;
    const allowed = FIELDS[kind].map((field) => field.k);
    const clean: Record<string, number> = {};
    for (const [field, value] of Object.entries(values)) {
      const v = allowed.includes(field) ? clamp(value, LIMITS[field] ?? [0, 1e9]) : null;
      if (v !== null) clean[field] = v;
    }
    if (Object.keys(clean).length) { out.overrides[id] = clean; count += 1; }
  }
  for (const [kind, values] of Object.entries(source.upgrades ?? {})) {
    if (!UPGRADES[kind] || !values || typeof values !== "object") continue;
    const clean: Record<string, number> = {};
    for (const [field, value] of Object.entries(values)) {
      if (!(field in UPGRADE_LIMITS)) continue;
      const v = clamp(value, UPGRADE_LIMITS[field], field === "mult" ? 2 : 0);
      if (v !== null) clean[field] = v;
    }
    if (Object.keys(clean).length) out.upgrades[kind] = clean;
  }
  for (const [field, value] of Object.entries(source.globals ?? {})) {
    if (!(field in GLOBAL_LIMITS)) continue;
    const v = clamp(value, GLOBAL_LIMITS[field]);
    if (v !== null) out.globals[field] = v;
  }
  return out;
}

const live = (): Src => ({ items: ITEMS as unknown as Rec, crops: CROPS as unknown as Rec, ponds: POND_SPECIES as unknown as Rec, cages: CAGE_SPECIES as unknown as Rec, animals: ANIMALS as unknown as Rec, recipes: RECIPES as unknown as Rec, jobs: JOBS as unknown as Rec, mines: MINES as unknown as Rec, workers: WORKER_TYPES as unknown as Rec });
const pristineSrc = (): Src => ({ items: PRISTINE.items as unknown as Rec, crops: PRISTINE.crops as unknown as Rec, ponds: PRISTINE.ponds as unknown as Rec, cages: PRISTINE.cages as unknown as Rec, animals: PRISTINE.animals as unknown as Rec, recipes: PRISTINE.recipes as unknown as Rec, jobs: PRISTINE.jobs as unknown as Rec, mines: PRISTINE.mines as unknown as Rec, workers: PRISTINE.workers as unknown as Rec });

function readFrom(src: Src, kind: string, key: string): Record<string, number> | null {
  const n = (value: unknown) => Number(value ?? 0);
  const price = (itemKey: unknown) => n(src.items[String(itemKey)]?.basePrice);
  const sec = (value: unknown) => Math.round(n(value) / 1000);
  if (kind === "crop") { const c = src.crops[key]; return c ? { duration: sec(c.duration), yield: n(c.yield), xp: n(c.xp), level: n(c.level), price: price(key), seedPrice: price(c.seed), seedGems: n(src.items[String(c.seed)]?.gemPrice) } : null; }
  if (kind === "pond" || kind === "cage") { const c = (kind === "pond" ? src.ponds : src.cages)[key]; return c ? { duration: sec(c.duration), yield: n(c.yield), xp: n(c.xp), level: n(c.level), price: price(key), fryPrice: price(c.fry), fryGems: n(src.items[String(c.fry)]?.gemPrice) } : null; }
  if (kind === "animal") { const c = src.animals[key]; return c ? { duration: sec(c.duration), yield: n(c.yield), xp: n(c.xp), level: n(c.level), feed: n(c.feed), price: price(c.product), gems: n(c.gems) } : null; }
  if (kind === "recipe") { const c = src.recipes[key]; return c ? { duration: sec(c.duration), amount: n(c.amount), xp: n(c.xp), level: n(c.level), price: price(c.output) } : null; }
  if (kind === "job") { const c = src.jobs[key]; return c ? { duration: sec(c.duration), energy: n(c.energy), coins: n(c.coins), xp: n(c.xp), level: n(c.level) } : null; }
  if (kind === "mine") { const c = src.mines[key]; return c ? { energy: n(c.energy), level: n(c.level), xp: n(c.xp) } : null; }
  if (kind === "item") return src.items[key] ? { price: price(key), gemPrice: n(src.items[key].gemPrice) } : null;
  if (kind === "worker") return src.workers[key] ? { price: n(src.workers[key].price) } : null;
  return null;
}

export const readValues = (kind: string, key: string) => readFrom(live(), kind, key);
export const readBase = (kind: string, key: string) => readFrom(pristineSrc(), kind, key);

export function entityName(kind: string, key: string) {
  const src = live();
  const table = kind === "crop" ? src.crops : kind === "pond" ? src.ponds : kind === "cage" ? src.cages : kind === "animal" ? src.animals : kind === "recipe" ? src.recipes : kind === "job" ? src.jobs : kind === "mine" ? src.mines : kind === "worker" ? src.workers : src.items;
  return String(table[key]?.name ?? key);
}

export function baseKeys(kind: string): string[] {
  const p = pristineSrc();
  if (kind === "crop") return Object.keys(p.crops);
  if (kind === "pond") return Object.keys(p.ponds);
  if (kind === "cage") return Object.keys(p.cages);
  if (kind === "animal") return Object.keys(p.animals);
  if (kind === "recipe") return Object.keys(p.recipes);
  if (kind === "job") return Object.keys(p.jobs);
  if (kind === "mine") return Object.keys(p.mines);
  if (kind === "worker") return Object.keys(p.workers);
  const covered = new Set<string>();
  for (const [key, c] of Object.entries(p.crops)) { covered.add(key); covered.add(String(c.seed)); }
  for (const [key, c] of Object.entries(p.ponds)) { covered.add(key); covered.add(String(c.fry)); }
  for (const [key, c] of Object.entries(p.cages)) { covered.add(key); covered.add(String(c.fry)); }
  for (const c of Object.values(p.animals)) covered.add(String(c.product));
  for (const c of Object.values(p.recipes)) covered.add(String(c.output));
  return Object.keys(p.items).filter((key) => !covered.has(key));
}

export const readUpgrades = (): Record<string, Record<string, number>> => Object.fromEntries(Object.entries(UPGRADES).map(([key, u]) => [key, { max: u.max, baseCost: u.baseCost, mult: u.mult }]));
export const baseUpgrades = (): Record<string, Record<string, number>> => Object.fromEntries(Object.entries(PRISTINE.upgrades).map(([key, u]) => [key, { max: u.max, baseCost: u.baseCost, mult: u.mult }]));
export const readGlobals = (): Record<string, number> => ({ ...GLOBALS });
export const baseGlobals = (): Record<string, number> => ({ ...PRISTINE.globals });

function resetObject(target: object, source: object) {
  const t = target as Record<string, unknown>;
  for (const key of Object.keys(t)) delete t[key];
  Object.assign(t, clone(source));
}

// Контент, добавленный админами.
export function mergeContent(rows: CustomItemRow[]) {
  for (const row of rows) {
    if (!row.enabled) continue;
    const d = row.data as Record<string, string | number>;
    const key = row.key;
    const icon = d.icon ? String(d.icon) : undefined;
    if (row.kind === "crop") {
      ITEMS[key] = { key, name: String(d.name), category: "crop", basePrice: Number(d.price), description: String(d.description ?? "Урожай с грядки"), icon };
      const seed = `${key}_seed`;
      const seedGems = Number(d.gemPrice ?? 0);
      ITEMS[seed] = { key: seed, name: `Семена: ${String(d.name)}`, shortName: `Семена: ${String(d.name)}`, category: "supply", basePrice: Number(d.seedPrice ?? Math.round(Number(d.price) * 1.4)), description: seedGems > 0 ? "Продаются только за алмазы" : "Для посадки на грядке", icon, ...(seedGems > 0 ? { gemPrice: seedGems } : {}) };
      CROPS[key] = { name: String(d.name), seed, duration: Number(d.duration) * 1000, yield: Number(d.yield), xp: Number(d.xp), level: Number(d.level), color: "#7fb85a" };
      if (seedGems <= 0 && !SHOP_KEYS.includes(seed)) SHOP_KEYS.push(seed);
    } else if (row.kind === "pond" || row.kind === "cage") {
      ITEMS[key] = { key, name: String(d.name), category: "fish", basePrice: Number(d.price), description: String(d.description ?? "Рыба из водоёма"), icon };
      const fry = `${key}_fry`;
      const fryGems = Number(d.gemPrice ?? 0);
      ITEMS[fry] = { key: fry, name: `Малёк: ${String(d.name)}`, category: "supply", basePrice: Number(d.fryPrice ?? d.price), description: fryGems > 0 ? "Продаётся только за алмазы" : "Запускается в водоём", icon: "fish", ...(fryGems > 0 ? { gemPrice: fryGems } : {}) };
      const config = { name: String(d.name), fry, duration: Number(d.duration) * 1000, yield: Number(d.yield), xp: Number(d.xp), level: Number(d.level) };
      if (row.kind === "pond") (POND_SPECIES as Record<string, unknown>)[key] = config;
      else (CAGE_SPECIES as Record<string, unknown>)[key] = config;
      if (fryGems <= 0 && !SHOP_KEYS.includes(fry)) SHOP_KEYS.push(fry);
    } else if (row.kind === "animal") {
      const product = String(d.product ?? key);
      ITEMS[product] = { key: product, name: String(d.productName ?? d.name), category: "animal", basePrice: Number(d.price), description: String(d.description ?? "Продукт с фермы"), icon };
      (ANIMALS as Record<string, unknown>)[key] = { name: String(d.name), product, feed: Number(d.feed ?? 2), duration: Number(d.duration) * 1000, yield: Number(d.yield), xp: Number(d.xp), level: Number(d.level), ...(Number(d.gems ?? 0) > 0 ? { gems: Number(d.gems) } : {}) };
    } else if (row.kind === "recipe") {
      const output = String(d.output ?? key);
      ITEMS[output] = { key: output, name: String(d.name), category: "processed", basePrice: Number(d.price), description: String(d.description ?? "Домашняя заготовка"), icon };
      const inputs: Record<string, number> = {};
      if (d.input1 && ITEMS[String(d.input1)]) inputs[String(d.input1)] = Number(d.amount1 ?? 1);
      if (d.input2 && ITEMS[String(d.input2)]) inputs[String(d.input2)] = Number(d.amount2 ?? 1);
      RECIPES[key] = { name: String(d.name), inputs, output, amount: Number(d.yield ?? 1), duration: Number(d.duration) * 1000, xp: Number(d.xp), level: Number(d.level) };
    } else {
      const category = (["crop", "animal", "fish", "mineral", "processed", "supply"].includes(String(d.category)) ? String(d.category) : "mineral") as "mineral";
      ITEMS[key] = { key, name: String(d.name), category, basePrice: Number(d.price), description: String(d.description ?? "Предмет"), icon, ...(Number(d.gemPrice ?? 0) > 0 ? { gemPrice: Number(d.gemPrice) } : {}) };
    }
  }
}

function applyOverride(kind: string, key: string, v: Record<string, number>) {
  const setPrice = (itemKey: unknown, value: number | undefined) => {
    const item = ITEMS[String(itemKey)];
    if (item && value !== undefined) item.basePrice = value;
  };
  const assign = (target: Record<string, unknown> | undefined, map: [string, string, number?][]) => {
    if (!target) return;
    for (const [field, targetField, scale] of map) if (v[field] !== undefined) target[targetField] = v[field] * (scale ?? 1);
  };
  const setGems = (itemKey: unknown, value: number | undefined) => {
    const item = ITEMS[String(itemKey)];
    if (!item || value === undefined) return;
    if (value > 0) item.gemPrice = value; else delete item.gemPrice;
  };
  if (kind === "crop") {
    const c = CROPS[key] as unknown as Record<string, unknown> | undefined;
    assign(c, [["duration", "duration", 1000], ["yield", "yield"], ["xp", "xp"], ["level", "level"]]);
    if (c) { setPrice(key, v.price); setPrice(c.seed, v.seedPrice); setGems(c.seed, v.seedGems); }
  } else if (kind === "pond" || kind === "cage") {
    const c = (kind === "pond" ? POND_SPECIES : CAGE_SPECIES) as unknown as Record<string, Record<string, unknown>>;
    assign(c[key], [["duration", "duration", 1000], ["yield", "yield"], ["xp", "xp"], ["level", "level"]]);
    if (c[key]) { setPrice(key, v.price); setPrice(c[key].fry, v.fryPrice); setGems(c[key].fry, v.fryGems); }
  } else if (kind === "animal") {
    const c = (ANIMALS as unknown as Record<string, Record<string, unknown>>)[key];
    assign(c, [["duration", "duration", 1000], ["yield", "yield"], ["xp", "xp"], ["level", "level"], ["feed", "feed"], ["gems", "gems"]]);
    if (c) setPrice(c.product, v.price);
  } else if (kind === "recipe") {
    const c = RECIPES[key] as unknown as Record<string, unknown> | undefined;
    assign(c, [["duration", "duration", 1000], ["amount", "amount"], ["xp", "xp"], ["level", "level"]]);
    if (c) setPrice(c.output, v.price);
  } else if (kind === "job") {
    assign((JOBS as unknown as Record<string, Record<string, unknown>>)[key], [["duration", "duration", 1000], ["energy", "energy"], ["coins", "coins"], ["xp", "xp"], ["level", "level"]]);
  } else if (kind === "mine") {
    assign((MINES as unknown as Record<string, Record<string, unknown>>)[key], [["energy", "energy"], ["level", "level"], ["xp", "xp"]]);
  } else if (kind === "item") {
    setPrice(key, v.price);
    setGems(key, v.gemPrice);
  } else if (kind === "worker") {
    if (WORKER_TYPES[key as keyof typeof WORKER_TYPES] && v.price !== undefined) WORKER_TYPES[key as keyof typeof WORKER_TYPES].price = v.price;
  }
}

// Полная пересборка конфигурации: сброс к исходному + контент админов + правки баланса.
export function rebuildConfig(rows: CustomItemRow[], balanceRaw: unknown) {
  resetObject(ITEMS, PRISTINE.items);
  resetObject(CROPS, PRISTINE.crops);
  resetObject(POND_SPECIES, PRISTINE.ponds);
  resetObject(CAGE_SPECIES, PRISTINE.cages);
  resetObject(ANIMALS, PRISTINE.animals);
  resetObject(RECIPES, PRISTINE.recipes);
  resetObject(JOBS, PRISTINE.jobs);
  resetObject(MINES, PRISTINE.mines);
  resetObject(UPGRADES, PRISTINE.upgrades);
  resetObject(GLOBALS, PRISTINE.globals);
  resetObject(WORKER_TYPES, PRISTINE.workers);
  SHOP_KEYS.length = 0;
  SHOP_KEYS.push(...PRISTINE.shop);

  mergeContent(rows);

  const balance = sanitizeBalance(balanceRaw);
  for (const [id, values] of Object.entries(balance.overrides)) {
    const [kind, key] = id.split(":");
    applyOverride(kind, key, values);
  }
  for (const [kind, values] of Object.entries(balance.upgrades)) if (UPGRADES[kind]) Object.assign(UPGRADES[kind], values);
  Object.assign(GLOBALS, balance.globals);
}
