"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Award, Camera, Check, ChevronRight, Coins, Crown, Gift, Heart, Home, LogOut, Mail, MessageCircle, Upload,
  Send, Settings, Star, UserPlus, Users, X,
} from "lucide-react";
import { AVATARS, DEFAULT_AVATARS } from "@/lib/avatars";
import { ITEMS, xpNeeded } from "@/lib/game-config";
import { ACHIEVEMENTS } from "@/lib/game-engine";
import { WORKER_TYPES, WORKER_HOURS, workerPrice, type WorkerKind } from "@/lib/workers-config";
import type { GamePayload, ModuleKey, OpenModule } from "./game-types";
import { Avatar, Button, CardTitle, EmptyState, ItemIcon, Modal, formatDate } from "./game-ui";
import { GameIcon } from "./icons";
import { FarmerProfile, type ProfileData } from "./FarmerProfile";
import { AvatarUploadModal, EditProfileModal, ProfileFacts } from "./ProfileEditor";
import type { ProfileFields } from "@/lib/profile-fields";
import { resizeImage } from "@/lib/image";
import { customCoverId } from "@/lib/covers";
import { COVERS, COVER_UPLOAD_GEMS, DEFAULT_COVERS, coverStyle } from "@/lib/covers";
import { KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";
import { SvgIcon } from "./svg-icons";

export type { ProfileData } from "./FarmerProfile";

export function useProfile(id: number | null) {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const reload = useCallback(async () => {
    if (id === null) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/people?id=${id}`, { cache: "no-store" });
      const json = await response.json();
      if (response.ok) setData(json as ProfileData);
    } finally { setLoading(false); }
  }, [id]);
  useEffect(() => { void reload(); }, [reload]);
  return { data, loading, reload };
}

function CoverPreview({ cover }: { cover?: string }) {
  const id = customCoverId(cover);
  if (id) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="cover-preview" src={`/api/asset/${encodeURIComponent(`cover:${id}`)}`} alt="Ваша обложка" />;
  }
  return <span className="cover-preview" style={coverStyle(cover)} />;
}

function AvatarShop({ payload, busy, act, onUpload }: { payload: GamePayload; busy: boolean; act: (a: Record<string, unknown>) => Promise<boolean>; onUpload: () => void }) {
  const { state, user } = payload;
  return <div className="avatar-shop">
    <article className="custom-avatar-card"><Avatar name={user.avatar.startsWith("custom-") ? user.avatar : "sprout"} size={54} /><strong>Своя картинка</strong><small>3 алмаза</small><Button variant="secondary" disabled={busy} onClick={onUpload}><SvgIcon icon={Camera} size={14} />Загрузить</Button></article>
    {Object.values(AVATARS).map((config) => {
      const owned = DEFAULT_AVATARS.includes(config.key) || state.claimedPromos.includes(`avatar:${config.key}`);
      const equipped = user.avatar === config.key;
      return <article className={equipped ? "equipped" : ""} key={config.key}><Avatar name={config.key} size={54} /><strong>{config.name}</strong><small>{config.level > 1 ? `${config.level} ур.` : "Доступен"}</small>{owned ? <Button variant={equipped ? "soft" : "secondary"} disabled={busy || equipped} onClick={() => void act({ type: "avatar-equip", avatar: config.key })}>{equipped ? <><SvgIcon icon={Check} size={14} />Выбран</> : "Надеть"}</Button> : <Button disabled={busy || state.level < config.level || (config.coins ? state.coins < config.coins : state.gems < (config.gems ?? 0))} onClick={() => void act({ type: "avatar-buy", avatar: config.key })}>{config.coins ? <><SvgIcon icon={Coins} size={14} />{config.coins}</> : <><SvgIcon icon={Star} size={14} />{config.gems} алм.</>}</Button>}</article>;
    })}
  </div>;
}

export function PublicProfile({ id, payload, onClose, open, onChanged, onProfile }: { id: number; payload: GamePayload; onClose: () => void; open: OpenModule; onChanged?: () => void; onProfile?: (id: number) => void }) {
  const { data, loading, reload } = useProfile(id);
  const [busy, setBusy] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);
  const [item, setItem] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const inventory = Object.keys(payload.state.inventory).filter((key) => payload.state.inventory[key] > 0 && ITEMS[key]);
  const selected = item || inventory[0] || "";

  async function act(action: Record<string, unknown>) {
    setBusy(true);
    try {
      const response = await fetch("/api/people", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action) });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error);
      await reload();
      if (json.state) onChanged?.();
      return json;
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Ошибка");
      return null;
    } finally { setBusy(false); }
  }

  return <Modal title="Профиль фермера" onClose={onClose}>
    {loading && !data && <div className="inline-loading"><div className="loading-bar"><i /></div></div>}
    {data && <FarmerProfile data={data} viewer={payload} actions={{
      busy,
      onLike: () => void act({ type: "like", id }),
      onGift: () => setGiftOpen(true),
      onFriend: () => void act({ type: "friend", id }),
      onMail: () => { onClose(); open("mail"); },
      onProfile: (target) => { if (target !== id) onProfile?.(target); },
    }} />}
    {giftOpen && <Modal title="Выбрать подарок" onClose={() => setGiftOpen(false)}>
      <div className="form-stack">{inventory.length === 0 ? <p className="muted">В амбаре нет предметов для подарка.</p> : <>
        <label><span>Предмет из вашего амбара</span><select value={selected} onChange={(e) => setItem(e.target.value)}>{inventory.map((key) => <option key={key} value={key}>{ITEMS[key].name} · {payload.state.inventory[key]}</option>)}</select></label>
        <label><span>Количество</span><input type="number" min={1} max={payload.state.inventory[selected] ?? 1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} /></label>
        <label><span>Тёплые слова</span><input value={note} onChange={(e) => setNote(e.target.value)} maxLength={160} placeholder="С хорошим урожаем!" /></label>
        <Button disabled={busy} onClick={async () => { if (await act({ type: "gift", id, item: selected, quantity, note })) setGiftOpen(false); }}><SvgIcon icon={Send} size={16} />Отправить подарок</Button>
      </>}</div>
    </Modal>}
  </Modal>;
}

export function OwnProfile({ payload, busy, act, onLogout, open, onProfile, notify }: { payload: GamePayload; busy: boolean; act: (a: Record<string, unknown>) => Promise<boolean>; onLogout: () => Promise<void>; open: OpenModule; onProfile: (id: number) => void; notify: (text: string, error?: boolean) => void }) {
  const { user } = payload;
  const { data, reload } = useProfile(user.id);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatars, setAvatars] = useState(false);
  const [covers, setCovers] = useState(false);
  const [password, setPassword] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [passError, setPassError] = useState("");
  const [status, setStatus] = useState(false);
  const [mood, setMood] = useState(user.profile?.mood ?? "");
  const run = async (action: Record<string, unknown>) => { const ok = await act(action); if (ok) await reload(); return ok; };
  // Профиль обновляется вместе с основным состоянием фермы (аватар, имя, опыт).
  useEffect(() => { void reload(); }, [reload, user.avatar, user.displayName, user.bio, payload.state.xp, payload.state.level]);
  const profileUpdate = (patch: Record<string, unknown>) => run({ type: "profile-update", displayName: user.displayName, bio: user.bio ?? "", frame: user.profileFrame ?? "wood", profile: { ...(user.profile ?? {}) }, ...patch });

  return <div className="module-stack">
    {!data ? <div className="inline-loading"><div className="loading-bar"><i /></div><p>Загружаем профиль…</p></div> : <FarmerProfile data={data} viewer={payload} actions={{
      busy, notify,
      onStatus: () => { setMood(user.profile?.mood ?? ""); setStatus(true); },
      onAvatars: () => setAvatars(true),
      onSettings: () => setEditing(true),
      onBioSave: (bio) => profileUpdate({ bio }),
      onPremium: () => open("season"),
      onClaim: (id) => void run({ type: "achievement-claim", id }),
      onProfile,
      onCover: () => setCovers(true),
    }} />}
    <Button variant="soft" onClick={() => { setCurrent(""); setNext(""); setRepeat(""); setPassError(""); setPassword(true); }}><SvgIcon icon={KeyRound} size={16} />Сменить пароль</Button>
    <Button variant="soft" onClick={onLogout}><SvgIcon icon={LogOut} size={16} />Выйти из аккаунта</Button>
    {covers && <Modal title="Обложки профиля" onClose={() => setCovers(false)}>
      <p className="muted">Купленная обложка остаётся навсегда. У вас {payload.state.gems} алмазов.</p>
      <div className="cover-shop">
        <article className="custom-cover-card"><CoverPreview cover={user.cover} /><div><strong>Своя картинка</strong><small>{payload.state.claimedPromos.includes("cover:custom") ? "Можно надеть или загрузить другую" : `${COVER_UPLOAD_GEMS} алмазов, один раз`}</small></div>
          <label className="btn btn-secondary"><SvgIcon icon={Camera} size={14} />{payload.state.claimedPromos.includes("cover:custom") ? "Заменить" : "Загрузить"}<input type="file" accept="image/*" hidden disabled={busy || payload.state.gems < COVER_UPLOAD_GEMS} onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; const data = await resizeImage(file, 1280); await run({ type: "cover-upload", data }); e.target.value = ""; }} /></label>
          {payload.state.claimedPromos.includes("cover:custom") && <Button variant={(user.cover ?? "default") === `custom:${user.id}` ? "soft" : "secondary"} onClick={() => void run({ type: "cover-equip", cover: "custom" })}>{(user.cover ?? "default") === `custom:${user.id}` ? "Выбрана" : "Надеть"}</Button>}
        </article>
        {Object.values(COVERS).map((cover) => {
        const owned = DEFAULT_COVERS.includes(cover.key) || payload.state.claimedPromos.includes(`cover:${cover.key}`);
        const equipped = (user.cover ?? "default") === cover.key || (cover.key === "default" && !user.cover);
        return <article className={equipped ? "equipped" : ""} key={cover.key}>
          <span className="cover-preview" style={{ background: cover.style }} />
          <div><strong>{cover.name}</strong><small>{cover.hint}</small></div>
          {owned ? <Button variant={equipped ? "soft" : "secondary"} disabled={busy || equipped} onClick={() => void run({ type: "cover-equip", cover: cover.key })}>{equipped ? <><SvgIcon icon={Check} size={14} />Выбрана</> : "Надеть"}</Button>
            : <Button disabled={busy || payload.state.gems < cover.gems} onClick={() => void run({ type: "cover-buy", cover: cover.key })}><SvgIcon icon={Star} size={14} />{cover.gems} алм.</Button>}
        </article>;
      })}</div>
    </Modal>}
    {password && <Modal title="Смена пароля" onClose={() => setPassword(false)}>
      <form className="form-stack" onSubmit={async (event) => {
        event.preventDefault();
        setPassError("");
        if (next !== repeat) { setPassError("Новые пароли не совпадают"); return; }
        if (await act({ type: "password-change", current, next })) { setPassword(false); notify("Пароль изменён", false); }
      }}>
        <label><span>Текущий пароль</span><div className="input-wrap"><SvgIcon icon={LockKeyhole} size={17} /><input type="password" value={current} onChange={(event) => setCurrent(event.target.value)} required autoComplete="current-password" /></div></label>
        <label><span>Новый пароль</span><div className="input-wrap"><SvgIcon icon={KeyRound} size={17} /><input type="password" value={next} onChange={(event) => setNext(event.target.value)} minLength={6} maxLength={72} required autoComplete="new-password" /></div></label>
        <label><span>Повторите новый пароль</span><div className="input-wrap"><SvgIcon icon={ShieldCheck} size={17} /><input type="password" value={repeat} onChange={(event) => setRepeat(event.target.value)} minLength={6} maxLength={72} required autoComplete="new-password" /></div></label>
        {passError && <div className="form-error">{passError}</div>}
        <Button type="submit" disabled={busy}>Сохранить пароль</Button>
      </form>
    </Modal>}
    {status && <Modal title="Статус" onClose={() => setStatus(false)}><div className="form-stack"><label><span>Что у вас сейчас на ферме?</span><input value={mood} maxLength={50} onChange={(event) => setMood(event.target.value)} placeholder="Например: собираю урожай" autoFocus /></label><Button disabled={busy} onClick={async () => { if (await profileUpdate({ profile: { ...(user.profile ?? {}), mood } })) setStatus(false); }}><SvgIcon icon={Check} size={15} />Сохранить статус</Button></div></Modal>}
    {avatars && <Modal title="Аватары" onClose={() => setAvatars(false)}><AvatarShop payload={payload} busy={busy} act={run} onUpload={() => { setAvatars(false); setUploading(true); }} /></Modal>}
    {uploading && <AvatarUploadModal payload={payload} busy={busy} act={run} onClose={() => setUploading(false)} />}
    {editing && <EditProfileModal payload={payload} busy={busy} act={run} onClose={() => setEditing(false)} />}
  </div>;
}

type WorkerRow = { id: number; kind: WorkerKind; expiresAt: string; lastRunAt: string; auto: boolean; cycles: number; earned: number };
let workersCache: WorkerRow[] = [];

export function WorkersModule({ payload, busy, onChanged }: { payload: GamePayload; busy: boolean; onChanged: () => void }) {
  const [list, setList] = useState<WorkerRow[]>(workersCache);
  const [hours, setHours] = useState<Record<string, number>>({});
  const [localBusy, setLocalBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const load = useCallback(async () => { const r = await fetch("/api/workers"); if (r.ok) { const d = await r.json(); workersCache = d.workers; setList(d.workers); } }, []);
  useEffect(() => { void load(); }, [load]);
  async function run(action: Record<string, unknown>) {
    setLocalBusy(true);
    try { const r = await fetch("/api/workers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action) }); const d = await r.json(); setNotice(d.message ?? d.error); if (r.ok) { await load(); onChanged(); } } finally { setLocalBusy(false); }
  }
  return <div className="module-stack"><div className="scene-banner workers-scene"><GameIcon name="tractor" size={30} /><div><strong>Наёмные работники</strong><p>Работают по таймеру сервера, даже когда вы offline до 8, 24 или 72 часов. Семена, корм и мальки берут из вашего амбара.</p></div></div>
    {notice && <div className="tip-banner"><span>{notice}</span></div>}
    <div className="worker-list">{Object.entries(WORKER_TYPES).map(([key, config]) => {
      const kind = key as WorkerKind;
      const current = list.find((w) => w.kind === kind);
      const active = current && new Date(current.expiresAt).getTime() > Date.now();
      const h = hours[kind] ?? 8;
      return <article className="worker-card" key={key}><div className="worker-head"><GameIcon name={config.icon} size={28} /><div><h3>{config.name}</h3><p>{config.description}</p></div></div>
        {active && current ? <><div className="worker-status"><span className={current.auto ? "online-dot" : ""} />{current.auto ? "Работает" : "Пауза"} · до {formatDate(current.expiresAt)}</div><div className="worker-stats"><span>Циклов: {current.cycles}</span><span>Принесено: {current.earned}</span></div><div className="button-row"><Button variant="soft" disabled={localBusy} onClick={() => void run({ type: "toggle", kind })}>{current.auto ? "Пауза" : "Продолжить"}</Button><Button variant="danger" disabled={localBusy} onClick={() => void run({ type: "fire", kind })}>Уволить</Button></div></> : <><div className="worker-hours">{WORKER_HOURS.map((hour) => <button className={h === hour ? "active" : ""} onClick={() => setHours({ ...hours, [kind]: hour })} key={hour}>{hour} ч</button>)}</div><Button disabled={busy || localBusy || payload.state.coins < workerPrice(kind, h)} onClick={() => void run({ type: "hire", kind, hours: h })}><SvgIcon icon={Coins} size={16} />Нанять за {workerPrice(kind, h)}</Button></>}
      </article>;
    })}</div>
  </div>;
}
