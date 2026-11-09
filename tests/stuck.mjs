// Report where falls happen in a level: node tests/stuck.mjs <level> [seconds]
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [,, lv, secs = '240'] = process.argv;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 320, height: 200 } });
page.on('pageerror', (e) => console.log('ERR', e.message));
await page.goto((process.env.URL || 'http://localhost:5173/') + '?test=1&q=low&bot=1');
await page.waitForFunction(() => window.__ready, null, { timeout: 60000 });
const out = await page.evaluate(({ lv, secs }) => {
  const g = window.__game; const L = window.__modules.LEVELS[lv - 1];
  g.mode = 'level'; g.levelIndex = lv - 1; g.buildCourse(L.theme, window.__levelDefs(L), { speed: L.speed, palette: L.palette }); g.run = g.newRun({}); g.state = 'playing'; g.goTime = 0;
  const falls = {}; let lastF = 0;
  for (let i = 0; i < secs * 120; i++) {
    const prevS = g.ball.s; const sec = g.course.sectionAtS(prevS);
    g.fixedStep(1 / 120, g.state === 'playing' ? g.bot.compute(1 / 120) : { steer: 0 });
    if (i % 2 === 0) g.frameUpdate(1 / 60);
    if (g.run.falls > lastF) { lastF = g.run.falls; const l = sec.B.toLocal(g.ball.curPos); const k = `${sec.index}:${sec.type}`; falls[k] = falls[k] || []; falls[k].push(`d=${l.d.toFixed(1)} x=${l.x.toFixed(1)} why=${g.dieReason}`); }
    if (g.state === 'finishing') break;
  }
  return { falls, state: g.state, s: g.ball.s, secs: g.course.sections.map((s) => `${s.index}:${s.type}@${s.s0.toFixed(0)}`).join(' ') };
}, { lv: +lv, secs: +secs });
console.log(out.secs);
for (const [k, v] of Object.entries(out.falls)) console.log(k, v.length, v.slice(0, 4).join(' | '));
console.log('end', out.state, out.s.toFixed(0));
await browser.close();
