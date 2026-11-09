// Local save system (localStorage) for progress, records, cosmetics, achievements and settings.
import { ACHIEVEMENTS } from '../game/progression.js';
import { SKINS } from '../game/skins.js';

const KEY = 'skyroll.save.v1';

function defaults() {
  return {
    version: 1,
    coins: 0,
    skin: 'wrecker',
    owned: ['wrecker'],
    unlocked: 1, // number of unlocked levels
    levels: {}, // index -> { done, bestScore, stars, gems: [ids], bestTime, coins }
    endless: { bestDistance: 0, bestScore: 0, runs: 0, totalDistance: 0 },
    achievements: {},
    stats: { plays: 0, falls: 0, coinsCollected: 0, blocks: 0, distance: 0, levelsCompleted: 0, playTime: 0 },
    settings: { quality: 'high', music: 0.6, sfx: 0.8, touchMode: 'buttons', shake: true, showFps: false },
  };
}

function merge(a, b) {
  for (const k of Object.keys(a)) {
    if (b[k] === undefined) continue;
    if (a[k] && typeof a[k] === 'object' && !Array.isArray(a[k])) a[k] = merge(a[k], b[k] || {});
    else a[k] = b[k];
  }
  for (const k of Object.keys(b)) if (a[k] === undefined) a[k] = b[k];
  return a;
}

export class SaveData {
  constructor(storage = null) {
    this.storage = storage;
    this.data = defaults();
    this.load();
    this.dirty = false;
    setInterval(() => { if (this.dirty) this.flush(); }, 3000);
    window.addEventListener('beforeunload', () => this.flush());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.flush(); });
  }

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) this.data = merge(defaults(), JSON.parse(raw));
    } catch (e) { this.data = defaults(); }
    if (!this.data.owned.includes('wrecker')) this.data.owned.push('wrecker');
  }

  flush() {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); this.dirty = false; } catch (e) { /* storage unavailable */ }
  }

  touch() { this.dirty = true; }

  reset() { this.data = defaults(); this.flush(); }

  addCoins(n) { this.data.coins += Math.max(0, Math.floor(n)); this.touch(); }

  levelRecord(i) { return this.data.levels[i] || null; }

  recordLevel(i, r) {
    const prev = this.data.levels[i] || { done: false, bestScore: 0, stars: 0, gems: [], bestTime: null, coins: 0 };
    const newBest = r.score > prev.bestScore;
    const gems = [...new Set([...(prev.gems || []), ...r.gems])];
    if (!prev.done) this.data.stats.levelsCompleted++;
    this.data.levels[i] = {
      done: true,
      bestScore: Math.max(prev.bestScore, r.score),
      stars: Math.max(prev.stars, r.stars),
      gems,
      bestTime: prev.bestTime == null ? r.time : Math.min(prev.bestTime, r.time),
      coins: Math.max(prev.coins || 0, r.coins),
    };
    this.data.unlocked = Math.max(this.data.unlocked, Math.min(20, i + 2));
    this.touch(); this.flush();
    return newBest;
  }

  recordEndless(dist, score) {
    const e = this.data.endless;
    const rec = dist > e.bestDistance || score > e.bestScore;
    e.bestDistance = Math.max(e.bestDistance, dist);
    e.bestScore = Math.max(e.bestScore, score);
    e.runs++; e.totalDistance += dist;
    this.touch(); this.flush();
    return rec;
  }

  buySkin(id) {
    const s = SKINS.find((k) => k.id === id);
    if (!s || this.data.owned.includes(id) || s.unlock || this.data.coins < s.price) return false;
    this.data.coins -= s.price; this.data.owned.push(id); this.data.skin = id;
    this.touch(); this.flush();
    return true;
  }

  equip(id) { if (this.data.owned.includes(id)) { this.data.skin = id; this.touch(); return true; } return false; }

  totalGems() { return Object.values(this.data.levels).reduce((a, l) => a + (l.gems ? l.gems.length : 0), 0); }

  evaluateAchievements(run) {
    const out = [];
    for (const a of ACHIEVEMENTS) {
      if (this.data.achievements[a.id]) continue;
      let ok = false;
      try { ok = a.test(this.data, run || {}); } catch (e) { ok = false; }
      if (ok) {
        this.data.achievements[a.id] = Date.now();
        if (a.reward) this.data.coins += a.reward;
        const skin = SKINS.find((s) => s.unlock === 'ach:' + a.id);
        if (skin && !this.data.owned.includes(skin.id)) this.data.owned.push(skin.id);
        out.push(a);
      }
    }
    if (out.length) { this.touch(); this.flush(); }
    return out;
  }
}
