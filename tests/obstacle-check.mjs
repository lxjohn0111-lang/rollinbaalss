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
      // path sanity: consecutive samples must keep moving forward (no doubling back)
      const P = g.course.path; let back = 0;
      for (let i = 2; i < P.count; i++) { const a = P.p[i - 2], b = P.p[i - 1], c = P.p[i]; const ux = b.x - a.x, uz = b.z - a.z, vx = c.x - b.x, vz = c.z - b.z; const la = Math.hypot(ux, uz), lb = Math.hypot(vx, vz); if (la > 0.05 && lb > 0.05 && (ux * vx + uz * vz) / (la * lb) < -0.5 && P.sec[i] === P.sec[i - 2]) back++; }
      const res = g.simulate(120);
      res.pathBack = back;
      return { id, ...res, len: g.course.path.length, finishS: g.course.finishS };
    } catch (e) { return { id, error: String(e && e.stack || e) }; }
  }, id);
  rows.push(r);
  console.log(r.error ? `ERR ${id}: ${r.error.split('\n').slice(0, 3).join(' | ')}` : `${r.finished ? 'OK ' : 'FAIL'} ${id.padEnd(18)} t=${r.simTime.toFixed(1)}s falls=${r.falls} coins=${r.coins} s=${r.s.toFixed(1)}/${r.finishS.toFixed(1)} state=${r.state}${r.pathBack ? ' PATH-DOUBLES-BACK x' + r.pathBack : ''}`);
}
if (errors.length) console.log('PAGE ERRORS:\n' + [...new Set(errors)].slice(0, 10).join('\n'));
await browser.close();
