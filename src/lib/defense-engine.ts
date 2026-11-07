import { PVZ } from "./game-config";

export const DEFENSE_BOARD = { cols: 7, rows: 5, cell: 112, origin: 56, width: 840, height: 560 };
export type DefensePlant = "sunflower" | "peashooter" | "snowpea" | "repeater" | "wallnut" | "tallnut" | "cherry" | "potatomine" | "spikeweed" | "threepeater" | "cabbagepult" | "squash";
export type DefenseZombie = "basic" | "cone" | "bucket" | "football" | "runner" | "brute";
export const DEFENSE_PLANTS: Record<DefensePlant, { name: string; cost: number; cooldown: number; hp: number; hint: string }> = {
 sunflower: { name: "Подсолнух", cost: 50, cooldown: 4, hp: 100, hint: "Даёт 25 солнца каждые 7 секунд" },
 peashooter: { name: "Горохострел", cost: 100, cooldown: 4, hp: 120, hint: "Стреляет по своей дорожке" },
 snowpea: { name: "Ледяной горох", cost: 175, cooldown: 7, hp: 120, hint: "Замедляет зомби на 3 секунды" },
 repeater: { name: "Двойной горох", cost: 200, cooldown: 6, hp: 140, hint: "Две горошины за один выстрел" },
 wallnut: { name: "Орех-щит", cost: 50, cooldown: 14, hp: 650, hint: "Задерживает врагов, пока стрелки атакуют" },
 tallnut: { name: "Крепость-орех", cost: 125, cooldown: 20, hp: 1500, hint: "Очень прочная защитная стена" },
 cherry: { name: "Вишнёвая бомба", cost: 150, cooldown: 25, hp: 1, hint: "Взрыв через секунду на трёх дорожках" },
 potatomine: { name: "Картофельная мина", cost: 25, cooldown: 12, hp: 100, hint: "Готовится 8 секунд, затем взрывается" },
 spikeweed: { name: "Колючая трава", cost: 100, cooldown: 6, hp: 9999, hint: "Ранит проходящих зомби, не боится укусов" },
 threepeater: { name: "Тройной горох", cost: 275, cooldown: 8, hp: 140, hint: "Обстреливает три соседние дорожки" },
 cabbagepult: { name: "Капустомёт", cost: 175, cooldown: 7, hp: 140, hint: "Тяжёлые снаряды задевают группу врагов" },
 squash: { name: "Кабачок-страж", cost: 150, cooldown: 18, hp: 180, hint: "Сокрушает подошедшего тяжеловеса" },
};
export const DEFENSE_ORDER = Object.keys(DEFENSE_PLANTS) as DefensePlant[];
export type Plant = { id: number; type: DefensePlant; col: number; row: number; hp: number; timer: number; age: number; burst: number };
export type Zombie = { id: number; kind: DefenseZombie; row: number; x: number; hp: number; maxHp: number; speed: number; slow: number; bite: number; hit: number };
type Projectile = { row: number; x: number; origin: number; kind: "pea" | "icepea" | "cabbage"; damage: number };
type SunDrop = { id: number; x: number; y: number; targetY: number; life: number; landed: boolean };
export type DefenseGame = {
 plants: Plant[]; zombies: Zombie[]; projectiles: Projectile[]; suns: SunDrop[]; effects: { x: number; y: number; life: number }[];
 queue: { at: number; kind: DefenseZombie; row: number }[]; mowers: { ready: boolean; running: boolean; x: number }[];
 cooldowns: Record<DefensePlant, number>; sun: number; wave: number; nextWave: number; time: number; skySun: number; nextId: number; phase: "playing" | "won" | "lost";
};
const enemies: Record<DefenseZombie, { hp: number; speed: number }> = { basic: { hp: 100, speed: 13 }, cone: { hp: 210, speed: 12 }, bucket: { hp: 370, speed: 11 }, football: { hp: 280, speed: 22 }, runner: { hp: 85, speed: 25 }, brute: { hp: 750, speed: 8 } };
export const cellX = (col: number) => DEFENSE_BOARD.origin + (col + 0.5) * DEFENSE_BOARD.cell;
export const cellY = (row: number) => (row + 0.5) * DEFENSE_BOARD.cell;
export function createDefenseGame(): DefenseGame {
 return { plants: [], zombies: [], projectiles: [], suns: [], effects: [], queue: [], mowers: Array.from({ length: 5 }, () => ({ ready: true, running: false, x: 25 })), cooldowns: Object.fromEntries(DEFENSE_ORDER.map(k => [k, 0])) as Record<DefensePlant, number>, sun: 200, wave: 0, nextWave: 12, time: 0, skySun: 4, nextId: 1, phase: "playing" };
}
export function placeDefensePlant(g: DefenseGame, type: DefensePlant, col: number, row: number): string | null {
 const b = DEFENSE_BOARD, p = DEFENSE_PLANTS[type];
 if (g.phase !== "playing") return "Игра на паузе";
 if (!p || !Number.isInteger(col) || !Number.isInteger(row) || col < 0 || col >= b.cols || row < 0 || row >= b.rows) return "Выберите клетку газона";
 if (g.plants.some(v => v.col === col && v.row === row)) return "Здесь уже растёт защитник";
 if (g.cooldowns[type] > 0) return `Растение готовится ещё ${Math.ceil(g.cooldowns[type])} сек`;
 if (g.sun < p.cost) return `Нужно ещё ${p.cost - g.sun} солнца`;
 g.sun -= p.cost; g.cooldowns[type] = p.cooldown;
 g.plants.push({ id: g.nextId++, type, col, row, hp: p.hp, timer: type === "sunflower" ? 4 : 0.3, age: 0, burst: 0 });
 return null;
}
export function collectDefenseSun(g: DefenseGame, x: number, y: number, radius = 40) {
 const sun = g.suns.find(s => Math.hypot(s.x - x, s.y - y) <= radius);
 if (!sun) return false;
 g.sun += 25; g.suns = g.suns.filter(s => s.id !== sun.id); return true;
}
function explode(g: DefenseGame, p: Plant, damage: number, radius: number, adjacent: boolean) {
 for (const z of g.zombies) if (Math.abs(z.x - cellX(p.col)) < radius && (adjacent ? Math.abs(z.row - p.row) <= 1 : z.row === p.row)) { z.hp -= damage; z.hit = 0.2; }
 g.effects.push({ x: cellX(p.col), y: cellY(p.row), life: 0.5 }); p.hp = 0;
}
function shoot(g: DefenseGame, p: Plant, row: number, kind: Projectile["kind"] = "pea") {
 if (row < 0 || row >= DEFENSE_BOARD.rows) return;
 g.projectiles.push({ row, x: cellX(p.col) + 30, origin: cellX(p.col), kind, damage: kind === "cabbage" ? 55 : 25 });
}
export function stepDefenseGame(g: DefenseGame, delta: number, random: () => number = Math.random) {
 if (g.phase !== "playing") return;
 const dt = Math.max(0, Math.min(0.06, delta)); const b = DEFENSE_BOARD; g.time += dt;
 for (const key of DEFENSE_ORDER) g.cooldowns[key] = Math.max(0, g.cooldowns[key] - dt);
 if (g.wave < PVZ.waves && g.time >= g.nextWave) {
  g.wave++; const count = 2 + Math.floor(g.wave * 1.1);
  for (let i = 0; i < count; i++) { const roll = random(); const kind: DefenseZombie = g.wave >= 8 && roll < 0.14 ? "brute" : g.wave >= 6 && roll < 0.32 ? "football" : g.wave >= 5 && roll < 0.48 ? "runner" : g.wave >= 3 && roll < 0.72 ? "bucket" : g.wave >= 2 && roll < 0.85 ? "cone" : "basic"; g.queue.push({ at: g.time + random() * 13, kind, row: Math.floor(random() * b.rows) }); }
  g.nextWave = g.time + 28;
 }
 g.skySun -= dt;
 if (g.skySun <= 0) { g.skySun = 6; const row = Math.floor(random() * b.rows); g.suns.push({ id: g.nextId++, x: b.origin + 45 + random() * (b.width - b.origin - 90), y: -25, targetY: cellY(row), life: 13, landed: false }); }
 for (const spawn of g.queue.filter(s => s.at <= g.time)) { const base = enemies[spawn.kind]; g.zombies.push({ id: g.nextId++, kind: spawn.kind, row: spawn.row, x: b.width + 40, hp: base.hp, maxHp: base.hp, speed: base.speed, slow: 0, bite: 0, hit: 0 }); }
 g.queue = g.queue.filter(s => s.at > g.time);
 for (const p of g.plants) {
  p.age += dt; p.timer -= dt;
  if (p.burst > 0) { p.burst -= dt; if (p.burst <= 0) shoot(g, p, p.row); }
  if (p.type === "sunflower" && p.timer <= 0) { p.timer = 7; g.suns.push({ id: g.nextId++, x: cellX(p.col) + 15, y: cellY(p.row) - 30, targetY: cellY(p.row) + 20, life: 13, landed: false }); }
  if (p.type === "cherry" && p.age >= 0.85) explode(g, p, 500, b.cell * 1.45, true);
  if (p.type === "potatomine" && p.age >= 8 && g.zombies.some(z => z.row === p.row && z.hp > 0 && Math.abs(z.x - cellX(p.col)) < 60)) explode(g, p, 500, 90, false);
  if (p.type === "squash" && p.age > 0.6 && g.zombies.some(z => z.row === p.row && z.hp > 0 && Math.abs(z.x - cellX(p.col)) < 100)) explode(g, p, 800, 95, false);
  if (p.type === "spikeweed" && p.timer <= 0) { p.timer = 0.7; for (const z of g.zombies) if (z.row === p.row && Math.abs(z.x - cellX(p.col)) < 64) { z.hp -= 20; z.hit = 0.1; } }
  if (p.timer <= 0 && ["peashooter", "snowpea", "repeater", "threepeater", "cabbagepult"].includes(p.type) && g.zombies.some(z => z.hp > 0 && z.x > cellX(p.col) && z.x < b.width + 65 && (p.type === "threepeater" ? Math.abs(z.row - p.row) <= 1 : z.row === p.row))) {
   p.timer = p.type === "cabbagepult" ? 2.3 : 1.35;
   if (p.type === "threepeater") for (const row of [p.row - 1, p.row, p.row + 1]) shoot(g, p, row);
   else { shoot(g, p, p.row, p.type === "snowpea" ? "icepea" : p.type === "cabbagepult" ? "cabbage" : "pea"); if (p.type === "repeater") p.burst = 0.18; }
  }
 }
 for (const shot of g.projectiles) {
  shot.x += (shot.kind === "cabbage" ? 245 : 320) * dt;
  const target = g.zombies.find(z => z.row === shot.row && z.hp > 0 && Math.abs(z.x - shot.x) < 25);
  if (target) { target.hp -= shot.damage; target.hit = 0.12; if (shot.kind === "icepea") target.slow = 3; if (shot.kind === "cabbage") for (const z of g.zombies) if (z.id !== target.id && z.row === target.row && Math.abs(z.x - target.x) < 65) z.hp -= 30; shot.x = b.width + 200; }
 }
 g.projectiles = g.projectiles.filter(p => p.x < b.width + 60);
 for (const z of g.zombies) {
  z.slow = Math.max(0, z.slow - dt); z.hit = Math.max(0, z.hit - dt);
  const food = g.plants.find(p => p.row === z.row && p.hp > 0 && !["spikeweed", "potatomine", "cherry", "squash"].includes(p.type) && z.x - cellX(p.col) < 48 && z.x - cellX(p.col) > -12);
  if (food) { food.hp -= (z.kind === "brute" ? 90 : 34) * dt; z.bite = 1; } else { z.bite = 0; z.x -= z.speed * (z.slow > 0 ? 0.48 : 1) * dt; }
  const mower = g.mowers[z.row]; if (z.x < b.origin - 8 && mower.ready) { mower.ready = false; mower.running = true; }
 }
 g.mowers.forEach((m, row) => { if (!m.running) return; m.x += 490 * dt; for (const z of g.zombies) if (z.row === row && z.x < m.x + 40) z.hp = 0; if (m.x > b.width + 70) m.running = false; });
 g.plants = g.plants.filter(p => p.hp > 0); g.zombies = g.zombies.filter(z => z.hp > 0);
 for (const sun of g.suns) { if (!sun.landed) { sun.y = Math.min(sun.targetY, sun.y + 90 * dt); sun.landed = sun.y >= sun.targetY; } else sun.life -= dt; }
 g.suns = g.suns.filter(s => s.life > 0); for (const effect of g.effects) effect.life -= dt; g.effects = g.effects.filter(e => e.life > 0);
 if (g.zombies.some(z => z.x < -18)) g.phase = "lost";
 else if (g.wave >= PVZ.waves && !g.queue.length && !g.zombies.length) g.phase = "won";
}

export type DefenseView = { left: number; right: number; top: number; bottom: number };
export type LaneThreat = { row: number; eta: number; hidden: boolean; count: number };
// Линии, по которым скоро пойдут или уже идут невидимые игроку враги.
// eta — секунды до появления (0 — враг уже на поле, но за пределами видимой части).
export function laneThreats(g: DefenseGame, view: DefenseView, horizon = 5): LaneThreat[] {
 const rows = new Map<number, LaneThreat>();
 const add = (row: number, eta: number, hidden: boolean) => {
  const current = rows.get(row);
  if (!current) rows.set(row, { row, eta, hidden, count: 1 });
  else { current.eta = Math.min(current.eta, eta); current.hidden = current.hidden || hidden; current.count += 1; }
 };
 for (const spawn of g.queue) { const eta = spawn.at - g.time; if (eta <= horizon) add(spawn.row, Math.max(0, eta), true); }
 for (const z of g.zombies) {
  const y = cellY(z.row);
  if (z.x > view.right - 10 || z.x < view.left || y < view.top || y > view.bottom) add(z.row, 0, true);
 }
 return [...rows.values()].sort((a, b) => a.row - b.row);
}
