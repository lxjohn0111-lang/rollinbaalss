// Render a specific spot: node tests/view.mjs "<sandbox ids or level:N>" <skipToMeters> <out.png> [quality] [theme] [w] [h]
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [,, what, skip = '0', out = 'view.png', q = 'high', theme = 'metropolis', w = '1280', h = '720'] = process.argv;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
page.on('pageerror', (e) => console.log('ERR', e.message));
await page.goto((process.env.URL || 'http://localhost:5173/') + `?test=1&q=${q}&bot=1`);
await page.waitForFunction(() => window.__ready, null, { timeout: 60000 });
await page.evaluate(({ what, skip, theme }) => {
  const g = window.__game;
  if (what.startsWith('level:')) { const lv = Number(what.slice(6)) - 1; const L = window.__modules.LEVELS[lv]; g.mode = 'level'; g.levelIndex = lv; g.buildCourse(L.theme, window.__levelDefs(L), { speed: L.speed, palette: L.palette }); g.run = g.newRun({}); g.state = 'playing'; g.ui.showHUD({ mode: 'level', title: 'LEVEL ' + (lv + 1), name: L.name, checkpoints: g.course.checkpoints.map((c) => c.s / g.course.finishS) }); }
  else g.startSandbox(what.split(','), theme);
  g.ui.hudVisible = true;
  while (g.ball.s < skip && g.time < 200) { g.fixedStep(1 / 120, g.state === 'playing' ? g.bot.compute(1 / 120) : { steer: 0 }); g.frameUpdate(1 / 120); }
  g.cam.reset(g.ball.curPos, g.ball.fwd);
  for (let i = 0; i < 90; i++) { g.update(1 / 60); g.renderFrame(1 / 60); }
  g.headless = true;
}, { what, skip: +skip, theme });
await page.screenshot({ path: out, timeout: 180000 });
await browser.close();
