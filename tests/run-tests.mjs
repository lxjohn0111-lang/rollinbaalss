// SkyRoll automated test-suite. Requires the dev server (npm run dev) on http://localhost:5173.
//   node tests/run-tests.mjs [--quick] [--levels=1,2,3] [--seeds=5]
// Checks:
//   1. obstacle registry (>= 50 distinct obstacles with full metadata)
//   2. level design rules (20 levels, variety rules, every obstacle used, 2 gems per level)
//   3. course geometry (no self-intersections between non-adjacent sections)
//   4. autopilot playthrough of every level (must reach the finish)
//   5. endless generator rules + autopilot runs across several seeds
//   6. save persistence across a page reload
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const URL = args.url || 'http://localhost:5173/';
let failures = 0;
const ok = (cond, msg) => { console.log(`${cond ? '  PASS' : '  FAIL'}  ${msg}`); if (!cond) failures++; return cond; };

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 480, height: 270 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(URL + '?test=1&q=low&bot=1');
await page.waitForFunction(() => window.__ready, null, { timeout: 120000 });

// ------------------------------------------------------------------ 1. registry
console.log('\n[1] Obstacle registry');
const reg = await page.evaluate(async () => {
  const m = window.__modules;
  return Object.values(m.REGISTRY).map((o) => ({ id: o.id, kind: o.kind, name: o.name, category: o.category, desc: o.desc, difficulty: o.difficulty, jump: !!o.jump, build: typeof o.build }));
});
const obstacles = reg.filter((o) => o.kind === 'obstacle');
ok(obstacles.length >= 50, `${obstacles.length} distinct obstacle types (>= 50 required)`);
ok(obstacles.every((o) => o.id && o.name && o.category && o.desc && o.difficulty > 0 && o.build === 'function'), 'every obstacle has id, name, category, description, difficulty and builder');
const cats = {};
for (const o of obstacles) cats[o.category] = (cats[o.category] || 0) + 1;
console.log('        categories:', JSON.stringify(cats));
ok(new Set(obstacles.map((o) => o.name)).size === obstacles.length, 'obstacle names are unique');

// ------------------------------------------------------------------ 2. level rules
console.log('\n[2] Level design rules');
const levels = await page.evaluate(async () => {
  const m = window.__modules;
  const r = window.__modules;
  return m.LEVELS.map((l) => ({ id: l.id, name: l.name, theme: l.theme, difficulty: l.difficulty, seq: l.sections.map((s) => s[0]).filter((t) => r.REGISTRY[t].kind === 'obstacle'), cps: l.sections.filter((s) => s[0] === 'checkpoint').length }));
});
ok(levels.length >= 20, `${levels.length} handcrafted levels`);
ok(new Set(levels.map((l) => l.name)).size === levels.length, 'level names are unique');
let consecutiveOk = true, pairOk = true;
for (const l of levels) {
  for (let i = 1; i < l.seq.length; i++) if (l.seq[i] === l.seq[i - 1]) { consecutiveOk = false; console.log(`        consecutive repeat in ${l.name}: ${l.seq[i]}`); }
  const pairs = new Set();
  for (let i = 1; i < l.seq.length; i++) { const p = l.seq[i - 1] + '>' + l.seq[i]; if (pairs.has(p)) { pairOk = false; console.log(`        repeated combination in ${l.name}: ${p}`); } pairs.add(p); }
}
ok(consecutiveOk, 'no obstacle type appears in two consecutive obstacle sections');
ok(pairOk, 'no obstacle combination repeats within a level');
const seqKeys = levels.map((l) => l.seq.join(','));
ok(new Set(seqKeys).size === levels.length, 'every level has a unique obstacle sequence');
const triples = new Map(); let tripleOk = true;
levels.forEach((l, li) => { for (let i = 2; i < l.seq.length; i++) { const k = l.seq.slice(i - 2, i + 1).join('>'); if (triples.has(k) && triples.get(k) !== li) { tripleOk = false; console.log(`        shared 3-obstacle run "${k}" in levels ${triples.get(k) + 1} and ${li + 1}`); } triples.set(k, li); } });
ok(tripleOk, 'no 3-obstacle sequence is reused between levels');
const seen = new Set(); let introOk = true;
levels.forEach((l, i) => { const fresh = l.seq.filter((t) => !seen.has(t)); if (i < 18 && fresh.length === 0) { introOk = false; console.log(`        ${l.name} introduces nothing new`); } l.seq.forEach((t) => seen.add(t)); });
ok(introOk, 'each of levels 1-18 introduces at least one new mechanic');
const unused = obstacles.filter((o) => !seen.has(o.id)).map((o) => o.id);
ok(unused.length === 0, `every obstacle appears in the campaign${unused.length ? ' (unused: ' + unused.join(', ') + ')' : ''}`);
ok(levels.every((l) => l.cps >= 1), 'every level has at least one checkpoint');
ok(levels.every((l, i) => i === 0 || l.difficulty >= levels[i - 1].difficulty - 1), 'difficulty ramps across the campaign');

// ------------------------------------------------------------------ 3/4. build + playthrough
console.log('\n[3/4] Level build, geometry and autopilot playthrough');
const which = args.levels ? String(args.levels).split(',').map(Number) : levels.map((l) => l.id);
for (const id of which) {
  const r = await page.evaluate((idx) => {
    const g = window.__game;
    const t0 = performance.now();
    g.startLevel(idx);
    return new Promise((res) => setTimeout(() => {
      const c = g.course;
      const build = performance.now() - t0;
      // geometry: path self-intersection between non-adjacent sections
      const P = c.path; let overlaps = 0; let worst = null;
      for (let i = 0; i < P.count; i += 2) for (let j = i + 2; j < P.count; j += 2) {
        if (Math.abs(P.sec[i] - P.sec[j]) <= 1) continue;
        const a = P.p[i], b = P.p[j];
        const dh = Math.hypot(a.x - b.x, a.z - b.z), dv = Math.abs(a.y - b.y);
        if (dh < 6 && dv < 5) { overlaps++; worst = worst || { a: c.sections[P.sec[i]].type, b: c.sections[P.sec[j]].type, dh: dh.toFixed(1), dv: dv.toFixed(1) }; }
      }
      const gems = c.gems.length, coins = c.coins.total, length = c.finishS;
      const sim = g.simulate(600);
      res({ build, overlaps, worst, gems, coins, length, ...sim, time: g.run.time, coinsGot: g.run.coins, blocks: g.run.blocks, result: g.lastResult ? { score: g.lastResult.score, stars: g.lastResult.stars } : null });
    }, 60));
  }, id - 1);
  const l = levels[id - 1];
  console.log(`        L${String(id).padStart(2)} ${l.name.padEnd(22)} len=${r.length.toFixed(0)}m build=${r.build.toFixed(0)}ms gems=${r.gems} coins=${r.coinsGot}/${r.coins} falls=${r.falls} time=${r.time.toFixed(1)}s ${r.finished ? 'FINISHED' : 'stuck at ' + r.s.toFixed(0) + 'm'} ${r.result ? 'score=' + r.result.score + ' stars=' + r.result.stars : ''}`);
  ok(r.overlaps === 0, `L${id} course does not intersect itself${r.worst ? ' (' + JSON.stringify(r.worst) + ')' : ''}`);
  ok(r.gems === 2, `L${id} has 2 gems`);
  ok(r.finished, `L${id} completed by autopilot (falls: ${r.falls})`);
}

// ------------------------------------------------------------------ 5. endless
console.log('\n[5] Endless mode');
const seeds = Number(args.seeds || 6);
const gen = await page.evaluate(async (seeds) => {
  const m = window.__modules;
  const out = [];
  for (let s = 1; s <= seeds; s++) {
    const gnr = new m.EndlessGenerator(s * 7777);
    const defs = gnr.initial();
    let dist = 0;
    for (let i = 0; i < 80; i++) { dist += 60; defs.push(...gnr.next(dist)); }
    const obs = gnr.history;
    let imm = 0, pairRep = 0, window8 = 0; const pairs = [];
    for (let i = 1; i < obs.length; i++) {
      if (obs[i] === obs[i - 1]) imm++;
      const p = obs[i - 1] + '>' + obs[i];
      if (pairs.slice(-40).includes(p)) pairRep++;
      pairs.push(p);
      if (obs.slice(Math.max(0, i - 6), i).includes(obs[i])) window8++;
    }
    out.push({ seed: s, theme: gnr.theme, count: obs.length, unique: new Set(obs).size, imm, pairRep, window8, maxHeading: gnr.heading });
  }
  return out;
}, seeds);
for (const g of gen) console.log(`        seed ${g.seed}: theme=${g.theme} obstacles=${g.count} unique=${g.unique} immediateRepeats=${g.imm} repeatedPairs=${g.pairRep} repeatsWithin6=${g.window8}`);
ok(gen.every((g) => g.imm === 0), 'endless never repeats an obstacle immediately');
ok(gen.every((g) => g.pairRep === 0), 'endless never repeats a recent obstacle combination');
ok(gen.every((g) => g.window8 === 0), 'endless keeps at least 6 different obstacles between repeats');
ok(gen.every((g) => g.unique >= 40), 'endless draws from a large pool (>= 40 unique per 80 obstacles)');
for (let s = 1; s <= Math.min(seeds, Number(args.endlessRuns || 4)); s++) {
  const r = await page.evaluate((seed) => {
    const g = window.__game;
    g.params.seed = seed;
    g.startEndless();
    return new Promise((res) => setTimeout(() => {
      let sim;
      try { sim = g.simulate(900); } catch (e) { res({ error: String(e.stack || e) }); return; }
      const live = g.course ? g.course.sections.filter((x) => !x.removed).length : 0;
      res({ ...sim, live, total: g.course ? g.course.sections.length : 0, over: g.state });
    }, 60));
  }, s * 31337);
  if (r.error) { ok(false, `endless seed ${s} crashed: ${r.error}`); continue; }
  console.log(`        endless run seed ${s}: distance=${r.dist.toFixed(0)}m state=${r.over} sections generated=${r.total} live=${r.live}`);
  ok(r.dist > 300, `endless run ${s} progressed > 300 m with autopilot`);
  ok(r.live < 30, `endless run ${s} streams sections (live ${r.live} of ${r.total})`);
}

// ------------------------------------------------------------------ 6. save persistence
console.log('\n[6] Save system');
await page.evaluate(() => { const s = window.__game.save; s.data.coins = 4321; s.data.levels[3] = { done: true, bestScore: 999, stars: 2, gems: [1], bestTime: 50, coins: 30 }; s.data.settings.music = 0.33; s.data.endless.bestDistance = 1234; s.flush(); });
await page.reload();
await page.waitForFunction(() => window.__ready, null, { timeout: 120000 });
const saved = await page.evaluate(() => { const d = window.__game.save.data; return { coins: d.coins, l3: d.levels[3], music: d.settings.music, best: d.endless.bestDistance }; });
ok(saved.coins === 4321 && saved.l3 && saved.l3.bestScore === 999 && saved.music === 0.33 && saved.best === 1234, 'progress, records and settings persist across reload');
await page.evaluate(() => { localStorage.clear(); });

ok(errors.length === 0, `no page errors${errors.length ? ': ' + [...new Set(errors)].slice(0, 5).join(' | ') : ''}`);
console.log(`\n${failures ? failures + ' FAILURE(S)' : 'ALL TESTS PASSED'}`);
await browser.close();
process.exit(failures ? 1 : 0);
