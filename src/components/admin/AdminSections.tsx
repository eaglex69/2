"use client";

import { useState } from "react";
import { Gift, Megaphone, Send, Trash2 } from "lucide-react";
import { ITEMS } from "@/lib/game-config";
import { Btn, Card, Empty, Field, Loading, Pill, ago, fmt, n, useRunner, useSection, type Notify, type Row } from "./admin-kit";
import { ItemSelect } from "./AdminUsers";
import { SvgIcon } from "../svg-icons";

export function Dashboard() {
  const { data, loading, error } = useSection("dashboard");
  if (!data) return <Loading error={error} loading={loading} />;
  const t = data.totals as Row;
  const regs = data.registrations as Row[];
  const maxReg = Math.max(1, ...regs.map((row) => row.value));
  const levels = data.levels as Row[];
  const maxLevel = Math.max(1, ...levels.map((row) => row.count));
  const stats: [string, number, string][] = [
    ["Игроков", t.users, `${t.newDay} за сутки`], ["Онлайн сейчас", t.online, "последние 5 мин"], ["Активны за сутки", t.activeDay, "заходили в игру"],
    ["Монет в игре", t.coins, "сумма по фермам"], ["Алмазов в игре", t.gems, "сумма по фермам"], ["Заблокировано", t.banned, "аккаунтов"],
    ["Открытых обращений", t.openTickets, "ждут ответа"], ["Лотов на рынке", t.listings, `${t.soldListings} продано`], ["Тем на форуме", t.topics, `${t.chat} сообщ. в чате`],
    ["Писем отправлено", t.mail, "всего"], ["Публикаций в газете", t.newspaper, "статьи и объявления"], ["Промокодов активно", t.promos, "действуют"],
  ];
  return <div className="adm-stack">
    <div className="adm-stats">{stats.map(([label, value, hint]) => <div className="adm-stat" key={label}><span>{label}</span><strong>{n(value)}</strong><small>{hint}</small></div>)}</div>
    <div className="adm-two">
      <Card title="Регистрации за 14 дней"><div className="adm-bars">{regs.map((row) => <div key={row.label}><i style={{ height: `${Math.max(4, row.value / maxReg * 100)}%` }}><b>{row.value}</b></i><span>{row.label}</span></div>)}</div></Card>
      <Card title="Распределение по уровням"><div className="adm-hbars">{levels.length === 0 ? <Empty text="Нет данных" /> : levels.map((row) => <div key={row.level}><span>Ур. {row.level}</span><div><i style={{ width: `${row.count / maxLevel * 100}%` }} /></div><b>{row.count}</b></div>)}</div></Card>
    </div>
    <div className="adm-two">
      <Card title="Самые богатые игроки">{(data.richest as Row[]).map((row, index) => <div className="adm-line" key={row.id}><span className="adm-rank">{index + 1}</span><div><strong>{row.displayName}</strong><small>@{row.username} · ур. {row.level}</small></div><b>{n(row.coins)}</b></div>)}</Card>
      <Card title="Предметов в обращении" subtitle="Суммарно по всем амбарам">{(data.items as Row[]).length === 0 ? <Empty text="Пусто" /> : (data.items as Row[]).map((row) => <div className="adm-line" key={row.key}><div><strong>{ITEMS[row.key]?.name ?? row.key}</strong></div><b>{n(row.total)}</b></div>)}</Card>
    </div>
    <div className="adm-two">
      <Card title="Новые игроки">{(data.recent as Row[]).map((row) => <div className="adm-line" key={row.id}><div><strong>{row.displayName}</strong><small>@{row.username}</small></div><small>{ago(row.createdAt)}</small></div>)}</Card>
      <Card title="Последние действия админов">{(data.logs as Row[]).length === 0 ? <Empty text="Журнал пуст" /> : (data.logs as Row[]).map((row) => <div className="adm-line" key={row.id}><div><strong>{row.action}</strong><small>{row.adminName} → {row.target}</small></div><small>{ago(row.createdAt)}</small></div>)}</Card>
    </div>
  </div>;
}

const ticketStatuses = ["На рассмотрении", "В работе", "Решено", "Отклонено"];
const statusTone = (status: string) => status === "Решено" ? "green" : status === "Отклонено" ? "red" : status === "В работе" ? "blue" : "amber";

export function Tickets({ notify }: { notify: Notify }) {
  const [status, setStatus] = useState("all");
  const { data, loading, error, reload } = useSection("tickets", { status });
  const { run, busy } = useRunner(notify, reload);
  const [replies, setReplies] = useState<Record<number, string>>({});
  const list = (data?.tickets ?? []) as Row[];
  return <div className="adm-stack">
    <Card><div className="adm-segment">{["all", ...ticketStatuses].map((entry) => <button className={status === entry ? "active" : ""} onClick={() => setStatus(entry)} key={entry}>{entry === "all" ? "Все" : entry}</button>)}</div></Card>
    <Loading error={error} loading={loading && !data} />
    {data && (list.length === 0 ? <Card><Empty text="Обращений нет" /></Card> : list.map((ticket) => <Card key={ticket.id} className="adm-ticket">
      <div className="adm-ticket-head"><div><Pill tone={ticket.category === "Ошибка" ? "red" : "blue"}>{ticket.category}</Pill> <strong>#{ticket.id}</strong> · {ticket.displayName} <small>@{ticket.username}</small></div><Pill tone={statusTone(ticket.status)}>{ticket.status}</Pill></div>
      <p className="adm-text">{ticket.body}</p><small>{fmt(ticket.createdAt)}</small>
      <Field label="Ответ игроку (придёт письмом)"><textarea rows={2} value={replies[ticket.id] ?? ""} onChange={(event) => setReplies({ ...replies, [ticket.id]: event.target.value })} /></Field>
      <div className="adm-actions">{ticketStatuses.map((entry) => <Btn key={entry} kind={entry === ticket.status ? "primary" : "default"} disabled={busy} onClick={async () => { if (await run({ type: "ticket-update", id: ticket.id, status: entry, reply: replies[ticket.id] ?? "" })) setReplies({ ...replies, [ticket.id]: "" }); }}>{entry}</Btn>)}<Btn kind="danger" disabled={busy} onClick={() => void run({ type: "ticket-delete", id: ticket.id }, "Удалить обращение?")}><SvgIcon icon={Trash2} size={14} /></Btn></div>
    </Card>))}
  </div>;
}

export function Content({ notify }: { notify: Notify }) {
  const { data, loading, error, reload } = useSection("content");
  const { run, busy } = useRunner(notify, reload);
  const [tab, setTab] = useState("chat");
  const del = (kind: string, id: number) => <Btn kind="danger" disabled={busy} onClick={() => void run({ type: "content-delete", kind, id }, "Удалить материал?")}><SvgIcon icon={Trash2} size={14} /></Btn>;
  const tabs: [string, string][] = [["chat", "Чат"], ["topic", "Темы"], ["reply", "Ответы"], ["newspaper", "Газета"]];
  return <div className="adm-stack">
    <Card><div className="adm-segment">{tabs.map(([key, label]) => <button className={tab === key ? "active" : ""} onClick={() => setTab(key)} key={key}>{label}</button>)}</div></Card>
    <Loading error={error} loading={loading && !data} />
    {data && <Card title={tabs.find(([key]) => key === tab)?.[1]} action={tab === "chat" ? <Btn kind="danger" disabled={busy} onClick={() => void run({ type: "chat-clear" }, "Удалить ВСЕ сообщения общего чата?")}>Очистить чат</Btn> : undefined}>
      {tab === "chat" && ((data.chat as Row[]).length ? (data.chat as Row[]).map((row) => <div className="adm-line top" key={row.id}><div><strong>{row.displayName} <small>@{row.username} · {fmt(row.createdAt)}</small></strong><p className="adm-text">{row.body}</p></div>{del("chat", row.id)}</div>) : <Empty text="Сообщений нет" />)}
      {tab === "topic" && ((data.topics as Row[]).length ? (data.topics as Row[]).map((row) => <div className="adm-line top" key={row.id}><div><strong>{row.title}</strong><small> · {row.category} · @{row.username} · ответов {row.replies} · {fmt(row.createdAt)}</small><p className="adm-text">{row.body}</p></div>{del("topic", row.id)}</div>) : <Empty text="Тем нет" />)}
      {tab === "reply" && ((data.replies as Row[]).length ? (data.replies as Row[]).map((row) => <div className="adm-line top" key={row.id}><div><strong>@{row.username}</strong><small> · тема #{row.topicId} · {fmt(row.createdAt)}</small><p className="adm-text">{row.body}</p></div>{del("reply", row.id)}</div>) : <Empty text="Ответов нет" />)}
      {tab === "newspaper" && ((data.newspaper as Row[]).length ? (data.newspaper as Row[]).map((row) => <div className="adm-line top" key={row.id}><div><Pill tone={row.kind === "ad" ? "amber" : "blue"}>{row.kind === "ad" ? "объявление" : "статья"}</Pill> <strong>{row.title}</strong><small> · @{row.username} · {fmt(row.createdAt)}</small><p className="adm-text">{row.body}</p></div>{del("newspaper", row.id)}</div>) : <Empty text="Публикаций нет" />)}
    </Card>}
  </div>;
}

export function Market({ notify }: { notify: Notify }) {
  const [status, setStatus] = useState("active");
  const { data, loading, error, reload } = useSection("market", { status });
  const { run, busy } = useRunner(notify, reload);
  const list = (data?.listings ?? []) as Row[];
  return <div className="adm-stack">
    <Card><div className="adm-segment">{[["active", "Активные"], ["sold", "Проданные"], ["cancelled", "Снятые"], ["all", "Все"]].map(([key, label]) => <button className={status === key ? "active" : ""} onClick={() => setStatus(key)} key={key}>{label}</button>)}</div></Card>
    <Loading error={error} loading={loading && !data} />
    {data && <Card title={`Лоты · ${list.length}`}>{list.length === 0 ? <Empty text="Лотов нет" /> : <div className="adm-table-wrap"><table className="adm-table static"><thead><tr><th>#</th><th>Товар</th><th>Цена</th><th>Продавец</th><th>Покупатель</th><th>Статус</th><th /></tr></thead><tbody>
      {list.map((row) => <tr key={row.id}><td>{row.id}</td><td><strong>{ITEMS[row.itemKey]?.name ?? row.itemKey}</strong><small>×{row.quantity} · {fmt(row.createdAt)}</small></td><td>{row.unitPrice} × {row.quantity} = {n(row.unitPrice * row.quantity)}</td><td>@{row.seller}</td><td>{row.buyer ? `@${row.buyer}` : "—"}</td><td><Pill tone={row.status === "active" ? "green" : row.status === "sold" ? "blue" : "gray"}>{row.status}</Pill></td><td>{row.status === "active" && <Btn kind="danger" disabled={busy} onClick={() => void run({ type: "market-cancel", id: row.id }, "Снять лот и вернуть товар продавцу?")}>Снять</Btn>}</td></tr>)}
    </tbody></table></div>}</Card>}
  </div>;
}

export function Broadcast({ notify }: { notify: Notify }) {
  const { run, busy } = useRunner(notify);
  const [target, setTarget] = useState("all");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [coins, setCoins] = useState(0);
  const [items, setItems] = useState<Record<string, number>>({});
  const [item, setItem] = useState("carrot");
  const [quantity, setQuantity] = useState(5);
  return <div className="adm-stack"><Card title="Рассылка писем и подарков" subtitle="Письмо придёт в игровую почту. Вложения игрок получает сам по кнопке">
    <Field label="Получатель" hint="Введите «all» для всех незаблокированных или точный логин игрока"><input value={target} onChange={(event) => setTarget(event.target.value)} /></Field>
    <Field label="Тема"><input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={100} /></Field>
    <Field label="Текст"><textarea rows={5} value={body} onChange={(event) => setBody(event.target.value)} maxLength={2000} /></Field>
    <div className="adm-sub"><h4><SvgIcon icon={Gift} size={16} />Вложение (необязательно)</h4>
      <Field label="Монеты"><input type="number" min={0} max={100000} value={coins} onChange={(event) => setCoins(Number(event.target.value))} /></Field>
      <div className="adm-row"><Field label="Предмет"><ItemSelect value={item} onChange={setItem} /></Field><Field label="Кол-во"><input type="number" min={1} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} /></Field><Btn onClick={() => setItems({ ...items, [item]: quantity })}>Добавить</Btn></div>
      <div className="adm-chips">{Object.entries(items).map(([key, amount]) => <span key={key}>{ITEMS[key].name}<b>{amount}</b><button onClick={() => { const next = { ...items }; delete next[key]; setItems(next); }}>×</button></span>)}</div>
    </div>
    <Btn kind="primary" disabled={busy || !subject.trim() || !body.trim()} onClick={async () => { if (await run({ type: "broadcast", target, subject, body, coins, items }, target === "all" ? "Отправить письмо ВСЕМ игрокам?" : undefined)) { setSubject(""); setBody(""); setCoins(0); setItems({}); } }}><SvgIcon icon={Send} size={16} />Отправить</Btn>
  </Card></div>;
}

export function News({ notify }: { notify: Notify }) {
  const { data, loading, error, reload } = useSection("news");
  const { run, busy } = useRunner(notify, reload);
  const [title, setTitle] = useState("");
  const [tag, setTag] = useState("Новости");
  const [body, setBody] = useState("");
  const list = (data?.news ?? []) as Row[];
  return <div className="adm-stack">
    <Card title="Опубликовать новость" subtitle="Появится в разделе «Новости» у всех игроков как непрочитанная"><Field label="Метка"><input value={tag} onChange={(event) => setTag(event.target.value)} maxLength={24} /></Field><Field label="Заголовок"><input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} /></Field><Field label="Текст"><textarea rows={5} value={body} onChange={(event) => setBody(event.target.value)} maxLength={4000} /></Field><Btn kind="primary" disabled={busy || title.trim().length < 3 || body.trim().length < 5} onClick={async () => { if (await run({ type: "news-create", title, body, tag })) { setTitle(""); setBody(""); } }}><SvgIcon icon={Megaphone} size={16} />Опубликовать</Btn></Card>
    <Loading error={error} loading={loading && !data} />
    {data && <Card title={`Опубликовано · ${list.length}`}>{list.length === 0 ? <Empty text="Новостей от администрации пока нет" /> : list.map((row) => <div className="adm-line top" key={row.id}><div><Pill>{row.tag}</Pill> <strong>{row.title}</strong><small> · {fmt(row.createdAt)}</small><p className="adm-text">{row.body}</p></div><Btn kind="danger" disabled={busy} onClick={() => void run({ type: "news-delete", id: row.id }, "Удалить новость?")}><SvgIcon icon={Trash2} size={14} /></Btn></div>)}</Card>}
  </div>;
}

export function Promos({ notify }: { notify: Notify }) {
  const { data, loading, error, reload } = useSection("promos");
  const { run, busy } = useRunner(notify, reload);
  const [code, setCode] = useState("");
  const [coins, setCoins] = useState(100);
  const [gems, setGems] = useState(0);
  const [maxUses, setMaxUses] = useState(100);
  const [hours, setHours] = useState(0);
  const [items, setItems] = useState<Record<string, number>>({});
  const [item, setItem] = useState("carrot_seed");
  const [quantity, setQuantity] = useState(5);
  const list = (data?.promos ?? []) as Row[];
  return <div className="adm-stack">
    <Card title="Новый промокод" subtitle="Игроки вводят его в разделе «Акции и покупки». Один код — одна активация на игрока">
      <div className="adm-row"><Field label="Код"><input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} maxLength={32} placeholder="SPRING2026" /></Field><Btn onClick={() => setCode(Array.from({ length: 8 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join(""))}>Сгенерировать</Btn></div>
      <div className="adm-grid-3"><Field label="Монеты"><input type="number" min={0} value={coins} onChange={(event) => setCoins(Number(event.target.value))} /></Field><Field label="Алмазы"><input type="number" min={0} value={gems} onChange={(event) => setGems(Number(event.target.value))} /></Field><Field label="Лимит (0 = ∞)"><input type="number" min={0} value={maxUses} onChange={(event) => setMaxUses(Number(event.target.value))} /></Field></div>
      <Field label="Срок действия, часов (0 = бессрочно)"><input type="number" min={0} value={hours} onChange={(event) => setHours(Number(event.target.value))} /></Field>
      <div className="adm-row"><Field label="Предмет"><ItemSelect value={item} onChange={setItem} /></Field><Field label="Кол-во"><input type="number" min={1} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} /></Field><Btn onClick={() => setItems({ ...items, [item]: quantity })}>Добавить</Btn></div>
      <div className="adm-chips">{Object.entries(items).map(([key, amount]) => <span key={key}>{ITEMS[key].name}<b>{amount}</b><button onClick={() => { const next = { ...items }; delete next[key]; setItems(next); }}>×</button></span>)}</div>
      <Btn kind="primary" disabled={busy || code.length < 3} onClick={async () => { if (await run({ type: "promo-create", code, coins, gems, maxUses, expiresHours: hours, items })) { setCode(""); setItems({}); } }}>Создать промокод</Btn>
    </Card>
    <Loading error={error} loading={loading && !data} />
    {data && <Card title={`Промокоды · ${list.length}`}>{list.length === 0 ? <Empty text="Промокодов ещё нет" /> : list.map((row) => { const expired = row.expiresAt && new Date(row.expiresAt).getTime() < Date.now(); return <div className="adm-line top" key={row.id}><div><strong className="adm-code">{row.code}</strong> <Pill tone={row.active && !expired ? "green" : "gray"}>{expired ? "истёк" : row.active ? "активен" : "отключён"}</Pill><small> · использований {row.uses}/{row.maxUses || "∞"} · до {row.expiresAt ? fmt(row.expiresAt) : "бессрочно"}</small><div className="adm-chips">{row.coins > 0 && <span>Монеты<b>{row.coins}</b></span>}{row.gems > 0 && <span>Алмазы<b>{row.gems}</b></span>}{Object.entries(row.items as Record<string, number>).map(([key, amount]) => <span key={key}>{ITEMS[key]?.name ?? key}<b>{amount}</b></span>)}</div></div><div className="adm-actions"><Btn disabled={busy} onClick={() => void run({ type: "promo-toggle", id: row.id })}>{row.active ? "Выкл." : "Вкл."}</Btn><Btn kind="danger" disabled={busy} onClick={() => void run({ type: "promo-delete", id: row.id }, "Удалить промокод?")}><SvgIcon icon={Trash2} size={14} /></Btn></div></div>; })}</Card>}
  </div>;
}

export function Settings({ notify }: { notify: Notify }) {
  const { data, loading, error, reload } = useSection("settings");
  const { run, busy } = useRunner(notify, reload);
  const [form, setForm] = useState<Row | null>(null);
  if (data && !form) setForm({ ...(data.settings as Row) });
  if (!form) return <Loading error={error} loading={loading} />;
  const toggle = (key: string, label: string, hint: string) => <label className="adm-toggle"><div><strong>{label}</strong><small>{hint}</small></div><input type="checkbox" checked={!!form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.checked })} /></label>;
  return <div className="adm-stack"><Card title="Настройки игры">
    {toggle("registrationOpen", "Регистрация открыта", "Когда выключено, новые игроки не смогут создать аккаунт")}
    {toggle("chatEnabled", "Общий чат включён", "Отключение блокирует отправку новых сообщений")}
    {toggle("maintenance", "Режим техработ", "Игроки видят экран ожидания. Администраторы продолжают играть")}
    <Field label="Сообщение для техработ"><input value={form.maintenanceText} onChange={(event) => setForm({ ...form, maintenanceText: event.target.value })} maxLength={300} placeholder="Обновляем долину, вернёмся через 15 минут" /></Field>
    <Field label="Баннер в игре" hint="Показывается всем игрокам под шапкой. Пусто — баннер скрыт"><input value={form.banner} onChange={(event) => setForm({ ...form, banner: event.target.value })} maxLength={200} placeholder="Двойной опыт на выходных!" /></Field>
    <Btn kind="primary" disabled={busy} onClick={() => void run({ type: "settings-update", ...form }, form.maintenance ? "Включить режим техработ? Игроки потеряют доступ к игре." : undefined)}>Сохранить настройки</Btn>
  </Card></div>;
}

export function Logs() {
  const { data, loading, error } = useSection("logs");
  const list = (data?.logs ?? []) as Row[];
  return <div className="adm-stack"><Loading error={error} loading={loading && !data} />
    {data && <Card title={`Журнал действий · ${list.length}`} subtitle="Каждое изменение администраторами фиксируется автоматически">{list.length === 0 ? <Empty text="Записей пока нет" /> : <div className="adm-table-wrap"><table className="adm-table static"><thead><tr><th>Время</th><th>Админ</th><th>Действие</th><th>Цель</th><th>Детали</th></tr></thead><tbody>{list.map((row) => <tr key={row.id}><td>{fmt(row.createdAt)}</td><td>@{row.adminName}</td><td><Pill tone="blue">{row.action}</Pill></td><td>{row.target}</td><td>{row.details}</td></tr>)}</tbody></table></div>}</Card>}
  </div>;
}
