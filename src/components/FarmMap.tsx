"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { Check, Timer } from "lucide-react";
import { NEWS } from "@/lib/game-config";
import { POINTS_PER_LEVEL, SEASON_LEVELS, lifetimeScore } from "@/lib/season";
import type { GamePayload, ModuleKey, OpenModule, SocialPayload } from "./game-types";
import { GameIcon } from "./icons";
import { FarmArt } from "./FarmArt";
import { PINS } from "./map-pins";
import CanvasFarmBackground from "./CanvasFarmBackground";
import { BonusChips } from "./BonusUi";
import { SvgIcon } from "./svg-icons";
import { useDesign } from "./DesignProvider";
import { DEFAULT_LAYOUT, HUD_ITEMS } from "@/lib/design-config";
import { MODULE_META } from "./module-meta";
import { GameDock, PlayerBadge, ResourcePills, SettingsButton, dockBadges } from "./GameChrome";

const subscribeCanvas = () => () => {};
const readCanvas = () => Boolean((window as unknown as { __VALLEY_CANVAS__?: boolean }).__VALLEY_CANVAS__);
const serverCanvas = () => false;
const pad = (value: number) => String(value).padStart(2, "0");

function clock(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor((seconds % 3600) / 60))}:${pad(seconds % 60)}`;
}

function shortTime(ms: number) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return seconds >= 3600 ? `${Math.floor(seconds / 3600)}ч ${Math.floor((seconds % 3600) / 60)}м` : `${Math.floor(seconds / 60)}:${pad(seconds % 60)}`;
}

type RailTip = { label: string; y: number } | null;
type RoundActionProps = { art: string; label: string; onClick: () => void; badge?: number; done?: boolean; overrideKey?: string; tone?: "green"; onTip?: (tip: RailTip) => void };
function RoundAction({ art, label, onClick, badge, done, overrideKey, tone, onTip }: RoundActionProps) {
  const showTip = (target: HTMLButtonElement) => {
    if (!onTip) return;
    const mapRect = target.closest(".farm-map-redesign")?.getBoundingClientRect();
    const btnRect = target.getBoundingClientRect();
    if (mapRect) onTip({ label, y: btnRect.top - mapRect.top + btnRect.height / 2 });
  };
  return <button
    className="map-round-button"
    onClick={onClick}
    onMouseEnter={(event) => showTip(event.currentTarget)}
    onMouseLeave={() => onTip?.(null)}
    onFocus={(event) => showTip(event.currentTarget)}
    onBlur={() => onTip?.(null)}
    aria-label={label}
    title={label}
  >
    <FarmArt name={art} size={58} overrideKey={overrideKey} />
    {done ? <span className="round-badge round-badge-done"><Check size={15} strokeWidth={4} /></span> : !!badge && <span className={`round-badge ${tone === "green" ? "round-badge-done" : ""}`}>{badge > 99 ? "99+" : badge}</span>}
  </button>;
}

const RAIL_META = new Map(HUD_ITEMS.map((item) => [item.key, item]));

function syncRailScroll(el: HTMLElement | null) {
  if (!el) return;
  if (el.scrollTop > 4) el.dataset.scrollTop = "1";
  else delete el.dataset.scrollTop;
  if (el.scrollTop + el.clientHeight < el.scrollHeight - 4) el.dataset.scrollBottom = "1";
  else delete el.dataset.scrollBottom;
}

function SideRail({ side, ariaLabel, keys, payload, badges, ready, claimable, unreadNews, timerText, open }: {
  side: "left" | "right";
  ariaLabel: string;
  keys: string[];
  payload: GamePayload;
  badges: ReturnType<typeof dockBadges>;
  ready: Partial<Record<ModuleKey, number>>;
  claimable: number;
  unreadNews: number;
  timerText: string;
  open: OpenModule;
}) {
  const { state } = payload;
  const railRef = useRef<HTMLElement>(null);
  const [tip, setTip] = useState<RailTip>(null);
  const valid = keys.filter((key): key is ModuleKey => RAIL_META.has(key));

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    syncRailScroll(el);
    const observer = new ResizeObserver(() => syncRailScroll(el));
    observer.observe(el);
    const onResize = () => syncRailScroll(el);
    window.addEventListener("resize", onResize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [valid.length]);

  if (!valid.length) return null;
  return <>
    <nav
      ref={railRef}
      className={`map-side-rail map-rail-${side}`}
      aria-label={ariaLabel}
      onScroll={(event) => {
        syncRailScroll(event.currentTarget);
        if (tip) setTip(null);
      }}
    >
      {valid.map((key) => {
        const meta = RAIL_META.get(key)!;
        const art = key === "promos" && side === "right" ? "sale" : meta.art;
        if (key === "chat") return <RoundAction key={key} art={art} label={`Общий чат · онлайн: ${payload.online}`} onClick={() => open("chat")} badge={payload.online} tone="green" overrideKey="ui:module:chat" onTip={setTip} />;
        if (key === "promos" && side === "left") return <RoundAction key={key} art="gift" label={badges.giftFree ? "Забрать подарок дня" : "Подарок получен"} onClick={() => open("promos")} badge={badges.giftFree ? 1 : 0} done={!badges.giftFree} overrideKey="ui:gift" onTip={setTip} />;
        if (key === "city") return <RoundAction key={key} art={art} label="Городские заказы" onClick={() => open("city")} badge={ready.city} done={!ready.city && state.orders.completed.length === 3} overrideKey="ui:module:city" onTip={setTip} />;
        if (key === "garden") return <RoundAction key={key} art={art} label="Огород и посадки" onClick={() => open("garden")} badge={ready.garden} overrideKey="ui:module:garden" onTip={setTip} />;
        if (key === "bank") return <div className="map-round-wrap" key={key}><RoundAction art={art} label="Банк долины" onClick={() => open("bank")} overrideKey="ui:module:bank" onTip={setTip} /><span className="map-round-timer" title="До обновления ежедневного подарка">{timerText}</span></div>;
        if (key === "season") return <RoundAction key={key} art={art} label="Сезонный пропуск" onClick={() => open("season")} badge={claimable} overrideKey="ui:module:season" onTip={setTip} />;
        if (key === "news") return <RoundAction key={key} art={art} label="Новости долины" onClick={() => open("news")} badge={unreadNews} overrideKey="ui:module:news" onTip={setTip} />;
        if (key === "mail") return <RoundAction key={key} art={art} label="Почта" onClick={() => open("mail")} badge={badges.mail} overrideKey="ui:module:mail" onTip={setTip} />;
        if (key === "friends") return <RoundAction key={key} art={art} label="Друзья" onClick={() => open("friends")} badge={badges.friends} overrideKey="ui:module:friends" onTip={setTip} />;
        if (key === "wheel") return <RoundAction key={key} art={art} label="Колесо фортуны" onClick={() => open("wheel")} badge={badges.wheelFree ? 1 : 0} tone="green" overrideKey="ui:module:wheel" onTip={setTip} />;
        const info = MODULE_META[key];
        return <RoundAction key={key} art={art} label={info?.title ?? meta.label} onClick={() => open(key)} badge={ready[key]} overrideKey={`ui:module:${key}`} onTip={setTip} />;
      })}
    </nav>
    {tip && <div className={`map-tooltip map-tooltip-${side}`} style={{ top: tip.y }} aria-hidden="true">{tip.label}</div>}
  </>;
}

export default function FarmMap({ payload, social, now, open, onMenu }: { payload: GamePayload; social: SocialPayload; now: number; open: OpenModule; onMenu: () => void }) {
  const canvasMode = useSyncExternalStore(subscribeCanvas, readCanvas, serverCanvas);
  const design = useDesign();
  const { state } = payload;
  const badges = dockBadges(payload, social, now);
  // Пруды и садок — один объект «Водоёмы»: суммируем готовность и берём ближайший таймер.
  const ready: Partial<Record<ModuleKey, number>> = {
    garden: badges.garden,
    ponds: badges.water,
    pens: state.pens.filter((pen) => pen.animal && pen.readyAt <= now).length,
    cellar: state.cellar.jobs.filter((job) => job.readyAt <= now).length,
    jobs: state.job && state.job.readyAt <= now ? 1 : 0,
    city: badges.city,
    wheel: badges.wheelFree ? 1 : 0,
  };
  const timers: Partial<Record<ModuleKey, number>> = {};
  const nextTimer = (key: ModuleKey, values: number[]) => {
    const pending = values.filter((value) => value > now);
    if (pending.length && !(ready[key] ?? 0)) timers[key] = Math.min(...pending) - now;
  };
  nextTimer("garden", state.plots.map((plot) => (plot.crop ? plot.readyAt : 0)));
  nextTimer("ponds", [...state.ponds.map((slot) => (slot.species ? slot.readyAt : 0)), ...state.cages.map((slot) => (slot.species ? slot.readyAt : 0))]);
  nextTimer("pens", state.pens.map((pen) => (pen.animal ? pen.readyAt : 0)));
  nextTimer("cellar", state.cellar.jobs.map((job) => job.readyAt));
  nextTimer("jobs", state.job ? [state.job.readyAt] : []);

  const unreadNews = NEWS.filter((news) => !state.readNews.includes(news.id)).length + payload.news.filter((news) => !state.readNews.includes(`n${news.id}`)).length;
  const date = new Date(now);
  const dailyReset = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1);
  const seasonLevel = Math.min(SEASON_LEVELS, Math.floor(Math.max(0, lifetimeScore(state.stats) - state.season.base) / POINTS_PER_LEVEL));
  let claimable = 0;
  for (let level = 1; level <= seasonLevel; level += 1) {
    if (!state.season.claimedFree.includes(level)) claimable += 1;
    if (state.season.premium && !state.season.claimedPremium.includes(level)) claimable += 1;
  }

  const mapStyle = design.slots.map ? { "--map-image": `url("${design.slots.map}")` } as CSSProperties : undefined;

  return <div className="farm-map farm-map-redesign" style={mapStyle}>
    <div className="farm-map-bg" aria-hidden="true" />
    {canvasMode && <CanvasFarmBackground />}
    <div className="map-vignette" aria-hidden="true" />

    <header className="map-top-hud">
      <PlayerBadge payload={payload} open={open} now={now} />
      <ResourcePills payload={payload} now={now} open={open} />
      <SettingsButton onMenu={onMenu} />
    </header>

    <SideRail side="left" ariaLabel="События фермы" keys={design.layout?.left ?? DEFAULT_LAYOUT.left} payload={payload} badges={badges} ready={ready} claimable={claimable} unreadNews={unreadNews} timerText={clock(dailyReset - now)} open={open} />
    <SideRail side="right" ariaLabel="Бонусы и новости" keys={design.layout?.right ?? DEFAULT_LAYOUT.right} payload={payload} badges={badges} ready={ready} claimable={claimable} unreadNews={unreadNews} timerText={clock(dailyReset - now)} open={open} />

    <div className="map-bonuses"><BonusChips bonuses={payload.bonuses ?? []} now={now} onOpen={() => open("promos")} /></div>
    {payload.banner && <div className="map-banner" role="status">{payload.banner}</div>}

    <div className="map-hotspots">
      {PINS.filter((pin) => pin.featured || (ready[pin.key] ?? 0) > 0 || timers[pin.key] !== undefined).map((pin) => {
        const count = ready[pin.key] ?? 0;
        const timer = timers[pin.key];
        const style = { "--pin-x": `${pin.x}%`, "--pin-y": `${pin.y}%`, "--pin-mx": `${pin.mx}%`, "--pin-my": `${pin.my}%` } as CSSProperties;
        return <button className={`map-pin ${count ? "is-ready" : ""} ${pin.featured ? "is-featured" : ""}`} data-pin={pin.key} style={style} onClick={() => open(pin.key)} key={pin.key} aria-label={`${pin.label}${count ? `, готово: ${count}` : ""}`} title={pin.label}>
          <span className="map-pin-icon">
            {pin.art ? <FarmArt name={pin.art} size={44} overrideKey={`pin:${pin.key}`} /> : <GameIcon name={pin.icon} overrideKey={`pin:${pin.key}`} size={36} />}
            {count > 0 && <em>{count}</em>}
          </span>
          <span className="map-pin-label">{pin.label}</span>
          {timer !== undefined && <span className="map-pin-timer"><SvgIcon icon={Timer} size={10} />{shortTime(timer)}</span>}
        </button>;
      })}
    </div>

    <GameDock badges={badges} active="home" open={open} />
  </div>;
}
