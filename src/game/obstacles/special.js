// Special challenges: hoops, tunnels, rope bridges, knock-down structures, risk routes,
// lasers, shifting mazes and bonus runs.
import * as THREE from 'three';
import { W, TAU, arrows, pad, smooth, clamp, guardRail, lerp, arch } from './kit.js';

const deg = Math.PI / 180;
const cyc = (t, period, ph) => (((t / period + ph) % 1) + 1) % 1;

export const SPECIAL = [
  {
    id: 'hoop_run', name: 'Hoop Run', category: 'Special', difficulty: 2,
    desc: 'Giant standing hoops - thread the ball through each one for bonus coins.',
    build(B, p) {
      const n = p.count || 5, spacing = 8;
      const total = 6 + n * spacing;
      pad(B, 0, total, W, { edges: true });
      for (let i = 0; i < n; i++) {
        const d = 7 + i * spacing, x = (i % 2 ? 1 : -1) * (p.offset ?? 1.05) * (i === 0 ? 0.5 : 1);
        const Rh = 1.35, tube = 0.16;
        const ring = new THREE.Mesh(new THREE.TorusGeometry(Rh, tube, 12, 40), i % 2 ? B.m.accent : B.m.accent2);
        ring.position.set(x, Rh + 0.05, -d); ring.castShadow = true; B.group.add(ring);
        const glow = new THREE.Mesh(new THREE.TorusGeometry(Rh - 0.18, 0.04, 6, 40), B.m.glowGold); glow.position.copy(ring.position); B.group.add(glow);
        // rim colliders (capsules around the ring)
        const segs = 14;
        for (let k = 0; k < segs; k++) {
          const a0 = k / segs * TAU, a1 = (k + 1) / segs * TAU;
          const p0 = [x + Math.cos(a0) * Rh, Rh + 0.05 + Math.sin(a0) * Rh, d], p1 = [x + Math.cos(a1) * Rh, Rh + 0.05 + Math.sin(a1) * Rh, d];
          if (Math.min(p0[1], p1[1]) < 0.2) continue;
          B.pipe(p0, p1, tube, B.m.accent, { collide: true, caps: false }).visible = false;
        }
        B.box(x, 0.06, d, 0.5, 0.12, 0.4, B.m.darkSteel, { collide: false });
        B.trigger(x, Rh, d, Rh * 1.6, Rh * 1.6, 0.8, () => B.course.game.bonus && B.course.game.bonus('HOOP', 3), { repeat: false });
        B.coin(x, 0.65, d);
      }
      B.hint = (c) => { const i = Math.floor((c.local.d - 7 + spacing * 0.55) / spacing); if (i < 0 || i >= n) return { lat: 0 }; return { lat: (i % 2 ? 1 : -1) * (p.offset ?? 1.05) * (i === 0 ? 0.5 : 1) }; };
      B.exit(0, 0, total);
    },
  },
  {
    id: 'neon_tunnel', name: 'Neon Tunnel', category: 'Special', difficulty: 3,
    desc: 'A tight enclosed tube that snakes left and right under strip lighting.',
    build(B, p) {
      const len = p.len || 40, w = 2.6, A = p.amp || 2.6, hgt = 2.6;
      pad(B, 0, 3, W);
      const fn = (u) => { const e = Math.min(1, Math.sin(Math.PI * u) * 2.5); const x = A * Math.sin(u * TAU) * e; const dx = A * Math.cos(u * TAU) * TAU / len * e; return { x, y: 0, d: 3 + len * u, h: Math.atan(dx), w }; };
      B.ribbon(fn, 80, w, 0.4, B.m.plate, { path: true, supports: true, supportStep: 10, walls: { h: hgt, t: 0.3, mat: B.m.darkSteel } });
      // roof and light strips
      B.ribbon((u) => { const c = fn(u); return { ...c, y: hgt + 0.25, w: w + 0.6 }; }, 80, w + 0.6, 0.25, B.m.darkSteel, { collide: false });
      B.ribbon((u) => { const c = fn(u); return { ...c, y: hgt + 0.01, w: 0.25 }; }, 80, 0.25, 0.02, B.m.glow, { collide: false });
      for (const s of [-1, 1]) B.ribbon((u) => { const c = fn(u); const off = s * (w / 2 - 0.02); return { ...c, x: c.x + Math.cos(c.h) * off, d: c.d - Math.sin(c.h) * off, y: 0.25, w: 0.06 }; }, 80, 0.06, 0.08, s > 0 ? B.m.glowRed : B.m.glow, { collide: false });
      for (let i = 1; i < 14; i++) { const c = fn(i / 14); B.coin(c.x, 0.65, c.d); }
      pad(B, 3 + len, 6 + len, W);
      if (p.gem) B.gem(fn(0.5).x, 1.0, fn(0.5).d);
      B.cam = { dist: 4.4, height: 1.55 };
      B.hint = () => ({ lat: 0 });
      B.exit(0, 0, 6 + len);
    },
  },
  {
    id: 'rope_bridge', name: 'Rope Bridge', category: 'Special', difficulty: 3,
    desc: 'A sagging plank bridge that sways in the wind.',
    build(B, p) {
      const len = p.len || 30, n = Math.round(len / 1.0), sag = p.sag || 1.4, w = 2.4, A = p.sway || 0.55;
      pad(B, 0, 4, W);
      const planks = [];
      for (let i = 0; i < n; i++) {
        const u = (i + 0.5) / n, d = 4 + u * len;
        const y = -sag * Math.sin(Math.PI * u);
        const m = B.mover(0, y, d);
        m.box(0, -0.12, 0, w, 0.24, len / n - 0.08, i % 3 ? B.m.deck : B.m.deckAlt, { friction: 1.0 });
        planks.push({ m, u, y });
      }
      const posts = [4, 4 + len];
      for (const d of posts) for (const s of [-1, 1]) B.box(s * (w / 2 + 0.25), 0.8, d, 0.3, 2.2, 0.3, B.m.deckSide, {});
      const ropeMat = B.m.rope;
      const ropes = [];
      for (const s of [-1, 1]) {
        const pts = Array.from({ length: n + 1 }, (_, i) => new THREE.Vector3(s * (w / 2 + 0.1), 0.9, -(4 + i * len / n)));
        const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * 2, 0.05, 5, false);
        const rope = new THREE.Mesh(geo, ropeMat); B.group.add(rope); ropes.push({ rope, s, pts });
      }
      const sway = (u, t) => A * Math.sin(Math.PI * u) * Math.sin(t * (p.speed || 1.6) - u * 2.2);
      B.onUpdate((t) => {
        for (const pl of planks) { const sx = sway(pl.u, t); pl.m.obj.position.x = sx; pl.m.obj.rotation.z = -sx * 0.32; pl.m.obj.position.y = pl.y + Math.abs(sx) * 0.1; }
      });
      let ropeT = 0;
      B.onUpdate((t, dt) => {
        ropeT += dt; if (ropeT < 0.05) return; ropeT = 0;
        for (const r of ropes) {
          const pts = r.pts.map((q, i) => { const u = i / n; return new THREE.Vector3(r.s * (w / 2 + 0.1) + sway(u, t), 0.9 - sag * Math.sin(Math.PI * u), q.z); });
          r.rope.geometry.dispose(); r.rope.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * 2, 0.05, 5, false);
        }
      });
      B.pathFn((u) => ({ x: 0, y: -sag * Math.sin(Math.PI * u), d: 4 + len * u }), 30);
      pad(B, 4 + len, 8 + len, W);
      for (let i = 1; i < 8; i++) B.coin(0, 0.65 - sag * Math.sin(Math.PI * i / 8), 4 + len * i / 8);
      if (p.gem) B.gem(0, 1.0 - sag, 4 + len / 2);
      B.hint = (c) => ({ lat: sway(clamp((c.local.d - 4) / len, 0, 1), c.t + 0.15) });
      B.speedMul = 0.85;
      B.exit(0, 0, 8 + len);
    },
  },
  {
    id: 'brick_wall', name: 'Brick Wall Smash', category: 'Special', difficulty: 1,
    desc: 'A wall of physics bricks blocks the road - smash straight through it.',
    build(B, p) {
      const cols = p.cols || 8, rows = p.rows || 4, bw = W / cols, bh = 0.62, bl = 0.6;
      pad(B, 0, 22, W, { edges: true });
      const list = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols - (r % 2); c++) {
        const x = -W / 2 + bw / 2 + c * bw + (r % 2 ? bw / 2 : 0);
        list.push({ x, y: bh / 2 + r * bh + 0.005, d: 11, w: bw - 0.02, h: bh - 0.01, l: bl, ci: (r + c) % 5 });
      }
      const set = B.blockSet(list, B.m.block, { name: 'WALL', bonus: p.bonus || 15 });
      set.need = 0.45;
      arrows(B, 0, 6, 2.4, 3, B.m.arrowGreen);
      B.coinLine(0, 14, 0, 20, 4);
      B.hint = () => ({ lat: 0 });
      B.exit(0, 0, 22);
    },
  },
  {
    id: 'domino_run', name: 'Domino Rally', category: 'Special', difficulty: 1,
    desc: 'Tip the first domino and watch a chain reaction sweep across the track.',
    build(B, p) {
      const len = 30;
      pad(B, 0, len + 6, W + 1, { edges: true });
      const list = [];
      const n = p.count || 26;
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1);
        const x = Math.sin(u * Math.PI * 2.2) * 1.8, d = 6 + u * len;
        const dx = Math.cos(u * Math.PI * 2.2) * 1.8 * Math.PI * 2.2 / len;
        list.push({ x, y: 0.71, d, w: 0.8, h: 1.4, l: 0.22, ry: Math.atan(dx), ci: i % 5, density: 0.5 });
      }
      B.blockSet(list, B.m.block, { name: 'DOMINO RALLY', bonus: p.bonus || 20 });
      B.sets[B.sets.length - 1].need = 0.85;
      B.coinLine(1.8, 8, -1.8, len, 6);
      B.hint = (c) => ({ lat: Math.sin(clamp((c.local.d - 6) / len, 0, 1) * Math.PI * 2.2) * 1.8 * 0.7 });
      B.exit(0, 0, len + 6);
    },
  },
  {
    id: 'bowling', name: 'Bowling Lane', category: 'Special', difficulty: 1,
    desc: 'Roll down a polished lane with gutters and go for the strike.',
    build(B, p) {
      const len = 26, lw = 2.6;
      pad(B, 0, 3, W);
      B.deck(0, 3, 3 + len + 6, lw, { mat: B.m.deckAlt, edges: false });
      for (const s of [-1, 1]) {
        B.box(s * (lw / 2 + 0.35), -0.3, 3 + (len + 6) / 2, 0.7, 0.2, len + 6, B.m.darkSteel, {});
        B.box(s * (lw / 2 + 0.8), 0.2, 3 + (len + 6) / 2, 0.2, 0.8, len + 6, B.m.white, {});
      }
      for (let k = 0; k < 7; k++) B.box((k - 3) * 0.3, 0.008, 9, 0.12, 0.012, 0.3, B.m.accent, { collide: false, cast: false });
      const pd = 3 + len - 1.5;
      const pins = [];
      let ci = 0;
      for (let r = 0; r < 4; r++) for (let k = 0; k <= r; k++) {
        pins.push({ x: (k - r / 2) * 0.62, y: 0.56, d: pd + r * 0.54, w: 0.36, h: 1.1, l: 0.36, color: new THREE.Color(ci++ % 2 ? '#ffffff' : '#f2f0ea'), density: 0.3 });
      }
      const pinMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 });
      B.disposables.push(pinMat);
      const set = B.blockSet(pins, pinMat, { name: 'STRIKE', bonus: p.bonus || 30, shape: 'pin' });
      // red neck stripes
      set.blocks.forEach((b, i) => { b.color = new THREE.Color(i % 2 ? '#ffffff' : '#fff8ef'); set.mesh.setColorAt(i, b.color); });
      set.need = 1.0;
      for (const s of [-1, 1]) B.box(s * 1.2, 1.2, pd + 0.8, 0.2, 2.4, 0.2, B.m.dark, { collide: false });
      B.box(0, 2.3, pd + 0.8, 2.6, 0.5, 0.3, B.m.glow, { collide: false });
      pad(B, 3 + len + 6, 3 + len + 12, W);
      B.coinLine(0, 6, 0, len - 4, 7);
      B.hint = () => ({ lat: 0 });
      B.exit(0, 0, 3 + len + 12);
    },
  },
  {
    id: 'tower_topple', name: 'Tower Toppler', category: 'Special', difficulty: 2,
    desc: 'Stacked block towers stand in your way - knock them all down for a bonus.',
    build(B, p, rng) {
      const len = 30;
      pad(B, 0, len + 6, W + 1.2, { edges: true });
      const list = [];
      const towers = p.towers || 5;
      for (let t = 0; t < towers; t++) {
        const x = (t % 2 ? 1 : -1) * (0.6 + rng() * 1.2), d = 8 + t * (len - 6) / towers;
        const hgt = 4 + Math.floor(rng() * 3);
        for (let k = 0; k < hgt; k++) list.push({ x: x + (rng() - 0.5) * 0.05, y: 0.36 + k * 0.72, d, w: 0.7, h: 0.7, l: 0.7, ci: t, ry: (rng() - 0.5) * 0.3 });
      }
      const set = B.blockSet(list, B.m.block, { name: 'TOWERS', bonus: p.bonus || 25 });
      set.need = 0.55;
      B.coinLine(0, 7, 0, len + 3, 8);
      B.hint = (c) => ({ lat: Math.sin(c.local.d * 0.4) * 1.2 });
      B.exit(0, 0, len + 6);
    },
  },
  {
    id: 'cliff_ledge', name: 'Cliff Ledge', category: 'Special', difficulty: 3,
    desc: 'A safe inner lane, or a razor-thin outer ledge loaded with coins and a gem.',
    build(B, p) {
      const len = p.len || 34, side = p.side || 1;
      pad(B, 0, 3, W + 1.4);
      const lx = side * 2.9;
      B.deck(-side * 0.5, 3, 3 + len, 3.2, { edges: true });
      B.deck(lx, 3, 3 + len, 0.8, { mat: B.m.steel, th: 0.3, trim: false, support: false });
      for (let d = 5; d < 3 + len; d += 3) B.box(lx, -0.6, d, 0.12, 1.0, 0.12, B.m.darkSteel, { collide: false });
      for (let d = 3; d < 3 + len; d += 6.5) B.box(side * 1.55, 0.35, d + 2, 0.25, 0.7, 4, B.m.rail, {});
      B.coinLine(lx, 5, lx, 1 + len, Math.floor(len / 1.6));
      B.coinLine(-side * 0.5, 6, -side * 0.5, len, 4);
      B.gem(lx, 1.0, 3 + len * 0.75);
      pad(B, 3 + len, 7 + len, W + 1.4);
      B.hint = () => ({ lat: -side * 0.5 });
      B.exit(0, 0, 7 + len);
    },
  },
  {
    id: 'laser_grid', name: 'Laser Grid', category: 'Special', difficulty: 4,
    desc: 'Laser beams flick on and off across the lanes - touch a live beam and you are fried.',
    build(B, p) {
      const rows = p.rows || 5, spacing = 6, lanes = 3, lw = W / lanes, period = p.period || 2.2;
      const total = 6 + rows * spacing;
      pad(B, 0, total, W, { edges: true, edgeMat: B.m.glowRed });
      const beams = [];
      const beamMat = new THREE.MeshBasicMaterial({ color: 0xff2030, toneMapped: false, transparent: true, opacity: 0.9 });
      for (let r = 0; r < rows; r++) {
        const d = 6 + r * spacing;
        for (const s of [-1, 1]) { B.box(s * (W / 2 + 0.25), 0.8, d, 0.35, 1.6, 0.35, B.m.darkSteel, {}); B.box(s * (W / 2 + 0.25), 1.65, d, 0.4, 0.1, 0.4, B.m.glowRed, { collide: false }); }
        for (let l = 0; l < lanes; l++) {
          const x = (l - 1) * lw;
          const ph = ((r * 0.41 + l * 0.33 + (p.phase || 0)) % 1);
          const on = (t) => cyc(t, period, ph) < 0.5;
          const ms = [];
          for (const y of [0.3, 0.75]) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, lw - 0.05, 6), beamMat); m.rotation.z = Math.PI / 2; m.position.set(x, y, -d); B.group.add(m); ms.push(m); }
          const glow = new THREE.Mesh(new THREE.PlaneGeometry(lw - 0.05, 0.9), new THREE.MeshBasicMaterial({ color: 0xff3040, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
          glow.position.set(x, 0.55, -d); B.group.add(glow); ms.push(glow);
          beams.push({ x, d, on, ms });
        }
        for (let l = 0; l < lanes - 1; l++) B.box((l - 0.5) * lw, 0.55, d, 0.12, 1.1, 0.12, B.m.darkSteel, { collide: false });
      }
      B.onUpdate((t) => {
        const b = B.ballLocal();
        for (const be of beams) {
          const on = be.on(t);
          for (const m of be.ms) m.visible = on;
          if (on && b && Math.abs(b.d - be.d) < 0.55 && Math.abs(b.x - be.x) < lw / 2 && b.y < 1.3 && b.y > -0.3) B.kill('zapped');
        }
      });
      B.coinLine(0, 3, 0, total - 2, rows * 2);
      B.danger = (x, d, t) => { let m = 9; for (const be of beams) if (Math.abs(d - be.d) < 0.75 && Math.abs(x - be.x) < lw / 2 + 0.35 && be.on(t)) m = Math.min(m, -1); return m; };
      B.width = 4.6;
      B.exit(0, 0, total);
    },
  },
  {
    id: 'shifting_maze', name: 'Shifting Maze', category: 'Special', difficulty: 4,
    desc: 'Pop-up pillars rise and sink in changing patterns, rewriting the maze as you roll.',
    build(B, p, rng) {
      const rows = p.rows || 7, cols = 5, cw = 1.25, rl = 3.2, period = p.period || 3.2;
      const w = cols * cw;
      pad(B, 0, 4, W);
      B.ribbon((u) => ({ x: 0, y: 0, d: 4 + 2 * u, w: lerp(W, w + 0.4, u) }), 4, W, 0.5, B.m.deck, {});
      B.deck(0, 6, 6 + rows * rl, w + 0.4, { mat: B.m.plate });
      // two maze patterns, each with a guaranteed open lane per row that wanders
      const patterns = [0, 1].map(() => {
        let lane = Math.floor(rng() * cols);
        return Array.from({ length: rows }, () => { lane = clamp(lane + Math.floor(rng() * 3) - 1, 0, cols - 1); const row = Array.from({ length: cols }, (_, c) => c !== lane && rng() < 0.62); return row; });
      });
      const pillars = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const x = (c - (cols - 1) / 2) * cw, dc = 6 + r * rl + rl / 2;
        if (!patterns[0][r][c] && !patterns[1][r][c]) continue;
        const m = B.mover(x, 0, dc);
        m.box(0, -0.6, 0, cw - 0.12, 1.2, 1.0, (r + c) % 2 ? B.m.accent : B.m.accent2);
        m.box(0, 0.005, 0, cw - 0.2, 0.01, 0.9, B.m.hazard, { collide: false });
        const st = (t) => { const u = cyc(t, period, 0); const k = u < 0.45 ? 0 : u < 0.5 ? smooth((u - 0.45) / 0.05) : u < 0.95 ? 1 : 1 - smooth((u - 0.95) / 0.05); const a = patterns[0][r][c] ? 1 : 0, b = patterns[1][r][c] ? 1 : 0; return a + (b - a) * k; };
        B.onUpdate((t) => { m.obj.position.y = st(t) * 1.25 - 0.02; });
        pillars.push({ x, dc, st });
      }
      const end = 6 + rows * rl;
      B.ribbon((u) => ({ x: 0, y: 0, d: end + 2 * u, w: lerp(w + 0.4, W, u) }), 4, W, 0.5, B.m.deck, {});
      pad(B, end + 2, end + 5, W);
      for (let r = 0; r < rows; r += 2) B.coin(0, 0.65, 6 + r * rl + rl / 2);
      B.danger = (x, d, t) => { let m = 9; for (const q of pillars) { if (Math.abs(d - q.dc) > 1.05 || q.st(t) < 0.25) continue; m = Math.min(m, Math.abs(x - q.x) - (cw / 2 + 0.45)); } return m; };
      B.width = w;
      B.speedMul = 0.85;
      B.exit(0, 0, end + 5);
    },
  },
  {
    id: 'gold_rush', name: 'Gold Rush', category: 'Special', difficulty: 1,
    desc: 'A gleaming bonus stretch packed with coin patterns.',
    build(B, p) {
      const len = p.len || 36;
      pad(B, 0, len, W + 1, { edges: true, edgeMat: B.m.glowGold });
      arch(B, 2, W + 1, 'BONUS', { text: { bg: '#3a2600', accent: '#ffcf33', fg: '#ffe7a0' }, lampMat: B.m.glowGold });
      for (let i = 0; i < 4; i++) {
        const d0 = 6 + i * (len - 8) / 4;
        if (i % 2) for (let k = 0; k < 6; k++) B.coin(Math.sin(k / 5 * Math.PI * 2) * 1.6, 0.65, d0 + k * 1.2);
        else for (let k = 0; k < 3; k++) for (let j = -1; j <= 1; j++) B.coin(j * 1.2, 0.65 + (k === 1 ? 0.5 : 0), d0 + k * 2);
      }
      for (let d = 6; d < len; d += 6) for (const s of [-1, 1]) B.cyl(s * (W / 2 + 0.6), 0.6, d, 0.12, 1.2, 'y', B.m.glowGold, { collide: false });
      if (p.gem !== false) B.gem(0, 1.4, len - 3);
      B.hint = (c) => ({ lat: Math.sin((c.local.d - 6) / 6 * Math.PI) * 1.2 });
      B.exit(0, 0, len);
    },
  },
];
void arrows; void guardRail; void deg;
