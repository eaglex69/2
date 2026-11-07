import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { workers } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { GameError } from "@/lib/game-engine";
import { withUserLock } from "@/lib/mutex";
import { assertSameOrigin, readJson } from "@/lib/request-guard";
import { loadGame, saveGame } from "@/lib/game-store";
import { settleWorkers } from "@/lib/workers";
import { WORKER_TYPES, WORKER_HOURS, workerPrice, type WorkerKind } from "@/lib/workers-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Нужно войти" }, { status: 401 });
  if (user.bannedAt) return NextResponse.json({ error: "Аккаунт заблокирован" }, { status: 403 });
  const state = await loadGame(user.id);
  await settleWorkers(state, user.id);
  await saveGame(user.id, state);
  const list = await db.select().from(workers).where(eq(workers.userId, user.id));
  return NextResponse.json({ workers: list, state, types: WORKER_TYPES, hours: WORKER_HOURS });
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
  } catch (error) {
    if (error instanceof GameError) return NextResponse.json({ error: error.message }, { status: 400 });
    throw error;
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Нужно войти" }, { status: 401 });
  if (user.bannedAt) return NextResponse.json({ error: "Аккаунт заблокирован" }, { status: 403 });
  return withUserLock(user.id, () => handlePOST(request));
}

async function handlePOST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Нужно войти" }, { status: 401 });
  try {
    const a = (await readJson(request)) as { type?: string; kind?: string; hours?: number; auto?: boolean };
    const kind = a.kind as WorkerKind;
    if (!WORKER_TYPES[kind]) throw new GameError("Работник не найден");
    const state = await loadGame(user.id);
    await settleWorkers(state, user.id);
    const [existing] = await db.select().from(workers).where(eq(workers.userId, user.id));
    const list = await db.select().from(workers).where(eq(workers.userId, user.id));
    const current = list.find((w) => w.kind === kind);
    void existing;
    if (a.type === "toggle") {
      if (!current) throw new GameError("Сначала наймите работника");
      await db.update(workers).set({ auto: !current.auto }).where(eq(workers.id, current.id));
      return NextResponse.json({ ok: true, message: !current.auto ? "Работник приступил к работе" : "Работник на паузе", state });
    }
    if (a.type === "fire") {
      if (!current) throw new GameError("Работник не найден");
      await db.delete(workers).where(eq(workers.id, current.id));
      return NextResponse.json({ ok: true, message: "Работник уволен. Оплата не возвращается", state });
    }
    if (a.type !== "hire") throw new GameError("Неизвестное действие");
    const hours = Number(a.hours);
    if (!WORKER_HOURS.includes(hours as (typeof WORKER_HOURS)[number])) throw new GameError("Выберите 8, 24 или 72 часа");
    if (current && current.expiresAt.getTime() > Date.now()) throw new GameError("Работник уже нанят. Дождитесь окончания контракта или увольте его");
    const price = workerPrice(kind, hours);
    if (state.coins < price) throw new GameError(`Контракт стоит ${price} монет. Накопите на рынке и в городе`);
    state.coins -= price;
    const now = new Date();
    const expiresAt = new Date(Date.now() + hours * 3_600_000);
    if (current) {
      await db.update(workers).set({ hiredAt: now, expiresAt, lastRunAt: now, auto: true, cycles: 0, earned: 0 }).where(eq(workers.id, current.id));
    } else {
      await db.insert(workers).values({ userId: user.id, kind, expiresAt, lastRunAt: now });
    }
    await saveGame(user.id, state);
    return NextResponse.json({ ok: true, message: `${WORKER_TYPES[kind].name} нанят на ${hours} ч за ${price} монет. Работает даже offline`, state });
  } catch (error) {
    if (error instanceof GameError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("Workers failed", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
