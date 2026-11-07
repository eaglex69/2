"use client";

import { useState } from "react";
import {
  ArrowDownToLine,
  Award,
  Briefcase,
  Check,
  Clock3,
  Coins,
  Diamond,
  Droplets,
  Fish,
  Gem,
  Info,
  Lock,
  Mountain,
  PackageOpen,
  Pickaxe,
  Play,
  Plus,
  Sparkles,
  Sprout,
  Star,
  Timer,
  Waves,
  Zap,
} from "lucide-react";
import {
  ANIMALS,
  BLESSINGS,
  CAGE_SPECIES,
  CROPS,
  FISHING_COOLDOWN_MS,
  ITEMS,
  JOBS,
  MINES,
  POND_SPECIES,
  RECIPES,
  type CropKey,
} from "@/lib/game-config";
import { fishingCursor } from "@/lib/game-config";
import type { Act, GamePayload } from "./game-types";
import { Button, CardTitle, EmptyState, ItemIcon, LevelLock, Modal, ProgressTimer, formatDuration } from "./game-ui";
import { FarmArt } from "./FarmArt";
import { SvgIcon } from "./svg-icons";

type Props = { payload: GamePayload; now: number; busy: boolean; act: Act };

export function GardenModule({ payload, now, busy, act }: Props) {
  const { state } = payload;
  const [selected, setSelected] = useState<number | null>(null);
  const ready = state.plots.filter((plot) => plot.crop && plot.readyAt <= now).length;
  return <div className="module-stack">
    <div className="scene-banner garden-scene"><SvgIcon icon={Sprout} size={28} /><div><strong>Огород долины</strong><p>{Object.keys(CROPS).length} культур: от быстрой моркови до тыквы. Полив ускоряет рост на четверть.</p></div></div>
    <div className="tip-banner"><SvgIcon icon={Droplets} size={19} /><p><strong>Полив ускоряет рост на 25%.</strong> Каждую грядку можно полить один раз за цикл.</p>{ready > 0 && <span className="count-badge">{ready}</span>}</div>
    <div className="plot-grid">
      {state.plots.map((plot, index) => <article className={`plot-card ${plot.crop ? "growing" : "empty"} ${plot.crop && plot.readyAt <= now ? "is-ready" : ""}`} key={index}>
        <div className="plot-number">{index + 1}</div>
        {!plot.crop ? <button className="empty-plot" onClick={() => setSelected(index)}><span><SvgIcon icon={Plus} size={24} /></span><strong>Посадить</strong><small>Свободная грядка</small></button> : <>
          <div className="crop-visual"><ItemIcon itemKey={plot.crop} size={29} /><div><h3>{CROPS[plot.crop].name}</h3><p>{plot.watered ? "Полита" : "Нужен полив"}</p></div></div>
          <ProgressTimer startedAt={plot.plantedAt} readyAt={plot.readyAt} now={now} />
          <div className="button-row">
            {!plot.watered && plot.readyAt > now && <Button variant="soft" onClick={() => void act({ type: "water", index })} disabled={busy}><SvgIcon icon={Droplets} size={16} />Полить</Button>}
            <Button onClick={() => void act({ type: "harvest", index })} disabled={busy || plot.readyAt > now}><SvgIcon icon={ArrowDownToLine} size={16} />Собрать</Button>
          </div>
        </>}
      </article>)}
    </div>
    {selected !== null && <Modal title={`Грядка ${selected + 1}: выбор культуры`} onClose={() => setSelected(null)}>
      <div className="selection-list">{(Object.entries(CROPS) as [CropKey, (typeof CROPS)[CropKey]][]).map(([key, crop]) => {
        const seeds = state.inventory[crop.seed] ?? 0;
        return <div className="selection-row" key={key}><ItemIcon itemKey={key} size={26} /><div className="selection-copy"><strong>{crop.name}</strong><span>{crop.duration / 1000} сек · урожай ×{crop.yield} · {crop.xp} опыта</span><small>Семян в амбаре: {seeds}</small></div><LevelLock level={crop.level} current={state.level} /><Button disabled={busy || seeds < 1 || state.level < crop.level} onClick={async () => { if (await act({ type: "plant", index: selected, crop: key })) setSelected(null); }}>Посадить</Button></div>;
      })}</div>
      {Object.values(CROPS).every((crop) => !(state.inventory[crop.seed] > 0)) && <p className="form-hint">Семена закончились — загляните в Магазин.</p>}
    </Modal>}
  </div>;
}

type WaterConfig = { name: string; fry: string; duration: number; yield: number; xp: number; level: number };

function WaterModule({ payload, now, busy, act, kind }: Props & { kind: "pond" | "cage" }) {
  const { state } = payload;
  const [selected, setSelected] = useState<number | null>(null);
  const isPond = kind === "pond";
  const slots = isPond ? state.ponds : state.cages;
  const configs = (isPond ? POND_SPECIES : CAGE_SPECIES) as Record<string, WaterConfig>;
  const prefix = isPond ? "pond" : "cage";
  return <div className="module-stack">
    <div className="scene-banner water-scene"><SvgIcon icon={Waves} size={28} /><div><strong>{isPond ? "Тихие пруды" : "Рыбоводные садки"}</strong><p>{isPond ? "Корм ускоряет рост и даёт шанс на дополнительную рыбу." : "Здесь растут крупные породы. Используйте специальный рыбный корм."}</p></div></div>
    <div className="water-grid">{slots.map((slot, index) => <article className="water-card" key={index}>
      <div className="water-ripples"><SvgIcon icon={Fish} size={30} /><span>{isPond ? `Пруд ${index + 1}` : `Садок ${index + 1}`}</span></div>
      {!slot.species ? <><p className="muted">Водоём готов принять мальков</p><Button variant="secondary" onClick={() => setSelected(index)}><SvgIcon icon={Plus} size={16} />Запустить мальков</Button></> : <>
        <div className="crop-visual"><ItemIcon itemKey={slot.species} size={26} /><div><h3>{configs[slot.species]?.name ?? slot.species}</h3><p>{slot.fed ? "Дополнительно накормлена" : "Растёт"}</p></div></div>
        <ProgressTimer startedAt={slot.startedAt} readyAt={slot.readyAt} now={now} />
        <div className="button-row">{!slot.fed && slot.readyAt > now && <Button variant="soft" disabled={busy || !(state.inventory[isPond ? "feed" : "compound_feed"] > 0)} onClick={() => void act({ type: `${prefix}-feed`, index })}><SvgIcon icon={Droplets} size={16} />Корм ×1</Button>}<Button disabled={busy || slot.readyAt > now} onClick={() => void act({ type: `${prefix}-collect`, index })}><SvgIcon icon={Fish} size={16} />Собрать</Button></div>
      </>}
    </article>)}</div>
    {selected !== null && <Modal title={isPond ? "Выбор породы для пруда" : "Выбор породы для садка"} onClose={() => setSelected(null)}><div className="selection-list">{Object.entries(configs).map(([key, config]) => <div className="selection-row" key={key}><ItemIcon itemKey={key} size={26} /><div className="selection-copy"><strong>{config.name}</strong><span>{Math.round(config.duration / 1000)} сек · улов ×{config.yield}</span><small>{ITEMS[config.fry].name}: {state.inventory[config.fry] ?? 0}</small></div><LevelLock level={config.level} current={state.level} /><Button disabled={busy || !(state.inventory[config.fry] > 0) || state.level < config.level} onClick={async () => { if (await act({ type: `${prefix}-start`, index: selected, species: key })) setSelected(null); }}>Запустить</Button></div>)}</div></Modal>}
  </div>;
}

export function PondsModule(props: Props) { return <WaterModule {...props} kind="pond" />; }
export function CagesModule(props: Props) { return <WaterModule {...props} kind="cage" />; }

type AnimalConfig = { name: string; product: string; feed: number; duration: number; yield: number; xp: number; level: number; gems?: number };

export function PensModule({ payload, now, busy, act }: Props) {
  const { state } = payload;
  const [selected, setSelected] = useState<number | null>(null);
  return <div className="module-stack">
    <div className="scene-banner pen-scene"><SvgIcon icon={Sprout} size={28} /><div><strong>Загоны и пасека</strong><p>Куры, утки, козы, овцы, пчёлы, альпаки и страусы — а ещё редкие животные, которых можно купить навсегда за алмазы.</p></div></div>
    <div className="tip-banner"><SvgIcon icon={Info} size={19} /><p>Для запуска цикла нужен комбикорм. Вид животных можно менять после каждого сбора.</p><span className="resource-pill"><SvgIcon icon={PackageOpen} size={14} />{state.inventory.feed ?? 0}</span></div>
    <div className="pen-list">{state.pens.map((pen, index) => <article className="pen-card" key={index}><div className="pen-fence"><span>Загон {index + 1}</span><i /><i /><i /></div>{!pen.animal ? <div className="pen-empty"><SvgIcon icon={Sprout} size={25} /><div><strong>Загон свободен</strong><p>Выберите животных и дайте корм</p></div><Button variant="secondary" onClick={() => setSelected(index)}>Заселить</Button></div> : <>
      <div className="crop-visual"><ItemIcon itemKey={ANIMALS[pen.animal as keyof typeof ANIMALS].product} size={28} /><div><h3>{ANIMALS[pen.animal as keyof typeof ANIMALS].name}</h3><p>Производят: {ITEMS[ANIMALS[pen.animal as keyof typeof ANIMALS].product].name}</p></div></div>
      <ProgressTimer startedAt={pen.startedAt} readyAt={pen.readyAt} now={now} /><Button disabled={busy || pen.readyAt > now} onClick={() => void act({ type: "pen-collect", index })}><SvgIcon icon={PackageOpen} size={16} />Собрать продукт</Button>
    </>}</article>)}</div>
    {selected !== null && <Modal title={`Загон ${selected + 1}: кого поселить?`} onClose={() => setSelected(null)}><div className="selection-list">{Object.entries(ANIMALS as Record<string, AnimalConfig>).map(([key, animal]) => <div className="selection-row" key={key}><ItemIcon itemKey={animal.product} size={26} /><div className="selection-copy"><strong>{animal.name}</strong><span>{Math.round(animal.duration / 1000)} сек · {ITEMS[animal.product].name} ×{animal.yield}</span><small>Нужно корма: {animal.feed}{animal.gems ? " · редкое животное" : ""}</small></div><LevelLock level={animal.level} current={state.level} />{animal.gems && !state.claimedPromos.includes(`animal:${key}`) ? <Button variant="secondary" disabled={busy || state.gems < animal.gems} onClick={() => void act({ type: "animal-buy", animal: key })}><Gem size={15} />{animal.gems}</Button> : <Button disabled={busy || (state.inventory.feed ?? 0) < animal.feed || state.level < animal.level} onClick={async () => { if (await act({ type: "pen-start", index: selected, animal: key })) setSelected(null); }}>Выбрать</Button>}</div>)}</div></Modal>}
  </div>;
}

export function CellarModule({ payload, now, busy, act }: Props) {
  const { state } = payload;
  const capacity = state.cellar.level + 1;
  return <div className="module-stack">
    <div className="scene-banner cellar-scene"><SvgIcon icon={PackageOpen} size={27} /><div><strong>Погреб · {state.cellar.level} уровень</strong><p>Одновременно доступно полок: {capacity}. Город особенно ценит готовые продукты.</p></div></div>
    <section className="panel"><CardTitle title="На полках" subtitle={`${state.cellar.jobs.length} из ${capacity} занято`} />{state.cellar.jobs.length === 0 ? <p className="muted padded">Пока пусто. Выберите рецепт ниже.</p> : <div className="job-list">{state.cellar.jobs.map((job) => <div className="production-job" key={job.id}><ItemIcon itemKey={RECIPES[job.recipe].output} /><div className="grow"><strong>{RECIPES[job.recipe].name}</strong><ProgressTimer startedAt={job.readyAt - RECIPES[job.recipe].duration} readyAt={job.readyAt} now={now} /></div><Button disabled={busy || job.readyAt > now} onClick={() => void act({ type: "cellar-collect", id: job.id })}>Забрать</Button></div>)}</div>}</section>
    <section className="panel"><CardTitle title="Рецепты" subtitle="Ингредиенты списываются при запуске" /><div className="recipe-list">{Object.entries(RECIPES).map(([key, recipe]) => {
      const canAfford = Object.entries(recipe.inputs).every(([item, amount]) => (state.inventory[item] ?? 0) >= amount);
      return <article className="recipe-row" key={key}><div className="recipe-head"><ItemIcon itemKey={recipe.output} size={26} /><div><strong>{recipe.name}</strong><span>{recipe.duration / 1000} сек · +{recipe.xp} опыта</span></div><LevelLock level={recipe.level} current={state.level} /></div><div className="recipe-bottom"><div className="ingredient-list">{Object.entries(recipe.inputs).map(([item, amount]) => <span className={(state.inventory[item] ?? 0) < amount ? "missing" : ""} key={item}>{ITEMS[item].name} {state.inventory[item] ?? 0}/{amount}</span>)}</div><Button disabled={busy || !canAfford || state.level < recipe.level || state.cellar.jobs.length >= capacity} onClick={() => void act({ type: "cellar-start", recipe: key })}><SvgIcon icon={Play} size={15} />Готовить</Button></div></article>;
    })}</div></section>
  </div>;
}

export function MinesModule({ payload, busy, act }: Props) {
  const { state } = payload;
  return <div className="module-stack"><div className="scene-banner mine-scene"><SvgIcon icon={Mountain} size={29} /><div><strong>Горные шахты</strong><p>Каждый пятый спуск открывает богатую жилу с двойной добычей. Результат каждого удара случаен.</p></div></div><div className="mine-list">{Object.entries(MINES).map(([key, mine]) => {
    const depth = state.mines[key]?.depth ?? 0;
    return <article className={`mine-card mine-${key}`} key={key}><div className="mine-head"><span className="mine-icon"><SvgIcon icon={Pickaxe} size={24} /></span><div><h3>{mine.name}</h3><p>Глубина: {depth} м</p></div><LevelLock level={mine.level} current={state.level} /></div><div className="loot-row">{mine.loot.map(([item, weight]) => <span key={item}><ItemIcon itemKey={item} size={16} />{ITEMS[item].name} {weight}%</span>)}</div><div className="vein-progress"><span>До богатой жилы</span><div>{Array.from({ length: 5 }, (_, index) => <i className={index < depth % 5 ? "filled" : ""} key={index} />)}</div><strong>{5 - depth % 5}</strong></div><Button variant="dark" disabled={busy || state.level < mine.level || state.energy < mine.energy} onClick={() => void act({ type: "mine", mine: key })}><SvgIcon icon={Pickaxe} size={17} />Копать · <SvgIcon icon={Zap} size={14} />{mine.energy}</Button></article>;
  })}</div></div>;
}

export function DiamondModule({ payload, busy, act }: Props) {
  const { state } = payload;
  const locked = state.level < 3;
  return <div className="module-stack"><div className="diamond-hero"><span className="diamond-glow"><SvgIcon icon={Diamond} size={45} /></span><span className="eyebrow light">Редкие жилы</span><h2>Алмазная шахта</h2><p>Острия кирок звенят в кромешной темноте. Здесь находят валюту для наборов и ритуалов.</p><div className="depth-seal">Глубина {state.diamond.depth} м</div></div>{locked ? <div className="locked-panel"><SvgIcon icon={Lock} size={25} /><h3>Доступ с 3 уровня</h3><p>Собирайте урожай, выполняйте заказы и работайте в городе, чтобы получить опыт.</p></div> : <>
    <div className="stat-grid three"><div><strong>34%</strong><span>шанс алмаза</span></div><div><strong>8%</strong><span>шанс друзы ×2</span></div><div><strong>{state.inventory.pickaxe ?? 0}</strong><span>кирок в амбаре</span></div></div>
    <div className="panel action-panel"><SvgIcon icon={Pickaxe} size={29} /><h3>Один спуск — один заряд кирки</h3><p>Даже пустая порода даёт 2 камня. Каждый спуск приносит 18 опыта.</p><div className="cost-line"><span><SvgIcon icon={Zap} size={16} />10 энергии</span><span><SvgIcon icon={Pickaxe} size={16} />1 кирка</span></div><Button variant="dark" className="btn-large" disabled={busy || state.energy < 10 || !(state.inventory.pickaxe > 0)} onClick={() => void act({ type: "diamond-mine" })}><SvgIcon icon={Diamond} size={18} />Спуститься за алмазами</Button></div>
  </>}</div>;
}

export function FishingModule({ payload, now, busy, act }: Props) {
  const fishing = payload.state.fishing;
  const active = fishing && fishing.expiresAt > now;
  const cursor = fishing ? fishingCursor(fishing.startedAt, fishing.period, now) : 0;
  const wait = Math.max(0, payload.state.lastCastAt + FISHING_COOLDOWN_MS - now);
  const seconds = Math.ceil(wait / 1000);
  const countdown = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  return <div className="module-stack"><div className="fishing-scene"><div className="lake-moon" /><div className="fishing-copy"><span className="eyebrow light">Северное озеро</span><h2>Трофейная рыбалка</h2><p>Заброс стоит 3 энергии. Зона подсечки стала шире, а бегунок — медленнее. Вид рыбы зависит от уровня, а редкий золотой улов — от удачи.</p></div><SvgIcon icon={Fish} size={48} /></div>
    <section className="panel fishing-panel">{!active ? <><div className="fishing-rest"><FarmArt name="rod" size={96} /><div><span className="eyebrow">{wait > 0 ? "Рыба вернулась в озеро" : "Удочка готова"}</span><h3>{wait > 0 ? "Озеру нужно отдохнуть" : fishing ? "Попробуем ещё раз?" : "Озеро ждёт"}</h3><p>Между забросами — 2 минуты 30 секунд. Во время ожидания можно заниматься фермой. На подсечку даётся 12 секунд.</p></div></div>{wait > 0 && <div className="fishing-countdown" role="timer" aria-label={`До следующего заброса ${formatDuration(wait)}`}><SvgIcon icon={Timer} size={22} /><strong>{countdown}</strong><span>до следующего заброса</span><div className="progress-track"><span style={{ width: `${(1 - wait / FISHING_COOLDOWN_MS) * 100}%` }} /></div></div>}<Button className="btn-large" disabled={busy || wait > 0 || payload.state.energy < 3} onClick={() => void act({ type: "fish-start" })}><SvgIcon icon={Fish} size={18} />{wait > 0 ? `Заброс через ${countdown}` : "Забросить удочку · 3 энергии"}</Button></> : <>
      <div className="bite-label"><span className="pulse-dot" />Клюёт — следите за поплавком</div><div className="fishing-track"><span className="catch-zone" style={{ left: `${(fishing.target - fishing.width / 2) * 100}%`, width: `${fishing.width * 100}%` }} /><span className="fishing-cursor" style={{ left: `${cursor * 100}%` }} /></div><div className="fishing-labels"><span>Рано</span><strong>Точность решает размер улова</strong><span>Поздно</span></div><ProgressTimer startedAt={fishing.startedAt} readyAt={fishing.expiresAt} now={now} label="Время на подсечку" /><Button className="btn-large catch-button" disabled={busy} onClick={() => void act({ type: "fish-catch", at: now })}><SvgIcon icon={ArrowDownToLine} size={20} />Подсечь!</Button><p className="form-hint center">Попадание почти в центр зоны приносит двойной улов.</p>
    </>}</section>
    <div className="tip-banner"><SvgIcon icon={Star} size={18} /><p>С 2 уровня встречается форель и золотая рыбка, с 4 — щука. Весь улов отправляется в амбар.</p></div>
  </div>;
}

export function JobsModule({ payload, now, busy, act }: Props) {
  const { state } = payload;
  return <div className="module-stack"><div className="scene-banner job-scene"><SvgIcon icon={Briefcase} size={27} /><div><strong>Доска работы</strong><p>Смена идёт в реальном времени. Во время работы можно заниматься другими делами.</p></div></div>{state.job && <section className="panel active-shift"><CardTitle icon={<SvgIcon icon={Timer} size={21} />} title={JOBS[state.job.key as keyof typeof JOBS]?.name ?? "Текущая смена"} subtitle="Работа уже оплачивается" /><ProgressTimer startedAt={state.job.startedAt} readyAt={state.job.readyAt} now={now} /><Button disabled={busy || state.job.readyAt > now} onClick={() => void act({ type: "job-finish" })}><SvgIcon icon={Coins} size={17} />{state.job.readyAt <= now ? "Получить оплату" : "Смена продолжается"}</Button></section>}<div className="job-cards">{Object.entries(JOBS).map(([key, job]) => <article className="job-card" key={key}><div className="job-icon"><SvgIcon icon={Briefcase} size={22} /></div><div className="job-copy"><h3>{job.name}</h3><p>{job.description}</p><div className="reward-line"><span><SvgIcon icon={Clock3} size={14} />{job.duration / 1000} сек</span><span><SvgIcon icon={Zap} size={14} />{job.energy}</span><span><SvgIcon icon={Coins} size={14} />+{job.coins}</span><span>+{job.xp} XP</span></div></div><LevelLock level={job.level} current={state.level} /><Button variant="secondary" disabled={busy || !!state.job || state.energy < job.energy || state.level < job.level} onClick={() => void act({ type: "job-start", job: key })}>Начать</Button></article>)}</div></div>;
}

export function ElysiumModule({ payload, now, busy, act }: Props) {
  const { state } = payload;
  if (state.level < 3) return <div className="elysium-locked"><SvgIcon icon={Sparkles} size={45} /><span className="eyebrow light">Парящие сады</span><h2>Элизиум откроется на 3 уровне</h2><p>Здесь фермеры превращают алмазы в благословения и собирают эфир для постоянного развития.</p><div className="level-requirement">Сейчас: {state.level} уровень</div></div>;
  const cooldown = Math.max(0, state.elysium.lastRitual + 120_000 - now);
  return <div className="module-stack elysium-module"><div className="elysium-hero"><SvgIcon icon={Sparkles} size={35} /><span className="eyebrow light">Парящие сады</span><h2>Элизиум</h2><p>Выберите одно благословение на пять минут. Каждый ритуал также оставляет частицу эфира.</p><div className="aether-counter"><SvgIcon icon={Star} size={17} />Эфир: <strong>{state.elysium.aether}</strong></div></div>{state.elysium.blessing && state.elysium.until > now && <div className="active-blessing"><SvgIcon icon={Sparkles} size={19} /><div><strong>{BLESSINGS[state.elysium.blessing as keyof typeof BLESSINGS]?.name}</strong><span>Ещё {Math.ceil((state.elysium.until - now) / 1000)} сек</span></div></div>}<div className="blessing-list">{Object.entries(BLESSINGS).map(([key, blessing]) => <article className="blessing-card" key={key}><span><SvgIcon icon={Sparkles} size={22} /></span><h3>{blessing.name}</h3><p>{blessing.description}</p><Button variant="secondary" disabled={busy || cooldown > 0 || state.gems < 2} onClick={() => void act({ type: "elysium-ritual", blessing: key })}><SvgIcon icon={Gem} size={15} />2 алмаза</Button></article>)}</div>{cooldown > 0 && <p className="form-hint center">Следующий ритуал через {Math.ceil(cooldown / 1000)} сек</p>}<section className="panel ascend-panel"><SvgIcon icon={Award} size={28} /><div><h3>Вознесение</h3><p>Обменяйте 5 эфира на постоянные +4 к максимальной энергии. Прогресс не сбрасывается.</p></div><Button disabled={busy || state.elysium.aether < 5} onClick={() => void act({ type: "elysium-ascend" })}><SvgIcon icon={Star} size={16} />5 эфира</Button></section></div>;
}
