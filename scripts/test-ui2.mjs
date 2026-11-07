import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const base = process.env.UI_TEST_URL ?? 'http://127.0.0.1:3000';
const tag = process.env.UI_TEST_TAG ?? 'next';
const username = 'u2_' + Date.now().toString(36);
await mkdir('.checks', { recursive: true });
const reg = await fetch(base + '/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password: 'test-password-123', displayName: 'Тест 2' }) });
if (!reg.ok) throw new Error(await reg.text());
const token = reg.headers.get('set-cookie').split(';')[0].split('=')[1];
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
async function open(viewport, mobile) {
  const ctx = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile });
  await ctx.addCookies([{ name: 'quiet_farm_session', value: token, domain: new URL(base).hostname, path: '/', httpOnly: true, sameSite: 'Lax' }]);
  await ctx.addInitScript(() => sessionStorage.setItem('valley:splash', '1'));
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(base, { waitUntil: 'networkidle' }); await page.waitForSelector('.farm-map-redesign');
  return { ctx, page, errors };
}
const out = {};
try {
  const d = await open({ width: 1440, height: 900 }, false); const p = d.page; await p.waitForTimeout(600);
  assert.ok(await p.locator('.map-pin[data-pin="wheel"]').count() && await p.locator('.map-pin[data-pin="pvz"]').count(), 'map pins');
  await p.screenshot({ path: `.checks/${tag}-home.png` });
  const dock = await p.evaluate(() => { const n = document.querySelector('.map-dock'); const t = document.querySelector('.map-dock-track'); return [n.clientWidth, t.scrollWidth]; }); out.dock = dock; assert.ok(dock[1] <= dock[0] + 2, 'dock fits desktop');
  // колесо
  await p.locator('.map-dock-button[aria-label="Колесо"]').click(); await p.waitForSelector('.wheel-module');
  await p.getByRole('button', { name: /Крутить бесплатно/ }).click();
  await p.waitForSelector('.wheel-result.show', { timeout: 9000 }); await p.waitForTimeout(500);
  out.wheel = await p.locator('.wheel-result').innerText(); await p.screenshot({ path: `.checks/${tag}-wheel.png` });
  // магазин, алмазная витрина
  await p.locator('.map-dock-button[aria-label="Магазин"]').click(); await p.waitForSelector('.content-shop');
  await p.getByRole('button', { name: /Алмазная/ }).click(); await p.waitForSelector('.shop-card.gem-card'); out.gemCards = await p.locator('.shop-card.gem-card').count(); assert.ok(out.gemCards >= 8);
  await p.screenshot({ path: `.checks/${tag}-gems.png` });
  // зомби
  await p.locator('.map-dock-button[aria-label="Зомби"]').click(); await p.waitForSelector('.pvz-module');
  await p.screenshot({ path: `.checks/${tag}-pvz-lobby.png` });
  await p.getByRole('button', { name: /Начать защиту/ }).click(); await p.waitForSelector('canvas.defense-canvas');
  await p.locator('.seed-packet[aria-label^="Подсолнух,"]').click();
  const box = await p.locator('canvas.defense-canvas').boundingBox(); const sx2 = box.width / 840, sy2 = box.height / 560;
  for (const [col, row] of [[0, 1]]) await p.mouse.click(box.x + (56 + col * 112 + 56) * sx2, box.y + (row * 112 + 56) * sy2);
  await p.locator('.seed-packet[aria-label^="Горохострел,"]').click();
  for (const [col, row] of [[1, 1]]) await p.mouse.click(box.x + (56 + col * 112 + 56) * sx2, box.y + (row * 112 + 56) * sy2);
  await p.waitForTimeout(14000);
  out.pvzBar = await p.locator('.defense-wave-meter').innerText(); await p.screenshot({ path: `.checks/${tag}-pvz.png` });
  const painted = await p.evaluate(() => { const c = document.querySelector('canvas.defense-canvas'); const data = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < data.length; i += 400) if (data[i + 3] > 0) n += 1; return n; }); assert.ok(painted > 500, 'pvz canvas painted');
  out.errors = d.errors; assert.deepEqual(d.errors, []); await d.ctx.close();
  // мобильный
  const m = await open({ width: 390, height: 844 }, true);
  await m.page.locator('.map-dock-button[aria-label="Колесо"]').click(); await m.page.waitForSelector('.wheel-module'); await m.page.waitForTimeout(500); await m.page.screenshot({ path: `.checks/${tag}-wheel-m.png` });
  await m.page.locator('.map-dock-button[aria-label="Зомби"]').click(); await m.page.waitForSelector('.pvz-module'); await m.page.getByRole('button', { name: /Начать защиту/ }).click(); await m.page.waitForSelector('canvas.defense-canvas'); await m.page.waitForTimeout(800); await m.page.screenshot({ path: `.checks/${tag}-pvz-m.png` });
  out.overflow = await m.page.evaluate(() => document.documentElement.scrollWidth - innerWidth); assert.ok(out.overflow <= 1, 'mobile overflow');
  assert.deepEqual(m.errors, []); await m.ctx.close();
  console.log('UI2 checks passed', JSON.stringify(out));
} finally { await browser.close(); }
