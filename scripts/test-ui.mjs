import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const base = process.env.UI_TEST_URL ?? 'http://127.0.0.1:3000';
const tag = process.env.UI_TEST_TAG ?? 'next';
const username = 'ui_' + Date.now().toString(36);
await mkdir('.checks', { recursive: true });
const reg = await fetch(base + '/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password: 'test-password-123', displayName: 'Тест UI' }) });
if (!reg.ok) throw new Error(await reg.text());
const token = reg.headers.get('set-cookie').split(';')[0].split('=')[1];
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const out = {};
async function session(viewport, mobile) {
  const ctx = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile });
  await ctx.addCookies([{ name: 'quiet_farm_session', value: token, domain: new URL(base).hostname, path: '/', httpOnly: true, sameSite: 'Lax' }]);
  await ctx.addInitScript(() => sessionStorage.setItem('valley:splash', '1'));
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(base, { waitUntil: 'networkidle' }); await page.waitForSelector('.farm-map-redesign');
  return { ctx, page, errors };
}
const fillWidth = (page) => page.evaluate(() => { const f = document.querySelector('.resource-energy .resource-fill'); const p = document.querySelector('.resource-energy').getBoundingClientRect().width; return { fill: f.getBoundingClientRect().width, total: p, text: document.querySelector('.resource-energy .resource-value').textContent }; });
try {
  // ПК
  const d = await session({ width: 1440, height: 900 }, false);
  const { page } = d;
  await page.waitForTimeout(800);
  await page.screenshot({ path: `.checks/${tag}-home-desktop.png` });
  assert.ok(await page.locator('.map-rail-left [aria-label^="Общий чат"]').count(), 'chat icon on home');
  assert.equal(await page.locator('.map-pin[data-pin="cages"], .map-pin[data-pin="fishing"]').count(), 0, 'no separate cages/fishing pins');
  assert.ok(await page.locator('.map-pin[data-pin="ponds"]').count(), 'single water pin');
  out.energyFull = await fillWidth(page);
  assert.ok(out.energyFull.fill >= out.energyFull.total - 6, 'full energy fills pill');
  // Водоёмы через док
  await page.locator('.map-dock-button[aria-label="Водоёмы"]').click();
  await page.waitForSelector('.water-tabs'); await page.waitForTimeout(400);
  assert.equal(await page.locator('.water-tab').count(), 3);
  await page.screenshot({ path: `.checks/${tag}-water-desktop.png` });
  await page.locator('.water-tab', { hasText: 'Рыбалка' }).click(); await page.waitForSelector('.fishing-panel');
  assert.ok(await page.locator('.inner-hud').count() && await page.locator('.map-dock.is-fixed').count(), 'shared HUD and dock');
  // Энергия: трата и восстановление
  await page.locator('.inner-hud .resource-energy').waitFor();
  const before = await fillWidth(page);
  await page.getByRole('button', { name: /Забросить удочку/ }).click();
  await page.waitForFunction(() => /^(\d+)\/\d+$/.test(document.querySelector('.resource-energy .resource-value').textContent) && document.querySelector('.resource-energy .resource-value').textContent.split('/')[0] < 30, null, { timeout: 8000 });
  await page.waitForTimeout(900);
  const spent = await fillWidth(page); out.energy = { before, spent };
  assert.ok(spent.fill < before.fill - 5, 'energy bar decreases after spending');
  await page.waitForTimeout(21500);
  const regen = await fillWidth(page); out.energy.regen = regen;
  assert.ok(regen.fill > spent.fill + 1, 'energy bar fills back over time');
  assert.ok(Number(regen.text.split('/')[0]) > Number(spent.text.split('/')[0]), 'energy number grows live');
  for (const [name, label] of [['garden', 'Огород'], ['shop', 'Магазин'], ['chat', 'Чат'], ['mail', 'Почта']]) {
    await page.locator(`.map-dock-button[aria-label="${label}"]`).click(); await page.waitForSelector(`.content-${name}`); await page.waitForTimeout(500);
    await page.screenshot({ path: `.checks/${tag}-${name}-desktop.png` });
  }
  await page.locator('.map-dock-button[aria-label="Карта"]').click(); await page.waitForSelector('.farm-map-redesign');
  out.desktopErrors = d.errors; assert.deepEqual(d.errors, []); await d.ctx.close();
  // Телефон
  const m = await session({ width: 390, height: 844 }, true);
  await m.page.waitForTimeout(800); await m.page.screenshot({ path: `.checks/${tag}-home-mobile.png` });
  await m.page.locator('.map-rail-left [aria-label^="Общий чат"]').click(); await m.page.waitForSelector('.content-chat'); await m.page.waitForTimeout(400);
  await m.page.screenshot({ path: `.checks/${tag}-chat-mobile.png` });
  await m.page.locator('.map-dock-button[aria-label="Водоёмы"]').click(); await m.page.waitForSelector('.water-tabs'); await m.page.waitForTimeout(400);
  await m.page.screenshot({ path: `.checks/${tag}-water-mobile.png` });
  await m.page.locator('.map-dock-button[aria-label="Магазин"]').click(); await m.page.waitForSelector('.content-shop'); await m.page.waitForTimeout(400);
  await m.page.screenshot({ path: `.checks/${tag}-shop-mobile.png` });
  const overflow = await m.page.evaluate(() => document.documentElement.scrollWidth - innerWidth); out.mobileOverflow = overflow; assert.ok(overflow <= 1, 'no horizontal overflow on mobile');
  out.mobileErrors = m.errors; assert.deepEqual(m.errors, []); await m.ctx.close();
  await writeFile(`.checks/${tag}-ui.json`, JSON.stringify(out, null, 2)); console.log('UI checks passed', JSON.stringify(out));
} finally { await browser.close(); }
