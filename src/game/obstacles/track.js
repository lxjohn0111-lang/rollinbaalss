// Structural sections (start/finish/checkpoint/connectors) and narrow-track challenges.
import * as THREE from 'three';
import { W, arch, arrows, pad, smooth, lerp, clamp, guardRail } from './kit.js';

const deg = Math.PI / 180;

// ------------------------------------------------------------------ structure & connectors
export const STRUCTURE = [
  {
    id: 'start', name: 'Start Line', category: 'structure', kind: 'structure', difficulty: 0,
    desc: 'Launch platform with the start gate.',
    build(B) {
      pad(B, -6, 16, 6.5, { edges: true });
      B.box(0, 1.2, -6.2, 6.5, 2.4, 0.4, B.m.accent, {});
      arch(B, 5, 6.5, 'GO!', { text: { stripes: true, bg: '#e8322d' } });
      arrows(B, 0, 9, 2.6, 3.2, B.m.arrowGreen);
      B.coinLine(0, 11, 0, 15, 4);
      B.spawnD = 0;
      B.exit(0, 0, 16);
    },
  },
  {
    id: 'finish', name: 'Finish Line', category: 'structure', kind: 'structure', difficulty: 0, finish: true,
    desc: 'Finish gate and run-out.',
    build(B) {
      pad(B, 0, 34, 7, { edges: true, edgeMat: B.m.glowGold });
      B.box(0, 0.006, 6, 7, 0.02, 2.2, B.m.checker, { collide: false, cast: false });
      arch(B, 6, 7, 'FINISH', { h: 6.2, text: { stripes: true, bg: '#14161c', accent: '#ffcf33' }, lampMat: B.m.glowGold });
      // run-out barriers and end wall to stop the ball
      guardRail(B, -3.4, 8, 34, { h: 0.9, mat: B.m.accent });
      guardRail(B, 3.4, 8, 34, { h: 0.9, mat: B.m.accent });
      B.box(0, 1.1, 34.3, 7.4, 2.2, 0.6, B.m.rubber, { restitution: 0.1 });
      for (const s of [-1, 1]) for (let d = 12; d < 33; d += 7) { B.cyl(s * 3.0, 1.6, d, 0.25, 1.4, 'y', B.m.machine, { collide: false }); }
      B.finishOffset = 6;
      B.speedMul = 0.8;
      B.exit(0, 0, 34);
    },
  },
  {
    id: 'checkpoint', name: 'Checkpoint', category: 'structure', kind: 'structure', difficulty: 0, checkpoint: true,
    desc: 'Safe platform with a respawn gate.',
    build(B) {
      pad(B, 0, 9, 5.6, { edges: true, edgeMat: B.m.glowGreen });
      arch(B, 3.5, 5.6, 'CHECKPOINT', { text: { bg: '#123d24', accent: '#3cff7a' }, lampMat: B.m.glowGreen });
      const flagMat = new THREE.MeshStandardMaterial({ color: 0x8a8f99, emissive: 0x000000, roughness: 0.5 });
      const flag = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.05), flagMat);
      flag.position.set(-3.7, 5.2, -3.5); B.group.add(flag);
      const flag2 = flag.clone(); flag2.position.x = 3.7; B.group.add(flag2);
      B.flag = { mats: [flagMat], set: (on) => { flagMat.color.set(on ? 0x3cff7a : 0x8a8f99); flagMat.emissive.set(on ? 0x1aa040 : 0x000000); } };
      B.checkpointOffset = 4.5;
      B.exit(0, 0, 9);
    },
  },
  {
    id: 'runway', name: 'Runway', category: 'connector', kind: 'connector', difficulty: 0,
    desc: 'Straight connector.',
    build(B, p) {
      const len = p.len || 10, w = p.w || W;
      pad(B, 0, len, w, { edges: !!p.edges });
      if (p.coins) B.coinLine(p.coinX || 0, 2, p.coinX || 0, len - 2, Math.max(2, Math.floor(len / 2.2)));
      if (p.arrows) arrows(B, 0, len / 2, 2.4, 3, B.m.arrowBlue);
      B.exit(0, 0, len);
    },
  },
  {
    id: 'curve', name: 'Curve', category: 'connector', kind: 'connector', difficulty: 0,
    desc: 'Banked turn connector.',
    build(B, p) {
      const ang = (p.angle ?? 45) * deg, R = p.r || 16, w = p.w || W, sg = Math.sign(ang) || 1, A = Math.abs(ang);
      const bank = (p.bank ?? 7) * deg * sg;
      const fn = (u) => { const h = A * u; return { x: sg * R * (1 - Math.cos(h)), y: (p.dy || 0) * smooth(u), d: R * Math.sin(h), h: sg * h, bank: bank * Math.sin(Math.PI * u) }; };
      const steps = Math.max(8, Math.ceil(A * R / 1.2));
      B.ribbon(fn, steps, w, 0.5, B.m.deck, { path: true, supports: true });
      // inner curb lights
      if (p.coins !== false) for (let i = 1; i < 6; i++) { const c = fn(i / 6); B.coin(c.x + Math.cos(c.h) * sg * 1.2, c.y + 0.65, c.d - Math.sin(c.h) * sg * 1.2); }
      const e = fn(1);
      B.exit(e.x, e.y, e.d, e.h);
    },
  },
  {
    id: 'slope', name: 'Slope', category: 'connector', kind: 'connector', difficulty: 0,
    desc: 'Smooth elevation change.',
    build(B, p) {
      const len = p.len || 16, dy = p.dy ?? -4, w = p.w || W;
      const fn = (u) => ({ x: 0, y: dy * smooth(u), d: len * u, h: 0 });
      B.ribbon(fn, 24, w, 0.5, B.m.deck, { path: true, supports: true });
      if (p.coins !== false) for (let i = 1; i < 5; i++) { const c = fn(i / 5); B.coin(0, c.y + 0.65, c.d); }
      B.exit(0, dy, len);
    },
  },
];

// ------------------------------------------------------------------ narrow-track challenges
export const TRACK = [
  {
    id: 'balance_beam', name: 'Balance Beam', category: 'Narrow Track', difficulty: 2,
    desc: 'An extremely narrow plank suspended over the drop.',
    build(B, p) {
      const len = p.len || 26, bw = p.w || 1.05;
      pad(B, 0, 4, W);
      B.ribbon((u) => ({ x: 0, y: 0, d: 4 + 3 * u, w: lerp(W, bw, smooth(u)) }), 6, W, 0.5, B.m.deck, { path: true });
      B.deck(0, 7, 7 + len, bw, { edges: true, edgeMat: B.m.steel, supportStep: 9 });
      B.ribbon((u) => ({ x: 0, y: 0, d: 7 + len + 3 * u, w: lerp(bw, W, smooth(u)) }), 6, W, 0.5, B.m.deck, { path: true });
      pad(B, 10 + len, 13 + len, W);
      B.pathLine(0, 7, 0, 7 + len);
      B.coinLine(0, 8, 0, 6 + len, Math.floor(len / 2));
      if (p.gem) B.gem(0, 1.0, 7 + len / 2);
      B.hint = () => ({ lat: 0 });
      B.exit(0, 0, 13 + len);
    },
  },
  {
    id: 'twin_rails', name: 'Twin Rails', category: 'Narrow Track', difficulty: 3,
    desc: 'Two parallel rails over a gap - the thinner one carries the coins.',
    build(B, p) {
      const len = p.len || 28, gap = p.gap || 1.5, wa = p.wa || 1.1, wb = p.wb || 0.72;
      const xa = -(gap / 2 + wa / 2), xb = gap / 2 + wb / 2;
      pad(B, 0, 5, W);
      B.deck(xa, 5, 5 + len, wa, { mat: B.m.rail, th: 0.35, trim: false, supportStep: 10 });
      B.deck(xb, 5, 5 + len, wb, { mat: B.m.steel, th: 0.35, trim: false, support: false });
      for (let d = 7; d < 5 + len; d += 6) B.box(0, -0.55, d, gap + wa + wb + 0.6, 0.18, 0.3, B.m.darkSteel, { collide: false });
      pad(B, 5 + len, 10 + len, W);
      B.coinLine(xb, 7, xb, 3 + len, Math.floor(len / 1.8));
      if (p.gem) B.gem(xb, 1.0, 5 + len * 0.7);
      B.hint = (c) => ({ lat: c.sl < 3 || c.sl > 5 + len + 1 ? (c.sl < 3 ? xa * clamp(c.sl / 3, 0, 1) : 0) : xa });
      B.exit(0, 0, 10 + len);
    },
  },
  {
    id: 'pipe_bundle', name: 'Pipe Bundle', category: 'Narrow Track', difficulty: 3,
    desc: 'Ride the grooves of a bundle of red pipes while the outer pipes peel away.',
    build(B, p) {
      const len = p.len || 34, r = 0.3, spread = p.spread || 1.4;
      pad(B, 0, 4, W);
      const base = [-1.05, -0.35, 0.35, 1.05];
      const xAt = (i, d) => {
        const u = clamp((d - 4) / len, 0, 1);
        const env = Math.pow(Math.sin(Math.PI * u), 2);
        if (i === 0) return base[0] - spread * env;
        if (i === 3) return base[3] + spread * env * (p.both === false ? 0 : 1);
        return base[i];
      };
      const seg = 2;
      for (let i = 0; i < 4; i++) {
        for (let d = 4; d < 4 + len - 0.01; d += seg) {
          const d2 = Math.min(4 + len, d + seg);
          B.pipe([xAt(i, d), -r, d], [xAt(i, d2), -r, d2], r, B.m.rail, { caps: false, seg: 14 });
          B.sphere(xAt(i, d2), -r, d2, r, B.m.rail, { collide: false, seg: 14, seg2: 8 });
        }
      }
      for (let d = 6; d < 4 + len; d += 4) {
        const xl = xAt(0, d) - 0.3, xr = xAt(3, d) + 0.3;
        B.box((xl + xr) / 2, -0.85, d, xr - xl, 0.2, 0.3, B.m.darkSteel, { collide: false });
        B.support((xl + xr) / 2, d, -1.0);
      }
      pad(B, 4 + len, 8 + len, W);
      B.pathLine(0, 4, 0, 4 + len, 0, 0);
      B.coinLine(0, 6, 0, 2 + len, Math.floor(len / 2.4));
      if (p.gem) B.gem(-0.7, 1.0, 4 + len - 3);
      B.hint = () => ({ lat: 0 });
      B.exit(0, 0, 8 + len);
    },
  },
  {
    id: 'zigzag', name: 'Zigzag Rails', category: 'Narrow Track', difficulty: 3,
    desc: 'Narrow rail segments that snap left and right at sharp corners.',
    build(B, p) {
      const n = p.zigs || 4, L = p.seg || 7, a = (p.angle || 34) * deg, w = p.w || 1.7;
      pad(B, 0, 4, W);
      let x = 0, d = 4;
      const pts = [[0, 4]];
      for (let i = 0; i < n; i++) {
        const h = (i % 2 === 0 ? 1 : -1) * a * (p.flip ? -1 : 1);
        const x2 = x + Math.sin(h) * L, d2 = d + Math.cos(h) * L;
        B.box((x + x2) / 2, -0.25, (d + d2) / 2, w, 0.5, L, B.m.deck, { ry: -h });
        B.box((x + x2) / 2, -0.7, (d + d2) / 2, w * 0.5, 0.4, L, B.m.deckSide, { ry: -h, collide: false });
        B.cyl(x2, -0.25, d2, w * 0.62, 0.5, 'y', B.m.deck, { seg: 20 });
        B.cyl(x2, -0.27, d2, w * 0.66, 0.46, 'y', B.m.rail, { collide: false, seg: 20 });
        B.support(x2, d2, -0.8);
        B.coinLine(x + (x2 - x) * 0.25, d + (d2 - d) * 0.25, x + (x2 - x) * 0.75, d + (d2 - d) * 0.75, 2);
        x = x2; d = d2; pts.push([x, d]);
      }
      B.cyl(0, -0.25, 4, w * 0.62, 0.5, 'y', B.m.deck, { seg: 20 });
      for (let i = 0; i < pts.length - 1; i++) B.pathLine(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
      const endX = x;
      B.ribbon((u) => ({ x: endX * (1 - smooth(u)), y: 0, d: d + 5 * u, h: 0, w: lerp(w, W, u) }), 10, W, 0.5, B.m.deck, { path: true });
      pad(B, d + 5, d + 8, W);
      if (p.gem) B.gem(pts[2][0], 1.0, pts[2][1]);
      B.hint = () => ({ lat: 0 });
      B.exit(0, 0, d + 8);
    },
  },
  {
    id: 'step_pyramid', name: 'Step Pyramid', category: 'Narrow Track', difficulty: 2,
    desc: 'Bumpy stairs climbing up and dropping back down in uneven lanes.',
    build(B, p) {
      const n = p.steps || 6, rise = p.rise || 0.24, run = p.run || 2.4, w = p.w || 4.4;
      pad(B, 0, 4, W);
      let d = 4;
      for (let i = 0; i < n * 2; i++) {
        const lvl = i < n ? i + 1 : 2 * n - i - 1;
        const off = (i % 2 ? 0.08 : -0.08);
        const top = lvl * rise;
        B.box(-w / 4, top / 2 - 0.25 + off, d + run / 2, w / 2, top + 0.5 + off * 2, run + 0.02, i % 2 ? B.m.deck : B.m.deckAlt);
        B.box(w / 4, top / 2 - 0.25 - off, d + run / 2, w / 2, top + 0.5 - off * 2, run + 0.02, i % 2 ? B.m.deckAlt : B.m.deck);
        B.coin(0, top + 0.7, d + run / 2);
        if (i % 3 === 0) B.support(0, d + run / 2, -0.6);
        d += run;
      }
      B.pathLine(0, 4, 0, d, 0, 0);
      pad(B, d, d + 4, W);
      B.hint = () => ({ lat: 0 });
      B.exit(0, 0, d + 4);
    },
  },
  {
    id: 'broken_bridge', name: 'Broken Bridge', category: 'Narrow Track', difficulty: 3,
    desc: 'A suspended plank bridge with whole sections missing on either side.',
    build(B, p, rng) {
      const rows = p.rows || 11, rl = 2.3, tw = 2.25;
      pad(B, 0, 4, W);
      // hole pattern: 0 both, 1 left missing, 2 right missing
      const pat = p.pattern || (() => {
        const a = [0]; let last = 0;
        for (let i = 1; i < rows - 1; i++) {
          let v;
          if (last !== 0 && rng() < 0.45) v = last; else if (last !== 0) v = 0; else v = rng() < 0.5 ? 1 : 2;
          if (i > 1 && a[i - 1] !== 0 && a[i - 2] !== 0 && a[i - 1] === a[i - 2]) v = 0;
          a.push(v); last = v;
        }
        a.push(0); return a;
      })();
      const holes = [];
      for (let i = 0; i < pat.length; i++) {
        const d0 = 4 + i * rl, dc = d0 + rl / 2 - 0.15;
        if (pat[i] !== 1) B.box(-tw / 2 - 0.05, -0.15, dc, tw, 0.3, rl - 0.32, B.m.deck);
        if (pat[i] !== 2) B.box(tw / 2 + 0.05, -0.15, dc, tw, 0.3, rl - 0.32, B.m.deckAlt);
        holes.push(pat[i]);
        if (pat[i] === 0) B.coin(0, 0.65, dc); else B.coin(pat[i] === 1 ? 1.2 : -1.2, 0.65, dc);
      }
      const end = 4 + pat.length * rl;
      for (const s of [-1, 1]) {
        B.box(s * 2.45, -0.55, (4 + end) / 2, 0.22, 0.5, end - 4, B.m.darkSteel, { collide: false });
        for (let d = 4; d <= end; d += 4.6) { B.box(s * 2.45, 1.4, d, 0.12, 3.4, 0.12, B.m.steel, { collide: false }); }
      }
      for (let d = 6; d < end; d += 12) B.support(0, d, -0.9);
      pad(B, end, end + 4, W);
      B.ground = (x, d) => {
        if (d < 4 || d > end) return Math.abs(x) < 2.3;
        const i = Math.floor((d - 4) / rl); const v = holes[i] ?? 0;
        if (Math.abs(x) > 2.3) return false;
        if (v === 1 && x < 0.15) return false;
        if (v === 2 && x > -0.15) return false;
        return true;
      };
      B.width = 4.4;
      B.exit(0, 0, end + 4);
    },
  },
  {
    id: 'fork_paths', name: 'Three-Way Fork', category: 'Narrow Track', difficulty: 3,
    desc: 'The track splits into three routes - risky, steady and bumpy - then merges.',
    build(B, p) {
      const X = p.spread || 3.8, len = p.len || 22;
      pad(B, 0, 4, 7);
      const routes = [
        { x: -X, w: 0.9, mat: B.m.steel },
        { x: 0, w: 2.2, mat: B.m.deck },
        { x: X, w: 1.7, mat: B.m.deckAlt, wave: true },
      ];
      for (const r of routes) {
        const fn = (u) => {
          const d = 4 + u * (len + 12);
          let k;
          if (d < 10) k = smooth((d - 4) / 6); else if (d > len + 10) k = smooth(1 - (d - len - 10) / 6); else k = 1;
          const y = r.wave ? Math.sin((d - 10) / len * Math.PI * 3) * 0.6 * (d > 10 && d < len + 10 ? 1 : 0) : 0;
          const slope = d < 10 ? r.x * 0.25 : d > len + 10 ? -r.x * 0.25 : 0;
          return { x: r.x * k, y, d, h: Math.atan(slope * (d < 10 ? Math.sin(Math.PI * (d - 4) / 6) : d > len + 10 ? Math.sin(Math.PI * (d - len - 10) / 6) : 0)), w: r.w };
        };
        B.ribbon(fn, 60, r.w, 0.45, r.mat, { path: r.x === 0, supports: true, supportStep: 18 });
      }
      for (let i = 0; i < 9; i++) B.coin(-X, 0.65, 11 + i * (len - 2) / 8);
      if (p.gem !== false) B.gem(-X, 1.0, 10 + len / 2);
      B.coinLine(0, 12, 0, len + 8, 4);
      for (let i = 0; i < 5; i++) B.coin(X, 1.2, 12 + i * len / 5);
      pad(B, len + 16, len + 20, 7);
      B.hint = () => ({ lat: 0 });
      B.exit(0, 0, len + 20);
    },
  },
  {
    id: 'wave_track', name: 'Rolling Hills', category: 'Narrow Track', difficulty: 2,
    desc: 'An undulating track whose crests throw the ball into the air.',
    build(B, p) {
      const len = p.len || 44, A = p.amp || 1.1, lam = p.wave || 11, w = p.w || 4.2;
      pad(B, 0, 3, W);
      const fn = (u) => { const d = 3 + u * len; const env = Math.sin(Math.PI * u); return { x: 0, y: A * Math.sin((d - 3) / lam * Math.PI * 2) * env, d, h: 0, w }; };
      B.ribbon(fn, 110, w, 0.5, B.m.deck, { path: true, supports: true, supportStep: 11 });
      for (let k = 0; k < len / lam; k++) { const u = (k + 0.25) * lam / len; if (u >= 1) break; const c = fn(u); B.coinArc(0, c.d - 1.2, 0, c.d + 1.2, 3, c.y + 0.8, 0.5); }
      pad(B, 3 + len, 6 + len, W);
      if (p.gem) B.gem(0, 2.4, 3 + lam * 1.25);
      B.hint = () => ({ lat: 0 });
      B.exit(0, 0, 6 + len);
    },
  },
  {
    id: 'banked_turn', name: 'Velodrome Turn', category: 'Narrow Track', difficulty: 2,
    desc: 'A steep banked turn without barriers - momentum pushes you outward.',
    build(B, p) {
      const ang = (p.angle ?? 100) * deg, R = p.r || 13, w = p.w || 3.8, sg = Math.sign(ang) || 1, A = Math.abs(ang);
      const bank = (p.bank ?? 20) * deg * sg;
      pad(B, 0, 3, W);
      const fn = (u) => { const h = A * u; const e = Math.min(1, Math.sin(Math.PI * u) * 2.2); return { x: sg * R * (1 - Math.cos(h)), y: 0, d: 3 + R * Math.sin(h), h: sg * h, bank: bank * e, w: lerp(W, w, Math.min(1, Math.sin(Math.PI * u) * 3)) }; };
      B.ribbon(fn, Math.ceil(A * R / 0.9), w, 0.5, B.m.deckAlt, { path: true, supports: true });
      for (let i = 1; i < 9; i++) { const c = fn(i / 9); const off = -sg * 0.9; B.coin(c.x + Math.cos(c.h) * off, c.y + 0.9, c.d - Math.sin(c.h) * off); }
      const e = fn(1);
      const ex = e.x, ed = e.d, eh = e.h;
      // exit pad along new heading
      B.ribbon((u) => ({ x: ex + Math.sin(eh) * 3 * u, y: 0, d: ed + Math.cos(eh) * 3 * u, h: eh }), 3, W, 0.5, B.m.deck, { path: true });
      B.hint = () => ({ lat: -sg * 0.6 });
      B.exit(ex + Math.sin(eh) * 3, 0, ed + Math.cos(eh) * 3, eh);
    },
  },
  {
    id: 'spiral_down', name: 'Spiral Descent', category: 'Narrow Track', difficulty: 3,
    desc: 'A descending helix wrapped in red crash barriers and coil springs.',
    build(B, p) {
      const turns = p.turns || 1.0, R = p.r || 10, drop = p.drop || 9, w = p.w || 3.8, sg = p.dir || 1;
      const A = turns * Math.PI * 2;
      pad(B, 0, 3, W);
      const fn = (u) => { const h = A * u; return { x: sg * R * (1 - Math.cos(h)), y: -drop * u, d: 3 + R * Math.sin(h), h: sg * h, bank: sg * 9 * deg, w }; };
      const steps = Math.ceil(A * R / 0.8);
      B.ribbon(fn, steps, w, 0.5, B.m.deck, { path: true, walls: { h: 0.75, t: 0.35, mat: B.m.rail, side: -sg }, wallSurface: null });
      // central column with spokes
      B.cyl(sg * R, -drop / 2 - 4, 3, 1.6, drop + 10, 'y', B.m.concrete, { seg: 24 });
      for (let i = 0; i < 8 * turns; i++) {
        const u = (i + 0.5) / (8 * turns); const c = fn(u);
        const mx = (c.x + sg * R) / 2, md = (c.d + 3) / 2;
        B.box(mx, c.y - 0.8, md, 0.35, 0.35, R, B.m.darkSteel, { ry: -c.h + Math.PI / 2, collide: false });
        // coil springs on the outer barrier
        const off = -sg * (w / 2 + 0.1);
        const sx = c.x + Math.cos(c.h) * off, sd = c.d - Math.sin(c.h) * off;
        const coil = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.06, 6, 14), B.m.accent2);
        coil.position.set(sx, c.y + 1.05, -sd); coil.rotation.y = c.h; coil.castShadow = true;
        B.group.add(coil);
        const coil2 = coil.clone(); coil2.position.y += 0.22; B.group.add(coil2);
      }
      for (let i = 1; i < 14; i++) B.coin(fn(i / 14).x, fn(i / 14).y + 0.65, fn(i / 14).d);
      const e = fn(1);
      B.ribbon((u) => ({ x: e.x + Math.sin(e.h) * 3 * u, y: e.y, d: e.d + Math.cos(e.h) * 3 * u, h: e.h }), 3, W, 0.5, B.m.deck, { path: true });
      if (p.gem) B.gem(fn(0.5).x, fn(0.5).y + 1, fn(0.5).d);
      B.hint = () => ({ lat: sg * 0.4 });
      B.cam = { dist: 7.2, height: 4.2 };
      B.exit(e.x + Math.sin(e.h) * 3, e.y, e.d + Math.cos(e.h) * 3, e.h);
    },
  },
  {
    id: 'slalom_gates', name: 'Slalom Gates', category: 'Narrow Track', difficulty: 2,
    desc: 'Low walls with offset openings force a weaving line.',
    build(B, p, rng) {
      const n = p.gates || 6, gap = p.gap || 6.5, open = p.open || 1.9;
      pad(B, 0, 6 + n * gap, W, { edges: true });
      const gates = [];
      let side = rng() < 0.5 ? -1 : 1;
      for (let i = 0; i < n; i++) {
        const d = 6 + i * gap, c = side * (1.1 + rng() * 0.5);
        side = -side;
        const l0 = -W / 2, l1 = c - open / 2, r0 = c + open / 2, r1 = W / 2;
        if (l1 - l0 > 0.05) B.box((l0 + l1) / 2, 0.45, d, l1 - l0, 0.9, 0.5, B.m.accent, {});
        if (r1 - r0 > 0.05) B.box((r0 + r1) / 2, 0.45, d, r1 - r0, 0.9, 0.5, B.m.accent, {});
        B.box(c - open / 2 - 0.1, 0.95, d, 0.2, 1.9, 0.6, B.m.hazard, { collide: false });
        B.box(c + open / 2 + 0.1, 0.95, d, 0.2, 1.9, 0.6, B.m.hazard, { collide: false });
        B.coin(c, 0.65, d);
        gates.push({ d, c });
      }
      B.danger = (x, d) => { let m = 9; for (const g of gates) if (Math.abs(d - g.d) < 0.9) m = Math.min(m, open / 2 - Math.abs(x - g.c) - 0.45); return m; };
      B.width = 4.6;
      B.exit(0, 0, 6 + n * gap);
    },
  },
  {
    id: 'checker_holes', name: 'Swiss Cheese', category: 'Narrow Track', difficulty: 3,
    desc: 'A tiled floor riddled with holes - read the safe route ahead.',
    build(B, p, rng) {
      const rows = p.rows || 11, cols = 4, tw = 1.3, tl = 2.3;
      pad(B, 0, 4, W);
      let route = rng() < 0.5 ? 1 : 2;
      const grid = [];
      for (let r = 0; r < rows; r++) {
        const prev = route;
        if (r > 0 && r % 2 === 0) route = clamp(route + (rng() < 0.5 ? -1 : 1), 0, cols - 1);
        const row = [];
        for (let c = 0; c < cols; c++) {
          const keep = c === route || c === prev || (r < 1) || rng() < (p.fill ?? 0.3);
          row.push(keep);
        }
        grid.push(row);
      }
      grid.forEach((row, r) => row.forEach((on, c) => {
        if (!on) return;
        const x = (c - (cols - 1) / 2) * tw, d = 4 + r * tl + tl / 2;
        B.box(x, -0.2, d, tw - 0.08, 0.4, tl - 0.08, (r + c) % 2 ? B.m.deck : B.m.deckAlt);
      }));
      const end = 4 + rows * tl;
      for (const s of [-1, 1]) B.box(s * (cols * tw / 2 + 0.15), -0.25, (4 + end) / 2, 0.3, 0.5, end - 4, B.m.darkSteel, { collide: false });
      for (let d = 6; d < end; d += 10) B.support(0, d, -0.9);
      grid.forEach((row, r) => { if (r % 2) { const c = row.findIndex((v) => v); if (c >= 0) B.coin((c - 1.5) * tw, 0.65, 4 + r * tl + tl / 2); } });
      pad(B, end, end + 4, W);
      B.ground = (x, d) => {
        if (d < 4 || d > end) return Math.abs(x) < 2.4;
        const r = Math.floor((d - 4) / tl); const c = Math.floor(x / tw + cols / 2);
        if (c < 0 || c >= cols) return false;
        const lx = x / tw + cols / 2 - c;
        if (lx < 0.12 || lx > 0.88) { const c2 = lx < 0.5 ? c - 1 : c + 1; if (c2 < 0 || c2 >= cols || !grid[r]?.[c2]) return false; }
        return !!grid[r]?.[c];
      };
      B.width = 5.0;
      B.exit(0, 0, end + 4);
    },
  },
  {
    id: 'camber_run', name: 'Camber Run', category: 'Narrow Track', difficulty: 3,
    desc: 'The deck tilts hard left, then hard right - counter-steer to stay on.',
    build(B, p) {
      const len = p.len || 34, A = (p.tilt || 20) * deg, w = p.w || 3.6;
      pad(B, 0, 3, W);
      const fn = (u) => ({ x: 0, y: 0, d: 3 + len * u, h: 0, bank: A * Math.sin(u * Math.PI * 2 * (p.cycles || 1.5)) * Math.min(1, Math.sin(Math.PI * u) * 4), w: lerp(W, w, Math.min(1, Math.sin(Math.PI * u) * 4)) });
      B.ribbon(fn, 70, w, 0.5, B.m.deckAlt, { path: true, supports: true, supportStep: 10 });
      for (let i = 1; i < 10; i++) { const c = fn(i / 10); B.coin(-Math.sign(c.bank) * 0.9, 0.9 + Math.abs(c.bank) * 0.9, c.d); }
      pad(B, 3 + len, 6 + len, W);
      B.hint = () => ({ lat: 0 });
      B.exit(0, 0, 6 + len);
    },
  },
  {
    id: 's_bend', name: 'Serpent Rail', category: 'Narrow Track', difficulty: 3,
    desc: 'A narrow rail that snakes left and right in continuous curves.',
    build(B, p) {
      const len = p.len || 36, A = p.amp || 3.2, w = p.w || 1.6, waves = p.waves || 1.5;
      pad(B, 0, 3, W);
      const fn = (u) => {
        const d = 3 + len * u; const e = Math.min(1, Math.sin(Math.PI * u) * 3);
        const x = A * Math.sin(u * Math.PI * 2 * waves) * e;
        const dx = A * Math.cos(u * Math.PI * 2 * waves) * Math.PI * 2 * waves / len * e;
        return { x, y: 0, d, h: Math.atan(dx), w: lerp(W, w, Math.min(1, Math.sin(Math.PI * u) * 5)) };
      };
      B.ribbon(fn, 90, w, 0.45, B.m.rail, { path: true, supports: true, supportStep: 9 });
      for (let i = 1; i < 16; i++) { const c = fn(i / 16); B.coin(c.x, 0.65, c.d); }
      const e = fn(1);
      pad(B, 3 + len, 6 + len, W);
      if (p.gem) B.gem(fn(0.5).x, 1, fn(0.5).d);
      B.hint = () => ({ lat: 0 });
      B.exit(e.x, 0, 6 + len);
    },
  },
  {
    id: 'hairpin', name: 'Hairpin', category: 'Narrow Track', difficulty: 3,
    desc: 'A sudden, tight change of direction on a narrow deck.',
    build(B, p) {
      const ang = (p.angle ?? 90) * deg, R = p.r || 5.5, w = p.w || 2.8, sg = Math.sign(ang) || 1, A = Math.abs(ang);
      pad(B, 0, 4, W);
      const fn = (u) => { const h = A * u; return { x: sg * R * (1 - Math.cos(h)), y: (p.dy || 0) * u, d: 4 + R * Math.sin(h), h: sg * h, w }; };
      B.ribbon(fn, Math.ceil(A * R / 0.5), w, 0.5, B.m.deckAlt, { path: true, supports: true, supportStep: 6 });
      const e = fn(1);
      B.ribbon((u) => ({ x: e.x + Math.sin(e.h) * 4 * u, y: e.y, d: e.d + Math.cos(e.h) * 4 * u, h: e.h }), 4, W, 0.5, B.m.deck, { path: true });
      B.speedMul = 0.78;
      for (let i = 1; i < 6; i++) { const c = fn(i / 6); B.coin(c.x, c.y + 0.65, c.d); }
      B.hint = () => ({ lat: -sg * 0.5 });
      B.exit(e.x + Math.sin(e.h) * 4, e.y, e.d + Math.cos(e.h) * 4, e.h);
    },
  },
];
