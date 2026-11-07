import { sql } from "drizzle-orm";
import { db } from "@/db";
import { GameError } from "./game-engine";

// Ограничение частоты запросов в PostgreSQL (работает на любом числе инстансов).
// Таблица rate_limits создаётся через drizzle-kit push.
export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<{ allowed: boolean; retryAfterSec: number }> {
  const safeKey = key.slice(0, 160);
  const now = new Date();
  const windowStart = new Date(Date.now() - windowMs);
  try {
    const result = await db.execute(sql`
      INSERT INTO rate_limits (key, count, window_start)
      VALUES (${safeKey}, 1, ${now})
      ON CONFLICT (key) DO UPDATE SET
        count = CASE WHEN rate_limits.window_start < ${windowStart} THEN 1 ELSE rate_limits.count + 1 END,
        window_start = CASE WHEN rate_limits.window_start < ${windowStart} THEN ${now} ELSE rate_limits.window_start END
      RETURNING count, window_start`);
    const row = (result.rows[0] ?? {}) as { count?: number; window_start?: Date | string };
    const count = Number(row.count ?? limit + 1);
    if (Math.random() < 0.02) {
      void db.execute(sql`DELETE FROM rate_limits WHERE window_start < ${new Date(Date.now() - 86_400_000)}`).catch(() => undefined);
    }
    if (count <= limit) return { allowed: true, retryAfterSec: 0 };
    const start = row.window_start ? new Date(row.window_start).getTime() : Date.now();
    return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((start + windowMs - Date.now()) / 1000)) };
  } catch {
    // fail-open: проблемы с таблицей лимитов не должны останавливать игру
    return { allowed: true, retryAfterSec: 0 };
  }
}

export async function rateLimitOrThrow(key: string, limit: number, windowMs: number, message = "Слишком много запросов. Попробуйте чуть позже"): Promise<void> {
  const { allowed } = await checkRateLimit(key, limit, windowMs);
  if (!allowed) throw new GameError(message);
}
