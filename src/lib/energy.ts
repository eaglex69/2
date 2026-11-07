import { GLOBALS } from "./game-config";
import { bonusMult } from "./bonus";
import type { GameState } from "./game-engine";

type EnergyState = Pick<GameState, "energy" | "maxEnergy" | "lastEnergyAt" | "elysium">;

// Энергия восстанавливается на сервере раз в интервал. Клиент считает то же самое по часам,
// чтобы полоска плавно прибавлялась без перезагрузки и уменьшалась сразу после траты.
export function liveEnergy(state: EnergyState, now: number) {
  const max = Math.max(1, state.maxEnergy);
  if (state.energy >= max) return { energy: max, max, progress: 1, nextMs: 0, full: true };
  const boosted = state.elysium.blessing === "energy" && state.elysium.until > now ? 2 : 1;
  const interval = Math.max(1000, Math.round(GLOBALS.energyRegenSec * 1000 / (boosted * bonusMult("energy", now))));
  const elapsed = Math.max(0, now - state.lastEnergyAt);
  const energy = Math.min(max, state.energy + Math.floor(elapsed / interval));
  if (energy >= max) return { energy: max, max, progress: 1, nextMs: 0, full: true };
  const rest = elapsed % interval;
  return { energy, max, progress: Math.min(1, (energy + rest / interval) / max), nextMs: interval - rest, full: false };
}
