"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Pencil, Plus, Trash2, X } from "lucide-react";
import { GAME_ICONS, GameIcon } from "@/components/icons";
import { rebuildConfig } from "@/lib/content";
import { ITEMS } from "@/lib/game-config";
import { resizeImage } from "@/lib/image";
import { Btn, Card, Empty, Field, Loading, Pill, useRunner, useSection, type Notify, type Row } from "./admin-kit";
import { SvgIcon } from "../svg-icons";

const KINDS: [string, string][] = [["crop", "Растение + семена"], ["pond", "Рыба для пруда + малёк"], ["cage", "Рыба для садка + малёк"], ["animal", "Животное + продукт"], ["recipe", "Рецепт погреба"], ["item", "Материал / предмет"]];
const DEFAULTS: Row = { key: "", name: "", price: 20, duration: 60, yield: 2, xp: 15, level: 1, feed: 2, seedPrice: 25, fryPrice: 20, gemPrice: 0, gems: 0, icon: "carrot", category: "mineral", input1: "wheat", amount1: 2, input2: "", amount2: 1, description: "", productName: "" };

export function ContentEditor({ notify }: { notify: Notify }) {
  const { data, loading, error, reload } = useSection("content-editor");
  const { run, busy } = useRunner(notify, reload);
  const [kind, setKind] = useState("crop");
  const [form, setForm] = useState<Row>({ ...DEFAULTS });
  const [iconData, setIconData] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [, setTick] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const set = (key: string, value: unknown) => setForm((current: Row) => ({ ...current, [key]: value }));
  const items = (data?.items ?? []) as Row[];
  const icons = ((data?.design as Row | undefined)?.icons ?? {}) as Record<string, string>;

  // Добавленные предметы должны попадать в списки ингредиентов.
  useEffect(() => {
    if (!data) return;
    rebuildConfig(data.content ?? [], data.balance);
    setTick((value) => value + 1);
  }, [data]);

  const existingIcon = icons[form.key] ?? (form.key ? icons[`${form.key}_seed`] : undefined);
  const numeric = (key: string, label: string) => <Field label={label}><input type="number" value={form[key]} onChange={(event) => set(key, Number(event.target.value))} /></Field>;

  function clear() {
    setForm({ ...DEFAULTS });
    setIconData(null);
    setEditing(false);
  }

  async function chooseIcon(file: File | undefined) {
    if (!file) return;
    try { setIconData(await resizeImage(file, 160, "image/png")); } catch { notify("Не удалось прочитать картинку", true); }
  }

  return <div className="adm-stack">
    <Card title={editing ? `Редактирование: ${form.name || form.key}` : "Добавить контент в игру"} subtitle="Растения, семена, рыба, животные, рецепты и материалы. Сразу появляется в магазине и производстве" action={editing ? <Btn onClick={clear}><SvgIcon icon={X} size={14} />Отменить</Btn> : undefined}>
      <div className="adm-row"><Field label="Тип"><select value={kind} disabled={editing} onChange={(event) => { setKind(event.target.value); set("key", ""); }}>{KINDS.map(([k, l]) => <option value={k} key={k}>{l}</option>)}</select></Field><Field label="Ключ (латиницей)"><input value={form.key} disabled={editing} onChange={(event) => set("key", event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} placeholder="blueberry" /></Field></div>
      <div className="adm-row"><Field label="Название"><input value={form.name} onChange={(event) => set("name", event.target.value)} placeholder="Голубика" /></Field>{kind === "animal" && <Field label="Название продукта"><input value={form.productName ?? ""} onChange={(event) => set("productName", event.target.value)} placeholder="Страусиное яйцо" /></Field>}</div>

      <div className="adm-icon-pick">
        <span className="adm-icon-preview big">{iconData
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={iconData} alt="Загруженная иконка" width={44} height={44} />
          : existingIcon
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={existingIcon} alt="Текущая иконка" width={44} height={44} />
            : <GameIcon name={form.icon} size={32} />}</span>
        <div>
          <strong>Иконка</strong>
          <small>Загрузите свою картинку (PNG с прозрачностью лучше всего) или выберите стандартную</small>
          <div className="adm-actions">
            <input ref={fileInput} type="file" accept="image/*" hidden onChange={(event) => { void chooseIcon(event.target.files?.[0]); event.target.value = ""; }} />
            <Btn onClick={() => fileInput.current?.click()}><SvgIcon icon={ImagePlus} size={15} />Загрузить свою</Btn>
            {iconData && <Btn onClick={() => setIconData(null)}><SvgIcon icon={X} size={14} />Убрать</Btn>}
            <select className="adm-icon-select" value={form.icon} onChange={(event) => set("icon", event.target.value)} aria-label="Стандартная иконка">{Object.keys(GAME_ICONS).map((key) => <option key={key} value={key}>{key}</option>)}</select>
          </div>
        </div>
      </div>

      <Field label="Описание"><input value={form.description} onChange={(event) => set("description", event.target.value)} maxLength={120} /></Field>
      <div className="adm-grid-3">
        {numeric("price", kind === "animal" ? "Цена продукта" : "Цена")}
        {kind !== "item" && numeric("duration", "Время, сек")}
        {kind !== "item" && numeric("yield", "Выход")}
        {kind !== "item" && numeric("xp", "Опыт")}
        {kind !== "item" && numeric("level", "Уровень")}
        {kind === "crop" && numeric("seedPrice", "Цена семян")}
        {(kind === "pond" || kind === "cage") && numeric("fryPrice", "Цена малька")}
        {kind === "animal" && numeric("feed", "Корма за цикл")}
        {(kind === "crop" || kind === "pond" || kind === "cage") && numeric("gemPrice", kind === "crop" ? "Семена за алмазы (0 — за монеты)" : "Малёк за алмазы (0 — за монеты)")}
        {kind === "animal" && numeric("gems", "Покупка животного за алмазы (0 — свободно)")}
        {kind === "item" && numeric("gemPrice", "Цена в алмазах (0 — не продаётся)")}
        {kind === "item" && <Field label="Категория"><select value={form.category} onChange={(event) => set("category", event.target.value)}>{["mineral", "supply", "processed", "crop", "fish", "animal"].map((c) => <option key={c}>{c}</option>)}</select></Field>}
      </div>
      {kind === "recipe" && <div className="adm-grid-3"><Field label="Ингредиент 1"><select value={form.input1} onChange={(event) => set("input1", event.target.value)}>{Object.keys(ITEMS).map((key) => <option value={key} key={key}>{ITEMS[key].name}</option>)}</select></Field>{numeric("amount1", "Кол-во 1")}<Field label="Ингредиент 2 (необязательно)"><select value={form.input2} onChange={(event) => set("input2", event.target.value)}><option value="">—</option>{Object.keys(ITEMS).map((key) => <option value={key} key={key}>{ITEMS[key].name}</option>)}</select></Field>{numeric("amount2", "Кол-во 2")}</div>}
      <Btn kind="primary" disabled={busy || !form.key || !form.name} onClick={async () => { if (await run({ type: "item-save", kind, key: form.key, data: form, iconData: iconData ?? "" })) clear(); }}>{editing ? <SvgIcon icon={Pencil} size={16} /> : <SvgIcon icon={Plus} size={16} />}{editing ? "Сохранить изменения" : "Сохранить в игре"}</Btn>
    </Card>

    <Loading error={error} loading={loading && !data} />
    {data && <Card title={`Пользовательский контент · ${items.length}`} subtitle="Встроенный контент настраивается в разделе «Баланс»; здесь — добавленный админами">{items.length === 0 ? <Empty text="Пока ничего не добавлено" /> : items.map((row) => {
      const rowIcon = icons[row.key] ?? icons[`${row.key}_seed`];
      return <div className="adm-line" key={row.key}>
        <span className="adm-icon-preview">{rowIcon
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={rowIcon} alt="" width={28} height={28} />
          : <GameIcon name={String((row.data as Row).icon ?? "leaf")} size={22} />}</span>
        <div><strong>{String((row.data as Row).name)}</strong><small>{row.kind} · {row.key}</small></div>
        <Pill tone={row.enabled ? "green" : "gray"}>{row.enabled ? "в игре" : "выкл."}</Pill>
        <div className="adm-actions">
          <Btn disabled={busy} onClick={() => { setKind(row.kind); setForm({ ...DEFAULTS, ...(row.data as Row), key: row.key }); setIconData(null); setEditing(true); window.scrollTo({ top: 0 }); }}><SvgIcon icon={Pencil} size={14} />Изменить</Btn>
          <Btn disabled={busy} onClick={() => void run({ type: "item-toggle", key: row.key })}>{row.enabled ? "Выключить" : "Включить"}</Btn>
          <Btn kind="danger" disabled={busy} onClick={() => void run({ type: "item-delete", key: row.key }, "Удалить контент?")}><SvgIcon icon={Trash2} size={14} /></Btn>
        </div>
      </div>;
    })}</Card>}
  </div>;
}
