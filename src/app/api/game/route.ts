import { NextResponse } from "next/server";
import { and, count, countDistinct, desc, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { farmStates, forumTopics, mailMessages, marketListings, newsPosts, promoCodes, promoRedemptions, users } from "@/db/schema";
import { getSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth";
import { ITEMS } from "@/lib/game-config";
import { addItem, applyGameAction, GameError, prepareGameState, removeItem, trackActivity, type GameAction } from "@/lib/game-engine";
import { loadGame, saveGame } from "@/lib/game-store";
import { settleWorkers } from "@/lib/workers";
import { cleanProfile } from "@/lib/profile-fields";
import { getEconomy } from "@/lib/economy";
import { settleWeeklyRewards } from "@/lib/weekly";
import { ensureContent, contentSnapshot } from "@/lib/content-server";
import { getDesign, designCss, saveAsset } from "@/lib/design";
import { AVATARS, DEFAULT_AVATARS } from "@/lib/avatars";
import { COVERS, COVER_UPLOAD_GEMS, DEFAULT_COVERS, customCoverId } from "@/lib/covers";
import { destroyOtherSessions, hashPassword, verifyPassword } from "@/lib/auth";
import { withUserLock } from "@/lib/mutex";
import { checkRateLimit } from "@/lib/rate-limit";
import { assertSameOrigin, readJson, strictNumber } from "@/lib/request-guard";
import { cleanUserText } from "@/lib/text-safety";

export const dynamic = "force-dynamic";

function validAmount(value: unknown, max = 9999) {
  const amount = strictNumber(value);
  if (amount === null || !Number.isInteger(amount) || amount < 1 || amount > max) throw new GameError("Некорректное количество");
  return amount;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Нужно войти в игру" }, { status: 401 });
  if (user.bannedAt) return NextResponse.json({ error: "Аккаунт заблокирован" }, { status: 403 });
  await ensureContent();
  await settleWeeklyRewards().catch(() => undefined);
  const settings = await getSettings();
  if (settings.maintenance && user.role !== "admin") {
    return NextResponse.json({ error: settings.maintenanceText || "Идут технические работы. Скоро вернёмся!", maintenance: true }, { status: 503 });
  }
  const now = Date.now();
  const state = await loadGame(user.id, now);
  await settleWorkers(state, user.id, now);
  trackActivity(state, now);
  await Promise.all([
    saveGame(user.id, state),
    db.update(users).set({ lastSeen: new Date(now) }).where(eq(users.id, user.id)),
  ]);
  const [market, onlineRows, unreadRows, latestTopics, newsRows, bankerRows] = await Promise.all([
    db.select({
      id: marketListings.id,
      sellerId: marketListings.sellerId,
      sellerName: users.displayName,
      itemKey: marketListings.itemKey,
      quantity: marketListings.quantity,
      unitPrice: marketListings.unitPrice,
      createdAt: marketListings.createdAt,
    }).from(marketListings).innerJoin(users, eq(users.id, marketListings.sellerId))
      .where(eq(marketListings.status, "active")).orderBy(desc(marketListings.createdAt)).limit(40),
    db.select({ value: countDistinct(users.id) }).from(users).where(gt(users.lastSeen, new Date(now - 300_000))),
    db.select({ value: count() }).from(mailMessages).where(and(eq(mailMessages.recipientId, user.id), eq(mailMessages.isRead, false))),
    db.select({ id: forumTopics.id, title: forumTopics.title, author: users.displayName, username: users.username, updatedAt: forumTopics.updatedAt })
      .from(forumTopics).innerJoin(users, eq(users.id, forumTopics.userId)).orderBy(desc(forumTopics.updatedAt)).limit(5),
    db.select().from(newsPosts).orderBy(desc(newsPosts.createdAt)).limit(20),
    db.select({ id: users.id, username: users.username, displayName: users.displayName }).from(users).where(eq(users.id, 1)).limit(1).then(async (rows) => {
      if (rows[0]) return rows;
      return db.select({ id: users.id, username: users.username, displayName: users.displayName }).from(users).where(eq(users.role, "admin")).orderBy(users.id).limit(1);
    }),
  ]);
  return NextResponse.json({
    user,
    state,
    market,
    online: onlineRows[0]?.value ?? 1,
    unreadMail: unreadRows[0]?.value ?? 0,
    latestTopics,
    news: newsRows,
    banner: settings.banner,
    content: contentSnapshot().content,
    balance: contentSnapshot().balance,
    bonuses: contentSnapshot().bonuses,
    design: await getDesign(),
    banker: bankerRows[0] ? { id: bankerRows[0].id, username: bankerRows[0].username, displayName: bankerRows[0].displayName } : { id: 1, username: "ADMIN", displayName: "ADMIN" },
    serverTime: now,
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
  if (!user) return NextResponse.json({ error: "Нужно войти в игру" }, { status: 401 });
  if (user.bannedAt) return NextResponse.json({ error: "Аккаунт заблокирован" }, { status: 403 });
  const flood = await checkRateLimit(`game:${user.id}`, 300, 60_000);
  if (!flood.allowed) return NextResponse.json({ error: "Слишком много действий. Подождите несколько секунд" }, { status: 429 });
  return withUserLock(user.id, () => handlePOST(request));
}

async function handlePOST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Нужно войти в игру" }, { status: 401 });
  try {
    const action = await readJson(request) as GameAction;
    if (typeof action.type !== "string") throw new GameError("Пустое действие");
    if (user.role !== "admin" && (await getSettings()).maintenance) throw new GameError("Идут технические работы. Попробуйте позже");
    const now = Date.now();
    const state = await loadGame(user.id, now);
    trackActivity(state, now);
    let message = "Готово";
    let saved = false;

    await ensureContent();
    if (action.type === "avatar-upload") {
      const data = typeof action.data === "string" ? action.data : "";
      if (state.gems < 3) throw new GameError("Своя картинка стоит 3 алмаза");
      try { await saveAsset(`avatar:${user.id}`, data); } catch (error) { throw new GameError(error instanceof Error ? error.message : "Ошибка загрузки"); }
      state.gems -= 3;
      if (!state.claimedPromos.includes("avatar:custom")) state.claimedPromos.push("avatar:custom");
      await db.update(users).set({ avatar: `custom-${user.id}` }).where(eq(users.id, user.id));
      user.avatar = `custom-${user.id}`;
      await saveGame(user.id, state);
      saved = true;
      message = "Ваша картинка установлена как аватар за 3 алмаза";
    } else if (action.type === "market-list") {
      const itemKey = typeof action.item === "string" ? action.item : "";
      const activeCount = await db.select({ value: count() }).from(marketListings).where(and(eq(marketListings.sellerId, user.id), eq(marketListings.status, "active")));
      if ((activeCount[0]?.value ?? 0) >= 20) throw new GameError("Максимум 20 активных лотов. Снимите старые");
      const quantity = validAmount(action.quantity);
      const unitPrice = validAmount(action.unitPrice, 100_000);
      if (!ITEMS[itemKey]) throw new GameError("Предмет не найден");
      removeItem(state, itemKey, quantity);
      await db.insert(marketListings).values({ sellerId: user.id, itemKey, quantity, unitPrice });
      await saveGame(user.id, state);
      saved = true;
      message = `Лот создан: ${ITEMS[itemKey].name} ×${quantity}`;
    } else if (action.type === "market-cancel") {
      const id = validAmount(action.id, 1_000_000_000);
      const [listing] = await db.select().from(marketListings).where(and(
        eq(marketListings.id, id), eq(marketListings.sellerId, user.id), eq(marketListings.status, "active"),
      )).limit(1);
      if (!listing) throw new GameError("Активный лот не найден");
      addItem(state, listing.itemKey, listing.quantity);
      await db.update(marketListings).set({ status: "cancelled" }).where(eq(marketListings.id, id));
      await saveGame(user.id, state);
      saved = true;
      message = "Лот снят, товар возвращён в амбар";
    } else if (action.type === "market-buy") {
      const id = validAmount(action.id, 1_000_000_000);
      await db.transaction(async (tx) => {
        const [listing] = await tx.select().from(marketListings).where(and(
          eq(marketListings.id, id), eq(marketListings.status, "active"),
        )).limit(1);
        if (!listing) throw new GameError("Лот уже продан или снят");
        if (listing.sellerId === user.id) throw new GameError("Свой лот можно снять, но не купить");
        for (const lockId of [user.id, listing.sellerId].sort((a, b) => a - b)) {
          await tx.execute(sql`SELECT data FROM farm_states WHERE user_id = ${lockId} FOR UPDATE`);
        }
        const total = listing.quantity * listing.unitPrice;
        if (state.coins < total) throw new GameError(`Нужно ${total} монет`);
        addItem(state, listing.itemKey, listing.quantity);
        const [sellerRow] = await tx.select({ data: farmStates.data }).from(farmStates).where(eq(farmStates.userId, listing.sellerId)).limit(1);
        const sellerState = prepareGameState(sellerRow?.data, listing.sellerId, now);
        const payout = Math.floor(total * 0.95);
        state.coins -= total;
        sellerState.coins += payout;
        sellerState.stats.earned += payout;
        const updated = await tx.update(marketListings).set({ status: "sold", buyerId: user.id })
          .where(and(eq(marketListings.id, id), eq(marketListings.status, "active"))).returning({ id: marketListings.id });
        if (!updated.length) throw new GameError("Лот только что купил другой игрок");
        await tx.insert(farmStates).values({ userId: user.id, data: state }).onConflictDoUpdate({
          target: farmStates.userId, set: { data: state, updatedAt: new Date(now) },
        });
        await tx.insert(farmStates).values({ userId: listing.sellerId, data: sellerState }).onConflictDoUpdate({
          target: farmStates.userId, set: { data: sellerState, updatedAt: new Date(now) },
        });
        await tx.insert(mailMessages).values({
          recipientId: listing.sellerId,
          subject: "Лот продан на рынке",
          body: `${user.displayName} купил «${ITEMS[listing.itemKey]?.name ?? listing.itemKey}» ×${listing.quantity}. После комиссии рынка 5% вам начислено ${payout} монет.`,
          kind: "market",
        });
        message = `Куплено за ${total} монет: ${ITEMS[listing.itemKey].name} ×${listing.quantity}`;
        saved = true;
      });
    } else if (action.type === "promo-redeem") {
      const promoLimited = await checkRateLimit(`promo:${user.id}`, 15, 3_600_000);
      if (!promoLimited.allowed) throw new GameError("Слишком много попыток. Попробуйте позже");
      const code = typeof action.code === "string" ? action.code.trim().toUpperCase() : "";
      if (!code) throw new GameError("Введите промокод");
      await db.transaction(async (tx) => {
        const [promo] = await tx.select().from(promoCodes).where(eq(promoCodes.code, code)).limit(1);
        if (!promo || !promo.active) throw new GameError("Промокод не найден или отключён");
        if (promo.expiresAt && promo.expiresAt.getTime() < now) throw new GameError("Срок действия промокода истёк");
        const used = await tx.select({ id: promoRedemptions.id }).from(promoRedemptions)
          .where(and(eq(promoRedemptions.codeId, promo.id), eq(promoRedemptions.userId, user.id))).limit(1);
        if (used.length) throw new GameError("Вы уже активировали этот промокод");
        const bumped = await tx.update(promoCodes).set({ uses: sql`${promoCodes.uses} + 1` })
          .where(and(eq(promoCodes.id, promo.id), sql`(${promoCodes.maxUses} = 0 or ${promoCodes.uses} < ${promoCodes.maxUses})`))
          .returning({ id: promoCodes.id });
        if (!bumped.length) throw new GameError("Лимит активаций промокода исчерпан");
        const items = (promo.items ?? {}) as Record<string, number>;
        for (const [key, quantity] of Object.entries(items)) addItem(state, key, Number(quantity));
        state.coins += promo.coins;
        state.gems += promo.gems;
        await tx.insert(promoRedemptions).values({ codeId: promo.id, userId: user.id });
        await tx.insert(farmStates).values({ userId: user.id, data: state }).onConflictDoUpdate({
          target: farmStates.userId, set: { data: state, updatedAt: new Date(now) },
        });
        const parts = [promo.coins ? `${promo.coins} монет` : "", promo.gems ? `${promo.gems} алмазов` : "", ...Object.entries(items).map(([key, quantity]) => `${ITEMS[key]?.name ?? key} ×${quantity}`)].filter(Boolean);
        message = `Промокод активирован: ${parts.join(", ") || "бонус получен"}`;
        saved = true;
      });
    } else if (action.type === "avatar-buy") {
      const key = typeof action.avatar === "string" ? action.avatar : "";
      const config = AVATARS[key];
      if (!config || DEFAULT_AVATARS.includes(key)) throw new GameError("Этот аватар нельзя купить");
      if (state.level < config.level) throw new GameError(`Аватар откроется на ${config.level} уровне`);
      const owned = state.claimedPromos.includes(`avatar:${key}`);
      if (owned) throw new GameError("Аватар уже куплен");
      if (config.coins && state.coins < config.coins) throw new GameError(`Нужно ${config.coins} монет`);
      if (config.gems && state.gems < config.gems) throw new GameError(`Нужно ${config.gems} алмазов`);
      if (config.coins) state.coins -= config.coins;
      if (config.gems) state.gems -= config.gems;
      state.claimedPromos.push(`avatar:${key}`);
      await db.update(users).set({ avatar: key }).where(eq(users.id, user.id));
      user.avatar = key;
      await saveGame(user.id, state);
      saved = true;
      message = `Аватар «${config.name}» куплен и установлен`;
    } else if (action.type === "avatar-equip") {
      const key = typeof action.avatar === "string" ? action.avatar : "";
      if (key === "custom") {
        if (!state.claimedPromos.includes("avatar:custom")) throw new GameError("Сначала загрузите свою картинку");
        await db.update(users).set({ avatar: `custom-${user.id}` }).where(eq(users.id, user.id));
        user.avatar = `custom-${user.id}`;
        message = "Своя картинка установлена";
      }
      if (!AVATARS[key]) throw new GameError("Аватар не найден");
      if (!DEFAULT_AVATARS.includes(key) && !state.claimedPromos.includes(`avatar:${key}`)) throw new GameError("Сначала купите этот аватар");
      await db.update(users).set({ avatar: key }).where(eq(users.id, user.id));
      user.avatar = key;
      message = `Аватар «${AVATARS[key].name}» установлен`;
    } else if (action.type === "cover-upload") {
      const data = typeof action.data === "string" ? action.data : "";
      if (state.gems < COVER_UPLOAD_GEMS) throw new GameError(`Своя обложка стоит ${COVER_UPLOAD_GEMS} алмазов`);
      try { await saveAsset(`cover:${user.id}`, data); } catch (error) { throw new GameError(error instanceof Error ? error.message : "Ошибка загрузки"); }
      state.gems -= COVER_UPLOAD_GEMS;
      if (!state.claimedPromos.includes("cover:custom")) state.claimedPromos.push("cover:custom");
      await db.update(users).set({ cover: `custom:${user.id}` }).where(eq(users.id, user.id));
      user.cover = `custom:${user.id}`;
      await saveGame(user.id, state);
      saved = true;
      message = `Ваша картинка установлена как обложка за ${COVER_UPLOAD_GEMS} алмазов`;
    } else if (action.type === "cover-buy") {
      const key = typeof action.cover === "string" ? action.cover : "";
      if (key === "custom") throw new GameError("Свою обложку загружают кнопкой «Загрузить свою»");
      const config = COVERS[key];
      if (!config || DEFAULT_COVERS.includes(key)) throw new GameError("Эту обложку нельзя купить");
      if (state.claimedPromos.includes(`cover:${key}`)) throw new GameError("Обложка уже куплена");
      if (state.gems < config.gems) throw new GameError(`Нужно ${config.gems} алмазов`);
      state.gems -= config.gems;
      state.claimedPromos.push(`cover:${key}`);
      await db.update(users).set({ cover: key }).where(eq(users.id, user.id));
      user.cover = key;
      await saveGame(user.id, state);
      saved = true;
      message = `Обложка «${config.name}» куплена и установлена`;
    } else if (action.type === "cover-equip") {
      const key = typeof action.cover === "string" ? action.cover : "";
      if (key === "custom") {
        if (!state.claimedPromos.includes("cover:custom")) throw new GameError("Сначала загрузите свою картинку");
        await db.update(users).set({ cover: `custom:${user.id}` }).where(eq(users.id, user.id));
        user.cover = `custom:${user.id}`;
        message = "Своя обложка установлена";
      }
      if (!COVERS[key]) throw new GameError("Обложка не найдена");
      if (!DEFAULT_COVERS.includes(key) && !state.claimedPromos.includes(`cover:${key}`)) throw new GameError("Сначала купите эту обложку");
      await db.update(users).set({ cover: key === "default" ? "" : key }).where(eq(users.id, user.id));
      user.cover = key === "default" ? "" : key;
      message = `Обложка «${COVERS[key].name}» установлена`;
    } else if (action.type === "password-change") {
      const passLimited = await checkRateLimit(`passchange:${user.id}`, 6, 900_000);
      if (!passLimited.allowed) throw new GameError("Слишком много попыток смены пароля. Подождите 15 минут");
      const current = typeof action.current === "string" ? action.current : "";
      const next = typeof action.next === "string" ? action.next : "";
      if (next.length < 6 || next.length > 72) throw new GameError("Новый пароль: от 6 до 72 символов");
      if (current === next) throw new GameError("Новый пароль совпадает со старым");
      const [row] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, user.id)).limit(1);
      if (!row || !(await verifyPassword(current, row.passwordHash))) throw new GameError("Текущий пароль указан неверно");
      await db.update(users).set({ passwordHash: await hashPassword(next) }).where(eq(users.id, user.id));
      await destroyOtherSessions(user.id);
      message = "Пароль изменён. Другие устройства вышли из аккаунта";
    } else if (action.type === "profile-update") {
      const profileLimited = await checkRateLimit(`profile:${user.id}`, 20, 3_600_000);
      if (!profileLimited.allowed) throw new GameError("Слишком частая смена профиля. Попробуйте позже");
      const displayName = cleanUserText(typeof action.displayName === "string" ? action.displayName : "", 32).replace(/\s+/g, " ");
      if (displayName.length < 2) throw new GameError("Имя должно содержать 2–32 символа");
      const bio = typeof action.bio === "string" ? cleanUserText(action.bio, 200) : user.bio;
      const frame = ["wood", "gold", "leaf", "sky"].includes(String(action.frame)) ? String(action.frame) : user.profileFrame;
      const profile = cleanProfile(action.profile);
      await db.update(users).set({ displayName, bio, profileFrame: frame, profile }).where(eq(users.id, user.id));
      user.displayName = displayName;
      user.bio = bio;
      user.profileFrame = frame;
      user.profile = profile;
      message = "Профиль обновлён";
    } else {
      // Цены строек и техники задаются в админке и передаются в движок.
      const economy = await getEconomy();
      const result = applyGameAction(state, action, now, Math.random, economy);
      await saveGame(user.id, result.state);
      saved = true;
      message = result.message;
    }
    if (!saved) await saveGame(user.id, state);
    await db.update(users).set({ lastSeen: new Date(now) }).where(eq(users.id, user.id));
    return NextResponse.json({ ok: true, message, state, user });
  } catch (error) {
    if (error instanceof GameError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("Game action failed", error);
    return NextResponse.json({ error: "Не удалось выполнить действие. Попробуйте ещё раз" }, { status: 500 });
  }
}
