"use client";

import { ArrowRight, Check, ChevronRight, Circle, Gift, MessageCircle, Plus, Sparkles, Zap } from "lucide-react";
import { CROPS, ITEMS, NEWS, dayKey } from "@/lib/game-config";
import type { GamePayload, ModuleKey, OpenModule, SocialPayload } from "./game-types";
import { MODULE_META } from "./module-meta";
import { Button, formatDate, ItemIcon } from "./game-ui";
import { GameIcon } from "./icons";
import { SvgIcon } from "./svg-icons";

const TILE_ICONS: Partial<Record<ModuleKey, string>> = { garden: "carrot", ponds: "duck", pens: "cow", cages: "fish", cellar: "chef", mines: "pickaxe", fishing: "fish", diamond: "gem", jobs: "tractor", barn: "barn", market: "barn", shop: "package" };

const productionModules: ModuleKey[] = ["garden", "ponds", "pens", "cages", "cellar", "mines", "fishing", "diamond", "jobs", "barn", "market", "shop"];
const communityModules: ModuleKey[] = ["news", "promos", "elysium", "forum", "chat", "newspaper", "tickets", "mail", "friends", "profile"];

export default function HomeModule({ payload, social, now, open }: { payload: GamePayload; social: SocialPayload; now: number; open: OpenModule }) {
  const { state } = payload;
  const ready: Partial<Record<ModuleKey, number>> = {
    garden: state.plots.filter((plot) => plot.crop && plot.readyAt <= now).length,
    ponds: state.ponds.filter((slot) => slot.species && slot.readyAt <= now).length,
    cages: state.cages.filter((slot) => slot.species && slot.readyAt <= now).length,
    pens: state.pens.filter((pen) => pen.animal && pen.readyAt <= now).length,
    cellar: state.cellar.jobs.filter((job) => job.readyAt <= now).length,
    jobs: state.job && state.job.readyAt <= now ? 1 : 0,
  };
  const readyTotal = Object.values(ready).reduce((sum, value) => sum + (value ?? 0), 0);
  const firstReady = (Object.entries(ready).find(([, value]) => (value ?? 0) > 0)?.[0] ?? "garden") as ModuleKey;
  const unreadNews = NEWS.filter((news) => !state.readNews.includes(news.id)).length + payload.news.filter((news) => !state.readNews.includes(`n${news.id}`)).length;
  const incoming = social.friends.filter((friend) => friend.status === "pending" && friend.addresseeId === payload.user.id).length;
  const articleCount = social.newspaper.filter((post) => post.kind === "article").length;
  const adCount = social.newspaper.filter((post) => post.kind === "ad").length;
  const dailyClaimed = state.claimedPromos.includes(`daily:${dayKey()}`);
  const badges: Partial<Record<ModuleKey, string | number>> = {
    news: unreadNews,
    forum: `${payload.online} чел.`,
    chat: `${payload.online} чел.`,
    newspaper: `1/${articleCount}/${adCount}`,
    tickets: social.tickets.length,
    mail: payload.unreadMail,
    friends: incoming,
  };
  const hour = new Date(now).getHours();
  const greeting = hour < 12 ? "Доброе утро" : hour < 18 ? "Добрый день" : "Добрый вечер";
  return <div className="home-module">
    <section className="farm-hero-card">
      <div className="farm-hero-content"><span className="eyebrow light">{greeting}, {payload.user.displayName}</span><h1>Долина просыпается<br />вместе с вами</h1><p>{readyTotal ? `${readyTotal} производств готовы к сбору` : "Всё спокойно. Самое время начать новый цикл."}</p><Button variant="secondary" onClick={() => open(readyTotal ? firstReady : "garden")}>{readyTotal ? "Собрать готовое" : "К грядкам"}<SvgIcon icon={ArrowRight} size={17} /></Button></div>
      <div className="farm-weather"><span>Сезон</span><small>Тихая долина</small></div>
    </section>
    {state.elysium.blessing && state.elysium.until > now && <button className="blessing-strip" onClick={() => open("elysium")}><SvgIcon icon={Sparkles} size={18} /><span>Благословение Элизиума активно</span><strong>{Math.ceil((state.elysium.until - now) / 1000)} сек</strong></button>}
    <section className="home-section"><div className="section-heading"><div><span className="eyebrow">Хозяйство</span><h2>Ваша ферма</h2></div><button onClick={() => open("city")}>Улучшения<SvgIcon icon={ChevronRight} size={16} /></button></div><div className="module-grid">{productionModules.map((key) => { const meta = MODULE_META[key]; const Icon = meta.icon; const badge = ready[key] ?? 0; return <button className={`module-tile tile-${key}`} onClick={() => open(key)} key={key}><span className="module-icon"><span className="module-emoji"><GameIcon name={TILE_ICONS[key] ?? "leaf"} size={26} /></span>{badge > 0 && <i>{badge}</i>}</span><strong>{meta.title}</strong><small>{meta.subtitle}</small></button>; })}</div></section>
    <section className="home-section"><div className="section-heading"><div><span className="eyebrow">Кладовая</span><h2>Амбар сейчас</h2></div><button onClick={() => open("barn")}>Весь амбар<SvgIcon icon={ChevronRight} size={16} /></button></div>
      <div className="home-storage">{Object.entries(state.inventory).filter(([, amount]) => amount > 0).slice(0, 11).map(([key, amount]) => <button className="storage-cell" key={key} onClick={() => open("barn")}><ItemIcon itemKey={key} size={22} /><strong>{amount}</strong></button>)}<button className="storage-cell add" onClick={() => open("garden")}><span className="storage-emoji"><SvgIcon icon={Plus} size={22} /></span><strong>Сажать</strong></button></div>
      <div className="collection-row"><span>Культур: {Object.keys(CROPS).length}</span><span>Рыбы: 8</span><span>Животных: 10</span><span>Рецептов: 9</span></div>
    </section>
    <section className="home-section daily-section"><div className="section-heading"><div><span className="eyebrow">Маршрут дня</span><h2>Три добрых дела</h2></div><span className="soft-chip">{[state.stats.harvested > 0, dailyClaimed, state.orders.completed.length > 0].filter(Boolean).length}/3</span></div><div className="daily-list"><button onClick={() => open("garden")}><span className={state.stats.harvested > 0 ? "done" : ""}>{state.stats.harvested > 0 ? <SvgIcon icon={Check} size={16} /> : <SvgIcon icon={Circle} size={16} />}</span><div><strong>Собрать урожай</strong><small>Посадите, полейте и соберите любую культуру</small></div><SvgIcon icon={ChevronRight} size={17} /></button><button onClick={() => open("promos")}><span className={dailyClaimed ? "done" : ""}>{dailyClaimed ? <SvgIcon icon={Check} size={16} /> : <SvgIcon icon={Gift} size={16} />}</span><div><strong>Забрать подарок дня</strong><small>Монеты, корм и немного энергии</small></div><SvgIcon icon={ChevronRight} size={17} /></button><button onClick={() => open("city")}><span className={state.orders.completed.length > 0 ? "done" : ""}>{state.orders.completed.length > 0 ? <SvgIcon icon={Check} size={16} /> : <SvgIcon icon={Circle} size={16} />}</span><div><strong>Помочь городу</strong><small>Выполните один из трёх дневных заказов</small></div><SvgIcon icon={ChevronRight} size={17} /></button></div></section>
    <section className="home-section"><div className="section-heading"><div><span className="eyebrow">Вместе</span><h2>Жизнь долины</h2></div><span className="online-label"><i />{payload.online} онлайн</span></div><div className="community-list">{communityModules.map((key) => { const meta = MODULE_META[key]; const Icon = meta.icon; const badge = badges[key]; return <button className="community-row" onClick={() => open(key)} key={key}><span className={`community-icon community-${key}`}><Icon size={21} /></span><div><strong>{meta.title}</strong><small>{meta.subtitle}</small></div>{badge !== undefined && <span className={`community-badge ${Number(badge) > 0 ? "has-badge" : ""}`}>{badge}</span>}<SvgIcon icon={ChevronRight} size={17} /></button>; })}</div></section>
    <section className="home-section latest-topics"><div className="section-heading"><div><span className="eyebrow">Обсуждения</span><h2>Последние темы на форуме</h2></div><button onClick={() => open("forum")}>Все<SvgIcon icon={ChevronRight} size={16} /></button></div>{payload.latestTopics.length ? <div>{payload.latestTopics.map((topic) => <button onClick={() => open("forum", { topicId: topic.id })} key={topic.id}><SvgIcon icon={MessageCircle} size={18} /><div><strong>{topic.title}</strong><span>{topic.author}{topic.username ? ` @${topic.username}` : ""} · {formatDate(topic.updatedAt)}</span></div><SvgIcon icon={ChevronRight} size={17} /></button>)}</div> : <button className="first-topic" onClick={() => open("forum")}><SvgIcon icon={MessageCircle} size={24} /><div><strong>Пока нет тем</strong><span>Откройте форум и начните первое обсуждение</span></div><SvgIcon icon={ArrowRight} size={18} /></button>}</section>
    <footer className="home-footer"><SvgIcon icon={Zap} size={14} /><span>Энергия восстанавливается со временем. Прогресс сохраняется автоматически.</span></footer>
  </div>;
}
