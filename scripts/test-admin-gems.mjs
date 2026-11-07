import assert from 'node:assert/strict';
const [base, user, pass] = [process.argv[2], process.argv[3], process.argv[4]];
let cookie = '';
async function api(route, body) { const r = await fetch(base + '/api/' + route, { method: body ? 'POST' : 'GET', headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), Cookie: cookie }, body: body ? JSON.stringify(body) : undefined }); const set = r.headers.get('set-cookie'); if (set) cookie = set.split(';')[0]; return { status: r.status, data: await r.json() }; }
assert.equal((await api('auth/login', { username: user, password: pass })).status, 200);
const key = 'gemtest' + Date.now().toString(36).slice(-4);
let r = await api('admin', { type: 'item-save', kind: 'crop', key, data: { name: 'Тест кристалл', price: 50, duration: 30, yield: 3, xp: 10, level: 1, seedPrice: 20, gemPrice: 4, description: 'x' } });
assert.equal(r.status, 200, JSON.stringify(r.data));
r = await api('admin', { type: 'item-save', kind: 'animal', key: key + 'a', data: { name: 'Тест зверь', productName: 'Тест продукт', price: 40, duration: 30, yield: 2, xp: 10, level: 1, feed: 1, gems: 9, gemPrice: 0 } });
assert.equal(r.status, 200, JSON.stringify(r.data));
const game = (await api('game')).data;
const row = game.content.find((c) => c.key === key); assert.equal(row.data.gemPrice, 4);
const arow = game.content.find((c) => c.key === key + 'a'); assert.equal(arow.data.gems, 9);
const bal = await api('admin', { type: 'balance-save', balance: { overrides: { 'crop:carrot': { seedGems: 2 }, 'animal:chicken': { gems: 5 }, 'item:feed': { gemPrice: 1 } }, upgrades: {}, globals: { wheelSpinGems: 4 } } });
assert.equal(bal.status, 200, JSON.stringify(bal.data));
const g2 = (await api('game')).data; assert.equal(g2.balance.globals.wheelSpinGems, 4); assert.equal(g2.balance.overrides['crop:carrot'].seedGems, 2);
assert.equal((await api('admin', { type: 'balance-reset' })).status, 200);
for (const k of [key, key + 'a']) assert.equal((await api('admin', { type: 'item-delete', key: k })).status, 200);
console.log('admin gem content checks passed', base);
