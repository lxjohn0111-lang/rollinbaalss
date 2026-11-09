// Spectacular set pieces: the opening launch bay, cannons, chasers, loops, rotating worlds,
// updrafts, ring flights, physics bridges, self-assembling tracks and boulder avalanches.
import * as THREE from 'three';
import { R } from '../../core/physics.js';
import { W, TAU, arrows, pad, smooth, clamp, lerp, guardRail, segDist, arch } from './kit.js';
import { boostPad } from './jumps.js';

const deg = Math.PI / 180;
const ease = (k) => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };

function glowRing(B, x, y, d, r, mat, tube = 0.12, parent) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 10, 48), mat);
  m.position.set(x, y, -d); (parent || B.group).add(m); return m;
}

export const SETPIECES = [
  // ------------------------------------------------------------------ LAUNCH BAY (level opening)
  {
    id: 'launch_bay', name: 'Launch Bay', category: 'Set Piece', kind: 'structure', setPiece: true, difficulty: 1,
    desc: 'A high launch pad, a giant ring machine that powers up on GO, a plunging ramp, a sweeping barrier to hop and a spinning landing disc.',
    build(B, p) {
      const drop = 6;
      // launch pad
      B.cyl(0, -0.3, 4, 4.2, 0.6, 'y', B.m.plate, { seg: 40 });
      pad(B, -2, 10, 4.4, { edges: true, edgeMat: B.m.glow });
      const padRings = [glowRing(B, 0, 0.03, 4, 3.0, B.m.glow, 0.06), glowRing(B, 0, 0.03, 4, 3.9, B.m.glowGold, 0.05)];
      padRings.forEach((r) => (r.rotation.x = Math.PI / 2));
      for (const s of [-1, 1]) { B.box(s * 4.6, 2.5, 4, 0.6, 5, 0.6, B.m.darkSteel, { collide: false }); B.box(s * 4.6, 5.2, 4, 0.9, 0.5, 0.9, B.m.glow, { collide: false }); }
      // the ring machine spanning the ramp
      const ring = new THREE.Group(); ring.position.set(0, -drop / 2 + 1.5, -21); B.group.add(ring);
      ring.add(new THREE.Mesh(new THREE.TorusGeometry(7.2, 0.55, 14, 64), B.m.darkSteel));
      const lights = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: new THREE.Color(B.m.p.glow || '#38e0ff'), emissiveIntensity: 0.05 });
      B.disposables.push(lights);
      const lightRing = new THREE.Mesh(new THREE.TorusGeometry(6.6, 0.16, 8, 64), lights); ring.add(lightRing);
      for (let k = 0; k < 8; k++) { const arm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.7), B.m.machine); const a = k * TAU / 8; arm.position.set(Math.cos(a) * 7.6, Math.sin(a) * 7.6, 0); arm.rotation.z = a; ring.add(arm); }
      ring.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      for (const s of [-1, 1]) B.box(s * 8.2, -drop - 4, 21, 1.2, 14, 1.2, B.m.darkSteel, { collide: false });
      // ramp down through the ring
      const ramp = (u) => ({ x: 0, y: -drop * smooth(u), d: 10 + 20 * u, h: 0, w: 5 });
      B.ribbon(ramp, 30, 5, 0.5, B.m.deckAlt, { path: true, supports: true, supportStep: 7, walls: { h: 0.45, t: 0.2, mat: B.m.rail } });
      boostPad(B, 0, 26, 30, 3.4, 1.5, 1.6);
      // flat run with the sweeping barrier
      B.deck(0, 30, 52, 5.4, { y: -drop, edges: true });
      const bar = B.mover(0, -drop, 38);
      bar.box(0, 0.45, 0, 2.4, 0.9, 0.45, B.m.hazard);
      bar.box(0, 0.95, 0, 2.5, 0.12, 0.5, B.m.glowRed, { collide: false });
      B.box(0, -drop + 0.01, 38, 6.4, 0.02, 0.2, B.m.steel, { collide: false, cast: false });
      const barX = (t) => 2.0 * Math.sin(t * 2.3);
      B.onUpdate((t) => { bar.obj.position.x = barX(t); });
      B.trigger(0, -drop + 1, 32, 6, 3, 2, () => B.hintText('jump', 'PRESS  SPACE  TO JUMP', 'TAP  JUMP  TO HOP'), { repeat: false });
      arrows(B, 0, 34, 2, 2, B.m.arrowBlue, -drop + 0.012);
      B.coinLine(0, 31, 0, 36, 3, -drop + 0.65);
      // kicker and gap onto the spinning disc
      const kick = (u) => ({ x: 0, y: -drop + 1.0 * Math.pow(u, 1.8), d: 52 + 4 * u, h: 0, w: 5.4 });
      B.ribbon(kick, 12, 5.4, 0.5, B.m.deckAlt, { path: true, supports: true });
      const dc = 56 + 4.5 + 5.5;
      const disc = B.mover(0, -drop, dc);
      disc.cyl(0, -0.25, 0, 5.5, 0.5, 'y', B.m.plate, { seg: 56 });
      disc.cyl(0, 0.012, 0, 5.3, 0.02, 'y', B.m.deck, { seg: 56, collide: false });
      const dl = glowRing(B, 0, 0.03, 0, 5.0, B.m.glowGold, 0.06, disc.obj); dl.rotation.x = Math.PI / 2;
      B.cyl(0, -drop - 1.3, dc, 1.4, 2, 'y', B.m.darkSteel, { collide: false });
      B.support(0, dc, -drop - 2.3);
      B.onUpdate((t) => { disc.obj.rotation.y = t * 0.55; });
      for (let k = 0; k < 10; k++) { const a = k * TAU / 10; B.coin(Math.cos(a) * 3.2, -drop + 0.65, dc + Math.sin(a) * 3.2); }
      for (let i = 1; i < 6; i++) B.coin(0, -drop + 1.6 + Math.sin(i / 6 * Math.PI) * 1.6, 56 + i * 1.3);
      if (p.gem !== false) B.gem(0, -drop + 1.0, dc);
      B.deck(0, dc + 5.3, dc + 11, 4.4, { y: -drop, edges: true, edgeMat: B.m.glow });
      B.pathLine(0, 56, 0, dc + 11, -drop + 1, -drop);
      // power-up when the player gets GO
      let fired = false;
      B.onUpdate((t) => {
        const on = t >= B.goTime;
        if (on && !fired) { fired = true; B.game.sfx && B.game.sfx('rumble', 1); }
        const k = on ? Math.min(1, (t - B.goTime) * 1.5) : 0.05;
        lights.emissiveIntensity = 0.05 + k * 2.4;
        ring.rotation.z = on ? (t - B.goTime) * 0.7 : 0;
        padRings[0].scale.setScalar(1 + Math.sin(t * 4) * 0.03 * k);
      });
      B.onReset(() => { fired = true; });
      B.hint = (c) => ({ lat: 0, jump: c.local.d > 33.6 && c.local.d < 34.6 && c.v > 9 });
      B.cam = { dist: 6.2, height: 3.3 };
      B.exit(0, -drop, dc + 11);
    },
  },

  // ------------------------------------------------------------------ CANNON
  {
    id: 'cannon', name: 'Launch Cannon', category: 'Set Piece', setPiece: true, difficulty: 2,
    desc: 'Roll into the breech and get fired across the sky onto a distant platform.',
    build(B, p) {
      const D = p.dist || 30, H = p.rise ?? 3, ang = 40 * deg;
      pad(B, 0, 8, W, { edges: true });
      arrows(B, 0, 4, 2.4, 3, B.m.arrowGold);
      // barrel
      const bx = 0, by = 0.9, bd = 10;
      const barrel = new THREE.Group(); barrel.position.set(bx, by, -bd); barrel.rotation.x = ang; B.group.add(barrel);
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.5, 5, 32, 1, true), new THREE.MeshStandardMaterial({ color: 0x30343c, metalness: 0.85, roughness: 0.35, side: THREE.DoubleSide }));
      B.disposables.push(tube.material);
      tube.position.y = 1.6; barrel.add(tube);
      for (const y of [0.1, 1.6, 3.1]) { const band = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.14, 8, 32), B.m.accent); band.rotation.x = Math.PI / 2; band.position.y = y; barrel.add(band); }
      const muzzle = glowRing(B, 0, 4.1, 0, 1.25, B.m.glowRed, 0.1, barrel); muzzle.rotation.x = Math.PI / 2;
      barrel.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      for (const s of [-1, 1]) B.box(s * 2.0, 0.6, bd, 0.6, 1.8, 2.6, B.m.machine, { collide: false });
      B.deck(0, 8, 12, W, {});
      // target platform
      const td = bd + D, ty = H;
      B.deck(0, td - 3, td + 14, 7, { y: ty, edges: true, edgeMat: B.m.glowGold });
      arrows(B, 0, td + 1, 3, 3, B.m.arrowGreen, ty + 0.012);
      // aerial coin trail along the ideal arc
      const g = 24;
      const v = Math.sqrt(g * D * D / (2 * Math.cos(ang) ** 2 * (D * Math.tan(ang) - (H - by))));
      for (let i = 1; i < 9; i++) { const x = i / 9 * D; const tt = x / (v * Math.cos(ang)); B.coin(0, by + v * Math.sin(ang) * tt - 0.5 * g * tt * tt, bd + x); }
      B.pathLine(0, 0, 0, bd, 0, 0);
      B.pathFn((u) => { const x = u * D; const tt = x / (v * Math.cos(ang)); return { x: 0, y: Math.max(ty, by + v * Math.sin(ang) * tt - 0.5 * g * tt * tt) - (u > 0.95 ? 0 : 0), d: bd + x }; }, 24);
      B.pathLine(0, td, 0, td + 14, ty, ty);
      // capture & fire
      let state = 0, t0 = 0;
      const fwd = B.dirW(0, 1);
      B.trigger(0, 0.6, bd - 0.8, 3, 2.5, 1.6, () => { if (state === 0) { state = 1; t0 = B.game.time; B.game.sfx('hiss', 1); } });
      B.onUpdate((t) => {
        const ball = B.ball; if (!ball || !ball.body) return;
        if (state === 1) {
          const hold = B.W(0, by + 0.2, bd);
          ball.body.setTranslation({ x: hold.x, y: hold.y, z: hold.z }, true);
          ball.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
          barrel.scale.setScalar(1 + Math.sin((t - t0) * 40) * 0.015);
          if (t - t0 > 0.55) {
            state = 2;
            const vx = fwd.x * v * Math.cos(ang), vz = fwd.z * v * Math.cos(ang);
            ball.body.setLinvel({ x: vx, y: v * Math.sin(ang), z: vz }, true);
            barrel.scale.setScalar(1);
            B.game.sfx('cannon'); B.game.cam.shake(0.9);
            const mz = B.W(0, by + 3.6, bd + 2.6);
            B.game.effects.impact(mz, '#ffb04a'); B.game.effects.landDust(mz, 14);
            B.trick('CANNON SHOT', 100, { color: 'gold', boost: 10 });
          }
        }
      });
      B.onReset(() => { state = 0; });
      B.freeRoll = (ball) => state === 1 || (state === 2 && !ball.grounded);
      B.speedMul = 0.8;
      B.cam = { dist: 9, height: 5, fov: 70 };
      B.hint = () => ({ lat: 0 });
      B.exit(0, ty, td + 14);
    },
  },

  // ------------------------------------------------------------------ THE CHASER
  {
    id: 'chaser', name: 'The Chaser', category: 'Set Piece', setPiece: true, difficulty: 3,
    desc: 'A giant grinding roller wakes up behind you - keep moving while you dodge, hop and weave.',
    build(B, p) {
      const len = p.len || 78, speed = p.speed || 8.6;
      pad(B, 0, 6, W, { edges: true, edgeMat: B.m.glowRed });
      B.deck(0, 6, len, W + 0.6, { edges: true, edgeMat: B.m.glowRed });
      for (const s of [-1, 1]) B.box(s * (W / 2 + 0.6), 0.5, len / 2 + 3, 0.3, 1.0, len - 6, B.m.darkSteel, { collide: false });
      // roller
      const roller = B.mover(0, 2.2, -6);
      roller.cyl(0, 0, 0, 2.2, W + 1, 'x', B.m.darkSteel, { seg: 24, collide: false });
      for (let k = 0; k < 10; k++) { const a = k * TAU / 10; roller.box(0, Math.sin(a) * 2.25, Math.cos(a) * 2.25, W + 1.05, 0.35, 0.35, B.m.hazard, { rx: a, collide: false }); }
      const glow = new THREE.PointLight(0xff3020, 0, 14); roller.obj.add(glow);
      for (const s of [-1, 1]) roller.box(s * (W / 2 + 0.9), 0, 0, 0.6, 3.2, 3.2, B.m.machine, { collide: false });
      // obstacles inside the run
      const posts = [], hurdles = [];
      const lay = p.layout || [['post', -1.4, 16], ['post', 1.2, 21], ['hurdle', 0, 28], ['post', 0, 35], ['post', -1.6, 40], ['post', 1.6, 40], ['hurdle', 0, 48], ['post', -1, 56], ['post', 1.3, 61], ['hurdle', 0, 68]];
      for (const [kind, x, d] of lay) {
        if (d > len - 3) continue;
        if (kind === 'post') { B.cyl(x, 0.75, d, 0.4, 1.5, 'y', B.m.machine, { seg: 14 }); B.cyl(x, 1.55, d, 0.45, 0.1, 'y', B.m.glowRed, { collide: false }); posts.push({ x, d }); }
        else { B.box(0, 0.35, d, W, 0.7, 0.3, B.m.accent, {}); B.box(0, 0.72, d, W, 0.06, 0.34, B.m.hazard, { collide: false }); arrows(B, 0, d - 3.5, 2, 2, B.m.arrowBlue); hurdles.push(d); }
      }
      B.coinLine(0, 9, 0, 14, 3); B.coinLine(0, 30, 0, 33, 2); B.coinLine(0, 50, 0, 54, 3);
      // escape gate at the end
      const gate = B.mover(0, 0, len - 1.5);
      gate.box(0, 1.6, 0, W + 1, 3.2, 0.5, B.m.darkSteel, { collide: false });
      let active = false, t0 = 0, done = false, warned = false;
      const wallD = (t) => -6 + speed * (t - t0) + Math.max(0, (t - t0) - 4) * 0.25 * (t - t0 - 4);
      B.trigger(0, 1, 7, W + 2, 4, 2, () => { if (!active && !done) { active = true; t0 = B.game.time; B.game.sfx('alarm', 1); B.game.ui.flash && B.game.ui.popup('RUN!', 'red'); } });
      B.trigger(0, 1, len - 3, W + 2, 4, 2, () => { if (active) { active = false; done = true; B.trick('ESCAPED', 200, { color: 'green', boost: 20 }); } });
      B.onUpdate((t, dt) => {
        if (!active) { roller.obj.position.z = 6; roller.obj.position.y = -40; glow.intensity = 0; roller.obj.visible = false; return; }
        roller.obj.visible = true; roller.obj.position.y = 2.2;
        const d = wallD(t);
        roller.obj.position.z = -d; roller.obj.rotation.x -= dt * speed / 2.2;
        glow.intensity = 3;
        const b = B.ballLocal();
        if (b && b.d < d + 2.5 && Math.abs(b.x) < W && b.y < 3) B.kill('crushed');
        if (b && b.d - d < 9 && !warned) { warned = true; B.game.cam.shake(0.4); }
        if (Math.random() < dt * 3) B.sfxNear('clank', 0, d, 0.8, 40);
        if (d > len) { active = false; done = true; }
      });
      B.onReset(() => { active = false; done = false; warned = false; roller.obj.visible = true; });
      B.danger = (x, d) => { let m = 9; for (const q of posts) m = Math.min(m, Math.hypot(x - q.x, d - q.d) - 1.0); return m; };
      B.hint = (c) => {
        let lat = 0, best = -9;
        for (let x = -2.2; x <= 2.2; x += 0.4) { let sc = 0; for (const q of posts) if (q.d > c.local.d && q.d < c.local.d + 9) sc = Math.min(sc, Math.abs(x - q.x) - 1.1); sc -= Math.abs(x - c.local.x) * 0.05; if (sc > best) { best = sc; lat = x; } }
        return { lat: c.lat + (lat - c.local.x), jump: hurdles.some((h) => c.local.d > h - 3.6 && c.local.d < h - 2.6), speed: 11.5 };
      };
      B.width = W;
      B.cam = { dist: 6.4, height: 3.2, fov: 66 };
      B.exit(0, 0, len);
    },
  },

  // ------------------------------------------------------------------ VERTICAL LOOP
  {
    id: 'loop', name: 'Loop-the-Loop', category: 'Set Piece', setPiece: true, difficulty: 3,
    desc: 'Hit the boosters and ride a full vertical loop - too slow and you drop out.',
    build(B, p) {
      const r = p.radius || 3.4, shift = 4.0, w = 2.6, L0 = 14;
      pad(B, 0, 4, W);
      B.deck(0, 4, L0, w + 1, { edges: true, edgeMat: B.m.glowGold });
      boostPad(B, 0, 5, 12, 2.6, 2.0, 1.6);
      const loopFn = (u) => { const a = u * TAU; return { x: shift * smooth(u), y: r * (1 - Math.cos(a)), d: L0 + r * Math.sin(a), h: 0 }; };
      B.ribbon((u) => ({ ...loopFn(u), w }), 90, w, 0.35, B.m.plate, { path: false });
      for (const side of [-1, 1]) {
        B.ribbon((u) => { const c = loopFn(u); const a = u * TAU, off = side * (w / 2 + 0.08), wh = 0.75; return { x: c.x + off, y: c.y + wh * Math.cos(a), d: c.d - wh * Math.sin(a), h: 0, w: 0.16 }; }, 90, 0.16, 0.75, B.m.rail, {});
      }
      for (let i = 0; i < 12; i++) { const c = loopFn((i + 0.5) / 12); const a = (i + 0.5) / 12 * TAU; B.coin(c.x, c.y + 0.6 * Math.cos(a), c.d - 0.6 * Math.sin(a)); }
      // supports & frame
      for (const s of [-1, 1]) B.box(shift / 2 + s * 2.4, r - 1, L0, 0.4, 2 * r + 2, 0.4, B.m.darkSteel, { collide: false });
      B.box(shift / 2, 2 * r + 0.6, L0, 5.2, 0.4, 0.4, B.m.darkSteel, { collide: false });
      B.support(shift / 2, L0, -0.6);
      B.pathLine(0, 0, 0, L0);
      B.pathFn((u) => { const c = loopFn(u); return { x: c.x, y: c.y, d: c.d }; }, 50);
      B.deck(shift, L0, L0 + 10, 3.2, { edges: true });
      B.ribbon((u) => ({ x: shift * (1 - smooth(u)), y: 0, d: L0 + 10 + 7 * u, h: Math.atan(-shift * 6 * u * (1 - u) / 7), w: lerp(3.2, W, u) }), 12, W, 0.5, B.m.deck, { path: true });
      B.trigger(shift / 2, 2 * r - 0.5, L0, 4, 1.6, 2.4, () => B.trick('LOOP', 150, { color: 'blue', boost: 15 }), { repeat: false });
      B.onReset(() => {});
      // inside the loop the ball is carried by physics only
      B.freeRoll = (ball) => { const l = B.toLocal(ball.curPos); return l.d > L0 - r - 0.2 && l.d < L0 + r + 0.5 && l.y > 0.9; };
      B.speedMul = 1.9;
      B.cam = { dist: 9, height: 4.5, fov: 68, fixed: true };
      B.hint = () => ({ lat: 0, boost: true, speed: 20 });
      B.exit(0, 0, L0 + 17);
    },
  },

  // ------------------------------------------------------------------ ROTATING WORLD
  {
    id: 'rotating_world', name: 'Rotating World', category: 'Set Piece', setPiece: true, difficulty: 3,
    desc: 'Roll through a giant spinning tube - its walls, fins and lights turn around you.',
    build(B, p, rng) {
      const Rt = 4.2, len = p.len || 40, staves = 26, wspd = (p.speed || 0.42) * (p.dir || 1);
      pad(B, 0, 4, W);
      const tube = B.mover(0, Rt, 4 + len / 2);
      const sw = TAU * Rt / staves + 0.04;
      for (let k = 0; k < staves; k++) {
        const a = k * TAU / staves;
        tube.box(Math.cos(a) * (Rt + 0.2), Math.sin(a) * (Rt + 0.2), 0, 0.4, sw, len, k % 2 ? B.m.plate : B.m.deckAlt, { rz: a, friction: 0.9 });
      }
      for (let i = 0; i <= 4; i++) { const ringM = new THREE.Mesh(new THREE.TorusGeometry(Rt + 0.45, 0.22, 8, 48), i % 2 ? B.m.glow : B.m.darkSteel); ringM.position.z = len / 2 - i * len / 4; tube.obj.add(ringM); }
      const fins = [];
      const n = p.fins || 9;
      for (let i = 0; i < n; i++) {
        const a = rng() * TAU, d = -len / 2 + 6 + i * (len - 10) / n;
        const fh = 0.85, fw = 1.4;
        tube.box(Math.cos(a) * (Rt - fh / 2), Math.sin(a) * (Rt - fh / 2), d, fh, fw, 0.6, B.m.hazard, { rz: a });
        fins.push({ a, d: 4 + len / 2 + d });
      }
      for (const s of [-1, 1]) { const end = new THREE.Mesh(new THREE.TorusGeometry(Rt + 0.6, 0.5, 10, 48), B.m.machine); end.position.set(0, Rt, -(4 + len / 2 + s * len / 2)); B.group.add(end); }
      B.support(0, 4, -0.6); B.support(0, 4 + len, -0.6);
      const ang = (t) => t * wspd;
      B.onUpdate((t) => { tube.obj.rotation.z = ang(t); });
      B.coinLine(0, 7, 0, 3 + len, Math.floor(len / 3));
      pad(B, 4 + len, 8 + len, W);
      B.danger = (x, d, t) => {
        let m = 9;
        for (const f of fins) {
          if (Math.abs(d - f.d) > 0.9) continue;
          const a = f.a + ang(t);
          const fx = Math.cos(a) * (Rt - 0.45), fy = Rt + Math.sin(a) * (Rt - 0.45);
          m = Math.min(m, Math.hypot(x - fx, 0.5 - fy) - 1.25);
        }
        return m;
      };
      B.width = 4.0;
      B.cam = { dist: 5.0, height: 1.9 };
      B.exit(0, 0, 8 + len);
    },
  },

  // ------------------------------------------------------------------ UPDRAFTS
  {
    id: 'updrafts', name: 'Updraft Canyon', category: 'Set Piece', setPiece: true, difficulty: 3,
    desc: 'Giant fans below the gaps blast columns of air - steer into each column to float across.',
    build(B, p) {
      const cols = p.cols || [{ x: -1.4, len: 12 }, { x: 1.4, len: 12 }, { x: -0.6, len: 14 }];
      pad(B, 0, 6, W, { edges: true });
      arrows(B, 0, 3.5, 2, 2, B.m.arrowBlue);
      let d = 6;
      const zones = [];
      for (let i = 0; i < cols.length; i++) {
        const c = cols[i];
        const zd0 = d, zd1 = d + c.len;
        // fan far below
        const fan = new THREE.Group(); fan.position.set(c.x, -9, -(zd0 + c.len / 2)); B.group.add(fan);
        const housing = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 1.2, 32, 1, true), B.m.darkSteel); fan.add(housing);
        const blades = new THREE.Group(); fan.add(blades);
        for (let k = 0; k < 5; k++) { const bl = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 2.3), B.m.steel); bl.position.z = 1.1; const pv = new THREE.Group(); pv.rotation.y = k * TAU / 5; pv.add(bl); bl.rotation.z = 0.4; blades.add(pv); }
        const beam = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, 12, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xbfefff, transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide }));
        B.disposables.push(beam.material, housing.material);
        beam.position.y = 6; fan.add(beam);
        B.box(c.x, -10, zd0 + c.len / 2, 3, 1, 3, B.m.machine, { collide: false });
        zones.push({ x: c.x, d0: zd0, d1: zd1, blades });
        for (let k = 1; k < 5; k++) B.coin(c.x, 1.6 + Math.sin(k / 5 * Math.PI) * 0.6, zd0 + k * c.len / 5);
        d = zd1;
        if (i < cols.length - 1) { B.deck((c.x + cols[i + 1].x) / 2, d, d + 4, 3.2, { edges: true }); d += 4; }
      }
      pad(B, d, d + 6, W, { edges: true });
      B.pathLine(0, 0, 0, d + 6, 0, 0);
      B.onUpdate((t, dt) => {
        for (const z of zones) z.blades.rotation.y += dt * 12;
        const b = B.ballLocal(); if (!b) return;
        for (const z of zones) {
          const dx = b.x - z.x;
          if (b.d > z.d0 - 0.5 && b.d < z.d1 + 0.5 && Math.abs(dx) < 2.4 && b.y > -8) {
            const hover = 1.8, vy = B.ball.vel.y;
            const ay = 24 + (hover - b.y) * 14 - vy * 3.5;
            B.ball.addAccel(0, clamp(ay, 0, 46), 0);
            const rv = B.dirW(-dx, 0); B.ball.addAccel(rv.x * 3, 0, rv.z * 3);
            if (Math.random() < 0.3) B.game.effects.streak.spawn({ pos: B.W(z.x + (Math.random() - 0.5) * 3.5, b.y - 2.5, b.d + (Math.random() - 0.5) * 3), vel: new THREE.Vector3(0, 16, 0), life: 0.4, size: 0.1, color: '#e8fbff', stretch: 6, alpha: 0.5 });
          }
        }
      });
      B.hint = (c) => { const z = zones.find((q) => c.local.d < q.d1 + 2); return { lat: z ? z.x : 0, speed: 8.5 }; };
      B.speedMul = 0.85;
      B.cam = { dist: 7, height: 3.8 };
      B.exit(0, 0, d + 6);
    },
  },

  // ------------------------------------------------------------------ RING FLIGHT
  {
    id: 'ring_flight', name: 'Ring Flight', category: 'Set Piece', setPiece: true, difficulty: 3,
    desc: 'Blast off a launch ramp and thread glowing boost rings that keep you airborne across a huge gap.',
    build(B, p) {
      const rings = p.rings || [[0, 4.2, 9], [0.8, 4.5, 18], [-0.4, 4.4, 27], [0.4, 3.9, 36]];
      pad(B, 0, 9, W, { edges: true, edgeMat: B.m.glowGold });
      boostPad(B, 0, 1, 8.5, 3.6, 1.95, 2.4);
      const rfn = (u) => ({ x: 0, y: 2.2 * Math.pow(u, 2), d: 9 + 7 * u, h: 0, w: W });
      B.ribbon(rfn, 20, W, 0.5, B.m.deckAlt, { path: true, supports: true, supportStep: 7 });
      const base = 16;
      const objs = [];
      for (const [x, y, dd] of rings) {
        const d = base + dd;
        const m = glowRing(B, x, y, d, 1.9, B.m.glowGold, 0.16);
        const m2 = glowRing(B, x, y, d, 2.15, B.m.glow, 0.05);
        objs.push({ m, m2, x, y, d, hit: false });
        B.coin(x, y, d);
        B.trigger(x, y, d, 3.8, 3.8, 1.6, () => {
          const ball = B.ball; const v = ball.body.linvel();
          const f = B.dirW(0, 1);
          ball.body.setLinvel({ x: v.x + f.x * 2, y: Math.max(v.y, 5.5), z: v.z + f.z * 2 }, true);
          B.trick('BOOST RING', 80, { color: 'gold', boost: 12 });
          B.game.sfx('ring');
          B.game.effects.shockwave(ball.curPos.clone().setY(ball.curPos.y + 0.4), '#ffd23a', 2.4);
        });
      }
      const last = objs[objs.length - 1];
      const ld = last.d + 7;
      B.deck(0, ld, ld + 24, 7, { y: -1, edges: true });
      arrows(B, 0, ld + 4, 3, 3, B.m.arrowGreen, -0.988);
      B.pathLine(0, 16, 0, ld, 2.2, -1);
      B.pathLine(0, ld, 0, ld + 24, -1, -1);
      B.onUpdate((t) => { for (const o of objs) { o.m.rotation.z = t * 1.5; o.m2.rotation.z = -t; o.m.scale.setScalar(1 + Math.sin(t * 5 + o.d) * 0.04); } });
      B.hint = (c) => { const o = objs.find((q) => q.d > c.local.d + 2); return { lat: o ? o.x : 0, speed: 19 }; };
      B.cam = { dist: 8.5, height: 4.4, fov: 70 };
      B.exit(0, -1, ld + 24);
    },
  },

  // ------------------------------------------------------------------ GIANT DOMINO BRIDGE
  {
    id: 'domino_bridge', name: 'The Giant Domino', category: 'Set Piece', setPiece: true, difficulty: 2,
    desc: 'Smash the trigger plate: a chain of dominoes topples a giant slab that falls across the gap as your bridge.',
    build(B, p) {
      const gap0 = 24, gap = 6.2, slabL = 7.6, sw = 3.4;
      pad(B, 0, gap0, W + 1, { edges: true });
      // trigger plate
      B.box(0, 0.02, 5, W + 0.6, 0.05, 2.2, B.m.glowRed, { collide: false, cast: false });
      // decorative domino chain leading to the slab
      const list = [];
      for (let i = 0; i < 12; i++) list.push({ x: -2.4 + Math.sin(i * 0.5) * 0.25, y: 0.71, d: 7.5 + i * 1.25, w: 0.8, h: 1.4, l: 0.25, ci: i, density: 0.5 });
      const set = B.blockSet(list, B.m.block, { name: 'DOMINO CHAIN', bonus: 10 });
      set.need = 0.7;
      // slab with a hinge just below the near edge of the gap; it falls forward to become a bridge
      const q = B.quat.clone();
      const hy = -0.3, zc = gap0 - 0.3;
      const p0 = B.W(0, hy + slabL / 2, zc);
      const slabBody = B.phys.dynamicBody(p0, q, { angularDamping: 0.4, linearDamping: 0.1, dominance: 0 });
      B.phys.addCollider(R.ColliderDesc.cuboid(sw / 2, slabL / 2, 0.3).setDensity(0.6).setFriction(0.9), slabBody, { section: B.index });
      const geo = new THREE.BoxGeometry(sw, slabL, 0.6);
      const slab = new THREE.Mesh(geo, B.m.accent2); slab.castShadow = true; slab.receiveShadow = true;
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(sw + 0.02, 0.3, 0.62), B.m.hazard); stripe.position.y = slabL / 2 - 0.4; slab.add(stripe);
      const face = new THREE.Mesh(new THREE.BoxGeometry(sw * 0.7, slabL * 0.7, 0.62), B.m.deck); slab.add(face);
      B.course.root.add(slab);
      const j = B.revolute(B.body, slabBody, { x: 0, y: hy, z: -zc }, { x: 0, y: -slabL / 2, z: 0 }, { x: 1, y: 0, z: 0 });
      j.setLimits(-Math.PI / 2, 0.02);
      const q0 = q.clone();
      // landing ledge for the slab's tip, then the far deck
      B.box(0, -0.9, gap0 + slabL - 0.6, sw + 0.6, 0.6, 2.0, B.m.darkSteel, {});
      B.deck(0, gap0 + slabL + 0.05, gap0 + slabL + 10, W + 1, { edges: true });
      for (const s2 of [-1, 1]) B.box(s2 * (sw / 2 + 0.5), 0.3, gap0 - 0.4, 0.5, 0.6, 0.6, B.m.machine, {});
      let fired = false, firedT = 0, landed = false;
      B.trigger(0, 0.6, 5, W + 1, 2, 2.4, () => {
        if (fired) return; fired = true; firedT = B.game.time;
        slabBody.wakeUp();
        const f = B.dirW(0, 1);
        slabBody.applyImpulse({ x: f.x * 9, y: 0, z: f.z * 9 }, true);
        if (set.blocks[0]) { const b0 = set.blocks[0].body; b0.wakeUp(); b0.applyImpulse({ x: f.x * 0.25, y: 0, z: f.z * 0.25 }, true); }
        B.game.sfx('clank', 1);
      });
      B.onUpdate((t) => {
        const tr = slabBody.translation(), rr = slabBody.rotation();
        slab.position.set(tr.x, tr.y, tr.z); slab.quaternion.set(rr.x, rr.y, rr.z, rr.w);
        if (fired && !landed && t - firedT > 1.0) { landed = true; B.game.sfx('slam', 1); B.game.cam.shake(0.5); }
      });
      B.onReset(() => { fired = false; landed = false; slabBody.setTranslation(p0, true); slabBody.setRotation(q0, true); slabBody.setLinvel({ x: 0, y: 0, z: 0 }, true); slabBody.setAngvel({ x: 0, y: 0, z: 0 }, true); });
      B.onDispose = () => { B.course.root.remove(slab); geo.dispose(); };
      B.extraBodies = [slabBody];
      B.coinLine(0, 9, 0, 20, 5);
      B.coinLine(0, gap0 + 1, 0, gap0 + gap - 1, 3, 1.0);
      B.pathLine(0, 0, 0, gap0 + slabL + 10);
      B.speedMul = 0.75;
      B.hint = (c) => ({ lat: 0, brake: fired ? B.game.time - firedT < 1.1 && c.local.d > gap0 - 6 : c.local.d > gap0 - 8, speed: 7 });
      B.cam = { dist: 7.2, height: 4 };
      B.exit(0, 0, gap0 + slabL + 10);
    },
  },

  // ------------------------------------------------------------------ ASSEMBLING BRIDGE
  {
    id: 'assembling_bridge', name: 'Assembling Bridge', category: 'Set Piece', setPiece: true, difficulty: 2,
    desc: 'Scattered floating slabs fly in and lock together just ahead of you - then break apart behind you.',
    build(B, p, rng) {
      const n = p.count || 12, segL = 3.0, w = p.w || 3.2;
      pad(B, 0, 4, W);
      const segs = [];
      for (let i = 0; i < n; i++) {
        const dc = 4 + segL / 2 + i * segL;
        const x = Math.sin(i * 0.55) * (p.wave ?? 1.2);
        const m = B.mover(x, 0, dc);
        m.box(0, -0.2, 0, w, 0.4, segL - 0.06, i % 2 ? B.m.deck : B.m.deckAlt);
        m.box(0, -0.48, 0, w * 0.5, 0.2, segL - 0.4, B.m.glow, { collide: false, cast: false });
        const side = rng() < 0.5 ? -1 : 1;
        const off = new THREE.Vector3(side * (6 + rng() * 8), -4 + rng() * 10, (rng() - 0.5) * 6);
        const rot = new THREE.Euler((rng() - 0.5) * 2, (rng() - 0.5) * 3, (rng() - 0.5) * 2);
        segs.push({ m, x, dc, off, rot, home: m.obj.position.clone() });
      }
      const end = 4 + n * segL;
      pad(B, end, end + 4, W);
      B.pathFn((u) => { const i = u * (n - 1); return { x: Math.sin(i * 0.55) * (p.wave ?? 1.2), y: 0, d: 4 + segL / 2 + u * (n - 1) * segL }; }, n * 2);
      let lastBD = -999;
      B.onUpdate(() => {
        const b = B.ballLocal(); const bd = b ? b.d : -999;
        lastBD = bd;
        for (const s of segs) {
          let k = clamp((bd - (s.dc - 26)) / 13, 0, 1);
          if (bd > s.dc + 7) k = 1 - clamp((bd - s.dc - 7) / 10, 0, 1);
          const e = ease(k);
          s.m.obj.position.set(s.home.x + s.off.x * (1 - e), s.home.y + s.off.y * (1 - e), s.home.z + s.off.z * (1 - e));
          s.m.obj.rotation.set(s.rot.x * (1 - e), s.rot.y * (1 - e), s.rot.z * (1 - e));
          if (k > 0.02 && k < 0.98 && bd < s.dc && !s.sounded) { s.sounded = true; B.sfxNear('clank', s.x, s.dc, 0.5, 30); }
        }
      });
      B.onReset(() => { for (const s of segs) s.sounded = false; });
      for (let i = 0; i < n; i += 2) B.coin(segs[i].x, 0.65, segs[i].dc);
      void lastBD;
      B.hint = () => ({ lat: 0 });
      B.cam = { dist: 6.6, height: 3.4 };
      B.exit(0, 0, end + 4);
    },
  },

  // ------------------------------------------------------------------ BOULDER RUN
  {
    id: 'boulder_run', name: 'Boulder Run', category: 'Set Piece', setPiece: true, difficulty: 3,
    desc: 'Huge physical boulders thunder down the slope toward you - dodge them or get bowled over.',
    build(B, p, rng) {
      const len = 44, rise = 4.5, w = 6.2, rb = 1.25, period = p.period || 1.6;
      pad(B, 0, 3, W);
      B.ribbon((u) => ({ x: 0, y: rise * u, d: 3 + len * u, h: 0, w }), 30, w, 0.5, B.m.deckAlt, { path: true, supports: true, supportStep: 9 });
      for (const s of [-1, 1]) B.ribbon((u) => ({ x: s * (w / 2 + 0.12), y: rise * u + 0.45, d: 3 + len * u, h: 0, w: 0.24 }), 12, 0.24, 0.45, B.m.rail, {});
      B.box(0, rise + 2.4, 3 + len + 2, w + 2, 4.8, 2.4, B.m.machine, { collide: false });
      B.box(0, rise + 1.2, 3 + len + 0.7, w - 0.5, 2.4, 0.2, B.m.dark, { collide: false });
      pad(B, 3 + len, 7 + len, W, { y: rise });
      const rockGeo = new THREE.IcosahedronGeometry(rb, 2);
      const pp = rockGeo.attributes.position; for (let i = 0; i < pp.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(pp, i); v.multiplyScalar(1 + (Math.sin(v.x * 5) * Math.cos(v.z * 4)) * 0.05); pp.setXYZ(i, v.x, v.y, v.z); }
      rockGeo.computeVertexNormals();
      const rockMat = new THREE.MeshStandardMaterial({ color: 0x8a7a68, roughness: 0.95, flatShading: true });
      B.disposables.push(rockMat, rockGeo);
      const rocks = [];
      const pool = p.count || 4;
      for (let i = 0; i < pool; i++) {
        const body = B.phys.dynamicBody(B.W(0, -60 - i * 5, 0), B.quat.clone(), { linearDamping: 0.05, angularDamping: 0.05, dominance: 0, ccd: true });
        B.phys.addCollider(R.ColliderDesc.ball(rb).setDensity(1.6).setFriction(0.8).setRestitution(0.2), body, { section: B.index });
        const mesh = new THREE.Mesh(rockGeo, rockMat); mesh.castShadow = true; B.course.root.add(mesh);
        rocks.push({ body, mesh, next: i * period, lane: 0 });
      }
      const lanes = [-1.8, 0, 1.8];
      const lv = new THREE.Vector3();
      let started = false, tStart = 0;
      B.trigger(0, 1, 6, w, 4, 3, () => { if (!started) { started = true; tStart = B.game.time; rocks.forEach((r, i) => (r.next = tStart + 0.3 + i * period)); } });
      const fwd = B.dirW(0, 1);
      B.onUpdate((t) => {
        for (const r of rocks) {
          const tr = r.body.translation();
          if (started && t >= r.next) {
            r.next = t + period * pool;
            r.lane = lanes[Math.floor(rng() * 3)];
            const sp = B.W(r.lane, rise + rb + 0.2, 3 + len - 1);
            r.body.setTranslation(sp, true);
            r.body.setLinvel({ x: -fwd.x * 6, y: 0, z: -fwd.z * 6 }, true);
            r.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
            B.sfxNear('rumble', 0, 3 + len, 0.7, 55);
          }
          r.mesh.position.set(tr.x, tr.y, tr.z); const q = r.body.rotation(); r.mesh.quaternion.set(q.x, q.y, q.z, q.w);
          const ld = B.toLocal(lv.set(tr.x, tr.y, tr.z));
          if (tr.y < B.origin.y - 40 || (ld.d < 4 && ld.y > -5)) { r.body.setTranslation(B.W(0, -60, 0), false); r.body.setLinvel({ x: 0, y: 0, z: 0 }, false); r.body.sleep(); }
        }
      });
      B.onReset(() => { started = false; rocks.forEach((r, i) => { r.body.setTranslation(B.W(0, -60 - i * 5, 0), false); r.body.setLinvel({ x: 0, y: 0, z: 0 }, false); r.body.sleep(); }); });
      B.onDispose = () => rocks.forEach((r) => B.course.root.remove(r.mesh));
      B.extraBodies = rocks.map((r) => r.body);
      B.coinLine(0, 8, 0, 3 + len - 4, 8, 0.65 + 0.6, rise + 0.65);
      B.danger = (x, d, tt) => {
        let m = 9;
        for (const r of rocks) {
          const tr = r.body.translation(); if (tr.y < B.origin.y - 20) continue;
          const l = B.toLocal(lv.set(tr.x, tr.y, tr.z)); const v = r.body.linvel();
          const vd = -(v.x * fwd.x + v.z * fwd.z);
          const dd = l.d - vd * (tt - B.game.time);
          m = Math.min(m, Math.hypot(x - l.x, d - dd) - (rb + 0.75));
        }
        return m;
      };
      B.width = w - 0.6;
      B.speedMul = 0.8;
      B.cam = { dist: 7, height: 3.6 };
      B.exit(0, rise, 7 + len);
    },
  },
];
void segDist; void guardRail; void arch;
