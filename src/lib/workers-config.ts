export type WorkerKind = "gardener" | "rancher" | "fisher" | "miner" | "courier";
export const WORKER_TYPES: Record<WorkerKind, { name: string; description: string; price: number; xp: number; icon: string }> = {
  gardener: { name: "Садовник Митя", description: "Каждые 2 минуты высаживает, поливает и собирает созревшие грядки. Семена берёт из амбара.", price: 2500, xp: 0, icon: "sprout" },
  rancher: { name: "Пастушка Дарья", description: "Каждые 2 минуты кормит животных и собирает продукты. Тратит комбикорм из амбара.", price: 3500, xp: 0, icon: "cow" },
  fisher: { name: "Рыбак Семён", description: "Каждые 2 минуты запускает мальков и собирает рыбу в прудах и садках.", price: 4000, xp: 0, icon: "fish" },
  miner: { name: "Шахтёр Гриша", description: "Раз в 5 минут приносит руду или камень. Не тратит вашу энергию, но работает медленно.", price: 5000, xp: 0, icon: "pickaxe" },
  courier: { name: "Курьер Лиза", description: "Раз в 10 минут выполняет заказы города, если в амбаре хватает товара, и приносит монеты с опытом.", price: 6000, xp: 0, icon: "truck" },
};
export const WORKER_HOURS = [8, 24, 72] as const;
export function workerPrice(kind: WorkerKind, hours: number) {
  return Math.round(WORKER_TYPES[kind].price * (hours === 8 ? 1 : hours === 24 ? 2.5 : 6));
}

