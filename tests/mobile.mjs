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
  // default touch scheme is the floating stick: drag it right with real pointer events
  const jumpVis = await page.locator('.tc-jump').isVisible();
  const boostVis = await page.locator('.tc-boost').isVisible();
  const lat0 = await page.evaluate(() => window.__game.ball.lat);
  await page.mouse.move(vp.width * 0.25, vp.height * 0.7); await page.mouse.down();
  await page.mouse.move(vp.width * 0.25 + 60, vp.height * 0.7, { steps: 4 }); // vp = this pass's viewport
  const stickOn = await page.evaluate(() => document.querySelector('.stick').classList.contains('on'));
  await page.waitForTimeout(1500);
  const lat1 = await page.evaluate(() => window.__game.ball.lat);
  await page.mouse.up();
  const box = jumpVis && boostVis;
  console.log(name, 'jump+boost buttons visible:', !!box, 'stick shown while dragging:', stickOn, 'stick steer moved ball right:', (lat1 - lat0).toFixed(2));
  await page.screenshot({ path: `${out}/m-${name}-hud.png`, timeout: 120000 });
  await ctx.close();
}
await browser.close();
