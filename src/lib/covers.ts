// Обложки профиля. Покупаются за алмазы, применяются сразу у всех игроков.
import type { CSSProperties } from "react";
export type CoverConfig = { key: string; name: string; gems: number; style: string; hint: string };

export const COVERS: Record<string, CoverConfig> = {
  default: { key: "default", name: "Луговой день", gems: 0, hint: "Стандартная обложка", style: "linear-gradient(180deg, #8fd2ff 0%, #c4e9ff 46%, #fff6e2 100%)" },
  sunset: { key: "sunset", name: "Закат в долине", gems: 3, hint: "Тёплые лучи над полем", style: "linear-gradient(180deg, #ffbe6b 0%, #ff8f9c 52%, #ffe7c4 100%)" },
  night: { key: "night", name: "Звёздная ночь", gems: 5, hint: "Тишина и светлячки", style: "radial-gradient(circle at 78% 22%, #fff6c4 0 6px, transparent 7px), radial-gradient(circle at 22% 34%, #ffffff 0 2px, transparent 3px), radial-gradient(circle at 62% 62%, #ffffff 0 2px, transparent 3px), linear-gradient(180deg, #16204a 0%, #2c3f78 55%, #47618f 100%)" },
  forest: { key: "forest", name: "Лесная тропа", gems: 6, hint: "Сосны и мягкий мох", style: "linear-gradient(180deg, #93d09a 0%, #4f9a68 55%, #2f6b4a 100%)" },
  gold: { key: "gold", name: "Золото ярмарки", gems: 10, hint: "Для самых успешных", style: "radial-gradient(circle at 80% 20%, #fff3b0 0 40px, transparent 41px), linear-gradient(180deg, #ffd75e 0%, #e8a917 56%, #a9710b 100%)" },
  crystal: { key: "crystal", name: "Кристальный лёд", gems: 12, hint: "Холодное сияние", style: "radial-gradient(circle at 76% 24%, #e8fbff 0 34px, transparent 35px), linear-gradient(180deg, #b6ecff 0%, #6fb6e8 50%, #3f74b8 100%)" },
  rainbow: { key: "rainbow", name: "Радуга долины", gems: 15, hint: "Редкая праздничная", style: "linear-gradient(160deg, #ff9ab5 0%, #ffd38a 22%, #b6f08a 44%, #8ae4f0 66%, #b7a4ff 88%, #ff9ab5 100%)" },
  emerald: { key: "emerald", name: "Изумрудный сад", gems: 20, hint: "Премиальная", style: "radial-gradient(circle at 25% 25%, #d8ffe4 0 26px, transparent 27px), linear-gradient(180deg, #6fe3b0 0%, #2fa877 52%, #13684b 100%)" },
};

export const DEFAULT_COVERS = ["default"];
export const COVER_UPLOAD_GEMS = 15;

export function coverConfig(key?: string) { return COVERS[key ?? "default"] ?? COVERS.default; }
/** Своя обложка лежит в assets под ключом cover:<id>. */
export function customCoverId(key?: string) { return key?.startsWith("custom:") ? key.slice(7) : null; }
export function coverStyle(key?: string): CSSProperties {
  const id = customCoverId(key);
  if (id) return { backgroundImage: `url("/api/asset/${encodeURIComponent(`cover:${id}`)}")`, backgroundSize: "cover", backgroundPosition: "center" };
  return { background: coverConfig(key).style };
}
