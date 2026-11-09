// Builds every obstacle in isolation and lets the autopilot attempt it in headless simulation.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const only = process.argv[2] ? process.argv[2].split(',') : null;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message + '\n' + e.stack));
await page.goto((process.env.URL || 'http://localhost:5173/') + '?test=1&q=low&bot=1');
await page.waitForFunction(() => window.__ready, null, { timeout: 60000 });
const ids = await page.evaluate(async () => { const m = window.__modules; return m.OBSTACLE_IDS; });
const list = only || ids;
console.log('obstacles:', ids.length);
const rows = [];
for (const id of list) {
  const r = await page.evaluate((id) => {
    const g = window.__game;
    try {
      g.startSandbox([id]);
      const res = g.simulate(120);
      return { id, ...res, len: g.course.path.length, finishS: g.course.finishS };
    } catch (e) { return { id, error: String(e && e.stack || e) }; }
  }, id);
  rows.push(r);
  console.log(r.error ? `ERR ${id}: ${r.error.split('\n').slice(0, 3).join(' | ')}` : `${r.finished ? 'OK ' : 'FAIL'} ${id.padEnd(18)} t=${r.simTime.toFixed(1)}s falls=${r.falls} coins=${r.coins} s=${r.s.toFixed(1)}/${r.finishS.toFixed(1)} state=${r.state}`);
}
if (errors.length) console.log('PAGE ERRORS:\n' + [...new Set(errors)].slice(0, 10).join('\n'));
await browser.close();
