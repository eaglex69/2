"use client";

import { useEffect, useState } from "react";
import { Check, Coins, Crown, Gem, Lock, RefreshCw, Timer, Trophy, Users } from "lucide-react";
import { AVATARS } from "@/lib/avatars";
import { ITEMS } from "@/lib/game-config";
import {
  POINTS_PER_LEVEL, PREMIUM_COST, SEASON_LEVELS, WEEKLY_COOP_REWARDS, WEEKLY_FARMER_REWARDS,
  lifetimeScore, seasonEnd, seasonName, seasonReward, weekEnd, type Reward,
} from "@/lib/season";
import type { Act, GamePayload } from "./game-types";
import { Avatar, Button, CardTitle, EmptyState, ItemIcon } from "./game-ui";
import { GameIcon } from "./icons";
import { SvgIcon } from "./svg-icons";

export function RewardChips({ reward }: { reward: Reward }) {
  return <div className="reward-chips">
    {!!reward.coins && <span><SvgIcon icon={Coins} size={13} />{reward.coins}</span>}
    {!!reward.gems && <span><SvgIcon icon={Gem} size={13} />{reward.gems}</span>}
    {!!reward.items && Object.entries(reward.items).map(([key, amount]) => <span key={key}><ItemIcon itemKey={key} size={13} />{ITEMS[key]?.name ?? key} ×{amount}</span>)}
    {reward.avatar && <span><Avatar name={reward.avatar} size={18} />{AVATARS[reward.avatar]?.name}</span>}
  </div>;
}

type FarmerRow = { id: number; displayName: string; avatar: string; level: number; points: number; tag: string | null; place: number; total: number; role?: string };
type CoopRow = { id: number; name: string; tag: string; icon: string; points: number; members: number; place: number; total: number };
type Winner = { id: number; name: string; rank: number; points: number; tag?: string };
type RatingData = {
  week: string; farmersWeek: FarmerRow[]; farmersAll: FarmerRow[]; coopsWeek: CoopRow[]; coopsAll: CoopRow[];
  me: FarmerRow | null; myRank: number | null; myPoints: number; totalFarmers: number; myCoopId: number | null; serverTime: number;
  last: { week: string; summary: { farmers?: Winner[]; coops?: Winner[] } } | null;
};

export function RatingModule({ now, me, onProfile }: { now: number; me: number; onProfile: (id: number) => void }) {
  const [data, setData] = useState<RatingData | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [tab, setTab] = useState<"farmers" | "coops">("farmers");
  const [period, setPeriod] = useState<"week" | "all">("week");
  useEffect(() => {
    const controller = new AbortController(); let alive = true;
    const load = async () => {
      try {
        const response = await fetch("/api/rating", { cache: "no-store", signal: controller.signal });
        const json = await response.json() as RatingData & { error?: string };
        if (!response.ok) throw new Error(json.error ?? "Рейтинги временно недоступны");
        if (alive) { setData(json); setError(""); }
      } catch (reason) {
        if (alive && !controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Нет соединения с сервером");
      }
    };
    void load(); const timer = window.setInterval(() => void load(), 30000);
    window.addEventListener("focus", load);
    return () => { alive = false; controller.abort(); window.clearInterval(timer); window.removeEventListener("focus", load); };
  }, [retry]);

  if (error && !data) return <section className="panel rating-error" role="alert"><SvgIcon icon={Trophy} size={34} /><h3>Не удалось загрузить рейтинги</h3><p>{error}</p><Button onClick={() => setRetry(v => v + 1)}><SvgIcon icon={RefreshCw} size={17} />Попробовать снова</Button></section>;
  if (!data) return <div className="inline-loading"><div className="loading-bar"><i /></div><p>Загружаем места игроков…</p></div>;
  const left = Math.max(0, weekEnd(now) - now), days = Math.floor(left / 86400000), hours = Math.floor(left % 86400000 / 3600000);
  const farmers = period === "week" ? data.farmersWeek : data.farmersAll;
  const coops = period === "week" ? data.coopsWeek : data.coopsAll;
  const rewards = tab === "farmers" ? WEEKLY_FARMER_REWARDS : WEEKLY_COOP_REWARDS;
  const mine = period === "week" ? data.me : farmers.find(row => row.id === me);
  const myCoop = coops.find(row => row.id === data.myCoopId);
  const farmerRow = (row: FarmerRow) => <button className={`rating-row ${row.id === me ? "me" : ""}`} onClick={() => onProfile(row.id)} key={row.id} aria-label={`${row.place} место, ${row.displayName}, ${row.points} ${period === "week" ? "очков" : "опыта"}`}>
    <span className={`rank-badge rank-${row.place}`}>{row.place}</span><Avatar name={row.avatar} size={44} />
    <div><strong>{row.displayName}{row.id === me && <em>Вы</em>}</strong><small>{row.tag ? `[${row.tag}] · ` : ""}{row.level} уровень{row.role === "admin" ? " · Администратор" : ""}</small></div>
    <b>{row.points.toLocaleString("ru-RU")}<small>{period === "week" ? "очков" : "XP"}</small></b>
  </button>;
  const coopRow = (row: CoopRow) => <div className={`rating-row ${row.id === data.myCoopId ? "me" : ""}`} key={row.id}>
    <span className={`rank-badge rank-${row.place}`}>{row.place}</span><span className="coop-emblem"><GameIcon name={row.icon} size={25} /></span>
    <div><strong>[{row.tag}] {row.name}</strong><small>{row.members} участников</small></div><b>{row.points.toLocaleString("ru-RU")}<small>{period === "week" ? "очков" : "XP"}</small></b>
  </div>;
  return <div className="module-stack rating-module">
    <section className="rating-hero"><SvgIcon icon={Trophy} size={34} /><div><strong>Кто сейчас на вершине?</strong><p>Места обновляются по делам на ферме. Топ-5 игроков и кооперативов получают подарки в конце недели.</p></div><span className="rating-timer"><SvgIcon icon={Timer} size={15} />{days} д {hours} ч</span></section>
    <section className="rating-my-place" aria-live="polite"><span className="eyebrow">Ваше место · {period === "week" ? "эта неделя" : "за всё время"}</span><div><strong>#{tab === "farmers" ? mine?.place ?? data.myRank ?? "—" : myCoop?.place ?? "—"}</strong><span>{tab === "farmers" ? `${mine?.points ?? 0} очков · ${data.totalFarmers} участников` : myCoop ? `[${myCoop.tag}] ${myCoop.name} · ${myCoop.points} очков` : "Вы пока не состоите в кооперативе"}</span></div><p>{tab === "farmers" && !mine?.points ? "Соберите первый урожай или выполните заказ — очки появятся в таблице." : "Администраторы видны в таблице, но не участвуют в раздаче наград."}</p></section>
    {error && <div className="form-error" role="alert">{error} <button onClick={() => setRetry(v => v + 1)}>Повторить</button></div>}
    <div className="segmented"><button className={tab === "farmers" ? "active" : ""} onClick={() => setTab("farmers")}>Фермеры</button><button className={tab === "coops" ? "active" : ""} onClick={() => setTab("coops")}>Кооперативы</button></div>
    <div className="segmented"><button className={period === "week" ? "active" : ""} onClick={() => setPeriod("week")}>Эта неделя</button><button className={period === "all" ? "active" : ""} onClick={() => setPeriod("all")}>За всё время</button></div>
    <div className="rating-list-heading"><strong>{tab === "farmers" ? "Таблица фермеров" : "Таблица кооперативов"} · {period === "week" ? data.week : "всё время"}</strong><button onClick={() => setRetry(v => v + 1)}><SvgIcon icon={RefreshCw} size={15} />Обновить</button></div>
    <div className="rating-list">
      {tab === "farmers" && (farmers.length ? farmers.map(farmerRow) : <EmptyState icon={<SvgIcon icon={Trophy} size={32} />} title="Пока нет участников" text="Как только игроки появятся в долине, их места отобразятся здесь." />)}
      {tab === "coops" && (coops.length ? coops.map(coopRow) : <EmptyState icon={<SvgIcon icon={Users} size={32} />} title="Кооперативов пока нет" text="Создайте первый в разделе «Кооператив»." />)}
    </div>
    {tab === "farmers" && mine && !farmers.some(row => row.id === me) && <div className="rating-pinned">{farmerRow(mine)}</div>}
    {tab === "coops" && myCoop && !coops.some(row => row.id === myCoop.id) && <div className="rating-pinned">{coopRow(myCoop)}</div>}
    <p className="rating-updated">Обновлено в {new Date(data.serverTime).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })} · автоматически каждые 30 секунд</p>
    {period === "week" && <details className="panel rating-rewards"><summary><SvgIcon icon={Crown} size={20} />Награды недели</summary><div className="reward-table">{rewards.map((reward, index) => <div key={index}><span className={`rank-badge rank-${index + 1}`}>{index + 1}</span><RewardChips reward={reward} /></div>)}</div><p className="form-hint">Очки: урожай ×5, рыба ×4, шахта ×3, заготовка ×6, заказ города ×20 и +1 за каждые 20 заработанных монет. Администраторы не получают призовые места.</p></details>}
    {data.last && <section className="panel"><CardTitle icon={<SvgIcon icon={Trophy} size={19} />} title={`Победители прошлой недели (${data.last.week})`} /><div className="winners">{(data.last.summary.farmers ?? []).map(w => <button key={`f${w.id}`} onClick={() => onProfile(w.id)}><span className={`rank-badge rank-${w.rank}`}>{w.rank}</span>{w.name}<small>{w.points} оч.</small></button>)}{(data.last.summary.coops ?? []).map(w => <div key={`c${w.id}`}><span className={`rank-badge rank-${w.rank}`}>{w.rank}</span>[{w.tag}] {w.name}<small>{w.points} оч.</small></div>)}</div></section>}
  </div>;
}

export function SeasonModule({ payload, now, busy, act }: { payload: GamePayload; now: number; busy: boolean; act: Act }) {
  const { state } = payload;
  const points = Math.max(0, lifetimeScore(state.stats) - state.season.base);
  const level = Math.min(SEASON_LEVELS, Math.floor(points / POINTS_PER_LEVEL));
  const inLevel = level >= SEASON_LEVELS ? POINTS_PER_LEVEL : points % POINTS_PER_LEVEL;
  const daysLeft = Math.max(0, Math.ceil((seasonEnd(now) - now) / 86_400_000));
  const levels = Array.from({ length: SEASON_LEVELS }, (_, index) => index + 1);

  function cell(track: "free" | "premium", lvl: number) {
    const reward = seasonReward(track, lvl);
    const claimed = (track === "premium" ? state.season.claimedPremium : state.season.claimedFree).includes(lvl);
    const reached = lvl <= level;
    const locked = track === "premium" && !state.season.premium;
    return <div className={`season-cell ${claimed ? "claimed" : ""} ${reached ? "reached" : ""}`}>
      <RewardChips reward={reward} />
      {claimed ? <span className="season-done"><SvgIcon icon={Check} size={14} />Получено</span> : <Button disabled={busy || !reached || locked} onClick={() => void act({ type: "season-claim", track, level: lvl })}>{locked && <SvgIcon icon={Lock} size={13} />}{!reached ? "Закрыто" : locked ? "Премиум" : "Забрать"}</Button>}
    </div>;
  }

  return <div className="module-stack">
    <section className="season-hero">
      <span className="eyebrow light">Сезон · осталось {daysLeft} дн.</span>
      <h2>{seasonName(now)}</h2>
      <div className="season-level"><strong>Уровень {level}<small> из {SEASON_LEVELS}</small></strong><span>{inLevel}/{POINTS_PER_LEVEL} очков</span></div>
      <div className="progress-track"><span style={{ width: `${inLevel / POINTS_PER_LEVEL * 100}%` }} /></div>
      <p>Очки пропуска набираются за любые дела на ферме: урожай, рыбалка, шахты, заготовки и заказы города.</p>
    </section>
    {!state.season.premium && <section className="season-premium"><SvgIcon icon={Crown} size={28} /><div><h3>Премиум-пропуск</h3><p>Откроет вторую дорожку: больше монет, алмазов, предметов и эксклюзивные аватары. Награды за уже пройденные уровни забираются сразу.</p></div><Button disabled={busy || state.gems < PREMIUM_COST} onClick={() => void act({ type: "season-premium" })}><SvgIcon icon={Gem} size={15} />{PREMIUM_COST} алмазов</Button></section>}
    <div className="season-table">
      <div className="season-head"><span>Ур.</span><span>Бесплатный</span><span>Премиум</span></div>
      {levels.map((lvl) => <div className={`season-row ${lvl <= level ? "reached" : ""}`} key={lvl}><span className="season-lvl">{lvl}</span>{cell("free", lvl)}{cell("premium", lvl)}</div>)}
    </div>
  </div>;
}
