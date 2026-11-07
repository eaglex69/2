import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { workers } from "@/db/schema";
import { ANIMALS, CROPS, GLOBALS, POND_SPECIES, CAGE_SPECIES, barnCapacity, inventoryVolume } from "./game-config";
import { bonusMult } from "./bonus";
import type { GameState } from "./game-engine";
import { addItem } from "./game-engine";
import { WORKER_TYPES, type WorkerKind } from "./workers-config";

export async function settleWorkers(state: GameState, userId: number, now = Date.now()): Promise<string[]> {
  const rows = await db.select().from(workers).where(and(eq(workers.userId, userId), sql`${workers.expiresAt} > ${new Date(now - 86_400_000)}`));
  const messages: string[] = [];
  for (const worker of rows) {
    if (!worker.auto) {
      if (now - worker.lastRunAt.getTime() > 60_000) await db.update(workers).set({ lastRunAt: new Date(now) }).where(eq(workers.id, worker.id));
      continue;
    }
    const until = Math.min(now, worker.expiresAt.getTime());
    const last = worker.lastRunAt.getTime();
    const interval = worker.kind === "miner" ? 300_000 : worker.kind === "courier" ? 600_000 : 120_000;
    let cycles = Math.floor((until - last) / interval);
    if (cycles <= 0) continue;
    if (cycles > 720) cycles = 720;
    let newLast = last + cycles * interval;
    let produced = 0;
    const xpBefore = state.xp;
    const gain = (key: string, amount: number) => {
      try { addItem(state, key, amount); produced += amount; return true; } catch { return false; }
    };
    const take = (key: string, amount: number) => (state.inventory[key] ?? 0) >= amount && ((state.inventory[key] -= amount), true);
    const cap = barnCapacity(state.barnLevel);
    const room = () => cap - inventoryVolume(state.inventory);

    if (worker.kind === "gardener") {
      for (let c = 0; c < cycles; c += 1) {
        const t = last + (c + 1) * interval;
        for (const plot of state.plots) {
          if (plot.crop && plot.readyAt <= t) {
            const config = CROPS[plot.crop];
            if (gain(plot.crop, config.yield)) {
              state.stats.harvested += 1; state.xp += config.xp;
              Object.assign(plot, { crop: null, plantedAt: 0, readyAt: 0, watered: false });
            }
          }
        }
        for (const plot of state.plots) {
          if (!plot.crop && room() > 6) {
            const seed = Object.entries(CROPS).filter(([, c]) => c.level <= state.level && (state.inventory[c.seed] ?? 0) > 0)
              .sort((a, b) => a[1].level - b[1].level)[0];
            if (seed) {
              take(seed[1].seed, 1);
              Object.assign(plot, { crop: seed[0], plantedAt: t, readyAt: t + Math.round(seed[1].duration * 0.75), watered: true });
            }
          }
        }
      }
    } else if (worker.kind === "rancher") {
      const animalKeys = Object.keys(ANIMALS);
      for (let c = 0; c < cycles; c += 1) {
        const t = last + (c + 1) * interval;
        for (const pen of state.pens) {
          if (pen.animal && pen.readyAt <= t) {
            const config = ANIMALS[pen.animal as keyof typeof ANIMALS];
            if (gain(config.product, config.yield)) { state.stats.collected += config.yield; state.xp += config.xp; Object.assign(pen, { animal: null, startedAt: 0, readyAt: 0 }); }
          }
          if (!pen.animal && room() > 4) {
            const key = animalKeys.filter((k) => ANIMALS[k as keyof typeof ANIMALS].level <= state.level && (state.inventory.feed ?? 0) >= ANIMALS[k as keyof typeof ANIMALS].feed)[0];
            if (key) {
              const config = ANIMALS[key as keyof typeof ANIMALS];
              take("feed", config.feed);
              Object.assign(pen, { animal: key, startedAt: t, readyAt: t + config.duration });
            }
          }
        }
      }
    } else if (worker.kind === "fisher") {
      for (let c = 0; c < cycles; c += 1) {
        const t = last + (c + 1) * interval;
        const process = (slots: typeof state.ponds, configs: Record<string, { fry: string; duration: number; yield: number; xp: number; level: number }>) => {
          for (const slot of slots) {
            if (slot.species && slot.readyAt <= t) {
              const config = configs[slot.species];
              if (config && gain(slot.species, config.yield)) { state.stats.fishCaught += config.yield; state.xp += config.xp; Object.assign(slot, { species: null, startedAt: 0, readyAt: 0, fed: false }); }
            }
            if (!slot.species && room() > 4) {
              const found = Object.entries(configs).filter(([, c]) => c.level <= state.level && (state.inventory[c.fry] ?? 0) > 0)[0];
              if (found) { take(found[1].fry, 1); Object.assign(slot, { species: found[0], startedAt: t, readyAt: t + found[1].duration, fed: false }); }
            }
          }
        };
        process(state.ponds, POND_SPECIES as unknown as Record<string, { fry: string; duration: number; yield: number; xp: number; level: number }>);
        process(state.cages, CAGE_SPECIES as unknown as Record<string, { fry: string; duration: number; yield: number; xp: number; level: number }>);
      }
    } else if (worker.kind === "miner") {
      const loot = ["stone", "coal", "copper", ...(state.level >= 2 ? ["iron"] : []), ...(state.level >= 4 ? ["gold"] : [])];
      for (let c = 0; c < cycles; c += 1) {
        const key = loot[Math.floor(Math.random() * loot.length)];
        const amount = key === "stone" || key === "coal" ? 2 : 1;
        if (!gain(key, amount)) { newLast = last + c * interval; cycles = c; break; }
        state.stats.mined += 1; state.xp += 5;
      }
    } else if (worker.kind === "courier") {
      for (let c = 0; c < cycles; c += 1) {
        const order = state.orders.items.find((o) => !state.orders.completed.includes(o.id) && (state.inventory[o.itemKey] ?? 0) >= o.quantity);
        if (!order) { newLast = last + (c + 1) * interval; continue; }
        take(order.itemKey, order.quantity);
        state.orders.completed.push(order.id);
        const pay = Math.round(order.rewardCoins * bonusMult("reward", now)); state.coins += pay; state.stats.earned += pay; state.stats.orders += 1; state.xp += order.rewardXp;
        produced += pay;
      }
    }

    state.xp = xpBefore + Math.round((state.xp - xpBefore) * bonusMult("xp", now));
    while (state.xp >= 60 + (state.level - 1) * 45 && state.level < GLOBALS.maxLevel) {
      state.xp -= 60 + (state.level - 1) * 45; state.level += 1; state.maxEnergy += 1; state.energy = Math.min(state.maxEnergy, state.energy + 5); state.coins += 20 * state.level; if (state.level % 2 === 0) state.gems += 1;
    }
    await db.update(workers).set({ lastRunAt: new Date(newLast), cycles: worker.cycles + cycles, earned: worker.earned + produced }).where(eq(workers.id, worker.id));
    if (cycles > 0 && produced > 0) messages.push(`${WORKER_TYPES[worker.kind as WorkerKind].name}: ${cycles} цикл(ов)`);
  }
  return messages;
}
