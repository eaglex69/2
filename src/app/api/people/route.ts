import { NextResponse } from "next/server";
import { and, count, eq, gt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { friendships, mailMessages, socialInteractions, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { ITEMS } from "@/lib/game-config";
import { GameError, addItem, removeItem } from "@/lib/game-engine";
import { loadGame, saveGameTx } from "@/lib/game-store";
import { withUserLock } from "@/lib/mutex";
import { checkRateLimit } from "@/lib/rate-limit";
import { assertSameOrigin, isUniqueViolation, readJson } from "@/lib/request-guard";
import { cleanUserText } from "@/lib/text-safety";

export const dynamic = "force-dynamic";

async function profileData(viewerId: number, targetId: number) {
  const [target] = await db.select({ id: users.id, username: users.username, displayName: users.displayName, avatar: users.avatar, bio: users.bio, profileFrame: users.profileFrame, cover: users.cover, createdAt: users.createdAt, lastSeen: users.lastSeen, role: users.role, profile: users.profile }).from(users).where(eq(users.id, targetId)).limit(1);
  if (!target) throw new GameError("Игрок не найден");
  const state = await loadGame(targetId);
  const result = await db.execute(sql`select
    (select count(*) from social_interactions where to_user_id = ${targetId} and kind = 'like')::int as likes,
    (select count(*) from social_interactions where to_user_id = ${targetId} and kind = 'gift')::int as gifts,
    (select count(*) from friendships where status = 'accepted' and (requester_id = ${targetId} or addressee_id = ${targetId}))::int as friends,
    (select count(*) from social_interactions where from_user_id = ${viewerId} and to_user_id = ${targetId} and kind = 'like')::int as "likedByMe",
    (select status from friendships where (requester_id = ${viewerId} and addressee_id = ${targetId}) or (requester_id = ${targetId} and addressee_id = ${viewerId}) limit 1) as "friendStatus",
    (select c.name from coop_members m join coops c on c.id = m.coop_id where m.user_id = ${targetId}) as "coopName",
    (select c.tag from coop_members m join coops c on c.id = m.coop_id where m.user_id = ${targetId}) as "coopTag"`);
  const gifts = await db.execute(sql`select s.id, s.item_key as "itemKey", s.quantity, s.note, s.created_at as "createdAt", u.display_name as "fromName", u.id as "fromId", u.avatar as "fromAvatar"
    from social_interactions s join users u on u.id = s.from_user_id where s.to_user_id = ${targetId} and s.kind = 'gift' order by s.created_at desc limit 12`);
  const recentGifts = viewerId === targetId ? gifts.rows : gifts.rows.slice(0, 6);
  if (viewerId !== targetId) {
    await db.execute(sql`insert into profile_visits (owner_id, visitor_id, visits, visited_at) values (${targetId}, ${viewerId}, 1, now())
      on conflict (owner_id, visitor_id) do update set visits = CASE WHEN profile_visits.visited_at < now() - interval '1 hour' THEN profile_visits.visits + 1 ELSE profile_visits.visits END, visited_at = now()`);
  }
  const visitRows = await db.execute(sql`select
    (select coalesce(sum(visits), 0) from profile_visits where owner_id = ${targetId})::int as total,
    (select count(*) from profile_visits where owner_id = ${targetId} and visited_at > now() - interval '7 days')::int as recent`);
  const guests = await db.execute(sql`select v.visitor_id as id, u.display_name as "displayName", u.avatar, v.visits, v.visited_at as "visitedAt"
    from profile_visits v join users u on u.id = v.visitor_id where v.owner_id = ${targetId} order by v.visited_at desc limit 30`);
  const rankRows = await db.execute(sql`with ranked as (
      select f.user_id, row_number() over (order by coalesce((f.data->>'level')::int,1) desc, coalesce((f.data->>'xp')::int,0) desc, f.user_id) as place
      from farm_states f join users u on u.id = f.user_id where u.banned_at is null)
    select (select place from ranked where user_id = ${targetId})::int as place, (select count(*) from ranked)::int as total`);
  const visits = visitRows.rows[0] as { total: number; recent: number };
  const rank = rankRows.rows[0] as { place: number | null; total: number };
  return {
    user: target, state, stats: result.rows[0], gifts: recentGifts, isSelf: viewerId === targetId,
    visits: { total: visits?.total ?? 0, recent: visits?.recent ?? 0, guests: viewerId === targetId ? guests.rows : guests.rows.slice(0, 8) },
    rank: { place: rank?.place ?? 0, total: rank?.total ?? 0 },
    serverTime: Date.now(),
  };
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Нужно войти" }, { status: 401 });
  if (user.bannedAt) return NextResponse.json({ error: "Аккаунт заблокирован" }, { status: 403 });
  try {
    const url = new URL(request.url);
    const id = Number(url.searchParams.get("id") ?? user.id);
    if (!Number.isInteger(id) || id < 1) throw new GameError("Некорректный ID");
    return NextResponse.json(await profileData(user.id, id));
  } catch (error) {
    if (error instanceof GameError) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: "Ошибка загрузки профиля" }, { status: 500 });
  }
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
    const targetId = Number(a.id);
    if (!Number.isInteger(targetId) || targetId < 1) throw new GameError("Некорректный ID");
    const [target] = await db.select({ id: users.id, displayName: users.displayName }).from(users).where(eq(users.id, targetId)).limit(1);
    if (!target) throw new GameError("Игрок не найден");
    if (targetId === user.id) throw new GameError("Нельзя отправить себе");
    const type = a.type;
    if (type === "like") {
      const limited = await checkRateLimit(`like:${user.id}`, 60, 3_600_000);
      if (!limited.allowed) throw new GameError("Слишком много симпатий. Попробуйте позже");
      const existing = await db.select({ id: socialInteractions.id }).from(socialInteractions).where(and(eq(socialInteractions.fromUserId, user.id), eq(socialInteractions.toUserId, targetId), eq(socialInteractions.kind, "like"))).limit(1);
      if (existing.length) {
        await db.delete(socialInteractions).where(eq(socialInteractions.id, existing[0].id));
        return NextResponse.json({ ok: true, message: "Симпатия убрана", liked: false });
      }
      try {
        await db.insert(socialInteractions).values({ fromUserId: user.id, toUserId: targetId, kind: "like" });
      } catch (error) {
        if (isUniqueViolation(error)) return NextResponse.json({ ok: true, message: "Симпатия отправлена", liked: true });
        throw error;
      }
      const recentMail = await db.select({ id: mailMessages.id }).from(mailMessages).where(and(eq(mailMessages.recipientId, targetId), eq(mailMessages.senderId, user.id), eq(mailMessages.subject, "Вам симпатия"), gt(mailMessages.createdAt, new Date(Date.now() - 86_400_000)))).limit(1);
      if (!recentMail.length) {
        await db.insert(mailMessages).values({ recipientId: targetId, senderId: user.id, subject: "Вам симпатия", body: `${user.displayName} отметил(а) вашу ферму симпатией. Загляните в гости!`, kind: "social" });
      }
      return NextResponse.json({ ok: true, message: "Симпатия отправлена", liked: true });
    }
    if (type === "gift") {
      const item = typeof a.item === "string" ? a.item : "";
      const quantity = Number(a.quantity);
      if (!ITEMS[item] || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) throw new GameError("Некорректный подарок");
      const note = cleanUserText(typeof a.note === "string" ? a.note : "", 160);
      const giftLimited = await checkRateLimit(`gift:${user.id}`, 30, 3_600_000);
      if (!giftLimited.allowed) throw new GameError("Слишком много подарков. Попробуйте позже");
      const inboxCount = await db.select({ value: count() }).from(mailMessages).where(eq(mailMessages.recipientId, targetId));
      if ((inboxCount[0]?.value ?? 0) >= 1000) throw new GameError("Почтовый ящик получателя переполнен");
      const state = await loadGame(user.id);
      removeItem(state, item, quantity);
      await db.transaction(async (tx) => {
        await saveGameTx(tx, user.id, state);
        await tx.insert(socialInteractions).values({ fromUserId: user.id, toUserId: targetId, kind: "gift", itemKey: item, quantity, note });
        await tx.insert(mailMessages).values({ recipientId: targetId, senderId: user.id, subject: `Подарок от ${user.displayName}`, body: note || `${user.displayName} отправил(а) вам подарок с фермы. Примите вложение ниже.`, kind: "gift", payload: { items: { [item]: quantity } } });
      });
      return NextResponse.json({ ok: true, message: `Подарок отправлен: ${ITEMS[item].name} ×${quantity}`, state });
    }
    if (type === "friend") {
      const friendLimited = await checkRateLimit(`friend:${user.id}`, 30, 3_600_000);
      if (!friendLimited.allowed) throw new GameError("Слишком много заявок. Попробуйте позже");
      const existing = await db.select({ id: friendships.id }).from(friendships).where(or(and(eq(friendships.requesterId, user.id), eq(friendships.addresseeId, targetId)), and(eq(friendships.requesterId, targetId), eq(friendships.addresseeId, user.id)))).limit(1);
      if (existing.length) throw new GameError("Заявка или дружба уже существует");
      try {
        await db.insert(friendships).values({ requesterId: user.id, addresseeId: targetId });
      } catch (error) {
        if (isUniqueViolation(error)) throw new GameError("Заявка или дружба уже существует");
        throw error;
      }
      return NextResponse.json({ ok: true, message: "Заявка в друзья отправлена" });
    }
    throw new GameError("Неизвестное действие");
  } catch (error) {
    if (error instanceof GameError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("People failed", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
