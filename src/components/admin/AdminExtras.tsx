"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { BUILDINGS, EQUIPMENT, ITEMS, type CostOverrides } from "@/lib/game-config";
import { Card, type Notify } from "./admin-kit";
import { SvgIcon } from "../svg-icons";

type Prize = { key: string; label: string; kind: string; amount: number; item?: string; weight: number };
type Lottery = { id: number; key: string; name: string; description: string; priceCoins: number; priceGems: number; active: boolean; prizes: Prize[] };

const KINDS = ["coins", "gems", "item", "energy", "empty"];
const ORE_KEYS = ["stone", "coal", "copper", "iron", "gold"];
const emptyPrize = (): Prize => ({ key: `p${Date.now()}`, label: "Монеты", kind: "coins", amount: 100, weight: 10 });
const emptyLottery = (): Lottery => ({
  id: 0, key: "", name: "Новая лотерея", description: "", priceCoins: 200, priceGems: 0, active: true,
  prizes: [emptyPrize()],
});

function NumberField({ value, onChange, step = 1, label }: { value: number; onChange: (value: number) => void; step?: number; label: string }) {
  return <label className="adm-field"><span>{label}</span><input type="number" step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

export function AdminExtras({ notify }: { notify: Notify }) {
  const [busy, setBusy] = useState(false);
  // Локальный запуск запросов: useRunner рассчитан на adminPost-экшены.
  const run = useCallback(async (task: () => Promise<void>) => {
    setBusy(true);
    try {
      await task();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Ошибка", true);
    } finally {
      setBusy(false);
    }
  }, [notify]);
  const [lotteries, setLotteries] = useState<Lottery[]>([]);
  const [draft, setDraft] = useState<Lottery>(emptyLottery());
  const [buildPrices, setBuildPrices] = useState<CostOverrides>({});
  const [equipmentPrices, setEquipmentPrices] = useState<CostOverrides>({});

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/extras", { cache: "no-store" });
    const data = await response.json() as { lotteries?: Lottery[]; economy?: { buildings?: CostOverrides; equipment?: CostOverrides }; error?: string };
    if (!response.ok) { notify(data.error ?? "Ошибка загрузки", true); return; }
    setLotteries(data.lotteries ?? []);
    setBuildPrices(data.economy?.buildings ?? {});
    setEquipmentPrices(data.economy?.equipment ?? {});
  }, [notify]);

  useEffect(() => { void load(); }, [load]);

  function patchDraft(patch: Partial<Lottery>) { setDraft((current) => ({ ...current, ...patch })); }
  function patchPrize(index: number, patch: Partial<Prize>) {
    setDraft((current) => {
      const prizes = current.prizes.map((prize, i) => i === index ? { ...prize, ...patch } : prize);
      return { ...current, prizes };
    });
  }

  const totalWeight = draft.prizes.reduce((sum, prize) => sum + Math.max(1, Number(prize.weight) || 1), 0) || 1;

  return <div className="adm-stack">
    <Card title="Лотереи" subtitle="Несколько лотерей, цены билетов и шансы призов. Вес — относительный шанс, проценты считаются автоматически" action={
      <button className="adm-btn" onClick={() => setDraft(emptyLottery())}><SvgIcon icon={Plus} size={16} /> Новая лотерея</button>
    }>
      <div className="adm-split">
        <div className="adm-list">
          {lotteries.map((lottery) => <button key={lottery.id} className={`adm-row ${draft.id === lottery.id ? "is-active" : ""}`} onClick={() => setDraft(lottery)}>
            <strong>{lottery.name}</strong>
            <small>{lottery.priceCoins > 0 ? `${lottery.priceCoins} монет` : `${lottery.priceGems} алмазов`} · призов: {lottery.prizes.length} · {lottery.active ? "активна" : "выключена"}</small>
          </button>)}
          {!lotteries.length && <p className="adm-hint">Лотерей пока нет — создайте первую.</p>}
        </div>
        <div className="adm-form">
          <div className="adm-grid2">
            <label className="adm-field"><span>Название</span><input value={draft.name} onChange={(event) => patchDraft({ name: event.target.value })} /></label>
            <label className="adm-field"><span>Код (латиницей)</span><input value={draft.key} onChange={(event) => patchDraft({ key: event.target.value })} placeholder="golden" /></label>
            <NumberField label="Цена, монеты" value={draft.priceCoins} onChange={(value) => patchDraft({ priceCoins: value })} />
            <NumberField label="Цена, алмазы" value={draft.priceGems} onChange={(value) => patchDraft({ priceGems: value })} />
          </div>
          <label className="adm-field"><span>Описание</span><input value={draft.description} onChange={(event) => patchDraft({ description: event.target.value })} /></label>
          <label className="adm-check"><input type="checkbox" checked={draft.active} onChange={(event) => patchDraft({ active: event.target.checked })} /> Активна</label>

          <h4>Призы и шансы</h4>
          <div className="adm-prizes">
            {draft.prizes.map((prize, index) => <div className="adm-prize" key={`${prize.key}-${index}`}>
              <label className="adm-field"><span>Подпись</span><input value={prize.label} onChange={(event) => patchPrize(index, { label: event.target.value })} /></label>
              <label className="adm-field"><span>Тип</span><select value={prize.kind} onChange={(event) => patchPrize(index, { kind: event.target.value })}>
                {KINDS.map((kind) => <option key={kind} value={kind}>{kind}</option>)}
              </select></label>
              <NumberField label="Количество" value={prize.amount} onChange={(value) => patchPrize(index, { amount: value })} />
              {prize.kind === "item" && <label className="adm-field"><span>Предмет</span><select value={prize.item ?? "feed"} onChange={(event) => patchPrize(index, { item: event.target.value })}>
                {Object.keys(ITEMS).map((key) => <option key={key} value={key}>{ITEMS[key].name}</option>)}
              </select></label>}
              <NumberField label="Вес (шанс)" value={prize.weight} onChange={(value) => patchPrize(index, { weight: value })} />
              <span className="adm-chance">{Math.round((Math.max(1, prize.weight) / totalWeight) * 1000) / 10}%</span>
              <button className="adm-icon-btn" title="Удалить приз" onClick={() => patchDraft({ prizes: draft.prizes.filter((_, i) => i !== index) })}><SvgIcon icon={Trash2} size={16} /></button>
            </div>)}
          </div>
          <div className="adm-actions">
            <button className="adm-btn" onClick={() => patchDraft({ prizes: [...draft.prizes, emptyPrize()] })}><SvgIcon icon={Plus} size={16} /> Приз</button>
            <button className="adm-btn adm-btn-primary" disabled={busy} onClick={() => void run(async () => {
              const response = await fetch("/api/admin/extras", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "lottery-save", ...draft }) });
              const data = await response.json() as { error?: string; message?: string };
              if (!response.ok) throw new Error(data.error ?? "Ошибка");
              notify(data.message ?? "Сохранено");
              await load();
            })}><SvgIcon icon={Save} size={16} /> Сохранить лотерею</button>
            {draft.id > 0 && <button className="adm-btn adm-btn-danger" disabled={busy} onClick={() => void run(async () => {
              const response = await fetch("/api/admin/extras", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "lottery-delete", id: draft.id }) });
              if (!response.ok) throw new Error("Не удалось удалить");
              notify("Лотерея удалена");
              setDraft(emptyLottery());
              await load();
            })}><SvgIcon icon={Trash2} size={16} /> Удалить</button>}
          </div>
        </div>
      </div>
    </Card>

    <Card title="Цены строек" subtitle="Во сколько монет и руды обходится следующий уровень. Рост цены — множитель за каждый уровень">
      <PriceTable meta={BUILDINGS} prices={buildPrices} setPrices={setBuildPrices} />
      <div className="adm-actions">
        <button className="adm-btn adm-btn-primary" disabled={busy} onClick={() => void run(async () => {
          const response = await fetch("/api/admin/extras", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "prices-save", kind: "buildings", prices: buildPrices }) });
          const data = await response.json() as { error?: string; message?: string };
          if (!response.ok) throw new Error(data.error ?? "Ошибка");
          notify(data.message ?? "Сохранено");
        })}><SvgIcon icon={Save} size={16} /> Сохранить цены строек</button>
      </div>
    </Card>

    <Card title="Цены техники" subtitle="Кормушки, комбайн и аэратор строятся за монеты и руду">
      <PriceTable meta={EQUIPMENT} prices={equipmentPrices} setPrices={setEquipmentPrices} />
      <div className="adm-actions">
        <button className="adm-btn adm-btn-primary" disabled={busy} onClick={() => void run(async () => {
          const response = await fetch("/api/admin/extras", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "prices-save", kind: "equipment", prices: equipmentPrices }) });
          const data = await response.json() as { error?: string; message?: string };
          if (!response.ok) throw new Error(data.error ?? "Ошибка");
          notify(data.message ?? "Сохранено");
        })}><SvgIcon icon={Save} size={16} /> Сохранить цены техники</button>
      </div>
    </Card>
  </div>;
}

function PriceTable({ meta, prices, setPrices }: { meta: Record<string, { name: string; ore: string; coinBase: number; coinMult: number; oreBase: number; oreMult: number; max: number }>; prices: CostOverrides; setPrices: (value: CostOverrides) => void }) {
  function patch(kind: string, field: string, value: number | string) {
    setPrices({ ...prices, [kind]: { ...(prices[kind] ?? {}), [field]: value } as CostOverrides[string] });
  }
  return <div className="adm-table">
    <div className="adm-table-head"><span>Постройка</span><span>Монеты</span><span>Рост</span><span>Руда</span><span>Кол-во</span><span>Максимум</span></div>
    {Object.entries(meta).map(([kind, item]) => {
      const current = prices[kind] ?? {};
      return <div className="adm-table-row" key={kind}>
        <strong>{item.name}</strong>
        <input type="number" value={Number(current.coinBase ?? item.coinBase)} onChange={(event) => patch(kind, "coinBase", Number(event.target.value))} />
        <input type="number" step="0.01" value={Number(current.coinMult ?? item.coinMult)} onChange={(event) => patch(kind, "coinMult", Number(event.target.value))} />
        <select value={String(current.ore ?? item.ore)} onChange={(event) => patch(kind, "ore", event.target.value)}>
          {ORE_KEYS.map((ore) => <option key={ore} value={ore}>{ITEMS[ore]?.name ?? ore}</option>)}
        </select>
        <input type="number" value={Number(current.oreBase ?? item.oreBase)} onChange={(event) => patch(kind, "oreBase", Number(event.target.value))} />
        <input type="number" value={Number(current.max ?? item.max)} onChange={(event) => patch(kind, "max", Number(event.target.value))} />
      </div>;
    })}
  </div>;
}
