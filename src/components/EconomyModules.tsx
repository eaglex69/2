"use client";

import { useMemo, useState } from "react";
import {
  BadgePercent,
  Building2,
  Check,
  ClipboardList,
  Coins,
  Gem,
  Gift,
  Hammer,
  Info,
  Megaphone,
  Newspaper,
  Package,
  Search,
  ShoppingBag,
  ShoppingCart,
  Store,
  Tag,
  TrendingDown,
  TrendingUp,
  Warehouse,
  Zap,
} from "lucide-react";
import {
  ITEMS,
  GLOBALS,
  NEWS,
  PROMOTIONS,
  SHOP_KEYS,
  UPGRADES,
  barnCapacity,
  dayKey,
  inventoryVolume,
  marketPrice,
  upgradeCost,
} from "@/lib/game-config";
import type { Act, GamePayload } from "./game-types";
import { Button, CardTitle, EmptyState, ItemIcon, Modal, Stepper } from "./game-ui";
import { sellPrice, shopPrice } from "@/lib/bonus";
import { BonusList } from "./BonusUi";
import { SvgIcon } from "./svg-icons";

type Props = { payload: GamePayload; now: number; busy: boolean; act: Act };

function SellModal({ itemKey, payload, busy, act, onClose }: { itemKey: string; payload: GamePayload; busy: boolean; act: Act; onClose: () => void }) {
  const owned = payload.state.inventory[itemKey] ?? 0;
  const [quantity, setQuantity] = useState(1);
  const price = sellPrice(itemKey, Date.now());
  return <Modal title={`Продать: ${ITEMS[itemKey].name}`} onClose={onClose}><div className="sell-modal-product"><ItemIcon itemKey={itemKey} size={34} /><div><strong>{ITEMS[itemKey].name}</strong><span>В амбаре: {owned}</span></div></div><div className="price-callout"><span>Цена скупки сейчас</span><strong><SvgIcon icon={Coins} size={17} />{price} / шт.</strong></div><Stepper value={quantity} onChange={setQuantity} max={owned} /><div className="total-line"><span>Вы получите</span><strong>{price * quantity} монет</strong></div><Button className="btn-large" disabled={busy || quantity > owned} onClick={async () => { if (await act({ type: "npc-sell", item: itemKey, quantity })) onClose(); }}><SvgIcon icon={Coins} size={18} />Продать за {price * quantity}</Button></Modal>;
}

export function BarnModule({ payload, busy, act }: Props) {
  const { state } = payload;
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [selling, setSelling] = useState<string | null>(null);
  const volume = inventoryVolume(state.inventory);
  const capacity = barnCapacity(state.barnLevel);
  const entries = Object.entries(state.inventory).filter(([key, amount]) => amount > 0 && ITEMS[key]).filter(([key]) => {
    const category = ITEMS[key].category;
    return (filter === "all" || filter === "supplies" && category === "supply" || filter === "goods" && category !== "supply") && ITEMS[key].name.toLowerCase().includes(query.toLowerCase());
  }).sort((a, b) => ITEMS[a[0]].category.localeCompare(ITEMS[b[0]].category) || ITEMS[a[0]].name.localeCompare(ITEMS[b[0]].name));
  return <div className="module-stack"><section className="barn-summary"><SvgIcon icon={Warehouse} size={33} /><div><span>Вместимость амбара</span><strong>{volume} / {capacity}</strong><div className="progress-track"><span style={{ width: `${Math.min(100, volume / capacity * 100)}%` }} /></div></div><span className="level-chip">{state.barnLevel} ур.</span></section><div className="input-wrap search-input"><SvgIcon icon={Search} size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти предмет" /></div><div className="segmented">{[["all", "Всё"], ["goods", "Продукты"], ["supplies", "Запасы"]].map(([key, label]) => <button className={filter === key ? "active" : ""} onClick={() => setFilter(key)} key={key}>{label}</button>)}</div>{entries.length === 0 ? <EmptyState icon={<SvgIcon icon={Package} size={34} />} title="Здесь пусто" text="Измените фильтр или отправьтесь за новым урожаем." /> : <div className="inventory-grid">{entries.map(([key, amount]) => <article className="inventory-card" key={key}><div className="inventory-top"><ItemIcon itemKey={key} size={27} /><strong>×{amount}</strong></div><h3>{ITEMS[key].shortName ?? ITEMS[key].name}</h3><p>{ITEMS[key].description}</p><div className="inventory-price"><SvgIcon icon={TrendingUp} size={13} />{marketPrice(key)} монет</div><div className="button-row">{key === "honey_cake" && <Button variant="soft" disabled={busy || state.energy >= state.maxEnergy} onClick={() => void act({ type: "use-item", item: key })}><SvgIcon icon={Zap} size={14} />+12</Button>}<Button variant="secondary" disabled={busy} onClick={() => setSelling(key)}>Продать</Button></div></article>)}</div>}{selling && <SellModal itemKey={selling} payload={payload} busy={busy} act={act} onClose={() => setSelling(null)} />}</div>;
}

export function MarketModule({ payload, busy, act }: Props) {
  const { state, market, user } = payload;
  const [tab, setTab] = useState<"buy" | "sell" | "mine">("buy");
  const ownedItems = Object.keys(state.inventory).filter((key) => state.inventory[key] > 0 && ITEMS[key]);
  const [item, setItem] = useState(ownedItems[0] ?? "carrot");
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(10);
  const myListings = market.filter((listing) => listing.sellerId === user.id);
  const featured = ["carrot", "milk", "trout", "iron"];
  return <div className="module-stack"><div className="market-ticker">{featured.map((key) => { const price = marketPrice(key); const up = price >= ITEMS[key].basePrice; return <div key={key}><span>{ITEMS[key].name}</span><strong>{price}</strong>{up ? <SvgIcon icon={TrendingUp} size={14} /> : <SvgIcon icon={TrendingDown} size={14} />}</div>; })}</div><div className="tip-banner"><SvgIcon icon={Info} size={18} /><p>Курс скупки меняется каждый час. Сделки между игроками реальны; рынок удерживает 5% с продавца.</p></div><div className="segmented"><button className={tab === "buy" ? "active" : ""} onClick={() => setTab("buy")}>Лоты игроков</button><button className={tab === "sell" ? "active" : ""} onClick={() => setTab("sell")}>Выставить</button><button className={tab === "mine" ? "active" : ""} onClick={() => setTab("mine")}>Мои лоты <span>{myListings.length}</span></button></div>
    {tab === "buy" && <div className="listing-list">{market.length === 0 ? <EmptyState icon={<SvgIcon icon={Store} size={34} />} title="Лотов пока нет" text="Станьте первым продавцом: выставьте товар во вкладке «Выставить»." /> : market.map((listing) => <article className="market-listing" key={listing.id}><ItemIcon itemKey={listing.itemKey} size={27} /><div className="listing-copy"><strong>{ITEMS[listing.itemKey]?.name ?? listing.itemKey} ×{listing.quantity}</strong><span>{listing.sellerName}</span><small>{listing.unitPrice} за шт. · всего {listing.unitPrice * listing.quantity}</small></div>{listing.sellerId === user.id ? <Button variant="soft" onClick={() => setTab("mine")}>Ваш лот</Button> : <Button disabled={busy || state.coins < listing.unitPrice * listing.quantity} onClick={() => void act({ type: "market-buy", id: listing.id })}><SvgIcon icon={ShoppingCart} size={15} />Купить</Button>}</article>)}</div>}
    {tab === "sell" && <section className="panel"><CardTitle icon={<SvgIcon icon={Tag} size={20} />} title="Новый лот" subtitle="Товар резервируется до продажи или отмены" />{ownedItems.length === 0 ? <p className="muted">В амбаре нет товара для лота.</p> : <div className="form-stack"><label><span>Предмет</span><select value={item} onChange={(event) => { setItem(event.target.value); setQuantity(1); setUnitPrice(marketPrice(event.target.value)); }}>{ownedItems.map((key) => <option value={key} key={key}>{ITEMS[key].name} · {state.inventory[key]} шт.</option>)}</select></label><div className="form-grid two"><label><span>Количество</span><input type="number" min={1} max={state.inventory[item] ?? 1} value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value)))} /></label><label><span>Цена за штуку</span><input type="number" min={1} max={100000} value={unitPrice} onChange={(event) => setUnitPrice(Math.max(1, Number(event.target.value)))} /></label></div><div className="price-callout"><span>Скупка НПС: {marketPrice(item)} / шт.</span><strong>Итого: {quantity * unitPrice} монет</strong></div><Button disabled={busy || !state.inventory[item] || quantity > state.inventory[item]} onClick={() => void act({ type: "market-list", item, quantity, unitPrice })}><SvgIcon icon={Store} size={17} />Выставить на рынок</Button></div>}</section>}
    {tab === "mine" && <div className="listing-list">{myListings.length === 0 ? <EmptyState icon={<SvgIcon icon={Tag} size={34} />} title="Нет активных лотов" text="Выставленные товары и кнопка их отмены появятся здесь." /> : myListings.map((listing) => <article className="market-listing" key={listing.id}><ItemIcon itemKey={listing.itemKey} /><div className="listing-copy"><strong>{ITEMS[listing.itemKey].name} ×{listing.quantity}</strong><span>{listing.unitPrice} монет / шт.</span></div><Button variant="danger" disabled={busy} onClick={() => void act({ type: "market-cancel", id: listing.id })}>Снять</Button></article>)}</div>}
  </div>;
}

export function ShopModule({ payload, now, busy, act }: Props) {
  const { state } = payload;
  const [category, setCategory] = useState<"seeds" | "farm" | "tools" | "gems">("seeds");
  const [selected, setSelected] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const gems = category === "gems";
  const gemKeys = Object.values(ITEMS).filter((item) => (item.gemPrice ?? 0) > 0).map((item) => item.key);
  const keys = gems ? gemKeys : SHOP_KEYS.filter((key) => category === "seeds" ? key.endsWith("_seed") : category === "farm" ? key === "feed" || key === "compound_feed" || key.endsWith("_fry") : key === "pickaxe" || key === "honey_cake");
  const unit = (key: string) => (gems ? ITEMS[key].gemPrice ?? 0 : shopPrice(key, now));
  const funds = gems ? state.gems : state.coins;
  return <div className="module-stack"><div className="scene-banner shop-scene"><SvgIcon icon={ShoppingBag} size={28} /><div><strong>Лавка миссис Флоры</strong><p>Семена, мальки и инструменты. В алмазной витрине — редкие семена и мальки, которых нет за монеты.</p></div></div>
    <div className="segmented"><button className={category === "seeds" ? "active" : ""} onClick={() => setCategory("seeds")}>Семена</button><button className={category === "farm" ? "active" : ""} onClick={() => setCategory("farm")}>Ферма</button><button className={category === "tools" ? "active" : ""} onClick={() => setCategory("tools")}>Инструменты</button><button className={category === "gems" ? "active" : ""} onClick={() => setCategory("gems")}><SvgIcon icon={Gem} size={15} /> Алмазная</button></div>
    {gems && <div className="tip-banner"><SvgIcon icon={Gem} size={18} /><p>Алмазные семена и мальки дают самый богатый урожай. Редких животных можно купить навсегда в разделе «Загоны». Ваши алмазы: <strong>{state.gems}</strong></p></div>}
    <div className="shop-grid">{keys.map((key) => <article className={`shop-card ${gems ? "gem-card" : ""}`} key={key}><div className="shop-card-top"><ItemIcon itemKey={key} size={30} /><span>В амбаре: {state.inventory[key] ?? 0}</span></div><h3>{ITEMS[key].shortName ?? ITEMS[key].name}</h3><p>{ITEMS[key].description}</p><Button variant="secondary" disabled={busy || funds < unit(key)} onClick={() => { setSelected(key); setQuantity(1); }}><SvgIcon icon={gems ? Gem : Coins} size={15} />{unit(key)}</Button></article>)}</div>
    {gems && keys.length === 0 && <EmptyState icon={<SvgIcon icon={Gem} size={34} />} title="Пока пусто" text="Алмазные товары ещё не добавлены." />}
    {selected && <Modal title={ITEMS[selected].name} onClose={() => setSelected(null)}><div className="sell-modal-product"><ItemIcon itemKey={selected} size={34} /><div><strong>{ITEMS[selected].name}</strong><span>{ITEMS[selected].description}</span></div></div><Stepper value={quantity} onChange={setQuantity} max={99} /><div className="total-line"><span>К оплате</span><strong>{unit(selected) * quantity} {gems ? "алмазов" : "монет"}</strong></div><Button className="btn-large" disabled={busy || funds < unit(selected) * quantity} onClick={async () => { if (await act({ type: gems ? "shop-buy-gems" : "shop-buy", item: selected, quantity })) setSelected(null); }}><SvgIcon icon={ShoppingCart} size={18} />Купить ×{quantity}</Button></Modal>}</div>;
}

function getUpgradeMeta() {
  const order = ["barn", "garden", "pond", "pen", "cage", "cellar", "energy"];
  return order.filter((kind) => UPGRADES[kind]).map((kind) => ({
    kind,
    name: UPGRADES[kind].name,
    description: kind === "barn" ? `+${GLOBALS.barnPerLevel} мест к вместимости` : kind === "energy" ? `+${GLOBALS.energyUpgradeBonus} к максимальной энергии` : UPGRADES[kind].description,
    max: UPGRADES[kind].max,
  }));
}

export function CityModule({ payload, busy, act }: Props) {
  const { state } = payload;
  const [tab, setTab] = useState<"orders" | "upgrades">("orders");
  const currentFor = (kind: string) => kind === "barn" ? state.barnLevel : kind === "garden" ? state.plots.length : kind === "pond" ? state.ponds.length : kind === "pen" ? state.pens.length : kind === "cage" ? state.cages.length : kind === "cellar" ? state.cellar.level : state.energyLevel;
  return <div className="module-stack"><div className="city-scene"><SvgIcon icon={Building2} size={40} /><span className="eyebrow light">Город Тихий Брод</span><h2>Ратуша и ярмарка</h2><p>Ежедневные заказы обновляются по UTC. Награда выше рыночной скупки.</p></div><div className="segmented"><button className={tab === "orders" ? "active" : ""} onClick={() => setTab("orders")}>Заказы <span>{state.orders.completed.length}/3</span></button><button className={tab === "upgrades" ? "active" : ""} onClick={() => setTab("upgrades")}>Строительство</button></div>{tab === "orders" ? <div className="order-list">{state.orders.items.map((order, index) => {
    const done = state.orders.completed.includes(order.id);
    const owned = state.inventory[order.itemKey] ?? 0;
    return <article className={`order-card ${done ? "completed" : ""}`} key={order.id}><div className="order-number">{done ? <SvgIcon icon={Check} size={19} /> : index + 1}</div><ItemIcon itemKey={order.itemKey} size={28} /><div className="order-copy"><strong>{ITEMS[order.itemKey]?.name ?? order.itemKey}</strong><span>Принести: {owned}/{order.quantity}</span><div className="mini-progress"><i style={{ width: `${Math.min(100, owned / order.quantity * 100)}%` }} /></div><small><SvgIcon icon={Coins} size={13} />+{order.rewardCoins} · +{order.rewardXp} XP</small></div><Button disabled={busy || done || owned < order.quantity} onClick={() => void act({ type: "order-fulfill", id: order.id })}>{done ? "Готово" : "Отправить"}</Button></article>;
  })}</div> : <div className="upgrade-list">{getUpgradeMeta().map((upgrade) => { const current = currentFor(upgrade.kind); const cost = upgradeCost(upgrade.kind, current); const maxed = current >= upgrade.max; return <article className="upgrade-row" key={upgrade.kind}><span className="upgrade-icon"><SvgIcon icon={Hammer} size={21} /></span><div><strong>{upgrade.name}</strong><p>{upgrade.description}</p><small>Сейчас: {current}{upgrade.kind === "barn" || upgrade.kind === "cellar" || upgrade.kind === "energy" ? " ур." : " шт."}</small></div><Button variant="secondary" disabled={busy || maxed || state.coins < cost} onClick={() => void act({ type: "upgrade", kind: upgrade.kind })}>{maxed ? "Максимум" : <><SvgIcon icon={Coins} size={14} />{cost}</>}</Button></article>; })}</div>}</div>;
}

export function NewsModule({ payload, busy, act }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const entries = [...payload.news.map((entry) => ({ id: `n${entry.id}`, tag: entry.tag, title: entry.title, body: entry.body })), ...NEWS];
  return <div className="module-stack"><div className="scene-banner news-scene"><SvgIcon icon={Newspaper} size={27} /><div><strong>Вести долины</strong><p>Гиды и объявления от редакции. Непрочитанные материалы отмечены точкой.</p></div></div><div className="news-list">{entries.map((news) => { const unread = !payload.state.readNews.includes(news.id); const expanded = open === news.id; return <article className={`news-card ${unread ? "unread" : ""}`} key={news.id}><button onClick={() => { setOpen(expanded ? null : news.id); if (unread) void act({ type: "news-read", id: news.id }); }}><div className="news-meta"><span>{news.tag}</span>{unread && <i>Новое</i>}</div><h3>{news.title}</h3><p>{expanded ? news.body : `${news.body.slice(0, 105)}…`}</p><strong className="read-more">{expanded ? "Свернуть" : "Читать"}</strong></button></article>; })}</div></div>;
}

export function PromosModule({ payload, now, busy, act }: Props) {
  const { state } = payload;
  const [code, setCode] = useState("");
  const dailyClaimed = state.claimedPromos.includes(`daily:${dayKey()}`);
  return <div className="module-stack"><div className="promo-hero"><SvgIcon icon={BadgePercent} size={35} /><span className="eyebrow light">Особые предложения</span><h2>Акции и покупки</h2><p>Только внутриигровые алмазы. Никаких реальных платежей и банковских данных.</p></div><BonusList bonuses={payload.bonuses ?? []} now={now} /><section className="daily-gift"><span className="gift-box"><SvgIcon icon={Gift} size={30} /></span><div><h3>Подарок дня</h3><p>40 монет, 2 комбикорма и 8 энергии. Обновляется каждый день.</p></div><Button disabled={busy || dailyClaimed} onClick={() => void act({ type: "promo-claim" })}>{dailyClaimed ? <><SvgIcon icon={Check} size={16} />Получен</> : "Забрать"}</Button></section><section className="panel"><CardTitle icon={<SvgIcon icon={Tag} size={20} />} title="Промокод" subtitle="Код можно получить от администрации" /><form className="inline-form" onSubmit={async (event) => { event.preventDefault(); if (await act({ type: "promo-redeem", code })) setCode(""); }}><div className="input-wrap"><input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="Введите код" maxLength={32} /></div><Button type="submit" disabled={busy || !code.trim()}>Активировать</Button></form></section><div className="promo-list">{PROMOTIONS.map((promo) => { const bought = state.claimedPromos.includes(`${dayKey()}:${promo.id}`); return <article className="promo-card" key={promo.id}><div className="promo-ribbon">Набор дня</div><div className="promo-items">{Object.keys(promo.items).slice(0, 3).map((key) => <ItemIcon itemKey={key} size={25} key={key} />)}</div><h3>{promo.name}</h3><p>{promo.description}</p><Button variant="dark" disabled={busy || bought || state.gems < promo.gems} onClick={() => void act({ type: "promo-buy", id: promo.id })}>{bought ? <><SvgIcon icon={Check} size={16} />Куплен сегодня</> : <><SvgIcon icon={Gem} size={16} />{promo.gems} алмаза</>}</Button></article>; })}</div><div className="tip-banner"><SvgIcon icon={Megaphone} size={18} /><p>Алмазы можно бесплатно добыть в Алмазной шахте, получить за уровни и достижения.</p></div></div>;
}
