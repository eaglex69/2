import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { lotteryEntries, lotteries, users } from "@/db/schema";
import { DEFAULT_LOTTERIES, ITEMS, type LotteryPrize } from "./game-config";

export type LotteryRow = typeof lotteries.$inferSelect;

function sanitizePrizes(raw: unknown): LotteryPrize[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    const value = entry as Partial<LotteryPrize>;
    const kind = ["coins", "gems", "item", "energy", "empty"].includes(String(value.kind)) ? value.kind as LotteryPrize["kind"] : "empty";
    const weight = Math.max(1, Math.min(1000, Math.round(Number(value.weight) || 1)));
    const amount = Math.max(0, Math.min(100000, Math.round(Number(value.amount) || 0)));
    const key = String(value.key ?? `${kind}-${amount}`).slice(0, 48);
    const label = String(value.label ?? "Приз").slice(0, 120);
    const item = typeof value.item === "string" ? value.item.slice(0, 40) : undefined;
    if (kind === "item" && (!item || !ITEMS[item])) return [];
    return [{ key, label, kind, amount, item, weight }];
  });
}

/** Гарантирует наличие нескольких лотерей из стандартного набора. */
export async function ensureLotteries() {
  const rows = await db.select({ id: lotteries.id }).from(lotteries).limit(1);
  if (rows.length) return;
  for (const seed of DEFAULT_LOTTERIES) {
    await db.insert(lotteries).values({
      key: seed.key,
      name: seed.name,
      description: seed.description,
      priceCoins: seed.priceCoins,
      priceGems: seed.priceGems,
      prizes: seed.prizes,
      active: true,
    }).onConflictDoNothing();
  }
}

export function odds(prizes: LotteryPrize[]) {
  const total = prizes.reduce((sum, prize) => sum + prize.weight, 0) || 1;
  return prizes.map((prize) => ({ ...prize, chance: Math.round((prize.weight / total) * 1000) / 10 }));
}

export function pickPrize(prizes: LotteryPrize[], random: () => number = Math.random): LotteryPrize {
  const total = prizes.reduce((sum, prize) => sum + prize.weight, 0);
  let roll = random() * total;
  for (const prize of prizes) {
    roll -= prize.weight;
    if (roll <= 0) return prize;
  }
  return prizes[prizes.length - 1];
}

export async function activeLotteries() {
  await ensureLotteries();
  const rows = await db.select().from(lotteries).orderBy(lotteries.id);
  return rows.map((row) => ({
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description,
    priceCoins: row.priceCoins,
    priceGems: row.priceGems,
    active: row.active,
    prizes: odds(sanitizePrizes(row.prizes)),
  }));
}

export async function lotterySnapshot(userId: number) {
  const list = await activeLotteries();
  const winners = await db.select({
    id: lotteryEntries.id,
    lotteryId: lotteryEntries.lotteryId,
    prizeLabel: lotteryEntries.prizeLabel,
    prizeKind: lotteryEntries.prizeKind,
    name: users.displayName,
    createdAt: lotteryEntries.createdAt,
  }).from(lotteryEntries).innerJoin(users, eq(users.id, lotteryEntries.userId))
    .orderBy(desc(lotteryEntries.id)).limit(25);
  const mine = await db.select().from(lotteryEntries)
    .where(eq(lotteryEntries.userId, userId)).orderBy(desc(lotteryEntries.id)).limit(15);
  return {
    lotteries: list.filter((lottery) => lottery.active),
    winners,
    mine: mine.map((row) => ({ id: row.id, lotteryId: row.lotteryId, prizeLabel: row.prizeLabel, prizeKind: row.prizeKind, prizeAmount: row.prizeAmount, createdAt: row.createdAt })),
  };
}

export async function findLottery(id: number) {
  const [row] = await db.select().from(lotteries).where(and(eq(lotteries.id, id), eq(lotteries.active, true))).limit(1);
  return row ?? null;
}

export { sanitizePrizes };
