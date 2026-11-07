"use client";

import { useCallback, useEffect, useState } from "react";
import { Coins, Crown, Send, Settings, Shield, Trash2, UserPlus, Users } from "lucide-react";
import { Avatar, Button, CardTitle, EmptyState, Modal, formatDate } from "./game-ui";
import { BBEditor, BBText } from "./bbcode";
import { GameIcon } from "./icons";
import type { GamePayload } from "./game-types";
import { SvgIcon } from "./svg-icons";

type CoopRow = { id: number; name: string; tag: string; description: string; icon: string; joinPolicy: string; minLevel: number; xp: number; leader: string; members: number; contribution: number };
type MemberRow = { id: number; username: string; displayName: string; avatar: string; role: string; contribution: number; level: number; joinedAt: string; lastSeen: string };
type CoopData = { coops: CoopRow[]; membership: { coopId: number; role: string; coop: CoopRow & { treasuryCoins: number } } | null; members: MemberRow[]; chat: { id: number; body: string; createdAt: string; userId: number; author: string; avatar: string }[]; pending: { id: number; userId: number; username: string; displayName: string; avatar: string; level: number }[]; requests: { id: number; name: string }[] };

let coopCache: CoopData | null = null;

export function coopLevel(xp: number) { return Math.min(20, 1 + Math.floor(xp / 1000)); }

export default function CoopModule({ payload, onChanged, onProfile }: { payload: GamePayload; onChanged: () => void; onProfile: (id: number) => void }) {
  const [data, setData] = useState<CoopData | null>(coopCache);
  const [tab, setTab] = useState<"list" | "members" | "chat" | "manage">("list");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("barn");
  const [donation, setDonation] = useState(100);
  const [message, setMessage] = useState("");
  const [minLevel, setMinLevel] = useState(1);
  const [joinPolicy, setJoinPolicy] = useState("open");
  const [giftUser, setGiftUser] = useState<number | null>(null);
  const [giftAmount, setGiftAmount] = useState(100);
  const load = useCallback(async () => { const r = await fetch("/api/coop"); if (r.ok) { const d = await r.json() as CoopData; coopCache = d; setData(d); } }, []);
  useEffect(() => { void load(); }, [load]);
  async function run(action: Record<string, unknown>) {
    setBusy(true);
    try { const r = await fetch("/api/coop", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action) }); const d = await r.json(); setNotice(d.message ?? d.error); if (r.ok) { await load(); onChanged(); return true; } return false; } finally { setBusy(false); }
  }
  if (!data) return <div className="inline-loading"><div className="loading-bar"><i /></div><p>Загружаем кооперативы…</p></div>;
  const member = data.membership;
  const coop = member?.coop;

  if (!member) return <div className="module-stack"><div className="scene-banner coop-scene"><SvgIcon icon={Users} size={28} /><div><strong>Кооперативы долины</strong><p>Объединяйтесь, делайте взносы, повышайте уровень кооператива и общайтесь в своём чате.</p></div></div>
    {notice && <div className="tip-banner">{notice}</div>}
    <Button onClick={() => setCreating(true)}><SvgIcon icon={UserPlus} size={17} />Создать кооператив · 2000 монет</Button>
    {data.requests.length > 0 && <div className="tip-banner">Ваши заявки: {data.requests.map((r) => r.name).join(", ")}</div>}
    <div className="coop-list">{data.coops.length === 0 ? <EmptyState icon={<SvgIcon icon={Users} size={32} />} title="Пока ни одного кооператива" text="Создайте первый и пригласите соседей." /> : data.coops.map((row) => <article className="coop-card" key={row.id}><div className="coop-card-head"><span className="coop-emblem"><GameIcon name={row.icon} size={25} /></span><div><h3>[{row.tag}] {row.name}</h3><p>{row.description || "Дружный кооператив долины"}</p></div></div><div className="coop-meta"><span>Ур. {coopLevel(row.xp)}</span><span>{row.members}/{10 + coopLevel(row.xp) * 2} мест</span><span>от {row.minLevel} ур.</span><span>{row.joinPolicy === "open" ? "Свободный вход" : "По заявке"}</span></div><Button disabled={busy || payload.state.level < row.minLevel} onClick={() => void run({ type: "join", coopId: row.id })}>{row.joinPolicy === "open" ? "Вступить" : "Подать заявку"}</Button></article>)}</div>
    {creating && <Modal title="Новый кооператив" onClose={() => setCreating(false)}><form className="form-stack" onSubmit={async (e) => { e.preventDefault(); if (await run({ type: "create", name, tag, description, icon })) setCreating(false); }}><label><span>Название</span><input value={name} onChange={(e) => setName(e.target.value)} minLength={3} maxLength={30} required /></label><label><span>Тег (2–5 символов)</span><input value={tag} onChange={(e) => setTag(e.target.value.toUpperCase())} minLength={2} maxLength={5} required /></label><label><span>Описание</span><textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={400} /></label><span className="field-label">Эмблема</span><div className="avatar-picker">{["barn", "leaf", "sun", "crown", "fish", "mountain"].map((key) => <button type="button" className={icon === key ? "active" : ""} onClick={() => setIcon(key)} key={key}><GameIcon name={key} size={24} /></button>)}</div><Button type="submit" disabled={busy || payload.state.coins < 2000}>Создать за 2000 монет</Button></form></Modal>}
  </div>;

  return <div className="module-stack"><div className="coop-hero"><span className="coop-emblem big"><GameIcon name={coop!.icon} size={34} /></span><h2>[{coop!.tag}] {coop!.name}</h2><p>{coop!.description}</p><div className="coop-meta"><span>Уровень {coopLevel(coop!.xp)}</span><span>{data.members.length} участников</span><span>Ваша роль: {member.role === "leader" ? "Лидер" : member.role === "officer" ? "Офицер" : "Участник"}</span></div><div className="progress-track"><span style={{ width: `${(coop!.xp % 1000) / 10}%` }} /></div><small>{coop!.xp % 1000}/1000 XP до следующего уровня</small></div>
    {notice && <div className="tip-banner">{notice}</div>}
    <div className="segmented"><button className={tab === "members" ? "active" : ""} onClick={() => setTab("members")}>Состав</button><button className={tab === "chat" ? "active" : ""} onClick={() => setTab("chat")}>Чат</button><button className={tab === "manage" ? "active" : ""} onClick={() => setTab("manage")}>Казна{["leader", "officer"].includes(member.role) && data.pending.length > 0 ? ` (${data.pending.length})` : ""}</button></div>
    {tab === "members" && <div className="coop-members">{data.members.map((row) => <article key={row.id}><button className="member-link" onClick={() => onProfile(row.id)}><Avatar name={row.avatar} size={40} /><div><strong>{row.displayName}</strong><span>@{row.username} · {row.level} ур.</span></div></button><div className="member-right">{row.role === "leader" ? <SvgIcon icon={Crown} size={17} /> : row.role === "officer" ? <SvgIcon icon={Shield} size={17} /> : null}<span>{row.contribution} взнос</span>{member.role === "leader" && row.id !== payload.user.id && <div className="button-row"><Button variant="soft" onClick={() => void run({ type: "role", userId: row.id, role: row.role === "officer" ? "member" : "officer" })}>{row.role === "officer" ? "В участники" : "Офицер"}</Button><Button variant="soft" onClick={() => void run({ type: "role", userId: row.id, role: "leader" })}>Лидер</Button><Button variant="danger" onClick={() => void run({ type: "kick", userId: row.id })}><SvgIcon icon={Trash2} size={14} /></Button></div>}</div></article>)}</div>}
    {tab === "chat" && <div className="coop-chat"><div className="chat-messages">{data.chat.length === 0 ? <EmptyState icon={<SvgIcon icon={Users} size={30} />} title="Чат кооператива" text="Виден только участникам." /> : data.chat.map((msg) => <article className="chat-message" key={msg.id}><button onClick={() => onProfile(msg.userId)}><Avatar name={msg.avatar} size={30} /></button><div><span><strong>{msg.author}</strong>{(msg as { username?: string }).username && <span className="username-tag">@{(msg as { username?: string }).username}</span>}<time>{formatDate(msg.createdAt)}</time></span><div className="chat-text"><BBText text={msg.body} /></div></div></article>)}</div><form className="chat-composer bb" onSubmit={async (e) => { e.preventDefault(); if (await run({ type: "chat", body: message })) setMessage(""); }}><BBEditor value={message} onChange={setMessage} maxLength={400} placeholder="Сообщение кооперативу…" onEnter={() => { if (message.trim() && !busy) void run({ type: "chat", body: message }).then((ok) => { if (ok) setMessage(""); }); }}><Button type="submit" disabled={busy || !message.trim()}><SvgIcon icon={Send} size={17} /></Button></BBEditor></form></div>}
    {tab === "manage" && <div className="module-stack"><section className="panel"><CardTitle icon={<SvgIcon icon={Coins} size={20} />} title={`Казна: ${coop!.treasuryCoins} монет`} subtitle="Взносы повышают опыт кооператива и ваш вклад" /><div className="inline-form"><input type="number" min={10} value={donation} onChange={(e) => setDonation(Number(e.target.value))} /><Button disabled={busy || payload.state.coins < donation} onClick={() => void run({ type: "donate", amount: donation })}>Внести</Button></div>{member.role === "leader" && <div className="inline-form"><select value={giftUser ?? ""} onChange={(e) => setGiftUser(Number(e.target.value))}><option value="">Премия участнику…</option>{data.members.map((m) => <option value={m.id} key={m.id}>{m.displayName}</option>)}</select><input type="number" min={10} value={giftAmount} onChange={(e) => setGiftAmount(Number(e.target.value))} /><Button disabled={!giftUser} onClick={() => void run({ type: "treasury-gift", userId: giftUser, amount: giftAmount })}>Выдать</Button></div>}</section>
      {["leader", "officer"].includes(member.role) && data.pending.length > 0 && <section className="panel"><CardTitle title="Заявки на вступление" />{data.pending.map((req) => <div className="friend-list" key={req.id}><article><Avatar name={req.avatar} size={36} /><div><strong>{req.displayName}</strong><span>{req.level} ур.</span></div><Button onClick={() => void run({ type: "request-answer", id: req.id, accept: true })}>Принять</Button><Button variant="soft" onClick={() => void run({ type: "request-answer", id: req.id, accept: false })}>Нет</Button></article></div>)}</section>}
      {member.role === "leader" && <section className="panel"><CardTitle icon={<SvgIcon icon={Settings} size={19} />} title="Настройки" /><div className="form-stack"><label><span>Описание</span><textarea defaultValue={coop!.description} onChange={(e) => setDescription(e.target.value)} /></label><label><span>Минимальный уровень</span><input type="number" min={1} max={50} defaultValue={coop!.minLevel} onChange={(e) => setMinLevel(Number(e.target.value))} /></label><label><span>Вступление</span><select defaultValue={coop!.joinPolicy} onChange={(e) => setJoinPolicy(e.target.value)}><option value="open">Свободное</option><option value="request">По заявке</option></select></label><Button onClick={() => void run({ type: "settings", description: description || coop!.description, minLevel: minLevel === 1 ? coop!.minLevel : minLevel, joinPolicy: joinPolicy === "open" ? coop!.joinPolicy : joinPolicy })}>Сохранить</Button></div></section>}
      <Button variant="danger" onClick={() => void run({ type: member.role === "leader" ? "disband" : "leave" })}>{member.role === "leader" ? "Распустить кооператив" : "Покинуть кооператив"}</Button>
    </div>}
  </div>;
}
