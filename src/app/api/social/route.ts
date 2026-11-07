import { NextResponse } from "next/server";
import { and, count, desc, eq, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import {
  chatMessages,
  forumReplies,
  forumTopics,
  friendships,
  mailMessages,
  newspaperPosts,
  tickets,
  users,
} from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { barnCapacity, inventoryVolume, ITEMS } from "@/lib/game-config";
import { GameError, type GameState } from "@/lib/game-engine";
import { loadGame, saveGame, saveGameTx } from "@/lib/game-store";
import { getSettings } from "@/lib/settings";
import { withUserLock } from "@/lib/mutex";
import { checkRateLimit } from "@/lib/rate-limit";
import { assertSameOrigin, isUniqueViolation, readJson, strictNumber } from "@/lib/request-guard";
import { cleanUserText } from "@/lib/text-safety";

export const dynamic = "force-dynamic";

function amount(value: unknown, max = 9999) {
  const result = strictNumber(value);
  if (result === null || !Number.isInteger(result) || result < 1 || result > max) throw new GameError("Некорректное количество");
  return result;
}

async function spamLimit(key: string, limit: number, windowMs: number, message: string) {
  const { allowed } = await checkRateLimit(key, limit, windowMs);
  if (!allowed) throw new GameError(message);
}

function clean(value: unknown, min: number, max: number, label: string) {
  if (typeof value !== "string") throw new GameError(`Заполните поле «${label}»`);
  const result = cleanUserText(value, max);
  if (result.length < min) throw new GameError(`${label}: от ${min} до ${max} символов`);
  return result;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Нужно войти" }, { status: 401 });
  if (user.bannedAt) return NextResponse.json({ error: "Аккаунт заблокирован" }, { status: 403 });
  const senders = alias(users, "senders");
  const requesters = alias(users, "requesters");
  const addressees = alias(users, "addressees");
  const [chatDesc, topicRows, replyRows, replyCounts, inbox, sent, friendRows, newspaper, ticketRows] = await Promise.all([
    db.select({ id: chatMessages.id, userId: chatMessages.userId, body: chatMessages.body, createdAt: chatMessages.createdAt, author: users.displayName, username: users.username, avatar: users.avatar })
      .from(chatMessages).innerJoin(users, eq(users.id, chatMessages.userId)).orderBy(desc(chatMessages.createdAt)).limit(60),
    db.select({ id: forumTopics.id, title: forumTopics.title, body: forumTopics.body, category: forumTopics.category, createdAt: forumTopics.createdAt, updatedAt: forumTopics.updatedAt, userId: forumTopics.userId, author: users.displayName, username: users.username })
      .from(forumTopics).innerJoin(users, eq(users.id, forumTopics.userId)).orderBy(desc(forumTopics.updatedAt)).limit(50),
    db.select({ id: forumReplies.id, topicId: forumReplies.topicId, body: forumReplies.body, createdAt: forumReplies.createdAt, userId: forumReplies.userId, author: users.displayName, username: users.username })
      .from(forumReplies).innerJoin(users, eq(users.id, forumReplies.userId)).orderBy(desc(forumReplies.createdAt)).limit(300),
    db.select({ topicId: forumReplies.topicId, value: count() }).from(forumReplies).groupBy(forumReplies.topicId),
    db.select({ id: mailMessages.id, senderId: mailMessages.senderId, senderName: senders.displayName, subject: mailMessages.subject, body: mailMessages.body, kind: mailMessages.kind, payload: mailMessages.payload, isRead: mailMessages.isRead, claimedAt: mailMessages.claimedAt, createdAt: mailMessages.createdAt })
      .from(mailMessages).leftJoin(senders, eq(senders.id, mailMessages.senderId)).where(eq(mailMessages.recipientId, user.id)).orderBy(desc(mailMessages.createdAt)).limit(80),
    db.select({ id: mailMessages.id, recipientId: mailMessages.recipientId, subject: mailMessages.subject, body: mailMessages.body, payload: mailMessages.payload, createdAt: mailMessages.createdAt })
      .from(mailMessages).where(eq(mailMessages.senderId, user.id)).orderBy(desc(mailMessages.createdAt)).limit(40),
    db.select({ id: friendships.id, requesterId: friendships.requesterId, addresseeId: friendships.addresseeId, status: friendships.status, requesterName: requesters.displayName, addresseeName: addressees.displayName, requesterUsername: requesters.username, addresseeUsername: addressees.username })
      .from(friendships).innerJoin(requesters, eq(requesters.id, friendships.requesterId)).innerJoin(addressees, eq(addressees.id, friendships.addresseeId))
      .where(or(eq(friendships.requesterId, user.id), eq(friendships.addresseeId, user.id))).orderBy(desc(friendships.createdAt)),
    db.select({ id: newspaperPosts.id, kind: newspaperPosts.kind, title: newspaperPosts.title, body: newspaperPosts.body, createdAt: newspaperPosts.createdAt, author: users.displayName, username: users.username })
      .from(newspaperPosts).innerJoin(users, eq(users.id, newspaperPosts.userId)).orderBy(desc(newspaperPosts.createdAt)).limit(60),
    db.select().from(tickets).where(eq(tickets.userId, user.id)).orderBy(desc(tickets.createdAt)).limit(30),
  ]);
  const counts = new Map(replyCounts.map((row) => [row.topicId, row.value]));
  return NextResponse.json({
    chat: chatDesc.reverse(),
    topics: topicRows.map((topic) => ({ ...topic, replies: counts.get(topic.id) ?? 0 })),
    replies: replyRows.reverse(),
    inbox,
    sent,
    friends: friendRows,
    newspaper,
    tickets: ticketRows,
    serverTime: Date.now(),
  });
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
    const action = (await readJson(request)) as { type?: string; [key: string]: unknown };
    let message = "Готово";
    let state: GameState | undefined;

    if (["chat-send", "topic-create", "reply-create", "newspaper-create"].includes(action.type ?? "")) {
      if (user.mutedUntil && user.mutedUntil.getTime() > Date.now()) {
        throw new GameError(`Вам запрещено писать публично до ${new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(user.mutedUntil)}`);
      }
    }
    if (action.type === "chat-send" && !(await getSettings()).chatEnabled) throw new GameError("Чат временно отключён администрацией");

    if (action.type === "chat-send") {
      await spamLimit(`chat:${user.id}`, 25, 60_000, "Вы пишете слишком часто. Подождите немного");
      await spamLimit(`chatburst:${user.id}`, 1, 2_000, "Вы пишете слишком часто. Подождите немного");
      const body = clean(action.body, 1, 500, "Сообщение");
      await db.insert(chatMessages).values({ userId: user.id, body });
      message = "Сообщение отправлено";
    } else if (action.type === "topic-create") {
      await spamLimit(`topic:${user.id}`, 10, 3_600_000, "Слишком много тем. Попробуйте позже");
      const title = clean(action.title, 3, 100, "Заголовок");
      const body = clean(action.body, 3, 3000, "Текст темы");
      const category = typeof action.category === "string" && ["Общение", "Помощь", "Торговля", "Идеи"].includes(action.category) ? action.category : "Общение";
      await db.insert(forumTopics).values({ userId: user.id, title, body, category });
      message = "Тема опубликована";
    } else if (action.type === "reply-create") {
      await spamLimit(`reply:${user.id}`, 60, 3_600_000, "Слишком много ответов. Попробуйте позже");
      const topicId = amount(action.topicId, 1_000_000_000);
      const body = clean(action.body, 1, 2000, "Ответ");
      const [topic] = await db.select({ id: forumTopics.id }).from(forumTopics).where(eq(forumTopics.id, topicId)).limit(1);
      if (!topic) throw new GameError("Тема не найдена");
      await db.insert(forumReplies).values({ topicId, userId: user.id, body });
      await db.update(forumTopics).set({ updatedAt: new Date() }).where(eq(forumTopics.id, topicId));
      message = "Ответ добавлен";
    } else if (action.type === "friend-request") {
      await spamLimit(`friend:${user.id}`, 30, 3_600_000, "Слишком много заявок. Попробуйте позже");
      const username = clean(action.username, 3, 24, "Логин").toLowerCase();
      const [target] = await db.select({ id: users.id, displayName: users.displayName }).from(users).where(eq(users.username, username)).limit(1);
      if (!target) throw new GameError("Игрок с таким логином не найден");
      if (target.id === user.id) throw new GameError("Нельзя добавить самого себя");
      const existing = await db.select({ id: friendships.id }).from(friendships).where(or(
        and(eq(friendships.requesterId, user.id), eq(friendships.addresseeId, target.id)),
        and(eq(friendships.requesterId, target.id), eq(friendships.addresseeId, user.id)),
      )).limit(1);
      if (existing.length) throw new GameError("Заявка или дружба уже существует");
      try {
        await db.insert(friendships).values({ requesterId: user.id, addresseeId: target.id });
      } catch (error) {
        if (isUniqueViolation(error)) throw new GameError("Заявка или дружба уже существует");
        throw error;
      }
      await db.insert(mailMessages).values({ recipientId: target.id, senderId: user.id, subject: "Заявка в друзья", body: `${user.displayName} хочет добавить вас в друзья. Откройте раздел «Друзья», чтобы ответить.`, kind: "friend" });
      message = `Заявка отправлена игроку ${target.displayName}`;
    } else if (action.type === "friend-respond") {
      const id = amount(action.id, 1_000_000_000);
      const accept = action.accept === true;
      const [friendship] = await db.select().from(friendships).where(and(eq(friendships.id, id), eq(friendships.addresseeId, user.id), eq(friendships.status, "pending"))).limit(1);
      if (!friendship) throw new GameError("Заявка не найдена");
      await db.update(friendships).set({ status: accept ? "accepted" : "declined" }).where(eq(friendships.id, id));
      if (accept) await db.insert(mailMessages).values({ recipientId: friendship.requesterId, senderId: user.id, subject: "Заявка принята", body: `${user.displayName} принял вашу заявку в друзья. Теперь вы можете обмениваться письмами и подарками.`, kind: "friend" });
      message = accept ? "Теперь вы друзья" : "Заявка отклонена";
    } else if (action.type === "friend-remove") {
      const id = amount(action.id, 1_000_000_000);
      await db.delete(friendships).where(and(eq(friendships.id, id), or(eq(friendships.requesterId, user.id), eq(friendships.addresseeId, user.id))));
      message = "Запись о дружбе удалена";
    } else if (action.type === "mail-send") {
      await spamLimit(`mail:${user.id}`, 30, 3_600_000, "Слишком много писем. Попробуйте позже");
      const username = clean(action.username, 3, 24, "Логин").toLowerCase();
      const [target] = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
      if (!target) throw new GameError("Получатель не найден");
      const subject = clean(action.subject, 2, 100, "Тема");
      const body = clean(action.body, 1, 2000, "Письмо");
      const item = typeof action.item === "string" ? action.item : "";
      let payload: { items?: Record<string, number> } | null = null;
      const inboxCount = await db.select({ value: count() }).from(mailMessages).where(eq(mailMessages.recipientId, target.id));
      if ((inboxCount[0]?.value ?? 0) >= 1000) throw new GameError("Почтовый ящик получателя переполнен");
      if (item) {
        if (!ITEMS[item]) throw new GameError("Предмет не найден");
        const quantity = amount(action.quantity, 99);
        state = await loadGame(user.id);
        if ((state.inventory[item] ?? 0) < quantity) throw new GameError(`Недостаточно: ${ITEMS[item]?.name ?? item}`);
        state.inventory[item] -= quantity;
        if (state.inventory[item] <= 0) delete state.inventory[item];
        payload = { items: { [item]: quantity } };
        await db.transaction(async (tx) => {
          await saveGameTx(tx, user.id, state!);
          await tx.insert(mailMessages).values({ senderId: user.id, recipientId: target.id, subject, body, kind: "gift", payload });
        });
      } else {
        await db.insert(mailMessages).values({ senderId: user.id, recipientId: target.id, subject, body, kind: "letter", payload });
      }
      message = payload ? "Письмо и подарок отправлены" : "Письмо отправлено";
    } else if (action.type === "mail-read") {
      const id = amount(action.id, 1_000_000_000);
      await db.update(mailMessages).set({ isRead: true }).where(and(eq(mailMessages.id, id), eq(mailMessages.recipientId, user.id)));
      message = "Письмо прочитано";
    } else if (action.type === "mail-claim") {
      const id = amount(action.id, 1_000_000_000);
      state = await loadGame(user.id);
      await db.transaction(async (tx) => {
        const [mail] = await tx.select().from(mailMessages).where(and(eq(mailMessages.id, id), eq(mailMessages.recipientId, user.id))).limit(1);
        if (!mail) throw new GameError("Письмо не найдено");
        if (mail.claimedAt) throw new GameError("Вложение уже получено");
        const payload = mail.payload && typeof mail.payload === "object" ? mail.payload as { items?: Record<string, unknown>; coins?: unknown; gems?: unknown } : {};
        const additions: [string, number][] = [];
        const summary: string[] = [];
        if (payload.items) {
          for (const [key, value] of Object.entries(payload.items)) {
            const quantity = amount(value, 999);
            if (!ITEMS[key]) throw new GameError("Неизвестный предмет");
            additions.push([key, quantity]);
            summary.push(`${ITEMS[key]?.name ?? key} ×${quantity}`);
          }
        }
        const coins = payload.coins === undefined ? 0 : amount(payload.coins, 100_000);
        if (coins) summary.push(`${coins} монет`);
        const gems = payload.gems === undefined ? 0 : amount(payload.gems, 100_000);
        if (gems) summary.push(`${gems} алмазов`);
        if (!summary.length) throw new GameError("В этом письме нет вложения");
        const totalAdd = additions.reduce((sum, [, quantity]) => sum + quantity, 0);
        if (inventoryVolume(state!.inventory) + totalAdd > barnCapacity(state!.barnLevel)) {
          throw new GameError("Амбар переполнен. Продайте товар или расширьте хранилище");
        }
        for (const [key, quantity] of additions) state!.inventory[key] = (state!.inventory[key] ?? 0) + quantity;
        state!.coins += coins;
        state!.gems += gems;
        await saveGameTx(tx, user.id, state!);
        const updated = await tx.update(mailMessages).set({ claimedAt: new Date(), isRead: true }).where(and(eq(mailMessages.id, id), sql`claimed_at IS NULL`)).returning({ id: mailMessages.id });
        if (!updated.length) throw new GameError("Вложение уже получено");
        message = `Получено: ${summary.join(", ")}`;
      });
    } else if (action.type === "newspaper-create") {
      const kind = action.kind === "article" ? "article" : "ad";
      const title = clean(action.title, 3, 100, "Заголовок");
      const body = clean(action.body, 10, 1500, "Текст");
      state = await loadGame(user.id);
      if (kind === "article" && state.level < 3) throw new GameError("Статьи в газету доступны с 3 уровня");
      if (kind === "ad") {
        if (state.coins < 10) throw new GameError("Публикация объявления стоит 10 монет");
        state.coins -= 10;
        await saveGame(user.id, state);
      }
      await db.insert(newspaperPosts).values({ userId: user.id, kind, title, body });
      message = kind === "ad" ? "Объявление опубликовано за 10 монет" : "Статья опубликована";
    } else if (action.type === "ticket-create") {
      await spamLimit(`ticket:${user.id}`, 10, 3_600_000, "Слишком много обращений. Попробуйте позже");
      const category = typeof action.category === "string" && ["Предложение", "Пожелание", "Ошибка"].includes(action.category) ? action.category : "Предложение";
      const body = clean(action.body, 10, 2000, "Обращение");
      await db.insert(tickets).values({ userId: user.id, category, body });
      message = "Обращение отправлено. Его статус виден в списке ниже";
    } else {
      throw new GameError("Неизвестное действие");
    }
    return NextResponse.json({ ok: true, message, state });
  } catch (error) {
    if (error instanceof GameError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("Social action failed", error);
    return NextResponse.json({ error: "Не удалось выполнить действие" }, { status: 500 });
  }
}
