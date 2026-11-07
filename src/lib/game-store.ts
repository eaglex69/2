import { eq } from "drizzle-orm";
import { db } from "@/db";
import { farmStates, weeklyScores } from "@/db/schema";
import { ensureContent } from "./content-server";
import { initialGameState, prepareGameState, weeklyPoints, type GameState } from "./game-engine";

export async function loadGame(userId: number, now = Date.now()): Promise<GameState> {
  await ensureContent();
  let [row] = await db.select({ data: farmStates.data }).from(farmStates).where(eq(farmStates.userId, userId)).limit(1);
  if (!row) {
    await db.insert(farmStates).values({ userId, data: initialGameState(now) }).onConflictDoNothing();
    [row] = await db.select({ data: farmStates.data }).from(farmStates).where(eq(farmStates.userId, userId)).limit(1);
  }
  return prepareGameState(row?.data, userId, now);
}

export type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function saveGameTx(tx: DbTx, userId: number, state: GameState) {
  await tx.insert(farmStates).values({ userId, data: state }).onConflictDoUpdate({
    target: farmStates.userId,
    set: { data: state, updatedAt: new Date() },
  });
  // Очки недели для рейтинга сохраняются отдельно, чтобы прошлые недели не терялись.
  await tx.insert(weeklyScores).values({ week: state.weekly.week, userId, points: weeklyPoints(state) }).onConflictDoUpdate({
    target: [weeklyScores.week, weeklyScores.userId],
    set: { points: weeklyPoints(state) },
  });
}

export async function saveGame(userId: number, state: GameState) {
  await db.transaction((tx) => saveGameTx(tx, userId, state));
}
