import { db } from "@/db";
import { gameSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { BUILDINGS, EQUIPMENT, type CostOverride, type CostOverrides } from "./game-config";

export type EconomyPrices = { buildings: CostOverrides; equipment: CostOverrides };
const KEYS = { buildings: "build_prices", equipment: "equipment_prices" } as const;

async function readKey(key: string): Promise<CostOverrides> {
  const [row] = await db.select().from(gameSettings).where(eq(gameSettings.key, key)).limit(1);
  if (!row?.value) return {};
  try {
    const parsed = JSON.parse(row.value) as Record<string, CostOverride>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export async function getEconomy(): Promise<EconomyPrices> {
  const [buildings, equipment] = await Promise.all([readKey(KEYS.buildings), readKey(KEYS.equipment)]);
  return { buildings, equipment };
}

export async function saveEconomy(kind: "buildings" | "equipment", value: CostOverrides) {
  const clean: CostOverrides = {};
  const source: Record<string, CostOverride> = kind === "buildings" ? BUILDINGS : EQUIPMENT;
  for (const [name, patch] of Object.entries(value ?? {})) {
    if (!(name in source) || !patch || typeof patch !== "object") continue;
    const next: CostOverride = {};
    for (const field of ["max", "coinBase", "coinMult", "oreBase", "oreMult"] as const) {
      const raw = Number((patch as Record<string, unknown>)[field]);
      if (Number.isFinite(raw) && raw > 0) next[field] = raw;
    }
    if (typeof (patch as CostOverride).ore === "string") next.ore = String((patch as CostOverride).ore).slice(0, 24);
    clean[name] = next;
  }
  await db.insert(gameSettings).values({ key: KEYS[kind], value: JSON.stringify(clean) })
    .onConflictDoUpdate({ target: gameSettings.key, set: { value: JSON.stringify(clean) } });
  return clean;
}
