import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { cleanupExpiredSessions, createSession, verifyPasswordSafe } from "@/lib/auth";
import { GameError } from "@/lib/game-engine";
import { checkRateLimit } from "@/lib/rate-limit";
import { assertSameOrigin, clientIp, readJson } from "@/lib/request-guard";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await readJson(request);
    const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const limited = await checkRateLimit(`login:${clientIp(request)}:${username.slice(0, 24)}`, 10, 600_000);
    // Второй лимит без IP: подделка X-Forwarded-For не отключает защиту аккаунта.
    const accountLimited = await checkRateLimit(`loginacct:${username.slice(0, 24)}`, 40, 900_000);
    if (!limited.allowed || !accountLimited.allowed) {
      return NextResponse.json({ error: "Слишком много попыток входа. Подождите 10 минут" }, { status: 429 });
    }
    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
    const ok = await verifyPasswordSafe(password, user?.passwordHash ?? null);
    if (!user || !ok) {
      return NextResponse.json({ error: "Неверный логин или пароль" }, { status: 401 });
    }
    if (user.bannedAt) {
      return NextResponse.json({ error: `Аккаунт заблокирован${user.banReason ? `: ${user.banReason}` : ""}` }, { status: 403 });
    }
    await createSession(user.id);
    await cleanupExpiredSessions();
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof GameError) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: "Ошибка входа. Попробуйте ещё раз" }, { status: 500 });
  }
}
