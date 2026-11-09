// Creative mechanical challenges: belts, wobbling plates, collapsing floors, pistons, bridges,
// gates, barrels, rotating tunnels, paddle wheels and physical seesaws.
import * as THREE from 'three';
import { R } from '../../core/physics.js';
import { W, TAU, arrows, pad, smooth, clamp, guardRail, segDist } from './kit.js';
import { boxUV } from '../../gfx/materials.js';

const deg = Math.PI / 180;
const cyc = (t, period, ph) => (((t / period + ph) % 1) + 1) % 1;

export const MECHANICAL = [
  {
    id: 'conveyor_run', name: 'Conveyor Belts', category: 'Mechanical', difficulty: 2,
    desc: 'Belts drag you backward, left and right - fight the flow.',
    build(B, p) {
      const seq = p.seq || ['back', 'left', 'right', 'back', 'fwd'];
      const L = 7, w = 4.4, speed = p.speed || 3.6;
      pad(B, 0, 3, W);
      let d = 3;
      const belts = [];
      for (const kind of seq) {
        const dir = kind === 'back' ? [0, -1] : kind === 'fwd' ? [0, 1] : kind === 'left' ? [-1, 0] : [1, 0];
        const sp = kind === 'fwd' ? speed * 1.4 : speed;
        const world = B.dirW(dir[0], dir[1]).multiplyScalar(sp);
        const map = B.m.belt.map.clone(); map.needsUpdate = true;
        if (kind === 'left' || kind === 'right') { map.center.set(0.5, 0.5); map.rotation = Math.PI / 2; }
        const mat = B.m.belt.clone(); mat.map = map; mat.userData.uvMeters = 2;
        B.box(0, -0.2, d + L / 2, w, 0.4, L - 0.1, mat, { surface: { type: 'conveyor', dir: world }, friction: 0.9 });
        for (const s of [-1, 1]) B.cyl(s * 0, -0.2, d + (s > 0 ? L - 0.15 : 0.15), 0.22, w + 0.2, 'x', B.m.steel, { collide: false });
        B.box(-w / 2 - 0.15, -0.1, d + L / 2, 0.3, 0.6, L, B.m.machine, { collide: false });
        B.box(w / 2 + 0.15, -0.1, d + L / 2, 0.3, 0.6, L, B.m.machine, { collide: false });
        const am = kind === 'fwd' ? B.m.arrowGreen : B.m.arrowGold;
        const ar = arrows(B, 0, d + L / 2, 1.6, 1.6, am, 0.03);
        if (kind === 'back') ar.rotation.z = Math.PI; else if (kind === 'left') ar.rotation.z = Math.PI / 2; else if (kind === 'right') ar.rotation.z = -Math.PI / 2;
        belts.push({ map, kind, sp });
        B.support(0, d + L / 2, -0.8);
        B.coin(kind === 'left' ? 1.2 : kind === 'right' ? -1.2 : 0, 0.65, d + L / 2);
        d += L;
      }
      B.onUpdate((t) => { for (const b of belts) { const v = (t * b.sp / 2) % 1; if (b.kind === 'back') b.map.offset.y = -v; else if (b.kind === 'fwd') b.map.offset.y = v; else b.map.offset.y = b.kind === 'left' ? v : -v; } });
      pad(B, d, d + 4, W);
      B.hint = (c) => { const i = Math.floor((c.local.d - 3) / L); const k = seq[i]; return { lat: k === 'left' ? 0.8 : k === 'right' ? -0.8 : 0, accel: k === 'back' }; };
      B.exit(0, 0, d + 4);
    },
  },
  {
    id: 'wobble_plates', name: 'Wobble Plates', category: 'Mechanical', difficulty: 3,
    desc: 'Floating plates that tilt and wobble in every direction.',
    build(B, p) {
      const n = p.count || 6, size = 3.3, A = (p.tilt || 13) * deg;
      pad(B, 0, 3, W);
      for (let i = 0; i < n; i++) {
        const dc = 3 + size / 2 + i * (size + 0.3);
        const x = (i % 2 ? 1 : -1) * (p.offset ?? 0.4);
        const m = B.mover(x, 0, dc);
        m.box(0, -0.2, 0, size, 0.4, size, i % 2 ? B.m.deckAlt : B.m.deck);
        m.cyl(0, -0.65, 0, 0.5, 0.5, 'y', B.m.machine, { collide: false });
        B.cyl(x, -2.2, dc, 0.35, 3, 'y', B.m.darkSteel, { collide: false });
        B.support(x, dc, -3.6);
        const w1 = (p.speed || 1.3) * (1 + i * 0.07), ph = i * 1.9;
        B.onUpdate((t) => { m.obj.rotation.x = A * Math.sin(w1 * t + ph); m.obj.rotation.z = A * Math.cos(w1 * 0.77 * t + ph * 1.3); });
        B.coin(x, 0.7, dc);
      }
      const end = 3 + n * (size + 0.3);
      pad(B, end, end + 4, W);
      B.hint = (c) => { const i = clamp(Math.floor((c.local.d - 3) / (size + 0.3)), 0, n - 1); return { lat: (i % 2 ? 1 : -1) * (p.offset ?? 0.4) }; };
      B.speedMul = 0.85;
      B.exit(0, 0, end + 4);
    },
  },
  {
    id: 'crumble_floor', name: 'Crumbling Floor', category: 'Mechanical', difficulty: 3,
    desc: 'Tiles collapse moments after you touch them - cracked red tiles drop instantly.',
    build(B, p, rng) {
      const rows = p.rows || 9, cols = 3, tw = 1.6, tl = 2.2;
      pad(B, 0, 4, W);
      const tiles = [];
      const crackedMat = B.m.accent;
      let safe = 1;
      for (let r = 0; r < rows; r++) {
        if (r > 0 && r % 2 === 0) safe = clamp(safe + (rng() < 0.5 ? -1 : 1), 0, 2);
        for (let c = 0; c < cols; c++) {
          const x = (c - 1) * tw, dc = 4 + r * tl + tl / 2;
          const cracked = c !== safe && rng() < (p.cracked ?? 0.38) && r > 0;
          const m = B.mover(x, 0, dc);
          m.box(0, -0.2, 0, tw - 0.08, 0.4, tl - 0.08, cracked ? crackedMat : (r + c) % 2 ? B.m.deck : B.m.deckAlt);
          if (cracked) m.box(0, 0.006, 0, tw * 0.7, 0.01, 0.08, B.m.dark, { collide: false, rz: 0.4 });
          const tile = { m, x, dc, cracked, touched: -1, fallen: false, y: 0, vy: 0, rot: 0 };
          m.onTouch = () => { if (tile.touched < 0) tile.touched = B.course.game.time; };
          tiles.push(tile);
        }
      }
      for (const s of [-1, 1]) B.box(s * 2.55, -0.3, 4 + rows * tl / 2, 0.3, 0.6, rows * tl, B.m.darkSteel, { collide: false });
      for (let d = 6; d < 4 + rows * tl; d += 9) B.support(0, d, -1);
      B.onUpdate((t, dt) => {
        for (const tl0 of tiles) {
          if (tl0.touched < 0 || tl0.fallen) continue;
          const delay = tl0.cracked ? 0.06 : 0.42;
          const age = t - tl0.touched;
          if (age > delay) {
            tl0.vy -= 24 * dt; tl0.y += tl0.vy * dt; tl0.rot += dt * 1.5;
            tl0.m.obj.position.y = tl0.y; tl0.m.obj.rotation.x = tl0.rot * 0.4; tl0.m.obj.rotation.z = tl0.rot * 0.25;
            if (tl0.y < -25) { tl0.fallen = true; tl0.m.obj.visible = false; tl0.m.setCollidable(false); }
          } else if (age > 0) {
            tl0.m.obj.position.y = Math.sin(age * 90) * 0.03;
          }
        }
      });
      B.onReset(() => { for (const tl0 of tiles) { tl0.touched = -1; tl0.fallen = false; tl0.y = 0; tl0.vy = 0; tl0.rot = 0; tl0.m.obj.position.y = 0; tl0.m.obj.rotation.set(0, 0, 0); tl0.m.obj.visible = true; tl0.m.setCollidable(true); } });
      const end = 4 + rows * tl;
      tiles.forEach((tt, i) => { if (!tt.cracked && i % 4 === 1) B.coin(tt.x, 0.65, tt.dc); });
      pad(B, end, end + 4, W);
      B.ground = (x, d) => {
        if (d < 4 || d > end) return Math.abs(x) < 2.4;
        const r = Math.floor((d - 4) / tl), c = Math.round(x / tw + 1);
        if (c < 0 || c > 2) return false;
        const tt = tiles[r * cols + c];
        if (Math.abs(x - tt.x) > tw / 2 - 0.25) { const c2 = x > tt.x ? c + 1 : c - 1; if (c2 < 0 || c2 > 2 || tiles[r * cols + c2].cracked || tiles[r * cols + c2].fallen) return false; }
        return !tt.cracked && !tt.fallen;
      };
      B.width = 4.6;
      B.exit(0, 0, end + 4);
    },
  },
  {
    id: 'piston_field', name: 'Piston Field', category: 'Mechanical', difficulty: 3,
    desc: 'A floor of hydraulic columns pumping up and down in a rolling wave.',
    build(B, p) {
      const rows = p.rows || 9, cols = 3, cw = 1.62, cl = 2.0, A = p.amp || 0.55;
      pad(B, 0, 3, W);
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const x = (c - 1) * cw, dc = 3 + r * cl + cl / 2;
        const m = B.mover(x, 0, dc);
        m.box(0, -1.6, 0, cw - 0.06, 3.2, cl - 0.06, (r + c) % 2 ? B.m.plate : B.m.machine);
        m.box(0, 0.005, 0, cw - 0.3, 0.01, 0.12, B.m.hazard, { collide: false });
        const w = p.speed || 2.2, ph = r * 0.75 + c * 1.9;
        B.onUpdate((t) => { m.obj.position.y = A * (0.5 + 0.5 * Math.sin(w * t - ph)) - A * 0.5; });
      }
      const end = 3 + rows * cl;
      B.box(0, -2.4, (3 + end) / 2, cols * cw + 0.4, 1.2, end - 3, B.m.darkSteel, { collide: false });
      for (let d = 5; d < end; d += 8) B.support(0, d, -3.0);
      B.coinLine(0, 4, 0, end - 1, 6, 1.0);
      pad(B, end, end + 4, W);
      B.hint = () => ({ lat: 0 });
      B.exit(0, 0, end + 4);
    },
  },
  {
    id: 'swing_bridges', name: 'Swing Bridges', category: 'Mechanical', difficulty: 4,
    desc: 'Two parallel bridges pivot open and shut in turn - pick the one that stays closed.',
    build(B, p) {
      const L = 9.5, bw = 2.0, gapX = 1.4, period = p.period || 4.4;
      pad(B, 0, 4, W + 1);
      const lanes = [-(bw / 2 + gapX / 2), bw / 2 + gapX / 2];
      const br = [];
      lanes.forEach((x, i) => {
        const dc = 4 + L / 2;
        B.cyl(x, -1.4, dc, 0.9, 2.2, 'y', B.m.concrete, { collide: false });
        B.support(x, dc, -2.5);
        const m = B.mover(x, 0, dc);
        m.box(0, -0.2, 0, bw, 0.4, L - 0.3, B.m.deck);
        m.box(0, -0.55, 0, bw * 0.6, 0.3, L - 1, B.m.accent2, { collide: false });
        for (const s of [-1, 1]) m.box(s * (bw / 2 - 0.05), 0.02, 0, 0.1, 0.05, L - 0.3, B.m.hazard, { collide: false, cast: false });
        const ph = i * 0.5;
        const ang = (t) => {
          const u = cyc(t, period, ph);
          if (u < 0.68) return 0;
          if (u < 0.82) return smooth((u - 0.68) / 0.14) * 1.35;
          if (u < 0.86) return 1.35;
          return 1.35 * (1 - smooth((u - 0.86) / 0.14));
        };
        B.onUpdate((t) => { m.obj.rotation.y = ang(t) * (i ? 1 : -1); });
        br.push({ x, ang });
        B.coinLine(x, 5, x, 4 + L - 1, 3);
      });
      pad(B, 4 + L, 8 + L, W + 1);
      B.ground = (x, d, t) => {
        if (d < 4.2 || d > 4 + L - 0.2) return Math.abs(x) < 2.8;
        for (const b of br) if (Math.abs(x - b.x) < bw / 2 - 0.25 && b.ang(t) < 0.06) return true;
        return false;
      };
      B.width = 5.4;
      B.exit(0, 0, 8 + L);
    },
  },
  {
    id: 'boom_gates', name: 'Boom Barriers', category: 'Mechanical', difficulty: 2,
    desc: 'Striped barrier arms drop across the lanes - slip under the raised ones.',
    build(B, p) {
      const rows = p.rows || 4, spacing = 8, period = p.period || 3.0;
      const total = 6 + rows * spacing;
      pad(B, 0, total, W, { edges: true });
      const gates = [];
      for (let r = 0; r < rows; r++) {
        const dc = 6 + r * spacing;
        for (const side of [-1, 1]) {
          const px = side * (W / 2 + 0.4);
          B.box(px, 0.6, dc, 0.6, 1.2, 0.6, B.m.machine, {});
          const m = B.mover(px, 1.0, dc);
          m.box(-side * 1.35, 0, 0, 2.7, 0.22, 0.22, B.m.white);
          for (let k = 0; k < 3; k++) m.box(-side * (0.5 + k * 0.85), 0, 0, 0.32, 0.23, 0.23, B.m.glowRed, { collide: false });
          const ph = r * 0.37 + (side > 0 ? 0.5 : 0);
          const up = (t) => { const u = cyc(t, period, ph); if (u < 0.4) return 1; if (u < 0.5) return 1 - smooth((u - 0.4) / 0.1); if (u < 0.9) return 0; return smooth((u - 0.9) / 0.1); };
          B.onUpdate((t) => { const k = up(t); m.obj.rotation.z = side * -k * 1.45 + side * -(1 - k) * -0.04; m.obj.position.y = 0.55 + 0.0; });
          gates.push({ dc, side, up });
        }
        B.coin(0, 0.65, dc + 3);
      }
      B.danger = (x, d, t) => {
        let m = 9;
        for (const g of gates) { if (Math.abs(d - g.dc) > 0.8) continue; if (g.up(t) < 0.75 && g.side * x > -0.15) m = Math.min(m, -0.5); }
        return m;
      };
      B.width = 4.4;
      B.exit(0, 0, total);
    },
  },
  {
    id: 'flip_flop', name: 'Flip-Flop Platforms', category: 'Mechanical', difficulty: 3,
    desc: 'Platform segments retract into the side housings in alternating rhythm.',
    build(B, p) {
      const n = p.count || 5, L = 4.2, pw = 2.2, period = p.period || 2.8;
      pad(B, 0, 4, W);
      const segs = [];
      for (let i = 0; i < n; i++) {
        const dc = 4 + L / 2 + i * L;
        for (const side of [-1, 1]) {
          const home = side * (pw / 2 + 0.03);
          B.box(side * (pw + 1.3), -0.35, dc, 1.5, 0.9, L - 0.1, B.m.darkSteel, {});
          const m = B.mover(home, 0, dc);
          m.box(0, -0.2, 0, pw, 0.4, L - 0.12, side < 0 ? B.m.deck : B.m.deckAlt);
          m.box(0, 0.006, 0, pw * 0.85, 0.01, 0.1, side < 0 ? B.m.glow : B.m.glowGold, { collide: false, cast: false });
          const ph = (i * 0.11 + (side > 0 ? 0.5 : 0)) % 1;
          const ext = (t) => { const u = cyc(t, period, ph); if (u < 0.56) return 1; if (u < 0.64) return 1 - smooth((u - 0.56) / 0.08); if (u < 0.92) return 0; return smooth((u - 0.92) / 0.08); };
          B.onUpdate((t) => { m.obj.position.x = home + side * (1 - ext(t)) * (pw + 0.4); });
          segs.push({ dc, side, ext });
        }
        B.support(0, dc, -1.2);
      }
      const end = 4 + n * L;
      pad(B, end, end + 4, W);
      B.coinLine(-1.1, 5, -1.1, 4 + L - 1, 2);
      B.ground = (x, d, t) => {
        if (d < 4.2 || d > end - 0.2) return Math.abs(x) < 2.4;
        const i = Math.floor((d - 4) / L);
        for (const s of segs) if (Math.abs(s.dc - (4 + L / 2 + i * L)) < 0.1 && s.side * x > 0.25 && Math.abs(x) < pw - 0.2 && s.ext(t) > 0.92) return true;
        return false;
      };
      B.width = 4.4;
      B.speedMul = 0.85;
      B.exit(0, 0, end + 4);
    },
  },
  {
    id: 'retract_rails', name: 'Retracting Rails', category: 'Mechanical', difficulty: 4, jump: true,
    desc: 'Twin rails telescope back into the far tower - cross the one that is out, or jump the gap.',
    build(B, p) {
      const L = 9, rw = 1.5, period = p.period || 3.6;
      pad(B, 0, 4, W);
      const lanes = [-1.2, 1.2];
      const rails = [];
      B.box(0, 1.5, 4 + L + 1.2, 6, 3.6, 0.6, B.m.concrete, { collide: false });
      lanes.forEach((x, i) => {
        const m = B.mover(x, 0, 4);
        m.box(0, -0.18, L / 2, rw, 0.36, L, B.m.rail);
        m.box(0, -0.45, L / 2, rw * 0.5, 0.2, L - 0.5, B.m.darkSteel, { collide: false });
        const ph = i * 0.5;
        const out = (t) => { const u = cyc(t, period, ph); if (u < 0.5) return 1; if (u < 0.62) return 1 - smooth((u - 0.5) / 0.12); if (u < 0.88) return 0; return smooth((u - 0.88) / 0.12); };
        B.onUpdate((t) => { m.obj.position.z = -(4 + (1 - out(t)) * (L - 0.6)); });
        rails.push({ x, out });
      });
      pad(B, 4 + L, 8 + L, W);
      arrows(B, 0, 2, 2, 2, B.m.arrowBlue);
      B.coinArc(0, 4.5, 0, 4 + L - 0.5, 5, 0.9, 1.4);
      B.ground = (x, d, t) => {
        if (d < 4.1 || d > 4 + L - 0.1) return Math.abs(x) < 2.4;
        for (const r of rails) if (Math.abs(x - r.x) < rw / 2 - 0.2 && 4 + (1 - r.out(t)) * (L - 0.6) < d - 0.4) return true;
        return false;
      };
      B.width = 4.0;
      B.exit(0, 0, 8 + L);
    },
  },
  {
    id: 'barrel_avalanche', name: 'Barrel Avalanche', category: 'Mechanical', difficulty: 3,
    desc: 'Heavy barrels come rolling down the slope straight at you.',
    build(B, p) {
      const len = 34, rise = 3.2, lanes = 3, lw = 1.6, period = p.period || 3.4, r = 0.62;
      pad(B, 0, 3, W);
      const yAt = (d) => rise * clamp((d - 3) / len, 0, 1);
      B.ribbon((u) => ({ x: 0, y: rise * u, d: 3 + len * u, h: 0, w: W }), 30, W, 0.5, B.m.deckAlt, { path: true, supports: true, supportStep: 10 });
      for (const s of [-1, 1]) B.ribbon((u) => ({ x: s * (W / 2 + 0.1), y: rise * u + 0.4, d: 3 + len * u, h: 0, w: 0.2 }), 10, 0.2, 0.4, B.m.rail, {});
      B.box(0, rise + 1.5, 3 + len + 1.2, W + 1, 3.0, 1.6, B.m.machine, { collide: false });
      B.box(0, rise + 0.8, 3 + len + 0.35, W - 0.4, 1.6, 0.1, B.m.dark, { collide: false });
      const barrels = [];
      for (let l = 0; l < lanes; l++) for (let k = 0; k < (p.perLane || 2); k++) {
        const x = (l - 1) * lw;
        const m = B.mover(x, 0, 0);
        m.cyl(0, 0, 0, r, lw - 0.25, 'x', k % 2 ? B.m.accent : B.m.machine, { seg: 18 });
        m.cyl(0, 0, 0, r + 0.04, 0.12, 'x', B.m.darkSteel, { collide: false, seg: 18 });
        const ph = (l * 0.31 + k / (p.perLane || 2)) % 1;
        const speed = (p.speed || 7) * (0.85 + l * 0.1);
        const travel = len + 4;
        const tPeriod = travel / speed + 0.6;
        const st = (t) => {
          const u = cyc(t, tPeriod, ph) * tPeriod;
          if (u < 0.6) return { d: 3 + len + 0.6, y: rise + r - 4, hidden: true };
          const dd = 3 + len - (u - 0.6) * speed;
          if (dd < 3) return { d: dd, y: r - (3 - dd) * 1.6, hidden: false };
          return { d: dd, y: yAt(dd) + r, hidden: false };
        };
        B.onUpdate((t) => { const s = st(t); m.obj.position.set(x, s.y, -s.d); m.obj.rotation.x = -s.d / r; });
        barrels.push({ x, st });
      }
      B.coinLine(0, 6, 0, 3 + len - 3, 7, 0.65 + 0.4, rise + 0.65);
      pad(B, 3 + len, 7 + len, W, { y: rise });
      B.danger = (x, d, t) => { let m = 9; for (const b of barrels) { const s = b.st(t); if (s.hidden) continue; if (Math.abs(x - b.x) < 1.35) m = Math.min(m, Math.abs(d - s.d) - 1.25); } return m; };
      B.width = 4.6;
      B.speedMul = 0.9;
      B.exit(0, rise, 7 + len);
    },
  },
  {
    id: 'vortex_tunnel', name: 'Vortex Tunnel', category: 'Mechanical', difficulty: 3,
    desc: 'A narrow deck inside a spinning spiral cage that rocks the whole structure.',
    build(B, p) {
      const len = p.len || 26, Rc = 2.6, cy = 1.6, w = 1.8, A = (p.rock || 16) * deg;
      pad(B, 0, 3, W);
      const rock = B.mover(0, cy, 3);
      rock.box(0, -cy - 0.2, len / 2, w, 0.4, len, B.m.deck);
      rock.box(0, -cy - 0.5, len / 2, w * 0.5, 0.3, len, B.m.accent2, { collide: false });
      const cage = new THREE.Group(); cage.position.set(0, 0, 0); rock.obj.add(cage);
      const strands = 6, turns = len / 9;
      for (let k = 0; k < strands; k++) {
        const pts = [];
        for (let i = 0; i <= 80; i++) { const u = i / 80; const a = k * TAU / strands + u * turns * TAU; pts.push(new THREE.Vector3(Math.cos(a) * Rc, Math.sin(a) * Rc, -u * len)); }
        const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.09, 6, false), k % 2 ? B.m.glow : B.m.rail);
        tube.castShadow = true; cage.add(tube);
      }
      for (let i = 0; i <= 4; i++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(Rc, 0.14, 8, 40), B.m.darkSteel); ring.position.z = -i * len / 4; cage.add(ring); }
      const spin = p.spin || 1.8;
      B.onUpdate((t) => { rock.obj.rotation.z = A * Math.sin(t * (p.speed || 1.4)); cage.rotation.z = t * spin; });
      B.support(0, 3 + len / 2, -1.2);
      B.box(0, -1.0, 3 + len / 2, 0.4, 0.6, len + 1, B.m.darkSteel, { collide: false });
      pad(B, 3 + len, 6 + len, W);
      B.coinLine(0, 5, 0, 1 + len, Math.floor(len / 2.6));
      if (p.gem) B.gem(0, 1.1, 3 + len * 0.6);
      B.hint = () => ({ lat: 0 });
      B.cam = { dist: 5.2, height: 2.4 };
      B.exit(0, 0, 6 + len);
    },
  },
  {
    id: 'paddle_wheel', name: 'Paddle Wheels', category: 'Mechanical', difficulty: 3,
    desc: 'Giant waterwheel-style paddles sweep down through alternating halves of the track.',
    build(B, p) {
      const n = p.count || 2, Rw = 6.0, spacing = 12, paddles = 4, pw = 2.4;
      const total = 6 + n * spacing;
      pad(B, 0, total, W);
      for (const s of [-1, 1]) guardRail(B, s * (W / 2 - 0.1), 1, total - 1, { h: 0.6, mat: B.m.rail, step: 4 });
      const wheels = [];
      for (let i = 0; i < n; i++) {
        const dc = 7 + i * spacing, side = i % 2 ? 1 : -1, xc = side * 1.25;
        const cy = Rw + 0.35;
        for (const e of [-1, 1]) B.box(xc + e * 1.6, cy / 2, dc, 0.4, cy + 0.6, 0.6, B.m.darkSteel, { collide: false });
        B.cyl(xc, cy, dc, 0.5, 3.6, 'x', B.m.steel, { collide: false });
        const m = B.mover(xc, cy, dc);
        for (let k = 0; k < paddles; k++) {
          const a = k * TAU / paddles;
          m.box(0, Math.sin(a) * (Rw / 2), Math.cos(a) * (Rw / 2), 0.25, 0.25, Rw, B.m.darkSteel, { rx: a, collide: false });
          m.box(0, Math.sin(a) * (Rw - 0.6), Math.cos(a) * (Rw - 0.6), pw, 1.2, 0.3, B.m.deckAlt, { rx: a - Math.PI / 2 });
        }
        const ringA = new THREE.Mesh(new THREE.TorusGeometry(Rw - 0.1, 0.1, 6, 48), B.m.machine); ringA.rotation.y = Math.PI / 2; ringA.position.x = -pw / 2 - 0.05; m.obj.add(ringA);
        const ringB = ringA.clone(); ringB.position.x = pw / 2 + 0.05; m.obj.add(ringB);
        const w = (p.speed || 0.9);
        const ang = (t) => w * t + i * 0.8;
        B.onUpdate((t) => { m.obj.rotation.x = ang(t); });
        wheels.push({ dc, xc, cy, ang });
        B.coin(-xc, 0.65, dc);
      }
      B.danger = (x, d, t) => {
        let m = 9;
        for (const wh of wheels) {
          if (Math.abs(x - wh.xc) > pw / 2 + 0.55) continue;
          for (let k = 0; k < paddles; k++) {
            const a = wh.ang(t) + k * TAU / paddles;
            const pd = wh.dc + Math.cos(a) * (Rw - 0.6), py = wh.cy + Math.sin(a) * (Rw - 0.6);
            m = Math.min(m, Math.hypot(d - pd, Math.max(0, Math.abs(0.5 - py) - 0.6)) - 0.75);
          }
        }
        return m;
      };
      B.width = 4.4;
      B.exit(0, 0, total);
    },
  },
  {
    id: 'seesaws', name: 'Physics Seesaws', category: 'Mechanical', difficulty: 3,
    desc: 'Real pivoting planks that tip under the weight of the ball.',
    build(B, p) {
      const n = p.count || 3, L = 6.4, w = 3.0;
      pad(B, 0, 4, W);
      const planks = [];
      for (let i = 0; i < n; i++) {
        const dc = 4 + L / 2 + i * (L + 0.5);
        B.box(0, -0.9, dc, 0.6, 1.0, 0.6, B.m.darkSteel, { collide: false });
        B.support(0, dc, -1.4);
        const wp = B.W(0, -0.2, dc);
        const body = B.phys.dynamicBody(wp, B.quat.clone(), { angularDamping: 2.5, linearDamping: 0.5, dominance: 0 });
        body.setEnabledTranslations(false, false, false, true);
        B.phys.addCollider(R.ColliderDesc.cuboid(w / 2, 0.2, L / 2).setDensity(0.35).setFriction(0.9), body, { section: B.index });
        const geo = new THREE.BoxGeometry(w, 0.4, L); boxUV(geo, B.m.deck.userData.uvMeters || 2);
        const mesh = new THREE.Mesh(geo, i % 2 ? B.m.deckAlt : B.m.deck); mesh.castShadow = true; mesh.receiveShadow = true;
        const trim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, 0.12, 0.3), B.m.hazard); trim.position.y = -0.15; mesh.add(trim);
        B.course.root.add(mesh);
        const j = B.revolute(B.body, body, { x: 0, y: -0.2, z: -dc }, { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 });
        j.setLimits(-0.22, 0.22);
        const q0 = B.quat.clone();
        planks.push({ body, mesh, p0: wp.clone(), q0 });
        B.coin(0, 1.0, dc);
      }
      const end = 4 + n * (L + 0.5) - 0.5;
      pad(B, end, end + 4, W);
      B.onUpdate(() => { for (const pl of planks) { const t = pl.body.translation(), r = pl.body.rotation(); pl.mesh.position.set(t.x, t.y, t.z); pl.mesh.quaternion.set(r.x, r.y, r.z, r.w); } });
      B.onReset(() => { for (const pl of planks) { pl.body.setTranslation(pl.p0, true); pl.body.setRotation(pl.q0, true); pl.body.setAngvel({ x: 0, y: 0, z: 0 }, true); pl.body.setLinvel({ x: 0, y: 0, z: 0 }, true); } });
      B.onDispose = () => planks.forEach((pl) => { B.course.root.remove(pl.mesh); pl.mesh.geometry.dispose(); });
      B.extraBodies = planks.map((pl) => pl.body);
      B.speedMul = 0.9;
      B.hint = () => ({ lat: 0 });
      B.exit(0, 0, end + 4);
    },
  },
];
void TAU; void segDist;
