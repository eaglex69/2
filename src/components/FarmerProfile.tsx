"use client";

import { useEffect, useState } from "react";
import {
  Calendar, Check, Clock, Coins, Crown, Eye, Flame, Gift, Heart, Mail, Medal, Palette, Pencil, Send,
  Settings, Share2, Sprout, Star, Trophy, UserPlus, Users, Zap,
} from "lucide-react";
import { ITEMS, xpNeeded } from "@/lib/game-config";
import { ACHIEVEMENTS, IDLE_LIMIT_MS, rankInfo, totalXp } from "@/lib/game-engine";
import type { ProfileFields } from "@/lib/profile-fields";
import type { GamePayload } from "./game-types";
import { Avatar, Button, EmptyState, ItemIcon } from "./game-ui";
import { GameIcon } from "./icons";
import { ProfileFacts } from "./ProfileEditor";
import { coverStyle } from "@/lib/covers";
import { SvgIcon } from "./svg-icons";

export type ProfileData = {
  user: { id: number; username: string; displayName: string; avatar: string; bio: string; profileFrame: string; cover?: string; createdAt: string; lastSeen: string; role: string; profile?: ProfileFields };
  state: GamePayload["state"];
  stats: { likes: number; gifts: number; friends: number; likedByMe: number; friendStatus: string | null; coopName: string | null; coopTag: string | null };
  gifts: { id: number; itemKey: string; quantity: number; note: string | null; createdAt: string; fromName: string; fromId: number; fromAvatar: string }[];
  isSelf: boolean;
  visits?: { total: number; recent: number; guests: { id: number; displayName: string; avatar: string; visits: number; visitedAt: string }[] };
  rank?: { place: number; total: number };
  serverTime?: number;
};

export type ProfileActions = {
  busy: boolean;
  onStatus?: () => void;
  onAvatars?: () => void;
  onSettings?: () => void;
  onBioSave?: (bio: string) => Promise<boolean>;
  onPremium?: () => void;
  onClaim?: (id: string) => void;
  onLike?: () => void;
  onGift?: () => void;
  onFriend?: () => void;
  onMail?: () => void;
  onProfile?: (id: number) => void;
  onCover?: () => void;
  notify?: (text: string, error?: boolean) => void;
};

const fmtNumber = (value: number) => new Intl.NumberFormat("ru-RU").format(Math.round(value));
const longDate = (value: string) => new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value));
function ago(value: string, now: number) {
  const s = Math.max(0, (now - new Date(value).getTime()) / 1000);
  if (s < 90) return "только что";
  if (s < 3600) return `${Math.floor(s / 60)} мин назад`;
  if (s < 86_400) return `${Math.floor(s / 3600)} ч назад`;
  return `${Math.floor(s / 86_400)} дн назад`;
}
function shortDuration(ms: number) {
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "меньше минуты";
  if (minutes < 60) return `${minutes} мин`;
  return `${Math.floor(minutes / 60)} ч ${minutes % 60} мин`;
}

export function FarmerProfile({ data, viewer, actions }: { data: ProfileData; viewer: GamePayload; actions: ProfileActions }) {
  const { user, state, stats, isSelf } = data;
  const [tab, setTab] = useState<"overview" | "gifts" | "medals" | "guests">("overview");
  const [editingBio, setEditingBio] = useState(false);
  const [bio, setBio] = useState(user.bio ?? "");
  const [loadedAt] = useState(() => Date.now());
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => { const timer = window.setInterval(() => setClock(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  useEffect(() => { setBio(user.bio ?? ""); }, [user.bio]);

  const offset = (data.serverTime ?? loadedAt) - loadedAt;
  const now = clock + offset;
  const online = isSelf || now - new Date(user.lastSeen).getTime() < IDLE_LIMIT_MS;
  const need = xpNeeded(state.level);
  const rank = rankInfo(state.level);
  const activity = state.activity ?? { playMs: 0, lastPing: 0, streak: 0, bestStreak: 0, lastDay: "", daysActive: 0 };
  // Пока игрок в игре, время идёт вживую; простой не учитывается сервером.
  const livePlay = activity.playMs + (online ? Math.min(Math.max(0, clock - loadedAt), 3_600_000) : 0);
  const totalSeconds = Math.floor(livePlay / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const farmDay = Math.max(1, Math.floor((now - new Date(user.createdAt).getTime()) / 86_400_000) + 1);
  const perDay = livePlay / Math.max(1, activity.daysActive || farmDay);
  const recentGuests = data.visits?.recent ?? 0;
  const premium = state.season?.premium;

  async function share() {
    const url = `${window.location.origin}/?profile=${user.id}`;
    const title = `Ферма игрока ${user.displayName}`;
    try {
      if (navigator.share) { await navigator.share({ title, text: `${title} в «Тихой долине»`, url }); return; }
      await navigator.clipboard.writeText(url);
      actions.notify?.("Ссылка на профиль скопирована");
    } catch { /* пользователь закрыл меню */ }
  }

  const farmStats: [string, string, number][] = [
    ["wheat", "урожаев", state.stats.harvested], ["egg", "продуктов", state.stats.collected ?? 0], ["chef", "изготовлено", state.stats.produced],
    ["fish", "рыбы", state.stats.fishCaught], ["pickaxe", "в шахтах", state.stats.mined], ["truck", "заказов", state.stats.orders],
    ["gold", "заработано", state.stats.earned], ["trophy", "наград", state.claimedAchievements.length],
  ];

  return <div className="fp">
    <section className={`fp-hero frame-${user.profileFrame ?? "wood"}`} style={coverStyle(user.cover)}>
      <span className="fp-sun" aria-hidden />
      <div className="fp-hero-top">
        <button className="fp-avatar" onClick={isSelf ? actions.onAvatars : undefined} aria-label={isSelf ? "Сменить аватар" : user.displayName}>
          <Avatar name={user.avatar} size={84} />
          <span className="fp-level">{state.level}</span>
        </button>
        <div className="fp-ident">
          <h2>{user.displayName}</h2>
          <div className="fp-badges">
            <span className="fp-rank"><SvgIcon icon={Sprout} size={13} />{rank.title}</span>
            {premium ? <span className="fp-premium on"><SvgIcon icon={Crown} size={13} />Премиум</span>
              : isSelf ? <button className="fp-premium" onClick={actions.onPremium}><SvgIcon icon={Crown} size={13} />Оформить Премиум</button> : null}
          </div>
          <div className="fp-online"><i className={online ? "on" : ""} />{online ? "онлайн" : `был(а) ${ago(user.lastSeen, now)}`}<span>№ {String(user.id).padStart(6, "0")}</span></div>
          {stats.coopName && <span className="fp-coop"><SvgIcon icon={Users} size={12} />[{stats.coopTag}] {stats.coopName}</span>}
        </div>
      </div>
      {user.profile?.mood && <p className="fp-mood">«{user.profile.mood}»</p>}
      {editingBio ? <div className="fp-bio editing">
        <textarea value={bio} maxLength={200} autoFocus onChange={(event) => setBio(event.target.value)} placeholder="Напишите о себе пару слов…" />
        <div className="button-row"><Button variant="soft" onClick={() => { setBio(user.bio ?? ""); setEditingBio(false); }}>Отмена</Button><Button disabled={actions.busy} onClick={async () => { if (await actions.onBioSave?.(bio)) setEditingBio(false); }}><SvgIcon icon={Check} size={15} />Сохранить</Button></div>
      </div> : <button className="fp-bio" onClick={isSelf ? () => setEditingBio(true) : undefined} disabled={!isSelf}>
        <span>{user.bio || (isSelf ? "Напишите о себе пару слов — их увидят все соседи." : "Фермер пока ничего о себе не рассказал.")}</span>
        {isSelf && <SvgIcon icon={Pencil} size={14} />}
      </button>}
      <div className="fp-xp">
        <div className="progress-track"><span style={{ width: `${Math.min(100, state.xp / need * 100)}%` }} /></div>
        <div className="fp-xp-foot">
          <p><span>Опыт {state.xp} / {need}</span><span>{rank.next ? `до «${rank.next.title}» — уровень ${rank.next.level}` : "высшее звание"}</span></p>
          {isSelf && <button className="fp-cover-btn" onClick={actions.onCover}><SvgIcon icon={Palette} size={14} />Обложка</button>}
        </div>
      </div>
    </section>

    {isSelf ? <div className="fp-actions">
      <button onClick={actions.onStatus}><span className="tone-yellow"><SvgIcon icon={Pencil} size={22} /></span>Статус</button>
      <button onClick={actions.onAvatars}><span className="tone-green"><SvgIcon icon={Palette} size={22} /></span>Аватары</button>
      <button onClick={actions.onSettings}><span className="tone-blue"><SvgIcon icon={Settings} size={22} /></span>Настройки</button>
      <button onClick={() => void share()}><span className="tone-sky"><SvgIcon icon={Share2} size={22} /></span>Поделиться</button>
    </div> : <div className="fp-actions">
      <button onClick={actions.onLike} disabled={actions.busy}><span className={stats.likedByMe ? "tone-pink" : "tone-yellow"}><SvgIcon icon={Heart} size={22} fill={stats.likedByMe ? "currentColor" : "none"} /></span>{stats.likedByMe ? "Нравится" : "Симпатия"}</button>
      <button onClick={actions.onGift} disabled={actions.busy}><span className="tone-green"><SvgIcon icon={Gift} size={22} /></span>Подарок</button>
      <button onClick={actions.onFriend} disabled={actions.busy || !!stats.friendStatus}><span className="tone-blue"><SvgIcon icon={UserPlus} size={22} /></span>{stats.friendStatus === "accepted" ? "Друзья" : stats.friendStatus ? "Заявка" : "В друзья"}</button>
      <button onClick={actions.onMail}><span className="tone-sky"><SvgIcon icon={Mail} size={22} /></span>Письмо</button>
    </div>}

    <div className="fp-stats">
      <div><span><SvgIcon icon={Trophy} size={18} /></span><strong>#{data.rank?.place || "—"}</strong><small>из {data.rank?.total ?? 0} фермеров</small></div>
      <div><span><SvgIcon icon={Star} size={18} /></span><strong>{fmtNumber(totalXp(state))}</strong><small>всего опыта</small></div>
      <div><span><SvgIcon icon={Flame} size={18} /></span><strong>{activity.streak}</strong><small>дней подряд</small></div>
      <div><span><SvgIcon icon={Eye} size={18} /></span><strong>{data.visits?.total ?? 0}</strong><small>визитов гостей</small></div>
    </div>

    <div className="fp-tabs" role="tablist">
      {([["overview", "Обзор", Sprout], ["gifts", "Подарки", Gift], ["medals", "Медали", Medal], ["guests", "Гости", Users]] as const).map(([key, label, Icon]) => <button role="tab" aria-selected={tab === key} className={tab === key ? "active" : ""} onClick={() => setTab(key)} key={key}>
        <SvgIcon icon={Icon} size={19} />{label}{key === "guests" && recentGuests > 0 && <em>{recentGuests}</em>}{key === "gifts" && stats.gifts > 0 && <em>{stats.gifts}</em>}
      </button>)}
    </div>

    {tab === "overview" && <>
      <section className="fp-time">
        <div className="fp-time-head"><h3><SvgIcon icon={Clock} size={18} />Время на ферме</h3><span className={online ? "on" : ""}><i />{online ? "ИДЁТ" : "ПАУЗА"}</span></div>
        <div className="fp-counter">{([[days, "дней"], [hours, "часов"], [minutes, "минуты"], [seconds, "секунды"]] as const).map(([value, label]) => <div key={label}><strong>{String(value).padStart(label === "дней" ? 1 : 2, "0")}</strong><small>{label}</small></div>)}</div>
        <div className="fp-time-grid">
          <div><span><SvgIcon icon={Calendar} size={16} /></span><p><small>Прибыл(а) на ферму</small><strong>{longDate(user.createdAt)}</strong></p></div>
          <div><span><SvgIcon icon={Sprout} size={16} /></span><p><small>День на ферме</small><strong>№ {farmDay}</strong></p></div>
          <div><span><SvgIcon icon={Zap} size={16} /></span><p><small>В среднем за день</small><strong>{shortDuration(perDay)}</strong></p></div>
          <div><span><SvgIcon icon={Clock} size={16} /></span><p><small>Последний визит</small><strong>{online ? "сейчас в сети" : ago(user.lastSeen, now)}</strong></p></div>
        </div>
        <p className="fp-time-note">Считается, пока вы играете. Простой дольше 1,5 минуты не учитывается.</p>
      </section>

      <section className="fp-card">
        <h3><SvgIcon icon={Trophy} size={18} />Достижения на ферме</h3>
        <div className="fp-achievements">{farmStats.map(([icon, label, value]) => <div key={label}><span><GameIcon name={icon} size={22} /></span><strong>{fmtNumber(value)}</strong><small>{label}</small></div>)}</div>
      </section>

      <div className="fp-social-line"><span><SvgIcon icon={Heart} size={15} />{stats.likes} симпатий</span><span><SvgIcon icon={Users} size={15} />{stats.friends} друзей</span><span><SvgIcon icon={Flame} size={15} />рекорд {activity.bestStreak} дн.</span></div>
      <ProfileFacts profile={user.profile} />
    </>}

    {tab === "gifts" && <section className="fp-card">
      <h3><SvgIcon icon={Gift} size={18} />Подарки</h3>
      {!isSelf && <Button variant="secondary" onClick={actions.onGift}><SvgIcon icon={Send} size={15} />Подарить что-нибудь</Button>}
      <div className="gift-feed">{data.gifts.length === 0 ? <EmptyState icon={<SvgIcon icon={Gift} size={30} />} title="Подарков пока нет" text={isSelf ? "Соседи смогут дарить вам предметы из своих амбаров." : "Станьте первым, кто порадует этого фермера."} /> : data.gifts.map((gift) => <div key={gift.id}>
        <button className="avatar-link" onClick={() => actions.onProfile?.(gift.fromId)}><Avatar name={gift.fromAvatar} size={32} /></button>
        <ItemIcon itemKey={gift.itemKey} size={18} />
        <p><strong>{gift.fromName}</strong> подарил(а) {ITEMS[gift.itemKey]?.name ?? gift.itemKey} ×{gift.quantity}{gift.note && <span>«{gift.note}»</span>}</p>
      </div>)}</div>
    </section>}

    {tab === "medals" && <section className="fp-card">
      <h3><SvgIcon icon={Medal} size={18} />Медали</h3>
      <div className="fp-medals">{ACHIEVEMENTS.map((achievement) => {
        const progress = state.stats[achievement.stat] ?? 0;
        const done = progress >= achievement.goal;
        const claimed = state.claimedAchievements.includes(achievement.id);
        return <article className={claimed ? "claimed" : done ? "done" : ""} key={achievement.id}>
          <span className="fp-medal"><SvgIcon icon={claimed ? Check : Medal} size={22} /></span>
          <div><strong>{achievement.name}</strong><small>{achievement.description}</small><div className="mini-progress"><i style={{ width: `${Math.min(100, progress / achievement.goal * 100)}%` }} /></div><small>{Math.min(progress, achievement.goal)}/{achievement.goal} · {achievement.coins ? <><SvgIcon icon={Coins} size={11} />{achievement.coins}</> : `${achievement.gems} алм.`}</small></div>
          {isSelf && <Button disabled={actions.busy || !done || claimed} onClick={() => actions.onClaim?.(achievement.id)}>{claimed ? "Есть" : "Забрать"}</Button>}
        </article>;
      })}</div>
    </section>}

    {tab === "guests" && <section className="fp-card">
      <h3><SvgIcon icon={Users} size={18} />Гости фермы</h3>
      <p className="muted">За неделю заглянули: {recentGuests}. Всего визитов: {data.visits?.total ?? 0}.</p>
      <div className="fp-guests">{(data.visits?.guests ?? []).length === 0 ? <EmptyState icon={<SvgIcon icon={Eye} size={30} />} title="Гостей пока не было" text="Когда соседи откроют этот профиль, они появятся здесь." /> : (data.visits?.guests ?? []).map((guest) => <button key={guest.id} onClick={() => actions.onProfile?.(guest.id)}>
        <Avatar name={guest.avatar} size={40} /><div><strong>{guest.displayName}</strong><small>{ago(guest.visitedAt, now)} · визитов: {guest.visits}</small></div>
      </button>)}</div>
    </section>}
    {viewer.user.id === user.id ? null : null}
  </div>;
}
