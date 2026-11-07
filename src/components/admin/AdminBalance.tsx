"use client";

import { useEffect, useState } from "react";
import { RotateCcw, Save } from "lucide-react";
import {
  FIELDS, KIND_TITLES, baseGlobals, baseKeys, baseUpgrades, entityName, readBase, readGlobals, readUpgrades, readValues,
  rebuildConfig, type Balance,
} from "@/lib/content";
import { UPGRADES } from "@/lib/game-config";
import { Btn, Card, Loading, useRunner, useSection, type Notify } from "./admin-kit";
import { SvgIcon } from "../svg-icons";

type Draft = {
  values: Record<string, Record<string, number>>;
  upgrades: Record<string, Record<string, number>>;
  globals: Record<string, number>;
};

const KINDS = Object.keys(KIND_TITLES);
const GLOBAL_LABELS: Record<string, string> = {
  barnBase: "Вместимость амбара (базовая)",
  barnPerLevel: "Вместимость за каждый уровень амбара",
  energyRegenSec: "Секунд на восстановление 1 энергии",
  energyUpgradeBonus: "Энергия за улучшение «Дом фермера»",
  maxLevel: "Максимальный уровень игрока",
  wheelSpinGems: "Алмазов за платное вращение колеса",
  wheelPaidDaily: "Платных вращений колеса в день",
};
const UPGRADE_FIELDS = [{ k: "max", label: "Максимум" }, { k: "baseCost", label: "Базовая цена" }, { k: "mult", label: "Рост цены, ×", step: 0.05 }];

function buildDraft(): Draft {
  const values: Draft["values"] = {};
  for (const kind of KINDS) for (const key of baseKeys(kind)) {
    const current = readValues(kind, key);
    if (current) values[`${kind}:${key}`] = current;
  }
  return { values, upgrades: readUpgrades(), globals: readGlobals() };
}

// В баланс попадают только отличия от стандартных значений.
function toBalance(draft: Draft): Balance {
  const overrides: Balance["overrides"] = {};
  for (const [id, current] of Object.entries(draft.values)) {
    const [kind, key] = id.split(":");
    const base = readBase(kind, key) ?? {};
    const diff: Record<string, number> = {};
    for (const field of FIELDS[kind]) if (current[field.k] !== base[field.k]) diff[field.k] = current[field.k];
    if (Object.keys(diff).length) overrides[id] = diff;
  }
  const upgrades: Balance["upgrades"] = {};
  const baseUp = baseUpgrades();
  for (const [kind, current] of Object.entries(draft.upgrades)) {
    const diff: Record<string, number> = {};
    for (const field of UPGRADE_FIELDS) if (current[field.k] !== baseUp[kind]?.[field.k]) diff[field.k] = current[field.k];
    if (Object.keys(diff).length) upgrades[kind] = diff;
  }
  const globals: Balance["globals"] = {};
  const baseGl = baseGlobals();
  for (const [field, value] of Object.entries(draft.globals)) if (value !== baseGl[field]) globals[field] = value;
  return { overrides, upgrades, globals };
}

export function BalanceEditor({ notify }: { notify: Notify }) {
  const { data, loading, error, reload } = useSection("balance");
  const { run, busy } = useRunner(notify, reload);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [tab, setTab] = useState<string>("crop");
  const [query, setQuery] = useState("");

  // Конфигурация пересобирается на клиенте из ответа сервера, затем строится черновик.
  useEffect(() => {
    if (!data) return;
    rebuildConfig(data.content ?? [], data.balance);
    setDraft(buildDraft());
  }, [data]);

  if (!draft) return <Loading error={error} loading={loading} />;

  const changes = (() => {
    const b = toBalance(draft);
    return Object.keys(b.overrides).length + Object.keys(b.upgrades).length + Object.keys(b.globals).length;
  })();
  const setCell = (id: string, field: string, value: string) => setDraft({ ...draft, values: { ...draft.values, [id]: { ...draft.values[id], [field]: Number(value) } } });
  const resetRow = (kind: string, key: string) => setDraft({ ...draft, values: { ...draft.values, [`${kind}:${key}`]: readBase(kind, key) ?? {} } });
  const save = () => run({ type: "balance-save", balance: toBalance(draft) });

  const tabs: [string, string][] = [...KINDS.map((kind): [string, string] => [kind, KIND_TITLES[kind]]), ["upgrades", "Улучшения и лимиты"], ["globals", "Общее"]];
  const keys = FIELDS[tab] ? baseKeys(tab).filter((key) => `${entityName(tab, key)} ${key}`.toLowerCase().includes(query.toLowerCase())) : [];

  return <div className="adm-stack">
    <Card title="Баланс игры" subtitle="Время, цены, опыт, уровни и лимиты всех встроенных растений, животных, рыбы, рецептов, работ и шахт. Контент, добавленный админами, правится в разделе «Контент игры»">
      <div className="adm-segment">{tabs.map(([key, label]) => <button className={tab === key ? "active" : ""} onClick={() => setTab(key)} key={key}>{label}</button>)}</div>
      <div className="adm-actions">
        <Btn kind="primary" disabled={busy} onClick={() => void save()}><SvgIcon icon={Save} size={16} />Сохранить и применить{changes ? ` (${changes})` : ""}</Btn>
        <Btn kind="danger" disabled={busy} onClick={async () => { await run({ type: "balance-reset" }, "Вернуть ВСЕ значения баланса к стандартным?"); }}><SvgIcon icon={RotateCcw} size={15} />Сбросить весь баланс</Btn>
      </div>
    </Card>

    {FIELDS[tab] && <Card title={KIND_TITLES[tab]} subtitle="Изменённые значения подсвечены. В подсказке — стандартное значение">
      <div className="adm-search"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск по названию" /></div>
      <div className="adm-table-wrap"><table className="adm-table static"><thead><tr><th>Название</th>{FIELDS[tab].map((field) => <th key={field.k}>{field.label}</th>)}<th /></tr></thead><tbody>
        {keys.map((key) => {
          const id = `${tab}:${key}`;
          const current = draft.values[id] ?? {};
          const base = readBase(tab, key) ?? {};
          return <tr key={id}>
            <td><strong>{entityName(tab, key)}</strong><small>{key}</small></td>
            {FIELDS[tab].map((field) => <td key={field.k}><input className={`adm-num ${current[field.k] !== base[field.k] ? "adm-changed" : ""}`} type="number" min={0} step={field.step ?? 1} value={Number.isFinite(current[field.k]) ? current[field.k] : 0} title={`Стандарт: ${base[field.k]}`} onChange={(event) => setCell(id, field.k, event.target.value)} /></td>)}
            <td><Btn onClick={() => resetRow(tab, key)} title="Вернуть стандарт"><SvgIcon icon={RotateCcw} size={13} /></Btn></td>
          </tr>;
        })}
      </tbody></table></div>
    </Card>}

    {tab === "upgrades" && <Card title="Улучшения и максимальные уровни" subtitle="«Максимум» — предельное число грядок, прудов, загонов, садков или уровней. Цена = базовая × рост^(текущий уровень − 1)">
      <div className="adm-table-wrap"><table className="adm-table static"><thead><tr><th>Улучшение</th>{UPGRADE_FIELDS.map((field) => <th key={field.k}>{field.label}</th>)}</tr></thead><tbody>
        {Object.entries(UPGRADES).map(([kind, meta]) => {
          const current = draft.upgrades[kind] ?? {};
          const base = baseUpgrades()[kind] ?? {};
          return <tr key={kind}><td><strong>{meta.name}</strong><small>{kind}</small></td>
            {UPGRADE_FIELDS.map((field) => <td key={field.k}><input className={`adm-num ${current[field.k] !== base[field.k] ? "adm-changed" : ""}`} type="number" min={0} step={field.step ?? 1} value={current[field.k] ?? 0} title={`Стандарт: ${base[field.k]}`} onChange={(event) => setDraft({ ...draft, upgrades: { ...draft.upgrades, [kind]: { ...current, [field.k]: Number(event.target.value) } } })} /></td>)}
          </tr>;
        })}
      </tbody></table></div>
    </Card>}

    {tab === "globals" && <Card title="Общие параметры" subtitle="Влияют на всех игроков сразу">
      <div className="adm-balance-globals">{Object.entries(draft.globals).map(([field, value]) => {
        const base = baseGlobals()[field];
        return <label className="adm-field" key={field}><span>{GLOBAL_LABELS[field] ?? field}</span><input className={value !== base ? "adm-changed" : ""} type="number" min={0} value={value} title={`Стандарт: ${base}`} onChange={(event) => setDraft({ ...draft, globals: { ...draft.globals, [field]: Number(event.target.value) } })} /><small>Стандарт: {base}</small></label>;
      })}</div>
    </Card>}
  </div>;
}
