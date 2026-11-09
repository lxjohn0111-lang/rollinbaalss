// Mobile layout check: node tests/mobile.mjs <outdir>
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const out = process.argv[2];
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const [name, vp] of [['portrait', { width: 390, height: 844 }], ['landscape', { width: 844, height: 390 }]]) {
  const ctx = await browser.newContext({ ...devices['iPhone 13'], viewport: vp, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('ERR', e.message));
  await page.goto((process.env.URL || 'http://localhost:5173/') + '?q=low');
  await page.waitForFunction(() => window.__ready, null, { timeout: 120000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/m-${name}-menu.png`, timeout: 120000 });
  await page.locator('.ui-btn', { hasText: 'PLAY' }).first().tap();
  await page.waitForFunction(() => window.__game.mode === 'level' && window.__game.state === 'playing', null, { timeout: 120000 });
  // hold the right button briefly to verify touch steering
  const box = await page.locator('.tc-right').boundingBox();
  const lat0 = await page.evaluate(() => window.__game.ball.lat);
  await page.evaluate(() => window.__game.input.setButton('right', true));
  await page.waitForTimeout(1500);
  const lat1 = await page.evaluate(() => window.__game.ball.lat);
  await page.evaluate(() => window.__game.input.setButton('right', false));
  console.log(name, 'touch controls visible:', !!box, 'steer moved ball right:', (lat1 - lat0).toFixed(2));
  await page.screenshot({ path: `${out}/m-${name}-hud.png`, timeout: 120000 });
  await ctx.close();
}
await browser.close();
