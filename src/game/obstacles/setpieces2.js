// More set pieces: claw machines, meshing gears, a pinball room with flippers, sweeping lasers,
// a hydraulic lift, a magnetic storm, a wall-ride half-pipe, a risky sky route and a hyper tunnel.
import * as THREE from 'three';
import { R } from '../../core/physics.js';
import { W, TAU, arrows, pad, smooth, clamp, lerp, guardRail, segDist, arch } from './kit.js';
import { boostPad } from './jumps.js';

const deg = Math.PI / 180;
const cyc = (t, period, ph) => (((t / period + ph) % 1) + 1) % 1;

export const SETPIECES2 = [
  // ------------------------------------------------------------------ CLAW MACHINE
  {
    id: 'claw_drop', name: 'Claw Machine', category: 'Set Piece', setPiece: true, difficulty: 3,
    desc: 'Overhead claws sweep across the track and drop heavy crates into your lane.',
    build(B, p, rng) {
      const n = p.count || 3, spacing = 11, len = 8 + n * spacing;
      pad(B, 0, len, W + 1, { edges: true });
      const claws = [];
      for (let i = 0; i < n; i++) {
        const dc = 9 + i * spacing;
        for (const s of [-1, 1]) B.box(s * 4.2, 3.2, dc, 0.5, 6.4, 0.5, B.m.darkSteel, {});
        B.box(0, 6.5, dc, 8.9, 0.5, 0.8, B.m.machine, { collide: false });
        const carriage = B.mover(0, 6.0, dc);
        carriage.box(0, 0, 0, 1.1, 0.6, 1.1, B.m.darkSteel, { collide: false });
        carriage.cyl(0, -0.9, 0, 0.08, 1.4, 'y', B.m.steel, { collide: false });
        for (let k = 0; k < 3; k++) { const a = k * TAU / 3; carriage.box(Math.cos(a) * 0.45, -1.7, Math.sin(a) * 0.45, 0.12, 0.8, 0.12, B.m.accent, { collide: false, rz: Math.cos(a) * 0.4, rx: Math.sin(a) * 0.4 }); }
        // crate (dynamic) held by the claw, dropped on a cycle
        const cs = 1.2;
        const body = B.phys.dynamicBody(B.W(0, 4.4, dc), B.quat.clone(), { linearDamping: 0.1, angularDamping: 0.3, dominance: 0 });
        B.phys.addCollider(R.ColliderDesc.cuboid(cs / 2, cs / 2, cs / 2).setDensity(0.55).setFriction(0.7), body, { section: B.index });
        const geo = new THREE.BoxGeometry(cs, cs, cs);
        const crate = new THREE.Mesh(geo, B.m.crate); crate.castShadow = true; B.course.root.add(crate);
        const period = (p.period || 3.2) * (1 + i * 0.13), ph = i * 0.37;
        claws.push({ dc, carriage, body, crate, geo, period, ph, state: 'held', x: 0 });
        B.coin((i % 2 ? -1 : 1) * 1.6, 0.65, dc + 4);
      }
      const xAt = (c, t) => 3.0 * Math.sin((t / c.period + c.ph) * TAU * 0.5 + c.ph * 5);
      B.onUpdate((t) => {
        for (const c of claws) {
          const u = cyc(t, c.period, c.ph);
          c.x = xAt(c, t);
          c.carriage.obj.position.x = c.x;
          if (u < 0.6) {
            if (c.state !== 'held') { c.state = 'held'; }
            const hp = B.W(c.x, 4.35, c.dc);
            c.body.setTranslation(hp, true); c.body.setLinvel({ x: 0, y: 0, z: 0 }, true); c.body.setAngvel({ x: 0, y: 0, z: 0 }, true); c.body.setRotation(B.quat, true);
          } else if (c.state === 'held') { c.state = 'dropped'; B.sfxNear('clank', c.x, c.dc, 0.8, 30); }
          const tr = c.body.translation(), q = c.body.rotation();
          c.crate.position.set(tr.x, tr.y, tr.z); c.crate.quaternion.set(q.x, q.y, q.z, q.w);
        }
      });
      B.onDispose = () => claws.forEach((c) => { B.course.root.remove(c.crate); c.geo.dispose(); });
      B.extraBodies = claws.map((c) => c.body);
      const lv = new THREE.Vector3();
      B.danger = (x, d, tt) => {
        let m = 9;
        for (const c of claws) {
          if (Math.abs(d - c.dc) > 2.2) continue;
          const tr = c.body.translation(); const l = B.toLocal(lv.set(tr.x, tr.y, tr.z));
          const u = cyc(tt, c.period, c.ph);
          const fx = u < 0.6 ? xAt(c, tt) : l.x;
          if (l.y > 2.5 && u < 0.55) continue; // still hanging high and not about to drop
          m = Math.min(m, Math.hypot(x - fx, d - c.dc) - 1.4);
        }
        return m;
      };
      B.width = W;
      B.exit(0, 0, len);
    },
  },

  // ------------------------------------------------------------------ GEAR WORKS
  {
    id: 'gear_train', name: 'Gear Works', category: 'Set Piece', setPiece: true, difficulty: 3,
    desc: 'Cross a chain of huge meshing gears that spin in opposite directions under you.',
    build(B, p) {
      const n = p.count || 3, Rg = 4.0, teeth = 18, spd = p.speed || 0.5;
      pad(B, 0, 3, W);
      const gears = [];
      for (let i = 0; i < n; i++) {
        const dc = 3 + Rg + i * (2 * Rg + 0.15), x = (i % 2 ? 1 : -1) * 0.6;
        const m = B.mover(x, 0, dc);
        m.cyl(0, -0.25, 0, Rg - 0.25, 0.5, 'y', i % 2 ? B.m.machine : B.m.steel, { seg: 40 });
        for (let k = 0; k < teeth; k++) { const a = k * TAU / teeth; m.box(Math.cos(a) * (Rg - 0.05), -0.25, Math.sin(a) * (Rg - 0.05), 0.6, 0.48, 0.55, i % 2 ? B.m.machine : B.m.steel, { ry: -a }); }
        m.cyl(0, 0.02, 0, 1.0, 0.06, 'y', B.m.hazard, { collide: false });
        for (let k = 0; k < 5; k++) { const a = k * TAU / 5; m.box(Math.cos(a) * 2.2, 0.01, Math.sin(a) * 2.2, 0.5, 0.02, 2.4, B.m.dark, { ry: -a + Math.PI / 2, collide: false, cast: false }); }
        B.cyl(x, -1.5, dc, 0.8, 2.2, 'y', B.m.darkSteel, { collide: false });
        B.support(x, dc, -2.6);
        const dir = i % 2 ? 1 : -1;
        B.onUpdate((t) => { m.obj.rotation.y = dir * spd * t + i * 0.17; });
        gears.push({ x, dc });
        for (let k = 0; k < 4; k++) { const a = k * TAU / 4 + 0.4; B.coin(x + Math.cos(a) * 2.6, 0.65, dc + Math.sin(a) * 2.6); }
      }
      const end = 3 + n * (2 * Rg + 0.15);
      pad(B, end - 0.1, end + 4, W);
      B.ground = (x, d) => {
        if (d < 3.2 || d > end) return Math.abs(x) < 2.4;
        return gears.some((g) => Math.hypot(x - g.x, d - g.dc) < Rg - 0.6);
      };
      B.hint = (c) => { const g = gears.find((q) => q.dc + Rg * 0.4 > c.local.d) || { x: 0 }; return { lat: g.x, speed: 8.5 }; };
      B.speedMul = 0.85;
      B.cam = { dist: 6.8, height: 4.2 };
      B.exit(0, 0, end + 4);
    },
  },

  // ------------------------------------------------------------------ PINBALL ROOM
  {
    id: 'pinball_room', name: 'Pinball Room', category: 'Set Piece', setPiece: true, difficulty: 3,
    desc: 'A giant pinball table: flippers swat you, pop bumpers kick you and drop targets pay out.',
    build(B, p, rng) {
      const len = 46, w = 9;
      pad(B, 0, 3, W);
      B.ribbon((u) => ({ x: 0, y: 0, d: 3 + 3 * u, w: lerp(W, w, smooth(u)) }), 6, W, 0.5, B.m.deck, {});
      B.deck(0, 6, 6 + len, w, { mat: B.m.plate });
      for (const s of [-1, 1]) { B.box(s * (w / 2 + 0.2), 0.6, 6 + len / 2, 0.4, 1.2, len, B.m.glass, { restitution: 0.6 }); B.box(s * (w / 2 + 0.2), 1.25, 6 + len / 2, 0.45, 0.1, len, B.m.glow, { collide: false }); }
      // pop bumpers
      const bumpers = [[0, 14], [-2.4, 18], [2.4, 18], [-1.2, 33], [1.6, 37]];
      for (const [x, d] of bumpers) {
        B.cyl(x, 0.45, d, 0.62, 0.9, 'y', B.m.bumper, { surface: { type: 'bumper', power: 10 }, restitution: 0.9, seg: 24 });
        B.cyl(x, 0.93, d, 0.7, 0.08, 'y', B.m.glowGold, { collide: false, seg: 24 });
      }
      // flippers (pivot at the side, swing inward on a rhythm)
      const flippers = [];
      for (const [side, d, ph] of [[-1, 24, 0], [1, 24, 0.5], [-1, 44, 0.25], [1, 44, 0.75]]) {
        const px = side * (w / 2 - 0.6);
        const m = B.mover(px, 0, d);
        m.box(-side * 1.5, 0.35, 0, 3.0, 0.7, 0.5, B.m.white, { restitution: 0.4 });
        m.box(-side * 1.5, 0.72, 0, 3.0, 0.06, 0.52, B.m.glowRed, { collide: false });
        m.cyl(0, 0.4, 0, 0.45, 0.8, 'y', B.m.darkSteel, {});
        const period = p.period || 1.7;
        const ang = (t) => { const u = cyc(t, period, ph); const k = u < 0.12 ? u / 0.12 : u < 0.25 ? 1 : u < 0.5 ? 1 - (u - 0.25) / 0.25 : 0; return side * (-0.45 + k * 0.9); };
        B.onUpdate((t) => { m.obj.rotation.y = ang(t); });
        flippers.push({ px, d, side, ang });
      }
      // drop targets
      const targets = [];
      for (let k = 0; k < 3; k++) targets.push({ x: -1.2 + k * 1.2, y: 0.45, d: 29, w: 0.9, h: 0.9, l: 0.3, ci: k, density: 0.3 });
      const set = B.blockSet(targets, B.m.block, { name: 'DROP TARGETS', bonus: 15 });
      set.need = 0.67;
      for (let k = 0; k < 5; k++) B.coin((k - 2) * 1.6, 0.65, 10);
      B.coinLine(-3.4, 30, -3.4, 40, 4); B.coinLine(3.4, 30, 3.4, 40, 4);
      B.ribbon((u) => ({ x: 0, y: 0, d: 6 + len + 3 * u, w: lerp(w, W, smooth(u)) }), 6, W, 0.5, B.m.deck, {});
      pad(B, 9 + len, 12 + len, W);
      arch(B, 6 + len - 1, w, 'TILT!', { text: { bg: '#2a0a3a', accent: '#ff2bd6' }, lampMat: B.m.glowRed, noCollide: true });
      B.danger = (x, d, t) => {
        let m = 9;
        for (const [bx, bd] of bumpers) m = Math.min(m, Math.hypot(x - bx, d - bd) - 1.3);
        for (const f of flippers) {
          if (Math.abs(d - f.d) > 3.6) continue;
          const a = f.ang(t);
          const ex = f.px - f.side * Math.cos(a) * 3.0, ed = f.d - f.side * Math.sin(a) * 3.0;
          m = Math.min(m, segDist(x, d, f.px, f.d, ex, ed) - 0.85);
        }
        return m;
      };
      B.width = w - 1.2;
      B.speedMul = 0.85;
      B.cam = { dist: 7.4, height: 4.6 };
      B.exit(0, 0, 12 + len);
    },
  },

  // ------------------------------------------------------------------ SWEEPING LASERS
  {
    id: 'sweep_lasers', name: 'Laser Sweep', category: 'Set Piece', setPiece: true, difficulty: 4,
    desc: 'Laser beams rise and fall across the track - slip underneath or jump over at the right moment.',
    build(B, p) {
      const n = p.count || 4, spacing = 9, period = p.period || 2.4;
      const total = 6 + n * spacing;
      pad(B, 0, total, W, { edges: true, edgeMat: B.m.glowRed });
      const beamMat = new THREE.MeshBasicMaterial({ color: 0xff2040, toneMapped: false });
      const glowMat = new THREE.MeshBasicMaterial({ color: 0xff3050, transparent: true, opacity: 0.18, depthWrite: false, toneMapped: false });
      B.disposables.push(beamMat, glowMat);
      const gates = [];
      for (let i = 0; i < n; i++) {
        const d = 7 + i * spacing, ph = i * 0.31;
        for (const s of [-1, 1]) { B.box(s * (W / 2 + 0.3), 1.6, d, 0.4, 3.2, 0.4, B.m.darkSteel, {}); B.box(s * (W / 2 + 0.3), 3.25, d, 0.5, 0.1, 0.5, B.m.glowRed, { collide: false }); }
        const beam = new THREE.Group(); B.group.add(beam);
        const core = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, W + 0.4, 8), beamMat); core.rotation.z = Math.PI / 2; beam.add(core);
        const halo = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, W + 0.4, 10), glowMat); halo.rotation.z = Math.PI / 2; beam.add(halo);
        beam.position.set(0, 1, -d);
        const yAt = (t) => 1.55 + 1.35 * Math.sin((t / period + ph) * TAU);
        gates.push({ d, beam, yAt });
      }
      B.onUpdate((t) => {
        const b = B.ballLocal();
        for (const g of gates) {
          const y = g.yAt(t); g.beam.position.y = y;
          if (b && Math.abs(b.d - g.d) < 0.5 && Math.abs(b.x) < W / 2 + 0.3 && Math.abs(b.y - y) < 0.55) B.kill('zapped');
        }
      });
      B.coinLine(0, 3, 0, total - 3, n * 2);
      B.hint = (c) => {
        const g = gates.find((q) => q.d > c.local.d - 0.6); if (!g) return { lat: 0 };
        const dist = g.d - c.local.d, v = Math.max(3, c.v);
        const yArr = g.yAt(c.t + dist / v);
        const safeUnder = yArr > 1.35;
        const jumpNow = !safeUnder && dist > 1.8 && dist < 3.2 && g.yAt(c.t + 0.35) < 0.75;
        return { lat: 0, brake: !safeUnder && !jumpNow && dist < 5 && dist > 0.8 && yArr > 0.6, jump: jumpNow, speed: 9 };
      };
      B.speedMul = 0.9;
      B.exit(0, 0, total);
    },
  },

  // ------------------------------------------------------------------ HYDRAULIC LIFT
  {
    id: 'hydraulic_lift', name: 'Hydraulic Lift', category: 'Set Piece', setPiece: true, difficulty: 2,
    desc: 'Roll onto the lift platform, brake, and ride the hydraulics up to the next deck.',
    build(B, p) {
      const rise = p.rise || 6.5, L = 6;
      pad(B, 0, 6, W, { edges: true });
      arrows(B, 0, 3, 2, 2, B.m.arrowGold);
      const lift = B.mover(0, 0, 6 + L / 2);
      lift.box(0, -0.25, 0, W - 0.2, 0.5, L - 0.1, B.m.plate);
      for (const s of [-1, 1]) lift.box(s * (W / 2 - 0.2), 0.45, 0, 0.2, 0.9, L - 0.1, B.m.hazard);
      lift.cyl(0, -3, 0, 0.6, 5.5, 'y', B.m.steel, { collide: false });
      // front face of the upper deck blocks the way until the lift is up
      B.box(0, rise / 2 - 0.25, 6 + L + 0.3, W, rise + 0.5, 0.6, B.m.concrete, {});
      B.deck(0, 6 + L, 6 + L + 14, W, { y: rise, edges: true });
      B.box(0, -2.5, 6 + L / 2, W + 0.6, 4, L + 0.4, B.m.darkSteel, { collide: false });
      const lamp = B.box(W / 2 + 0.4, 1.4, 6 + L, 0.4, 0.4, 0.4, B.m.glowRed, { collide: false, merge: false });
      let state = 'down', t0 = 0, y = 0;
      lift.onTouch = () => { if (state === 'down') { state = 'wait'; t0 = B.game.time; B.game.sfx('hiss', 1); } };
      B.onUpdate((t, dt) => {
        if (state === 'wait' && t - t0 > 0.35) { state = 'up'; t0 = t; }
        if (state === 'up') { y = Math.min(rise, y + dt * rise / 1.5); if (y >= rise) { state = 'top'; t0 = t; B.game.sfx('clank', 1); } }
        if (state === 'top' && t - t0 > 3.2) state = 'lower';
        if (state === 'lower') { y = Math.max(0, y - dt * rise / 2); if (y <= 0) state = 'down'; }
        lift.obj.position.y = y;
        lamp.material = state === 'top' ? B.m.glowGreen : B.m.glowRed;
      });
      B.onReset(() => { state = 'down'; y = 0; lift.obj.position.y = 0; });
      B.trigger(0, 1, 2, W, 2, 3, () => B.hintText('brake', 'PRESS  S  TO BRAKE ON THE LIFT', 'PULL THE STICK DOWN TO BRAKE'), { repeat: false });
      B.coinLine(0, 6 + L + 2, 0, 6 + L + 12, 4, rise + 0.65);
      B.coin(0, rise + 0.8, 6 + L / 2);
      B.pathLine(0, 0, 0, 6 + L, 0, 0);
      B.pathLine(0, 6 + L, 0, 6 + L + 14, rise, rise);
      B.speedMul = 0.55;
      B.hint = (c) => ({ lat: 0, brake: c.local.d > 5 && c.local.d < 6 + L && state !== 'top', speed: state === 'top' ? 6 : 4 });
      B.cam = { dist: 6.5, height: 3.6 };
      B.exit(0, rise, 6 + L + 14);
    },
  },

  // ------------------------------------------------------------------ MAGNETIC STORM
  {
    id: 'magnetic_storm', name: 'Magnetic Storm', category: 'Set Piece', setPiece: true, difficulty: 3,
    desc: 'Giant coils flip their pull from side to side - read the warning lights and counter-steer.',
    build(B, p) {
      const len = p.len || 40, w = 3.0, force = p.force || 17, period = p.period || 2.6;
      pad(B, 0, 3, W);
      B.ribbon((u) => ({ x: 0, y: 0, d: 3 + 3 * u, w: lerp(W, w, smooth(u)) }), 5, W, 0.5, B.m.deck, {});
      B.deck(0, 6, 6 + len, w, { mat: B.m.steel, edges: true, edgeMat: B.m.glow });
      const coilMat = new THREE.MeshStandardMaterial({ color: 0x2a1650, emissive: 0x9a4dff, emissiveIntensity: 0.3, metalness: 0.6, roughness: 0.3 });
      B.disposables.push(coilMat);
      const coils = { '-1': [], '1': [] };
      for (const s of [-1, 1]) for (let d = 9; d < 6 + len; d += 8) {
        B.box(s * (w / 2 + 3.2), -1.2, d, 1, 3, 1, B.m.darkSteel, { collide: false });
        const c = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 2.6, 18), coilMat); c.position.set(s * (w / 2 + 3.2), 1.0, -d); B.group.add(c);
        for (let k = 0; k < 5; k++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.07, 6, 18), B.m.accent); r.rotation.x = Math.PI / 2; r.position.set(s * (w / 2 + 3.2), 0 + k * 0.5, -d); B.group.add(r); }
        coils[s].push(c);
      }
      // lightning arcs
      const arcMat = new THREE.LineBasicMaterial({ color: 0xd8b8ff, transparent: true, opacity: 0.9 });
      B.disposables.push(arcMat);
      const arcs = [];
      for (let i = 0; i < 6; i++) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(8 * 3), 3)); const l = new THREE.Line(g, arcMat); l.frustumCulled = false; B.group.add(l); arcs.push(l); B.disposables.push(g); }
      const side = (t) => (Math.floor(t / period) % 2 ? 1 : -1);
      const warn = (t) => ((t % period) / period > 0.75);
      B.onUpdate((t) => {
        const s = side(t), wn = warn(t);
        coilMat.emissiveIntensity = 0.35;
        for (const k of ['-1', '1']) for (const c of coils[k]) c.scale.setScalar(Number(k) === s ? 1.05 : 1);
        const b = B.ballLocal();
        arcs.forEach((l, i) => {
          const pos = l.geometry.attributes.position;
          const cs = coils[String(s)][i % coils[String(s)].length];
          if (!cs) { l.visible = false; return; }
          l.visible = true;
          const sx = cs.position.x, sd = -cs.position.z;
          const tx = b ? b.x : 0, td = b ? b.d : sd;
          for (let k = 0; k < 8; k++) { const u = k / 7; pos.setXYZ(k, lerp(sx, tx, u) + (Math.random() - 0.5) * 0.6 * Math.sin(u * Math.PI), 1 + Math.sin(u * Math.PI) * 1.2 + (Math.random() - 0.5) * 0.4, -lerp(sd, td, u)); }
          pos.needsUpdate = true;
          l.material.color.set(wn ? '#ffe066' : '#d8b8ff');
        });
        if (b && b.d > 6 && b.d < 6 + len && b.y > -2) {
          const dir = B.dirW(s, 0);
          B.ball.addAccel(dir.x * force, 0, dir.z * force);
        }
      });
      B.coinLine(0, 8, 0, 4 + len, Math.floor(len / 2.5));
      pad(B, 6 + len, 10 + len, W);
      B.hint = (c) => { const s = side(c.t + 0.15); return { lat: -s * 0.35 }; };
      B.exit(0, 0, 10 + len);
    },
  },

  // ------------------------------------------------------------------ WALL RIDE
  {
    id: 'wall_ride', name: 'Wall Ride', category: 'Set Piece', setPiece: true, difficulty: 3,
    desc: 'A deep half-pipe whose floor is blocked - carve up the curved walls to get past.',
    build(B, p) {
      const len = p.len || 46, Rp = 3.6, strips = 11;
      pad(B, 0, 4, W);
      for (let k = 0; k < strips; k++) {
        const a = -75 * deg + k * (150 * deg) / (strips - 1);
        const x = Rp * Math.sin(a), y = Rp - Rp * Math.cos(a);
        const sw = 150 * deg / (strips - 1) * Rp + 0.05;
        B.box(x + 0.2 * Math.sin(a), y - 0.2 * Math.cos(a), 4 + len / 2, sw, 0.4, len, k % 2 ? B.m.deckAlt : B.m.deck, { rz: a });
      }
      for (const s of [-1, 1]) B.box(s * (Rp * Math.sin(75 * deg) + 0.3), Rp - Rp * Math.cos(75 * deg) + 0.5, 4 + len / 2, 0.3, 1.0, len, B.m.rail, {});
      for (let d = 8; d < 4 + len; d += 12) B.support(0, d, -0.8);
      // floor blockers, alternating which wall you must ride
      const blocks = [];
      for (let i = 0; i < (p.blocks || 4); i++) {
        const d = 12 + i * 9.5;
        B.box(0, 0.5, d, 2.4, 1.0, 1.6, B.m.hazard, {});
        B.box(0, 1.02, d, 2.5, 0.06, 1.7, B.m.glowRed, { collide: false });
        blocks.push(d);
        const side = i % 2 ? 1 : -1, a = side * 52 * deg;
        for (let k = -1; k <= 1; k++) B.coin(Rp * Math.sin(a) * 0.95, Rp - Rp * Math.cos(a) + 0.6, d + k * 1.2);
      }
      pad(B, 4 + len, 8 + len, W);
      B.hint = (c) => {
        const i = blocks.findIndex((d) => d > c.local.d - 1.5);
        if (i < 0 || blocks[i] - c.local.d > 9) return { lat: 0, speed: 11 };
        return { lat: (i % 2 ? 1 : -1) * 2.3, speed: 11 };
      };
      B.danger = (x, d) => { let m = 9; for (const bd of blocks) if (Math.abs(d - bd) < 1.4) m = Math.min(m, Math.abs(x) - 1.75); return m; };
      B.speedMul = 1.1;
      B.cam = { dist: 6.2, height: 3.4 };
      B.exit(0, 0, 8 + len);
    },
  },

  // ------------------------------------------------------------------ SKY ROUTE (risk / reward)
  {
    id: 'sky_route', name: 'Sky Route', category: 'Set Piece', setPiece: true, difficulty: 3,
    desc: 'Take the safe low road, or hit the kicker onto a razor-thin high rail packed with coins and a gem.',
    build(B, p) {
      const side = p.side || 1, len = 40, hx = side * 4.2, hy = 3.4;
      pad(B, 0, 6, 10);
      // low road: winding, with posts (starts offset away from the kicker)
      const lx0 = -side * 1.6;
      const lowX = (u) => lx0 * (1 - smooth(Math.max(0, (u - 0.8) / 0.2))) + (-side * 0.8 * Math.sin(u * Math.PI * 2));
      B.ribbon((u) => { const d = 6 + len * u; const du = 0.002; const dx = (lowX(u + du) - lowX(u)) / (du * len); return { x: lowX(u), y: 0, d, h: Math.atan(dx), w: 3.4 }; }, 60, 3.4, 0.5, B.m.deck, { path: true, supports: true, supportStep: 12 });
      for (let i = 0; i < 4; i++) { const d = 12 + i * 8; B.cyl(lowX((d - 6) / len) + (i % 2 ? 0.9 : -0.9), 0.6, d, 0.3, 1.2, 'y', B.m.machine, { seg: 12 }); }
      for (let i = 0; i < 4; i++) { const d = 10 + i * 9; B.coin(lowX((d - 6) / len), 0.65, d); }
      // high road: kicker + narrow rail
      const kx = side * 2.6;
      B.ribbon((u) => ({ x: kx + (hx - kx) * smooth(Math.min(1, u * 1.4)), y: hy * Math.pow(u, 1.6), d: 6 + 8 * u, h: 0, w: 2.2 }), 18, 2.2, 0.4, B.m.deckAlt, { supports: true });
      boostPad(B, kx, 2.5, 5.5, 1.8, 1.7, 1.5);
      arrows(B, kx, 4, 1.6, 1.6, B.m.arrowGold, 0.04);
      const railY = hy + 0.6;
      B.deck(hx, 13.8, 6 + len - 2, 1.1, { y: railY, mat: B.m.glowGold, th: 0.3, trim: false, supportStep: 8 });
      B.ribbon((u) => ({ x: hx, y: hy + (railY - hy) * u, d: 13.6 + 0.4 * u, h: 0, w: 1.1 }), 2, 1.1, 0.3, B.m.glowGold, {});
      for (let d = 17; d < 6 + len - 2; d += 1.6) B.coin(hx, railY + 0.65, d);
      B.gem(hx, railY + 1.0, 6 + len * 0.6);
      B.trigger(hx, railY + 0.5, 30, 2, 2, 4, () => B.trick('SKY ROUTE', 300, { color: 'purple', boost: 30 }), { repeat: false });
      B.ribbon((u) => ({ x: hx, y: railY * (1 - smooth(u)), d: 6 + len - 2 + 8 * u, h: 0, w: lerp(1.1, 2.4, u) }), 16, 2.4, 0.4, B.m.deckAlt, { supports: true });
      B.hint = () => ({ lat: 0 });
      pad(B, 6 + len + 6, 12 + len + 6, 11);
      B.deck(lowX(1), 6 + len, 6 + len + 6.05, 3.4, {});
      // signs
      arch(B, 2.5, 10, side > 0 ? '← SAFE    RISK →' : '← RISK    SAFE →', { h: 4.6, text: { bg: '#1b1d24', accent: '#ffcf33' }, noCollide: true });
      B.exit(0, 0, 18 + len);
    },
  },

  // ------------------------------------------------------------------ HYPER TUNNEL
  {
    id: 'hyper_tunnel', name: 'Hyper Tunnel', category: 'Set Piece', setPiece: true, difficulty: 4,
    desc: 'A sealed speed tunnel lined with boosters, light rings and fins that flash past at full speed.',
    build(B, p, rng) {
      const len = p.len || 70, w = 3.6, hgt = 3.0;
      pad(B, 0, 3, W);
      const fn = (u) => { const d = 3 + len * u; const e = Math.min(1, Math.sin(Math.PI * u) * 3); const x = 2.2 * Math.sin(u * Math.PI * 3) * e; const dx = 2.2 * Math.cos(u * Math.PI * 3) * Math.PI * 3 / len * e; return { x, y: -2.5 * smooth(u) + Math.sin(u * Math.PI * 4) * 0.6 * e, d, h: Math.atan(dx), w }; };
      B.ribbon(fn, 140, w, 0.4, B.m.plate, { path: true, supports: true, supportStep: 12, walls: { h: hgt, t: 0.3, mat: B.m.darkSteel } });
      B.ribbon((u) => { const c = fn(u); return { ...c, y: c.y + hgt + 0.2, w: w + 0.6 }; }, 140, w + 0.6, 0.25, B.m.darkSteel, { collide: false });
      // light rings
      const rings = [];
      for (let i = 1; i < 18; i++) {
        const u = i / 18, c = fn(u);
        const r = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.08, 6, 4), i % 3 ? B.m.glow : B.m.glowGold);
        r.position.set(c.x, c.y + 1.5, -c.d); r.rotation.y = -c.h; r.rotation.z = Math.PI / 4; B.group.add(r); rings.push(r);
      }
      for (let k = 0; k < 4; k++) {
        const u = 0.08 + k * 0.24, c = fn(u);
        arrows(B, c.x, c.d, 2.2, 2.4, B.m.arrowGold, c.y + 0.03).rotation.z = c.h;
        B.trigger(c.x, c.y + 0.6, c.d, 3.2, 1.6, 2.6, () => { if (B.ball.boostT <= 0) B.ball.events.push({ type: 'boostpad' }); B.ball.boost(1.85, 1.4); });
      }
      // fins to dodge
      const fins = [];
      for (let k = 0; k < (p.fins || 6); k++) {
        const u = 0.2 + k * 0.12, c = fn(u), off = (k % 2 ? 1 : -1) * 0.95;
        const fx = c.x + Math.cos(c.h) * off, fd = c.d - Math.sin(c.h) * off;
        B.box(fx, c.y + 0.6, fd, 1.4, 1.2, 0.3, B.m.hazard, { ry: -c.h });
        fins.push({ u, off });
      }
      for (let i = 1; i < 24; i++) { const c = fn(i / 24); B.coin(c.x, c.y + 0.65, c.d); }
      const e = fn(1);
      pad(B, 3 + len, 7 + len, W, { y: e.y });
      B.onUpdate((t) => { rings.forEach((r, i) => { r.rotation.z = Math.PI / 4 + t * (i % 2 ? 1.5 : -1.5); }); });
      B.hint = (c) => { const u = (c.local.d - 3) / len; const f = fins.find((q) => q.u > u - 0.01 && q.u < u + 0.12); return { lat: f ? -f.off * 0.95 : 0, speed: 15 }; };
      B.cam = { dist: 4.6, height: 1.7, fov: 72 };
      B.speedMul = 1.5;
      B.exit(e.x, e.y, 7 + len);
    },
  },
];
void guardRail; void R;
