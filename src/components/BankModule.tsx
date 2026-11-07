"use client";

import { useState } from "react";
import { Coins, Crown, Gem, Landmark, Mail, Sparkles, X } from "lucide-react";
import type { GamePayload, OpenModule } from "./game-types";
import { Button, Modal } from "./game-ui";
import { SvgIcon } from "./svg-icons";

export type BankPack = { id: string; name: string; amount: number; bonus: number; price: number; x2: boolean; tag: string; tone: "blue" | "purple" | "teal" | "green" };
export const GEM_PACKS: BankPack[] = [
  { id: "g1", name: "Горсть кристаллов", amount: 60, bonus: 0, price: 99, x2: true, tag: "", tone: "blue" },
  { id: "g2", name: "Мешочек кристаллов", amount: 120, bonus: 10, price: 199, x2: true, tag: "Хит", tone: "purple" },
  { id: "g3", name: "Шкатулка кристаллов", amount: 250, bonus: 30, price: 399, x2: true, tag: "", tone: "teal" },
  { id: "g4", name: "Сундук кристаллов", amount: 600, bonus: 100, price: 899, x2: false, tag: "Выгодно", tone: "green" },
];
export const COIN_PACKS: BankPack[] = [
  { id: "c1", name: "Мешок монет", amount: 1_000, bonus: 100, price: 99, x2: false, tag: "", tone: "blue" },
  { id: "c2", name: "Сундук монет", amount: 5_000, bonus: 500, price: 299, x2: false, tag: "Хит", tone: "purple" },
  { id: "c3", name: "Сейф фермера", amount: 25_000, bonus: 5_000, price: 999, x2: false, tag: "", tone: "teal" },
  { id: "c4", name: "Казна долины", amount: 100_000, bonus: 30_000, price: 2_999, x2: false, tag: "Выгодно", tone: "green" },
];

const fmt = (value: number) => new Intl.NumberFormat("ru-RU").format(value);
const rub = (value: number) => `${fmt(value)} ₽`;

export default function BankModule({ payload, open }: { payload: GamePayload; open: OpenModule }) {
  const [tab, setTab] = useState<"gems" | "coins">("gems");
  const [selected, setSelected] = useState<BankPack | null>(null);
  const banker = payload.banker;
  const nick = banker?.username ?? "ADMIN";
  const unit = tab === "gems" ? "кристаллов" : "монет";
  const packs = tab === "gems" ? GEM_PACKS : COIN_PACKS;

  function writeBank(extra?: string) {
    const subject = selected ? `Покупка в банке: ${selected.name}` : "Покупка в банке долины";
    const body = `${extra ?? `Здравствуйте, ${nick}!\n\nХочу купить пакет «${selected?.name ?? ""}» на ${fmt(selected?.price ?? 0)} ₽ (${fmt(selected?.amount ?? 0)} ${unit}).`}\n\nМой ник: ${payload.user.username}\nID: ${payload.user.id}`;
    setSelected(null);
    open("mail", { username: nick, subject, body });
  }

  const x2Part = selected?.x2 ? selected.amount : 0;
  const total = selected ? selected.amount + selected.bonus + x2Part : 0;

  return <div className="module-stack bank-module">
    <section className="bank-top">
      <span className="bank-crest"><SvgIcon icon={Landmark} size={30} /></span>
      <div><span className="eyebrow light">Казна долины</span><h2>Банк</h2><p>Кристаллы и монеты для фермы. Выберите пакет — администратор поможет с покупкой.</p></div>
      <div className="bank-wallet"><span><SvgIcon icon={Gem} size={15} />{fmt(payload.state.gems)}</span><span><SvgIcon icon={Coins} size={15} />{fmt(payload.state.coins)}</span></div>
    </section>

    <button className="bank-note" onClick={() => writeBank()}>
      <SvgIcon icon={Mail} size={20} />
      <p>Для покупки пишите на ник <strong>{nick.toUpperCase()}</strong></p>
      <small>Откроется почта игроку #{banker?.id ?? 1}</small>
    </button>

    <div className="segmented"><button className={tab === "gems" ? "active" : ""} onClick={() => setTab("gems")}><SvgIcon icon={Gem} size={15} />Кристаллы</button><button className={tab === "coins" ? "active" : ""} onClick={() => setTab("coins")}><SvgIcon icon={Coins} size={15} />Монеты</button></div>

    <div className="shop-packs">{packs.map((pack) => <button className={`pack-card tone-${pack.tone}`} key={pack.id} onClick={() => setSelected(pack)}>
      {pack.x2 && <i className="pack-x2">×2</i>}
      {pack.tag && <i className="pack-tag">{pack.tag}</i>}
      <span className="pack-chest">{tab === "gems" ? <SvgIcon icon={Gem} size={44} /> : <SvgIcon icon={Coins} size={44} />}</span>
      <small>{pack.name}</small>
      <strong>{fmt(pack.amount)}</strong>
      <span className="pack-badges">{pack.bonus > 0 && <em>+{fmt(pack.bonus)} бонус</em>}{pack.x2 && <em>+{fmt(pack.amount)} за ×2</em>}</span>
      <span className="pack-price">{rub(pack.price)}</span>
    </button>)}</div>

    <p className="form-hint center"><SvgIcon icon={Sparkles} size={13} /> Оплата в приложении пока недоступна. Все покупки оформляет администратор вручную.</p>

    {selected && <Modal title={selected.name} onClose={() => setSelected(null)}>
      <div className="buy-dialog">
        <button className="buy-close" onClick={() => setSelected(null)} aria-label="Закрыть"><SvgIcon icon={X} size={18} /></button>
        <span className="buy-gem"><SvgIcon icon={tab === "gems" ? Gem : Coins} size={26} /></span>
        <h3>{selected.name}</h3>
        <div className="buy-chest"><SvgIcon icon={Crown} size={30} />{tab === "gems" ? <SvgIcon icon={Gem} size={46} /> : <SvgIcon icon={Coins} size={46} />}</div>
        <dl className="buy-rows">
          <div><dt>{tab === "gems" ? "Кристаллы" : "Монеты"}</dt><dd><SvgIcon icon={tab === "gems" ? Gem : Coins} size={13} />{fmt(selected.amount)}</dd></div>
          <div><dt>Бонус пакета</dt><dd>+{fmt(selected.bonus)}</dd></div>
          {selected.x2 && <div><dt>×2 за первую покупку</dt><dd>+{fmt(selected.amount)}</dd></div>}
          <div className="buy-total"><dt>Всего {unit}</dt><dd><SvgIcon icon={tab === "gems" ? Gem : Coins} size={14} />{fmt(total)}</dd></div>
        </dl>
        <p className="buy-price">К оплате: <strong>{rub(selected.price)}</strong></p>
        <button className="buy-note" onClick={() => writeBank()}>Для покупки пишите на ник <strong>{nick.toUpperCase()}</strong></button>
        <Button className="btn-large" disabled>Скоро</Button>
      </div>
    </Modal>}
  </div>;
}
