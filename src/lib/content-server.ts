import { eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { bonuses, gameItems, gameSettings } from "@/db/schema";
import { EMPTY_BALANCE, rebuildConfig, sanitizeBalance, type Balance, type CustomItemRow } from "./content";
import { setBonuses, type Bonus, type BonusKind } from "./bonus";

type Snapshot = { content: CustomItemRow[]; balance: Balance; bonuses: Bonus[] };

let loadedAt = 0;
let inflight: Promise<void> | null = null;
let snapshot: Snapshot = { content: [], balance: EMPTY_BALANCE, bonuses: [] };

async function load() {
  const [rows, balanceRows, bonusRows] = await Promise.all([
    db.select().from(gameItems),
    db.select().from(gameSettings).where(eq(gameSettings.key, "balance")).limit(1),
    db.select().from(bonuses).where(gt(bonuses.endsAt, new Date())),
  ]);
  let balance: Balance = EMPTY_BALANCE;
  try { if (balanceRows[0]) balance = sanitizeBalance(JSON.parse(balanceRows[0].value)); } catch { /* баланс по умолчанию */ }
  const content: CustomItemRow[] = rows.map((row) => ({ key: row.key, kind: row.kind, data: row.data as Record<string, unknown>, enabled: row.enabled }));
  rebuildConfig(content, balance);
  const list: Bonus[] = bonusRows.map((b) => ({ id: b.id, title: b.title, kind: b.kind as BonusKind, multiplier: b.multiplier, startsAt: b.startsAt.getTime(), endsAt: b.endsAt.getTime(), active: b.active }));
  setBonuses(list);
  snapshot = { content, balance, bonuses: list };
  loadedAt = Date.now();
}

// Контент, баланс и бонусы кешируются на 5 секунд; admin вызывает с force после правок.
export function ensureContent(force = false): Promise<void> {
  if (!force && Date.now() - loadedAt < 5000) return Promise.resolve();
  if (inflight && !force) return inflight;
  inflight = load().finally(() => { inflight = null; });
  return inflight;
}

export function contentSnapshot() {
  return snapshot;
}

export async function customContentPayload() {
  await ensureContent();
  return snapshot.content;
}
