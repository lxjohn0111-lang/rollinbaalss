// DOM interface: main menu, level select, endless, ball collection, settings, stats,
// HUD, pause, results, game over, loading and feedback popups.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ICON } from './icons.js';
import { LEVELS } from '../game/levels.js';
import { THEMES } from '../gfx/environments.js';
import { SKINS, makeBallMaterial } from '../game/skins.js';
import { ACHIEVEMENTS } from '../game/progression.js';
import { OBSTACLE_IDS, REGISTRY } from '../game/obstacles/index.js';

const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const fmt = (n) => Math.floor(n).toLocaleString('en-US');
const fmtTime = (t) => { const m = Math.floor(t / 60), s = t - m * 60; return `${m}:${s.toFixed(1).padStart(4, '0')}`; };

const THEME_COLORS = {
  metropolis: ['#4f8fe8', '#f2c48a'], construction: ['#f2a20c', '#6b5a48'], coastal: ['#ff8a5c', '#3b4c8f'], neon: ['#ff2bd6', '#19203f'],
  alpine: ['#7fc0ff', '#e9f2fb'], factory: ['#f3b90f', '#3b3a38'], clouds: ['#8fd0ff', '#ffffff'], architect: ['#ff8fab', '#7ed6c8'],
  desert: ['#e8a35a', '#3f7bd0'], harbor: ['#36d3ff', '#0b1430'],
};

export class UI {
  constructor(root, save, audio) {
    this.root = root; this.save = save; this.audio = audio;
    this.game = null;
    this.hudVisible = false;
    this.screen = null;
    this.thumbs = {};
    this.build();
  }

  setGame(g) { this.game = g; }
  click() { this.audio && this.audio.sfx('click'); }

  btn(label, cls, onClick, icon) {
    const b = h('button', 'ui-btn ' + (cls || ''), `${icon ? `<span class="ic">${icon}</span>` : ''}<span class="lbl">${label}</span>`);
    b.addEventListener('click', (e) => { e.stopPropagation(); this.click(); onClick && onClick(e); });
    return b;
  }

  build() {
    this.layer = h('div', 'ui-layer');
    this.root.appendChild(this.layer);
    // persistent elements
    this.fade = h('div', 'fade'); this.root.appendChild(this.fade);
    this.popups = h('div', 'popups'); this.root.appendChild(this.popups);
    this.flashEl = h('div', 'flash'); this.root.appendChild(this.flashEl);
    this.toastEl = h('div', 'toast'); this.root.appendChild(this.toastEl);
    this.achEl = h('div', 'ach-stack'); this.root.appendChild(this.achEl);
    this.loading = h('div', 'loading hidden', `<div class="spinner"><div></div></div><div class="ld-title">Loading</div><div class="ld-sub">Building the course…</div>`);
    this.root.appendChild(this.loading);
    this.buildHUD();
  }

  clear() { this.layer.innerHTML = ''; this.screen = null; }

  topbar(back) {
    const bar = h('div', 'topbar');
    if (back) bar.appendChild(this.btn('', 'round back', () => this.showMenu(), ICON.back));
    else bar.appendChild(h('div', 'spacer'));
    const right = h('div', 'pills');
    const gems = this.save.totalGems();
    right.appendChild(h('div', 'pill gem', `<span class="ic">${ICON.gem}</span><b>${gems}</b><small>/${LEVELS.length * 2}</small>`));
    right.appendChild(h('div', 'pill coin', `<span class="ic">${ICON.coin}</span><b>${fmt(this.save.data.coins)}</b>`));
    bar.appendChild(right);
    return bar;
  }

  // ------------------------------------------------------------------ main menu
  showMenu() {
    this.clear(); this.hideHUD(); this.screen = 'menu';
    const s = h('div', 'screen menu');
    s.appendChild(this.topbar(false));
    const logo = h('div', 'logo', `<div class="logo-main"><span>SKY</span><span class="b">ROLL</span></div><div class="logo-sub">Obstacle courses in the clouds</div>`);
    s.appendChild(logo);
    const next = Math.min(this.save.data.unlocked, LEVELS.length) - 1;
    const allDone = Object.values(this.save.data.levels).filter((l) => l.done).length >= LEVELS.length;
    const lvl = LEVELS[next];
    const col = h('div', 'menu-col');
    const play = this.btn(allDone ? 'PLAY' : `PLAY`, 'primary huge', () => this.game.startLevel(next), ICON.play);
    play.appendChild(h('span', 'sub', `Level ${next + 1} · ${lvl.name}`));
    col.appendChild(play);
    const row = h('div', 'menu-row');
    row.appendChild(this.btn('LEVELS', 'blue', () => this.showLevels(), ICON.grid));
    row.appendChild(this.btn('ENDLESS', 'purple', () => this.showEndless(), ICON.infinity));
    col.appendChild(row);
    const row2 = h('div', 'menu-row');
    row2.appendChild(this.btn('BALLS', 'green', () => this.showBalls(), ICON.ball));
    row2.appendChild(this.btn('STATS', 'teal', () => this.showStats(), ICON.chart));
    row2.appendChild(this.btn('', 'round gear', () => this.showSettings(), ICON.gear));
    col.appendChild(row2);
    s.appendChild(col);
    s.appendChild(h('div', 'menu-foot', `${OBSTACLE_IDS.length} obstacle types · ${LEVELS.length} handcrafted levels · Endless mode`));
    this.layer.appendChild(s);
  }

  // ------------------------------------------------------------------ level select
  showLevels() {
    this.clear(); this.screen = 'levels';
    const s = h('div', 'screen levels');
    s.appendChild(this.topbar(true));
    s.appendChild(h('h1', 'title', 'SELECT LEVEL'));
    const totalStars = Object.values(this.save.data.levels).reduce((a, l) => a + (l.stars || 0), 0);
    s.appendChild(h('div', 'subtitle', `<span class="ic star">${ICON.star}</span> ${totalStars} / ${LEVELS.length * 3} stars`));
    const grid = h('div', 'level-grid');
    LEVELS.forEach((l, i) => {
      const rec = this.save.data.levels[i];
      const locked = i >= this.save.data.unlocked;
      const [c1, c2] = THEME_COLORS[l.theme] || ['#888', '#444'];
      const card = h('button', 'level-card' + (locked ? ' locked' : '') + (rec && rec.done ? ' done' : ''));
      card.style.setProperty('--c1', c1); card.style.setProperty('--c2', c2);
      const stars = [0, 1, 2].map((k) => `<span class="st ${rec && rec.stars > k ? 'on' : ''}">${ICON.star}</span>`).join('');
      const gems = [0, 1].map((k) => `<span class="gm ${rec && rec.gems && rec.gems.length > k ? 'on' : ''}">${ICON.gem}</span>`).join('');
      card.innerHTML = `
        <div class="lc-top"><span class="lc-num">${i + 1}</span><span class="lc-diff">${'●'.repeat(Math.min(5, Math.ceil(l.difficulty / 2)))}<i>${'●'.repeat(5 - Math.min(5, Math.ceil(l.difficulty / 2)))}</i></span></div>
        <div class="lc-name">${l.name}</div>
        <div class="lc-env">${THEMES[l.theme].name}</div>
        <div class="lc-stars">${stars}</div>
        <div class="lc-foot"><span class="lc-gems">${gems}</span><span class="lc-best">${rec && rec.done ? fmt(rec.bestScore) : locked ? '' : 'NEW'}</span></div>
        ${locked ? `<div class="lc-lock">${ICON.lock}</div>` : ''}`;
      card.addEventListener('click', () => {
        if (locked) { this.audio && this.audio.sfx('deny'); card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake'); return; }
        this.click(); this.game.startLevel(i);
      });
      grid.appendChild(card);
    });
    s.appendChild(grid);
    this.layer.appendChild(s);
  }

  // ------------------------------------------------------------------ endless
  showEndless() {
    this.clear(); this.screen = 'endless';
    const e = this.save.data.endless;
    const s = h('div', 'screen endless');
    s.appendChild(this.topbar(true));
    s.appendChild(h('h1', 'title', 'ENDLESS RUN'));
    const panel = h('div', 'panel endless-panel');
    panel.innerHTML = `
      <p class="lead">An ever-changing course assembled from ${Object.keys(REGISTRY).filter((k) => REGISTRY[k].kind === 'obstacle').length} obstacle types. It gets faster and meaner the further you roll. One fall ends the run.</p>
      <div class="rec-row">
        <div class="rec"><small>BEST DISTANCE</small><b>${fmt(e.bestDistance)} m</b></div>
        <div class="rec"><small>BEST SCORE</small><b>${fmt(e.bestScore)}</b></div>
        <div class="rec"><small>RUNS</small><b>${fmt(e.runs)}</b></div>
      </div>`;
    const go = this.btn('START RUN', 'primary big', () => this.game.startEndless(), ICON.play);
    panel.appendChild(go);
    s.appendChild(panel);
    this.layer.appendChild(s);
  }

  // ------------------------------------------------------------------ ball collection
  renderThumbs(ids, size = 160) {
    if (!this.thumbRenderer) {
      this.thumbRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      this.thumbRenderer.setSize(size, size); this.thumbRenderer.setPixelRatio(1);
      this.thumbRenderer.outputColorSpace = THREE.SRGBColorSpace; this.thumbRenderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.thumbScene = new THREE.Scene();
      const pm = new THREE.PMREMGenerator(this.thumbRenderer);
      this.thumbScene.environment = pm.fromScene(new RoomEnvironment(), 0.03).texture;
      const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(2, 3, 2); this.thumbScene.add(key);
      this.thumbScene.add(new THREE.AmbientLight(0xffffff, 0.35));
      this.thumbCam = new THREE.PerspectiveCamera(30, 1, 0.1, 10); this.thumbCam.position.set(0, 0.25, 2.3); this.thumbCam.lookAt(0, 0, 0);
      this.thumbBall = new THREE.Mesh(new THREE.SphereGeometry(0.5, 64, 48), new THREE.MeshStandardMaterial());
      this.thumbBall.rotation.set(0.25, -0.6, 0);
      this.thumbScene.add(this.thumbBall);
    }
    for (const id of ids) {
      if (this.thumbs[id]) continue;
      const old = this.thumbBall.material; this.thumbBall.material = makeBallMaterial(id, 'high'); old.dispose();
      this.thumbRenderer.render(this.thumbScene, this.thumbCam);
      this.thumbs[id] = this.thumbRenderer.domElement.toDataURL('image/png');
    }
  }

  showBalls(selected) {
    this.clear(); this.screen = 'balls';
    const s = h('div', 'screen balls');
    s.appendChild(this.topbar(true));
    s.appendChild(h('h1', 'title', 'BALL COLLECTION'));
    s.appendChild(h('div', 'subtitle', 'Cosmetic only - every ball rolls exactly the same.'));
    const wrap = h('div', 'balls-wrap');
    const grid = h('div', 'ball-grid');
    const d = this.save.data;
    let sel = selected || d.skin;
    const detail = h('div', 'panel ball-detail');
    const renderDetail = () => {
      const sk = SKINS.find((k) => k.id === sel);
      const owned = d.owned.includes(sk.id), eq = d.skin === sk.id;
      detail.innerHTML = `<img class="big-thumb" src="${this.thumbs[sk.id] || ''}" alt=""><div class="bd-name">${sk.name}</div><div class="bd-desc">${sk.desc}</div>`;
      let b;
      if (eq) b = this.btn('EQUIPPED', 'green disabled', null, ICON.check);
      else if (owned) b = this.btn('EQUIP', 'blue big', () => { this.save.equip(sk.id); this.save.flush(); this.showBalls(sk.id); });
      else if (sk.unlock) b = this.btn('LOCKED', 'disabled', null, ICON.lock);
      else {
        b = this.btn(`BUY ${fmt(sk.price)}`, 'primary big' + (d.coins < sk.price ? ' disabled' : ''), () => {
          if (this.save.buySkin(sk.id)) { this.audio && this.audio.sfx('buy'); const ach = this.save.evaluateAchievements({}); ach.forEach((a) => this.achievement(a)); this.showBalls(sk.id); }
          else this.audio && this.audio.sfx('deny');
        }, ICON.coin);
      }
      detail.appendChild(b);
    };
    // render thumbnails in small batches so the UI stays responsive
    const ids = SKINS.map((k) => k.id);
    SKINS.forEach((sk) => {
      const owned = d.owned.includes(sk.id);
      const card = h('button', 'ball-card' + (owned ? ' owned' : '') + (d.skin === sk.id ? ' equipped' : '') + (sel === sk.id ? ' sel' : ''));
      card.dataset.id = sk.id;
      card.innerHTML = `<img src="${this.thumbs[sk.id] || ''}" alt=""><div class="bc-name">${sk.name}</div><div class="bc-price">${d.skin === sk.id ? 'EQUIPPED' : owned ? 'OWNED' : sk.unlock ? `${ICON.lock}` : `<span class="ic">${ICON.coin}</span>${fmt(sk.price)}`}</div>`;
      card.addEventListener('click', () => { this.click(); sel = sk.id; grid.querySelectorAll('.ball-card').forEach((c) => c.classList.toggle('sel', c.dataset.id === sel)); renderDetail(); });
      grid.appendChild(card);
    });
    wrap.appendChild(grid); wrap.appendChild(detail);
    s.appendChild(wrap);
    this.layer.appendChild(s);
    renderDetail();
    let i = 0;
    const pump = () => {
      if (this.screen !== 'balls') return;
      const batch = ids.slice(i, i + 2); i += 2;
      this.renderThumbs(batch);
      for (const id of batch) { const img = grid.querySelector(`[data-id="${id}"] img`); if (img) img.src = this.thumbs[id]; }
      if (batch.includes(sel) || ids.slice(0, i).includes(sel)) { const bi = detail.querySelector('.big-thumb'); if (bi && this.thumbs[sel]) bi.src = this.thumbs[sel]; }
      if (i < ids.length) setTimeout(pump, 16);
    };
    setTimeout(pump, 30);
  }

  // ------------------------------------------------------------------ settings
  showSettings(fromPause = false) {
    if (!fromPause) { this.clear(); this.screen = 'settings'; }
    const st = this.save.data.settings;
    const s = h('div', 'screen settings' + (fromPause ? ' modal' : ''));
    if (!fromPause) s.appendChild(this.topbar(true));
    s.appendChild(h('h1', 'title', 'SETTINGS'));
    const p = h('div', 'panel settings-panel');
    const seg = (label, key, opts) => {
      const row = h('div', 'set-row', `<label>${label}</label>`);
      const g = h('div', 'seg');
      for (const [v, t] of opts) {
        const b = h('button', 'seg-btn' + (st[key] === v ? ' on' : ''), t);
        b.addEventListener('click', () => { this.click(); st[key] = v; this.save.touch(); this.save.flush(); g.querySelectorAll('.seg-btn').forEach((x) => x.classList.toggle('on', x === b)); this.game.applySettings(); });
        g.appendChild(b);
      }
      row.appendChild(g); p.appendChild(row);
    };
    const slider = (label, key) => {
      const row = h('div', 'set-row', `<label>${label}</label>`);
      const inp = h('input', 'slider'); inp.type = 'range'; inp.min = 0; inp.max = 1; inp.step = 0.05; inp.value = st[key];
      const val = h('span', 'val', Math.round(st[key] * 100) + '%');
      inp.addEventListener('input', () => { st[key] = Number(inp.value); val.textContent = Math.round(st[key] * 100) + '%'; this.save.touch(); this.game.applySettings(); });
      inp.addEventListener('change', () => { this.save.flush(); this.audio && this.audio.sfx('coin'); });
      row.appendChild(inp); row.appendChild(val); p.appendChild(row);
    };
    seg('Graphics quality', 'quality', [['low', 'LOW'], ['medium', 'MED'], ['high', 'HIGH'], ['ultra', 'ULTRA']]);
    slider('Music volume', 'music');
    slider('Sound effects', 'sfx');
    seg('Touch controls', 'touchMode', [['stick', 'STICK'], ['buttons', 'BUTTONS']]);
    seg('Auto-accelerate', 'autoAccel', [[null, 'AUTO'], [true, 'ON'], [false, 'OFF']]);
    seg('Camera shake', 'shake', [[true, 'ON'], [false, 'OFF']]);
    seg('Show FPS', 'showFps', [[false, 'OFF'], [true, 'ON']]);
    const keys = h('div', 'keys', `<b>Controls</b><span><kbd>W</kbd>/<kbd>↑</kbd> accelerate</span><span><kbd>S</kbd>/<kbd>↓</kbd> brake &amp; reverse</span><span><kbd>A</kbd><kbd>D</kbd> / <kbd>←</kbd><kbd>→</kbd> steer</span><span><kbd>Space</kbd> jump</span><span><kbd>Shift</kbd> boost</span><span><kbd>R</kbd> restart checkpoint</span><span><kbd>Esc</kbd> pause</span>`);
    p.appendChild(keys);
    if (!fromPause) {
      const reset = this.btn('RESET PROGRESS', 'danger small', () => this.confirm('Reset all progress?', 'This deletes coins, levels, balls, records and achievements. This cannot be undone.', () => { this.save.reset(); this.game.applySettings(); this.showMenu(); }));
      p.appendChild(reset);
    } else {
      p.appendChild(this.btn('BACK', 'blue', () => { s.remove(); this.pauseEl && (this.pauseEl.style.display = ''); }, ICON.back));
    }
    s.appendChild(p);
    if (fromPause) { this.root.appendChild(s); this.settingsModal = s; } else this.layer.appendChild(s);
  }

  confirm(title, text, onYes) {
    const m = h('div', 'modal-back');
    const box = h('div', 'panel confirm', `<h2>${title}</h2><p>${text}</p>`);
    const row = h('div', 'btn-row');
    row.appendChild(this.btn('CANCEL', 'blue', () => m.remove()));
    row.appendChild(this.btn('YES, RESET', 'danger', () => { m.remove(); onYes(); }));
    box.appendChild(row); m.appendChild(box); this.root.appendChild(m);
  }

  // ------------------------------------------------------------------ stats & achievements
  showStats() {
    this.clear(); this.screen = 'stats';
    const d = this.save.data;
    const s = h('div', 'screen stats');
    s.appendChild(this.topbar(true));
    s.appendChild(h('h1', 'title', 'STATISTICS'));
    const wrap = h('div', 'stats-wrap');
    const done = Object.values(d.levels).filter((l) => l.done).length;
    const stars = Object.values(d.levels).reduce((a, l) => a + (l.stars || 0), 0);
    const items = [
      ['Levels completed', `${done} / ${LEVELS.length}`], ['Stars earned', `${stars} / ${LEVELS.length * 3}`], ['Gems found', `${this.save.totalGems()} / ${LEVELS.length * 2}`],
      ['Coins collected', fmt(d.stats.coinsCollected)], ['Coin balance', fmt(d.coins)], ['Distance rolled', `${(d.stats.distance / 1000).toFixed(2)} km`],
      ['Blocks toppled', fmt(d.stats.blocks)], ['Falls', fmt(d.stats.falls)], ['Runs started', fmt(d.stats.plays)],
      ['Endless best distance', `${fmt(d.endless.bestDistance)} m`], ['Endless best score', fmt(d.endless.bestScore)], ['Balls owned', `${d.owned.length} / ${SKINS.length}`],
    ];
    const st = h('div', 'panel stat-grid');
    for (const [k, v] of items) st.appendChild(h('div', 'stat', `<small>${k}</small><b>${v}</b>`));
    wrap.appendChild(st);
    const ach = h('div', 'panel ach-list');
    const got = ACHIEVEMENTS.filter((a) => d.achievements[a.id]).length;
    ach.appendChild(h('h2', '', `ACHIEVEMENTS <small>${got}/${ACHIEVEMENTS.length}</small>`));
    for (const a of ACHIEVEMENTS) {
      const on = !!d.achievements[a.id];
      ach.appendChild(h('div', 'ach' + (on ? ' on' : ''), `<span class="ai">${on ? ICON.trophy : ICON.lock}</span><div><b>${a.name}</b><small>${a.desc}</small></div><span class="ar"><span class="ic">${ICON.coin}</span>${a.reward}</span>`));
    }
    wrap.appendChild(ach);
    s.appendChild(wrap);
    this.layer.appendChild(s);
  }

  // ------------------------------------------------------------------ loading
  showLoading(name) { this.clear(); this.loading.querySelector('.ld-title').textContent = name; this.loading.classList.remove('hidden'); }
  hideLoading() { this.loading.classList.add('hidden'); }

  // ------------------------------------------------------------------ HUD
  buildHUD() {
    const hud = h('div', 'hud hidden');
    hud.innerHTML = `
      <div class="hud-top">
        <button class="hud-btn pause-btn" aria-label="Pause">${ICON.pause}</button>
        <div class="hud-level">
          <div class="hl-badge"><small class="hl-title">LEVEL 1</small></div>
          <div class="hl-bar"><div class="hl-fill"></div><div class="hl-ticks"></div><div class="hl-ball"></div></div>
          <div class="hl-name"></div>
        </div>
        <div class="hud-dist hidden"><b>0</b><small>m</small></div>
        <div class="hud-right">
          <div class="hud-coins"><span class="ic">${ICON.coin}</span><b>0</b></div>
          <div class="hud-score"><b>0</b><span class="combo"><i>x1</i><span class="combo-t"></span></span></div>
        </div>
      </div>
      <div class="hud-speed">
        <div class="hs-num"><b>0</b><small>KM/H</small></div>
        <div class="hs-boost"><div class="hs-fill"></div><span>BOOST</span></div>
        <div class="hs-advise">SLOW DOWN</div>
      </div>
      <div class="hud-count"></div>
      <div class="hud-hint"></div>
      <div class="hud-fps hidden"></div>
      <div class="touch-ctrl">
        <div class="stick"><div class="stick-knob"></div></div>
        <button class="hud-btn tc tc-left">${ICON.left}</button>
        <button class="hud-btn tc tc-right">${ICON.right}</button>
        <button class="hud-btn tc tc-brake"><small>BRAKE</small></button>
        <button class="hud-btn tc tc-boost"><small>BOOST</small></button>
        <button class="hud-btn tc tc-jump">${ICON.jump}<small>JUMP</small></button>
      </div>`;
    this.root.appendChild(hud);
    this.hud = hud;
    const q = (c) => hud.querySelector(c);
    this.hudEls = {
      title: q('.hl-title'), name: q('.hl-name'), fill: q('.hl-fill'), ball: q('.hl-ball'), ticks: q('.hl-ticks'),
      coins: q('.hud-coins b'), level: q('.hud-level'), dist: q('.hud-dist'), distB: q('.hud-dist b'),
      score: q('.hud-score b'), combo: q('.combo'), comboI: q('.combo i'), comboT: q('.combo-t'),
      speed: q('.hs-num b'), boost: q('.hs-fill'), boostBox: q('.hs-boost'), advise: q('.hs-advise'),
      count: q('.hud-count'), hint: q('.hud-hint'), fps: q('.hud-fps'), touch: q('.touch-ctrl'), stick: q('.stick'), knob: q('.stick-knob'),
    };
    q('.pause-btn').addEventListener('click', (e) => { e.stopPropagation(); this.click(); this.game.togglePause(); });
    const hold = (el, name) => {
      const on = (e) => { e.preventDefault(); e.stopPropagation(); this.game.input.setButton(name, true); el.classList.add('down'); };
      const off = (e) => { e.preventDefault(); this.game.input.setButton(name, false); el.classList.remove('down'); };
      el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off); el.addEventListener('pointerleave', off); el.addEventListener('pointercancel', off);
    };
    hold(q('.tc-left'), 'left'); hold(q('.tc-right'), 'right'); hold(q('.tc-boost'), 'boost'); hold(q('.tc-brake'), 'brake');
    const j = q('.tc-jump');
    j.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.game.input.pressJump(); j.classList.add('down'); });
    j.addEventListener('pointerup', () => j.classList.remove('down'));
    j.addEventListener('pointerleave', () => j.classList.remove('down'));
  }

  showHUD(cfg) {
    this.clear();
    this.hud.classList.remove('hidden');
    this.hudVisible = true;
    const e = this.hudEls;
    const endless = cfg.mode === 'endless';
    e.level.classList.toggle('hidden', endless);
    e.dist.classList.toggle('hidden', !endless);
    e.title.textContent = cfg.title;
    e.name.textContent = cfg.name || '';
    e.ticks.innerHTML = (cfg.checkpoints || []).map((p, i) => `<span class="tick" data-i="${i}" style="left:${(p * 100).toFixed(1)}%">${ICON.flag}</span>`).join('');
    this.lastCoins = -1; this.lastScore = -1; this.lastCombo = 0;
    e.hint.classList.remove('show'); e.count.classList.remove('show');
    const touch = this.game.input.isTouch;
    this.hud.classList.toggle('is-touch', touch);
    this.hud.classList.toggle('buttons-mode', this.game.input.touchMode === 'buttons');
    e.fps.classList.toggle('hidden', !this.save.data.settings.showFps);
    this.combo(1);
  }

  hideHUD() { this.hud.classList.add('hidden'); this.hudVisible = false; if (this.game) this.game.input.releaseAll(); }

  updateHUD(d) {
    const e = this.hudEls;
    if (d.progress != null) { const p = (d.progress * 100).toFixed(1) + '%'; e.fill.style.width = p; e.ball.style.left = p; }
    if (d.coins !== this.lastCoins) { e.coins.textContent = fmt(d.coins); if (this.lastCoins >= 0) { e.coins.parentElement.classList.remove('bump'); void e.coins.offsetWidth; e.coins.parentElement.classList.add('bump'); } this.lastCoins = d.coins; }
    if (d.score !== this.lastScore) { e.score.textContent = fmt(d.score); this.lastScore = d.score; }
    e.distB.textContent = fmt(d.distance);
    e.comboT.style.transform = `scaleX(${Math.max(0, Math.min(1, d.comboT || 0)).toFixed(3)})`;
    e.speed.textContent = Math.round(d.speed * 3.6);
    e.boost.style.transform = `scaleX(${(d.boost / 100).toFixed(3)})`;
    e.boostBox.classList.toggle('full', d.boost >= 99);
    e.boostBox.classList.toggle('on', !!d.boosting);
    e.advise.classList.toggle('on', d.advise === 'brake');
    this.hud.classList.toggle('fast', d.speed > d.top * 1.1);
    if (this.save.data.settings.showFps) e.fps.textContent = Math.round(d.fps) + ' FPS';
    // stick visual
    const st = this.game.input.stick;
    if (st.active) { e.stick.classList.add('on'); e.stick.style.left = st.x0 + 'px'; e.stick.style.top = st.y0 + 'px'; e.knob.style.transform = `translate(${st.dx}px, ${st.dy}px)`; }
    else e.stick.classList.remove('on');
  }

  combo(n) {
    const e = this.hudEls; if (!e) return;
    e.comboI.textContent = 'x' + n;
    e.combo.classList.toggle('on', n > 1);
    if (n > this.lastCombo && n > 1) { e.combo.classList.remove('pop'); void e.combo.offsetWidth; e.combo.classList.add('pop'); }
    e.combo.dataset.level = Math.min(4, Math.ceil(n / 2));
    this.lastCombo = n;
  }

  countdown(text) {
    const c = this.hudEls.count;
    c.textContent = text; c.classList.remove('show'); void c.offsetWidth; c.classList.add('show');
    c.classList.toggle('go', text === 'GO!');
  }

  hint(text, dur = 4.5) {
    const el = this.hudEls.hint;
    el.innerHTML = text.replace(/  (\S+)  /g, ' <kbd>$1</kbd> ');
    el.classList.add('show');
    clearTimeout(this.hintT); this.hintT = setTimeout(() => el.classList.remove('show'), dur * 1000);
  }

  hintDone() { setTimeout(() => this.hudEls.hint.classList.remove('show'), 600); }

  checkpointReached(i) { const t = this.hudEls.ticks.querySelector(`[data-i="${i}"]`); if (t) t.classList.add('on'); }

  // ------------------------------------------------------------------ feedback
  popup(text, color = 'gold') {
    const p = h('div', 'popup ' + color, text);
    this.popups.appendChild(p);
    setTimeout(() => p.remove(), 1400);
  }

  flash(text) {
    this.flashEl.textContent = text;
    this.flashEl.classList.remove('show'); void this.flashEl.offsetWidth; this.flashEl.classList.add('show');
  }

  toast(title, sub, dur = 2.5) {
    this.toastEl.innerHTML = `<b>${title}</b><small>${sub || ''}</small>`;
    this.toastEl.classList.remove('show'); void this.toastEl.offsetWidth; this.toastEl.classList.add('show');
    clearTimeout(this.toastT); this.toastT = setTimeout(() => this.toastEl.classList.remove('show'), dur * 1000);
  }

  respawnFade() { this.fade.classList.remove('go'); void this.fade.offsetWidth; this.fade.classList.add('go'); }

  achievement(a) {
    this.audio && this.audio.sfx('achievement');
    const el = h('div', 'ach-toast', `<span class="ai">${ICON.trophy}</span><div><small>ACHIEVEMENT UNLOCKED</small><b>${a.name}</b><span>${a.desc}</span></div><span class="ar">+${a.reward}</span>`);
    this.achEl.appendChild(el);
    setTimeout(() => el.classList.add('out'), 3600);
    setTimeout(() => el.remove(), 4200);
  }

  // ------------------------------------------------------------------ pause
  showPause() {
    const m = h('div', 'modal-back pause');
    const box = h('div', 'panel pause-box', `<h1 class="title">PAUSED</h1>`);
    const g = this.game;
    box.appendChild(this.btn('RESUME', 'primary big', () => g.togglePause(), ICON.play));
    if (g.mode === 'level') box.appendChild(this.btn('RESTART CHECKPOINT', 'blue', () => g.restartCheckpoint(), ICON.flag));
    box.appendChild(this.btn(g.mode === 'endless' ? 'RESTART RUN' : 'RESTART LEVEL', 'blue', () => g.restartLevel(), ICON.retry));
    box.appendChild(this.btn('SETTINGS', 'teal', () => { m.style.display = 'none'; this.pauseEl = m; this.showSettings(true); }, ICON.gear));
    box.appendChild(this.btn('EXIT TO MENU', 'danger', () => { this.hidePause(); g.toMenu(); }, ICON.home));
    m.appendChild(box);
    this.root.appendChild(m);
    this.pauseEl = m;
  }

  hidePause() {
    if (this.pauseEl) { this.pauseEl.remove(); this.pauseEl = null; }
    if (this.settingsModal) { this.settingsModal.remove(); this.settingsModal = null; }
  }

  // ------------------------------------------------------------------ results
  showResults(r) {
    this.clear(); this.screen = 'results';
    const lvl = LEVELS[r.level];
    const s = h('div', 'screen results');
    const box = h('div', 'panel results-box');
    box.innerHTML = `
      <div class="res-head"><small>LEVEL ${r.level + 1} · ${lvl ? lvl.name : ''}</small><h1>LEVEL COMPLETE!</h1></div>
      <div class="res-stars">${[0, 1, 2].map((k) => `<span class="rs ${r.stars > k ? 'on' : ''}" style="--d:${0.35 + k * 0.35}s">${ICON.star}</span>`).join('')}</div>
      <div class="res-rows">
        <div class="rr"><span><span class="ic">${ICON.coin}</span> Coins</span><b>${r.picked} / ${r.totalCoins}${r.coins > r.picked ? ` <small class="bonus-c">+${r.coins - r.picked} bonus</small>` : ''}</b></div>
        <div class="rr"><span><span class="ic">${ICON.gem}</span> Gems</span><b>${r.gems.length} / ${r.totalGems}</b></div>
        <div class="rr"><span>Time</span><b>${fmtTime(r.time)}</b></div>
        <div class="rr"><span>Falls</span><b>${r.falls}</b></div>
        <div class="rr sub"><span>Time bonus</span><b>+${fmt(r.timeBonus)}</b></div>
        <div class="rr sub"><span>Flawless bonus</span><b>+${fmt(r.noFall)}</b></div>
        <div class="rr sub"><span>Tricks (${r.tricks || 0}) · best combo x${r.bestCombo || 1}</span><b>+${fmt((r.points || 0) + r.bonus)}</b></div>
        <div class="rr total"><span>SCORE</span><b class="count" data-to="${r.score}">0</b></div>
        <div class="rr reward"><span>Coins earned</span><b>+${fmt(r.coins + r.completionBonus)} <span class="ic">${ICON.coin}</span></b></div>
      </div>
      ${r.newBest ? '<div class="ribbon">NEW BEST!</div>' : ''}`;
    const row = h('div', 'btn-row');
    row.appendChild(this.btn('', 'round blue', () => this.game.toMenu(), ICON.home));
    row.appendChild(this.btn('REPLAY', 'blue', () => this.game.startLevel(r.level), ICON.retry));
    if (r.level + 1 < LEVELS.length) row.appendChild(this.btn('NEXT', 'primary big', () => this.game.startLevel(r.level + 1), ICON.next));
    else row.appendChild(this.btn('MENU', 'primary big', () => this.game.toMenu(), ICON.home));
    box.appendChild(row);
    s.appendChild(box);
    this.layer.appendChild(s);
    this.countUp(box.querySelector('.count'));
    setTimeout(() => { for (let k = 0; k < r.stars; k++) setTimeout(() => this.audio && this.audio.sfx('coin'), k * 350); }, 300);
  }

  countUp(el, dur = 1.2) {
    if (!el) return;
    const to = Number(el.dataset.to); const t0 = performance.now();
    const step = (now) => { const k = Math.min(1, (now - t0) / (dur * 1000)); el.textContent = fmt(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }

  showGameOver(r) {
    this.clear(); this.screen = 'over';
    const s = h('div', 'screen results');
    const box = h('div', 'panel results-box over');
    box.innerHTML = `
      <div class="res-head"><small>ENDLESS RUN</small><h1>RUN OVER</h1></div>
      <div class="big-dist"><b class="count" data-to="${r.distance}">0</b><small>METERS</small></div>
      <div class="res-rows">
        <div class="rr"><span>Score</span><b>${fmt(r.score)}</b></div>
        <div class="rr"><span><span class="ic">${ICON.coin}</span> Coins</span><b>${fmt(r.coins)}</b></div>
        <div class="rr"><span>Tricks · best combo</span><b>${r.tricks || 0} · x${r.combo || 1}</b></div>
        <div class="rr"><span>Zones cleared</span><b>${r.zones || 0}</b></div>
        <div class="rr sub"><span>Best distance</span><b>${fmt(r.bestDistance)} m</b></div>
        <div class="rr sub"><span>Best score</span><b>${fmt(r.bestScore)}</b></div>
      </div>
      ${r.newRecord ? '<div class="ribbon">NEW RECORD!</div>' : ''}`;
    const row = h('div', 'btn-row');
    row.appendChild(this.btn('', 'round blue', () => this.game.toMenu(), ICON.home));
    row.appendChild(this.btn('TRY AGAIN', 'primary big', () => this.game.startEndless(), ICON.retry));
    box.appendChild(row);
    s.appendChild(box);
    this.layer.appendChild(s);
    this.countUp(box.querySelector('.count'));
  }
}
