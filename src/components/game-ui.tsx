"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Carrot,
  Check,
  ChevronRight,
  Clock3,
  Egg,
  Fish,
  Gem,
  Leaf,
  Milk,
  Minus,
  Mountain,
  Package,
  Pickaxe,
  Plus,
  Sprout,
  Sun,
  Waves,
  Wheat,
  X,
  type LucideIcon,
} from "lucide-react";
import { ITEMS } from "@/lib/game-config";
import { avatarConfig } from "@/lib/avatars";
import { GameIcon } from "./icons";
import { SvgIcon } from "./svg-icons";

export function Button({ children, className = "", variant = "primary", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "soft" | "danger" | "dark" }) {
  return <button className={`btn btn-${variant} ${className}`} {...props}>{children}</button>;
}

export function IconButton({ children, label, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return <button className={`icon-btn ${className}`} aria-label={label} title={label} {...props}>{children}</button>;
}

const itemIcons: Record<string, LucideIcon> = {
  carrot: Carrot,
  carrot_seed: Carrot,
  wheat: Wheat,
  wheat_seed: Wheat,
  egg: Egg,
  milk: Milk,
  pickaxe: Pickaxe,
  stone: Mountain,
  coal: Mountain,
  copper: Mountain,
  iron: Mountain,
  gold: Mountain,
  diamond: Gem,
  carp: Fish,
  trout: Fish,
  catfish: Fish,
  sturgeon: Fish,
  pike: Fish,
  golden_fish: Fish,
  carp_fry: Fish,
  trout_fry: Fish,
  catfish_fry: Fish,
  sturgeon_fry: Fish,
};


export function Avatar({ name, size = 38 }: { name: string; size?: number }) {
  if (name === "sprout") {
    // eslint-disable-next-line @next/next/no-img-element
    return <span className="avatar avatar-photo" style={{ width: size, height: size }}><img src="/images/farmer-avatar-small.png" alt="Фермер" /></span>;
  }
  if (name.startsWith("custom-")) {
    const id = name.slice(7);
    return <span className="avatar avatar-custom" style={{ width: size, height: size }}><img src={`/api/asset/${encodeURIComponent(`avatar:${id}`)}`} alt="Аватар игрока" /></span>;
  }
  const config = avatarConfig(name);
  return <span className={`avatar avatar-${name}`} style={{ width: size, height: size, background: config.bg, color: "#5b4a2c" }}><GameIcon name={config.icon} size={Math.round(size * 0.58)} /></span>;
}

export function ItemIcon({ itemKey, size = 22 }: { itemKey: string; size?: number }) {
  const item = ITEMS[itemKey];
  const key = itemKey.endsWith("_seed") || itemKey.endsWith("_fry") ? itemKey : itemKey;
  return <span className={`item-icon item-${item?.category ?? "supply"}`}><GameIcon name={item?.icon ?? key} overrideKey={itemKey} size={size} /></span>;
}

export function formatDuration(ms: number) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes >= 60) return `${Math.floor(minutes / 60)} ч ${minutes % 60} мин`;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export function formatDate(value: string | number) {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function ProgressTimer({ startedAt, readyAt, now, label }: { startedAt: number; readyAt: number; now: number; label?: string }) {
  const remaining = readyAt - now;
  const duration = Math.max(1, readyAt - startedAt);
  const progress = Math.max(0, Math.min(100, ((now - startedAt) / duration) * 100));
  return <div className="timer-wrap">
    <div className="timer-line"><span>{label ?? (remaining <= 0 ? "Можно собирать" : "До готовности")}</span><strong className={remaining <= 0 ? "ready-text" : ""}>{remaining <= 0 ? <><SvgIcon icon={Check} size={14} /> Готово</> : <><SvgIcon icon={Clock3} size={14} /> {formatDuration(remaining)}</>}</strong></div>
    <div className="progress-track"><span style={{ width: `${remaining <= 0 ? 100 : progress}%` }} /></div>
  </div>;
}

export function LevelLock({ level, current }: { level: number; current: number }) {
  if (current >= level) return null;
  return <span className="level-lock">{level} уровень</span>;
}

export function CardTitle({ icon, title, subtitle, action }: { icon?: ReactNode; title: string; subtitle?: string; action?: ReactNode }) {
  return <div className="card-title"><div className="card-title-main">{icon}<div><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div></div>{action}</div>;
}

export function EmptyState({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <div className="empty-state"><span>{icon}</span><h3>{title}</h3><p>{text}</p></div>;
}

export function Stepper({ value, onChange, max = 99 }: { value: number; onChange: (value: number) => void; max?: number }) {
  return <div className="stepper"><IconButton label="Уменьшить" onClick={() => onChange(Math.max(1, value - 1))}><SvgIcon icon={Minus} size={16} /></IconButton><strong>{value}</strong><IconButton label="Увеличить" onClick={() => onChange(Math.min(max, value + 1))}><SvgIcon icon={Plus} size={16} /></IconButton></div>;
}

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const sheet = <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="modal-sheet" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-head"><h2>{title}</h2><IconButton label="Закрыть" onClick={onClose}><SvgIcon icon={X} size={20} /></IconButton></div>
      {children}
    </section>
  </div>;
  return typeof document === "undefined" ? sheet : createPortal(sheet, document.body);
}

export function LinkRow({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button className="link-row" onClick={onClick}>{children}<SvgIcon icon={ChevronRight} size={18} /></button>;
}
