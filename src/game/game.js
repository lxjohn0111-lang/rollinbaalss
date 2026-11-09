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
    this.input.touchMode = s.touchMode === 'drag' ? 'stick' : s.touchMode;
    this.input.autoAccel = s.autoAccel == null ? this.input.isTouch : !!s.autoAccel;
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
    this.ball.topSpeed = opts.top || Math.round(course.baseSpeed * 1.32 * 10) / 10;
    this.ball.speedMul = 1;
    this.ball.boostMeter = 35;
    const start = course.sections[0].B;
    const p = start.W(0, 0.55, 2);
    course.spawn = { pos: p, s: 2, section: 0 };
    course.path.sampleAt(2, this.sample);
    this.ball.respawnSpeed = opts.startSpeed ?? 3;
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
    this.buildCourse(lvl.theme, buildLevelDefs(lvl), { speed: lvl.speed, top: lvl.top, palette: lvl.palette });
    this.run = this.newRun({ demo: true, level: pick });
    this.goTime = this.time;
    this.state = 'playing';
    this.cam.mode = 'cinematic';
    this.audio && this.audio.playMusic(THEMES[lvl.theme].music);
  }

  newRun(extra = {}) {
    return { coins: 0, picked: 0, gems: [], falls: 0, time: 0, blocks: 0, sets: 0, bonus: 0, checkpoint: null, distance: 0, score: 0, points: 0, combo: 1, comboT: 0, bestCombo: 1, tricks: 0, perfect: 0, nearMiss: 0, coinStreak: 0, lastCoinT: -9, zones: 0, finished: false, ...extra };
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
      this.buildCourse(lvl.theme, defs, { speed: lvl.speed, top: lvl.top, palette: lvl.palette, startSpeed: this.useBot ? 3 : 0 });
      this.run = this.newRun({ level: index, totalCoins: this.course.coins.total, totalGems: this.course.gems.length });
      this.ui.hideLoading();
      this.ui.showHUD({ mode: 'level', title: `LEVEL ${index + 1}`, name: lvl.name, difficulty: lvl.difficulty, checkpoints: this.course.checkpoints.map((c) => c.s / this.course.finishS) });
      this.ui.toast(lvl.name, lvl.tagline || THEMES[lvl.theme].name, 2.6);
      this.tutorial = index === 0 ? { stage: 0 } : null;
      this.beginIntro();
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
      this.endless = new EndlessGenerator(seed); this.zoneSpeed = 1;
      this.endlessQueue = [];
      const first = this.endless.initial();
      this.buildCourse(this.endless.theme, first, { speed: 10, startSpeed: this.useBot ? 3 : 0 });
      this.run = this.newRun({ endless: true, seed });
      this.ui.hideLoading();
      this.ui.showHUD({ mode: 'endless', title: 'ENDLESS', name: THEMES[this.endless.theme].name });
      this.tutorial = null;
      this.beginIntro();
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
    this.state = 'playing'; this.goTime = this.time;
    this.ui.showHUD({ mode: 'level', title: 'TEST', name: types.join(' + '), checkpoints: [] });
  }

  // Short READY / GO opening with a camera fly-in; sections may key machinery off goTime.
  beginIntro() {
    if (this.headless || this.useBot) { this.state = 'playing'; this.goTime = this.time; return; }
    this.state = 'intro';
    this.introT = 0;
    this.goTime = Infinity;
    this.cam.startIntro(this.ball.curPos, this.ball.fwd);
    this.ui.countdown('READY');
    this.sfx('ready');
  }

  // Skill reward: points are multiplied by the running combo, which grows with each trick.
  trick(label, points, { color = 'gold', boost = 10, quiet = false } = {}) {
    if (!this.run || this.mode === 'demo') return;
    const r = this.run;
    const gained = Math.round(points * r.combo);
    r.points += gained; r.tricks++;
    r.combo = Math.min(8, r.combo + 1); r.comboT = 4.5; r.bestCombo = Math.max(r.bestCombo, r.combo);
    this.ball.boostMeter = Math.min(100, this.ball.boostMeter + boost);
    if (!quiet) this.ui.popup(`${label} +${gained}`, color);
    this.ui.combo(r.combo);
    this.sfx('trick', Math.min(1, r.combo / 8));
  }

  breakCombo() { if (this.run && this.run.combo > 1) { this.run.combo = 1; this.ui.combo(1); } }

  hint(key, text) {
    if (this.mode !== 'level' || !this.tutorial) return;
    if (this.tutorial[key]) return;
    this.tutorial[key] = true;
    this.ui.hint(text);
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
    if (this.mode !== 'demo') { this.run.falls++; this.save.data.stats.falls++; this.breakCombo(); }
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
    this.ball.respawnSpeed = 2;
    this.ball.respawn(spawn.pos, this.sample.t);
    this.ball.boostMeter = Math.max(this.ball.boostMeter, 25);
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
    const score = Math.floor(dist * 2 + r.coins * 10 + r.bonus + r.points);
    r.score = score;
    const rec = this.save.recordEndless(dist, score, r.coins);
    this.save.addCoins(r.coins);
    this.ui.hideHUD();
    this.ui.showGameOver({ distance: dist, score, coins: r.coins, combo: r.bestCombo, tricks: r.tricks, zones: r.zones, bestDistance: this.save.data.endless.bestDistance, bestScore: this.save.data.endless.bestScore, newRecord: rec });
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
    const score = r.coins * 10 + r.gems.length * 250 + timeBonus + noFall + r.bonus + r.points;
    let stars = 1; if (coinPct >= 0.6) stars = 2; if (coinPct >= 0.85 && r.falls <= 1) stars = 3;
    r.score = score; r.stars = stars;
    const result = { level: this.levelIndex, score, coins: r.coins, picked: r.picked, totalCoins: r.totalCoins, gems: r.gems, totalGems: r.totalGems, time: r.time, falls: r.falls, stars, timeBonus, noFall, bonus: r.bonus, points: r.points, bestCombo: r.bestCombo, tricks: r.tricks, completionBonus: 50 + this.levelIndex * 10 };
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
    this.trick(label, coins * 10, { boost: 20 });
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
    if (this.state === 'intro') this.updateIntro(dt);
    this.renderFrame(dt);
  }

  updateIntro(dt) {
    this.introT += dt;
    if (this.introT > 1.15 && !this.goShown) { this.goShown = true; this.ui.countdown('GO!'); this.sfx('go'); }
    if (this.introT > 1.35) {
      this.state = 'playing'; this.goShown = false; this.goTime = this.time;
      this.cam.mode = 'follow';
      if (this.tutorial) this.hint('roll', this.input.isTouch ? 'PUSH THE STICK UP TO ROLL' : 'HOLD  W  OR  ↑  TO ROLL');
    }
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
    if (this.state === 'intro') { ball.body.setLinvel({ x: 0, y: Math.min(0, ball.body.linvel().y), z: 0 }, true); ball.body.setAngvel({ x: 0, y: 0, z: 0 }, true); }
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
    // zone gates: announce the next family, reward the one just survived
    const sec = c.sectionAtS(ball.s);
    if (sec && sec.def && sec.def.zone && !sec.zoneSeen && ball.s > sec.s0 + 1) {
      sec.zoneSeen = true; const z = sec.def.zone;
      this.trick('ZONE CLEARED', 150 + 50 * (this.run.zones || 0), { color: 'green', boost: 25 });
      this.run.zones = (this.run.zones || 0) + 1; this.run.zoneName = z.name; this.zoneSpeed = z.speed || 1;
      this.ui.toast(z.name, z.sub, 2.6); this.sfx('ready');
    }
    this.ball.speedMul = this.endless.speedMulAt(ball.s) * (this.zoneSpeed || 1);
  }

  handleBallEvent(e) {
    const ball = this.ball;
    if (e.type === 'land') {
      const k = Math.min(1, e.impact / 14);
      this.effects.landDust(ball.curPos, e.impact);
      this.cam.shake(0.15 + k * 0.5);
      this.cam.landKick(k);
      this.sfx('land', k);
      if (e.air > 0.55 && this.state === 'playing' && this.mode !== 'demo') {
        const latV = Math.abs(ball.vel.dot(ball.right));
        const clean = latV < 2.6 && Math.abs(ball.lat) < 2.2 && e.impact < 19;
        if (clean) {
          const big = e.air > 1.3;
          this.trick(big ? 'PERFECT BIG AIR' : 'PERFECT LANDING', big ? 250 : 120, { color: 'blue', boost: 18 });
          this.run.perfect++;
          this.effects.shockwave(ball.curPos, big ? '#7fd0ff' : '#ffffff', big ? 4 : 2.6);
          this.sfx('perfect');
        } else this.ui.popup('LANDED', 'blue');
      }
    } else if (e.type === 'jump') { this.sfx('jump'); this.effects.shockwave(ball.curPos.clone().setY(ball.curPos.y - 0.45), '#ffffff', 1.4); }
    else if (e.type === 'boost') { this.sfx('boost'); this.cam.shake(0.2); }
    else if (e.type === 'boostpad') { this.sfx('boost'); this.cam.shake(0.25); }
    else if (e.type === 'spring') { this.sfx('spring'); this.cam.shake(0.3); }
    else if (e.type === 'bump') { this.sfx('bump'); this.cam.shake(0.45); this.effects.impact(ball.curPos, '#ff3b6b'); }
    else if (e.type === 'hazard') { if (e.info.kill) this.killBall(e.info.kill); }
  }

  frameUpdate(dt) {
    const c = this.course, ball = this.ball;
    if (this.mode === 'endless' && this.state === 'playing') this.streamEndless();
    // coins & gems
    c.coins.update(this.time, dt, ball.curPos, (id, x, y, z) => {
      if (this.mode !== 'demo') {
        const r = this.run;
        r.coins++; r.picked++; this.save.data.stats.coinsCollected++;
        r.coinStreak = this.time - r.lastCoinT < 1.1 ? r.coinStreak + 1 : 1; r.lastCoinT = this.time;
        r.points += 5 * r.combo;
        ball.boostMeter = Math.min(100, ball.boostMeter + 2.5);
        if (r.coinStreak > 0 && r.coinStreak % 10 === 0) this.trick('COIN STREAK', 100, { boost: 12 });
      }
      this.effects.coinBurst(this.tmp.set(x, y, z));
      this.sfx('coin');
    });
    for (const g of c.gems) {
      if (g.taken || !g.mesh.parent) continue;
      if (g.pos.distanceToSquared(ball.curPos) < 1.3) {
        g.taken = true; c.root.remove(g.mesh); this.effects.gemBurst(g.pos);
        if (this.mode !== 'demo') { this.run.gems.push(g.id); this.trick('GEM FOUND', 250, { color: 'purple', boost: 25 }); this.sfx('gem'); }
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
      if (this.dieT > (this.dieReason === 'fall' ? 0.75 : 0.55)) this.respawn();
    } else if (this.state === 'finishing') {
      this.finishT += dt;
      if (this.finishT > 2.4 && this.mode !== 'demo') { this.state = 'results'; this.ui.hideHUD(); this.ui.showResults(this.lastResult); }
      if (this.finishT > 4 && this.mode === 'demo') this.startDemo();
    }
    if (this.state === 'playing' && this.mode !== 'demo') this.skillUpdate(dt);
    // speed streaks & boost trail
    if (ball.boosting || ball.speed > ball.topSpeed * 1.15) this.effects.speedStreaks(ball.curPos, ball.fwd);
    if (ball.boosting) this.effects.boostTrail(ball.curPos, ball.fwd);
    this.effects.update(dt);
    // HUD
    if (this.mode !== 'demo' && this.run && this.ui.hudVisible) {
      const r = this.run;
      const prog = this.mode === 'endless' ? 0 : Math.min(1, ball.s / c.finishS);
      const score = this.mode === 'endless' ? Math.floor(r.distance * 2 + r.coins * 10 + r.bonus + r.points) : Math.floor(r.coins * 10 + r.bonus + r.points + r.gems.length * 250);
      this.ui.updateHUD({ progress: prog, coins: r.coins, distance: Math.floor(r.distance), time: r.time, score, combo: r.combo, comboT: r.comboT / 4.5, speed: ball.speed, top: ball.topSpeed, boost: ball.boostMeter, boosting: ball.boosting, advise: this.advise, fps: this.fps });
    }
    if (this.audio) {
      this.audio.updateRolling(ball.grounded && this.state !== 'dying' && this.mode !== 'demo' ? ball.speed : 0, ball.groundType);
      this.audio.updateBoost(ball.boosting && this.mode !== 'demo' && this.state === 'playing');
      this.audio.setIntensity(this.mode === 'demo' ? 0.2 : this.intensity || 0);
    }
    if (this.mode !== 'demo' && this.state === 'playing') this.save.data.stats.distance += ball.speed * dt;
  }

  // Combo decay, near-miss detection, speed rush, boost regen, speed advisory, music intensity, tutorial.
  skillUpdate(dt) {
    const r = this.run, ball = this.ball, c = this.course;
    if (r.comboT > 0) { r.comboT -= dt; if (r.comboT <= 0) this.breakCombo(); }
    if (!ball.boosting) ball.boostMeter = Math.min(100, ball.boostMeter + 2.2 * dt);
    const sec = c.sectionAtS(ball.s);
    // near miss: a moving hazard passing within a hair of the ball
    this.nearCd = (this.nearCd || 0) - dt;
    let danger = 9;
    if (sec.B.danger) {
      const l = sec.B.toLocal(ball.curPos);
      danger = sec.B.danger(l.x, l.d, this.time);
      if (danger > -0.05 && danger < 0.3 && this.nearCd <= 0 && sec.movers.length) { this.trick('CLOSE CALL', 80, { color: 'red', boost: 10 }); r.nearMiss++; this.nearCd = 1.6; }
    }
    // speed rush: hold a blistering pace
    if (ball.speed > ball.topSpeed * 1.12 && ball.grounded) { this.rushT = (this.rushT || 0) + dt; if (this.rushT > 2.2) { this.trick('SPEED RUSH', 100, { boost: 0 }); this.rushT = -2; } }
    else if ((this.rushT || 0) > 0) this.rushT = 0;
    else this.rushT = Math.min(0, (this.rushT || 0) + dt);
    // advisory: warn when approaching a section that wants less speed
    this.advise = null;
    const ahead = c.sectionAtS(ball.s + Math.max(12, ball.speed * 1.6));
    if (ahead && ahead !== sec && ahead.speedMul && ahead.speedMul < 0.95) {
      const want = ball.baseSpeed * ahead.speedMul * ball.speedMul;
      if (ball.speed > want + 2.5) this.advise = 'brake';
    }
    // music intensity follows the action
    const busy = sec.movers.length || sec.B.danger || sec.B.ground ? 0.65 : 0.35;
    const target = Math.min(1, busy + (ball.boosting ? 0.25 : 0) + (r.combo - 1) * 0.04);
    this.intensity = (this.intensity || 0) + (target - (this.intensity || 0)) * Math.min(1, dt * 1.5);
    // tutorial hints (level 1)
    if (this.tutorial) {
      if (this.input.anyThrottle) this.ui.hintDone('roll');
      if (ball.boostMeter >= 60 && !this.tutorial.boost && r.time > 6) this.hint('boost', this.input.isTouch ? 'HOLD  BOOST  FOR SPEED' : 'HOLD  SHIFT  TO BOOST');
      if (this.advise === 'brake') this.hint('brake', this.input.isTouch ? 'PULL THE STICK DOWN TO BRAKE' : 'PRESS  S  OR  ↓  TO BRAKE');
    }
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
    if (sec.cam && sec.cam.fixed) this.pathDir.copy(sec.B.dirW(0, 1));
    this.cam.update(dt, ball, this.pathDir, sec.cam, c.physics, { shake: this.save.data.settings.shake });
    this.engine.updateSun(ball.mesh.position);
    c.env.update(this.engine.camera.position, dt);
    // keep belt textures scrolling
    if (c.mats.beltMap) c.mats.beltMap.offset.y = -(this.time * 0.9) % 1;
    this.engine.render();
    void UP;
  }
}
