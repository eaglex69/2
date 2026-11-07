import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { addItem, GameError } from "@/lib/game-engine";
import { loadGame, saveGame } from "@/lib/game-store";
import { findLottery, lotterySnapshot, pickPrize, sanitizePrizes } from "@/lib/lotteries";
import { withUserLock } from "@/lib/mutex";
import { assertSameOrigin, readJson, strictNumber } from "@/lib/request-guard";
import { db } from "@/db";
import { lotteryEntries } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Нужно войти в игру" }, { status: 401 });
  return NextResponse.json(await lotterySnapshot(user.id));
}

async function handlePost(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Нужно войти в игру" }, { status: 401 });
  assertSameOrigin(request);
  const body = await readJson(request) as { id?: unknown };
  const id = strictNumber(body.id);
  if (id === null) return NextResponse.json({ error: "Лотерея не найдена" }, { status: 400 });
  const lottery = await findLottery(id);
  if (!lottery) return NextResponse.json({ error: "Лотерея не найдена или отключена" }, { status: 404 });
  const prizes = sanitizePrizes(lottery.prizes);
  if (!prizes.length) return NextResponse.json({ error: "В лотерее нет призов" }, { status: 400 });

  const now = Date.now();
  const state = await loadGame(user.id, now);
  if (lottery.priceCoins > 0 && state.coins < lottery.priceCoins) throw new GameError(`Билет стоит ${lottery.priceCoins} монет`);
  if (lottery.priceGems > 0 && state.gems < lottery.priceGems) throw new GameError(`Билет стоит ${lottery.priceGems} алмазов`);
  state.coins -= lottery.priceCoins;
  state.gems -= lottery.priceGems;

  const prize = pickPrize(prizes);
  if (prize.kind === "coins") state.coins += prize.amount;
  else if (prize.kind === "gems") state.gems += prize.amount;
  else if (prize.kind === "energy") state.energy = Math.min(state.maxEnergy + 20, state.energy + prize.amount);
  else if (prize.kind === "item" && prize.item) addItem(state, prize.item, prize.amount);
  await saveGame(user.id, state);
  await db.insert(lotteryEntries).values({
    lotteryId: lottery.id,
    userId: user.id,
    prizeKey: prize.key,
    prizeLabel: prize.label,
    prizeKind: prize.kind,
    prizeAmount: prize.amount,
  });
  return NextResponse.json({
    ok: true,
    prize,
    message: prize.kind === "empty" ? "В этот раз без приза — попробуйте ещё" : `Выигрыш: ${prize.label}`,
    state,
    lottery: await lotterySnapshot(user.id),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Нужно войти в игру" }, { status: 401 });
  try {
    return await withUserLock(user.id, () => handlePost(request));
  } catch (error) {
    if (error instanceof GameError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("lottery failed", error);
    return NextResponse.json({ error: "Лотерея временно недоступна" }, { status: 500 });
  }
}
