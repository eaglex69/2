import assert from 'node:assert/strict';
const base = process.env.FEATURE_URL ?? 'http://127.0.0.1:3000';
const user = 'ft_' + Date.now().toString(36);
let cookie = '';
async function api(route, body) {
  const r = await fetch(base + '/api/' + route, { method: body ? 'POST' : 'GET', headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const data = await r.json();
  const set = r.headers.get('set-cookie'); if (set) cookie = set.split(';')[0];
  return { status: r.status, data };
}
const reg = await api('auth/register', { username: user, password: 'test-password-123', displayName: 'Фичи' }); assert.equal(reg.status, 200);
let game = (await api('game')).data; let checks = 0;
const act = async (action, expect = 200) => { const r = await api('game', action); assert.equal(r.status, expect, `${action.type}: ${JSON.stringify(r.data)}`); checks++; return r.data; };
assert.ok(game.state.wheel && game.state.pvz, 'new state blocks'); checks++;
// колесо
const w1 = await act({ type: 'wheel-spin' }); assert.ok(w1.state.wheel.last.index >= 0 && w1.message.startsWith('Колесо фортуны'));
const gemsAfterFree = w1.state.gems;
const w2 = await act({ type: 'wheel-spin' }); assert.ok(w2.state.wheel.paidToday === 1);
// алмазный магазин
const gemsLeft = w2.state.gems;
await act({ type: 'shop-buy-gems', item: 'carrot_seed', quantity: 1 }, 400);
await act({ type: 'shop-buy', item: 'golden_wheat_seed', quantity: 1 }, 400);
if (gemsLeft >= 3) { const buy = await act({ type: 'shop-buy-gems', item: 'golden_wheat_seed', quantity: 1 }); assert.equal(buy.state.inventory.golden_wheat_seed, 1); }
await act({ type: 'animal-buy', animal: 'phoenix' }, 400);
await act({ type: 'pen-start', index: 0, animal: 'golden_goose' }, 400);
// зомби
const start = await act({ type: 'pvz-start' }); assert.ok(start.state.pvz.startedAt > 0);
await act({ type: 'pvz-finish', waves: 6, win: false }, 400);
const fin = await act({ type: 'pvz-finish', waves: 0, win: false }); assert.equal(fin.state.pvz.startedAt, 0);
// рыбалка: подсечка с задержкой сети 450 мс должна засчитываться
let caught = 0;
for (let attempt = 0; attempt < 3 && caught === 0; attempt += 1) {
  const s = await act({ type: 'fish-start' }); const f = s.state.fishing;
  const hitAt = f.startedAt + f.period * f.target;
  const delay = Math.max(0, hitAt + 450 - Date.now() - (process.env.CLOCK_SKEW ? Number(process.env.CLOCK_SKEW) : 0));
  await new Promise((r) => setTimeout(r, Math.min(delay, 5000)));
  const c = await act({ type: 'fish-catch', at: hitAt });
  if (/Поймано|Точная/.test(c.message)) caught += 1;
  await new Promise((r) => setTimeout(r, 300));
}
assert.ok(caught > 0, 'fish caught with network latency compensation');
const early = await act({ type: 'fish-start' }, 400); void early;
const resting = (await api('game')).data.state;
assert.ok(resting.lastCastAt > 0 && resting.lastCastAt + 150000 > Date.now(), '2:30 cooldown survives a completed cast'); checks++;
console.log(`Feature API checks passed: ${checks} (${user})`);
if (process.env.FEATURE_CLEANUP) console.log('cleanup:', user);
