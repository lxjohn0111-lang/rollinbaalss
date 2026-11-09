// Jumping challenges: ramps, gaps, springs, drops and precision hops.
import * as THREE from 'three';
import { W, arrows, pad, smooth, clamp, arch } from './kit.js';

const G = 24;

export function boostPad(B, x, d0, d1, w, power = 1.8, time = 1.6) {
  B.box(x, -0.02, (d0 + d1) / 2, w, 0.05, d1 - d0, B.m.dark, { surface: { type: 'boost', power, time }, cast: false });
  arrows(B, x, (d0 + d1) / 2, Math.min(w, 2.6), d1 - d0, B.m.arrowGold, 0.012);
}

function edgeStripes(B, d, w) { B.box(0, 0.006, d, w, 0.012, 0.5, B.m.hazard, { collide: false, cast: false }); }

// Smooth ramp ribbon from d0 to d1 rising from y0 to y1 with a concave (kicker) profile.
function ramp(B, d0, d1, y0, y1, w, mat, exp = 2) {
  const fn = (u) => ({ x: 0, y: y0 + (y1 - y0) * Math.pow(u, exp), d: d0 + (d1 - d0) * u, h: 0, w });
  B.ribbon(fn, 24, w, 0.5, mat || B.m.deckAlt, { path: true, supports: true, supportStep: 6 });
  return fn;
}

export const JUMPS = [
  {
    id: 'launch_ramp', name: 'Launch Ramp', category: 'Jumps', difficulty: 2,
    desc: 'Hit the boost strip, fly off the ramp and clear a big gap.',
    build(B, p) {
      const gap = p.gap || 7, rl = 7, rh = p.rise || 2.0, drop = p.drop ?? 1.5;
      pad(B, 0, 8, W, { edges: true });
      boostPad(B, 0, 2, 7.5, 3.2, p.boost || 1.8, 1.9);
      const fn = ramp(B, 8, 8 + rl, 0, rh, W, B.m.deckAlt);
      for (const s of [-1, 1]) B.box(s * (W / 2 - 0.1), rh / 2 - 0.2, 8 + rl - 0.5, 0.2, rh + 0.4, 1.0, B.m.hazard, { collide: false });
      const ld = 8 + rl + gap;
      B.deck(0, ld, ld + 24, 6.5, { y: -drop, edges: true });
      arrows(B, 0, ld + 4, 3, 3, B.m.arrowGreen, -drop + 0.012);
      B.pathLine(0, 8 + rl, 0, ld, rh, -drop);
      B.pathLine(0, ld, 0, ld + 24, -drop, -drop);
      // coins along the flight arc
      for (let i = 1; i < 7; i++) { const k = i / 7; B.coin(0, rh + 1.2 + Math.sin(k * Math.PI) * 2.6 - k * drop, 8 + rl + k * gap * 1.4); }
      if (p.gem) B.gem(0, rh + 4.2, 8 + rl + gap * 0.6);
      void fn;
      B.cam = { dist: 8, height: 4.2, fov: 68 };
      B.hint = () => ({ lat: 0 });
      B.exit(0, -drop, ld + 24);
    },
  },
  {
    id: 'precision_hops', name: 'Precision Hops', category: 'Jumps', difficulty: 3, jump: true,
    desc: 'Small floating pads - jump from each one to the next.',
    build(B, p) {
      const n = p.count || 6, pl = 3.0, gap = 2.2, pw = p.w || 2.3;
      pad(B, 0, 4, W);
      arrows(B, 0, 2.5, 2, 2, B.m.arrowBlue);
      const pads = [];
      let d = 4;
      for (let i = 0; i < n; i++) {
        d += i === 0 ? 0 : gap;
        const x = i === 0 ? 0 : (i % 2 ? 1 : -1) * (p.offset ?? 0.7);
        const y = i === 0 ? 0 : (p.heights ? p.heights[i % p.heights.length] : 0);
        if (i === 0) B.deck(0, d, d + pl, W, {});
        else { B.deck(x, d, d + pl, pw, { y, edges: true, edgeMat: B.m.glow, support: true }); }
        edgeStripes(B, d + pl - 0.25, i === 0 ? W : pw);
        pads.push({ x, y, d0: d, d1: d + pl });
        B.coin(x, y + 0.65, d + pl / 2);
        d += pl;
      }
      d += gap;
      B.deck(0, d, d + 6, W, {});
      for (let i = 0; i < pads.length; i++) {
        const a = pads[i], b = pads[i + 1] || { x: 0, y: 0, d0: d };
        B.pathLine(a.x, a.d0, a.x, a.d1, a.y, a.y);
        B.pathLine(a.x, a.d1, b.x, b.d0, a.y, b.y);
        B.coinArc(a.x, a.d1 + 0.3, b.x, b.d0 - 0.3, 2, Math.max(a.y, b.y) + 1.6, 0.3);
      }
      if (p.gem) B.gem(pads[Math.floor(n / 2)].x, 2.3, pads[Math.floor(n / 2)].d1 + gap / 2);
      B.speedMul = p.speed || 0.75;
      B.hint = (c) => {
        const pd = pads.find((q) => c.local.d < q.d1 + 0.2);
        if (!pd) return { lat: 0 };
        const nx = pads[pads.indexOf(pd) + 1];
        const lat = c.local.d > pd.d1 - 1.4 && nx ? nx.x : pd.x;
        return { lat, jump: c.local.d > pd.d1 - 1.3 && c.local.d < pd.d1 - 0.3 };
      };
      B.cam = { dist: 7, height: 3.8 };
      B.exit(0, 0, d + 6);
    },
  },
  {
    id: 'twin_gaps', name: 'Twin Gaps', category: 'Jumps', difficulty: 2, jump: true,
    desc: 'Two open gaps back to back - time a pair of jumps.',
    build(B, p) {
      const gap = p.gap || 3.4, mid = p.mid || 7;
      pad(B, 0, 9, W, { edges: true });
      arrows(B, 0, 6.5, 2.4, 3, B.m.arrowBlue);
      edgeStripes(B, 8.75, W);
      const m0 = 9 + gap, m1 = m0 + mid;
      B.deck(0, m0, m1, W, { edges: true, y: p.midY || 0 });
      arrows(B, 0, m1 - 2.5, 2.4, 3, B.m.arrowBlue, (p.midY || 0) + 0.012);
      edgeStripes(B, m1 - 0.25, W);
      const e0 = m1 + gap;
      B.deck(0, e0, e0 + 8, W, { edges: true });
      B.coinArc(0, 9.3, 0, m0 - 0.3, 3, 1.5, 0.6);
      B.coinArc(0, m1 + 0.3, 0, e0 - 0.3, 3, 1.5, 0.6);
      B.coinLine(0, m0 + 1.5, 0, m1 - 1.5, 3, (p.midY || 0) + 0.65);
      B.pathLine(0, 0, 0, e0 + 8, 0, 0);
      const edges = [9, m1];
      B.hint = (c) => ({ lat: 0, jump: edges.some((e) => c.local.d > e - 1.6 && c.local.d < e - 0.2) });
      B.exit(0, 0, e0 + 8);
    },
  },
  {
    id: 'spring_pads', name: 'Spring Launch', category: 'Jumps', difficulty: 2,
    desc: 'Coil-spring pads catapult the ball up onto higher decks.',
    build(B, p) {
      const n = p.count || 2, rise = 3.4, power = p.power || 15.5;
      let d = 0, y = 0;
      pad(B, 0, 5, W);
      d = 5;
      for (let i = 0; i < n; i++) {
        // spring plate
        const plate = B.box(0, y - 0.15, d + 1.2, 4.2, 0.3, 2.4, B.m.bouncy, { surface: { type: 'spring', power, onSpring: () => { plate.userData.k = 1; } } });
        for (let k = 0; k < 4; k++) B.mesh(new THREE.TorusGeometry(0.55, 0.09, 8, 18), B.m.steel, 0, y - 0.45 - k * 0.25, d + 1.2, { rx: Math.PI / 2 });
        B.box(0, y - 1.5, d + 1.2, 4.4, 0.4, 2.6, B.m.darkSteel, { collide: false });
        B.support(0, d + 1.2, y - 1.7);
        arrows(B, 0, d + 1.2, 2.6, 2, B.m.arrowGreen, y + 0.02);
        const up = d + 1.2 + 6.3;
        B.pathLine(0, d, 0, d + 2.4, y, y);
        B.pathLine(0, d + 2.4, 0, up, y, y + rise);
        y += rise;
        B.deck(0, up, up + 12, W, { y, edges: true });
        B.coinArc(0, d + 2.6, 0, up - 0.4, 4, y + 0.2, 1.4);
        B.pathLine(0, up, 0, up + 10, y, y);
        d = up + 10;
        if (i < n - 1) B.coinLine(0, up + 2, 0, up + 8, 3, y + 0.65);
      }
      B.deck(0, d, d + 4, W, { y });
      if (p.gem) B.gem(0, y + 1.0, d - 3);
      B.hint = () => ({ lat: 0 });
      B.cam = { dist: 7.5, height: 4.2 };
      B.exit(0, y, d + 4);
    },
  },
  {
    id: 'track_transfer', name: 'Track Transfer', category: 'Jumps', difficulty: 3,
    desc: 'A kicker throws you across onto a parallel track - steer in mid-air.',
    build(B, p) {
      const side = p.side || 1, off = 2.6 * side, gap = 4.2;
      pad(B, 0, 7, W, { edges: true });
      boostPad(B, 0, 1, 6, 3.4, 1.5, 1.4);
      ramp(B, 7, 12, 0, 1.3, W, B.m.deckAlt, 1.6);
      const ld = 12 + gap;
      B.deck(off, ld, ld + 16, 3.6, { edges: true });
      arrows(B, off, ld + 3, 2.2, 3, B.m.arrowGreen);
      for (let i = 0; i < 5; i++) { const k = i / 4; B.coin(off * k, 2.3 + Math.sin(k * Math.PI) * 0.8, 12.5 + k * (gap + 1)); }
      B.pathFn((u) => { const d = u * (ld + 2); return { x: off * smooth(u), y: d < 7 ? 0 : d < 12 ? 1.3 * Math.pow((d - 7) / 5, 1.6) : 1.3 * (1 - (d - 12) / (ld + 2 - 12)), d }; }, 40);
      B.pathLine(off, ld + 2, off, ld + 16, 0, 0);
      B.hint = () => ({ lat: 0 });
      B.exit(off, 0, ld + 16);
    },
  },
  {
    id: 'sky_drop', name: 'Sky Drop', category: 'Jumps', difficulty: 2,
    desc: 'The track simply ends - free-fall onto a deck far below.',
    build(B, p) {
      const drop = p.drop || 7;
      pad(B, 0, 8, W, { edges: true });
      edgeStripes(B, 7.75, W);
      B.box(-2.9, 1.2, 6, 0.15, 2.4, 0.15, B.m.steel, { collide: false });
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.0), new THREE.MeshStandardMaterial({ color: 0xffd34d, emissive: 0x553300, emissiveIntensity: 0.4 }));
      sign.position.set(-2.9, 2.3, -6); B.group.add(sign);
      const ld = 10;
      B.deck(0, ld, ld + 26, 7, { y: -drop, edges: true, edgeMat: B.m.glowGold });
      arrows(B, 0, ld + 6, 3, 3, B.m.arrowGreen, -drop + 0.012);
      for (let i = 0; i < 6; i++) { const k = i / 5; B.coin(0, 0.6 - drop * k * k, 8.3 + k * 7); }
      B.pathLine(0, 8, 0, ld + 6, 0, -drop);
      B.pathLine(0, ld + 6, 0, ld + 26, -drop, -drop);
      if (p.gem) B.gem(2.6, -drop + 1, ld + 14);
      B.cam = { dist: 7.6, height: 4.6 };
      B.hint = () => ({ lat: 0 });
      B.exit(0, -drop, ld + 26);
    },
  },
  {
    id: 'ski_jump', name: 'Ski Jump', category: 'Jumps', difficulty: 3,
    desc: 'Plunge down a steep in-run, launch off the lip and land on the hill below.',
    build(B, p) {
      const inDrop = p.inDrop || 5, inLen = 18, gap = p.gap || 12, landDrop = p.landDrop || 6, landLen = 26;
      pad(B, 0, 3, W);
      const fin = (u) => ({ x: 0, y: -inDrop * (u < 0.85 ? smooth(u / 0.85) : 1) + (u > 0.85 ? Math.pow((u - 0.85) / 0.15, 2) * 0.7 : 0), d: 3 + inLen * u, h: 0, w: 4.2 });
      B.ribbon(fin, 50, 4.2, 0.5, B.m.deckAlt, { path: true, supports: true, supportStep: 6, walls: { h: 0.5, t: 0.25, mat: B.m.rail } });
      const lipY = fin(1).y, lipD = 3 + inLen;
      const l0 = lipD + gap;
      const lfn = (u) => ({ x: 0, y: lipY - 1.5 - landDrop * smooth(Math.min(1, u * 1.2)), d: l0 + landLen * u, h: 0, w: 7 });
      B.ribbon(lfn, 40, 7, 0.5, B.m.deck, { supports: true, supportStep: 8 });
      const endY = lfn(1).y;
      B.deck(0, l0 + landLen, l0 + landLen + 6, 7, { y: endY });
      B.pathLine(0, lipD, 0, l0, lipY, lipY - 1.5);
      B.pathFn(lfn, 30);
      B.pathLine(0, l0 + landLen, 0, l0 + landLen + 6, endY, endY);
      for (let i = 0; i < 7; i++) { const k = i / 6; B.coin(0, lipY + 1.3 + Math.sin(k * Math.PI) * 1.8 - k * 2, lipD + 0.5 + k * gap * 1.3); }
      if (p.gem) B.gem(0, lipY + 3.6, lipD + gap * 0.55);
      B.speedMul = 1.75;
      B.cam = { dist: 8.5, height: 4.6, fov: 70 };
      B.hint = () => ({ lat: 0 });
      B.exit(0, endY, l0 + landLen + 6);
    },
  },
  {
    id: 'moving_landing', name: 'Moving Target', category: 'Jumps', difficulty: 4,
    desc: 'Launch toward a landing platform that slides from side to side.',
    build(B, p) {
      const gap = 5.5, A = p.amp || 2.0;
      pad(B, 0, 6, W, { edges: true });
      boostPad(B, 0, 1, 5.5, 3.2, 1.6, 1.6);
      ramp(B, 6, 11, 0, 1.4, W, B.m.deckAlt, 1.7);
      const pd0 = 11 + gap, pl = 9;
      const m = B.mover(0, -0.8, pd0 + pl / 2);
      m.box(0, -0.25, 0, 4.0, 0.5, pl, B.m.deck);
      m.box(0, -0.62, 0, 2.4, 0.3, pl - 1, B.m.machine, { collide: false });
      for (const s of [-1, 1]) m.box(s * 1.95, 0.02, 0, 0.1, 0.06, pl, B.m.glow, { collide: false });
      const w = p.speed || 1.1;
      const x = (t) => A * Math.sin(w * t);
      B.onUpdate((t) => { m.obj.position.x = x(t); });
      B.box(0, -1.9, pd0 + pl / 2, A * 2 + 4, 0.25, 0.4, B.m.steel, { collide: false });
      const e0 = pd0 + pl + 0.3;
      B.deck(0, e0, e0 + 8, 6.4, { y: -0.8 });
      B.pathLine(0, 11, 0, pd0, 1.4, -0.8);
      B.pathLine(0, pd0, 0, e0 + 8, -0.8, -0.8);
      B.coinLine(0, 12, 0, 15, 3, 2.6, 2.0);
      B.hint = (c) => ({ lat: c.local.d > 7 ? x(c.t + Math.max(0, pd0 + 2 - c.local.d) / Math.max(5, c.v)) : 0 });
      B.cam = { dist: 7.5, height: 4.4, fov: 66 };
      B.exit(0, -0.8, e0 + 8);
    },
  },
  {
    id: 'hurdles', name: 'Hurdle Sprint', category: 'Jumps', difficulty: 2, jump: true,
    desc: 'Low barriers span the whole track - hop over each one.',
    build(B, p) {
      const n = p.count || 5, sp = p.spacing || 9;
      const total = 8 + n * sp;
      pad(B, 0, total, W, { edges: true });
      const hs = [];
      for (let i = 0; i < n; i++) {
        const d = 8 + i * sp;
        B.box(0, 0.38, d, W, 0.76, 0.3, i % 2 ? B.m.accent : B.m.accent2, {});
        B.box(0, 0.78, d, W, 0.08, 0.34, B.m.hazard, { collide: false });
        arrows(B, 0, d - 3.5, 2, 2, B.m.arrowBlue);
        B.coinArc(0, d - 2.5, 0, d + 2.5, 3, 1.4, 0.9);
        hs.push(d);
      }
      B.hint = (c) => ({ lat: 0, jump: hs.some((h) => c.local.d > h - 3.1 && c.local.d < h - 2.1) });
      B.exit(0, 0, total);
    },
  },
  {
    id: 'pillar_hop', name: 'Pillar Hop', category: 'Jumps', difficulty: 3, jump: true,
    desc: 'Leap between tall pillars at different heights.',
    build(B, p) {
      const heights = p.heights || [0, 0.5, 1.0, 0.4, -0.3, 0.3, 0];
      const pl = 3.2, gap = 2.0;
      pad(B, 0, 4, W);
      const pillars = [];
      let d = 4 + gap;
      for (let i = 0; i < heights.length; i++) {
        const y = heights[i], x = (i % 3 - 1) * (p.offset ?? 0.6);
        B.box(x, y - 4, d + pl / 2, 2.6, 8, pl, i % 2 ? B.m.concrete : B.m.deckAlt, {});
        B.box(x, y + 0.01, d + pl / 2, 2.6, 0.02, pl, B.m.deck, { collide: false, cast: false });
        B.support(x, d + pl / 2, y - 8);
        pillars.push({ x, y, d0: d, d1: d + pl });
        B.coin(x, y + 0.65, d + pl / 2);
        d += pl + gap;
      }
      B.deck(0, d, d + 6, W);
      edgeStripes(B, 3.75, W);
      let prev = { x: 0, y: 0, d1: 4 };
      for (const q of pillars) { B.pathLine(prev.x, prev.d1, q.x, q.d0, prev.y, q.y); B.pathLine(q.x, q.d0, q.x, q.d1, q.y, q.y); prev = q; }
      B.pathLine(prev.x, prev.d1, 0, d, prev.y, 0);
      const all = [{ x: 0, y: 0, d0: 0, d1: 4 }, ...pillars, { x: 0, y: 0, d0: d, d1: d + 6 }];
      B.speedMul = p.speed || 0.75;
      B.hint = (c) => {
        const i = all.findIndex((q) => c.local.d < q.d1 + 0.2);
        if (i < 0) return { lat: 0 };
        const q = all[i], nx = all[i + 1];
        return { lat: c.local.d > q.d1 - 1.5 && nx ? nx.x : q.x, jump: !!nx && c.local.d > q.d1 - 1.3 && c.local.d < q.d1 - 0.35 };
      };
      if (p.gem) B.gem(pillars[3].x, pillars[3].y + 2.4, pillars[3].d1 + 1);
      B.cam = { dist: 7, height: 4 };
      B.exit(0, 0, d + 6);
    },
  },
  {
    id: 'mega_hoop', name: 'Mega Hoop Jump', category: 'Jumps', difficulty: 3,
    desc: 'A colossal boosted launch - steer through the blazing hoop for a bonus.',
    build(B, p) {
      const gap = p.gap || 16, off = p.off ?? 1.4;
      pad(B, 0, 10, W, { edges: true, edgeMat: B.m.glowGold });
      boostPad(B, 0, 1, 9, 3.6, 2.15, 2.6);
      ramp(B, 10, 18, 0, 2.4, W, B.m.deckAlt, 2);
      const ld = 18 + gap;
      B.deck(0, ld, ld + 28, 7, { y: -2, edges: true });
      arrows(B, 0, ld + 5, 3, 3, B.m.arrowGreen, -1.988);
      // hoop at the expected apex
      const hd = 18 + gap * 0.48, hy = 6.2;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(2.7, 0.28, 16, 48), B.m.glowGold);
      ring.position.set(off, hy, -hd); ring.castShadow = true; B.group.add(ring);
      const ring2 = new THREE.Mesh(new THREE.TorusGeometry(3.05, 0.08, 8, 48), B.m.glowRed);
      ring2.position.copy(ring.position); B.group.add(ring2);
      B.box(off, hy / 2 - 4, hd, 0.4, hy + 5, 0.4, B.m.darkSteel, { collide: false });
      B.trigger(off, hy, hd, 4.6, 4.6, 1.5, () => B.course.game.bonus && B.course.game.bonus('HOOP BONUS', 30), { repeat: false });
      for (let i = 0; i < 5; i++) B.coin(off, hy - 1.4 + i * 0.7, hd);
      B.pathLine(0, 18, 0, ld, 2.4, -2);
      B.pathLine(0, ld, 0, ld + 28, -2, -2);
      B.onUpdate((t) => { ring.rotation.z = t * 0.6; ring2.rotation.z = -t * 0.8; });
      if (p.gem) B.gem(off, hy + 0.2, hd + 1.4);
      B.cam = { dist: 9, height: 4.6, fov: 72 };
      B.hint = (c) => ({ lat: c.local.d > 17 ? off : 0 });
      B.exit(0, -2, ld + 28);
    },
  },
];
void clamp; void arch;
