"use client";

import { Clock, Sparkles } from "lucide-react";
import { BONUS_KINDS, type Bonus } from "@/lib/bonus";
import { CardTitle } from "./game-ui";
import { SvgIcon } from "./svg-icons";

export function leftLabel(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const d = Math.floor(s / 86_400);
  const h = Math.floor((s % 86_400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d} д ${h} ч`;
  if (h > 0) return `${h} ч ${m} м`;
  return `${Math.max(1, m)} м`;
}

export const multLabel = (bonus: Bonus) => `×${Number(bonus.multiplier.toFixed(2))}`;
export const isBonusActive = (bonus: Bonus, now: number) => bonus.active && bonus.startsAt <= now && now < bonus.endsAt;

function Chip({ bonus, now, onOpen }: { bonus: Bonus; now: number; onOpen?: () => void }) {
  return <button className="bonus-chip" onClick={onOpen}><SvgIcon icon={Sparkles} size={13} />{multLabel(bonus)} {BONUS_KINDS[bonus.kind]?.short}<small>{leftLabel(bonus.endsAt - now)}</small></button>;
}

export function BonusChips({ bonuses, now, onOpen }: { bonuses: Bonus[]; now: number; onOpen: () => void }) {
  const active = bonuses.filter((bonus) => isBonusActive(bonus, now));
  if (!active.length) return null;
  return <div className="hud hud-bonus">{active.map((bonus) => <Chip key={bonus.id} bonus={bonus} now={now} onOpen={onOpen} />)}</div>;
}

export function BonusStrip({ bonuses, now, onOpen }: { bonuses: Bonus[]; now: number; onOpen: () => void }) {
  const active = bonuses.filter((bonus) => isBonusActive(bonus, now));
  if (!active.length) return null;
  return <div className="bonus-strip">{active.map((bonus) => <Chip key={bonus.id} bonus={bonus} now={now} onOpen={onOpen} />)}</div>;
}

export function BonusList({ bonuses, now }: { bonuses: Bonus[]; now: number }) {
  const active = bonuses.filter((bonus) => isBonusActive(bonus, now));
  const upcoming = bonuses.filter((bonus) => bonus.active && bonus.startsAt > now);
  return <section className="panel bonus-panel">
    <CardTitle icon={<SvgIcon icon={Sparkles} size={20} />} title="Бонусы дня и недели" subtitle="Включаются автоматически на всей ферме" />
    {active.length === 0 && upcoming.length === 0 && <p className="muted">Сейчас активных бонусов нет. Следите за новостями — они появляются по праздникам и выходным.</p>}
    {active.map((bonus) => <div className="bonus-row" key={bonus.id}>
      <span className="bonus-mult">{multLabel(bonus)}</span>
      <div><strong>{bonus.title}</strong><small>{BONUS_KINDS[bonus.kind]?.description}</small></div>
      <span className="bonus-left"><SvgIcon icon={Clock} size={12} />{leftLabel(bonus.endsAt - now)}</span>
    </div>)}
    {upcoming.map((bonus) => <div className="bonus-row soon" key={bonus.id}>
      <span className="bonus-mult">{multLabel(bonus)}</span>
      <div><strong>{bonus.title}</strong><small>Начнётся через {leftLabel(bonus.startsAt - now)}</small></div>
    </div>)}
  </section>;
}
