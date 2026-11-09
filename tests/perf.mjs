// Build-time and scenery-update cost check.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 480, height: 270 } });
page.on('pageerror', (e) => console.log('ERR', e.message));
await page.goto((process.env.URL || 'http://localhost:5173/') + '?test=1&q=high&bot=1');
await page.waitForFunction(() => window.__ready, null, { timeout: 60000 });
const r = await page.evaluate(() => {
  const g = window.__game; const out = {};
  for (const lv of [1, 12, 15, 17, 20]) {
    const L = window.__modules.LEVELS[lv - 1]; const t0 = performance.now();
    g.buildCourse(L.theme, window.__levelDefs(L), { speed: L.speed, palette: L.palette });
    out['L' + lv + ' build ms'] = Math.round(performance.now() - t0);
  }
  for (const theme of ['alpine', 'metropolis', 'desert']) {
    const gen = new window.__modules.EndlessGenerator(99, theme);
    g.endless = gen; g.endlessQueue = []; g.mode = 'endless';
    g.buildCourse(theme, gen.initial(), { speed: 10 }); g.run = g.newRun({ endless: true }); g.state = 'playing';
    let maxEnv = 0, maxStream = 0, tot = 0, n = 0;
    for (let i = 0; i < 120 * 60 && g.state === 'playing'; i++) {
      const a = performance.now();
      g.fixedStep(1 / 120, g.bot.compute(1 / 120));
      maxStream = Math.max(maxStream, performance.now() - a);
      if (i % 2 === 0) { const f0 = performance.now(); g.frameUpdate(1 / 60); maxStream = Math.max(maxStream, performance.now() - f0); const b = performance.now(); g.course.env.update(g.ball.curPos, 1 / 60); const e = performance.now() - b; maxEnv = Math.max(maxEnv, e); tot += e; n++; }
    }
    out['endless ' + theme] = { dist: Math.round(g.ball.s), maxEnvUpdateMs: maxEnv.toFixed(1), avgEnvMs: (tot / n).toFixed(2), maxFixedStepMs: maxStream.toFixed(1) };
  }
  return out;
});
console.log(JSON.stringify(r, null, 1));
await browser.close();
