// Сериализация действий одного игрока: состояние фермы хранится одним JSON,
// поэтому параллельные запросы без блокировки теряют обновления (last-write-wins)
// и позволяют дабл-спенд монет/предметов.
const chains = new Map<string, Promise<void>>();

export async function withUserLock<T>(userId: number | string, fn: () => Promise<T>): Promise<T> {
  const key = String(userId);
  const previous = chains.get(key) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const tail = previous.catch(() => {}).then(() => gate);
  chains.set(key, tail);
  await previous.catch(() => {});
  try {
    return await fn();
  } finally {
    release();
    if (chains.get(key) === tail) chains.delete(key);
  }
}
