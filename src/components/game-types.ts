import type { GameAction, GameState } from "@/lib/game-engine";
import type { ProfileFields } from "@/lib/profile-fields";
import type { Bonus } from "@/lib/bonus";

export type User = { id: number; username: string; displayName: string; avatar: string; bio?: string; profileFrame?: string; cover?: string; profile?: ProfileFields; createdAt: string; role?: string };
export type NewsEntry = { id: number; tag: string; title: string; body: string; createdAt: string };
export type Listing = { id: number; sellerId: number; sellerName: string; itemKey: string; quantity: number; unitPrice: number; createdAt: string };
export type LatestTopic = { id: number; title: string; author: string; username?: string; updatedAt: string };
export type GamePayload = {
  user: User;
  state: GameState;
  market: Listing[];
  online: number;
  unreadMail: number;
  latestTopics: LatestTopic[];
  news: NewsEntry[];
  banner: string;
  content?: { key: string; kind: string; data: Record<string, unknown>; enabled: boolean }[];
  design?: unknown;
  balance?: unknown;
  bonuses?: Bonus[];
  banker?: { id: number; username: string; displayName: string } | null;
  serverTime: number;
};

export type ChatMessage = { id: number; userId: number; body: string; createdAt: string; author: string; username?: string; avatar: string };
export type Topic = { id: number; userId: number; title: string; body: string; category: string; createdAt: string; updatedAt: string; author: string; username?: string; replies: number };
export type TopicReply = { id: number; topicId: number; userId: number; body: string; createdAt: string; author: string; username?: string };
export type Mail = { id: number; senderId: number | null; senderName?: string | null; recipientId?: number; subject: string; body: string; kind?: string; payload?: { items?: Record<string, number>; coins?: number; gems?: number } | null; isRead?: boolean; claimedAt?: string | null; createdAt: string };
export type FriendRow = { id: number; requesterId: number; addresseeId: number; status: string; requesterName: string; addresseeName: string; requesterUsername: string; addresseeUsername: string };
export type NewspaperPost = { id: number; kind: string; title: string; body: string; createdAt: string; author: string; username?: string };
export type Ticket = { id: number; category: string; body: string; status: string; createdAt: string };
export type SocialPayload = {
  chat: ChatMessage[];
  topics: Topic[];
  replies: TopicReply[];
  inbox: Mail[];
  sent: Mail[];
  friends: FriendRow[];
  newspaper: NewspaperPost[];
  tickets: Ticket[];
  serverTime: number;
};

export type ModuleKey = "home" | "garden" | "ponds" | "pens" | "cages" | "cellar" | "mines" | "fishing" | "diamond" | "jobs" | "barn" | "market" | "shop" | "city" | "news" | "promos" | "elysium" | "forum" | "chat" | "newspaper" | "tickets" | "mail" | "friends" | "profile" | "coop" | "workers" | "rating" | "season" | "bank" | "wheel" | "pvz" | "build" | "lottery";
export type Act = (action: GameAction) => Promise<boolean>;
export type SocialAct = (action: { type: string; [key: string]: unknown }) => Promise<boolean>;
export type OpenModule = (module: ModuleKey, options?: { topicId?: number; username?: string; subject?: string; body?: string }) => void;
