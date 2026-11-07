import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { coopChat, coopMembers, coopRequests, coops, mailMessages, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { GameError } from "@/lib/game-engine";
import { loadGame, saveGame } from "@/lib/game-store";
import { withUserLock } from "@/lib/mutex";
import { checkRateLimit } from "@/lib/rate-limit";
import { assertSameOrigin, isUniqueViolation, readJson } from "@/lib/request-guard";
import { cleanUserText } from "@/lib/text-safety";

export const dynamic = "force-dynamic";

function txt(value: unknown, min: number, max: number, label: string) {
  if (typeof value !== "string") throw new GameError(`Заполните «${label}»`);
  const v = cleanUserText(value, max);
  if (v.length < min) throw new GameError(`${label}: от ${min} до ${max} символов`);
  return v;
}
function id(value: unknown) {
  if (typeof value === "boolean" || value === null || value === undefined || value === "") throw new GameError("Некорректный ID");
  const v = Number(value);
  if (!Number.isInteger(v) || v < 1) throw new GameError("Некорректный ID");
  return v;
}
export function coopLevel(xp: number) { return Math.min(20, 1 + Math.floor(xp / 1000)); }
export function coopCap(level: number) { return 10 + level * 2; }

async function membership(userId: number) {
  const [row] = await db.select({ coopId: coopMembers.coopId, role: coopMembers.role }).from(coopMembers).where(eq(coopMembers.userId, userId)).limit(1);
  return row ?? null;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Нужно войти" }, { status: 401 });
  if (user.bannedAt) return NextResponse.json({ error: "Аккаунт заблокирован" }, { status: 403 });
  const member = await membership(user.id);
  const list = await db.execute(sql`select c.id, c.name, c.tag, c.description, c.icon, c.join_policy as "joinPolicy", c.min_level as "minLevel", c.xp, c.created_at as "createdAt",
    u.display_name as leader, (select count(*) from coop_members m where m.coop_id = c.id)::int as members,
    (select coalesce(sum(m.contribution),0) from coop_members m where m.coop_id = c.id)::int as contribution
    from coops c join users u on u.id = c.leader_id order by c.xp desc, c.created_at asc limit 100`);
  if (!member) {
    const requests = await db.execute(sql`select r.id, r.coop_id as "coopId", c.name, r.status from coop_requests r join coops c on c.id = r.coop_id where r.user_id = ${user.id} and r.status = 'pending'`);
    return NextResponse.json({ coops: list.rows, membership: null, requests: requests.rows, members: [], chat: [], pending: [] });
  }
  const [members, chat, pending, coop] = await Promise.all([
    db.execute(sql`select m.user_id as id, u.username, u.display_name as "displayName", u.avatar, u.last_seen as "lastSeen", m.role, m.contribution, m.joined_at as "joinedAt", (f.data->>'level')::int as level
      from coop_members m join users u on u.id = m.user_id left join farm_states f on f.user_id = u.id where m.coop_id = ${member.coopId} order by m.contribution desc`),
    db.execute(sql`select ch.id, ch.body, ch.created_at as "createdAt", ch.user_id as "userId", u.display_name as author, u.username as username, u.avatar from coop_chat ch join users u on u.id = ch.user_id where ch.coop_id = ${member.coopId} order by ch.created_at desc limit 60`),
    db.execute(sql`select r.id, r.user_id as "userId", u.username, u.display_name as "displayName", u.avatar, (f.data->>'level')::int as level from coop_requests r join users u on u.id = r.user_id left join farm_states f on f.user_id = u.id where r.coop_id = ${member.coopId} and r.status = 'pending'`),
    db.select().from(coops).where(eq(coops.id, member.coopId)).limit(1),
  ]);
  return NextResponse.json({ coops: list.rows, membership: { ...member, coop: coop[0] }, members: members.rows, chat: chat.rows.reverse(), pending: pending.rows, requests: [] });
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
    const a = (await readJson(request)) as Record<string, unknown>;
    const type = typeof a.type === "string" ? a.type : "";
    let member = await membership(user.id);
    const state = await loadGame(user.id);
    let message = "Готово";

    if (type === "create") {
      if (member) throw new GameError("Вы уже состоите в кооперативе");
      const name = txt(a.name, 3, 30, "Название");
      const tag = txt(a.tag, 2, 5, "Тег").toUpperCase();
      const description = cleanUserText(typeof a.description === "string" ? a.description : "", 400);
      if (state.coins < 2000) throw new GameError("Создание кооператива стоит 2000 монет");
      const icon = ["barn", "leaf", "sun", "crown", "fish", "mountain"].includes(String(a.icon)) ? String(a.icon) : "barn";
      const exists = await db.select({ id: coops.id }).from(coops).where(sql`name = ${name} or tag = ${tag}`).limit(1);
      if (exists.length) throw new GameError("Название или тег уже заняты");
      state.coins -= 2000;
      let coop: { id: number };
      try {
        [coop] = await db.insert(coops).values({ name, tag, description, icon, leaderId: user.id }).returning({ id: coops.id });
        await db.insert(coopMembers).values({ coopId: coop.id, userId: user.id, role: "leader" });
      } catch (error) {
        if (isUniqueViolation(error)) throw new GameError("Название или тег уже заняты");
        throw error;
      }
      await saveGame(user.id, state);
      message = `Кооператив «${name}» создан`;
    } else if (type === "join") {
      if (member) throw new GameError("Сначала покиньте текущий кооператив");
      const coopId = id(a.coopId);
      const [coop] = await db.select().from(coops).where(eq(coops.id, coopId)).limit(1);
      if (!coop) throw new GameError("Кооператив не найден");
      if (state.level < coop.minLevel) throw new GameError(`Нужен ${coop.minLevel} уровень`);
      const count = await db.select({ n: sql<number>`count(*)::int` }).from(coopMembers).where(eq(coopMembers.coopId, coopId));
      if ((count[0]?.n ?? 0) >= coopCap(coopLevel(coop.xp))) throw new GameError("В кооперативе нет мест");
      if (coop.joinPolicy === "open") {
        await db.insert(coopMembers).values({ coopId, userId: user.id }).onConflictDoNothing();
        message = `Вы вступили в «${coop.name}»`;
      } else {
        await db.insert(coopRequests).values({ coopId, userId: user.id }).onConflictDoUpdate({ target: [coopRequests.coopId, coopRequests.userId], set: { status: "pending", createdAt: new Date() } });
        message = "Заявка отправлена лидеру";
      }
    } else if (type === "leave") {
      if (!member) throw new GameError("Вы не в кооперативе");
      if (member.role === "leader") throw new GameError("Лидер должен передать права или распустить кооператив");
      await db.delete(coopMembers).where(eq(coopMembers.userId, user.id));
      message = "Вы покинули кооператив";
    } else if (type === "disband") {
      if (member?.role !== "leader") throw new GameError("Только лидер может распустить кооператив");
      await db.delete(coops).where(eq(coops.id, member.coopId));
      message = "Кооператив распущен";
    } else if (type === "donate") {
      if (!member) throw new GameError("Вы не в кооперативе");
      const amount = Number(a.amount);
      if (!Number.isInteger(amount) || amount < 10 || amount > 1_000_000) throw new GameError("Взнос от 10 монет");
      if (state.coins < amount) throw new GameError("Недостаточно монет");
      state.coins -= amount;
      await db.update(coops).set({ treasuryCoins: sql`${coops.treasuryCoins} + ${amount}`, xp: sql`${coops.xp} + ${amount}` }).where(eq(coops.id, member.coopId));
      await db.update(coopMembers).set({ contribution: sql`${coopMembers.contribution} + ${amount}` }).where(eq(coopMembers.userId, user.id));
      await saveGame(user.id, state);
      message = `Взнос ${amount} монет. Опыт кооператива +${amount}`;
    } else if (type === "request-answer") {
      if (!member || !["leader", "officer"].includes(member.role)) throw new GameError("Нет прав");
      const requestId = id(a.id);
      const [req] = await db.select().from(coopRequests).where(and(eq(coopRequests.id, requestId), eq(coopRequests.coopId, member.coopId), eq(coopRequests.status, "pending"))).limit(1);
      if (!req) throw new GameError("Заявка не найдена");
      const accept = a.accept === true;
      if (accept) {
        const already = await membership(req.userId);
        if (already) throw new GameError("Игрок уже в другом кооперативе");
        const [coopRow] = await db.select({ xp: coops.xp }).from(coops).where(eq(coops.id, member.coopId)).limit(1);
        const memberCount = await db.select({ n: sql<number>`count(*)::int` }).from(coopMembers).where(eq(coopMembers.coopId, member.coopId));
        if ((memberCount[0]?.n ?? 0) >= coopCap(coopLevel(coopRow?.xp ?? 0))) throw new GameError("В кооперативе нет мест");
        await db.insert(coopMembers).values({ coopId: member.coopId, userId: req.userId });
      }
      await db.update(coopRequests).set({ status: accept ? "accepted" : "declined" }).where(eq(coopRequests.id, requestId));
      await db.insert(mailMessages).values({ recipientId: req.userId, subject: "Ответ на заявку в кооператив", body: accept ? "Ваша заявка принята. Добро пожаловать!" : "К сожалению, заявка отклонена.", kind: "coop" });
      message = accept ? "Игрок принят" : "Заявка отклонена";
    } else if (type === "kick" || type === "role") {
      if (!member || !["leader", "officer"].includes(member.role)) throw new GameError("Нет прав");
      const targetId = id(a.userId);
      if (targetId === user.id) throw new GameError("Нельзя применить к себе");
      const [target] = await db.select().from(coopMembers).where(and(eq(coopMembers.userId, targetId), eq(coopMembers.coopId, member.coopId))).limit(1);
      if (!target) throw new GameError("Игрок не в кооперативе");
      if (target.role === "leader") throw new GameError("Нельзя изменить лидера");
      if (member.role === "officer" && target.role !== "member") throw new GameError("Офицер не может менять офицеров");
      if (type === "kick") {
        await db.delete(coopMembers).where(eq(coopMembers.id, target.id));
        await db.insert(mailMessages).values({ recipientId: targetId, subject: "Исключение из кооператива", body: "Вы исключены из кооператива. Взносы не возвращаются.", kind: "coop" });
        message = "Игрок исключён";
      } else {
        const role = a.role === "officer" ? "officer" : a.role === "leader" && member.role === "leader" ? "leader" : "member";
        await db.update(coopMembers).set({ role }).where(eq(coopMembers.id, target.id));
        if (role === "leader") {
          await db.update(coopMembers).set({ role: "officer" }).where(eq(coopMembers.userId, user.id));
          await db.update(coops).set({ leaderId: targetId }).where(eq(coops.id, member.coopId));
          message = "Лидерство передано, вы стали офицером";
        } else message = role === "officer" ? "Назначен офицером" : "Понижен до участника";
      }
    } else if (type === "settings") {
      if (member?.role !== "leader") throw new GameError("Только лидер");
      const joinPolicy = a.joinPolicy === "request" ? "request" : "open";
      const minLevel = Math.max(1, Math.min(50, Number(a.minLevel) || 1));
      const description = cleanUserText(typeof a.description === "string" ? a.description : "", 400);
      await db.update(coops).set({ joinPolicy, minLevel, description }).where(eq(coops.id, member.coopId));
      message = "Настройки кооператива сохранены";
    } else if (type === "chat") {
      if (!member) throw new GameError("Вы не в кооперативе");
      const chatLimited = await checkRateLimit(`coopchat:${user.id}`, 40, 60_000);
      if (!chatLimited.allowed) throw new GameError("Вы пишете слишком часто. Подождите немного");
      if (user.mutedUntil && user.mutedUntil.getTime() > Date.now()) throw new GameError("Вы заглушены");
      const body = txt(a.body, 1, 400, "Сообщение");
      await db.insert(coopChat).values({ coopId: member.coopId, userId: user.id, body });
      message = "Отправлено";
    } else if (type === "treasury-gift") {
      if (member?.role !== "leader") throw new GameError("Только лидер");
      const targetId = id(a.userId);
      const amount = Number(a.amount);
      if (!Number.isInteger(amount) || amount < 10 || amount > 100_000) throw new GameError("Сумма от 10 до 100000");
      const [target] = await db.select().from(coopMembers).where(and(eq(coopMembers.userId, targetId), eq(coopMembers.coopId, member.coopId))).limit(1);
      if (!target) throw new GameError("Игрок не в кооперативе");
      const paid = await db.update(coops).set({ treasuryCoins: sql`${coops.treasuryCoins} - ${amount}` }).where(and(eq(coops.id, member.coopId), sql`${coops.treasuryCoins} >= ${amount}`)).returning({ id: coops.id });
      if (!paid.length) throw new GameError("В казне недостаточно монет");
      const targetState = await loadGame(targetId);
      targetState.coins += amount;
      await saveGame(targetId, targetState);
      await db.insert(mailMessages).values({ recipientId: targetId, subject: "Премия кооператива", body: `Лидер выдал вам премию ${amount} монет из казны кооператива.`, kind: "coop" });
      message = `Премия ${amount} монет выдана`;
    } else {
      throw new GameError("Неизвестное действие");
    }
    return NextResponse.json({ ok: true, message, state });
  } catch (error) {
    if (error instanceof GameError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("Coop failed", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
