"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Coins, Gem, Hammer, Pickaxe, RefreshCw, Sparkles, Ticket, TrendingUp, Wrench, Zap } from "lucide-react";
import { BUILDINGS, EQUIPMENT, ITEMS, constructionPrice, type CostOverrides } from "@/lib/game-config";
import type { GamePayload } from "./game-types";
import { SvgIcon } from "./svg-icons";

const nf = new Intl.NumberFormat("ru-RU");

type LotteryPrize = { key: string; label: string; kind: string; amount: number; item?: string; weight: number; chance: number };
type Lottery = { id: number; key: string; name: string; description: string; priceCoins: number; priceGems: number; prizes: LotteryPrize[] };
type Winner = { id: number; name: string; prizeLabel: string; prizeKind: string; createdAt: string };
type Mine = { id: number; prizeLabel: string; prizeKind: string; createdAt: string };
type Snapshot = { lotteries: Lottery[]; winners: Winner[]; mine: Mine[] };

const PRIZE_ICON: Record<string, typeof Coins> = { coins: Coins, gems: Gem, item: Sparkles, energy: Zap, empty: RefreshCw };

type Act = (action: { type: string; [key: string]: unknown }) => Promise<boolean>;

export function BuildModule({ payload, act, busy }: { payload: GamePayload; act: Act; busy: boolean }) {
  const { state } = payload;
  const [economy, setEconomy] = useState<{ buildings: CostOverrides; equipment: CostOverrides }>({ buildings: {}, equipment: {} });

  useEffect(() => {
    let alive = true;
    fetch("/api/admin/extras", { cache: "no-store" }).then((response) => response.ok ? response.json() : null).then((data) => {
      if (alive && data?.economy) setEconomy(data.economy as { buildings: CostOverrides; equipment: CostOverrides });
    }).catch(() => undefined);
    return () => { alive = false; };
  }, []);

  const rows = useMemo(() => (
    (["barn", "garden", "pond"] as const).map((kind) => ({ kind, level: state.buildings[kind], price: constructionPrice(kind, state.buildings[kind], economy.buildings) }))
  ), [state.buildings, economy.buildings]);
  const equipment = useMemo(() => (
    (["feeder", "harvester", "aerator"] as const).map((kind) => ({ kind, level: state.equipment[kind], price: constructionPrice(kind, state.equipment[kind] + 1, economy.equipment) }))
  ), [state.equipment, economy.equipment]);

  return <div className="module-stack">
    <section className="panel">
      <h2><SvgIcon icon={Hammer} size={22} /> Стройка</h2>
      <p className="muted">Каждый уровень стоит монет и руды из шахты. Цены растут с каждым уровнем — их меняет администратор в разделе «Лотереи и стройка».</p>
      <div className="build-grid">
        {rows.map(({ kind, level, price }) => {
          const meta = BUILDINGS[kind];
          const ore = price?.ore ?? meta.ore;
          const haveOre = state.inventory[ore] ?? 0;
          const maxed = !price || level >= price.meta.max;
          return <article className="build-card" key={kind}>
            <header><strong>{meta.name}</strong><span className="build-level">ур. {level}</span></header>
            <p>{meta.description}</p>
            <small>{meta.effect}</small>
            <div className="build-cost">
              <span title="Монеты"><SvgIcon icon={Coins} size={16} /> {maxed ? "—" : nf.format(price!.coins)}</span>
              <span title={ITEMS[ore]?.name ?? ore}><SvgIcon icon={Pickaxe} size={16} /> {maxed ? "—" : price!.oreAmount} {ITEMS[ore]?.name ?? ore}</span>
            </div>
            <small className={haveOre >= (price?.oreAmount ?? 0) ? "ok" : "warn"}>В амбаре руды: {haveOre}</small>
            <button className="primary-button" disabled={busy || maxed} onClick={() => void act({ type: "build-upgrade", kind })}>
              {maxed ? "Максимум" : `Построить ур. ${level + 1}`}
            </button>
          </article>;
        })}
      </div>
    </section>

    <section className="panel">
      <h2><SvgIcon icon={Wrench} size={22} /> Техника</h2>
      <p className="muted">Кормушки ускоряют животных, комбайн собирает весь урожай одним нажатием, аэратор поливает грядки при посадке.</p>
      <div className="build-grid">
        {equipment.map(({ kind, level, price }) => {
          const meta = EQUIPMENT[kind];
          const ore = price?.ore ?? meta.ore;
          const haveOre = state.inventory[ore] ?? 0;
          const maxed = !price || level >= price.meta.max;
          return <article className="build-card equipment" key={kind}>
            <header><strong>{meta.name}</strong><span className="build-level">ур. {level}</span></header>
            <p>{meta.description}</p>
            <small>{meta.effect}</small>
            <div className="build-cost">
              <span><SvgIcon icon={Coins} size={16} /> {maxed ? "—" : nf.format(price!.coins)}</span>
              <span><SvgIcon icon={Pickaxe} size={16} /> {maxed ? "—" : price!.oreAmount} {ITEMS[ore]?.name ?? ore}</span>
            </div>
            <small className={haveOre >= (price?.oreAmount ?? 0) ? "ok" : "warn"}>В амбаре руды: {haveOre}</small>
            <button className="primary-button" disabled={busy || maxed} onClick={() => void act({ type: "equipment-buy", kind })}>
              {maxed ? "Максимум" : level === 0 ? `Построить (${price?.meta.name ?? meta.name})` : `Улучшить до ур. ${level + 1}`}
            </button>
          </article>;
        })}
      </div>
      <div className="row-actions">
        <button className="primary-button" disabled={busy || state.equipment.harvester < 1} onClick={() => void act({ type: "harvest-all" })}>
          <SvgIcon icon={TrendingUp} size={18} /> Собрать всё комбайном
        </button>
        <span className="muted">Комбайн: {state.equipment.harvester > 0 ? `+${state.equipment.harvester * 10}% опыта` : "не построен"} · Аэратор: −{state.equipment.aerator * 10}% времени роста</span>
      </div>
    </section>
  </div>;
}

export function LotteryModule({ busy, onChanged }: { busy: boolean; onChanged: () => void }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState("");
  const [prize, setPrize] = useState<LotteryPrize | null>(null);
  const [buying, setBuying] = useState(0);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/lottery", { cache: "no-store" });
      const data = await response.json() as Snapshot & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Не удалось загрузить лотереи");
      setSnapshot(data);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ошибка загрузки");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function buy(lottery: Lottery) {
    setBuying(lottery.id);
    setPrize(null);
    try {
      const response = await fetch("/api/lottery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: lottery.id }),
      });
      const data = await response.json() as { error?: string; prize?: LotteryPrize; lottery?: Snapshot };
      if (!response.ok) throw new Error(data.error ?? "Билет не куплен");
      if (data.prize) setPrize(data.prize);
      if (data.lottery) setSnapshot(data.lottery);
      onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ошибка покупки");
    } finally {
      setBuying(0);
    }
  }

  return <div className="module-stack">
    <section className="panel">
      <h2><SvgIcon icon={Ticket} size={22} /> Лотереи</h2>
      <p className="muted">Несколько лотерей с разными билетами. Шансы призов настраиваются в админке, розыгрыш считает сервер.</p>
      {error && <p className="form-error">{error}</p>}
      {prize && <div className={`lottery-result kind-${prize.kind}`}>
        <SvgIcon icon={PRIZE_ICON[prize.kind] ?? Sparkles} size={26} />
        <strong>{prize.kind === "empty" ? "Пусто" : `Ваш приз: ${prize.label}`}</strong>
      </div>}
      <div className="lottery-grid">
        {(snapshot?.lotteries ?? []).map((lottery) => <article className="lottery-card" key={lottery.id}>
          <header><strong>{lottery.name}</strong><span className="build-level">билет: {lottery.priceCoins > 0 ? `${nf.format(lottery.priceCoins)} монет` : `${lottery.priceGems} алмазов`}</span></header>
          <p>{lottery.description}</p>
          <ul className="prize-list">
            {lottery.prizes.map((entry) => <li key={entry.key}>
              <SvgIcon icon={PRIZE_ICON[entry.kind] ?? Sparkles} size={15} />
              <span>{entry.label}</span>
              <em>{entry.chance}%</em>
            </li>)}
          </ul>
          <button className="primary-button" disabled={busy || buying === lottery.id} onClick={() => void buy(lottery)}>
            {buying === lottery.id ? <SvgIcon icon={RefreshCw} size={16} /> : <SvgIcon icon={Ticket} size={16} />} Купить билет
          </button>
        </article>)}
        {snapshot && !snapshot.lotteries.length && <p className="muted">Пока нет активных лотерей.</p>}
      </div>
    </section>

    <section className="panel">
      <h2>Последние выигрыши</h2>
      <ul className="winner-list">
        {(snapshot?.winners ?? []).map((winner) => <li key={winner.id}>
          <strong>{winner.name}</strong>
          <span>{winner.prizeLabel || "без приза"}</span>
          <small>{new Date(winner.createdAt).toLocaleString("ru-RU")}</small>
        </li>)}
        {snapshot && !snapshot.winners.length && <li className="muted">Выигрышей пока нет — станьте первым.</li>}
      </ul>
    </section>
  </div>;
}
