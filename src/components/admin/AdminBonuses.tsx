"use client";

import { useState } from "react";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import { BONUS_KINDS, type BonusKind } from "@/lib/bonus";
import { Btn, Card, Empty, Field, Loading, Pill, fmt, useRunner, useSection, type Notify, type Row } from "./admin-kit";
import { SvgIcon } from "../svg-icons";

const PRESETS: [string, string][] = [["1", "1 час"], ["6", "6 часов"], ["24", "День (24 ч)"], ["72", "3 дня"], ["168", "Неделя (7 дней)"], ["336", "2 недели"], ["custom", "Своё значение"]];
const QUICK: { label: string; kind: BonusKind; multiplier: number; hours: number; title: string }[] = [
  { label: "×2 опыт · день", kind: "xp", multiplier: 2, hours: 24, title: "Двойной опыт дня" },
  { label: "×2 опыт · неделя", kind: "xp", multiplier: 2, hours: 168, title: "Двойной опыт недели" },
  { label: "×2 урожай · день", kind: "yield", multiplier: 2, hours: 24, title: "Урожайный день" },
  { label: "×1.5 продажа · день", kind: "sell", multiplier: 1.5, hours: 24, title: "Ярмарочный день" },
  { label: "×2 скорость · день", kind: "speed", multiplier: 2, hours: 24, title: "Быстрый день" },
  { label: "×2 скидка · день", kind: "discount", multiplier: 2, hours: 24, title: "Скидки дня" },
];

export function BonusEditor({ notify }: { notify: Notify }) {
  const { data, loading, error, reload } = useSection("bonuses");
  const { run, busy } = useRunner(notify, reload);
  const [kind, setKind] = useState<BonusKind>("xp");
  const [multiplier, setMultiplier] = useState(2);
  const [title, setTitle] = useState("");
  const [preset, setPreset] = useState("24");
  const [custom, setCustom] = useState(48);
  const [start, setStart] = useState("");
  const list = (data?.bonuses ?? []) as Row[];
  const hours = preset === "custom" ? custom : Number(preset);

  function status(row: Row) {
    const now = Date.now();
    const from = new Date(row.startsAt).getTime();
    const to = new Date(row.endsAt).getTime();
    if (!row.active) return <Pill tone="amber">выключен</Pill>;
    if (to <= now) return <Pill>завершён</Pill>;
    if (from > now) return <Pill tone="blue">запланирован</Pill>;
    return <Pill tone="green">идёт</Pill>;
  }

  return <div className="adm-stack">
    <Card title="Быстрые бонусы" subtitle="Запускаются сразу и действуют на всех игроков">
      <div className="adm-quick">{QUICK.map((quick) => <Btn key={quick.label} disabled={busy} onClick={() => void run({ type: "bonus-save", kind: quick.kind, multiplier: quick.multiplier, hours: quick.hours, title: quick.title })}><SvgIcon icon={Sparkles} size={14} />{quick.label}</Btn>)}</div>
    </Card>

    <Card title="Новый бонус" subtitle="Одинаковые бонусы не складываются: действует самый сильный. Игроки видят бонус на карте и в разделе «Акции»">
      <div className="adm-grid-3">
        <Field label="Что усиливаем"><select value={kind} onChange={(event) => setKind(event.target.value as BonusKind)}>{(Object.keys(BONUS_KINDS) as BonusKind[]).map((key) => <option value={key} key={key}>{BONUS_KINDS[key].label}</option>)}</select></Field>
        <Field label="Множитель"><input type="number" min={1.05} max={20} step={0.25} value={multiplier} onChange={(event) => setMultiplier(Number(event.target.value))} /></Field>
        <Field label="Длительность"><select value={preset} onChange={(event) => setPreset(event.target.value)}>{PRESETS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></Field>
      </div>
      {preset === "custom" && <Field label="Своя длительность, часов"><input type="number" min={1} max={8760} value={custom} onChange={(event) => setCustom(Number(event.target.value))} /></Field>}
      <div className="adm-row">
        <Field label="Название (необязательно)"><input value={title} maxLength={60} onChange={(event) => setTitle(event.target.value)} placeholder="Двойной опыт выходных" /></Field>
        <Field label="Начало (пусто — сразу)"><input type="datetime-local" value={start} onChange={(event) => setStart(event.target.value)} /></Field>
      </div>
      <p className="adm-hint">{BONUS_KINDS[kind].description}. Для скидки множитель делит цену: ×2 — вдвое дешевле.</p>
      <Btn kind="primary" disabled={busy || hours < 1} onClick={async () => { if (await run({ type: "bonus-save", kind, multiplier, hours, title, startsAt: start ? new Date(start).toISOString() : "" })) { setTitle(""); setStart(""); } }}><SvgIcon icon={Plus} size={16} />Запустить бонус</Btn>
    </Card>

    <Loading error={error} loading={loading && !data} />
    {data && <Card title={`Бонусы · ${list.length}`}>{list.length === 0 ? <Empty text="Бонусов пока нет" /> : list.map((row) => <div className="adm-line top" key={row.id}>
      <div><strong>{row.title}</strong> {status(row)}<small> · ×{Number(Number(row.multiplier).toFixed(2))} {BONUS_KINDS[row.kind as BonusKind]?.label}</small><p className="adm-text">{fmt(row.startsAt)} — {fmt(row.endsAt)}</p></div>
      <div className="adm-actions"><Btn disabled={busy} onClick={() => void run({ type: "bonus-toggle", id: row.id })}>{row.active ? "Выключить" : "Включить"}</Btn><Btn kind="danger" disabled={busy} onClick={() => void run({ type: "bonus-delete", id: row.id }, "Удалить бонус?")}><SvgIcon icon={Trash2} size={14} /></Btn></div>
    </div>)}</Card>}
  </div>;
}
