// Procedural audio: synthesized sound effects, speed-reactive rolling sound and a small
// step-sequenced soundtrack whose key, tempo and style change per environment.
// Everything is generated at runtime with the Web Audio API (no audio files).

const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
};
// chord progressions as scale degrees
const PROGS = {
  pop: [[0, 4, 5, 3], [0, 5, 3, 4]],
  funk: [[0, 0, 3, 4], [0, 6, 3, 4]],
  chill: [[0, 3, 5, 4], [5, 3, 0, 4]],
  synth: [[0, 5, 2, 6], [0, 5, 3, 4]],
  folk: [[0, 3, 0, 4], [5, 3, 0, 4]],
  industrial: [[0, 0, 1, 0], [0, 6, 5, 6]],
  dream: [[0, 3, 1, 4], [0, 5, 3, 1]],
  bounce: [[0, 4, 5, 3], [3, 4, 0, 0]],
  western: [[0, 1, 0, 6], [0, 6, 5, 1]],
};
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.musicVol = 0.6; this.sfxVol = 0.8;
    this.enabled = true;
    this.pending = null;
    this.ducked = false;
    const unlock = () => { this.ensure(); if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) this.ctx.suspend(); else this.ctx.resume();
    });
  }

  ensure() {
    if (this.ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { this.ctx = new AC(); } catch (e) { return false; }
    const c = this.ctx;
    this.comp = c.createDynamicsCompressor();
    this.comp.threshold.value = -14; this.comp.ratio.value = 4;
    this.master = c.createGain(); this.master.gain.value = 0.9;
    this.comp.connect(this.master); this.master.connect(c.destination);
    this.musicGain = c.createGain(); this.musicGain.gain.value = this.musicVol * 0.55;
    this.sfxGain = c.createGain(); this.sfxGain.gain.value = this.sfxVol;
    this.musicGain.connect(this.comp); this.sfxGain.connect(this.comp);
    // shared noise buffer
    const len = c.sampleRate * 2;
    this.noise = c.createBuffer(1, len, c.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    // music delay send
    this.delay = c.createDelay(1); this.delay.delayTime.value = 0.28;
    this.delayFb = c.createGain(); this.delayFb.gain.value = 0.32;
    this.delayOut = c.createGain(); this.delayOut.gain.value = 0.35;
    this.delay.connect(this.delayFb); this.delayFb.connect(this.delay); this.delay.connect(this.delayOut); this.delayOut.connect(this.musicGain);
    this.setupRolling();
    if (this.pending) { const p = this.pending; this.pending = null; this.playMusic(p); }
    return true;
  }

  setVolumes(music, sfx) {
    this.musicVol = music; this.sfxVol = sfx;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.musicGain.gain.setTargetAtTime(this.ducked ? music * 0.18 : music * 0.55, t, 0.05);
    this.sfxGain.gain.setTargetAtTime(sfx, t, 0.05);
  }

  duck(on) { this.ducked = on; this.setVolumes(this.musicVol, this.sfxVol); if (this.rollGain) this.rollGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05); }

  // ------------------------------------------------------------ helpers
  osc(type, freq, t0, dur, gain, dest, { attack = 0.005, freqEnd = null, detune = 0 } = {}) {
    const c = this.ctx;
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t0); o.detune.value = detune;
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + attack); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest || this.sfxGain);
    o.start(t0); o.stop(t0 + dur + 0.05);
    return g;
  }

  noiseHit(t0, dur, gain, filterType, freq, q = 1, dest, freqEnd = null) {
    const c = this.ctx;
    const s = c.createBufferSource(); s.buffer = this.noise; s.playbackRate.value = 1;
    const f = c.createBiquadFilter(); f.type = filterType; f.frequency.setValueAtTime(freq, t0); f.Q.value = q;
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur);
    const g = c.createGain(); g.gain.setValueAtTime(gain, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(dest || this.sfxGain);
    s.start(t0, Math.random() * 1.5); s.stop(t0 + dur + 0.05);
  }

  // ------------------------------------------------------------ sound effects
  sfx(name, k = 1) {
    if (!this.ensure() || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime + 0.005;
    switch (name) {
      case 'coin': {
        const base = 1318 + (this.coinStreak = ((this.coinStreak || 0) + 1) % 6) * 40;
        this.osc('triangle', base, t, 0.09, 0.22); this.osc('triangle', base * 1.5, t + 0.06, 0.22, 0.2); this.osc('sine', base * 3, t + 0.06, 0.15, 0.05);
        break;
      }
      case 'gem': [0, 4, 7, 12, 16].forEach((n, i) => this.osc('triangle', mtof(84 + n), t + i * 0.06, 0.4, 0.16)); break;
      case 'jump': this.osc('square', 220, t, 0.18, 0.08, null, { freqEnd: 520 }); this.noiseHit(t, 0.16, 0.12, 'bandpass', 900, 0.8, null, 2400); break;
      case 'spring': this.osc('sine', 160, t, 0.45, 0.4, null, { freqEnd: 700 }); this.osc('triangle', 330, t, 0.35, 0.12, null, { freqEnd: 1200 }); break;
      case 'land': { const g = 0.2 + k * 0.5; this.osc('sine', 120, t, 0.22, g, null, { freqEnd: 45 }); this.noiseHit(t, 0.12 + k * 0.1, g * 0.6, 'lowpass', 600, 0.7); break; }
      case 'bump': this.osc('sine', 300, t, 0.25, 0.35, null, { freqEnd: 900 }); this.osc('square', 150, t, 0.1, 0.1); break;
      case 'block': { const f = 400 + Math.random() * 500; this.noiseHit(t, 0.12, 0.25 * (0.4 + k), 'bandpass', f, 4); this.osc('triangle', f * 0.5, t, 0.1, 0.08 * (0.4 + k)); break; }
      case 'checkpoint': [0, 4, 7, 12].forEach((n, i) => this.osc('square', mtof(72 + n), t + i * 0.08, 0.25, 0.07)); this.osc('sine', mtof(96), t + 0.3, 0.6, 0.06); break;
      case 'bonus': [0, 7, 12, 19].forEach((n, i) => this.osc('triangle', mtof(79 + n), t + i * 0.05, 0.3, 0.13)); break;
      case 'finish': {
        const seq = [0, 4, 7, 12, 7, 12, 16, 19];
        seq.forEach((n, i) => { this.osc('square', mtof(67 + n), t + i * 0.09, 0.22, 0.08); this.osc('triangle', mtof(55 + n), t + i * 0.09, 0.22, 0.1); });
        [0, 4, 7, 12].forEach((n) => this.osc('sawtooth', mtof(60 + n), t + 0.75, 1.4, 0.05, null, { attack: 0.05 }));
        this.noiseHit(t + 0.75, 1.2, 0.15, 'highpass', 6000, 0.5);
        break;
      }
      case 'fail': this.osc('sawtooth', 440, t, 0.6, 0.12, null, { freqEnd: 70 }); this.noiseHit(t, 0.5, 0.15, 'lowpass', 2000, 0.5, null, 200); break;
      case 'respawn': this.osc('sine', 300, t, 0.3, 0.15, null, { freqEnd: 900 }); this.osc('triangle', 600, t + 0.1, 0.3, 0.08, null, { freqEnd: 1500 }); break;
      case 'click': this.osc('triangle', 880, t, 0.05, 0.1); this.osc('sine', 1760, t, 0.04, 0.05); break;
      case 'hover': this.osc('sine', 1200, t, 0.03, 0.03); break;
      case 'buy': [0, 7, 12, 16, 19, 24].forEach((n, i) => this.osc('triangle', mtof(72 + n), t + i * 0.05, 0.28, 0.12)); break;
      case 'deny': this.osc('square', 180, t, 0.12, 0.08); this.osc('square', 140, t + 0.12, 0.16, 0.08); break;
      case 'achievement': [0, 4, 7, 11, 14].forEach((n, i) => this.osc('triangle', mtof(76 + n), t + i * 0.07, 0.5, 0.12)); break;
      case 'whoosh': this.noiseHit(t, 0.35, 0.18, 'bandpass', 400, 1.2, null, 3000); break;
      default: break;
    }
  }

  // ------------------------------------------------------------ rolling
  setupRolling() {
    const c = this.ctx;
    const src = c.createBufferSource(); src.buffer = this.noise; src.loop = true;
    this.rollFilter = c.createBiquadFilter(); this.rollFilter.type = 'lowpass'; this.rollFilter.frequency.value = 300; this.rollFilter.Q.value = 2;
    this.rollGain = c.createGain(); this.rollGain.gain.value = 0;
    src.connect(this.rollFilter); this.rollFilter.connect(this.rollGain); this.rollGain.connect(this.sfxGain);
    src.start();
    this.rumble = c.createOscillator(); this.rumble.type = 'sine'; this.rumble.frequency.value = 40;
    this.rumbleGain = c.createGain(); this.rumbleGain.gain.value = 0;
    this.rumble.connect(this.rumbleGain); this.rumbleGain.connect(this.sfxGain); this.rumble.start();
  }

  updateRolling(speed, surface) {
    if (!this.ctx || this.ctx.state !== 'running' || this.ducked) return;
    const t = this.ctx.currentTime;
    const k = Math.min(1, speed / 16);
    let f = 180 + k * 700, g = k * 0.22, q = 2;
    if (surface === 'ice') { f = 2500 + k * 2000; g = k * 0.08; q = 0.5; }
    else if (surface === 'conveyor') { f = 500 + k * 400; g = k * 0.25; q = 6; }
    else if (surface === 'sticky') { f = 120; g = k * 0.3; }
    this.rollFilter.frequency.setTargetAtTime(f, t, 0.05);
    this.rollFilter.Q.setTargetAtTime(q, t, 0.05);
    this.rollGain.gain.setTargetAtTime(g, t, 0.06);
    this.rumble.frequency.setTargetAtTime(30 + k * 40, t, 0.1);
    this.rumbleGain.gain.setTargetAtTime(k * 0.12, t, 0.08);
  }

  // ------------------------------------------------------------ music sequencer
  playMusic(cfg) {
    if (!cfg) return;
    if (!this.ctx) { this.pending = cfg; return; }
    this.song = { root: cfg.root || 57, tempo: cfg.tempo || 110, scale: SCALES[cfg.scale] || SCALES.major, style: cfg.style || 'pop' };
    this.prog = PROGS[this.song.style] || PROGS.pop;
    if (!this.seqTimer) {
      this.step = 0; this.bar = 0;
      this.nextTime = this.ctx.currentTime + 0.1;
      this.seqTimer = setInterval(() => this.schedule(), 25);
    }
  }

  stopMusic() { if (this.seqTimer) { clearInterval(this.seqTimer); this.seqTimer = null; } }

  note(deg, octave = 0) {
    const sc = this.song.scale; const n = sc.length;
    const o = Math.floor(deg / n); const i = ((deg % n) + n) % n;
    return this.song.root + sc[i] + 12 * (o + octave);
  }

  schedule() {
    const c = this.ctx; if (!c || c.state !== 'running') { if (c) this.nextTime = c.currentTime + 0.1; return; }
    const spb = 60 / this.song.tempo / 4; // 16th note
    while (this.nextTime < c.currentTime + 0.12) {
      this.playStep(this.step, this.nextTime, spb);
      this.nextTime += spb;
      this.step++;
      if (this.step % 16 === 0) this.bar++;
    }
  }

  playStep(step, t, spb) {
    const s16 = step % 16, bar = this.bar % 8, section = Math.floor(this.bar / 8) % 2;
    const prog = this.prog[section];
    const chord = prog[bar % 4];
    const st = this.song.style;
    const dest = this.musicGain;
    const intro = this.bar < 2;
    // drums
    const kickPat = st === 'chill' || st === 'dream' ? [0, 10] : st === 'industrial' ? [0, 4, 8, 12, 14] : st === 'funk' ? [0, 3, 8, 10] : [0, 8, 11];
    if (kickPat.includes(s16) && !(intro && s16 !== 0)) { this.osc('sine', 150, t, 0.28, 0.55, dest, { freqEnd: 42 }); }
    if ((s16 === 4 || s16 === 12) && !intro) { this.noiseHit(t, st === 'chill' ? 0.12 : 0.18, 0.22, 'bandpass', 1800, 0.7, dest); this.osc('triangle', 190, t, 0.08, 0.12, dest); }
    if (!intro && s16 % 2 === 0 && st !== 'dream') this.noiseHit(t, s16 % 4 === 2 ? 0.08 : 0.04, s16 % 4 === 2 ? 0.08 : 0.05, 'highpass', 7000, 0.5, dest);
    if (st === 'dream' && s16 % 4 === 2) this.noiseHit(t, 0.3, 0.03, 'highpass', 9000, 0.3, dest);
    // bass
    const bassPat = st === 'funk' ? [0, 3, 6, 8, 10, 14] : st === 'synth' ? [0, 2, 4, 6, 8, 10, 12, 14] : st === 'industrial' ? [0, 2, 3, 8, 10, 11] : [0, 6, 8, 14];
    if (bassPat.includes(s16)) {
      const n = this.note(chord, -2) + (st === 'funk' && s16 === 6 ? 12 : 0);
      const o = this.ctx.createOscillator(); o.type = st === 'chill' || st === 'dream' ? 'sine' : 'sawtooth'; o.frequency.value = mtof(n);
      const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(180, t + spb * 1.8); f.Q.value = 4;
      const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + spb * 1.9);
      o.connect(f); f.connect(g); g.connect(dest); o.start(t); o.stop(t + spb * 2);
    }
    // pad chord on bar start
    if (s16 === 0) {
      for (const deg of [0, 2, 4]) {
        const n = this.note(chord + deg, 0);
        for (const det of [-7, 7]) {
          const o = this.ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(n); o.detune.value = det;
          const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = st === 'industrial' ? 600 : 1300;
          const g = this.ctx.createGain(); const len = spb * 16;
          g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.028, t + len * 0.3); g.gain.linearRampToValueAtTime(0.0001, t + len);
          o.connect(f); f.connect(g); g.connect(dest); o.start(t); o.stop(t + len + 0.05);
        }
      }
    }
    // lead arpeggio / melody
    if (!intro) {
      const arp = st === 'synth' || st === 'bounce' ? [0, 2, 4, 7, 4, 2, 4, 7] : st === 'western' ? [0, -1, 0, 2, 4, 2, 0, -3] : [0, 2, 4, 2, 7, 4, 2, 4];
      const play = st === 'chill' || st === 'dream' ? s16 % 4 === 0 : s16 % 2 === 0;
      if (play && ((step * 7 + this.bar * 3) % 11) !== 3) {
        const deg = chord + arp[(s16 / 2 + bar) % arp.length | 0];
        const n = this.note(deg, 1);
        const type = st === 'folk' || st === 'western' ? 'triangle' : st === 'industrial' ? 'square' : 'triangle';
        const g = this.osc(type, mtof(n), t, spb * 1.6, st === 'industrial' ? 0.04 : 0.07, dest);
        g.connect(this.delay);
      }
    }
  }
}
