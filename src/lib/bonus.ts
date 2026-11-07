import { ITEMS, marketPrice } from "./game-config";

// Бонусы дня/недели. Модуль безопасен для клиента и сервера: список бонусов
// подгружается из БД (сервер) или из ответа /api/game (браузер).
export type BonusKind = "xp" | "yield" | "speed" | "sell" | "reward" | "mine" | "energy" | "discount";

export const BONUS_KINDS: Record<BonusKind, { label: string; short: string; description: string }> = {
  xp: { label: "Опыт", short: "опыт", description: "Весь получаемый опыт умножается" },
  yield: { label: "Урожай и продукты", short: "урожай", description: "Урожай, рыба, продукты животных и заготовки" },
  speed: { label: "Скорость производства", short: "скорость", description: "Растения, рыба, животные, погреб и смены завершаются быстрее" },
  sell: { label: "Цена продажи", short: "продажа", description: "Скупка товаров в амбаре оплачивается выше" },
  reward: { label: "Награды за работу и заказы", short: "награды", description: "Больше монет за смены и городские заказы" },
  mine: { label: "Добыча в шахтах", short: "шахты", description: "Руда и камень приносят больше" },
  energy: { label: "Восстановление энергии", short: "энергия", description: "Энергия восстанавливается быстрее" },
  discount: { label: "Скидка в магазине", short: "скидка", description: "Цены в магазине делятся на множитель" },
};

export type Bonus = { id: number; title: string; kind: BonusKind; multiplier: number; startsAt: number; endsAt: number; active: boolean };

let LIST: Bonus[] = [];

export function setBonuses(list: Bonus[]) {
  LIST = Array.isArray(list) ? list : [];
}

export function activeBonuses(now = Date.now()) {
  return LIST.filter((bonus) => bonus.active && bonus.startsAt <= now && now < bonus.endsAt);
}

// Одинаковые бонусы не складываются: берётся самый сильный.
export function bonusMult(kind: BonusKind, now = Date.now()) {
  let result = 1;
  for (const bonus of activeBonuses(now)) if (bonus.kind === kind && bonus.multiplier > result) result = bonus.multiplier;
  return result;
}

export function shopPrice(key: string, now = Date.now()) {
  const base = ITEMS[key]?.basePrice ?? 1;
  return Math.max(1, Math.round(base / bonusMult("discount", now)));
}

export function sellPrice(key: string, now = Date.now()) {
  return Math.max(1, Math.round(marketPrice(key, new Date(now)) * bonusMult("sell", now)));
}
