// Endless mode generator. Assembles an effectively infinite course from the obstacle library
// with difficulty ramping, recent-usage tracking (no immediate repeats, no repeated pairs),
// heading/elevation control (no self-intersection, stays in the sky), breathers and rare
// spectacular set pieces.
import { REGISTRY } from './obstacles/index.js';
import { rng as makeRng } from '../gfx/textures.js';

const lerp = (a, b, k) => a + (b - a) * k;
const ri = (r, a, b) => Math.floor(a + r() * (b - a + 1));

// Endless-safe obstacle pool. min = difficulty (0..1) at which it unlocks.
// p(d, r, ctx) returns parameters scaled by difficulty. dy = elevation change, turn = heading change (deg).
export const POOL = {
  slalom_gates: { min: 0, p: (d) => ({ gates: 4 + Math.round(d * 3), open: lerp(2.4, 1.8, d) }) },
  wave_track: { min: 0, p: (d) => ({ amp: lerp(0.7, 1.3, d) }) },
  brick_wall: { min: 0, p: (d, r) => ({ rows: ri(r, 3, 5) }) },
  balance_beam: { min: 0.05, p: (d) => ({ len: Math.round(lerp(18, 30, d)), w: lerp(1.3, 0.9, d) }) },
  twin_rails: { min: 0.05, p: (d) => ({ wa: lerp(1.2, 0.9, d), wb: lerp(0.8, 0.6, d) }) },
  step_pyramid: { min: 0, p: (d, r) => ({ steps: ri(r, 4, 7) }) },
  s_bend: { min: 0.1, p: (d) => ({ w: lerp(2.0, 1.4, d), amp: lerp(2.2, 3.2, d) }) },
  domino_run: { min: 0, p: () => ({}) },
  cliff_ledge: { min: 0.1, p: (d, r) => ({ side: r() < 0.5 ? -1 : 1, gem: false }) },
  pipe_bundle: { min: 0.1, p: (d) => ({ spread: lerp(1.1, 1.8, d) }) },
  zigzag: { min: 0.15, p: (d, r) => ({ zigs: 4, w: lerp(1.9, 1.4, d), angle: lerp(30, 38, d), flip: r() < 0.5 }) },
  camber_run: { min: 0.1, p: (d) => ({ tilt: lerp(14, 23, d) }) },
  tower_topple: { min: 0, p: (d, r) => ({ towers: ri(r, 4, 6) }) },
  banked_turn: { min: 0.1, turn: true, p: (d, r, ctx) => ({ angle: ctx.turnSign * ri(r, 60, 95) }) },
  hairpin: { min: 0.35, turn: true, p: (d, r, ctx) => ({ angle: ctx.turnSign * 90, dy: -2 }), dy: -2 },
  spiral_down: { min: 0.2, p: (d, r) => ({ turns: 1, dir: r() < 0.5 ? -1 : 1, drop: 8 }), dy: -8 },
  broken_bridge: { min: 0.15, p: () => ({}) },
  fork_paths: { min: 0.1, p: () => ({ gem: false }) },
  checker_holes: { min: 0.25, p: (d) => ({ fill: lerp(0.35, 0.2, d) }) },
  sliding_lanes: { min: 0.25, p: (d) => ({ speed: lerp(1.1, 1.5, d) }) },
  swing_bridges: { min: 0.35, p: (d) => ({ period: lerp(4.6, 4.0, d) }) },
  launch_ramp: { min: 0, p: (d) => ({ gap: Math.round(lerp(6, 9, d)) }), dy: -1.5 },
  twin_gaps: { min: 0.1, p: () => ({}) },
  spring_pads: { min: 0.1, p: (d, r) => ({ count: ri(r, 1, 2) }), dy: 3.4, dyMul: 'count' },
  sky_drop: { min: 0.05, p: (d) => ({ drop: Math.round(lerp(5, 8, d)) }), dy: -7, dyKey: 'drop' },
  hurdles: { min: 0.1, p: (d, r) => ({ count: ri(r, 3, 5) }) },
  mega_hoop: { min: 0.2, spectacle: true, p: (d, r) => ({ off: (r() - 0.5) * 2.4 }), dy: -2 },
  ski_jump: { min: 0.3, spectacle: true, p: () => ({}), dy: -12.5 },
  precision_hops: { min: 0.5, p: (d, r) => ({ count: ri(r, 5, 7) }) },
  pillar_hop: { min: 0.45, p: () => ({}) },
  track_transfer: { min: 0.4, p: (d, r) => ({ side: r() < 0.5 ? -1 : 1 }), shift: true },
  moving_landing: { min: 0.55, p: () => ({}), dy: -0.8 },
  cross_traffic: { min: 0.15, p: (d) => ({ rows: 4 + Math.round(d), speed: lerp(0.9, 1.35, d) }) },
  piston_punch: { min: 0.15, p: (d) => ({ count: 4 + Math.round(d * 2) }) },
  rotor_cross: { min: 0.2, p: (d, r) => ({ speed: lerp(0.9, 1.3, d), dir: r() < 0.5 ? -1 : 1 }) },
  wiper_arms: { min: 0.2, p: (d) => ({ count: 2 + Math.round(d), speed: lerp(1.1, 1.4, d) }) },
  boom_gates: { min: 0.1, p: () => ({}) },
  pendulums: { min: 0.2, p: (d) => ({ count: 3 + Math.round(d), speed: lerp(0.6, 0.75, d) }) },
  turntable: { min: 0.3, p: (d, r) => ({ dir: r() < 0.5 ? -1 : 1 }) },
  propeller: { min: 0.3, p: (d) => ({ count: 2 + Math.round(d) }) },
  disc_gate: { min: 0.45, p: (d) => ({ count: 2 + Math.round(d) }) },
  shifting_maze: { min: 0.5, p: (d) => ({ period: lerp(3.2, 2.8, d) }) },
  log_roller: { min: 0.4, p: (d) => ({ count: 2 + Math.round(d), speed: lerp(1.5, 1.9, d) }) },
  rope_bridge: { min: 0.2, p: () => ({}) },
  swing_platforms: { min: 0.4, p: () => ({}) },
  trampolines: { min: 0.3, p: (d, r) => ({ count: ri(r, 4, 5) }) },
  crushers: { min: 0.4, p: (d) => ({ rows: 3 + Math.round(d), period: lerp(2.4, 2.2, d) }) },
  conveyor_run: { min: 0.15, p: () => ({}) },
  hammer_slam: { min: 0.45, p: (d) => ({ count: 4 + Math.round(d) }) },
  paddle_wheel: { min: 0.35, p: (d) => ({ count: 2 + Math.round(d) }) },
  barrel_avalanche: { min: 0.35, p: () => ({}), dy: 3.2 },
  piston_field: { min: 0.25, p: () => ({}) },
  squeeze_walls: { min: 0.3, p: (d) => ({ rows: 4 + Math.round(d), speed: lerp(1.3, 1.6, d) }) },
  flip_flop: { min: 0.45, p: () => ({}) },
  retract_rails: { min: 0.45, p: () => ({}) },
  wobble_plates: { min: 0.3, p: (d) => ({ tilt: lerp(12, 16, d) }) },
  vortex_tunnel: { min: 0.3, p: (d) => ({ rock: lerp(14, 20, d) }) },
  seesaws: { min: 0.25, p: () => ({}) },
  ice_rink: { min: 0.3, p: () => ({}) },
  tar_pit: { min: 0.35, p: () => ({}), dy: -0.8 },
  wind_fans: { min: 0.35, p: (d) => ({ force: lerp(13, 18, d) }) },
  steep_climb: { min: 0.15, p: () => ({}), dy: -2 },
  moguls: { min: 0.05, p: () => ({}) },
  pinball: { min: 0.3, p: () => ({}) },
  magnet_orbs: { min: 0.35, p: (d) => ({ strength: lerp(16, 22, d) }) },
  low_gravity: { min: 0.4, spectacle: true, p: (d, r) => ({ count: ri(r, 3, 4) }), dy: 1.4, dyMul: 'countPlus1' },
  turbo_slalom: { min: 0.4, p: () => ({}) },
  hoop_run: { min: 0, p: () => ({}) },
  neon_tunnel: { min: 0.3, p: () => ({}) },
  bowling: { min: 0, p: () => ({}) },
  laser_grid: { min: 0.55, p: (d) => ({ period: lerp(2.6, 2.2, d) }) },
  gold_rush: { min: 0, bonus: true, p: () => ({ gem: false, len: 30 }) },
  // set pieces
  assembling_bridge: { min: 0, p: (d, r) => ({ wave: 0.8 + r() }) },
  domino_bridge: { min: 0.08, p: () => ({}) },
  hydraulic_lift: { min: 0.1, p: () => ({ rise: 5.5 }), dy: 5.5 },
  cannon: { min: 0.15, spectacle: true, p: () => ({ dist: 30, rise: 3 }), dy: 3 },
  pinball_room: { min: 0.2, p: () => ({}) },
  sky_route: { min: 0.2, p: (d, r) => ({ side: r() < 0.5 ? -1 : 1 }) },
  claw_drop: { min: 0.25, p: (d) => ({ count: 2 + Math.round(d * 2) }) },
  loop: { min: 0.25, spectacle: true, p: () => ({}) },
  ring_flight: { min: 0.3, spectacle: true, p: () => ({}), dy: -1 },
  rotating_world: { min: 0.3, p: (d, r) => ({ speed: lerp(0.4, 0.6, d), dir: r() < 0.5 ? -1 : 1 }) },
  gear_train: { min: 0.3, p: (d) => ({ count: 3 + Math.round(d) }) },
  wall_ride: { min: 0.3, p: () => ({}) },
  boulder_run: { min: 0.3, p: () => ({}), dy: 4.5 },
  chaser: { min: 0.3, spectacle: true, p: (d) => ({ speed: lerp(8.4, 9.6, d) }) },
  magnetic_storm: { min: 0.35, p: (d) => ({ force: lerp(15, 19, d) }) },
  updrafts: { min: 0.35, spectacle: true, p: () => ({}) },
  hyper_tunnel: { min: 0.45, p: () => ({}), dy: -2.5 },
  sweep_lasers: { min: 0.5, p: (d) => ({ period: lerp(2.6, 2.2, d) }) },
};

// Endless zones: every few obstacles the run enters a new themed family that reshapes the
// obstacle mix (and sometimes the pace). Each zone starts at a calm "zone gate" breather.
export const ZONES = [
  { id: 'warmup', name: 'WARM-UP', sub: 'Find your rhythm', cats: [], first: true },
  { id: 'machine', name: 'MACHINE ZONE', sub: 'Gears, pistons and crushers', cats: ['Mechanical'] },
  { id: 'rush', name: 'RUSH HOUR', sub: 'Everything is moving', cats: ['Moving'], speed: 1.06 },
  { id: 'air', name: 'AIR TIME', sub: 'Big jumps - stick the landings', cats: ['Jumps'] },
  { id: 'physics', name: 'PHYSICS PLAYGROUND', sub: 'Smash it, push it, ride it', cats: ['Physics'] },
  { id: 'nerves', name: 'NERVES OF STEEL', sub: 'Narrow tracks, zero margin', cats: ['Narrow Track'] },
  { id: 'strange', name: 'STRANGE SKIES', sub: 'Gravity is optional', cats: ['Special'] },
  { id: 'spectacle', name: 'SPECTACLE', sub: 'The giant machines wake up', cats: ['Set Piece'], spectacle: true, min: 0.12 },
  { id: 'overdrive', name: 'OVERDRIVE', sub: '+10% speed - hold on!', cats: ['Moving', 'Jumps'], speed: 1.1, min: 0.3 },
];

const ENDLESS_THEMES = ['metropolis', 'neon', 'coastal', 'construction', 'architect', 'clouds', 'harbor', 'alpine', 'desert', 'factory'];

export class EndlessGenerator {
  constructor(seed, themeId) {
    this.seed = seed >>> 0;
    this.r = makeRng(this.seed);
    this.theme = themeId || ENDLESS_THEMES[Math.floor(this.r() * ENDLESS_THEMES.length)];
    this.history = []; // obstacle ids in order
    this.pairs = new Set();
    this.heading = 0; // degrees relative to start (+right)
    this.dy = 0; // elevation relative to theme track height
    this.count = 0;
    this.sinceBreather = 0;
    this.distance = 0;
    this.zone = ZONES[0]; this.zoneHistory = ['warmup'];
    this.sectionSeed = this.seed;
  }

  difficultyAt(s) { return Math.min(1, s / 2600); }
  speedMulAt(s) { return 1 + Math.min(0.3, s / 9000); }

  initial() {
    return [{ type: 'start' }, { type: 'runway', params: { len: 10, coins: true } }, ...this.next(0, true)];
  }

  def(type, params) { return { type, params, seed: this.sectionSeed++ }; }

  pickObstacle(d) {
    const last = this.history[this.history.length - 1];
    const recent = new Set(this.history.slice(-6));
    const lastCat = last ? REGISTRY[last].category : null;
    const cands = [];
    for (const [id, cfg] of Object.entries(POOL)) {
      if (cfg.min > d + 0.05) continue;
      if (recent.has(id)) continue;
      if (last && this.pairs.has(last + '>' + id)) continue;
      if (cfg.bonus) continue;
      if (cfg.dy && this.dy + cfg.dy < -22) continue; // keep the track up in the sky
      if (cfg.dy && this.dy + cfg.dy > 24) continue;
      if (cfg.spectacle && this.r() > (this.zone.spectacle ? 0.85 : 0.25)) continue; // rare set pieces
      let w = 1;
      const cat = REGISTRY[id].category;
      if (cat === lastCat && !this.zone.cats.includes(cat)) w *= 0.35;
      if (this.zone.cats.includes(cat)) w *= 4;
      const diff = (REGISTRY[id].difficulty || 2) / 5;
      w *= 1 - Math.abs(diff - (0.25 + d * 0.65)) * 0.8;
      // newer unlocks get a slight boost so the variety keeps evolving
      if (cfg.min > d - 0.15) w *= 1.4;
      cands.push([id, Math.max(0.05, w)]);
    }
    if (!cands.length) return 'moguls';
    let tot = cands.reduce((a, c) => a + c[1], 0);
    let x = this.r() * tot;
    for (const [id, w] of cands) { x -= w; if (x <= 0) return id; }
    return cands[cands.length - 1][0];
  }

  // next themed zone: unlocked by difficulty, never one of the last three
  pickZone(d) {
    const recent = new Set(this.zoneHistory.slice(-3));
    const opts = ZONES.filter((z) => !z.first && !recent.has(z.id) && (z.min || 0) <= d + 0.05);
    const z = opts.length ? opts[Math.floor(this.r() * opts.length)] : ZONES[1];
    this.zone = z; this.zoneHistory.push(z.id);
    return { id: z.id, name: z.name, sub: z.sub, speed: z.speed || 1, n: this.zoneHistory.length };
  }

  // Generate the next chunk of section definitions.
  next(s, first = false) {
    const d = this.difficultyAt(s);
    const out = [];
    // connector: steer heading back toward 0 and keep variety in the flow
    const cr = this.r();
    if (!first) {
      if (Math.abs(this.heading) > 35 || cr < 0.35) {
        const sign = this.heading > 20 ? -1 : this.heading < -20 ? 1 : (this.r() < 0.5 ? -1 : 1);
        const ang = sign * ri(this.r, 20, 40);
        out.push(this.def('curve', { angle: ang, r: 16 + this.r() * 8 }));
        this.heading += ang;
      } else if (this.dy > 12 || this.dy < -10 || cr < 0.5) {
        const dyc = this.dy > 8 ? -4 : this.dy < -6 ? 4 : (this.r() < 0.5 ? -3 : 3);
        out.push(this.def('slope', { dy: dyc, len: 16 }));
        this.dy += dyc;
      } else {
        out.push(this.def('runway', { len: ri(this.r, 4, 8), coins: this.r() < 0.5 }));
      }
    }
    // breather / bonus every few obstacles
    if (this.sinceBreather >= 5 + Math.floor(this.r() * 3)) {
      this.sinceBreather = 0;
      const gate = this.r() < 0.5 ? this.def('gold_rush', { gem: false, len: 26 }) : this.def('runway', { len: 12, coins: true, arrows: true });
      gate.zone = this.pickZone(d);
      out.push(gate);
      return out;
    }
    // obstacle
    const id = this.pickObstacle(d);
    const cfg = POOL[id];
    const ctx = { turnSign: this.heading > 0 ? -1 : 1 };
    const params = cfg.p(d, this.r, ctx);
    params.gem = params.gem ?? false;
    out.push(this.def(id, params));
    // bookkeeping
    const last = this.history[this.history.length - 1];
    if (last) { this.pairs.add(last + '>' + id); if (this.pairs.size > 60) this.pairs.delete(this.pairs.values().next().value); }
    this.history.push(id);
    if (this.history.length > 200) this.history.shift();
    if (cfg.turn && params.angle) this.heading += params.angle;
    if (cfg.dy) {
      let dy = cfg.dy;
      if (cfg.dyKey) dy = -(params[cfg.dyKey] || -cfg.dy);
      if (cfg.dyMul === 'count') dy *= params.count || 1;
      if (cfg.dyMul === 'countPlus1') dy *= (params.count || 4) + 1;
      this.dy += dy;
    }
    this.count++; this.sinceBreather++;
    return out;
  }
}
