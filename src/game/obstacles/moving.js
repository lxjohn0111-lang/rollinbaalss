// Moving obstacles: rotating, sweeping, sliding, swinging and slamming machinery.
import * as THREE from 'three';
import { W, TAU, arrows, pad, segDist, clamp, guardRail, smooth } from './kit.js';

const deg = Math.PI / 180;

// Build a circular rim wall from boxes (gaps at the given angles in (x,d) space).
function rimWall(B, cx, cd, R, h, gaps, mat) {
  const n = 28;
  for (let i = 0; i < n; i++) {
    const a = (i + 0.5) / n * TAU;
    let skip = false;
    for (const g of gaps) { let da = Math.abs(((a - g + Math.PI) % TAU + TAU) % TAU - Math.PI); if (da < 0.42) skip = true; }
    if (skip) continue;
    const x = cx + Math.cos(a) * R, d = cd + Math.sin(a) * R;
    B.box(x, h / 2, d, 0.3, h, TAU * R / n + 0.05, mat, { ry: a });
  }
}

export const MOVING = [
  {
    id: 'rotor_cross', name: 'Rotor Cross', category: 'Moving', difficulty: 3,
    desc: 'Four rotating arms sweep a round platform around a central hub.',
    build(B, p) {
      const Rp = 4.8, w = p.speed || 1.05, dc = 3 + Rp;
      pad(B, 0, 3.2, W);
      B.cyl(0, -0.25, dc, Rp, 0.5, 'y', B.m.deck, { seg: 48 });
      B.cyl(0, -0.62, dc, Rp * 0.7, 0.3, 'y', B.m.deckSide, { seg: 32, collide: false });
      B.support(0, dc, -0.8);
      rimWall(B, 0, dc, Rp - 0.15, 0.55, [Math.PI / 2, -Math.PI / 2], B.m.rail);
      B.cyl(0, 0.8, dc, 0.65, 1.6, 'y', B.m.machine, { seg: 20 });
      const rot = B.mover(0, 0, dc);
      for (let k = 0; k < 4; k++) {
        const a = k * Math.PI / 2;
        const cx = Math.cos(a) * 2.6, cd = Math.sin(a) * 2.6;
        rot.box(cx, 0.45, cd, Math.abs(Math.cos(a)) > 0.5 ? 3.9 : 0.4, 0.4, Math.abs(Math.cos(a)) > 0.5 ? 0.4 : 3.9, B.m.rail);
        rot.box(Math.cos(a) * 4.45, 0.45, Math.sin(a) * 4.45, 0.5, 0.6, 0.5, B.m.hazard, { collide: false });
      }
      rot.cyl(0, 1.75, 0, 0.75, 0.3, 'y', B.m.hazard, { collide: false });
      const sgn = p.dir || 1;
      const ang = (t) => sgn * w * t + (p.phase || 0);
      B.onUpdate((t) => { rot.obj.rotation.y = ang(t); });
      pad(B, dc + Rp - 0.3, dc + Rp + 3.5, W);
      B.coinLine(-2.2, dc - 2, -2.2, dc + 2, 3); B.coinLine(2.2, dc - 2, 2.2, dc + 2, 3);
      B.danger = (x, d, t) => {
        const lx = x, ld = d - dc;
        if (Math.hypot(lx, ld) > Rp + 0.5) return 9;
        let m = Math.hypot(lx, ld) - 1.2;
        const a0 = ang(t);
        for (let k = 0; k < 4; k++) { const a = a0 + k * Math.PI / 2; m = Math.min(m, segDist(lx, ld, Math.cos(a) * 0.6, Math.sin(a) * 0.6, Math.cos(a) * 4.6, Math.sin(a) * 4.6) - 0.75); }
        return m;
      };
      B.width = 6;
      B.exit(0, 0, dc + Rp + 3.5);
    },
  },
  {
    id: 'wiper_arms', name: 'Wiper Arms', category: 'Moving', difficulty: 3,
    desc: 'Giant mechanical arms swing across the track like windscreen wipers.',
    build(B, p) {
      const n = p.count || 2, spacing = 13, len = 8.4;
      const total = 6 + n * spacing;
      pad(B, 0, total, W, { edges: true });
      const arms = [];
      for (let i = 0; i < n; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const px = side * (W / 2 + 1.6), dc = 7 + i * spacing;
        B.box(px, 0.5, dc, 1.6, 2.6, 1.6, B.m.machine, {});
        B.box(px, 1.9, dc, 1.2, 0.3, 1.2, B.m.hazard, { collide: false });
        B.box(px, -1.2, dc, 1.4, 1.6, 1.4, B.m.darkSteel, { collide: false });
        const m = B.mover(px, 0, dc);
        const dir = -side;
        m.box(dir * len / 2, 0.45, 0, len, 0.42, 0.42, B.m.rail);
        m.box(dir * (len - 0.3), 0.55, 0, 0.6, 0.8, 0.9, B.m.rubber);
        m.cyl(0, 0.45, 0, 0.55, 1.0, 'y', B.m.darkSteel, { collide: false });
        const A = (p.sweep || 72) * deg, w = (p.speed || 1.25) + i * 0.15, ph = i * 1.7;
        const th = (t) => A * Math.sin(w * t + ph);
        B.onUpdate((t) => { m.obj.rotation.y = dir * th(t); });
        arms.push({ px, dc, dir, th });
      }
      B.coinLine(0, 3, 0, total - 3, Math.floor(total / 3));
      B.danger = (x, d, t) => {
        let mm = 9;
        for (const a of arms) {
          const ang = a.dir * a.th(t);
          // arm direction in (x,d): rotation.y by ang of local +x*dir => (cos, sin) scaled
          const ex = a.px + a.dir * Math.cos(ang) * len, ed = a.dc + a.dir * Math.sin(ang) * len;
          mm = Math.min(mm, segDist(x, d, a.px, a.dc, ex, ed) - 0.85);
        }
        return mm;
      };
      B.width = 4.6;
      B.exit(0, 0, total);
    },
  },
  {
    id: 'squeeze_walls', name: 'Squeeze Walls', category: 'Moving', difficulty: 3,
    desc: 'Walls slide in from both sides, leaving a gap that drifts across the track.',
    build(B, p) {
      const rows = p.rows || 4, gap = p.gap || 2.0, spacing = 7;
      const total = 6 + rows * spacing;
      pad(B, 0, total, W);
      const rowsInfo = [];
      for (let r = 0; r < rows; r++) {
        const dc = 6 + r * spacing;
        const A = (p.amp || 1.4), w = (p.speed || 1.4) * (1 + r * 0.12), ph = r * 2.1;
        const xg = (t) => A * Math.sin(w * t + ph);
        const L = B.mover(0, 0, dc), Rm = B.mover(0, 0, dc);
        const len = 6;
        L.box(-len / 2, 0.7, 0, len, 1.4, 0.8, B.m.accent2);
        L.box(-0.15, 0.7, 0, 0.3, 1.5, 0.9, B.m.hazard, { collide: false });
        Rm.box(len / 2, 0.7, 0, len, 1.4, 0.8, B.m.accent2);
        Rm.box(0.15, 0.7, 0, 0.3, 1.5, 0.9, B.m.hazard, { collide: false });
        B.onUpdate((t) => { const c = xg(t); L.obj.position.x = c - gap / 2; Rm.obj.position.x = c + gap / 2; });
        for (const s of [-1, 1]) B.box(s * (W / 2 + 3.3), 0.7, dc, 0.6, 1.8, 1.2, B.m.darkSteel, {});
        rowsInfo.push({ dc, xg });
      }
      B.coinLine(0, 2, 0, 5, 3);
      B.danger = (x, d, t) => { let m = 9; for (const r of rowsInfo) if (Math.abs(d - r.dc) < 1.0) m = Math.min(m, gap / 2 - Math.abs(x - r.xg(t)) - 0.55); return m; };
      B.width = 4.4;
      B.exit(0, 0, total);
    },
  },
  {
    id: 'cross_traffic', name: 'Cross Traffic', category: 'Moving', difficulty: 3,
    desc: 'Heavy blocks shuttle across the track on rails at different speeds.',
    build(B, p) {
      const rows = p.rows || 5, spacing = 5.5;
      const total = 5 + rows * spacing + 2;
      pad(B, 0, total, W);
      const blocks = [];
      for (let r = 0; r < rows; r++) {
        const dc = 6 + r * spacing;
        B.box(0, 0.01, dc, W + 6, 0.04, 0.35, B.m.steel, { collide: false, cast: false });
        const m = B.mover(0, 0, dc);
        m.box(0, 0.65, 0, 1.7, 1.3, 1.6, r % 2 ? B.m.machine : B.m.accent);
        m.box(0, 1.32, 0, 1.2, 0.06, 1.1, B.m.hazard, { collide: false });
        const A = 4.2, w = (p.speed || 1.1) * (0.85 + (r * 0.37) % 0.6), ph = r * 1.3;
        const x = (t) => A * Math.sin(w * t + ph);
        B.onUpdate((t) => { m.obj.position.x = x(t); });
        blocks.push({ dc, x });
        for (const s of [-1, 1]) B.box(s * (W / 2 + 3.4), -0.1, dc, 1.8, 0.4, 2.2, B.m.darkSteel, { collide: false });
      }
      B.coinLine(0, 4, 0, total - 2, rows * 2);
      B.danger = (x, d, t) => { let m = 9; for (const b of blocks) if (Math.abs(d - b.dc) < 1.5) m = Math.min(m, Math.abs(x - b.x(t)) - 1.45); return m; };
      B.width = 4.6;
      B.exit(0, 0, total);
    },
  },
  {
    id: 'disc_gate', name: 'Rotating Disc Gate', category: 'Moving', difficulty: 4,
    desc: 'Giant rotating discs with holes - roll through a hole as it sweeps past the deck.',
    build(B, p) {
      const n = p.count || 2, spacing = 10, Rd = 3.4, holeR = 0.95, holeOff = 2.25, cy = 2.25;
      const total = 6 + n * spacing;
      pad(B, 0, total, W, { edges: true });
      const gates = [];
      for (let i = 0; i < n; i++) {
        const dc = 7 + i * spacing;
        const holes = p.holes || 3;
        // visual disc with holes
        const shape = new THREE.Shape(); shape.absarc(0, 0, Rd, 0, TAU, false);
        for (let k = 0; k < holes; k++) { const a = k * TAU / holes; const hp = new THREE.Path(); hp.absarc(Math.cos(a) * holeOff, Math.sin(a) * holeOff, holeR, 0, TAU, true); shape.holes.push(hp); }
        const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.35, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2, curveSegments: 32 });
        geo.translate(0, 0, -0.175);
        const m = B.mover(0, cy, dc);
        const disc = new THREE.Mesh(geo, i % 2 ? B.m.accent : B.m.accent2); disc.castShadow = true; disc.receiveShadow = true;
        m.obj.add(disc);
        for (let k = 0; k < holes; k++) { const a = k * TAU / holes; const ring = new THREE.Mesh(new THREE.TorusGeometry(holeR, 0.08, 8, 28), B.m.hazard); ring.position.set(Math.cos(a) * holeOff, Math.sin(a) * holeOff, 0.2); m.obj.add(ring); }
        // collider cells (solid part of disc)
        const cell = 0.42;
        for (let gy = -Rd; gy < Rd; gy += cell) {
          let run = null;
          const flush = () => { if (run) { m.box((run.x0 + run.x1) / 2, gy + cell / 2, 0, run.x1 - run.x0, cell, 0.36, B.m.accent, { collide: true, cast: false, merge: false }).visible = false; run = null; } };
          for (let gx = -Rd; gx < Rd; gx += cell) {
            const cx = gx + cell / 2, cyy = gy + cell / 2;
            let solid = Math.hypot(cx, cyy) < Rd - 0.1;
            for (let k = 0; k < holes && solid; k++) { const a = k * TAU / holes; if (Math.hypot(cx - Math.cos(a) * holeOff, cyy - Math.sin(a) * holeOff) < holeR + 0.18) solid = false; }
            if (solid) { if (!run) run = { x0: gx, x1: gx + cell }; else run.x1 = gx + cell; } else flush();
          }
          flush();
        }
        // frame
        for (const s of [-1, 1]) B.box(s * (Rd + 0.5), cy, dc, 0.6, cy * 2 + 1.4, 0.8, B.m.darkSteel, {});
        B.box(0, cy * 2 + 0.6, dc, Rd * 2 + 1.6, 0.6, 0.8, B.m.darkSteel, { collide: false });
        B.cyl(0, cy, dc - 0.5, 0.45, 0.6, 'z', B.m.machine, { collide: false });
        const w = (p.speed || 0.8) * (i % 2 ? -1 : 1), ph = i * 1.1;
        const ang = (t) => w * t + ph;
        B.onUpdate((t) => { m.obj.rotation.z = ang(t); });
        gates.push({ dc, ang, holes });
        // side blockers so the ball cannot go around
        for (const s of [-1, 1]) B.box(s * (W / 2 + 0.2), cy, dc, 0.4, cy * 2, 0.4, B.m.darkSteel, {});
      }
      B.coinLine(0, 2, 0, 4, 3);
      // hint: choose hole that will be lowest when we arrive
      B.hint = (c) => {
        const g = gates.find((g) => g.dc > c.local.d - 0.4) || gates[gates.length - 1];
        const ta = c.t + Math.max(0, (g.dc - c.local.d)) / Math.max(4, c.v);
        let best = 0, bs = -9;
        for (let k = 0; k < g.holes; k++) {
          const a = g.ang(ta) + k * TAU / g.holes;
          const hx = Math.cos(a) * holeOff, hy = cy + Math.sin(a) * holeOff;
          const s = -Math.abs(hy - 0.5) - Math.abs(hx) * 0.2;
          if (s > bs) { bs = s; best = hx; }
        }
        return { lat: clamp(best, -1.8, 1.8) };
      };
      B.danger = (x, d, t) => {
        let m = 9;
        for (const g of gates) {
          if (Math.abs(d - g.dc) > 0.8) continue;
          let best = -9;
          for (let k = 0; k < g.holes; k++) { const a = g.ang(t) + k * TAU / g.holes; best = Math.max(best, holeR - Math.hypot(x - Math.cos(a) * holeOff, 0.5 - (cy + Math.sin(a) * holeOff)) - 0.45); }
          m = Math.min(m, best);
        }
        return m;
      };
      B.speedMul = 0.85;
      B.exit(0, 0, total);
    },
  },
  {
    id: 'pendulums', name: 'Wrecking Pendulums', category: 'Moving', difficulty: 3,
    desc: 'Heavy wrecking balls swing across the track from overhead gantries.',
    build(B, p) {
      const n = p.count || 3, spacing = 9, L = 7.3, top = 8;
      const total = 6 + n * spacing;
      pad(B, 0, total, W);
      const pends = [];
      for (let i = 0; i < n; i++) {
        const dc = 7 + i * spacing;
        for (const s of [-1, 1]) { B.box(s * 3.8, top / 2 - 0.5, dc, 0.5, top + 1, 0.5, B.m.darkSteel, {}); B.box(s * 3.8, -1.2, dc, 0.9, 1.2, 0.9, B.m.darkSteel, { collide: false }); }
        B.box(0, top + 0.1, dc, 8.2, 0.5, 0.6, B.m.machine, { collide: false });
        const m = B.mover(0, top, dc);
        for (let k = 0; k < 9; k++) m.mesh(new THREE.TorusGeometry(0.18, 0.06, 6, 10), B.m.steel, 0, -0.4 - k * 0.72, 0, { rx: 0, ry: (k % 2) * Math.PI / 2 });
        m.sphere(0, -L, 0, 0.95, B.m.darkSteel, { restitution: 0.3 });
        m.cyl(0, -L + 0.9, 0, 0.3, 0.3, 'y', B.m.hazard, { collide: false });
        const A = (p.swing || 58) * deg, w = Math.sqrt(24 / L) * (p.speed || 0.62), ph = i * 2.2 + (p.phase || 0);
        const th = (t) => A * Math.sin(w * t + ph);
        B.onUpdate((t) => { m.obj.rotation.z = th(t); });
        pends.push({ dc, th });
      }
      B.coinLine(0, 3, 0, total - 2, n * 3);
      B.danger = (x, d, t) => { let m = 9; for (const pd of pends) { if (Math.abs(d - pd.dc) > 1.6) continue; const a = pd.th(t); const bx = L * Math.sin(a), by = top - L * Math.cos(a); m = Math.min(m, Math.hypot(x - bx, 0.5 - by) - 1.55); } return m; };
      B.width = 4.6;
      B.exit(0, 0, total);
    },
  },
  {
    id: 'piston_punch', name: 'Piston Punchers', category: 'Moving', difficulty: 3,
    desc: 'Hydraulic rams punch out from the side walls with a hard, fast strike.',
    build(B, p) {
      const n = p.count || 5, spacing = 5;
      const total = 6 + n * spacing + 2;
      pad(B, 0, total, W);
      const pist = [];
      for (const s of [-1, 1]) B.box(s * (W / 2 + 0.8), 0.9, total / 2, 1.6, 1.8, total - 4, B.m.concrete, {});
      const period = p.period || 2.2;
      for (let i = 0; i < n; i++) {
        const side = i % 2 ? 1 : -1, dc = 6 + i * spacing;
        const m = B.mover(side * (W / 2), 0, dc);
        m.box(side * 1.0, 0.7, 0, 2.0, 1.1, 1.5, B.m.steel, { cast: true });
        m.box(-side * 0.08, 0.7, 0, 0.16, 1.2, 1.6, B.m.hazard, {});
        const ph = i * 0.73 + (p.phase || 0);
        const ext = (t) => {
          const u = (((t / period + ph) % 1) + 1) % 1;
          if (u < 0.1) return smooth(u / 0.1);
          if (u < 0.32) return 1;
          if (u < 0.7) return 1 - smooth((u - 0.32) / 0.38);
          return 0;
        };
        const reach = p.reach || 2.9;
        let out = false;
        B.onUpdate((t) => { const e = ext(t); m.obj.position.x = side * (W / 2 + 0.05 - e * reach); if (e > 0.5 && !out) { out = true; B.sfxNear('hiss', side * 2, dc, 0.7, 26); } else if (e < 0.1) out = false; });
        pist.push({ side, dc, ext, reach });
        B.coin(-side * 1.3, 0.65, dc);
      }
      B.danger = (x, d, t) => { let m = 9; for (const q of pist) { if (Math.abs(d - q.dc) > 1.3) continue; const face = q.side * (W / 2 + 0.05 - q.ext(t) * q.reach); m = Math.min(m, q.side > 0 ? face - x - 0.6 : x - face - 0.6); } return m; };
      B.width = 4.4;
      B.exit(0, 0, total);
    },
  },
  {
    id: 'crushers', name: 'Hydraulic Crushers', category: 'Moving', difficulty: 4,
    desc: 'Heavy presses slam down in lanes - get caught underneath and you are flattened.',
    build(B, p) {
      const rows = p.rows || 3, lanes = 3, lw = 1.66, spacing = 6.5;
      const total = 6 + rows * spacing + 1;
      pad(B, 0, total, W, { edges: true });
      const cr = [];
      const period = p.period || 2.4;
      for (let r = 0; r < rows; r++) {
        const dc = 6 + r * spacing;
        for (const s of [-1, 1]) B.box(s * 3.0, 3.2, dc, 0.5, 6.4, 0.6, B.m.darkSteel, {});
        B.box(0, 6.4, dc, 6.5, 0.7, 1.4, B.m.machine, { collide: false });
        for (let l = 0; l < lanes; l++) {
          const x = (l - 1) * lw;
          const m = B.mover(x, 0, dc);
          m.box(0, 0.6, 0, lw - 0.12, 1.2, 1.8, B.m.darkSteel);
          m.box(0, 0.02, 0, lw - 0.1, 0.06, 1.85, B.m.hazard, { collide: false });
          m.cyl(0, 3.6, 0, 0.22, 4.8, 'y', B.m.steel, { collide: false });
          const ph = ((l * 0.37 + r * 0.29 + (p.phase || 0)) % 1);
          const h = (t) => {
            const u = (((t / period + ph) % 1) + 1) % 1;
            if (u < 0.12) return 4.6 * (1 - smooth(u / 0.12)); // slam
            if (u < 0.3) return 0;
            if (u < 0.75) return 4.6 * smooth((u - 0.3) / 0.45);
            return 4.6;
          };
          let wasUp = true;
          B.onUpdate((t) => {
            const y = h(t); m.obj.position.y = y;
            if (y < 0.05 && wasUp) { wasUp = false; if (l === 1) B.sfxNear('slam', x, dc, 0.8, 30); } else if (y > 1) wasUp = true;
            if (y < 0.75) { const b = B.ballLocal(); if (b && Math.abs(b.x - x) < lw / 2 - 0.05 && Math.abs(b.d - dc) < 0.95 && b.y < 1.2 && b.y > -0.5) B.kill('crushed'); }
          });
          cr.push({ x, dc, h });
        }
      }
      B.coinLine(0, 2.5, 0, 4.5, 2);
      B.danger = (x, d, t) => { let m = 9; for (const c of cr) { if (Math.abs(d - c.dc) > 1.3 || Math.abs(x - c.x) > lw / 2 + 0.3) continue; m = Math.min(m, c.h(t) - 1.4); } return m; };
      B.width = 4.6;
      B.exit(0, 0, total);
    },
  },
  {
    id: 'propeller', name: 'Propeller Gate', category: 'Moving', difficulty: 3,
    desc: 'Huge propeller blades spin across the track - slip through between the blades.',
    build(B, p) {
      const n = p.count || 2, spacing = 11, cy = 2.4, Rb = 3.1;
      const total = 6 + n * spacing;
      pad(B, 0, total, W);
      const props = [];
      for (let i = 0; i < n; i++) {
        const dc = 7 + i * spacing;
        for (const s of [-1, 1]) B.box(s * 3.4, cy / 2 + 0.2, dc + 0.9, 0.4, cy + 1.2, 0.4, B.m.darkSteel, {});
        B.box(0, cy + 0.1, dc + 0.9, 6.8, 0.4, 0.4, B.m.darkSteel, { collide: false });
        const m = B.mover(0, cy, dc);
        const blades = p.blades || 2;
        for (let k = 0; k < blades; k++) {
          const a = k * Math.PI / blades;
          m.box(0, 0, 0, Rb * 2, 0.32, 0.32, k % 2 ? B.m.rail : B.m.accent2, { rz: a });
        }
        m.cyl(0, 0, 0, 0.45, 0.5, 'z', B.m.hazard, { collide: false });
        const w = (p.speed || 1.3) * (i % 2 ? -1 : 1);
        const ang = (t) => w * t + i;
        B.onUpdate((t) => { m.obj.rotation.z = ang(t); });
        props.push({ dc, ang, blades });
      }
      B.coinLine(0, 3, 0, total - 2, n * 3);
      B.danger = (x, d, t) => {
        let m = 9;
        for (const pr of props) {
          if (Math.abs(d - pr.dc) > 0.85) continue;
          for (let k = 0; k < pr.blades; k++) {
            const a = pr.ang(t) + k * Math.PI / pr.blades;
            const dx = Math.cos(a) * Rb, dy = Math.sin(a) * Rb;
            m = Math.min(m, segDist(x, 0.5, -dx, cy - dy, dx, cy + dy) - 0.7);
          }
        }
        return m;
      };
      B.width = 4.6;
      B.exit(0, 0, total);
    },
  },
  {
    id: 'swing_platforms', name: 'Swing Platforms', category: 'Moving', difficulty: 4,
    desc: 'Platforms hung on long cables swing side to side over the void.',
    build(B, p) {
      const n = p.count || 4, pl = 4.6, L = 6.5, top = 6.6;
      pad(B, 0, 4, W);
      const plats = [];
      for (let i = 0; i < n; i++) {
        const dc = 4 + pl / 2 + i * (pl + 0.35);
        B.box(0, top + 0.3, dc, 7.5, 0.4, 0.5, B.m.darkSteel, { collide: false });
        const m = B.mover(0, top, dc);
        m.box(0, -L - 0.2, 0, 2.6, 0.4, pl, B.m.deck);
        m.box(0, -L - 0.55, 0, 1.4, 0.3, pl - 0.6, B.m.deckSide, { collide: false });
        for (const s of [-1, 1]) for (const e of [-1, 1]) m.pipe([s * 1.2, -L, e * (pl / 2 - 0.3)], [s * 0.3, 0, e * 0.3], 0.04, B.m.steel, { collide: false, caps: false });
        const A = (p.swing || 14) * deg, w = Math.sqrt(24 / L) * 0.75, ph = i * (p.phaseStep ?? 1.0);
        const th = (t) => A * Math.sin(w * t + ph);
        B.onUpdate((t) => { m.obj.rotation.z = th(t); });
        plats.push({ dc, th });
        B.coin(0, 0.65 + 0, dc);
      }
      for (const s of [-1, 1]) for (let i = 0; i <= n; i++) B.box(s * 3.6, top / 2 - 1, 4 + i * (pl + 0.35), 0.4, top + 2, 0.4, B.m.darkSteel, { collide: false });
      const end = 4 + n * (pl + 0.35);
      pad(B, end, end + 4, W);
      const xAt = (pd, t) => L * Math.sin(pd.th(t));
      B.hint = (c) => {
        const pd = plats.find((q) => q.dc + pl / 2 > c.local.d) || null;
        if (!pd) return { lat: 0 };
        return { lat: xAt(pd, c.t + Math.max(0, pd.dc - c.local.d) / Math.max(4, c.v) * 0.5) };
      };
      B.speedMul = 0.85;
      B.exit(0, 0, end + 4);
    },
  },
  {
    id: 'log_roller', name: 'Log Roller', category: 'Moving', difficulty: 4,
    desc: 'Ride along the top of giant spinning logs that try to roll you off.',
    build(B, p) {
      const n = p.count || 3, len = 8, r = 1.05;
      pad(B, 0, 4, W);
      for (let i = 0; i < n; i++) {
        const d0 = 4 + i * (len + 2);
        const m = B.mover(0, -r, d0 + len / 2);
        m.cyl(0, 0, 0, r, len, 'z', B.m.deckAlt, { seg: 28, friction: 1.0 });
        for (let k = 0; k < 4; k++) m.box(0, 0, -len / 2 + 1 + k * 2, r * 2.08, 0.12, 0.25, B.m.rail, { collide: false, rz: k * 0.6 });
        const w = (p.speed || 1.6) * (i % 2 ? 1 : -1);
        B.onUpdate((t) => { m.obj.rotation.z = w * t; });
        B.box(0, -r, d0 - 0.2, 0.5, 0.5, 0.4, B.m.darkSteel, { collide: false });
        B.box(0, -r, d0 + len + 0.2, 0.5, 0.5, 0.4, B.m.darkSteel, { collide: false });
        if (i < n - 1) { B.deck(0, d0 + len + 0.05, d0 + len + 1.95, 2.4, { support: true }); }
        B.support(0, d0 + len / 2, -r * 2 - 0.2);
        B.coinLine(0, d0 + 1.5, 0, d0 + len - 1.5, 3);
      }
      const end = 4 + n * (len + 2) - 2;
      pad(B, end, end + 4, W);
      B.speedMul = 0.85;
      B.hint = () => ({ lat: 0 });
      B.exit(0, 0, end + 4);
    },
  },
  {
    id: 'hammer_slam', name: 'Hammer Slam', category: 'Moving', difficulty: 4,
    desc: 'Giant hinged hammers smash down onto alternating halves of the deck.',
    build(B, p) {
      const n = p.count || 4, spacing = 6.5;
      const total = 6 + n * spacing;
      pad(B, 0, total, W);
      const hs = [];
      const period = p.period || 2.6;
      for (let i = 0; i < n; i++) {
        const side = i % 2 ? 1 : -1, dc = 6 + i * spacing;
        const hx = side * (W / 2 + 0.6);
        B.box(hx, 0.3, dc, 0.9, 1.6, 1.6, B.m.darkSteel, {});
        const m = B.mover(hx, 0.8, dc);
        m.box(-side * 1.2, 0, 0, 2.4, 0.3, 0.3, B.m.steel);
        m.box(-side * 2.5, 0, 0, 1.3, 1.1, 1.8, B.m.machine);
        m.box(-side * 2.5, -0.57, 0, 1.35, 0.06, 1.85, B.m.hazard, { collide: false });
        const ph = i * 0.31 + (p.phase || 0);
        const ang = (t) => {
          const u = (((t / period + ph) % 1) + 1) % 1;
          let k;
          if (u < 0.1) k = 1 - (u / 0.1) * (u / 0.1); else if (u < 0.32) k = 0; else if (u < 0.75) k = smooth((u - 0.32) / 0.43); else k = 1;
          return k; // 1 = raised, 0 = down
        };
        let slammed = false;
        B.onUpdate((t) => {
          const k = ang(t);
          if (k < 0.02 && !slammed) { slammed = true; B.sfxNear('slam', hx, dc, 0.9, 30); } else if (k > 0.5) slammed = false;
          m.obj.rotation.z = side * -k * (Math.PI / 2) * 0.95;
          if (k < 0.12) { const b = B.ballLocal(); if (b && Math.abs(b.d - dc) < 1.05 && side * (b.x - hx) < 0 && Math.abs(b.x - (hx - side * 2.5)) < 0.8 && b.y < 1.0) B.kill('smashed'); }
        });
        hs.push({ side, dc, ang, hx });
        B.coin(-side * 1.2, 0.65, dc + 2.5);
      }
      B.danger = (x, d, t) => { let m = 9; for (const h of hs) { if (Math.abs(d - h.dc) > 1.4) continue; const k = h.ang(t); if (k < 0.5) m = Math.min(m, Math.abs(x - (h.hx - h.side * 2.5)) - 1.35); } return m; };
      B.width = 4.4;
      B.exit(0, 0, total);
    },
  },
  {
    id: 'turntable', name: 'Turntable', category: 'Moving', difficulty: 3,
    desc: 'A huge spinning disc carries you sideways while its radial walls sweep around.',
    build(B, p) {
      const Rp = 5.4, dc = 3 + Rp, w = (p.speed || 0.55) * (p.dir || 1);
      pad(B, 0, 3.2, W);
      const m = B.mover(0, 0, dc);
      m.cyl(0, -0.25, 0, Rp, 0.5, 'y', B.m.deckAlt, { seg: 56 });
      m.cyl(0, 0.01, 0, Rp * 0.98, 0.02, 'y', B.m.deck, { seg: 56, collide: false });
      const walls = p.walls || 3;
      for (let k = 0; k < walls; k++) { const a = k * TAU / walls; m.box(Math.cos(a) * (Rp / 2 + 0.6), 0.35, Math.sin(a) * (Rp / 2 + 0.6), Rp - 1.4, 0.7, 0.35, B.m.rail, { ry: a }); }
      m.cyl(0, 0.5, 0, 0.9, 1.0, 'y', B.m.machine, {});
      B.cyl(0, -0.9, dc, 1.4, 0.8, 'y', B.m.darkSteel, { collide: false });
      B.support(0, dc, -1.3);
      const ang = (t) => w * t;
      B.onUpdate((t) => { m.obj.rotation.y = ang(t); });
      pad(B, dc + Rp - 0.2, dc + Rp + 3.5, W);
      B.coinLine(-2.5, dc - 1.5, -2.5, dc + 1.5, 3);
      B.danger = (x, d, t) => {
        const lx = x, ld = d - dc;
        if (Math.hypot(lx, ld) > Rp + 0.6) return Math.abs(x) < 2.4 ? 9 : -1;
        let mm = Math.hypot(lx, ld) - 1.5;
        for (let k = 0; k < walls; k++) { const a = ang(t) + k * TAU / walls; mm = Math.min(mm, segDist(lx, ld, Math.cos(a) * 1.3, Math.sin(a) * 1.3, Math.cos(a) * (Rp - 0.1), Math.sin(a) * (Rp - 0.1)) - 0.7); }
        if (Math.hypot(lx, ld) > Rp - 0.6) mm = Math.min(mm, -0.2);
        return mm;
      };
      B.width = 5.4;
      B.exit(0, 0, dc + Rp + 3.5);
    },
  },
  {
    id: 'sliding_lanes', name: 'Shifting Platforms', category: 'Moving', difficulty: 3,
    desc: 'A chain of platforms sliding sideways at different rhythms over a gap.',
    build(B, p) {
      const n = p.count || 4, pl = 4.4, pw = p.w || 2.5, A = p.amp || 1.7;
      pad(B, 0, 4, W);
      const plats = [];
      for (let i = 0; i < n; i++) {
        const dc = 4 + pl / 2 + i * (pl + 0.3);
        const m = B.mover(0, 0, dc);
        m.box(0, -0.25, 0, pw, 0.5, pl, B.m.deck);
        m.box(0, -0.6, 0, pw * 0.6, 0.3, pl - 0.6, B.m.machine, { collide: false });
        for (const s of [-1, 1]) m.box(s * (pw / 2 - 0.05), 0.02, 0, 0.1, 0.06, pl, B.m.hazard, { collide: false, cast: false });
        const w = (p.speed || 1.3) * (1 + (i % 3) * 0.22), ph = i * 1.4;
        const x = (t) => A * Math.sin(w * t + ph);
        B.onUpdate((t) => { m.obj.position.x = x(t); });
        B.box(0, -0.9, dc, A * 2 + pw, 0.12, 0.25, B.m.steel, { collide: false });
        plats.push({ dc, x });
        B.coin(0, 0.65, dc);
      }
      const end = 4 + n * (pl + 0.3);
      for (let d = 4; d <= end; d += pl + 0.3) B.support(0, d, -1.0);
      pad(B, end, end + 4, W);
      B.hint = (c) => {
        const pd = plats.find((q) => q.dc + pl / 2 > c.local.d + 0.3);
        if (!pd) return { lat: 0 };
        const dt = Math.max(0, pd.dc - pl / 2 - c.local.d) / Math.max(4, c.v);
        return { lat: pd.x(c.t + dt + 0.15) };
      };
      B.exit(0, 0, end + 4);
    },
  },
];
