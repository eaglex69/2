import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { lotteries } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getEconomy, saveEconomy } from "@/lib/economy";
import { BUILDINGS, EQUIPMENT } from "@/lib/game-config";
import { ensureLotteries, sanitizePrizes } from "@/lib/lotteries";
import { assertSameOrigin, readJson } from "@/lib/request-guard";

export const dynamic = "force-dynamic";

async function admin() {
  const user = await getCurrentUser();
  return user?.role === "admin" ? user : null;
}

export async function GET() {
  if (!(await admin())) return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  await ensureLotteries();
  const [rows, economy] = await Promise.all([
    db.select().from(lotteries).orderBy(desc(lotteries.id)),
    getEconomy(),
  ]);
  return NextResponse.json({
    lotteries: rows.map((row) => ({ ...row, prizes: sanitizePrizes(row.prizes) })),
    economy,
    buildings: BUILDINGS,
    equipment: EQUIPMENT,
  });
}

export async function POST(request: Request) {
  if (!(await admin())) return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  assertSameOrigin(request);
  const body = await readJson(request) as Record<string, unknown>;
  const action = String(body.action ?? "");

  if (action === "lottery-save") {
    const id = Number(body.id) || 0;
    const name = String(body.name ?? "").trim().slice(0, 80) || "Лотерея";
    const key = String(body.key ?? "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40) || `lottery-${Date.now()}`;
    const values = {
      key,
      name,
      description: String(body.description ?? "").trim().slice(0, 240),
      priceCoins: Math.max(0, Math.min(1_000_000, Math.round(Number(body.priceCoins) || 0))),
      priceGems: Math.max(0, Math.min(10_000, Math.round(Number(body.priceGems) || 0))),
      prizes: sanitizePrizes(body.prizes),
      active: body.active !== false,
    };
    if (!values.prizes.length) return NextResponse.json({ error: "Добавьте хотя бы один приз" }, { status: 400 });
    if (id > 0) await db.update(lotteries).set(values).where(eq(lotteries.id, id));
    else await db.insert(lotteries).values(values).onConflictDoNothing();
    return NextResponse.json({ ok: true, message: "Лотерея сохранена" });
  }
  if (action === "lottery-delete") {
    const id = Number(body.id) || 0;
    if (id > 0) await db.delete(lotteries).where(eq(lotteries.id, id));
    return NextResponse.json({ ok: true, message: "Лотерея удалена" });
  }
  if (action === "prices-save") {
    const kind = body.kind === "equipment" ? "equipment" : "buildings";
    const saved = await saveEconomy(kind, (body.prices ?? {}) as Record<string, never>);
    return NextResponse.json({ ok: true, message: "Цены обновлены", prices: saved });
  }
  return NextResponse.json({ error: "Неизвестное действие" }, { status: 400 });
}
