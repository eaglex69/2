import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 24 }).notNull().unique(),
  displayName: varchar("display_name", { length: 32 }).notNull(),
  passwordHash: text("password_hash").notNull(),
  avatar: varchar("avatar", { length: 20 }).notNull().default("sprout"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeen: timestamp("last_seen", { withTimezone: true }).notNull().defaultNow(),
  role: varchar("role", { length: 12 }).notNull().default("user"),
  bannedAt: timestamp("banned_at", { withTimezone: true }),
  banReason: varchar("ban_reason", { length: 200 }),
  mutedUntil: timestamp("muted_until", { withTimezone: true }),
  bio: varchar("bio", { length: 200 }).notNull().default(""),
  profileFrame: varchar("profile_frame", { length: 16 }).notNull().default("wood"),
  cover: varchar("cover", { length: 24 }).notNull().default(""),
  profile: jsonb("profile").notNull().default({}),
});

export const sessions = pgTable("sessions", {
  token: varchar("token", { length: 64 }).primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("sessions_expires_idx").on(table.expiresAt)]);

export const rateLimits = pgTable("rate_limits", {
  key: varchar("key", { length: 160 }).primaryKey(),
  count: integer("count").notNull().default(1),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull().defaultNow(),
});

export const farmStates = pgTable("farm_states", {
  userId: integer("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  data: jsonb("data").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const marketListings = pgTable(
  "market_listings",
  {
    id: serial("id").primaryKey(),
    sellerId: integer("seller_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    buyerId: integer("buyer_id").references(() => users.id, { onDelete: "set null" }),
    itemKey: varchar("item_key", { length: 40 }).notNull(),
    quantity: integer("quantity").notNull(),
    unitPrice: integer("unit_price").notNull(),
    status: varchar("status", { length: 16 }).notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("market_status_idx").on(table.status, table.createdAt)],
);

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: varchar("body", { length: 500 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("chat_created_idx").on(table.createdAt)],
);

export const forumTopics = pgTable("forum_topics", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  category: varchar("category", { length: 24 }).notNull().default("Общение"),
  title: varchar("title", { length: 100 }).notNull(),
  body: varchar("body", { length: 3000 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const forumReplies = pgTable("forum_replies", {
  id: serial("id").primaryKey(),
  topicId: integer("topic_id")
    .notNull()
    .references(() => forumTopics.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  body: varchar("body", { length: 2000 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const mailMessages = pgTable(
  "mail_messages",
  {
    id: serial("id").primaryKey(),
    senderId: integer("sender_id").references(() => users.id, { onDelete: "set null" }),
    recipientId: integer("recipient_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subject: varchar("subject", { length: 100 }).notNull(),
    body: varchar("body", { length: 2000 }).notNull(),
    kind: varchar("kind", { length: 20 }).notNull().default("letter"),
    payload: jsonb("payload"),
    isRead: boolean("is_read").notNull().default(false),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("mail_recipient_idx").on(table.recipientId, table.createdAt)],
);

export const friendships = pgTable(
  "friendships",
  {
    id: serial("id").primaryKey(),
    requesterId: integer("requester_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    addresseeId: integer("addressee_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 16 }).notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("friendship_pair_idx").on(table.requesterId, table.addresseeId),
    index("friendship_addressee_idx").on(table.addresseeId, table.status),
  ],
);

export const newspaperPosts = pgTable("newspaper_posts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  kind: varchar("kind", { length: 16 }).notNull().default("ad"),
  title: varchar("title", { length: 100 }).notNull(),
  body: varchar("body", { length: 1500 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  category: varchar("category", { length: 20 }).notNull(),
  body: varchar("body", { length: 2000 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("На рассмотрении"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const adminLogs = pgTable(
  "admin_logs",
  {
    id: serial("id").primaryKey(),
    adminId: integer("admin_id").references(() => users.id, { onDelete: "set null" }),
    adminName: varchar("admin_name", { length: 40 }).notNull().default(""),
    action: varchar("action", { length: 40 }).notNull(),
    target: varchar("target", { length: 120 }).notNull().default(""),
    details: text("details").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("admin_logs_created_idx").on(table.createdAt)],
);

export const gameSettings = pgTable("game_settings", {
  key: varchar("key", { length: 40 }).primaryKey(),
  value: text("value").notNull().default(""),
});

export const newsPosts = pgTable("news_posts", {
  id: serial("id").primaryKey(),
  tag: varchar("tag", { length: 24 }).notNull().default("Новости"),
  title: varchar("title", { length: 120 }).notNull(),
  body: varchar("body", { length: 4000 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const promoCodes = pgTable("promo_codes", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  coins: integer("coins").notNull().default(0),
  gems: integer("gems").notNull().default(0),
  items: jsonb("items").notNull().default({}),
  maxUses: integer("max_uses").notNull().default(0),
  uses: integer("uses").notNull().default(0),
  active: boolean("active").notNull().default(true),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const promoRedemptions = pgTable(
  "promo_redemptions",
  {
    id: serial("id").primaryKey(),
    codeId: integer("code_id").notNull().references(() => promoCodes.id, { onDelete: "cascade" }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("promo_redemption_pair_idx").on(table.codeId, table.userId)],
);

export const socialInteractions = pgTable(
  "social_interactions",
  {
    id: serial("id").primaryKey(),
    fromUserId: integer("from_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    toUserId: integer("to_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 16 }).notNull(),
    itemKey: varchar("item_key", { length: 40 }),
    quantity: integer("quantity").notNull().default(1),
    note: varchar("note", { length: 160 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("social_to_idx").on(table.toUserId, table.kind, table.createdAt),
    uniqueIndex("social_like_pair_idx").on(table.fromUserId, table.toUserId, table.kind),
  ],
);

export const coops = pgTable("coops", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 30 }).notNull().unique(),
  tag: varchar("tag", { length: 5 }).notNull().unique(),
  description: varchar("description", { length: 400 }).notNull().default(""),
  icon: varchar("icon", { length: 16 }).notNull().default("barn"),
  leaderId: integer("leader_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  joinPolicy: varchar("join_policy", { length: 12 }).notNull().default("open"),
  minLevel: integer("min_level").notNull().default(1),
  treasuryCoins: integer("treasury_coins").notNull().default(0),
  xp: integer("xp").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const coopMembers = pgTable(
  "coop_members",
  {
    id: serial("id").primaryKey(),
    coopId: integer("coop_id").notNull().references(() => coops.id, { onDelete: "cascade" }),
    userId: integer("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 12 }).notNull().default("member"),
    contribution: integer("contribution").notNull().default(0),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("coop_members_coop_idx").on(table.coopId)],
);

export const coopRequests = pgTable(
  "coop_requests",
  {
    id: serial("id").primaryKey(),
    coopId: integer("coop_id").notNull().references(() => coops.id, { onDelete: "cascade" }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 12 }).notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("coop_request_pair_idx").on(table.coopId, table.userId)],
);

export const coopChat = pgTable("coop_chat", {
  id: serial("id").primaryKey(),
  coopId: integer("coop_id").notNull().references(() => coops.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  body: varchar("body", { length: 400 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const workers = pgTable(
  "workers",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 16 }).notNull(),
    hiredAt: timestamp("hired_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastRunAt: timestamp("last_run_at", { withTimezone: true }).notNull().defaultNow(),
    auto: boolean("auto").notNull().default(true),
    cycles: integer("cycles").notNull().default(0),
    earned: integer("earned").notNull().default(0),
  },
  (table) => [uniqueIndex("worker_user_kind_idx").on(table.userId, table.kind)],
);

export const assets = pgTable("assets", {
  key: varchar("key", { length: 60 }).primaryKey(),
  data: text("data").notNull(),
  mime: varchar("mime", { length: 40 }).notNull().default("image/jpeg"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const gameItems = pgTable("game_items", {
  key: varchar("key", { length: 40 }).primaryKey(),
  kind: varchar("kind", { length: 16 }).notNull(),
  data: jsonb("data").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const weeklyScores = pgTable(
  "weekly_scores",
  {
    id: serial("id").primaryKey(),
    week: varchar("week", { length: 10 }).notNull(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    points: integer("points").notNull().default(0),
  },
  (table) => [
    uniqueIndex("weekly_scores_pair_idx").on(table.week, table.userId),
    index("weekly_scores_rank_idx").on(table.week, table.points),
  ],
);

export const weeklyRewards = pgTable("weekly_rewards", {
  week: varchar("week", { length: 10 }).primaryKey(),
  summary: jsonb("summary").notNull().default({}),
  settledAt: timestamp("settled_at", { withTimezone: true }).notNull().defaultNow(),
});

export const bonuses = pgTable("bonuses", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 60 }).notNull(),
  kind: varchar("kind", { length: 16 }).notNull(),
  multiplier: real("multiplier").notNull().default(2),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull().defaultNow(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const profileVisits = pgTable(
  "profile_visits",
  {
    id: serial("id").primaryKey(),
    ownerId: integer("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    visitorId: integer("visitor_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    visits: integer("visits").notNull().default(1),
    visitedAt: timestamp("visited_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("profile_visit_pair_idx").on(table.ownerId, table.visitorId), index("profile_visit_owner_idx").on(table.ownerId, table.visitedAt)],
);

export const lotteries = pgTable("lotteries", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 40 }).notNull().unique(),
  name: varchar("name", { length: 80 }).notNull(),
  description: varchar("description", { length: 240 }).notNull().default(""),
  priceCoins: integer("price_coins").notNull().default(0),
  priceGems: integer("price_gems").notNull().default(0),
  prizes: jsonb("prizes").notNull().default([]),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const lotteryEntries = pgTable(
  "lottery_entries",
  {
    id: serial("id").primaryKey(),
    lotteryId: integer("lottery_id").notNull().references(() => lotteries.id, { onDelete: "cascade" }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    prizeKey: varchar("prize_key", { length: 48 }).notNull().default(""),
    prizeLabel: varchar("prize_label", { length: 120 }).notNull().default(""),
    prizeKind: varchar("prize_kind", { length: 16 }).notNull().default("empty"),
    prizeAmount: integer("prize_amount").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("lottery_entries_lottery_idx").on(table.lotteryId, table.createdAt)],
);
