import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { farmStates, mailMessages, users } from "@/db/schema";
import { cleanupExpiredSessions, createSession, hashPassword } from "@/lib/auth";
import { GameError } from "@/lib/game-engine";
import { initialGameState } from "@/lib/game-engine";
import { checkRateLimit } from "@/lib/rate-limit";
import { assertSameOrigin, clientIp, isUniqueViolation, readJson } from "@/lib/request-guard";
import { USERNAME_PATTERN, cleanDisplayName } from "@/lib/text-safety";
import { getSettings } from "@/lib/settings";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const limited = await checkRateLimit(`register:${clientIp(request)}`, 5, 3_600_000);
    if (!limited.allowed) {
      return NextResponse.json({ error: "Слишком много регистраций. Попробуйте позже" }, { status: 429 });
    }
    if (!(await getSettings()).registrationOpen) {
      return NextResponse.json({ error: "Регистрация новых игроков временно закрыта" }, { status: 403 });
    }
    const body = await readJson(request);
    const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const displayName = cleanDisplayName(body.displayName, username);
    // Только латиница: кириллические двойники («аdmin») больше нельзя занять.
    if (!USERNAME_PATTERN.test(username)) {
      return NextResponse.json({ error: "Логин: 3–24 символа, только латиница, цифры и _" }, { status: 400 });
    }
    if (password.length < 6 || password.length > 72) {
      return NextResponse.json({ error: "Пароль должен содержать от 6 до 72 символов" }, { status: 400 });
    }
    if (displayName.length > 32) return NextResponse.json({ error: "Имя фермера слишком длинное" }, { status: 400 });
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
    if (existing.length) return NextResponse.json({ error: "Этот логин уже занят" }, { status: 409 });
    const passwordHash = await hashPassword(password);
    let userId: number;
    try {
      userId = await db.transaction(async (tx) => {
        const [user] = await tx.insert(users).values({ username, displayName, passwordHash }).returning({ id: users.id });
        await tx.insert(farmStates).values({ userId: user.id, data: initialGameState() });
        await tx.insert(mailMessages).values({
          recipientId: user.id,
          subject: "Добро пожаловать в Тихую долину",
          body: "Ферма ваша! Начните с посадки моркови, полейте грядку и заберите ежедневный подарок в разделе «Акции». Здесь же будут появляться письма и подарки от друзей.",
          kind: "system",
          payload: { items: { carrot_seed: 2 }, coins: 25 },
        });
        return user.id;
      });
    } catch (error) {
      if (isUniqueViolation(error)) return NextResponse.json({ error: "Этот логин уже занят" }, { status: 409 });
      throw error;
    }
    await createSession(userId);
    await cleanupExpiredSessions();
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof GameError) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: "Не удалось создать аккаунт. Попробуйте другой логин" }, { status: 500 });
  }
}
