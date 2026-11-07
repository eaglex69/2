"use client";

import { useState } from "react";
import { Ban, ChevronLeft, ChevronRight, KeyRound, Search, Shield, Trash2, VolumeX } from "lucide-react";
import { ITEMS } from "@/lib/game-config";
import { ACHIEVEMENTS } from "@/lib/game-engine";
import { Btn, Card, Drawer, Empty, Field, Loading, Pill, ago, fmt, n, useRunner, useSection, type Notify, type Row } from "./admin-kit";
import { SvgIcon } from "../svg-icons";

export function ItemSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <select value={value} onChange={(event) => onChange(event.target.value)}>
    {Object.values(ITEMS).sort((a, b) => a.name.localeCompare(b.name)).map((item) => <option key={item.key} value={item.key}>{item.name}</option>)}
  </select>;
}

function UserDetail({ id, notify, onClose, onChanged }: { id: number; notify: Notify; onClose: () => void; onChanged: () => void }) {
  const { data, loading, error, reload } = useSection("user", { id });
  const { run, busy } = useRunner(notify, async () => { await reload(); onChanged(); });
  const [form, setForm] = useState<Row | null>(null);
  const [item, setItem] = useState("carrot");
  const [quantity, setQuantity] = useState(10);
  const [reason, setReason] = useState("");
  const [minutes, setMinutes] = useState(60);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const user = data?.user as Row | undefined;
  const state = data?.state as Row | undefined;
  const counts = (data?.counts ?? {}) as Row;
  if (user && state && !form) {
    setForm({ coins: state.coins, gems: state.gems, level: state.level, energy: state.energy, maxEnergy: state.maxEnergy });
    setName(user.displayName);
  }
  const isBanned = !!user?.bannedAt;
  const isMuted = user?.mutedUntil && new Date(user.mutedUntil).getTime() > Date.now();
  return <Drawer title={user ? `${user.displayName} · @${user.username}` : "Игрок"} onClose={onClose}>
    <Loading error={error} loading={loading && !data} />
    {user && state && form && <div className="adm-stack">
      <div className="adm-pills">
        <Pill tone={user.role === "admin" ? "blue" : "gray"}>{user.role === "admin" ? "Администратор" : "Игрок"}</Pill>
        {isBanned && <Pill tone="red">Заблокирован</Pill>}
        {isMuted && <Pill tone="amber">Мьют до {fmt(user.mutedUntil)}</Pill>}
        <Pill tone="green">ID {user.id}</Pill>
      </div>
      <div className="adm-kv">
        <div><span>Регистрация</span><strong>{fmt(user.createdAt)}</strong></div>
        <div><span>Был в игре</span><strong>{ago(user.lastSeen)}</strong></div>
        <div><span>Активных сессий</span><strong>{counts.sessions}</strong></div>
        <div><span>Друзей</span><strong>{counts.friends}</strong></div>
        <div><span>Писем получено/отправлено</span><strong>{counts.mailIn}/{counts.mailOut}</strong></div>
        <div><span>Лотов активных/продано</span><strong>{counts.listings}/{counts.sold}</strong></div>
        <div><span>Сообщений в чате</span><strong>{counts.chat}</strong></div>
        <div><span>Тем / ответов</span><strong>{counts.topics}/{counts.replies}</strong></div>
      </div>

      <Card title="Ресурсы и прогресс" subtitle="Значения применяются сразу">
        <div className="adm-grid-3">
          {([["coins", "Монеты"], ["gems", "Алмазы"], ["level", "Уровень"], ["energy", "Энергия"], ["maxEnergy", "Макс. энергия"]] as const).map(([key, label]) =>
            <Field label={label} key={key}><input type="number" value={form[key]} onChange={(event) => setForm({ ...form, [key]: Number(event.target.value) })} /></Field>)}
        </div>
        <Btn kind="primary" disabled={busy} onClick={() => void run({ type: "user-resources", id, ...form })}>Сохранить ресурсы</Btn>
      </Card>

      <Card title="Выдать / изъять предмет" subtitle="Отрицательное число изымает. Лимит амбара не проверяется">
        <div className="adm-row">
          <Field label="Предмет"><ItemSelect value={item} onChange={setItem} /></Field>
          <Field label="Кол-во"><input type="number" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} /></Field>
        </div>
        <Btn kind="primary" disabled={busy} onClick={() => void run({ type: "user-items", id, item, quantity })}>Применить</Btn>
      </Card>

      <Card title="Инвентарь" subtitle={`Амбар ур. ${state.barnLevel}`}>
        <div className="adm-chips">{Object.entries(state.inventory as Record<string, number>).length ? Object.entries(state.inventory as Record<string, number>).map(([key, amount]) => <span key={key}>{ITEMS[key]?.name ?? key}<b>{amount}</b></span>) : <Empty text="Амбар пуст" />}</div>
      </Card>

      <Card title="Статистика фермы">
        <div className="adm-kv">
          <div><span>Урожаев</span><strong>{state.stats.harvested}</strong></div>
          <div><span>Рыбы поймано</span><strong>{state.stats.fishCaught}</strong></div>
          <div><span>Спусков в шахты</span><strong>{state.stats.mined}</strong></div>
          <div><span>Заготовок</span><strong>{state.stats.produced}</strong></div>
          <div><span>Заказов города</span><strong>{state.stats.orders}</strong></div>
          <div><span>Заработано</span><strong>{n(state.stats.earned)}</strong></div>
          <div><span>Грядок / прудов</span><strong>{state.plots.length}/{state.ponds.length}</strong></div>
          <div><span>Загонов / садков</span><strong>{state.pens.length}/{state.cages.length}</strong></div>
          <div><span>Достижений получено</span><strong>{state.claimedAchievements.length}/{ACHIEVEMENTS.length}</strong></div>
          <div><span>Эфир Элизиума</span><strong>{state.elysium.aether}</strong></div>
        </div>
      </Card>

      <Card title="Модерация">
        <Field label="Причина блокировки"><input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Нарушение правил, мошенничество…" /></Field>
        <div className="adm-actions">
          {isBanned ? <Btn disabled={busy} onClick={() => void run({ type: "user-unban", id })}><SvgIcon icon={Ban} size={15} />Разблокировать</Btn>
            : <Btn kind="danger" disabled={busy || !reason.trim()} onClick={() => void run({ type: "user-ban", id, reason }, `Заблокировать ${user.username}?`)}><SvgIcon icon={Ban} size={15} />Заблокировать</Btn>}
        </div>
        <div className="adm-row">
          <Field label="Мьют (мин)"><select value={minutes} onChange={(event) => setMinutes(Number(event.target.value))}>{[[15, "15 минут"], [60, "1 час"], [360, "6 часов"], [1440, "1 сутки"], [10080, "7 суток"], [43200, "30 суток"]].map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></Field>
          <div className="adm-actions"><Btn disabled={busy} onClick={() => void run({ type: "user-mute", id, minutes })}><SvgIcon icon={VolumeX} size={15} />Заглушить</Btn>{isMuted && <Btn disabled={busy} onClick={() => void run({ type: "user-mute", id, minutes: 0 })}>Снять мьют</Btn>}</div>
        </div>
      </Card>

      <Card title="Аккаунт">
        <div className="adm-row"><Field label="Имя фермера"><input value={name} onChange={(event) => setName(event.target.value)} /></Field><Btn disabled={busy} onClick={() => void run({ type: "user-rename", id, displayName: name })}>Сменить имя</Btn></div>
        <div className="adm-row"><Field label="Новый пароль"><input type="text" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Минимум 6 символов" /></Field><Btn disabled={busy || password.length < 6} onClick={async () => { if (await run({ type: "user-password", id, password })) setPassword(""); }}><SvgIcon icon={KeyRound} size={15} />Сменить</Btn></div>
        <div className="adm-actions">
          <Btn disabled={busy} onClick={() => void run({ type: "user-role", id, role: user.role === "admin" ? "user" : "admin" }, user.role === "admin" ? "Снять права администратора?" : "Выдать права администратора? Игрок получит полный доступ к панели.")}><SvgIcon icon={Shield} size={15} />{user.role === "admin" ? "Снять админа" : "Сделать админом"}</Btn>
          <Btn kind="danger" disabled={busy} onClick={() => void run({ type: "user-reset", id }, "Сбросить ферму до стартовой? Прогресс будет потерян.")}>Сбросить ферму</Btn>
          <Btn kind="danger" disabled={busy} onClick={async () => { if (await run({ type: "user-delete", id }, `Удалить аккаунт ${user.username} навсегда?`)) onClose(); }}><SvgIcon icon={Trash2} size={15} />Удалить аккаунт</Btn>
        </div>
      </Card>
    </div>}
  </Drawer>;
}

export default function AdminUsers({ notify }: { notify: Notify }) {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [order, setOrder] = useState("newest");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const { data, loading, error, reload } = useSection("users", { q: search, filter, order, page });
  const users = (data?.users ?? []) as Row[];
  const total = Number(data?.total ?? 0);
  return <div className="adm-stack">
    <Card>
      <form className="adm-toolbar" onSubmit={(event) => { event.preventDefault(); setPage(0); setSearch(q); }}>
        <div className="adm-search"><SvgIcon icon={Search} size={17} /><input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Логин или имя игрока" /></div>
        <select value={filter} onChange={(event) => { setFilter(event.target.value); setPage(0); }}>
          {[["all", "Все"], ["online", "Онлайн"], ["new", "Новые (7 дн.)"], ["banned", "Заблокированные"], ["muted", "С мьютом"], ["admins", "Администраторы"]].map(([v, l]) => <option value={v} key={v}>{l}</option>)}
        </select>
        <select value={order} onChange={(event) => { setOrder(event.target.value); setPage(0); }}>
          {[["newest", "Сначала новые"], ["seen", "По активности"], ["level", "По уровню"], ["coins", "По монетам"], ["name", "По логину"]].map(([v, l]) => <option value={v} key={v}>{l}</option>)}
        </select>
        <Btn kind="primary" type="submit">Найти</Btn>
      </form>
    </Card>
    <Loading error={error} loading={loading && !data} />
    {data && <Card title={`Игроки · ${n(total)}`}>
      {users.length === 0 ? <Empty text="Никого не найдено" /> : <div className="adm-table-wrap"><table className="adm-table"><thead><tr><th>Игрок</th><th>Ур.</th><th>Монеты</th><th>Алм.</th><th>Статус</th><th>Активность</th></tr></thead><tbody>
        {users.map((user) => <tr key={user.id} onClick={() => setSelected(user.id)}>
          <td><strong>{user.displayName}</strong><small>@{user.username} · #{user.id}</small></td>
          <td>{user.level ?? "—"}</td><td>{n(user.coins)}</td><td>{user.gems ?? 0}</td>
          <td><div className="adm-pills">{user.role === "admin" && <Pill tone="blue">админ</Pill>}{user.bannedAt && <Pill tone="red">бан</Pill>}{user.mutedUntil && new Date(user.mutedUntil).getTime() > Date.now() && <Pill tone="amber">мьют</Pill>}{new Date(user.lastSeen).getTime() > Date.now() - 300_000 && <Pill tone="green">онлайн</Pill>}</div></td>
          <td>{ago(user.lastSeen)}</td>
        </tr>)}
      </tbody></table></div>}
      <div className="adm-pager"><Btn disabled={page === 0} onClick={() => setPage(page - 1)}><SvgIcon icon={ChevronLeft} size={16} /></Btn><span>Стр. {page + 1} из {Math.max(1, Math.ceil(total / 20))}</span><Btn disabled={(page + 1) * 20 >= total} onClick={() => setPage(page + 1)}><SvgIcon icon={ChevronRight} size={16} /></Btn></div>
    </Card>}
    {selected !== null && <UserDetail key={selected} id={selected} notify={notify} onClose={() => setSelected(null)} onChanged={() => void reload()} />}
  </div>;
}
