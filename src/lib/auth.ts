import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies, headers } from "next/headers";
import { and, eq, gt, lt, ne } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";

const scrypt = promisify(scryptCallback);
export const SESSION_COOKIE = "quiet_farm_session";
const SESSION_DAYS = 30;
// Фиктивный хеш для verifyPassword, чтобы время ответа не выдавало,
// существует ли логин (защита от перебора имён).
const DUMMY_PASSWORD_HASH = `${"0".repeat(32)}:${"0".repeat(128)}`;

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  let derived: Buffer;
  let expected: Buffer;
  try {
    derived = (await scrypt(password, salt, 64)) as Buffer;
    expected = Buffer.from(key, "hex");
  } catch {
    return false;
  }
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

// Проверка пароля с защитой от timing-атак: scrypt выполняется всегда,
// даже если пользователя нет.
export async function verifyPasswordSafe(password: string, stored: string | null) {
  return verifyPassword(password, stored ?? DUMMY_PASSWORD_HASH).then((ok) => ok && stored !== null);
}

async function isHttps() {
  if (process.env.NODE_ENV === "production") return true;
  try {
    const store = await headers();
    return (store.get("x-forwarded-proto") ?? "").split(",")[0].trim() === "https";
  } catch {
    return false;
  }
}

function cookieFlags(expires: Date, secure: boolean) {
  return { httpOnly: true, sameSite: "lax" as const, secure, expires, path: "/" };
}

export async function createSession(userId: number) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.insert(sessions).values({ token, userId, expiresAt });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, cookieFlags(expiresAt, await isHttps()));
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const rows = await db
    .select({ id: users.id, username: users.username, displayName: users.displayName, avatar: users.avatar, bio: users.bio, profileFrame: users.profileFrame, cover: users.cover, profile: users.profile, createdAt: users.createdAt, role: users.role, mutedUntil: users.mutedUntil, bannedAt: users.bannedAt })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return rows[0] ?? null;
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.token, token));
  cookieStore.set(SESSION_COOKIE, "", cookieFlags(new Date(0), await isHttps()));
}

// Завершает все сессии пользователя, кроме текущей (смена пароля).
export async function destroyOtherSessions(userId: number) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  await db.delete(sessions).where(
    and(eq(sessions.userId, userId), token && /^[a-f0-9]{64}$/.test(token) ? ne(sessions.token, token) : undefined as never),
  );
}

// Периодическая чистка протухших сессий, чтобы таблица не росла бесконечно.
export async function cleanupExpiredSessions() {
  if (Math.random() > 0.05) return;
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date())).catch(() => undefined);
}
