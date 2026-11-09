// Physics challenges: bouncing, slipping, sticking, wind, slopes, moguls, bumpers, magnets,
// low gravity and high-speed boost sections.
import * as THREE from 'three';
import { W, TAU, arrows, pad, smooth, clamp, guardRail, lerp } from './kit.js';
import { boostPad } from './jumps.js';
import { R } from '../../core/physics.js';

const deg = Math.PI / 180;

export const PHYSICS = [
  {
    id: 'trampolines', name: 'Trampoline Chain', category: 'Physics', difficulty: 3,
    desc: 'Bounce from trampoline to trampoline across open air.',
    build(B, p) {
      const n = p.count || 5, power = p.power || 9.6, size = 3.4, v = 9.2;
      const step = v * (2 * power / 24);
      pad(B, 0, 5, W);
      const pads = [];
      for (let i = 0; i < n; i++) {
        const dc = i === 0 ? 5 + size / 2 + 0.02 : 5.1 + i * step + 0.4, x = i === 0 ? 0 : (i % 2 ? 1 : -1) * (p.offset ?? 0.8);
        B.box(x, -0.32, dc, size, 0.4, size, B.m.darkSteel, { collide: false });
        B.box(x, -0.08, dc, size, 0.12, size, B.m.bouncy, { surface: { type: 'spring', power } });
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.cyl(x + sx * (size / 2 - 0.1), -1.1, dc + sz * (size / 2 - 0.1), 0.1, 1.6, 'y', B.m.steel, { collide: false });
        B.support(x, dc, -1.9);
        pads.push({ x, dc });
        if (i > 0) B.coinArc(pads[i - 1].x, pads[i - 1].dc + 0.4, x, dc - 1.2, 3, 1.4, 1.7);
      }
      const last = pads[pads.length - 1];
      const e0 = last.dc + step - 2.6;
      B.deck(0, e0, e0 + 10, 6.5, { edges: true });
      B.pathLine(0, 0, 0, e0 + 10);
      if (p.gem) B.gem(pads[2].x, 3.0, (pads[2].dc + pads[3].dc) / 2 - 0.6);
      B.speedMul = v / (B.course.baseSpeed || 10);
      // the bounce field calibrates your forward speed so every hop carries you to the next pad
      B.onUpdate(() => {
        const b = B.ballLocal(); const ball = B.ball;
        if (!b || !ball.body || b.d < 4 || b.d > e0 || ball.grounded) return;
        const f = B.dirW(0, 1); const vf = ball.vel.x * f.x + ball.vel.z * f.z;
        const a = THREE.MathUtils.clamp((v - vf) * 4, -10, 10);
        ball.addAccel(f.x * a, 0, f.z * a);
      });
      B.hint = (c) => { const i = pads.findIndex((q) => q.dc + 0.6 > c.local.d); const q = i < 0 ? { x: 0 } : pads[i]; return { lat: q.x }; };
      B.cam = { dist: 7.4, height: 4.0 };
      B.exit(0, 0, e0 + 10);
    },
  },
  {
    id: 'ice_rink', name: 'Ice Rink', category: 'Physics', difficulty: 3,
    desc: 'Frictionless ice with frozen blocks - your steering barely bites.',
    build(B, p, rng) {
      const len = p.len || 34, w = p.w || 6;
      pad(B, 0, 3, W);
      B.ribbon((u) => ({ x: 0, y: 0, d: 3 + 3 * u, w: lerp(W, w, smooth(u)) }), 6, W, 0.5, B.m.deck, {});
      B.deck(0, 6, 6 + len, w, { mat: B.m.ice, friction: 0.02, surface: { type: 'ice' }, edges: true, edgeMat: B.m.glow });
      for (const s of [-1, 1]) B.box(s * (w / 2 + 0.12), 0.18, 6 + len / 2, 0.24, 0.36, len, B.m.glass, { friction: 0.02, restitution: 0.4 });
      const blocks = [];
      for (let i = 0; i < (p.blocks || 6); i++) {
        const d = 11 + i * (len - 8) / (p.blocks || 6), x = (rng() - 0.5) * (w - 2.2);
        B.box(x, 0.45, d, 1.1, 0.9, 1.1, B.m.glass, { ry: rng() * 2, friction: 0.05 });
        blocks.push({ x, d });
        B.coin(x > 0 ? x - 1.5 : x + 1.5, 0.65, d);
      }
      B.ribbon((u) => ({ x: 0, y: 0, d: 6 + len + 3 * u, w: lerp(w, W, smooth(u)) }), 6, W, 0.5, B.m.deck, {});
      pad(B, 9 + len, 12 + len, W);
      B.danger = (x, d) => { let m = 9; for (const b of blocks) m = Math.min(m, Math.hypot(x - b.x, d - b.d) - 1.5); return m; };
      B.width = w - 1.0;
      B.speedMul = 0.85;
      B.exit(0, 0, 12 + len);
    },
  },
  {
    id: 'tar_pit', name: 'Tar Pits', category: 'Physics', difficulty: 3,
    desc: 'Sticky tar lanes kill your speed right before a jump that needs it.',
    build(B, p, rng) {
      const len = 22, lanes = 3, lw = W / lanes;
      pad(B, 0, 3, W);
      B.deck(0, 3, 3 + len, W, {});
      const pits = [];
      for (let k = 0; k < 4; k++) {
        const d0 = 4 + k * 5.2, clean = Math.floor(rng() * lanes);
        for (let l = 0; l < lanes; l++) {
          if (l === clean) continue;
          const x = (l - 1) * lw;
          B.box(x, 0.0, d0 + 1.9, lw - 0.05, 0.05, 3.8, B.m.goo, { surface: { type: 'sticky' }, friction: 1.2, cast: false });
          pits.push({ x, d0, d1: d0 + 3.8 });
        }
        B.coin((clean - 1) * lw, 0.65, d0 + 1.9);
      }
      boostPad(B, 0, 0.4, 3.4, W - 0.2, 1.55, 3.4);
      const rfn = (u) => ({ x: 0, y: 1.6 * u * u, d: 3 + len + 5 * u, h: 0, w: W });
      B.ribbon(rfn, 16, W, 0.5, B.m.deckAlt, { path: true });
      const gap = 5.5, ld = 3 + len + 5 + gap;
      B.deck(0, ld, ld + 14, 6, { y: -0.8, edges: true });
      B.pathLine(0, 3 + len + 5, 0, ld, 1.6, -0.8);
      B.coinArc(0, 3 + len + 5.5, 0, ld - 0.5, 4, 2.6, 1.0);
      B.danger = (x, d) => { let m = 9; for (const q of pits) if (d > q.d0 - 0.4 && d < q.d1 + 0.2 && Math.abs(x - q.x) < lw / 2 + 0.35) m = Math.min(m, -1); return m; };
      B.width = 4.4;
      B.exit(0, -0.8, ld + 14);
    },
  },
  {
    id: 'wind_fans', name: 'Crosswind Fans', category: 'Physics', difficulty: 3,
    desc: 'Giant industrial fans blast you sideways across a narrow deck.',
    build(B, p) {
      const n = p.count || 3, zone = 8, gapd = 2.5, w = p.w || 3.0, force = p.force || 16;
      pad(B, 0, 3, W);
      const total = 3 + n * (zone + gapd) + 1;
      B.ribbon((u) => ({ x: 0, y: 0, d: 3 + 3 * u, w: lerp(W, w, smooth(u)) }), 5, W, 0.5, B.m.deck, {});
      B.deck(0, 6, total, w, { edges: true });
      const fans = [];
      for (let i = 0; i < n; i++) {
        const side = i % 2 ? 1 : -1, d0 = 7 + i * (zone + gapd), dc = d0 + zone / 2;
        const fx = side * (w / 2 + 3.2);
        B.box(fx + side * 0.8, 0.6, dc, 1.2, 5.4, 6.2, B.m.darkSteel, { collide: false });
        const ring = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.25, 10, 36), B.m.machine);
        ring.position.set(fx, 1.2, -dc); ring.rotation.y = Math.PI / 2; ring.castShadow = true; B.group.add(ring);
        const rotor = new THREE.Group(); rotor.position.set(fx, 1.2, -dc); B.group.add(rotor);
        for (let k = 0; k < 5; k++) { const bl = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.1, 0.55), B.m.steel); bl.position.y = 1.0; const piv = new THREE.Group(); piv.rotation.x = k * TAU / 5; piv.add(bl); bl.rotation.y = 0.5; rotor.add(piv); }
        const hub = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 8), B.m.hazard); rotor.add(hub);
        fans.push({ side, d0, d1: d0 + zone, rotor });
        for (let k = 0; k < 3; k++) B.coin(side * (w / 2 - 0.45), 0.65, d0 + 2 + k * 2);
      }
      const end = total;
      B.ribbon((u) => ({ x: 0, y: 0, d: end + 3 * u, w: lerp(w, W, smooth(u)) }), 5, W, 0.5, B.m.deck, {});
      pad(B, end + 3, end + 6, W);
      B.onUpdate((t, dt) => {
        for (const f of fans) f.rotor.rotation.x += dt * 14;
        const b = B.ballLocal(); if (!b) return;
        for (const f of fans) {
          if (b.d > f.d0 && b.d < f.d1 && b.y < 4 && b.y > -2) {
            const k = Math.sin(Math.PI * (b.d - f.d0) / zone);
            const dir = B.dirW(-f.side, 0);
            B.ball.addAccel(dir.x * force * k, 0, dir.z * force * k);
            if (Math.random() < 0.25) B.course.game.effects.streak.spawn({ pos: B.W(f.side * (w / 2 + 1.5), 0.3 + Math.random() * 1.5, b.d + (Math.random() - 0.5) * 4), vel: B.dirW(-f.side, 0).multiplyScalar(18), life: 0.35, size: 0.1, color: '#e8f6ff', stretch: 6, alpha: 0.5, rot: Math.PI / 2 });
          }
        }
      });
      B.hint = (c) => { const f = fans.find((q) => c.local.d > q.d0 - 1 && c.local.d < q.d1 + 0.5); return { lat: f ? f.side * 0.35 : 0 }; };
      B.exit(0, 0, end + 6);
    },
  },
  {
    id: 'steep_climb', name: 'Mountain Climb', category: 'Physics', difficulty: 2,
    desc: 'A brutally steep incline - ride the boost strips to make it over the crest.',
    build(B, p) {
      const rise = p.rise || 6, len = p.len || 16, w = 4.4;
      pad(B, 0, 6, W);
      boostPad(B, 0, 1, 6, 3.4, 1.6, 2.4);
      const up = (u) => ({ x: 0, y: rise * smooth(u), d: 6 + len * u, h: 0, w });
      B.ribbon(up, 40, w, 0.5, B.m.deckAlt, { path: true, supports: true, supportStep: 6, walls: { h: 0.5, t: 0.2, mat: B.m.rail } });
      for (let i = 0; i < 3; i++) { const c = up(0.25 + i * 0.22); arrows(B, 0, c.d, 2.4, 2, B.m.arrowGold, c.y + 0.04).rotation.x = -Math.PI / 2 - Math.atan(rise * 1.5 / len); }
      B.deck(0, 6 + len, 12 + len, W, { y: rise });
      B.pathLine(0, 6 + len, 0, 12 + len, rise, rise);
      const down = (u) => ({ x: 0, y: rise - (rise + (p.down || 2)) * smooth(u), d: 12 + len + 12 * u, h: 0, w });
      B.ribbon(down, 30, w, 0.5, B.m.deck, { path: true, supports: true, supportStep: 6 });
      const endY = -(p.down || 2);
      pad(B, 24 + len, 28 + len, W, { y: endY });
      for (let i = 1; i < 8; i++) { const c = up(i / 8); B.coin(0, c.y + 0.7, c.d); }
      B.coinLine(0, 7 + len, 0, 11 + len, 3, rise + 0.65);
      B.hint = () => ({ lat: 0, accel: true });
      B.exit(0, endY, 28 + len);
    },
  },
  {
    id: 'moguls', name: 'Mogul Field', category: 'Physics', difficulty: 2,
    desc: 'A lumpy, uneven surface that bounces the ball around unpredictably.',
    build(B, p, rng) {
      const len = p.len || 30, w = 5, nx = 16, nz = Math.round(len * 1.6);
      pad(B, 0, 3, W);
      const bumps = [];
      for (let i = 0; i < (p.bumps || 18); i++) bumps.push({ x: (rng() - 0.5) * (w - 1), d: 5 + rng() * (len - 4), r: 0.9 + rng() * 0.9, h: 0.25 + rng() * (p.height || 0.4) });
      const hAt = (x, d) => { let h = 0; for (const b of bumps) { const q = ((x - b.x) ** 2 + (d - b.d) ** 2) / (b.r * b.r); h += b.h * Math.exp(-q * 1.6); } return Math.min(h, 0.75); };
      const pos = [], idx = [], uv = [];
      for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
        const x = -w / 2 + w * i / nx, d = 3 + len * j / nz;
        const edge = Math.min(1, Math.min(j, nz - j) / 3);
        pos.push(x, hAt(x, d) * edge, -d); uv.push(x / 2, d / 2);
      }
      for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1; idx.push(a, b, d, a, d, c); }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
      if (geo.attributes.normal.getY(0) < 0) { for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; } geo.setIndex(idx); geo.computeVertexNormals(); }
      B.mesh(geo, B.m.deckAlt, 0, 0, 0, { trimesh: true, collide: true });
      B.box(0, -0.3, 3 + len / 2, w, 0.6, len, B.m.deckSide, { collide: false });
      for (let d = 6; d < 3 + len; d += 12) B.support(0, d, -0.8);
      for (const s of [-1, 1]) B.box(s * (w / 2 + 0.05), 0.0, 3 + len / 2, 0.1, 0.2, len, B.m.rail, { collide: false });
      pad(B, 3 + len, 7 + len, W);
      for (const b of bumps.slice(0, 8)) B.coin(b.x, hAt(b.x, b.d) + 0.7, b.d);
      B.hint = () => ({ lat: 0 });
      B.exit(0, 0, 7 + len);
    },
  },
  {
    id: 'pinball', name: 'Pinball Bumpers', category: 'Physics', difficulty: 3,
    desc: 'Springy pinball bumpers kick the ball away on contact.',
    build(B, p, rng) {
      const len = p.len || 30, w = 6.4;
      pad(B, 0, 3, W);
      B.ribbon((u) => ({ x: 0, y: 0, d: 3 + 2.5 * u, w: lerp(W, w, smooth(u)) }), 5, W, 0.5, B.m.deck, {});
      B.deck(0, 5.5, 5.5 + len, w, { mat: B.m.plate });
      for (const s of [-1, 1]) guardRail(B, s * (w / 2 - 0.08), 5.5, 5.5 + len, { h: 0.45, mat: B.m.glow, step: 5 });
      const bumpers = [];
      const rows = p.rows || 5;
      for (let r = 0; r < rows; r++) {
        const n = r % 2 ? 1 : 2;
        for (let k = 0; k < n; k++) {
          const x = n === 1 ? (rng() - 0.5) * 1.2 : (k ? 1 : -1) * (1.5 + rng() * 0.3), d = 9 + r * (len - 7) / rows;
          const top = B.cyl(x, 0.45, d, 0.55, 0.9, 'y', B.m.bumper, { surface: { type: 'bumper', power: p.power || 9 }, restitution: 0.9, seg: 24 });
          B.cyl(x, 0.92, d, 0.62, 0.08, 'y', B.m.white, { collide: false, seg: 24 });
          B.cyl(x, 0.05, d, 0.7, 0.1, 'y', B.m.dark, { collide: false, seg: 24 });
          bumpers.push({ x, d });
          void top;
        }
      }
      for (let r = 0; r < rows; r++) B.coin(r % 2 ? 2.2 : 0, 0.65, 9 + r * (len - 7) / rows);
      B.ribbon((u) => ({ x: 0, y: 0, d: 5.5 + len + 2.5 * u, w: lerp(w, W, smooth(u)) }), 5, W, 0.5, B.m.deck, {});
      pad(B, 8 + len, 11 + len, W);
      B.danger = (x, d) => { let m = 9; for (const b of bumpers) m = Math.min(m, Math.hypot(x - b.x, d - b.d) - 1.25); return m; };
      B.width = w - 0.8;
      B.exit(0, 0, 11 + len);
    },
  },
  {
    id: 'magnet_orbs', name: 'Magnet Orbs', category: 'Physics', difficulty: 3,
    desc: 'Glowing magnetic orbs beside the track pull the ball toward the edge.',
    build(B, p) {
      const n = p.count || 4, spacing = 8, strength = p.strength || 20, w = 3.6;
      const total = 6 + n * spacing;
      pad(B, 0, 3, W);
      B.ribbon((u) => ({ x: 0, y: 0, d: 3 + 3 * u, w: lerp(W, w, smooth(u)) }), 5, W, 0.5, B.m.deck, {});
      B.deck(0, 6, total, w, { edges: true, edgeMat: B.m.glow });
      const orbs = [];
      const orbMat = new THREE.MeshStandardMaterial({ color: 0x220044, emissive: 0xb04dff, emissiveIntensity: 2.5, roughness: 0.2, metalness: 0.3 });
      for (let i = 0; i < n; i++) {
        const side = i % 2 ? 1 : -1, dc = 9 + i * spacing, ox = side * (w / 2 + 2.6);
        const orb = new THREE.Mesh(new THREE.SphereGeometry(0.75, 24, 16), orbMat); orb.position.set(ox, 0.8, -dc); B.group.add(orb);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.06, 6, 32), B.m.glow); ring.position.copy(orb.position); B.group.add(ring);
        B.box(ox, -1.6, dc, 0.5, 4, 0.5, B.m.darkSteel, { collide: false });
        orbs.push({ x: ox, dc, side, ring });
        B.coin(-side * 0.9, 0.65, dc);
      }
      B.ribbon((u) => ({ x: 0, y: 0, d: total + 3 * u, w: lerp(w, W, smooth(u)) }), 5, W, 0.5, B.m.deck, {});
      pad(B, total + 3, total + 6, W);
      B.onUpdate((t) => {
        for (const o of orbs) { o.ring.rotation.x = t * 2; o.ring.rotation.y = t * 1.3; }
        const b = B.ballLocal(); if (!b) return;
        for (const o of orbs) {
          const dx = o.x - b.x, dd = o.dc - b.d; const dist = Math.hypot(dx, dd);
          if (dist > 9) continue;
          const f = strength * Math.min(1, 9 / (dist * dist + 3));
          const dir = B.dirW(dx / dist, dd / dist);
          B.ball.addAccel(dir.x * f, 0, dir.z * f);
        }
      });
      B.hint = (c) => { let lat = 0; for (const o of orbs) { const dd = Math.abs(o.dc - c.local.d); if (dd < 5) lat = -o.side * 0.7 * (1 - dd / 5); } return { lat }; };
      B.exit(0, 0, total + 6);
    },
  },
  {
    id: 'low_gravity', name: 'Zero-G Zone', category: 'Physics', difficulty: 3, jump: true,
    desc: 'Inside the force field gravity drops away - float between rising platforms.',
    build(B, p) {
      const n = p.count || 4, pl = 7.5, gap = 6, climb = 1.4, gs = 0.35;
      pad(B, 0, 6, W, { edges: true, edgeMat: B.m.glow });
      const plats = [];
      let d = 6 + gap, y = climb;
      for (let i = 0; i < n; i++) {
        B.deck(0, d, d + pl, 3.6, { y, edges: true, edgeMat: B.m.glow, support: false });
        B.cyl(0, y - 0.9, d + pl / 2, 0.6, 0.8, 'y', B.m.glow, { collide: false });
        plats.push({ d0: d, d1: d + pl, y });
        B.coinArc(0, d - gap + 0.5, 0, d - 0.5, 4, y + 0.6, 1.8);
        d += pl + gap; y += climb;
      }
      const last = plats[plats.length - 1];
      B.deck(0, d, d + 10, W, { y: last.y + climb, edges: true });
      const endY = last.y + climb;
      // force-field visual
      const ff = new THREE.Mesh(new THREE.BoxGeometry(9, 14, d), new THREE.MeshBasicMaterial({ color: 0x7fd6ff, transparent: true, opacity: 0.06, depthWrite: false, side: THREE.DoubleSide }));
      ff.position.set(0, 4, -(d / 2 + 0.3)); B.group.add(ff);
      let prev = { d1: 6, y: 0 };
      for (const q of plats) { B.pathLine(0, prev.d1, 0, q.d0, prev.y, q.y); B.pathLine(0, q.d0, 0, q.d1, q.y, q.y); prev = q; }
      B.pathLine(0, prev.d1, 0, d + 10, prev.y, endY);
      B.onUpdate(() => {
        const b = B.ballLocal(); if (!b) return;
        const inside = b.d > 0.3 && b.d < d + 1 && Math.abs(b.x) < 6;
        B.ball.setGravityScale(inside ? gs : 1);
      });
      B.onReset(() => B.ball && B.ball.body && B.ball.setGravityScale(1));
      const all = [{ d0: 0, d1: 6, y: 0 }, ...plats];
      B.speedMul = 0.85;
      B.hint = (c) => { const q = all.find((qq) => c.local.d < qq.d1 + 0.3); return { lat: 0, jump: !!q && c.local.d > q.d1 - 2.2 && c.local.d < q.d1 - 0.6 }; };
      B.cam = { dist: 7.5, height: 4.0 };
      if (p.gem) B.gem(0, plats[1].y + 3, plats[1].d1 + gap / 2);
      B.exit(0, endY, d + 10);
    },
  },
  {
    id: 'turbo_slalom', name: 'Turbo Slalom', category: 'Physics', difficulty: 4,
    desc: 'Boost strips fire you through a forest of posts at double speed.',
    build(B, p, rng) {
      const len = p.len || 44, w = 5.4;
      pad(B, 0, 6, W);
      boostPad(B, 0, 1, 6, 3.4, 1.65, 3.2);
      B.deck(0, 6, 6 + len, w, { edges: true, edgeMat: B.m.glowGold });
      const posts = [];
      for (let d = 12; d < 2 + len; d += 4.2) {
        const n = rng() < 0.5 ? 1 : 2;
        const used = [];
        for (let k = 0; k < n; k++) {
          let x = (rng() - 0.5) * (w - 1.4);
          if (used.some((u) => Math.abs(u - x) < 2.4)) continue;
          used.push(x);
          B.cyl(x, 0.75, d, 0.32, 1.5, 'y', B.m.hazard, { seg: 14 });
          B.cyl(x, 1.55, d, 0.4, 0.12, 'y', B.m.glowRed, { collide: false, seg: 14 });
          posts.push({ x, d });
        }
      }
      for (let k = 0; k < 4; k++) boostPad(B, k % 2 ? 1.2 : -1.2, 14 + k * 9 + 1.5, 14 + k * 9 + 3.5, 1.4, 1.65, 1.6);
      pad(B, 6 + len, 10 + len, W);
      B.coinLine(0, 7, 0, 10, 3);
      B.danger = (x, d) => { let m = 9; for (const q of posts) m = Math.min(m, Math.hypot(x - q.x, (d - q.d) * 0.7) - 0.95); return m; };
      B.width = w - 0.7;
      B.exit(0, 0, 10 + len);
    },
  },
];
void R; void deg; void clamp;
