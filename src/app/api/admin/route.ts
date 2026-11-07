import { NextResponse } from "next/server";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  adminLogs,
  chatMessages,
  farmStates,
  forumReplies,
  forumTopics,
  mailMessages,
  marketListings,
  newsPosts,
  newspaperPosts,
  promoCodes,
  sessions,
  tickets,
  users,
} from "@/db/schema";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { ITEMS } from "@/lib/game-config";
import { GameError, initialGameState, type GameState } from "@/lib/game-engine";
import { loadGame, saveGame } from "@/lib/game-store";
import { getSettings, setSetting } from "@/lib/settings";
import { gameItems } from "@/db/schema";
import { ensureContent, contentSnapshot } from "@/lib/content-server";
import { bonuses } from "@/db/schema";
import { BONUS_KINDS, type BonusKind } from "@/lib/bonus";
import { sanitizeBalance } from "@/lib/content";
import { withUserLock } from "@/lib/mutex";
import { DESIGN_SLOTS, DESIGN_SLOT_DEFS, getDesign, sanitizeDesign, saveAsset, saveFontAsset, designCss, DEFAULT_DESIGN } from "@/lib/design";

export const dynamic = "force-dynamic";

type Admin = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
type Rows = Record<string, unknown>[];

async function rows(query: ReturnType<typeof sql>): Promise<Rows> {
  const result = await db.execute(query);
  const pattern = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?\+00$/;
  return (result.rows as Rows).map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [
    key,
    typeof value === "string" && pattern.test(value) ? new Date(value.replace(" ", "T").replace(/\+00$/, "Z")).toISOString() : value,
  ])));
}

function num(value: unknown, min: number, max: number, label: string) {
  if (typeof value === "boolean" || value === null || value === undefined || value === "") throw new GameError(`${label}: допустимо от ${min} до ${max}`);
  const result = Number(value);
  if (!Number.isFinite(result) || !Number.isInteger(result) || result < min || result > max) {
    throw new GameError(`${label}: допустимо от ${min} до ${max}`);
  }
  return result;
}

function str(value: unknown, min: number, max: number, label: string) {
  if (typeof value !== "string") throw new GameError(`Заполните поле «${label}»`);
  const result = value.trim();
  if (result.length < min || result.length > max) throw new GameError(`${label}: от ${min} до ${max} символов`);
  return result;
}

async function log(admin: Admin, action: string, target: string, details = "") {
  await db.insert(adminLogs).values({ adminId: admin.id, adminName: admin.username, action, target: target.slice(0, 120), details: details.slice(0, 500) });
}

// Действия админа над фермой идут под той же блокировкой, что и действия игрока,
// иначе параллельное сохранение игры затирает правку.
async function mutateState(userId: number, change: (state: GameState) => void) {
  return withUserLock(userId, async () => {
    const state = await loadGame(userId);
    change(state);
    await saveGame(userId, state);
    return state;
  });
}

function parseItems(value: unknown) {
  const result: Record<string, number> = {};
  if (!value || typeof value !== "object") return result;
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!ITEMS[key]) throw new GameError(`Неизвестный предмет: ${key}`);
    const quantity = num(raw, 1, 9999, ITEMS[key].name);
    result[key] = quantity;
  }
  return result;
}

async function targetUser(id: unknown) {
  const userId = num(id, 1, 1_000_000_000, "ID игрока");
  const [target] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!target) throw new GameError("Игрок не найден");
  return target;
}

export async function GET(request: Request) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "admin") return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  const url = new URL(request.url);
  const section = url.searchParams.get("section") ?? "dashboard";
  try {
    if (section === "dashboard") {
      const [totals] = await rows(sql`select
        (select count(*) from users)::float8 as users,
        (select count(*) from users where last_seen > now() - interval '5 minutes')::float8 as online,
        (select count(*) from users where created_at > now() - interval '24 hours')::float8 as "newDay",
        (select count(*) from users where last_seen > now() - interval '24 hours')::float8 as "activeDay",
        (select count(*) from users where banned_at is not null)::float8 as banned,
        (select coalesce(sum((data->>'coins')::float8),0) from farm_states)::float8 as coins,
        (select coalesce(sum((data->>'gems')::float8),0) from farm_states)::float8 as gems,
        (select count(*) from tickets where status in ('На рассмотрении','В работе'))::float8 as "openTickets",
        (select count(*) from market_listings where status = 'active')::float8 as listings,
        (select count(*) from market_listings where status = 'sold')::float8 as "soldListings",
        (select count(*) from forum_topics)::float8 as topics,
        (select count(*) from chat_messages)::float8 as chat,
        (select count(*) from mail_messages)::float8 as mail,
        (select count(*) from newspaper_posts)::float8 as newspaper,
        (select count(*) from promo_codes where active)::float8 as promos`);
      const registrations = await rows(sql`select to_char(d, 'DD.MM') as label,
        (select count(*) from users where created_at::date = d::date)::int as value
        from generate_series(current_date - interval '13 days', current_date, interval '1 day') d order by d`);
      const levels = await rows(sql`select (data->>'level')::int as level, count(*)::int as count from farm_states group by 1 order by 1 limit 30`);
      const richest = await rows(sql`select u.id, u.display_name as "displayName", u.username, (f.data->>'coins')::float8 as coins, (f.data->>'level')::int as level
        from farm_states f join users u on u.id = f.user_id order by coins desc limit 5`);
      const items = await rows(sql`select e.k as key, sum(e.v::float8)::float8 as total
        from farm_states f, jsonb_each_text(f.data->'inventory') as e(k, v) group by e.k order by total desc limit 10`);
      const recent = await rows(sql`select id, username, display_name as "displayName", created_at as "createdAt", last_seen as "lastSeen" from users order by created_at desc limit 6`);
      const logs = await rows(sql`select id, admin_name as "adminName", action, target, details, created_at as "createdAt" from admin_logs order by created_at desc limit 6`);
      return NextResponse.json({ totals, registrations, levels, richest, items, recent, logs });
    }

    if (section === "users") {
      const q = `%${(url.searchParams.get("q") ?? "").trim().replace(/[%_]/g, "")}%`;
      const page = Math.min(10000, Math.max(0, Number(url.searchParams.get("page") ?? 0) || 0));
      const filters: Record<string, string> = {
        all: "true",
        online: "u.last_seen > now() - interval '5 minutes'",
        banned: "u.banned_at is not null",
        admins: "u.role = 'admin'",
        muted: "u.muted_until > now()",
        new: "u.created_at > now() - interval '7 days'",
      };
      const orders: Record<string, string> = {
        newest: "u.created_at desc",
        seen: "u.last_seen desc",
        level: "level desc nulls last",
        coins: "coins desc nulls last",
        name: "u.username asc",
      };
      const filter = sql.raw(filters[url.searchParams.get("filter") ?? "all"] ?? "true");
      const order = sql.raw(orders[url.searchParams.get("order") ?? "newest"] ?? orders.newest);
      const list = await rows(sql`select u.id, u.username, u.display_name as "displayName", u.role, u.banned_at as "bannedAt", u.ban_reason as "banReason",
        u.muted_until as "mutedUntil", u.created_at as "createdAt", u.last_seen as "lastSeen",
        (f.data->>'level')::int as level, (f.data->>'coins')::float8 as coins, (f.data->>'gems')::int as gems
        from users u left join farm_states f on f.user_id = u.id
        where (u.username ilike ${q} or u.display_name ilike ${q}) and ${filter}
        order by ${order} limit 20 offset ${page * 20}`);
      const [total] = await rows(sql`select count(*)::int as value from users u where (u.username ilike ${q} or u.display_name ilike ${q}) and ${filter}`);
      return NextResponse.json({ users: list, total: total?.value ?? 0, page });
    }

    if (section === "user") {
      const target = await targetUser(url.searchParams.get("id"));
      const state = await loadGame(target.id);
      const [counts] = await rows(sql`select
        (select count(*) from mail_messages where recipient_id = ${target.id})::int as "mailIn",
        (select count(*) from mail_messages where sender_id = ${target.id})::int as "mailOut",
        (select count(*) from market_listings where seller_id = ${target.id} and status = 'active')::int as listings,
        (select count(*) from market_listings where seller_id = ${target.id} and status = 'sold')::int as sold,
        (select count(*) from chat_messages where user_id = ${target.id})::int as chat,
        (select count(*) from forum_topics where user_id = ${target.id})::int as topics,
        (select count(*) from forum_replies where user_id = ${target.id})::int as replies,
        (select count(*) from tickets where user_id = ${target.id})::int as tickets,
        (select count(*) from friendships where status = 'accepted' and (requester_id = ${target.id} or addressee_id = ${target.id}))::int as friends,
        (select count(*) from sessions where user_id = ${target.id} and expires_at > now())::int as sessions`);
      const { passwordHash: _hash, ...safe } = target;
      void _hash;
      return NextResponse.json({ user: safe, state, counts });
    }

    if (section === "tickets") {
      const status = url.searchParams.get("status") ?? "all";
      const filter = status === "all" ? sql`true` : sql`t.status = ${status}`;
      const list = await rows(sql`select t.id, t.category, t.body, t.status, t.created_at as "createdAt", t.user_id as "userId", u.username, u.display_name as "displayName"
        from tickets t join users u on u.id = t.user_id where ${filter} order by t.created_at desc limit 100`);
      return NextResponse.json({ tickets: list });
    }

    if (section === "content") {
      const chat = await rows(sql`select c.id, c.body, c.created_at as "createdAt", c.user_id as "userId", u.username, u.display_name as "displayName" from chat_messages c join users u on u.id = c.user_id order by c.created_at desc limit 80`);
      const topics = await rows(sql`select t.id, t.title, t.body, t.category, t.created_at as "createdAt", u.username, (select count(*) from forum_replies r where r.topic_id = t.id)::int as replies from forum_topics t join users u on u.id = t.user_id order by t.created_at desc limit 50`);
      const replies = await rows(sql`select r.id, r.topic_id as "topicId", r.body, r.created_at as "createdAt", u.username from forum_replies r join users u on u.id = r.user_id order by r.created_at desc limit 50`);
      const newspaper = await rows(sql`select p.id, p.kind, p.title, p.body, p.created_at as "createdAt", u.username from newspaper_posts p join users u on u.id = p.user_id order by p.created_at desc limit 50`);
      return NextResponse.json({ chat, topics, replies, newspaper });
    }

    if (section === "market") {
      const status = url.searchParams.get("status") ?? "active";
      const filter = status === "all" ? sql`true` : sql`m.status = ${status}`;
      const list = await rows(sql`select m.id, m.item_key as "itemKey", m.quantity, m.unit_price as "unitPrice", m.status, m.created_at as "createdAt",
        s.username as seller, b.username as buyer from market_listings m join users s on s.id = m.seller_id left join users b on b.id = m.buyer_id
        where ${filter} order by m.created_at desc limit 100`);
      return NextResponse.json({ listings: list });
    }

    if (section === "promos") {
      const list = await rows(sql`select id, code, coins, gems, items, max_uses as "maxUses", uses, active, expires_at as "expiresAt", created_at as "createdAt" from promo_codes order by created_at desc limit 100`);
      return NextResponse.json({ promos: list });
    }

    if (section === "news") {
      const list = await db.select().from(newsPosts).orderBy(sql`created_at desc`).limit(100);
      return NextResponse.json({ news: list });
    }

    if (section === "settings") return NextResponse.json({ settings: await getSettings() });
    if (section === "content-editor") {
      await ensureContent(true);
      const list = await db.select().from(gameItems).orderBy(sql`created_at desc`);
      const snap = contentSnapshot();
      return NextResponse.json({ items: list, content: snap.content, balance: snap.balance, design: await getDesign() });
    }
    if (section === "balance") {
      await ensureContent(true);
      const snap = contentSnapshot();
      return NextResponse.json({ balance: snap.balance, content: snap.content });
    }
    if (section === "bonuses") {
      const list = await db.select().from(bonuses).orderBy(sql`created_at desc`).limit(100);
      return NextResponse.json({ bonuses: list });
    }
    if (section === "design") return NextResponse.json({ design: await getDesign(), slots: DESIGN_SLOTS, defs: DESIGN_SLOT_DEFS, css: designCss(await getDesign()) });
    if (section === "files") {
      const list = await rows(sql`select key, updated_at as "updatedAt" from assets where key like 'theme:file-%' order by updated_at desc limit 200`);
      return NextResponse.json({ files: list });
    }

    if (section === "logs") {
      const list = await rows(sql`select id, admin_name as "adminName", action, target, details, created_at as "createdAt" from admin_logs order by created_at desc limit 300`);
      return NextResponse.json({ logs: list });
    }

    return NextResponse.json({ error: "Неизвестный раздел" }, { status: 400 });
  } catch (error) {
    if (error instanceof GameError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("Admin GET failed", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "admin") return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  try {
    const a = await request.json() as Record<string, unknown>;
    const type = typeof a.type === "string" ? a.type : "";
    let message = "Готово";

    if (type === "user-resources") {
      const target = await targetUser(a.id);
      const coins = num(a.coins, 0, 2_000_000_000, "Монеты");
      const gems = num(a.gems, 0, 1_000_000, "Алмазы");
      const level = num(a.level, 1, 100, "Уровень");
      const maxEnergy = num(a.maxEnergy, 1, 1000, "Макс. энергия");
      const energy = num(a.energy, 0, maxEnergy, "Энергия");
      await mutateState(target.id, (state) => {
        if (state.level !== level) state.xp = 0;
        Object.assign(state, { coins, gems, level, maxEnergy, energy, lastEnergyAt: Date.now() });
      });
      await log(admin, "user.resources", target.username, `монеты ${coins}, алмазы ${gems}, ур. ${level}, энергия ${energy}/${maxEnergy}`);
      message = "Ресурсы игрока обновлены";
    } else if (type === "user-items") {
      const target = await targetUser(a.id);
      const item = typeof a.item === "string" ? a.item : "";
      if (!ITEMS[item]) throw new GameError("Предмет не найден");
      const quantity = num(a.quantity, -9999, 9999, "Количество");
      if (quantity === 0) throw new GameError("Количество не может быть нулевым");
      await mutateState(target.id, (state) => {
        const next = Math.max(0, (state.inventory[item] ?? 0) + quantity);
        if (next === 0) delete state.inventory[item]; else state.inventory[item] = next;
      });
      await log(admin, quantity > 0 ? "user.give" : "user.take", target.username, `${ITEMS[item].name} ×${Math.abs(quantity)}`);
      message = quantity > 0 ? "Предметы выданы" : "Предметы изъяты";
    } else if (type === "user-reset") {
      const target = await targetUser(a.id);
      await db.insert(farmStates).values({ userId: target.id, data: initialGameState() }).onConflictDoUpdate({
        target: farmStates.userId, set: { data: initialGameState(), updatedAt: new Date() },
      });
      await db.update(marketListings).set({ status: "cancelled" }).where(and(eq(marketListings.sellerId, target.id), eq(marketListings.status, "active")));
      await log(admin, "user.reset", target.username, "полный сброс фермы");
      message = "Ферма игрока сброшена до стартовой";
    } else if (type === "user-ban") {
      const target = await targetUser(a.id);
      if (target.id === admin.id) throw new GameError("Нельзя заблокировать себя");
      if (target.role === "admin") throw new GameError("Сначала снимите права администратора");
      const reason = str(a.reason, 2, 200, "Причина");
      await db.update(users).set({ bannedAt: new Date(), banReason: reason }).where(eq(users.id, target.id));
      await db.delete(sessions).where(eq(sessions.userId, target.id));
      await log(admin, "user.ban", target.username, reason);
      message = "Игрок заблокирован, сессии завершены";
    } else if (type === "user-unban") {
      const target = await targetUser(a.id);
      await db.update(users).set({ bannedAt: null, banReason: null }).where(eq(users.id, target.id));
      await log(admin, "user.unban", target.username);
      message = "Блокировка снята";
    } else if (type === "user-mute") {
      const target = await targetUser(a.id);
      if (target.id === admin.id) throw new GameError("Нельзя заглушить себя");
      const minutes = num(a.minutes, 0, 525_600, "Минуты");
      await db.update(users).set({ mutedUntil: minutes ? new Date(Date.now() + minutes * 60_000) : null }).where(eq(users.id, target.id));
      await log(admin, minutes ? "user.mute" : "user.unmute", target.username, minutes ? `${minutes} мин` : "");
      message = minutes ? `Игрок заглушен на ${minutes} мин` : "Мьют снят";
    } else if (type === "user-role") {
      const target = await targetUser(a.id);
      const role = a.role === "admin" ? "admin" : "user";
      if (target.id === admin.id && role !== "admin") throw new GameError("Нельзя снять права с самого себя");
      await db.update(users).set({ role }).where(eq(users.id, target.id));
      await log(admin, "user.role", target.username, role);
      message = role === "admin" ? "Права администратора выданы" : "Права администратора сняты";
    } else if (type === "user-rename") {
      const target = await targetUser(a.id);
      const displayName = str(a.displayName, 2, 32, "Имя");
      await db.update(users).set({ displayName }).where(eq(users.id, target.id));
      await log(admin, "user.rename", target.username, displayName);
      message = "Имя изменено";
    } else if (type === "user-password") {
      const target = await targetUser(a.id);
      const password = str(a.password, 6, 72, "Пароль");
      await db.update(users).set({ passwordHash: await hashPassword(password) }).where(eq(users.id, target.id));
      await db.delete(sessions).where(and(eq(sessions.userId, target.id), target.id === admin.id ? ne(sessions.userId, target.id) : sql`true`));
      await log(admin, "user.password", target.username, "пароль сброшен");
      message = "Пароль изменён, сессии игрока завершены";
    } else if (type === "user-delete") {
      const target = await targetUser(a.id);
      if (target.id === admin.id) throw new GameError("Нельзя удалить себя");
      if (target.role === "admin") throw new GameError("Сначала снимите права администратора");
      await db.delete(users).where(eq(users.id, target.id));
      await log(admin, "user.delete", target.username);
      message = "Аккаунт удалён вместе с данными";
    } else if (type === "broadcast") {
      const subject = str(a.subject, 2, 100, "Тема");
      const body = str(a.body, 2, 2000, "Текст");
      const items = parseItems(a.items);
      const coins = a.coins === undefined || a.coins === "" ? 0 : num(a.coins, 0, 100_000, "Монеты");
      const payload = Object.keys(items).length || coins ? { ...(Object.keys(items).length ? { items } : {}), ...(coins ? { coins } : {}) } : null;
      const kind = payload ? "gift" : "system";
      const target = typeof a.target === "string" ? a.target.trim().toLowerCase() : "all";
      let recipients: number[];
      if (target === "all" || target === "") {
        recipients = (await db.select({ id: users.id }).from(users).where(sql`banned_at is null`)).map((row) => row.id);
      } else {
        const [found] = await db.select({ id: users.id }).from(users).where(eq(users.username, target)).limit(1);
        if (!found) throw new GameError("Получатель не найден");
        recipients = [found.id];
      }
      for (let i = 0; i < recipients.length; i += 500) {
        await db.insert(mailMessages).values(recipients.slice(i, i + 500).map((recipientId) => ({ recipientId, subject, body, kind, payload })));
      }
      await log(admin, "broadcast", target === "all" || target === "" ? "все игроки" : target, `${subject} · получателей: ${recipients.length}`);
      message = `Письмо отправлено: ${recipients.length} получ.`;
    } else if (type === "ticket-update") {
      const id = num(a.id, 1, 1_000_000_000, "ID обращения");
      const status = typeof a.status === "string" ? a.status : "";
      if (!["На рассмотрении", "В работе", "Решено", "Отклонено"].includes(status)) throw new GameError("Неверный статус");
      const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1);
      if (!ticket) throw new GameError("Обращение не найдено");
      await db.update(tickets).set({ status }).where(eq(tickets.id, id));
      const reply = typeof a.reply === "string" ? a.reply.trim() : "";
      if (reply) {
        await db.insert(mailMessages).values({ recipientId: ticket.userId, subject: `Ответ на обращение #${id}`, body: reply.slice(0, 2000), kind: "system" });
      }
      await log(admin, "ticket.update", `#${id}`, `${status}${reply ? " + ответ" : ""}`);
      message = reply ? "Статус обновлён, ответ отправлен игроку" : "Статус обновлён";
    } else if (type === "ticket-delete") {
      const id = num(a.id, 1, 1_000_000_000, "ID");
      await db.delete(tickets).where(eq(tickets.id, id));
      await log(admin, "ticket.delete", `#${id}`);
      message = "Обращение удалено";
    } else if (type === "content-delete") {
      const id = num(a.id, 1, 1_000_000_000, "ID");
      const kind = typeof a.kind === "string" ? a.kind : "";
      if (kind === "chat") await db.delete(chatMessages).where(eq(chatMessages.id, id));
      else if (kind === "topic") await db.delete(forumTopics).where(eq(forumTopics.id, id));
      else if (kind === "reply") await db.delete(forumReplies).where(eq(forumReplies.id, id));
      else if (kind === "newspaper") await db.delete(newspaperPosts).where(eq(newspaperPosts.id, id));
      else throw new GameError("Неизвестный тип контента");
      await log(admin, `content.${kind}`, `#${id}`, "удалено");
      message = "Материал удалён";
    } else if (type === "chat-clear") {
      await db.delete(chatMessages);
      await log(admin, "chat.clear", "общий чат", "очищен полностью");
      message = "Чат очищен";
    } else if (type === "market-cancel") {
      const id = num(a.id, 1, 1_000_000_000, "ID лота");
      const [listing] = await db.select().from(marketListings).where(and(eq(marketListings.id, id), eq(marketListings.status, "active"))).limit(1);
      if (!listing) throw new GameError("Активный лот не найден");
      await mutateState(listing.sellerId, (state) => {
        state.inventory[listing.itemKey] = (state.inventory[listing.itemKey] ?? 0) + listing.quantity;
      });
      await db.update(marketListings).set({ status: "cancelled" }).where(eq(marketListings.id, id));
      await db.insert(mailMessages).values({ recipientId: listing.sellerId, subject: "Лот снят модератором", body: `Ваш лот «${ITEMS[listing.itemKey]?.name ?? listing.itemKey}» ×${listing.quantity} снят администрацией. Товар возвращён в амбар.`, kind: "system" });
      await log(admin, "market.cancel", `лот #${id}`, `${listing.itemKey} ×${listing.quantity}`);
      message = "Лот снят, товар возвращён продавцу";
    } else if (type === "promo-create") {
      const code = str(a.code, 3, 32, "Код").toUpperCase();
      if (!/^[A-Z0-9_-]+$/.test(code)) throw new GameError("Код: только латиница, цифры, - и _");
      const coins = num(a.coins ?? 0, 0, 1_000_000, "Монеты");
      const gems = num(a.gems ?? 0, 0, 10_000, "Алмазы");
      const items = parseItems(a.items);
      if (!coins && !gems && !Object.keys(items).length) throw new GameError("Добавьте хотя бы одну награду");
      const maxUses = num(a.maxUses ?? 0, 0, 1_000_000, "Лимит");
      const hours = num(a.expiresHours ?? 0, 0, 87_600, "Срок");
      const exists = await db.select({ id: promoCodes.id }).from(promoCodes).where(eq(promoCodes.code, code)).limit(1);
      if (exists.length) throw new GameError("Такой код уже существует");
      await db.insert(promoCodes).values({ code, coins, gems, items, maxUses, expiresAt: hours ? new Date(Date.now() + hours * 3_600_000) : null });
      await log(admin, "promo.create", code, `монеты ${coins}, алмазы ${gems}, лимит ${maxUses || "∞"}`);
      message = `Промокод ${code} создан`;
    } else if (type === "promo-toggle") {
      const id = num(a.id, 1, 1_000_000_000, "ID");
      const [promo] = await db.select().from(promoCodes).where(eq(promoCodes.id, id)).limit(1);
      if (!promo) throw new GameError("Промокод не найден");
      await db.update(promoCodes).set({ active: !promo.active }).where(eq(promoCodes.id, id));
      await log(admin, "promo.toggle", promo.code, promo.active ? "отключён" : "включён");
      message = promo.active ? "Промокод отключён" : "Промокод включён";
    } else if (type === "promo-delete") {
      const id = num(a.id, 1, 1_000_000_000, "ID");
      const deleted = await db.delete(promoCodes).where(eq(promoCodes.id, id)).returning({ code: promoCodes.code });
      await log(admin, "promo.delete", deleted[0]?.code ?? `#${id}`);
      message = "Промокод удалён";
    } else if (type === "news-create") {
      const title = str(a.title, 3, 120, "Заголовок");
      const body = str(a.body, 5, 4000, "Текст");
      const tag = str(a.tag ?? "Новости", 2, 24, "Метка");
      await db.insert(newsPosts).values({ title, body, tag });
      await log(admin, "news.create", title);
      message = "Новость опубликована для всех игроков";
    } else if (type === "news-delete") {
      const id = num(a.id, 1, 1_000_000_000, "ID");
      await db.delete(newsPosts).where(eq(newsPosts.id, id));
      await log(admin, "news.delete", `#${id}`);
      message = "Новость удалена";
    } else if (type === "item-save") {
      const kind = typeof a.kind === "string" ? a.kind : "";
      if (!["crop", "pond", "cage", "animal", "recipe", "item"].includes(kind)) throw new GameError("Неверный тип контента");
      const key = str(a.key, 2, 40, "Ключ").toLowerCase();
      if (!/^[a-z][a-z0-9_]+$/.test(key)) throw new GameError("Ключ: латиница, цифры и _, начинается с буквы");
      const data = (a.data && typeof a.data === "object" ? a.data : {}) as Record<string, unknown>;
      data.name = str(data.name, 2, 40, "Название");
      data.price = num(data.price, 1, 1_000_000, "Цена");
      if (kind !== "item") {
        data.duration = num(data.duration, 5, 86_400, "Время (сек)");
        data.xp = num(data.xp, 0, 100_000, "Опыт");
        data.level = num(data.level, 1, 100, "Уровень");
        data.yield = num(data.yield, 1, 100, "Выход");
      }
      data.gemPrice = num(data.gemPrice ?? 0, 0, 100_000, "Цена в алмазах");
      if (kind === "animal") {
        data.gems = num(data.gems ?? 0, 0, 100_000, "Цена животного в алмазах");
        data.feed = num(data.feed ?? 2, 1, 20, "Корм");
        data.product = key;
        data.productName = String(data.productName ?? data.name);
      }
      if (kind === "recipe") {
        if (!ITEMS[String(data.input1)] && !ITEMS[String(data.input2)]) throw new GameError("Нужен хотя бы один существующий ингредиент");
        data.output = key;
      }
      const enabled = a.enabled !== false;
      await db.insert(gameItems).values({ key, kind, data, enabled }).onConflictDoUpdate({ target: gameItems.key, set: { kind, data, enabled } });
      const iconData = typeof a.iconData === "string" && a.iconData.startsWith("data:image/") ? a.iconData : "";
      if (iconData) {
        const assetKey = `theme:icon-${key}`;
        try { await saveAsset(assetKey, iconData); } catch (error) { throw new GameError(error instanceof Error ? error.message : "Ошибка загрузки иконки"); }
        const design = await getDesign();
        const url = `/api/asset/${encodeURIComponent(assetKey)}?v=${Date.now()}`;
        const targets = kind === "crop" ? [key, `${key}_seed`] : kind === "pond" || kind === "cage" ? [key, `${key}_fry`] : [key];
        for (const target of targets) design.icons[target] = url;
        await setSetting("design", JSON.stringify(design));
      }
      await ensureContent(true);
      await log(admin, "content.item", key, `${kind}: ${String(data.name)}`);
      message = `Контент «${String(data.name)}» сохранён и доступен в игре`;
    } else if (type === "item-toggle" || type === "item-delete") {
      const key = str(a.key, 2, 40, "Ключ");
      const [row] = await db.select().from(gameItems).where(eq(gameItems.key, key)).limit(1);
      if (!row) throw new GameError("Пользовательский контент не найден (встроенный удалить нельзя)");
      if (type === "item-delete") await db.delete(gameItems).where(eq(gameItems.key, key));
      else await db.update(gameItems).set({ enabled: !row.enabled }).where(eq(gameItems.key, key));
      await ensureContent(true);
      await log(admin, `content.${type}`, key);
      message = type === "item-delete" ? "Контент удалён" : row.enabled ? "Контент отключён" : "Контент включён";
    } else if (type === "design-save") {
      const design = sanitizeDesign(a.design);
      await setSetting("design", JSON.stringify(design));
      await log(admin, "design.save", "тема игры");
      message = "Дизайн применён для всех игроков";
    } else if (type === "design-asset") {
      const slot = typeof a.slot === "string" ? a.slot : "";
      if (!DESIGN_SLOTS[slot]) throw new GameError("Неизвестный слот");
      try { await saveAsset(`theme:${slot}`, String(a.data ?? "")); } catch (error) { throw new GameError(error instanceof Error ? error.message : "Ошибка загрузки"); }
      const design = await getDesign();
      design.slots[slot] = `/api/asset/${encodeURIComponent(`theme:${slot}`)}?v=${Date.now()}`;
      await setSetting("design", JSON.stringify(design));
      await log(admin, "design.asset", slot);
      message = `Изображение «${DESIGN_SLOTS[slot]}» обновлено`;
    } else if (type === "design-reset") {
      await setSetting("design", JSON.stringify(DEFAULT_DESIGN));
      await log(admin, "design.reset", "тема игры");
      message = "Дизайн сброшен к стандартному";
    } else if (type === "design-icon" || type === "design-icon-reset") {
      const key = str(a.key, 1, 60, "Ключ иконки");
      if (!/^[A-Za-z0-9:_.-]+$/.test(key)) throw new GameError("Недопустимый ключ иконки");
      const design = await getDesign();
      if (type === "design-icon") {
        const assetKey = `theme:icon-${key.replace(/[^A-Za-z0-9_-]/g, "_")}`;
        try { await saveAsset(assetKey, String(a.data ?? "")); } catch (error) { throw new GameError(error instanceof Error ? error.message : "Ошибка загрузки"); }
        design.icons[key] = `/api/asset/${encodeURIComponent(assetKey)}?v=${Date.now()}`;
        message = `Иконка «${key}» заменена`;
      } else {
        delete design.icons[key];
        message = `Иконка «${key}» возвращена к стандартной`;
      }
      await setSetting("design", JSON.stringify(design));
      await log(admin, type, key);
    } else if (type === "design-font" || type === "design-font-reset") {
      const design = await getDesign();
      if (type === "design-font") {
        try { await saveFontAsset("theme:font-main", String(a.data ?? "")); } catch (error) { throw new GameError(error instanceof Error ? error.message : "Ошибка загрузки шрифта"); }
        design.fontUrl = `/api/asset/${encodeURIComponent("theme:font-main")}?v=${Date.now()}`;
        design.fontName = typeof a.name === "string" && /^[A-Za-z0-9 _-]{2,40}$/.test(a.name) ? a.name : "ValleyCustom";
        design.fonts = { ...design.fonts, global: "custom" };
        message = "Шрифт загружен и применён к базовой области";
      } else {
        design.fontUrl = "";
        message = "Свой шрифт удалён из темы";
      }
      await setSetting("design", JSON.stringify(design));
      await log(admin, type, design.fontName);
    } else if (type === "design-file") {
      const name = str(a.name, 1, 40, "Имя файла");
      if (!/^[A-Za-z0-9_-]+$/.test(name)) throw new GameError("Имя файла: латиница, цифры, - и _");
      const assetKey = `theme:file-${name}`;
      try { await saveAsset(assetKey, String(a.data ?? "")); } catch (error) { throw new GameError(error instanceof Error ? error.message : "Ошибка загрузки"); }
      await log(admin, "design.file", name);
      message = `Файл загружен. Адрес для CSS: /api/asset/${encodeURIComponent(assetKey)}`;
    } else if (type === "balance-save") {
      const balance = sanitizeBalance(a.balance);
      await setSetting("balance", JSON.stringify(balance));
      await ensureContent(true);
      await log(admin, "balance.save", "баланс игры", `правок: ${Object.keys(balance.overrides).length}, улучшений: ${Object.keys(balance.upgrades).length}, общих: ${Object.keys(balance.globals).length}`);
      message = "Баланс сохранён и применён для всех игроков";
    } else if (type === "balance-reset") {
      await setSetting("balance", JSON.stringify({ upgrades: {}, globals: {}, overrides: {} }));
      await ensureContent(true);
      await log(admin, "balance.reset", "баланс игры");
      message = "Баланс возвращён к стандартному";
    } else if (type === "bonus-save") {
      const kind = typeof a.kind === "string" ? a.kind : "";
      if (!(kind in BONUS_KINDS)) throw new GameError("Неизвестный тип бонуса");
      const raw = Number(a.multiplier);
      if (!Number.isFinite(raw) || raw < 1.05 || raw > 20) throw new GameError("Множитель: от 1.05 до 20");
      const multiplier = Math.round(raw * 100) / 100;
      const hours = num(a.hours, 1, 8760, "Длительность (часов)");
      const startsAt = typeof a.startsAt === "string" && a.startsAt ? new Date(a.startsAt) : new Date();
      if (Number.isNaN(startsAt.getTime())) throw new GameError("Некорректная дата начала");
      const title = typeof a.title === "string" && a.title.trim() ? a.title.trim().slice(0, 60) : `×${Number(multiplier.toFixed(2))} ${BONUS_KINDS[kind as BonusKind].short}`;
      const endsAt = new Date(startsAt.getTime() + hours * 3_600_000);
      await db.insert(bonuses).values({ title, kind, multiplier, startsAt, endsAt });
      await ensureContent(true);
      await log(admin, "bonus.create", title, `×${multiplier}, ${hours} ч`);
      message = `Бонус «${title}» запущен`;
    } else if (type === "bonus-toggle" || type === "bonus-delete") {
      const id = num(a.id, 1, 1_000_000_000, "ID бонуса");
      const [row] = await db.select().from(bonuses).where(eq(bonuses.id, id)).limit(1);
      if (!row) throw new GameError("Бонус не найден");
      if (type === "bonus-delete") await db.delete(bonuses).where(eq(bonuses.id, id));
      else await db.update(bonuses).set({ active: !row.active }).where(eq(bonuses.id, id));
      await ensureContent(true);
      await log(admin, `bonus.${type === "bonus-delete" ? "delete" : "toggle"}`, row.title);
      message = type === "bonus-delete" ? "Бонус удалён" : row.active ? "Бонус выключен" : "Бонус включён";
    } else if (type === "settings-update") {
      await setSetting("registration_open", a.registrationOpen === false ? "0" : "1");
      await setSetting("chat_enabled", a.chatEnabled === false ? "0" : "1");
      await setSetting("maintenance", a.maintenance === true ? "1" : "0");
      await setSetting("maintenance_text", typeof a.maintenanceText === "string" ? a.maintenanceText.trim().slice(0, 300) : "");
      await setSetting("banner", typeof a.banner === "string" ? a.banner.trim().slice(0, 200) : "");
      await log(admin, "settings", "настройки игры", `регистрация ${a.registrationOpen === false ? "закрыта" : "открыта"}, техработы ${a.maintenance === true ? "вкл" : "выкл"}, чат ${a.chatEnabled === false ? "выкл" : "вкл"}`);
      message = "Настройки сохранены";
    } else if (type === "logs-clear") {
      await db.delete(adminLogs).where(inArray(adminLogs.action, ["settings", "user.resources", "user.give", "user.take"]));
      message = "Служебные записи журнала очищены";
    } else {
      throw new GameError("Неизвестное действие");
    }
    return NextResponse.json({ ok: true, message });
  } catch (error) {
    if (error instanceof GameError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("Admin POST failed", error);
    return NextResponse.json({ error: "Ошибка сервера при выполнении действия" }, { status: 500 });
  }
}
