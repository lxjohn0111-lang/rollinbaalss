// Trace the autopilot through one obstacle: node tests/trace.mjs <id> [seconds] [every]
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [,, id, secs = '12', every = '0.25', params = '{}'] = process.argv;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 320, height: 200 } });
page.on('pageerror', (e) => console.log('ERR', e.message));
await page.goto('http://localhost:5173/?test=1&q=low&bot=1');
await page.waitForFunction(() => window.__ready, null, { timeout: 60000 });
const out = await page.evaluate(({ id, secs, every, params }) => {
  const g = window.__game;
  g.startSandbox([{ type: id, params: JSON.parse(params) }]);
  const lines = [];
  const per = Math.round(every / (1 / 120));
  let k = 0;
  const total = Math.round(secs * 120);
  for (let i = 0; i < total; i++) {
    const inp = g.state === 'playing' ? g.bot.compute(1 / 120) : { steer: 0, jump: false };
    g.fixedStep(1 / 120, inp);
    if (i % 2 === 0) g.frameUpdate(1 / 60);
    if (i % per === 0) {
      const sec = g.course.sectionAtS(g.ball.s);
      const l = g.course.sections[1].B.toLocal(g.ball.curPos);
      lines.push(`t=${(i / 120).toFixed(2)} st=${g.state} sec=${sec.type} d=${l.d.toFixed(2)} x=${l.x.toFixed(2)} y=${l.y.toFixed(2)} v=${g.ball.speed.toFixed(1)} vy=${g.ball.vel.y.toFixed(1)} gr=${g.ball.grounded ? 1 : 0} type=${g.ball.groundType} steer=${inp.steer?.toFixed(2)} jump=${inp.jump ? 1 : 0} tgt=${g.bot.lastTarget.toFixed(2)} lat=${g.ball.lat.toFixed(2)} falls=${g.run.falls}`);
    }
    if (g.state === 'finishing') { lines.push('FINISHED'); break; }
  }
  return lines;
}, { id, secs: +secs, every: +every, params });
console.log(out.join('\n'));
await browser.close();
