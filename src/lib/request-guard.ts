import { GameError } from "./game-engine";

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim().slice(0, 64) || "unknown";
  return request.headers.get("x-real-ip")?.slice(0, 64) || "unknown";
}

// Защита от CSRF поверх SameSite=Lax: POST с чужого сайта отклоняется.
export function assertSameOrigin(request: Request): void {
  if (request.method === "GET" || request.method === "HEAD") return;
  const origin = request.headers.get("origin");
  if (!origin) return;
  let ok = false;
  try {
    const originHost = new URL(origin).host;
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0].trim();
    const host = forwardedHost || new URL(request.url).host;
    ok = originHost.toLowerCase() === host.toLowerCase();
  } catch {
    ok = false;
  }
  if (!ok) throw new GameError("Недопустимый источник запроса");
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    throw new GameError("Некорректный запрос");
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new GameError("Некорректный запрос");
  return value as Record<string, unknown>;
}

// Булевы значения Number(true) === 1 превращал в допустимые числа — запрещаем.
export function strictNumber(value: unknown): number | null {
  if (typeof value === "boolean" || value === null || value === undefined || value === "") return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}

// Проверка на нарушение уникальности PostgreSQL (гонка вставок).
export function isUniqueViolation(error: unknown): boolean {
  const anyErr = error as { code?: string; cause?: { code?: string }; message?: string };
  if (anyErr?.code === "23505" || anyErr?.cause?.code === "23505") return true;
  return /duplicate key|unique constraint/i.test(String(anyErr?.message ?? ""));
}
