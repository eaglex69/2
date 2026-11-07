"use client";

import type { CSSProperties } from "react";
import { ChevronLeft, Menu, Plus, Settings } from "lucide-react";
import { dayKey, xpNeeded } from "@/lib/game-config";
import { liveEnergy } from "@/lib/energy";
import type { GamePayload, ModuleKey, OpenModule, SocialPayload } from "./game-types";
import { Avatar } from "./game-ui";
import { FarmArt } from "./FarmArt";
import { useDesign } from "./DesignProvider";
import { DEFAULT_LAYOUT, HUD_ITEMS } from "@/lib/design-config";
import { UiIcon } from "./icons";
import { MODULE_META } from "./module-meta";

const nf = new Intl.NumberFormat("ru-RU");
const compact = new Intl.NumberFormat("ru-RU", { notation: "compact", maximumFractionDigits: 1 });
export const resourceText = (value: number) => (value >= 10000 ? compact.format(value) : nf.format(value));

// Модули водного раздела открываются в одном разделе «Водоёмы».
export const WATER_KEYS: ModuleKey[] = ["ponds", "cages", "fishing"];

export type DockBadges = { city: number; garden: number; mail: number; friends: number; water: number; giftFree: boolean; wheelFree: boolean };

export function dockBadges(payload: GamePayload, social: SocialPayload | null, now: number): DockBadges {
  const { state, user } = payload;
  return {
    city: state.orders.items.filter((order) => !state.orders.completed.includes(order.id) && (state.inventory[order.itemKey] ?? 0) >= order.quantity).length,
    garden: state.plots.filter((plot) => plot.crop && plot.readyAt <= now).length,
    mail: payload.unreadMail,
    friends: social ? social.friends.filter((friend) => friend.status === "pending" && friend.addresseeId === user.id).length : 0,
    water: state.ponds.filter((slot) => slot.species && slot.readyAt <= now).length + state.cages.filter((slot) => slot.species && slot.readyAt <= now).length,
    giftFree: !state.claimedPromos.includes(`daily:${dayKey(new Date(now))}`),
    wheelFree: state.wheel.freeDay !== dayKey(new Date(now)),
  };
}

export function PlayerBadge({ payload, open, now }: { payload: GamePayload; open: OpenModule; now: number }) {
  const { state, user } = payload;
  void now;
  const need = xpNeeded(state.level);
  const style = { "--xp-progress": `${Math.min(100, state.xp / need * 100)}%` } as CSSProperties;
  return <button className="map-player" onClick={() => open("profile")} aria-label={`Профиль: ${user.displayName}, уровень ${state.level}`} title={`${user.displayName} · ${state.xp}/${need} опыта`}>
    <span className="map-player-ring" style={style}><Avatar name={user.avatar} size={96} /></span>
    <span className="map-player-level">{state.level}</span>
    <span className="map-player-name">{user.displayName}</span>
  </button>;
}

export function ResourcePills({ payload, now, open }: { payload: GamePayload; now: number; open: OpenModule }) {
  const { state } = payload;
  const energy = liveEnergy(state, now);
  const hint = energy.full ? `Энергия: ${energy.energy} из ${energy.max}` : `Энергия: ${energy.energy} из ${energy.max} · +1 через ${Math.ceil(energy.nextMs / 1000)} с`;
  return <div className="map-resources" aria-label="Ресурсы фермы">
    <div className={`map-resource resource-energy ${energy.full ? "is-full" : "is-charging"}`}>
      <span className="resource-fill" style={{ width: `${energy.progress * 100}%` }} />
      <FarmArt name="energy" size={52} className="resource-art" overrideKey="ui:energy" />
      <button className="resource-value" onClick={() => open("jobs")} title={hint}>{energy.energy}/{energy.max}</button>
      <button className="resource-plus" onClick={() => open("shop")} aria-label="Восстановить энергию"><Plus size={16} strokeWidth={3.5} /></button>
    </div>
    <div className="map-resource resource-gems">
      <FarmArt name="gem" size={52} className="resource-art" overrideKey="ui:gem" />
      <button className="resource-value" onClick={() => open("promos")} title={`Алмазы: ${state.gems}`}>{resourceText(state.gems)}</button>
      <button className="resource-plus" onClick={() => open("bank")} aria-label="Получить алмазы"><Plus size={16} strokeWidth={3.5} /></button>
    </div>
    <div className="map-resource resource-coins">
      <FarmArt name="coin" size={52} className="resource-art" overrideKey="ui:coin" />
      <button className="resource-value" onClick={() => open("market")} title={`Монеты: ${state.coins}`}>{resourceText(state.coins)}</button>
      <button className="resource-plus" onClick={() => open("bank")} aria-label="Получить монеты"><Plus size={16} strokeWidth={3.5} /></button>
    </div>
  </div>;
}

export function SettingsButton({ onMenu }: { onMenu: () => void }) {
  return <button className="map-settings" onClick={onMenu} aria-label="Все разделы и настройки" title="Все разделы"><Settings size={32} strokeWidth={2.8} /></button>;
}

// Шапка внутренних разделов — тот же HUD, что и на главной карте.
export function TopHud({ payload, now, active, open, onMenu }: { payload: GamePayload; now: number; active: ModuleKey; open: OpenModule; onMenu: () => void }) {
  const meta = MODULE_META[active];
  return <header className="inner-hud">
    <div className="inner-hud-row">
      <PlayerBadge payload={payload} open={open} now={now} />
      <ResourcePills payload={payload} now={now} open={open} />
      <SettingsButton onMenu={onMenu} />
    </div>
    {active !== "profile" && <div className="inner-title">
      <button className="inner-back" onClick={() => open("home")} aria-label="На главную карту" title="На карту"><UiIcon id="back" fallback={ChevronLeft} size={24} /></button>
      <span className="inner-title-ico"><UiIcon id={`module:${active}`} fallback={meta.icon} size={22} /></span>
      <div><strong>{meta.title}</strong><small>{meta.subtitle}</small></div>
      <button className="inner-menu" onClick={onMenu} aria-label="Все разделы"><UiIcon id="settings" fallback={Menu} size={20} /></button>
    </div>}
  </header>;
}

type DockItem = { key: ModuleKey; art: string; label: string; badge?: number; free?: boolean; keys?: ModuleKey[] };

// Нижний док: один и тот же на карте и во всех разделах.
const DOCK_META = new Map(HUD_ITEMS.map((item) => [item.key, item]));

export function GameDock({ badges, active, open, fixed }: { badges: DockBadges; active: ModuleKey; open: OpenModule; fixed?: boolean }) {
  const design = useDesign();
  const visible = design.layout?.dock ?? DEFAULT_LAYOUT.dock;
  const badgeFor = (key: ModuleKey): { badge?: number; free?: boolean; keys?: ModuleKey[] } => {
    if (key === "city") return { badge: badges.city };
    if (key === "garden") return { badge: badges.garden };
    if (key === "ponds") return { badge: badges.water, keys: WATER_KEYS };
    if (key === "wheel") return { free: badges.wheelFree };
    if (key === "mail") return { badge: badges.mail };
    if (key === "promos") return { free: badges.giftFree };
    if (key === "friends") return { badge: badges.friends };
    return {};
  };
  const keys: ModuleKey[] = [
    ...(fixed ? (["home"] as ModuleKey[]) : []),
    ...visible.filter((key): key is ModuleKey => key !== "home" && DOCK_META.has(key)),
  ];
  const items: DockItem[] = keys.map((key) => {
    const meta = DOCK_META.get(key) ?? { key, label: MODULE_META[key]?.title ?? key, art: "map" };
    const label = key === "promos" ? "Подарок" : meta.label;
    return { key, art: meta.art, label, ...badgeFor(key) };
  });
  return <nav className={`map-dock ${fixed ? "is-fixed" : ""}`} aria-label="Быстрые действия">
    <div className="map-dock-track">
      {items.map((item) => {
        const current = (item.keys ?? [item.key]).includes(active);
        return <button className={`map-dock-button ${current ? "is-current" : ""}`} key={item.key} onClick={() => open(item.key)} aria-label={item.label} aria-current={current ? "page" : undefined} title={item.label}>
          <FarmArt name={item.art} size={62} overrideKey={`ui:module:${item.key}`} />
          <span className="dock-label">{item.label}</span>
          {!!item.badge && <span className="dock-badge">{item.badge > 9 ? "9+" : item.badge}</span>}
          {item.free && <span className="dock-free">Free</span>}
        </button>;
      })}
    </div>
  </nav>;
}
