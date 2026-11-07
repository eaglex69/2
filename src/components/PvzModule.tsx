"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { PVZ } from "@/lib/game-config";
import { DEFENSE_BOARD as B, DEFENSE_ORDER, DEFENSE_PLANTS, cellX, cellY, collectDefenseSun, createDefenseGame, laneThreats, placeDefensePlant, stepDefenseGame, type DefensePlant, type DefenseView } from "@/lib/defense-engine";
import type { Act, GamePayload } from "./game-types";
import { Button } from "./game-ui";

type Props = { payload: GamePayload; now: number; busy: boolean; act: Act };
type Phase = "idle" | "playing" | "paused" | "over";
type Gesture = { mode: "none" | "tap" | "pan" | "pinch"; x: number; y: number; left: number; top: number; dist: number; zoom: number };
const spriteNames = [...DEFENSE_ORDER, "basic", "cone", "bucket", "football", "runner", "brute", "pea", "icepea", "cabbage", "sun", "mower", "shovel", "explosion", "pause", "play", "expand"];
const MOBILE_CELL = 96;
let spritePromise: Promise<Record<string, HTMLImageElement>> | null = null;
function loadSprites() {
 if (!spritePromise) spritePromise = Promise.all(spriteNames.map(name => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error(`Не удалось загрузить: ${name}`)); image.src = `/images/defense/${name}.png`;
 }))).then(images => Object.fromEntries(images.map((image, index) => [spriteNames[index], image]))).catch(error => { spritePromise = null; throw error; });
 return spritePromise;
}
function Picture({ name, className = "" }: { name: string; className?: string }) {
 // eslint-disable-next-line @next/next/no-img-element
 return <img className={`defense-picture ${className}`} src={`/images/defense/${name}.png`} alt="" draggable={false} />;
}
const emptyCool = () => Object.fromEntries(DEFENSE_ORDER.map(key => [key, 0])) as Record<DefensePlant, number>;

export function PvzModule({ payload, busy, act }: Props) {
 const { state } = payload;
 const canvasRef = useRef<HTMLCanvasElement>(null), viewportRef = useRef<HTMLDivElement>(null), minimapRef = useRef<HTMLCanvasElement>(null);
 const game = useRef(createDefenseGame());
 const actionRef = useRef(act);
 useEffect(() => { actionRef.current = act; }, [act]);
 const phaseRef = useRef<Phase>("idle");
 const zoomRef = useRef(1), baseRef = useRef(1);
 const pointers = useRef(new Map<number, { x: number; y: number }>());
 const gesture = useRef<Gesture>({ mode: "none", x: 0, y: 0, left: 0, top: 0, dist: 1, zoom: 1 });
 const hover = useRef({ x: 0, y: 0, active: false });
 const tap = useRef({ col: -1, row: -1, until: 0 });
 const keyboardCell = useRef({ col: 1, row: 2 });
 const selectedRef = useRef<DefensePlant | "shovel">("peashooter");
 const [ui, setUi] = useState({ sun: 200, wave: 0, cool: emptyCool(), zoom: 100, partial: false, threats: 0 });
 const [phase, setPhase] = useState<Phase>("idle");
 const [selected, setSelected] = useState<DefensePlant | "shovel">("peashooter");
 const [result, setResult] = useState<{ waves: number; win: boolean } | null>(null);
 const [notice, setNotice] = useState("");
 const [images, setImages] = useState<Record<string, HTMLImageElement> | null>(null);
 const [assetError, setAssetError] = useState("");
 const [assetRetry, setAssetRetry] = useState(0);
 const playing = phase === "playing" || phase === "paused";

 useEffect(() => { phaseRef.current = phase; }, [phase]);
 useEffect(() => { let alive = true; loadSprites().then(value => { if (alive) { setImages(value); setAssetError(""); } }).catch(error => { if (alive) setAssetError(error instanceof Error ? error.message : "Ошибка загрузки картинок"); }); return () => { alive = false; }; }, [assetRetry]);
 useEffect(() => { const hide = () => { if (document.hidden) setPhase(value => value === "playing" ? "paused" : value); }; document.addEventListener("visibilitychange", hide); return () => document.removeEventListener("visibilitychange", hide); }, []);
 useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(""), 2600); return () => window.clearTimeout(timer); }, [notice]);
 // Во время боя игра занимает весь экран: страница под ней не прокручивается.
 useEffect(() => { if (!playing) return; const old = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = old; }; }, [playing]);

 const maxZoom = useCallback(() => Math.max(2.5, 180 / (B.cell * baseRef.current)), []);
 // Размер канваса по CSS = поле × масштаб; внутреннее разрешение — под плотность экрана, чтобы картинки не размывались.
 const sizeCanvas = useCallback(() => {
  const cv = canvasRef.current; if (!cv) return;
  const scale = baseRef.current * zoomRef.current;
  cv.style.width = `${B.width * scale}px`; cv.style.height = `${B.height * scale}px`;
  const k = Math.min(3200 / B.width, scale * Math.min(2, window.devicePixelRatio || 1));
  const width = Math.round(B.width * k), height = Math.round(B.height * k);
  if (cv.width !== width || cv.height !== height) { cv.width = width; cv.height = height; }
 }, []);
 // Масштаб вокруг точки (палец, курсор или центр экрана): точка под ней остаётся на месте.
 const applyZoom = useCallback((target: number, ax?: number, ay?: number) => {
  const vp = viewportRef.current, cv = canvasRef.current; if (!vp || !cv) return;
  const z = Math.max(1, Math.min(maxZoom(), target));
  const old = baseRef.current * zoomRef.current, x = ax ?? vp.clientWidth / 2, y = ay ?? vp.clientHeight / 2;
  const px = (vp.scrollLeft + x - cv.offsetLeft) / old, py = (vp.scrollTop + y - cv.offsetTop) / old;
  zoomRef.current = z; sizeCanvas();
  const scale = baseRef.current * z;
  vp.scrollLeft = px * scale + cv.offsetLeft - x; vp.scrollTop = py * scale + cv.offsetTop - y;
 }, [maxZoom, sizeCanvas]);
 const measure = useCallback((initial: boolean) => {
  const vp = viewportRef.current, cv = canvasRef.current; if (!vp || !cv || !vp.clientWidth) return;
  const old = baseRef.current * zoomRef.current;
  const cx = (vp.scrollLeft + vp.clientWidth / 2 - cv.offsetLeft) / old, cy = (vp.scrollTop + vp.clientHeight / 2 - cv.offsetTop) / old;
  baseRef.current = Math.max(0.1, Math.min(vp.clientWidth / B.width, vp.clientHeight / B.height));
  if (initial) zoomRef.current = vp.clientWidth < 700 ? Math.max(1, Math.min(maxZoom(), MOBILE_CELL / (B.cell * baseRef.current))) : 1;
  else zoomRef.current = Math.min(zoomRef.current, maxZoom());
  sizeCanvas();
  const scale = baseRef.current * zoomRef.current;
  if (initial) { vp.scrollLeft = 0; vp.scrollTop = Math.max(0, cv.offsetTop + (B.height * scale - vp.clientHeight) / 2); }
  else { vp.scrollLeft = cx * scale + cv.offsetLeft - vp.clientWidth / 2; vp.scrollTop = cy * scale + cv.offsetTop - vp.clientHeight / 2; }
 }, [maxZoom, sizeCanvas]);
 const centerOn = useCallback((x: number, y: number) => {
  const vp = viewportRef.current, cv = canvasRef.current; if (!vp || !cv) return;
  const scale = baseRef.current * zoomRef.current;
  vp.scrollTo({ left: x * scale + cv.offsetLeft - vp.clientWidth / 2, top: y * scale + cv.offsetTop - vp.clientHeight / 2, behavior: "smooth" });
 }, []);

 const finish = useCallback((win: boolean) => {
  const g = game.current; g.phase = win ? "won" : "lost";
  const waves = win ? PVZ.waves : Math.max(0, Math.min(PVZ.waves, g.wave - 1));
  setPhase("over"); setResult({ waves, win });
  void actionRef.current({ type: "pvz-finish", waves, win });
 }, []);
 const start = async () => {
  if (!images || busy) return;
  if (await actionRef.current({ type: "pvz-start" })) {
   game.current = createDefenseGame(); tap.current.until = 0; pointers.current.clear();
   setUi({ sun: 200, wave: 0, cool: emptyCool(), zoom: 100, partial: false, threats: 0 }); setResult(null); setPhase("playing");
   setNotice("Посадите подсолнухи — они дают солнце");
  }
 };
 const select = (type: DefensePlant | "shovel") => { selectedRef.current = type; setSelected(type); setNotice(type === "shovel" ? "Лопата: нажмите на растение, чтобы убрать" : `${DEFENSE_PLANTS[type].name}: ${DEFENSE_PLANTS[type].hint.toLowerCase()}`); };

 // Размер поля подстраивается под экран и поворот телефона.
 useEffect(() => {
  if (!playing) return;
  const vp = viewportRef.current; if (!vp) return;
  measure(true);
  const observer = new ResizeObserver(() => measure(false)); observer.observe(vp);
  const wheel = (event: WheelEvent) => {
   event.preventDefault();
   if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) { vp.scrollLeft += event.deltaX; return; }
   const rect = vp.getBoundingClientRect();
   applyZoom(zoomRef.current * Math.exp(-event.deltaY * 0.0016), event.clientX - rect.left, event.clientY - rect.top);
  };
  vp.addEventListener("wheel", wheel, { passive: false });
  return () => { observer.disconnect(); vp.removeEventListener("wheel", wheel); };
 }, [playing, measure, applyZoom]);

 useEffect(() => {
  if (!playing || !images) return;
  const cv = canvasRef.current, ctx = cv?.getContext("2d"); if (!cv || !ctx) return;
  let frame = 0, last = -1, uiTime = 0, lastWave = game.current.wave;
  const image = (name: string, x: number, y: number, w: number, h = w) => { const sprite = images[name]; if (sprite) ctx.drawImage(sprite, x - w / 2, y - h / 2, w, h); };
  const draw = (time: number) => {
   if (last < 0) last = time;
   const g = game.current, dt = Math.min(0.05, (time - last) / 1000); last = time;
   if (phaseRef.current === "playing") stepDefenseGame(g, dt);
   const vp = viewportRef.current, scale = baseRef.current * zoomRef.current;
   const view: DefenseView = vp ? {
    left: Math.max(0, (vp.scrollLeft - cv.offsetLeft) / scale), right: Math.min(B.width, (vp.scrollLeft + vp.clientWidth - cv.offsetLeft) / scale),
    top: Math.max(0, (vp.scrollTop - cv.offsetTop) / scale), bottom: Math.min(B.height, (vp.scrollTop + vp.clientHeight - cv.offsetTop) / scale),
   } : { left: 0, right: B.width, top: 0, bottom: B.height };
   const partial = view.left > 4 || view.right < B.width - 4 || view.top > 4 || view.bottom < B.height - 4;
   const k = cv.width / B.width; ctx.setTransform(k, 0, 0, k, 0, 0);
   ctx.clearRect(0, 0, B.width, B.height);
   // Газон в стиле классической обороны: шахматка, полосы и кустики травы.
   ctx.fillStyle = "#5c8f2c"; ctx.fillRect(0, 0, B.origin, B.height);
   ctx.fillStyle = "#4b7a22"; for (let i = 0; i < 18; i++) ctx.fillRect((i * 37) % B.origin, (i * 71) % B.height, 6, 6);
   for (let row = 0; row < B.rows; row++) for (let col = 0; col < B.cols; col++) {
    const x = B.origin + col * B.cell, y = row * B.cell, light = (row + col) % 2 === 0;
    ctx.fillStyle = light ? "#7cc142" : "#6db236"; ctx.fillRect(x, y, B.cell, B.cell);
    ctx.fillStyle = light ? "rgba(255,255,210,.07)" : "rgba(30,70,10,.08)"; ctx.fillRect(x, y, B.cell, B.cell / 2);
    ctx.strokeStyle = "rgba(40,90,20,.35)"; ctx.lineWidth = 2;
    for (let t = 0; t < 4; t++) { const gx = x + 14 + ((col * 37 + row * 23 + t * 29) % 84), gy = y + 16 + ((col * 19 + row * 31 + t * 41) % 80); ctx.beginPath(); ctx.moveTo(gx - 5, gy - 6); ctx.lineTo(gx, gy); ctx.lineTo(gx + 5, gy - 7); ctx.stroke(); }
    ctx.fillStyle = "rgba(50,110,30,.25)"; ctx.beginPath(); ctx.arc(x + ((col * 53 + row * 17) % 90) + 10, y + ((col * 29 + row * 43) % 86) + 12, 7, 0, Math.PI * 2); ctx.fill();
   }
   ctx.strokeStyle = "rgba(255,255,220,.18)"; ctx.lineWidth = 2;
   for (let row = 1; row < B.rows; row++) { ctx.beginPath(); ctx.moveTo(B.origin, row * B.cell); ctx.lineTo(B.width, row * B.cell); ctx.stroke(); }
   // Подсветка линий, по которым сейчас пойдёт враг.
   const threats = laneThreats(g, view, partial ? 6 : 3), pulse = 0.5 + 0.5 * Math.sin(time / 160);
   for (const t of threats) {
    const y = t.row * B.cell;
    ctx.fillStyle = `rgba(255,55,35,${partial ? 0.14 + 0.14 * pulse : 0.07 + 0.07 * pulse})`; ctx.fillRect(B.origin, y, B.width - B.origin, B.cell);
    ctx.strokeStyle = `rgba(255,70,40,${0.45 + 0.4 * pulse})`; ctx.lineWidth = 4; ctx.strokeRect(B.origin + 2, y + 2, B.width - B.origin - 4, B.cell - 4);
   }
   // Клетка под курсором / последним касанием и призрак выбранного растения.
   const cell = time < tap.current.until ? tap.current : hover.current.active && hover.current.x >= B.origin ? { col: Math.floor((hover.current.x - B.origin) / B.cell), row: Math.floor(hover.current.y / B.cell) } : null;
   if (cell && cell.col >= 0 && cell.col < B.cols && cell.row >= 0 && cell.row < B.rows) {
    const x = B.origin + cell.col * B.cell, y = cell.row * B.cell;
    ctx.fillStyle = "rgba(255,240,120,.22)"; ctx.fillRect(x, y, B.cell, B.cell);
    ctx.strokeStyle = "#fff59a"; ctx.lineWidth = 5; ctx.strokeRect(x + 4, y + 4, B.cell - 8, B.cell - 8);
    if (hover.current.active && selectedRef.current !== "shovel" && !g.plants.some(p => p.col === cell.col && p.row === cell.row)) { ctx.globalAlpha = 0.45; image(selectedRef.current, cellX(cell.col), cellY(cell.row) - 6, 88, 96); ctx.globalAlpha = 1; }
   }
   g.mowers.forEach((m, row) => { if (m.ready || m.running) image("mower", m.running ? m.x : 28, cellY(row) + 10, 62, 56); });
   for (const p of g.plants) {
    const x = cellX(p.col), y = cellY(p.row), cfg = DEFENSE_PLANTS[p.type];
    ctx.fillStyle = "rgba(25,60,12,.28)"; ctx.beginPath(); ctx.ellipse(x, y + 38, 36, 10, 0, 0, Math.PI * 2); ctx.fill();
    const sway = Math.sin(time / 420 + p.id) * 1.6;
    ctx.globalAlpha = p.type === "potatomine" && p.age < 8 ? 0.55 : ["wallnut", "tallnut"].includes(p.type) ? 0.55 + 0.45 * p.hp / cfg.hp : 1;
    image(p.type, x + sway, y - (p.type === "spikeweed" ? -18 : 8), p.type === "spikeweed" ? 96 : 92, p.type === "spikeweed" ? 62 : 100); ctx.globalAlpha = 1;
    if (p.type === "potatomine" && p.age < 8) { ctx.fillStyle = "#fff"; ctx.font = "bold 18px sans-serif"; ctx.textAlign = "center"; ctx.fillText(`${Math.ceil(8 - p.age)} с`, x, y - 46); }
    if (p.hp < cfg.hp && p.type !== "spikeweed") { ctx.fillStyle = "#33401f"; ctx.fillRect(x - 30, y + 46, 60, 6); ctx.fillStyle = "#a7ed68"; ctx.fillRect(x - 30, y + 46, 60 * Math.max(0, p.hp / cfg.hp), 6); }
   }
   for (const z of g.zombies) {
    const y = cellY(z.row), bob = Math.sin(time / (z.kind === "runner" ? 90 : 170) + z.id) * 2;
    ctx.fillStyle = "rgba(20,40,10,.3)"; ctx.beginPath(); ctx.ellipse(z.x, y + 40, 32, 9, 0, 0, Math.PI * 2); ctx.fill();
    if (z.slow > 0) { ctx.fillStyle = "rgba(115,221,255,.5)"; ctx.beginPath(); ctx.ellipse(z.x, y + 40, 38, 11, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = z.hit > 0 ? 0.65 : 1; image(z.kind, z.x, y - 10 + bob, z.kind === "brute" ? 108 : 88, z.kind === "brute" ? 119 : 108); ctx.globalAlpha = 1;
    if (z.hp < z.maxHp) { ctx.fillStyle = "#34352c"; ctx.fillRect(z.x - 31, y - 68, 62, 7); ctx.fillStyle = z.slow > 0 ? "#8ce8ff" : "#ffbf69"; ctx.fillRect(z.x - 31, y - 68, 62 * Math.max(0, z.hp / z.maxHp), 7); }
   }
   for (const p of g.projectiles) { const progress = Math.min(1, Math.max(0, (p.x - p.origin) / 430)); image(p.kind, p.x, cellY(p.row) - 18 - (p.kind === "cabbage" ? Math.sin(progress * Math.PI) * 75 : 0), p.kind === "cabbage" ? 36 : 24); }
   for (const e of g.effects) { ctx.globalAlpha = Math.min(1, e.life * 3); image("explosion", e.x, e.y, 210 * (1.2 - e.life)); ctx.globalAlpha = 1; }
   for (const sun of g.suns) { ctx.globalAlpha = sun.life < 3 ? 0.65 + Math.sin(time / 110) * 0.3 : 1; image("sun", sun.x, sun.y, 64 + Math.sin(time / 330 + sun.id) * 3); ctx.globalAlpha = 1; }
   // Если часть поля скрыта, на краю экрана показываем указатель «враг идёт по этой линии».
   if (partial) {
    const u = 1 / scale;
    for (const t of threats) {
     const rowY = cellY(t.row), above = rowY < view.top + 20 * u, below = rowY > view.bottom - 20 * u;
     const size = 58 * u, x = above || below ? Math.min(view.right - size * 0.7, Math.max(view.left + size * 0.7, B.width - B.cell / 2)) : view.right - size * 0.72;
     const y = above ? view.top + size * 0.7 : below ? view.bottom - size * 0.95 : Math.min(view.bottom - size * 0.9, Math.max(view.top + size * 0.7, rowY));
     ctx.save(); ctx.translate(x, y);
     ctx.fillStyle = `rgba(214,38,26,${0.82 + 0.15 * pulse})`; ctx.strokeStyle = "#fff"; ctx.lineWidth = 3 * u;
     ctx.beginPath(); ctx.arc(0, 0, size / 2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
     const ax = above || below ? 0 : size * 0.62, ay = above ? -size * 0.62 : below ? size * 0.62 : 0, dir = above ? -Math.PI / 2 : below ? Math.PI / 2 : 0;
     ctx.save(); ctx.translate(ax, ay); ctx.rotate(dir); ctx.beginPath(); ctx.moveTo(size * 0.2, 0); ctx.lineTo(-size * 0.12, -size * 0.2); ctx.lineTo(-size * 0.12, size * 0.2); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
     image("basic", 0, 2 * u, size * 0.78, size * 0.9);
     ctx.fillStyle = "#fff"; ctx.strokeStyle = "rgba(90,10,0,.85)"; ctx.lineWidth = 4 * u; ctx.font = `900 ${14 * u}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
     const label = t.eta > 0.5 ? `через ${Math.ceil(t.eta)} с` : t.count > 1 ? `${t.count} врага` : "идёт!";
     ctx.strokeText(label, 0, size * 0.72); ctx.fillText(label, 0, size * 0.72);
     ctx.restore();
    }
   }
   // Мини-карта: всё поле, враги, растения и рамка видимой части.
   const mini = minimapRef.current, mctx = mini?.getContext("2d");
   if (mini && mctx && partial) {
    const mk = mini.width / B.width; mctx.setTransform(mk, 0, 0, mk, 0, 0);
    mctx.fillStyle = "#4f7d26"; mctx.fillRect(0, 0, B.width, B.height);
    for (let row = 0; row < B.rows; row++) { mctx.fillStyle = row % 2 ? "#78bd40" : "#6aae35"; mctx.fillRect(B.origin, row * B.cell, B.width - B.origin, B.cell); }
    for (const t of threats) { mctx.fillStyle = `rgba(255,50,30,${0.35 + 0.35 * pulse})`; mctx.fillRect(B.origin, t.row * B.cell, B.width - B.origin, B.cell); }
    for (const p of g.plants) { mctx.fillStyle = "#d8ff9a"; mctx.fillRect(cellX(p.col) - 22, cellY(p.row) - 22, 44, 44); }
    for (const z of g.zombies) { mctx.fillStyle = "#ff3b2a"; mctx.beginPath(); mctx.arc(Math.min(B.width - 14, z.x), cellY(z.row), 22, 0, Math.PI * 2); mctx.fill(); }
    mctx.strokeStyle = "#fff"; mctx.lineWidth = 14; mctx.strokeRect(view.left, view.top, view.right - view.left, view.bottom - view.top);
   }
   if (g.phase !== "playing") { finish(g.phase === "won"); return; }
   uiTime += dt;
   if (uiTime > 0.1 || phaseRef.current !== "playing") {
    uiTime = 0;
    if (g.wave !== lastWave) { lastWave = g.wave; setNotice(g.wave >= PVZ.waves ? "Финальная волна!" : `Волна ${g.wave}: зомби идут!`); }
    setUi({ sun: g.sun, wave: g.wave, cool: { ...g.cooldowns }, zoom: Math.round(zoomRef.current * 100), partial, threats: threats.length });
   }
   frame = requestAnimationFrame(draw);
  };
  frame = requestAnimationFrame(draw); return () => cancelAnimationFrame(frame);
 }, [playing, images, finish]);

 const interact = (x: number, y: number, scale: number, at: number) => {
  const g = game.current; if (phaseRef.current !== "playing") return;
  if (collectDefenseSun(g, x, y, Math.max(40, 30 / scale))) { setUi(v => ({ ...v, sun: g.sun })); return; }
  const col = Math.floor((x - B.origin) / B.cell), row = Math.floor(y / B.cell);
  if (col < 0 || col >= B.cols || row < 0 || row >= B.rows) return;
  tap.current = { col, row, until: at + 700 }; keyboardCell.current = { col, row };
  if (selectedRef.current === "shovel") { const plant = g.plants.find(p => p.col === col && p.row === row); if (plant) { g.plants = g.plants.filter(p => p.id !== plant.id); setNotice("Растение убрано"); } else setNotice("Здесь нет растения"); return; }
  const error = placeDefensePlant(g, selectedRef.current, col, row);
  if (error) setNotice(error);
  setUi(v => ({ ...v, sun: g.sun, cool: { ...g.cooldowns } }));
 };
 const canvasPoint = (clientX: number, clientY: number) => {
  const rect = canvasRef.current!.getBoundingClientRect(), scale = rect.width / B.width;
  return { x: (clientX - rect.left) / scale, y: (clientY - rect.top) / scale, scale };
 };
 // Один палец/мышь: короткое касание — посадка, перетаскивание — сдвиг поля. Два пальца — масштаб.
 const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
  const vp = event.currentTarget; vp.setPointerCapture(event.pointerId);
  pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (pointers.current.size === 1) gesture.current = { mode: "tap", x: event.clientX, y: event.clientY, left: vp.scrollLeft, top: vp.scrollTop, dist: 1, zoom: zoomRef.current };
  else if (pointers.current.size === 2) { const [a, b] = [...pointers.current.values()]; gesture.current = { ...gesture.current, mode: "pinch", dist: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), zoom: zoomRef.current }; }
 };
 const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
  const vp = event.currentTarget;
  if (event.pointerType === "mouse" && canvasRef.current) { const p = canvasPoint(event.clientX, event.clientY); hover.current = { x: p.x, y: p.y, active: true }; }
  if (!pointers.current.has(event.pointerId)) return;
  pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
  const g = gesture.current;
  if (g.mode === "pinch" && pointers.current.size >= 2) {
   const [a, b] = [...pointers.current.values()], rect = vp.getBoundingClientRect();
   applyZoom(g.zoom * Math.hypot(a.x - b.x, a.y - b.y) / g.dist, (a.x + b.x) / 2 - rect.left, (a.y + b.y) / 2 - rect.top);
  } else if (g.mode === "tap" || g.mode === "pan") {
   const dx = event.clientX - g.x, dy = event.clientY - g.y;
   if (g.mode === "tap" && Math.hypot(dx, dy) > 9) g.mode = "pan";
   if (g.mode === "pan") { vp.scrollLeft = g.left - dx; vp.scrollTop = g.top - dy; }
  }
 };
 const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
  const g = gesture.current, wasTap = g.mode === "tap" && pointers.current.size === 1;
  pointers.current.delete(event.pointerId);
  if (wasTap && canvasRef.current) { const p = canvasPoint(event.clientX, event.clientY); interact(p.x, p.y, p.scale, event.timeStamp); }
  if (pointers.current.size === 0 || g.mode === "pinch") g.mode = "none";
 };
 const onPointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => { pointers.current.delete(event.pointerId); gesture.current.mode = "none"; };
 const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
  const cell = keyboardCell.current;
  if (event.key === "+" || event.key === "=") { event.preventDefault(); applyZoom(zoomRef.current * 1.25); return; }
  if (event.key === "-") { event.preventDefault(); applyZoom(zoomRef.current / 1.25); return; }
  if (event.key === "Escape") { setPhase("paused"); return; }
  if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Enter"].includes(event.key)) return;
  event.preventDefault();
  if (event.key === "ArrowLeft") cell.col = Math.max(0, cell.col - 1);
  if (event.key === "ArrowRight") cell.col = Math.min(B.cols - 1, cell.col + 1);
  if (event.key === "ArrowUp") cell.row = Math.max(0, cell.row - 1);
  if (event.key === "ArrowDown") cell.row = Math.min(B.rows - 1, cell.row + 1);
  tap.current = { ...cell, until: event.timeStamp + 1500 };
  if (event.key === "Enter") interact(cellX(cell.col), cellY(cell.row), 1, event.timeStamp);
 };
 const onMinimap = (event: ReactPointerEvent<HTMLCanvasElement>) => {
  event.stopPropagation();
  const rect = event.currentTarget.getBoundingClientRect();
  centerOn((event.clientX - rect.left) * B.width / rect.width, (event.clientY - rect.top) * B.height / rect.height);
 };
 const current = selected === "shovel" ? null : DEFENSE_PLANTS[selected];

 return <div className="module-stack pvz-module defense-module">
  {!playing && <div className="defense-hero"><Picture name="basic" /><div><span className="eyebrow">Защитите свою ферму</span><h2>Растения против зомби</h2><p>Большое поле на весь экран, приближение и отдаление, мини-карта и подсветка линий, по которым идут враги. Отбейте {PVZ.waves} волн!</p></div><Picture name="peashooter" /></div>}
  {!playing && <section className="panel defense-lobby">
   <div className="pvz-stats"><div><strong>{state.pvz.best}/{PVZ.waves}</strong><span>рекорд волн</span></div><div><strong>{state.pvz.plays}</strong><span>игр сыграно</span></div><div><strong>{PVZ.coinsPerWave}</strong><span>монет за волну</span></div><div><strong>+{PVZ.winGems}</strong><span>алмаза за победу дня</span></div></div>
   {result && <div className={`pvz-result ${result.win ? "win" : ""}`}><strong>{result.win ? "Победа! Ферма спасена" : "Зомби прорвались"}</strong><span>Отбито волн: {result.waves} · награда: {result.waves * PVZ.coinsPerWave + (result.win ? PVZ.winCoins : 0)} монет</span></div>}
   <div className="defense-controls-help"><div><strong>Компьютер</strong><span>Колесо мыши — масштаб, перетаскивание — сдвиг поля, клик — посадка.</span></div><div><strong>Телефон</strong><span>Два пальца — масштаб, один палец — сдвиг, касание — посадка. Красная линия и стрелка — враг идёт за краем экрана.</span></div></div>
   <div className="defense-guide-heading"><h3>Ваша команда защитников</h3><p>Подсолнухи дают солнце. Стрелки атакуют, орехи задерживают, мины и бомбы спасают в сложный момент.</p></div>
   <ul className="defense-guide">{DEFENSE_ORDER.map(type => <li key={type}><Picture name={type} /><div><strong>{DEFENSE_PLANTS[type].name}</strong><small>{DEFENSE_PLANTS[type].hint}</small><span className="defense-guide-cost"><Picture name="sun" />{DEFENSE_PLANTS[type].cost}</span></div></li>)}</ul>
   {assetError && <div className="form-error" role="alert">{assetError} <button onClick={() => setAssetRetry(v => v + 1)}>Загрузить снова</button></div>}
   {state.pvz.startedAt > 0 && !result && <p className="muted">Предыдущая защита была прервана. Новая игра стоит энергию снова.</p>}
   <Button className="btn-large defense-start" disabled={busy || !images || state.energy < PVZ.energy} onClick={() => void start()}><Picture name="play" />{!images ? "Загружаем картинки…" : result ? "Играть ещё" : "Начать защиту"} · {PVZ.energy} энергии</Button>
  </section>}
  {playing && <section className="defense-play" aria-label="Растения против зомби">
   <header className="defense-seedbar">
    <div className="defense-sunbox" aria-label={`Солнце: ${ui.sun}`}><Picture name="sun" /><strong>{ui.sun}</strong></div>
    <div className="defense-packets" role="toolbar" aria-label="Выбор растения">
     {DEFENSE_ORDER.map(type => { const cfg = DEFENSE_PLANTS[type], cool = ui.cool[type], poor = ui.sun < cfg.cost; return <button key={type} className={`seed-packet ${selected === type ? "selected" : ""} ${cool > 0 || poor ? "unavailable" : ""}`} aria-pressed={selected === type} aria-label={`${cfg.name}, ${cfg.cost} солнца${cool > 0 ? `, готово через ${Math.ceil(cool)} секунд` : ""}`} title={`${cfg.name}: ${cfg.hint}`} onClick={() => select(type)}>
      <span className="seed-window"><Picture name={type} /></span><span className="seed-cost">{cfg.cost}<Picture name="sun" /></span>
      {cool > 0 && <i className="seed-cool" style={{ height: `${Math.min(100, cool / cfg.cooldown * 100)}%` }} />}
     </button>; })}
     <button className={`seed-packet shovel ${selected === "shovel" ? "selected" : ""}`} aria-pressed={selected === "shovel"} aria-label="Лопата: убрать растение" title="Лопата" onClick={() => select("shovel")}><span className="seed-window"><Picture name="shovel" /></span><span className="seed-cost">убрать</span></button>
    </div>
    <button className="defense-icon-button" onClick={() => setPhase("paused")} aria-label="Пауза" title="Пауза"><Picture name="pause" /></button>
   </header>
   <div className="defense-field">
    <div ref={viewportRef} className="defense-viewport" tabIndex={0} role="application" aria-label={`Поле: ${B.rows} рядов по ${B.cols} клеток. Стрелки — выбор клетки, Enter — посадка, плюс и минус — масштаб.`}
     onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel} onPointerLeave={() => { hover.current.active = false; }} onKeyDown={onKeyDown}>
     <div className="defense-stage"><canvas ref={canvasRef} className="defense-canvas" width={B.width} height={B.height} /></div>
    </div>
    <div className="defense-selected-chip" aria-live="polite">{selected === "shovel" ? <Picture name="shovel" /> : <Picture name={selected} />}<span><strong>{selected === "shovel" ? "Лопата" : current?.name}</strong><small>{selected === "shovel" ? "нажмите на растение" : "нажмите на клетку"}</small></span></div>
    {notice && <div className="defense-notice" role="status">{notice}</div>}
    {ui.partial && ui.threats > 0 && <div className="defense-threat-banner" role="alert">Враги идут по {ui.threats === 1 ? "линии" : `${ui.threats} линиям`} — следите за красной стрелкой</div>}
    <canvas ref={minimapRef} className={`defense-minimap ${ui.partial ? "" : "hidden"}`} width={210} height={140} aria-label="Мини-карта: нажмите, чтобы перейти к месту" onPointerDown={onMinimap} />
    <div className="defense-wave-meter" aria-label={`Волна ${Math.max(1, ui.wave)} из ${PVZ.waves}`}><span>Волна {Math.max(1, ui.wave)}/{PVZ.waves}</span><i><b style={{ width: `${Math.min(100, ui.wave / PVZ.waves * 100)}%` }} /></i></div>
    <div className="defense-zoom" role="group" aria-label="Масштаб поля">
     <button onClick={() => applyZoom(zoomRef.current / 1.3)} aria-label="Отдалить" title="Отдалить">−</button>
     <span>{ui.zoom}%</span>
     <button onClick={() => applyZoom(zoomRef.current * 1.3)} aria-label="Приблизить" title="Приблизить">+</button>
     <button className="fit" onClick={() => applyZoom(1)} aria-label="Показать всё поле" title="Всё поле"><Picture name="expand" /></button>
    </div>
   </div>
   {phase === "paused" && <div className="defense-pause-overlay"><Picture name="pause" /><h3>Пауза</h3><p>Зомби ждут. Продолжите, когда будете готовы.</p><div className="defense-pause-actions"><Button onClick={() => setPhase("playing")}><Picture name="play" />Продолжить</Button><Button variant="soft" onClick={() => finish(false)}>Сдаться и выйти</Button></div></div>}
  </section>}
 </div>;
}
