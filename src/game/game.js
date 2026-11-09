// Game orchestration: modes, fixed-step simulation, scoring, checkpoints, respawn and results.
import * as THREE from 'three';
import { Engine } from '../core/engine.js';
import { Input } from '../core/input.js';
import { FIXED_DT, initPhysics } from '../core/physics.js';
import { setAnisotropy } from '../gfx/textures.js';
import { Effects } from '../gfx/effects.js';
import { Course } from './course.js';
import { Ball } from './ball.js';
import { FollowCamera } from './camera.js';
import { Bot } from './bot.js';
import { REGISTRY } from './obstacles/index.js';
import { LEVELS, buildLevelDefs } from './levels.js';
import { EndlessGenerator } from './endless.js';
import { THEMES } from '../gfx/environments.js';

const UP = new THREE.Vector3(0, 1, 0);

export class Game {
  constructor({ container, save, audio, ui, params }) {
    this.container = container;
    this.save = save; this.audio = audio; this.ui = ui; this.params = params || {};
    this.engine = new Engine(container);
    this.input = new Input(container);
    this.effects = new Effects(this.engine);
    this.cam = new FollowCamera(this.engine);
    this.ball = new Ball(this);
    this.bot = new Bot(this);
    this.course = null;
    this.state = 'boot';
    this.mode = null;
    this.time = 0; this.acc = 0; this.last = performance.now();
    this.run = null;
    this.paused = false;
    this.timeScale = 1;
    this.frameTimes = [];
    this.fps = 60;
    this.useBot = false;
    this.pathDir = new THREE.Vector3(0, 0, -1);
    this.tmp = new THREE.Vector3();
    this.sample = {};
    this.applySettings();
    this.input.on('pause', () => this.togglePause());
    this.input.on('restart', () => { if (this.state === 'playing' || this.state === 'dying') this.restartCheckpoint(); });
    this.loop = this.loop.bind(this);
  }

  async init() {
    await initPhysics();
    requestAnimationFrame(this.loop);
  }

  applySettings() {
    const s = this.save.data.settings;
    this.engine.setQuality(this.params.q || s.quality);
    setAnisotropy(this.engine.preset.aniso);
    this.input.touchMode = s.touchMode;
    if (this.audio) { this.audio.setVolumes(s.music, s.sfx); }
    if (this.ball.skinId) this.ball.setSkin(this.save.data.skin, s.quality);
  }

  sfx(name, k) { if (this.audio && this.mode !== 'demo' && !this.headless) this.audio.sfx(name, k); }

  // ------------------------------------------------------------ course lifecycle
  disposeCourse() {
    if (this.course) {
      this.ball.detach();
      this.course.dispose();
      this.course = null;
      this.effects.clear();
    }
  }

  buildCourse(themeId, defs, opts = {}) {
    this.disposeCourse();
    this.time = 0; this.acc = 0;
    const course = new Course(this, { themeId, palette: opts.palette });
    course.baseSpeed = opts.speed || 10;
    try {
      for (const d of defs) course.addSection(d, REGISTRY);
    } catch (e) {
      course.dispose();
      throw e;
    }
    this.course = course;
    this.ball.setSkin(opts.skin || this.save.data.skin, this.save.data.settings.quality);
    this.ball.baseSpeed = course.baseSpeed;
    const start = course.sections[0].B;
    const p = start.W(0, 0.55, 2);
    course.spawn = { pos: p, s: 2, section: 0 };
    course.path.sampleAt(2, this.sample);
    this.ball.attach(course, p, this.sample.t);
    this.bot.reset();
    this.cam.reset(p, this.sample.t);
    course.env.update(this.engine.camera.position, 0, true);
    return course;
  }

  // ------------------------------------------------------------ modes
  startDemo() {
    const pick = [0, 4, 8, 12, 2][Math.floor(Math.random() * 5)];
    const lvl = LEVELS[pick];
    this.mode = 'demo';
    this.useBot = true;
    this.buildCourse(lvl.theme, buildLevelDefs(lvl), { speed: lvl.speed, palette: lvl.palette });
    this.run = this.newRun({ demo: true, level: pick });
    this.state = 'playing';
    this.cam.mode = 'cinematic';
    this.audio && this.audio.playMusic(THEMES[lvl.theme].music);
  }

  newRun(extra = {}) {
    return { coins: 0, picked: 0, gems: [], falls: 0, time: 0, blocks: 0, sets: 0, bonus: 0, checkpoint: null, distance: 0, score: 0, finished: false, ...extra };
  }

  startLevel(index) {
    const lvl = LEVELS[index];
    if (!lvl) return;
    this.ui.showLoading(lvl.name);
    // allow loading overlay to paint
    setTimeout(() => {
      this.mode = 'level';
      this.levelIndex = index;
      this.useBot = !!this.params.bot;
      const defs = buildLevelDefs(lvl);
      this.buildCourse(lvl.theme, defs, { speed: lvl.speed, palette: lvl.palette });
      this.run = this.newRun({ level: index, totalCoins: this.course.coins.total, totalGems: this.course.gems.length });
      this.state = 'playing';
      this.ui.hideLoading();
      this.ui.showHUD({ mode: 'level', title: `LEVEL ${index + 1}`, name: lvl.name, difficulty: lvl.difficulty, checkpoints: this.course.checkpoints.map((c) => c.s / this.course.finishS) });
      this.ui.toast(lvl.name, lvl.tagline || THEMES[lvl.theme].name, 2.6);
      this.audio && this.audio.playMusic(THEMES[lvl.theme].music);
      this.save.data.stats.plays++;
    }, 30);
  }

  startEndless() {
    this.ui.showLoading('Endless Run');
    setTimeout(() => {
      this.mode = 'endless';
      this.useBot = !!this.params.bot;
      const seed = this.params.seed ? Number(this.params.seed) : (Math.random() * 1e9) | 0;
      this.endless = new EndlessGenerator(seed);
      this.endlessQueue = [];
      const first = this.endless.initial();
      this.buildCourse(this.endless.theme, first, { speed: 10 });
      this.run = this.newRun({ endless: true, seed });
      this.state = 'playing';
      this.ui.hideLoading();
      this.ui.showHUD({ mode: 'endless', title: 'ENDLESS', name: THEMES[this.endless.theme].name });
      this.audio && this.audio.playMusic(THEMES[this.endless.theme].music);
      this.save.data.stats.plays++;
    }, 30);
  }

  startSandbox(types, theme = 'metropolis') {
    const defs = [{ type: 'start' }, ...types.map((t) => (typeof t === 'string' ? { type: t } : t)), { type: 'finish' }];
    this.mode = 'level';
    this.levelIndex = -1;
    this.useBot = !!this.params.bot;
    this.buildCourse(theme, defs, { speed: Number(this.params.speed) || 10 });
    this.run = this.newRun({ sandbox: true, totalCoins: this.course.coins.total, totalGems: this.course.gems.length });
    this.state = 'playing';
    this.ui.showHUD({ mode: 'level', title: 'TEST', name: types.join(' + '), checkpoints: [] });
  }

  toMenu() {
    this.paused = false;
    this.ui.hideHUD();
    this.startDemo();
    this.ui.showMenu();
  }

  // ------------------------------------------------------------ pause & restart
  togglePause() {
    if (this.mode === 'demo' || !this.course) return;
    if (this.state !== 'playing' && this.state !== 'dying' && !this.paused) return;
    this.paused = !this.paused;
    if (this.paused) { this.ui.showPause(); this.audio && this.audio.duck(true); }
    else { this.ui.hidePause(); this.audio && this.audio.duck(false); this.last = performance.now(); }
  }

  restartLevel() {
    this.paused = false; this.ui.hidePause();
    if (this.mode === 'level' && this.levelIndex >= 0) this.startLevel(this.levelIndex);
    else if (this.mode === 'endless') this.startEndless();
  }

  restartCheckpoint() {
    if (this.paused) { this.paused = false; this.ui.hidePause(); }
    if (this.mode === 'endless') { this.killBall('restart'); return; }
    if (this.state === 'playing' || this.state === 'dying') this.respawn(true);
  }

  // ------------------------------------------------------------ death & respawn
  killBall(reason) {
    if (this.state !== 'playing') return;
    this.state = 'dying';
    this.dieT = 0;
    this.dieReason = reason;
    if (this.mode !== 'demo') { this.run.falls++; this.save.data.stats.falls++; }
    this.cam.mode = reason === 'fall' ? 'fall' : 'follow';
    this.sfx('fail');
    if (reason !== 'fall') { this.effects.impact(this.ball.curPos, '#ff6040'); this.cam.shake(0.8); }
    if (this.mode === 'level') this.ui.flash(reason === 'fall' ? 'OUCH!' : reason === 'crushed' ? 'CRUSHED!' : reason === 'zapped' ? 'ZAPPED!' : reason === 'smashed' ? 'SMASHED!' : 'OOPS!');
  }

  respawn(manual = false) {
    const c = this.course;
    let cp = this.run.checkpoint;
    if (this.mode === 'endless') { this.endRun(); return; }
    const spawn = cp ? { pos: cp.pos.clone().add(new THREE.Vector3(0, 0.55, 0)), s: cp.s, section: cp.section } : c.spawn;
    c.path.sampleAt(spawn.s, this.sample);
    this.ball.respawn(spawn.pos, this.sample.t);
    c.resetFrom(spawn.section, this.time);
    this.cam.reset(spawn.pos, this.sample.t);
    if (this.mode === 'demo') this.cam.mode = 'cinematic';
    this.bot.reset();
    this.state = 'playing';
    this.ui.respawnFade();
    if (manual) this.sfx('respawn');
  }

  endRun() {
    this.state = 'over';
    const r = this.run;
    const dist = Math.floor(r.distance);
    const score = Math.floor(dist * 2 + r.coins * 10 + r.bonus);
    r.score = score;
    const rec = this.save.recordEndless(dist, score, r.coins);
    this.save.addCoins(r.coins);
    this.ui.hideHUD();
    this.ui.showGameOver({ distance: dist, score, coins: r.coins, bestDistance: this.save.data.endless.bestDistance, bestScore: this.save.data.endless.bestScore, newRecord: rec });
    this.checkAchievements();
  }

  finishLevel() {
    if (this.run.finished) return;
    this.run.finished = true;
    this.state = 'finishing';
    this.finishT = 0;
    this.effects.confettiBurst(this.ball.curPos.clone().addScaledVector(this.ball.fwd, 6).add(new THREE.Vector3(0, 2, 0)));
    this.sfx('finish');
    this.cam.mode = 'orbit';
    if (this.mode === 'demo') return;
    const lvl = LEVELS[this.levelIndex];
    const r = this.run;
    const coinPct = r.totalCoins ? Math.min(1, r.picked / r.totalCoins) : 1;
    const par = lvl && lvl.par ? lvl.par : Math.round(this.course.finishS / this.course.baseSpeed * 1.25 + 10);
    const timeBonus = Math.max(0, Math.round((par - r.time) * 15));
    const noFall = r.falls === 0 ? 500 : 0;
    const score = r.coins * 10 + r.gems.length * 250 + timeBonus + noFall + r.bonus;
    let stars = 1; if (coinPct >= 0.6) stars = 2; if (coinPct >= 0.85 && r.falls <= 1) stars = 3;
    r.score = score; r.stars = stars;
    const result = { level: this.levelIndex, score, coins: r.coins, picked: r.picked, totalCoins: r.totalCoins, gems: r.gems, totalGems: r.totalGems, time: r.time, falls: r.falls, stars, timeBonus, noFall, bonus: r.bonus, completionBonus: 50 + this.levelIndex * 10 };
    if (this.levelIndex >= 0) {
      result.prev = this.save.levelRecord(this.levelIndex);
      result.newBest = this.save.recordLevel(this.levelIndex, result);
      this.save.addCoins(r.coins + result.completionBonus);
    }
    this.lastResult = result;
    this.checkAchievements();
  }

  checkAchievements() {
    const unlocked = this.save.evaluateAchievements(this.run);
    for (const a of unlocked) this.ui.achievement(a);
  }

  bonus(label, coins) {
    if (!this.run || this.mode === 'demo') return;
    this.run.bonus += coins * 10;
    this.run.coins += coins;
    this.ui.popup(`${label} +${coins}`, 'gold');
    this.sfx('bonus');
  }

  // ------------------------------------------------------------ headless simulation (tests)
  simulate(seconds, { stopOnFinish = true } = {}) {
    const steps = Math.round(seconds / FIXED_DT);
    let i = 0;
    for (; i < steps; i++) {
      const inp = this.state === 'playing' ? this.bot.compute(FIXED_DT) : { steer: 0, jump: false };
      this.fixedStep(FIXED_DT, inp);
      if (i % 2 === 0) this.frameUpdate(FIXED_DT * 2);
      if (stopOnFinish && (this.state === 'results' || this.state === 'over' || this.state === 'finishing')) break;
    }
    return { simTime: i * FIXED_DT, state: this.state, s: this.ball.s, falls: this.run ? this.run.falls : 0, coins: this.run ? this.run.coins : 0, finished: !!(this.run && this.run.finished), dist: this.run ? this.run.distance : 0 };
  }

  // ------------------------------------------------------------ main loop
  loop(now) {
    requestAnimationFrame(this.loop);
    let dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.frameTimes.push(dt); if (this.frameTimes.length > 30) this.frameTimes.shift();
    this.fps = 1 / (this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length);
    if (this.headless) return;
    if (!this.course) { this.engine.render(); return; }
    if (!this.paused && this.state !== 'boot') this.update(dt * this.timeScale);
    this.renderFrame(dt);
  }

  update(dt) {
    const inputRaw = this.input.sample(dt);
    this.acc += dt;
    let steps = 0;
    let jumpEdge = inputRaw.jump;
    while (this.acc >= FIXED_DT && steps < 6) {
      this.acc -= FIXED_DT; steps++;
      let inp = this.useBot && this.state === 'playing' ? this.bot.compute(FIXED_DT) : { ...inputRaw, jump: jumpEdge };
      jumpEdge = false;
      if (this.state !== 'playing') inp = { steer: 0, jump: false };
      this.fixedStep(FIXED_DT, inp);
    }
    if (steps >= 6) this.acc = 0;
    this.frameUpdate(dt);
  }

  fixedStep(dt, inp) {
    const c = this.course, ball = this.ball;
    const sec = c.sectionAtS(ball.s);
    ball.preStep();
    if (this.state === 'playing' || this.state === 'finishing' || this.state === 'dying') ball.control(dt, inp, sec);
    c.stepUpdate(this.time, dt, ball.s);
    c.physics.step();
    ball.postStep();
    this.time += dt;
    if (this.state === 'playing') this.run.time += dt;
    // events
    for (const e of ball.events) this.handleBallEvent(e);
    ball.events.length = 0;
    if (this.state !== 'playing') return;
    // triggers
    for (let i = Math.max(0, sec.index - 1); i <= Math.min(c.sections.length - 1, sec.index + 1); i++) {
      const s2 = c.sections[i];
      if (!s2.triggers.length) continue;
      const lp = s2.B.toLocal(ball.curPos); const lv = s2.B.V(lp.x, lp.y, lp.d);
      for (const tr of s2.triggers) {
        const inside = Math.abs(lv.x - tr.c.x) < tr.hw && Math.abs(lv.y - tr.c.y) < tr.hh && Math.abs(lv.z - tr.c.z) < tr.hl;
        if (inside && !tr.inside) { tr.inside = true; if (!tr.fired || tr.repeat) { tr.fired = true; tr.cb(ball); } }
        else if (!inside) tr.inside = false;
      }
    }
    // fall detection
    if (ball.curPos.y < ball.pathY - 9 || Math.abs(ball.lat) > 40) { this.killBall('fall'); return; }
    // checkpoints
    for (const cp of c.checkpoints) {
      if (!cp.active && ball.s >= cp.s && ball.grounded) {
        cp.active = true; this.run.checkpoint = cp;
        if (cp.flag) cp.flag.set(true);
        if (this.mode !== 'demo') { this.ui.popup('CHECKPOINT', 'green'); this.sfx('checkpoint'); this.ui.checkpointReached(c.checkpoints.indexOf(cp)); }
      }
    }
    // finish
    if (this.mode !== 'endless' && ball.s >= c.finishS) this.finishLevel();
  }

  streamEndless() {
    const c = this.course, ball = this.ball;
    // amortized streaming: plan ahead into a queue, build at most one section per frame
    if (!this.endlessQueue) this.endlessQueue = [];
    const ahead = c.path.length - ball.s;
    if (!this.endlessQueue.length && ahead < 320) this.endlessQueue.push(...this.endless.next(ball.s));
    if (this.endlessQueue.length && ahead < 380) c.addSection(this.endlessQueue.shift(), REGISTRY);
    for (const sec of c.sections) {
      if (!sec.removed && sec.s1 < ball.s - 140) c.removeSection(sec);
    }
    this.run.distance = Math.max(this.run.distance, ball.s);
    this.ball.speedMul = this.endless.speedMulAt(ball.s);
  }

  handleBallEvent(e) {
    const ball = this.ball;
    if (e.type === 'land') {
      const k = Math.min(1, e.impact / 14);
      this.effects.landDust(ball.curPos, e.impact);
      this.cam.shake(0.15 + k * 0.5);
      this.sfx('land', k);
      if (e.air > 0.9 && this.state === 'playing' && this.mode !== 'demo') this.ui.popup(e.air > 1.5 ? 'HUGE AIR!' : 'NICE LANDING', 'blue');
    } else if (e.type === 'jump') { this.sfx('jump'); }
    else if (e.type === 'spring') { this.sfx('spring'); this.cam.shake(0.3); }
    else if (e.type === 'bump') { this.sfx('bump'); this.cam.shake(0.45); this.effects.impact(ball.curPos, '#ff3b6b'); }
    else if (e.type === 'hazard') { if (e.info.kill) this.killBall(e.info.kill); }
  }

  frameUpdate(dt) {
    const c = this.course, ball = this.ball;
    if (this.mode === 'endless' && this.state === 'playing') this.streamEndless();
    // coins & gems
    c.coins.update(this.time, dt, ball.curPos, (id, x, y, z) => {
      if (this.mode !== 'demo') { this.run.coins++; this.run.picked++; this.save.data.stats.coinsCollected++; }
      this.effects.coinBurst(this.tmp.set(x, y, z));
      this.sfx('coin');
    });
    for (const g of c.gems) {
      if (g.taken || !g.mesh.parent) continue;
      if (g.pos.distanceToSquared(ball.curPos) < 1.3) {
        g.taken = true; c.root.remove(g.mesh); this.effects.gemBurst(g.pos);
        if (this.mode !== 'demo') { this.run.gems.push(g.id); this.ui.popup('GEM FOUND!', 'purple'); this.sfx('gem'); }
      }
    }
    // block structures
    for (const sec of c.sections) {
      if (sec.removed || !sec.sets.length) continue;
      if (Math.abs(sec.s0 - ball.s) > 120) continue;
      for (const st of sec.sets) {
        if (st.done) continue;
        let n = 0;
        for (const b of st.blocks) {
          if (!b.toppled) {
            const t = b.body.translation();
            const moved = Math.hypot(t.x - b.p0.x, t.y - b.p0.y, t.z - b.p0.z);
            const r = b.body.rotation();
            const tilt = 1 - Math.abs(new THREE.Quaternion(r.x, r.y, r.z, r.w).multiply(b.q0.clone().invert()).w);
            if (moved > 0.6 || tilt > 0.04) { b.toppled = true; if (this.mode !== 'demo') { this.run.blocks++; this.save.data.stats.blocks++; } if (Math.random() < 0.5) this.sfx('block', Math.min(1, ball.speed / 12)); }
          }
          if (b.toppled) n++;
        }
        if (!st.done && n >= Math.ceil(st.blocks.length * (st.need || 0.8))) {
          st.done = true;
          if (this.mode !== 'demo') { this.run.sets++; this.bonus(st.name + ' DOWN', st.bonus); }
          this.cam.shake(0.4);
        }
      }
    }
    c.frameUpdate(ball.curPos, ball.s);
    // dying sequence
    if (this.state === 'dying') {
      this.dieT += dt;
      if (this.dieT > (this.dieReason === 'fall' ? 1.0 : 0.7)) this.respawn();
    } else if (this.state === 'finishing') {
      this.finishT += dt;
      if (this.finishT > 2.4 && this.mode !== 'demo') { this.state = 'results'; this.ui.hideHUD(); this.ui.showResults(this.lastResult); }
      if (this.finishT > 4 && this.mode === 'demo') this.startDemo();
    }
    // speed streaks
    if (ball.boostT > 0 || ball.speed > 15) this.effects.speedStreaks(ball.curPos, ball.fwd);
    this.effects.update(dt);
    // HUD
    if (this.mode !== 'demo' && this.run && this.ui.hudVisible) {
      const prog = this.mode === 'endless' ? 0 : Math.min(1, ball.s / c.finishS);
      this.ui.updateHUD({ progress: prog, coins: this.run.coins, distance: Math.floor(this.run.distance), jump: ball.jumpAllowed, time: this.run.time, score: this.mode === 'endless' ? Math.floor(this.run.distance * 2 + this.run.coins * 10 + this.run.bonus) : null, fps: this.fps });
    }
    if (this.audio) this.audio.updateRolling(ball.grounded && this.state !== 'dying' && this.mode !== 'demo' ? ball.speed : 0, ball.groundType);
    if (this.mode !== 'demo' && this.state === 'playing') this.save.data.stats.distance += ball.speed * dt;
  }

  renderFrame(dt) {
    const c = this.course, ball = this.ball;
    const alpha = this.acc / FIXED_DT;
    ball.render(Math.min(1, alpha));
    // camera direction: average of path tangents ahead
    const s = ball.s;
    c.path.sampleAt(s + 2, this.sample, ball.pathIdx);
    this.pathDir.copy(this.sample.t);
    c.path.sampleAt(s + 7, this.sample, ball.pathIdx);
    this.pathDir.add(this.sample.t).normalize();
    const sec = c.sectionAtS(s + 2);
    this.cam.update(dt, ball, this.pathDir, sec.cam, c.physics, { shake: this.save.data.settings.shake });
    this.engine.updateSun(ball.mesh.position);
    c.env.update(this.engine.camera.position, dt);
    // keep belt textures scrolling
    if (c.mats.beltMap) c.mats.beltMap.offset.y = -(this.time * 0.9) % 1;
    this.engine.render();
    void UP;
  }
}
