"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Copy, RotateCcw, Save, Upload } from "lucide-react";
import { GAME_ICONS, GameIcon, UiIcon } from "@/components/icons";
import { SVG_ICONS } from "@/components/svg-catalog";
import { UI_ICON_LIST } from "@/components/ui-icon-list";
import { MODULE_META } from "@/components/module-meta";
import { PINS } from "@/components/map-pins";
import { ItemIcon } from "@/components/game-ui";
import { ITEMS } from "@/lib/game-config";
import { resizeImage, fontToDataUrl } from "@/lib/image";
import { DEFAULT_FONTS, DEFAULT_LAYOUT, FONT_MODULE_LABELS, FONT_OPTIONS, FONT_SCOPES, HUD_ITEMS, type HudLayout } from "@/lib/design-config";
import { Btn, Card, Empty, Field, Loading, useRunner, useSection, type Notify, type Row } from "./admin-kit";
import { SvgIcon } from "../svg-icons";

type IconEntry = { key: string; label: string; group: string; preview: ReactNode };
type SlotDefRow = { key: string; label: string; group: string };
const ICON_GROUPS = ["Интерфейс", "Разделы", "Пины карты", "Предметы", "Базовые иконки", "Все SVG"];
const CSS_HINTS = [".farm-map-bg", ".hud-portrait", ".hud-tile", ".hud-currency", ".map-pin-icon", ".btn-primary", ".btn-secondary", ".panel", ".modal-sheet", ".game-header", ".bottom-nav", ".chat-message", ".auth-card", ".splash-bar", ".game-logo", ".logo-red", ".logo-green", ".logo-banner", ".season-row", ".rating-row", ".bb-toolbar", "body"];

export function DesignEditor({ notify }: { notify: Notify }) {
  const { data, loading, error, reload } = useSection("design");
  const files = useSection("files");
  const filesReload = files.reload;
  const { run, busy } = useRunner(notify, async () => { await reload(); await filesReload(); });
  const [design, setDesign] = useState<Row | null>(null);
  const [tab, setTab] = useState<"bg" | "icons" | "layout" | "colors" | "fonts" | "css" | "files">("bg");
  const [group, setGroup] = useState(ICON_GROUPS[0]);
  const [query, setQuery] = useState("");
  const [fileName, setFileName] = useState("");

  const entries = useMemo<IconEntry[]>(() => [
    ...UI_ICON_LIST.map(({ id, label, Icon }) => ({ key: `ui:${id}`, label, group: "Интерфейс", preview: <UiIcon id={id} fallback={Icon} size={26} /> })),
    ...Object.entries(MODULE_META).map(([key, meta]) => ({ key: `ui:module:${key}`, label: meta.title, group: "Разделы", preview: <UiIcon id={`module:${key}`} fallback={meta.icon} size={26} /> })),
    ...PINS.map((pin) => ({ key: `pin:${pin.key}`, label: `Пин: ${pin.label}`, group: "Пины карты", preview: <GameIcon name={pin.icon} overrideKey={`pin:${pin.key}`} size={26} /> })),
    ...Object.values(ITEMS).map((item) => ({ key: item.key, label: item.name, group: "Предметы", preview: <ItemIcon itemKey={item.key} size={26} /> })),
    ...Object.keys(GAME_ICONS).map((key) => ({ key, label: key, group: "Базовые иконки", preview: <GameIcon name={key} size={26} /> })),
    ...Object.entries(SVG_ICONS).map(([name, Icon]) => ({ key: `svg:${name}`, label: `SVG: ${name}`, group: "Все SVG", preview: <SvgIcon icon={Icon} size={26} /> })),
  ], []);

  if (data && !design) setDesign({ ...(data.design as Row) });
  if (!design) return <Loading error={error} loading={loading} />;

  const colors = design.colors as Row;
  const slots = design.slots as Record<string, string>;
  const icons = design.icons as Record<string, string>;
  const fonts = { ...DEFAULT_FONTS, ...((design.fonts ?? {}) as Record<string, string>) };
  const moduleFonts = (design.moduleFonts ?? {}) as Record<string, string>;
  const defs = (data?.defs ?? []) as SlotDefRow[];
  const slotGroups = Array.from(new Set(defs.map((def) => def.group)));
  const fileList = (files.data?.files ?? []) as Row[];
  const setColor = (key: string, value: string) => setDesign({ ...design, colors: { ...colors, [key]: value } });

  async function uploadSlot(def: SlotDefRow, file: File) {
    const dataUrl = def.group === "Сцены" ? await resizeImage(file, 1400) : await resizeImage(file, 700, "image/png");
    if (await run({ type: "design-asset", slot: def.key, data: dataUrl })) setDesign(null);
  }
  async function clearSlot(key: string) {
    const next = { ...design!, slots: { ...slots } };
    delete next.slots[key];
    if (await run({ type: "design-save", design: next })) setDesign(null);
  }
  async function uploadIcon(key: string, file: File) {
    const dataUrl = await resizeImage(file, 160, "image/png");
    if (await run({ type: "design-icon", key, data: dataUrl })) setDesign(null);
  }

  const tabs: [typeof tab, string][] = [["bg", "Фоны и интерфейс"], ["icons", "Иконки"], ["layout", "Панели и видимость"], ["colors", "Цвета и логотип"], ["fonts", "Шрифты"], ["css", "CSS сайта"], ["files", "Файлы"]];
  return <div className="adm-stack">
    <Card><div className="adm-segment">{tabs.map(([key, label]) => <button className={tab === key ? "active" : ""} onClick={() => setTab(key)} key={key}>{label}</button>)}</div></Card>

    {tab === "bg" && slotGroups.map((g) => <Card key={g} title={g} subtitle={g === "Сцены" ? "Фоны экранов и баннеров. Лучше JPEG, вертикальные или широкие кадры" : "PNG-картинка растягивается на весь элемент (100% × 100%). Подготовьте её нужных пропорций"}>
      <div className="adm-design-slots">{defs.filter((def) => def.group === g).map((def) => <div className="adm-slot" key={def.key}>
        <div className="adm-slot-preview" style={{ backgroundImage: slots[def.key] ? `url("${slots[def.key]}")` : undefined }}>{!slots[def.key] && <span>по умолчанию</span>}</div>
        <strong>{def.label}</strong>
        <div className="adm-actions">
          <label className="adm-btn"><SvgIcon icon={Upload} size={14} />Загрузить<input type="file" accept="image/*" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadSlot(def, file); event.target.value = ""; }} /></label>
          {slots[def.key] && <Btn disabled={busy} onClick={() => void clearSlot(def.key)}><SvgIcon icon={RotateCcw} size={14} />Сброс</Btn>}
        </div>
      </div>)}</div>
    </Card>)}

    {tab === "icons" && <Card title="Иконки игры" subtitle="Любую иконку можно заменить своей картинкой (PNG с прозрачностью, автоматически уменьшается до 160 px)">
      <div className="adm-segment">{ICON_GROUPS.map((entry) => <button className={group === entry ? "active" : ""} onClick={() => setGroup(entry)} key={entry}>{entry}</button>)}</div>
      <div className="adm-search"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск иконки" /></div>
      <div className="adm-icon-grid">{entries.filter((entry) => entry.group === group && `${entry.label} ${entry.key}`.toLowerCase().includes(query.toLowerCase())).map((entry) => <div className="adm-icon-card" key={entry.key}>
        <span className="adm-icon-preview">{icons[entry.key]
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={icons[entry.key]} alt="" width={28} height={28} />
          : entry.preview}</span>
        <strong>{entry.label}</strong>
        <small>{entry.key}</small>
        <div className="adm-actions">
          <label className="adm-btn"><SvgIcon icon={Upload} size={13} />Своя<input type="file" accept="image/*" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadIcon(entry.key, file); event.target.value = ""; }} /></label>
          {icons[entry.key] && <Btn disabled={busy} onClick={async () => { if (await run({ type: "design-icon-reset", key: entry.key })) setDesign(null); }}><SvgIcon icon={RotateCcw} size={13} /></Btn>}
        </div>
      </div>)}</div>
    </Card>}


    {tab === "layout" && (() => {
      const current = {
        dock: [...DEFAULT_LAYOUT.dock],
        left: [...DEFAULT_LAYOUT.left],
        right: [...DEFAULT_LAYOUT.right],
        ...((design.layout ?? {}) as Partial<HudLayout>),
      };
      const toggle = (zone: keyof HudLayout, key: string) => {
        const list = current[zone];
        const nextList = list.includes(key) ? list.filter((item) => item !== key) : [...list, key];
        setDesign({ ...design, layout: { ...current, [zone]: nextList } });
      };
      const move = (zone: keyof HudLayout, key: string, dir: -1 | 1) => {
        const list = [...current[zone]];
        const idx = list.indexOf(key);
        const target = idx + dir;
        if (idx < 0 || target < 0 || target >= list.length) return;
        [list[idx], list[target]] = [list[target], list[idx]];
        setDesign({ ...design, layout: { ...current, [zone]: list } });
      };
      const zones: { key: keyof HudLayout; title: string; subtitle: string }[] = [
        { key: "dock", title: "Нижняя панель", subtitle: "Быстрые кнопки внизу экрана. Выключенные остаются доступными в меню «Все разделы»" },
        { key: "left", title: "Левая боковая панель", subtitle: "Круглые кнопки вдоль левого края главной карты" },
        { key: "right", title: "Правая боковая панель", subtitle: "Круглые кнопки вдоль правого края главной карты" },
      ];
      return <>
        <Card title="Расположение и видимость иконок" subtitle="Включайте и отключайте любые кнопки для нижней, левой и правой панелей или меняйте их порядок">
          <div className="adm-actions">
            <Btn kind="primary" disabled={busy} onClick={() => void run({ type: "design-save", design })}><SvgIcon icon={Save} size={16} />Сохранить панели</Btn>
            <Btn disabled={busy} onClick={() => setDesign({ ...design, layout: { dock: [...DEFAULT_LAYOUT.dock], left: [...DEFAULT_LAYOUT.left], right: [...DEFAULT_LAYOUT.right] } })}><SvgIcon icon={RotateCcw} size={15} />По умолчанию</Btn>
          </div>
        </Card>
        {zones.map((zone) => <Card key={zone.key} title={`${zone.title} (${current[zone.key].length})`} subtitle={zone.subtitle}>
          <div className="adm-layout-grid">
            {HUD_ITEMS.map((item) => {
              const idx = current[zone.key].indexOf(item.key);
              const on = idx >= 0;
              return <div className={`adm-layout-item ${on ? "is-on" : ""}`} key={item.key}>
                <label className="adm-layout-check">
                  <input type="checkbox" checked={on} onChange={() => toggle(zone.key, item.key)} />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/images/icons/${item.art}.png`} alt="" width={24} height={24} />
                  <span>{item.label}</span>
                </label>
                {on && <span className="adm-layout-order">
                  <button type="button" title="Выше" disabled={idx === 0} onClick={() => move(zone.key, item.key, -1)}>▲</button>
                  <button type="button" title="Ниже" disabled={idx === current[zone.key].length - 1} onClick={() => move(zone.key, item.key, 1)}>▼</button>
                </span>}
              </div>;
            })}
          </div>
        </Card>)}
      </>;
    })()}

    {tab === "colors" && <>
      <Card title="Цвета и форма" subtitle="Кнопки, панели, текст, фон и скругления">
        <div className="adm-grid-3">{([["primary", "Основной (кнопки)"], ["secondary", "Вторичный (жёлтые)"], ["panel", "Панели"], ["text", "Текст"], ["accent", "Акцент (синий)"], ["background", "Фон страницы"]] as const).map(([key, label]) => <Field label={label} key={key}><div className="adm-color"><input type="color" value={colors[key]} onChange={(event) => setColor(key, event.target.value)} /><input value={colors[key]} onChange={(event) => setColor(key, event.target.value)} /></div></Field>)}</div>
        <Field label={`Скругление панелей: ${design.radius}px`}><input type="range" min={0} max={40} value={design.radius} onChange={(event) => setDesign({ ...design, radius: Number(event.target.value) })} /></Field>
      </Card>
      <Card title="Логотип" subtitle="Первое слово — красное, остальные — зелёные. Загрузить свою картинку логотипа можно во вкладке «Фоны и интерфейс»">
        <div className="adm-row"><Field label="Название"><input value={design.logoText} maxLength={30} onChange={(event) => setDesign({ ...design, logoText: event.target.value })} /></Field><Field label="Подпись на ленте"><input value={design.logoSub} maxLength={40} onChange={(event) => setDesign({ ...design, logoSub: event.target.value })} /></Field></div>
        <Btn kind="primary" disabled={busy} onClick={() => void run({ type: "design-save", design })}><SvgIcon icon={Save} size={16} />Применить для всех</Btn>
      </Card>
    </>}

    {tab === "fonts" && <>
      <Card title="Шрифты по разделам" subtitle="Выберите шрифт отдельно для каждой области сайта. «Свой загруженный шрифт» доступен после загрузки файла ниже">
        {FONT_SCOPES.map(([scope, label]) => <Field label={label} key={scope}><select value={fonts[scope] ?? "default"} onChange={(event) => setDesign({ ...design, fonts: { ...fonts, [scope]: event.target.value } })}>{FONT_OPTIONS.map(([value, text]) => <option value={value} key={value}>{text}</option>)}</select></Field>)}
        <Btn kind="primary" disabled={busy} onClick={() => void run({ type: "design-save", design })}><SvgIcon icon={Save} size={16} />Применить шрифты</Btn>
      </Card>
      <Card title="Шрифт отдельного игрового раздела" subtitle="Переопределяет шрифт области «Разделы игры». Пустое значение — наследовать общий">
        <div className="adm-font-modules">{Object.entries(FONT_MODULE_LABELS).map(([key, label]) => <Field label={label} key={key}><select value={moduleFonts[key] ?? ""} onChange={(event) => setDesign({ ...design, moduleFonts: { ...moduleFonts, [key]: event.target.value } })}><option value="">Как в разделах игры</option>{FONT_OPTIONS.map(([value, text]) => <option value={value} key={value}>{text}</option>)}</select></Field>)}</div>
        <Btn kind="primary" disabled={busy} onClick={() => void run({ type: "design-save", design })}><SvgIcon icon={Save} size={16} />Сохранить разделы</Btn>
      </Card>
      <Card title="Свой font-файл" subtitle="TTF, OTF, WOFF или WOFF2 до 3 МБ. После загрузки он появится в списке «Свой загруженный шрифт» и применится к базовой области">
        <div className="adm-row"><label className="adm-btn adm-btn-primary"><SvgIcon icon={Upload} size={16} />Загрузить шрифт<input type="file" accept=".ttf,.otf,.woff,.woff2,font/*" hidden onChange={async (event) => { const file = event.target.files?.[0]; event.target.value = ""; if (!file) return; try { const dataUrl = await fontToDataUrl(file); const name = file.name.replace(/\.[^.]+$/, "").replace(/[^A-Za-z0-9 _-]/g, "").slice(0, 40) || "ValleyCustom"; if (await run({ type: "design-font", data: dataUrl, name })) setDesign(null); } catch { notify("Не удалось прочитать font-файл", true); } }} /></label>{design.fontUrl ? <Btn kind="danger" disabled={busy} onClick={async () => { if (await run({ type: "design-font-reset" })) setDesign(null); }}>Удалить свой шрифт</Btn> : null}</div>
        {design.fontUrl ? <p className="adm-hint">Загружен: <strong>{String(design.fontName ?? "ValleyCustom")}</strong>. Выберите его в любом списке выше.</p> : <p className="adm-hint">Свой шрифт пока не загружен. Системные варианты работают без загрузки.</p>}
      </Card>
    </>}

    {tab === "css" && <Card title="CSS всего сайта" subtitle="Применяется сразу ко всем страницам: игра, экран входа и загрузки, админка. Любые селекторы">
      <textarea rows={16} value={design.css} onChange={(event) => setDesign({ ...design, css: event.target.value })} style={{ fontFamily: "ui-monospace, monospace", fontSize: 12 }} placeholder={".btn-primary{ background: linear-gradient(#ff9ad5,#e75480) !important; }\n.farm-map-bg{ filter: hue-rotate(40deg); }"} />
      <div className="adm-chips">{CSS_HINTS.map((hint) => <span key={hint}>{hint}</span>)}</div>
      <div className="adm-actions"><Btn kind="primary" disabled={busy} onClick={() => void run({ type: "design-save", design })}><SvgIcon icon={Save} size={16} />Сохранить CSS</Btn><Btn kind="danger" disabled={busy} onClick={async () => { if (await run({ type: "design-reset" }, "Сбросить ВСЁ оформление (картинки, иконки, цвета, CSS) к стандартному?")) setDesign(null); }}>Сбросить всё оформление</Btn></div>
    </Card>}

    {tab === "files" && <>
      <Card title="Загрузить файл" subtitle="Любая картинка получает постоянный адрес. Вставьте его в свой CSS: background-image: url(...)">
        <div className="adm-row"><Field label="Имя файла (латиница)"><input value={fileName} onChange={(event) => setFileName(event.target.value.replace(/[^A-Za-z0-9_-]/g, ""))} placeholder="my-button" /></Field>
          <label className="adm-btn"><SvgIcon icon={Upload} size={14} />Выбрать и загрузить<input type="file" accept="image/*" hidden onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            const name = (fileName || file.name.replace(/\.[^.]+$/, "")).replace(/[^A-Za-z0-9_-]/g, "-").slice(0, 40) || "file";
            const dataUrl = await resizeImage(file, 1600, file.type === "image/png" ? "image/png" : "image/jpeg");
            if (await run({ type: "design-file", name, data: dataUrl })) setFileName("");
          }} /></label></div>
      </Card>
      <Card title={`Загруженные файлы · ${fileList.length}`}>{fileList.length === 0 ? <Empty text="Файлов пока нет" /> : fileList.map((file) => { const url = `/api/asset/${encodeURIComponent(file.key)}`; return <div className="adm-line" key={file.key}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" width={44} height={44} style={{ objectFit: "cover", borderRadius: 8 }} />
        <div><strong>{String(file.key).replace("theme:file-", "")}</strong><small>{url}</small></div>
        <Btn onClick={() => { void navigator.clipboard?.writeText(url); notify("Адрес скопирован"); }}><SvgIcon icon={Copy} size={14} />Копировать</Btn></div>; })}</Card>
    </>}
  </div>;
}
