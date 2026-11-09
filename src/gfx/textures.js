// Procedurally generated textures (no external image assets). All textures are cached.
import * as THREE from 'three';

const cache = new Map();
let anisotropy = 8;
export function setAnisotropy(a) {
  anisotropy = a;
  for (const t of cache.values()) {
    for (const k of ['map', 'normalMap', 'roughnessMap', 'emissiveMap', 'tex']) {
      if (t[k]) { t[k].anisotropy = a; t[k].needsUpdate = true; }
    }
  }
}

export function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

// Tileable value noise.
function makeNoise(size, seed) {
  const r = rng(seed);
  const g = new Float32Array(size * size);
  for (let i = 0; i < g.length; i++) g[i] = r();
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const x0 = ((xi % size) + size) % size, y0 = ((yi % size) + size) % size;
    const x1 = (x0 + 1) % size, y1 = (y0 + 1) % size;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = g[y0 * size + x0], b = g[y0 * size + x1], c = g[y1 * size + x0], d = g[y1 * size + x1];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}

export function fbmFactory(size, seed, oct = 5) {
  const n = makeNoise(size, seed);
  return (x, y) => {
    let s = 0, amp = 0.5, f = 1, norm = 0;
    for (let i = 0; i < oct; i++) { s += n(x * f, y * f) * amp; norm += amp; amp *= 0.5; f *= 2; }
    return s / norm;
  };
}

function toTexture(canvas, srgb = true, repeat = true) {
  const t = new THREE.CanvasTexture(canvas);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.anisotropy = anisotropy;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.needsUpdate = true;
  return t;
}

function heightToNormal(h, w, hh, strength) {
  const c = makeCanvas(w, hh);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w, hh);
  const d = img.data;
  for (let y = 0; y < hh; y++) {
    for (let x = 0; x < w; x++) {
      const xl = (x - 1 + w) % w, xr = (x + 1) % w, yu = (y - 1 + hh) % hh, yd = (y + 1) % hh;
      const dx = (h[y * w + xr] - h[y * w + xl]) * strength;
      const dy = (h[yd * w + x] - h[yu * w + x]) * strength;
      const l = Math.hypot(dx, dy, 1);
      const i = (y * w + x) * 4;
      d[i] = (-dx / l * 0.5 + 0.5) * 255;
      d[i + 1] = (dy / l * 0.5 + 0.5) * 255;
      d[i + 2] = (1 / l * 0.5 + 0.5) * 255;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return toTexture(c, false);
}

function grayToTexture(vals, w, h) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h);
  for (let i = 0; i < vals.length; i++) {
    const v = Math.max(0, Math.min(255, vals[i] * 255));
    img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return toTexture(c, false);
}

function hexToRgb(hex) {
  const c = new THREE.Color(hex);
  return [c.r * 255, c.g * 255, c.b * 255];
}

function memo(key, fn) {
  if (!cache.has(key)) cache.set(key, fn());
  return cache.get(key);
}

// ---------------------------------------------------------------- Wood deck
// Represents a 3.2m x 3.2m patch of large tan panels (two per row, staggered) with fine grain.
export function woodDeck(tint = '#d8a56a', key = 'wood') {
  return memo('deck:' + tint + key, () => {
    const S = 512;
    const base = hexToRgb(tint);
    const r = rng(tint.length * 977 + 13 + key.length);
    const grain = fbmFactory(64, 7 + key.length, 4);
    const fine = fbmFactory(128, 19, 3);
    const blot = fbmFactory(32, 3, 3);
    const col = new Uint8ClampedArray(S * S * 4);
    const hgt = new Float32Array(S * S);
    const rough = new Float32Array(S * S);
    const cols = 2, rows = 2;
    const pw = S / cols, ph = S / rows;
    const shade = [];
    for (let i = 0; i < cols * rows * 2; i++) shade.push(0.95 + r() * 0.09);
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const row = Math.floor(y / ph);
        const xo = (x + (row % 2) * pw / 2) % S;
        const c = Math.floor(xo / pw);
        const lx = xo - c * pw, ly = y - row * ph;
        const edge = Math.min(lx, pw - lx, ly, ph - ly);
        const g = grain(xo * 0.012 + c * 7, y * 0.05);
        const fn = fine(x * 0.3, y * 0.03);
        const b = blot(x * 0.01, y * 0.01);
        let sh = shade[row * cols + c] * (0.9 + g * 0.14 + (fn - 0.5) * 0.05 + (b - 0.5) * 0.06);
        let h = 1;
        if (edge < 2.2) { const k = edge / 2.2; sh *= 0.5 + 0.45 * k; h = k * 0.85; }
        const i = y * S + x;
        col[i * 4] = base[0] * sh; col[i * 4 + 1] = base[1] * sh; col[i * 4 + 2] = base[2] * sh * 0.98; col[i * 4 + 3] = 255;
        hgt[i] = h + (g - 0.5) * 0.05;
        rough[i] = 0.66 + (1 - h) * 0.25 + (fn - 0.5) * 0.08;
      }
    }
    const c = makeCanvas(S, S);
    c.getContext('2d').putImageData(new ImageData(col, S, S), 0, 0);
    return { map: toTexture(c), normalMap: heightToNormal(hgt, S, S, 2.6), roughnessMap: grayToTexture(rough, S, S), meters: 3.2 };
  });
}

// ---------------------------------------------------------------- Painted metal (scratched)
export function paintedMetal(color = '#d42a22') {
  return memo('paint:' + color, () => {
    const S = 256;
    const base = hexToRgb(color);
    const n = fbmFactory(64, 31, 5);
    const r = rng(99);
    const col = new Uint8ClampedArray(S * S * 4);
    const rough = new Float32Array(S * S);
    const hgt = new Float32Array(S * S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const v = n(x * 0.06, y * 0.06);
      const i = y * S + x;
      const s = 0.9 + (v - 0.5) * 0.25;
      col[i * 4] = base[0] * s; col[i * 4 + 1] = base[1] * s; col[i * 4 + 2] = base[2] * s; col[i * 4 + 3] = 255;
      rough[i] = 0.38 + (v - 0.5) * 0.2;
      hgt[i] = v * 0.3;
    }
    const c = makeCanvas(S, S);
    const ctx = c.getContext('2d');
    ctx.putImageData(new ImageData(col, S, S), 0, 0);
    // scratches & wear
    for (let k = 0; k < 70; k++) {
      ctx.strokeStyle = `rgba(255,240,230,${0.05 + r() * 0.12})`;
      ctx.lineWidth = 0.5 + r() * 1.2;
      ctx.beginPath();
      const x = r() * S, y = r() * S, a = r() * Math.PI, l = 6 + r() * 30;
      ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke();
    }
    for (let k = 0; k < 14; k++) {
      ctx.fillStyle = `rgba(40,30,25,${0.05 + r() * 0.1})`;
      ctx.beginPath(); ctx.arc(r() * S, r() * S, 2 + r() * 8, 0, Math.PI * 2); ctx.fill();
    }
    return { map: toTexture(c), roughnessMap: grayToTexture(rough, S, S), normalMap: heightToNormal(hgt, S, S, 2) };
  });
}

// ---------------------------------------------------------------- Brushed steel
export function brushedMetal() {
  return memo('brushed', () => {
    const S = 256;
    const r = rng(5);
    const rows = new Float32Array(S);
    for (let y = 0; y < S; y++) rows[y] = r();
    const col = new Uint8ClampedArray(S * S * 4);
    const rough = new Float32Array(S * S);
    const n = fbmFactory(32, 3, 3);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const v = 0.72 + rows[y] * 0.12 + (n(x * 0.05, y * 0.05) - 0.5) * 0.12;
      const i = y * S + x;
      col[i * 4] = 200 * v; col[i * 4 + 1] = 205 * v; col[i * 4 + 2] = 212 * v; col[i * 4 + 3] = 255;
      rough[i] = 0.25 + rows[(y + 7) % S] * 0.15;
    }
    const c = makeCanvas(S, S);
    c.getContext('2d').putImageData(new ImageData(col, S, S), 0, 0);
    return { map: toTexture(c), roughnessMap: grayToTexture(rough, S, S) };
  });
}

// ---------------------------------------------------------------- Diamond plate (industrial floor)
export function diamondPlate() {
  return memo('diamond', () => {
    const S = 256;
    const hgt = new Float32Array(S * S);
    const col = new Uint8ClampedArray(S * S * 4);
    const n = fbmFactory(32, 77, 4);
    const cell = 32;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const cx = (x % cell) - cell / 2, cy = (y % cell) - cell / 2;
      const odd = (Math.floor(x / cell) + Math.floor(y / cell)) % 2;
      const a = odd ? 0.785 : -0.785;
      const u = cx * Math.cos(a) - cy * Math.sin(a), v = cx * Math.sin(a) + cy * Math.cos(a);
      const bump = Math.max(0, 1 - Math.pow(u / 13, 2) - Math.pow(v / 3.2, 2));
      const i = y * S + x;
      hgt[i] = Math.sqrt(bump);
      const s = 0.62 + bump * 0.25 + (n(x * 0.04, y * 0.04) - 0.5) * 0.2;
      col[i * 4] = 170 * s; col[i * 4 + 1] = 174 * s; col[i * 4 + 2] = 180 * s; col[i * 4 + 3] = 255;
    }
    const c = makeCanvas(S, S);
    c.getContext('2d').putImageData(new ImageData(col, S, S), 0, 0);
    return { map: toTexture(c), normalMap: heightToNormal(hgt, S, S, 2.5), meters: 1 };
  });
}

// ---------------------------------------------------------------- Concrete
export function concrete(tint = '#b8b2a8') {
  return memo('concrete:' + tint, () => {
    const S = 256;
    const base = hexToRgb(tint);
    const n = fbmFactory(64, 11, 6);
    const r = rng(42);
    const col = new Uint8ClampedArray(S * S * 4);
    const hgt = new Float32Array(S * S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const v = n(x * 0.05, y * 0.05);
      const sp = r() < 0.02 ? 0.85 : 1;
      const s = (0.84 + (v - 0.5) * 0.35) * sp;
      const i = y * S + x;
      col[i * 4] = base[0] * s; col[i * 4 + 1] = base[1] * s; col[i * 4 + 2] = base[2] * s; col[i * 4 + 3] = 255;
      hgt[i] = v;
    }
    const c = makeCanvas(S, S);
    const ctx = c.getContext('2d');
    ctx.putImageData(new ImageData(col, S, S), 0, 0);
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, S - 2, S - 2);
    return { map: toTexture(c), normalMap: heightToNormal(hgt, S, S, 1.5), meters: 3 };
  });
}

// ---------------------------------------------------------------- Hazard stripes
export function hazard(a = '#f4c20d', b = '#1c1c1c') {
  return memo('hazard:' + a + b, () => {
    const S = 128;
    const c = makeCanvas(S, S);
    const ctx = c.getContext('2d');
    ctx.fillStyle = a; ctx.fillRect(0, 0, S, S);
    ctx.fillStyle = b;
    for (let i = -2; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 64, 0); ctx.lineTo(i * 64 + 32, 0); ctx.lineTo(i * 64 + 32 + S, S); ctx.lineTo(i * 64 + S, S); ctx.closePath(); ctx.fill();
    }
    const r = rng(8);
    for (let k = 0; k < 40; k++) { ctx.fillStyle = `rgba(255,255,255,${r() * 0.08})`; ctx.fillRect(r() * S, r() * S, r() * 6, r() * 2); }
    return { map: toTexture(c), meters: 1 };
  });
}

// ---------------------------------------------------------------- Checkerboard (finish line)
export function checker() {
  return memo('checker', () => {
    const S = 128; const c = makeCanvas(S, S); const ctx = c.getContext('2d');
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { ctx.fillStyle = (x + y) % 2 ? '#111' : '#f5f5f5'; ctx.fillRect(x * 32, y * 32, 32, 32); }
    return { map: toTexture(c), meters: 1 };
  });
}

// ---------------------------------------------------------------- Chevron arrows (boost / jump markers)
export function chevrons(color = '#2f8bff', bg = null) {
  return memo('chev:' + color + bg, () => {
    const S = 256; const c = makeCanvas(S, S); const ctx = c.getContext('2d');
    if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, S, S); } else ctx.clearRect(0, 0, S, S);
    ctx.fillStyle = color; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 8;
    for (let k = 0; k < 2; k++) {
      const y = 40 + k * 120;
      ctx.beginPath(); ctx.moveTo(40, y + 70); ctx.lineTo(128, y); ctx.lineTo(216, y + 70); ctx.lineTo(176, y + 70); ctx.lineTo(128, y + 34); ctx.lineTo(80, y + 70); ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
    const t = toTexture(c);
    t.wrapS = THREE.ClampToEdgeWrapping;
    return { map: t };
  });
}

// ---------------------------------------------------------------- Rubber / bumper
export function rubber(color = '#2a2a2e') {
  return memo('rubber:' + color, () => {
    const S = 128; const base = hexToRgb(color); const n = fbmFactory(32, 4, 4);
    const col = new Uint8ClampedArray(S * S * 4); const hgt = new Float32Array(S * S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const v = n(x * 0.2, y * 0.2); const i = y * S + x; const s = 0.85 + v * 0.25;
      col[i * 4] = base[0] * s; col[i * 4 + 1] = base[1] * s; col[i * 4 + 2] = base[2] * s; col[i * 4 + 3] = 255; hgt[i] = v;
    }
    const c = makeCanvas(S, S); c.getContext('2d').putImageData(new ImageData(col, S, S), 0, 0);
    return { map: toTexture(c), normalMap: heightToNormal(hgt, S, S, 1.2) };
  });
}

// ---------------------------------------------------------------- Ice
export function ice() {
  return memo('ice', () => {
    const S = 256; const n = fbmFactory(64, 21, 5); const r = rng(3);
    const col = new Uint8ClampedArray(S * S * 4); const hgt = new Float32Array(S * S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const v = n(x * 0.03, y * 0.03); const i = y * S + x;
      col[i * 4] = 190 + v * 50; col[i * 4 + 1] = 225 + v * 30; col[i * 4 + 2] = 250; col[i * 4 + 3] = 255; hgt[i] = v * 0.4;
    }
    const c = makeCanvas(S, S); const ctx = c.getContext('2d'); ctx.putImageData(new ImageData(col, S, S), 0, 0);
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    for (let k = 0; k < 26; k++) { ctx.lineWidth = r() * 1.5; ctx.beginPath(); let x = r() * S, y = r() * S; ctx.moveTo(x, y); for (let j = 0; j < 5; j++) { x += (r() - 0.5) * 50; y += (r() - 0.5) * 50; ctx.lineTo(x, y); } ctx.stroke(); }
    return { map: toTexture(c), normalMap: heightToNormal(hgt, S, S, 1.5), meters: 3 };
  });
}

// ---------------------------------------------------------------- Mud / tar (sticky)
export function goo(color = '#5b3a1e') {
  return memo('goo:' + color, () => {
    const S = 256; const base = hexToRgb(color); const n = fbmFactory(64, 55, 5);
    const col = new Uint8ClampedArray(S * S * 4); const hgt = new Float32Array(S * S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const v = n(x * 0.04, y * 0.04); const i = y * S + x; const s = 0.6 + v * 0.7;
      col[i * 4] = base[0] * s; col[i * 4 + 1] = base[1] * s; col[i * 4 + 2] = base[2] * s; col[i * 4 + 3] = 255; hgt[i] = v;
    }
    const c = makeCanvas(S, S); c.getContext('2d').putImageData(new ImageData(col, S, S), 0, 0);
    return { map: toTexture(c), normalMap: heightToNormal(hgt, S, S, 4), meters: 3 };
  });
}

// ---------------------------------------------------------------- Conveyor belt
export function conveyorBelt() {
  return memo('belt', () => {
    const S = 256; const c = makeCanvas(S, S); const ctx = c.getContext('2d');
    ctx.fillStyle = '#26272b'; ctx.fillRect(0, 0, S, S);
    const hgt = new Float32Array(S * S);
    for (let k = 0; k < 8; k++) {
      ctx.fillStyle = '#3a3c42'; ctx.fillRect(0, k * 32, S, 6);
      for (let y = k * 32; y < k * 32 + 6; y++) for (let x = 0; x < S; x++) hgt[y * S + x] = 1;
    }
    ctx.fillStyle = 'rgba(255,200,40,0.85)';
    for (let k = 0; k < 2; k++) {
      const y = 60 + k * 128;
      ctx.beginPath(); ctx.moveTo(90, y + 30); ctx.lineTo(128, y); ctx.lineTo(166, y + 30); ctx.lineTo(150, y + 30); ctx.lineTo(128, y + 13); ctx.lineTo(106, y + 30); ctx.closePath(); ctx.fill();
    }
    return { map: toTexture(c), normalMap: heightToNormal(hgt, S, S, 2), meters: 2 };
  });
}

// ---------------------------------------------------------------- Ground textures
export function cityGround() {
  return memo('cityground', () => {
    const S = 1024; const c = makeCanvas(S, S); const ctx = c.getContext('2d');
    const n = fbmFactory(64, 9, 5);
    // block = 80 m, texture covers one block. Road of 14 m around edges.
    ctx.fillStyle = '#5d6066'; ctx.fillRect(0, 0, S, S);
    const road = Math.round(S * 14 / 80);
    // sidewalks
    ctx.fillStyle = '#a7a39b'; ctx.fillRect(road / 2, road / 2, S - road, S - road);
    // block interior: plaza / park mix
    ctx.fillStyle = '#8f8b84'; ctx.fillRect(road / 2 + 18, road / 2 + 18, S - road - 36, S - road - 36);
    ctx.fillStyle = '#6f8f4e'; ctx.fillRect(S * 0.55, S * 0.55, S * 0.3, S * 0.3);
    ctx.fillStyle = '#5d7d40';
    const r = rng(17);
    for (let k = 0; k < 18; k++) { ctx.beginPath(); ctx.arc(S * 0.57 + r() * S * 0.26, S * 0.57 + r() * S * 0.26, 6 + r() * 12, 0, Math.PI * 2); ctx.fill(); }
    // lane markings
    ctx.strokeStyle = 'rgba(240,240,230,0.8)'; ctx.lineWidth = 3; ctx.setLineDash([22, 22]);
    ctx.beginPath(); ctx.moveTo(0, road / 4); ctx.lineTo(S, road / 4); ctx.moveTo(road / 4, 0); ctx.lineTo(road / 4, S);
    ctx.moveTo(0, S - road / 4); ctx.lineTo(S, S - road / 4); ctx.moveTo(S - road / 4, 0); ctx.lineTo(S - road / 4, S); ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(245,200,40,0.8)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(S, 2); ctx.moveTo(2, 0); ctx.lineTo(2, S); ctx.stroke();
    // crosswalk
    ctx.fillStyle = 'rgba(240,240,240,0.75)';
    for (let k = 0; k < 8; k++) { ctx.fillRect(road / 2 + 6 + k * 14, 0, 8, road / 2 - 4); ctx.fillRect(0, road / 2 + 6 + k * 14, road / 2 - 4, 8); }
    // grime
    const img = ctx.getImageData(0, 0, S, S);
    for (let y = 0; y < S; y += 1) for (let x = 0; x < S; x += 1) {
      const v = (n(x * 0.02, y * 0.02) - 0.5) * 40; const i = (y * S + x) * 4;
      img.data[i] += v; img.data[i + 1] += v; img.data[i + 2] += v;
    }
    ctx.putImageData(img, 0, 0);
    return { map: toTexture(c), meters: 80 };
  });
}

export function naturalGround(kind) {
  return memo('ground:' + kind, () => {
    const S = 512; const n = fbmFactory(64, kind.length * 31, 6);
    const pal = {
      sand: [[226, 202, 160], [205, 178, 132]],
      snow: [[238, 242, 248], [196, 206, 222]],
      grass: [[98, 140, 70], [70, 108, 52]],
      factory: [[118, 118, 112], [88, 88, 84]],
      plaza: [[214, 206, 192], [190, 180, 166]],
      dirt: [[160, 128, 92], [128, 100, 72]],
    }[kind] || [[150, 150, 150], [120, 120, 120]];
    const col = new Uint8ClampedArray(S * S * 4);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const v = n(x * 0.02, y * 0.02); const i = y * S + x;
      for (let k = 0; k < 3; k++) col[i * 4 + k] = pal[0][k] * v + pal[1][k] * (1 - v);
      col[i * 4 + 3] = 255;
    }
    const c = makeCanvas(S, S); const ctx = c.getContext('2d'); ctx.putImageData(new ImageData(col, S, S), 0, 0);
    if (kind === 'factory') {
      ctx.strokeStyle = 'rgba(30,30,30,0.35)'; ctx.lineWidth = 2;
      for (let k = 0; k <= 8; k++) { ctx.beginPath(); ctx.moveTo(k * 64, 0); ctx.lineTo(k * 64, S); ctx.moveTo(0, k * 64); ctx.lineTo(S, k * 64); ctx.stroke(); }
      ctx.fillStyle = 'rgba(240,190,20,0.8)'; ctx.fillRect(0, 250, S, 12);
    }
    if (kind === 'plaza') {
      ctx.strokeStyle = 'rgba(120,110,100,0.35)'; ctx.lineWidth = 2;
      for (let k = 0; k <= 16; k++) { ctx.beginPath(); ctx.moveTo(k * 32, 0); ctx.lineTo(k * 32, S); ctx.moveTo(0, k * 32); ctx.lineTo(S, k * 32); ctx.stroke(); }
    }
    return { map: toTexture(c), meters: kind === 'factory' ? 16 : 24 };
  });
}

// Soft round sprite used for clouds, glows and particles.
export function softSprite(kind = 'cloud') {
  return memo('sprite:' + kind, () => {
    const S = 128; const c = makeCanvas(S, S); const ctx = c.getContext('2d');
    if (kind === 'cloud') {
      const r = rng(4);
      for (let k = 0; k < 16; k++) {
        const x = 30 + r() * 68, y = 40 + r() * 50, rad = 18 + r() * 26;
        const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
        g.addColorStop(0, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
      }
    } else if (kind === 'spark') {
      const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.15, 'rgba(255,255,220,0.9)'); g.addColorStop(0.4, 'rgba(255,220,120,0.25)'); g.addColorStop(1, 'rgba(255,200,80,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(62, 8, 4, 112); ctx.fillRect(8, 62, 112, 4);
    } else {
      const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
    }
    return { map: toTexture(c, true, false) };
  });
}

// ---------------------------------------------------------------- Coin face
export function coinFace() {
  return memo('coin', () => {
    const S = 256; const c = makeCanvas(S, S); const ctx = c.getContext('2d');
    const hgt = new Float32Array(S * S);
    ctx.fillStyle = '#ffc93a'; ctx.fillRect(0, 0, S, S);
    const g = ctx.createRadialGradient(100, 90, 10, 128, 128, 128);
    g.addColorStop(0, '#fff2a8'); g.addColorStop(0.6, '#ffc42e'); g.addColorStop(1, '#d88a0a');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(128, 128, 126, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#b86e06'; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(128, 128, 104, 0, Math.PI * 2); ctx.stroke();
    // star
    ctx.fillStyle = '#e09612';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5; const rr = i % 2 ? 30 : 70; ctx.lineTo(128 + Math.cos(a) * rr, 128 + Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill();
    const img = ctx.getImageData(0, 0, S, S);
    for (let i = 0; i < S * S; i++) { const r0 = img.data[i * 4]; const g0 = img.data[i * 4 + 1]; hgt[i] = (r0 + g0) / 510; }
    return { map: toTexture(c, true, false), normalMap: heightToNormal(hgt, S, S, 4) };
  });
}

// ---------------------------------------------------------------- Ball skins (equirectangular)
export function ballSkin(id) {
  return memo('ball:' + id, () => {
    const W = 1024, H = 512;
    const c = makeCanvas(W, H); const ctx = c.getContext('2d');
    let emissive = null, rough = null, normal = null;
    const n = fbmFactory(128, id.length * 101 + 7, 6);
    const pix = (fn) => {
      const img = ctx.createImageData(W, H);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const v = fn(x, y); const i = (y * W + x) * 4;
        img.data[i] = v[0]; img.data[i + 1] = v[1]; img.data[i + 2] = v[2]; img.data[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
    };
    const bolt = (cx, cy, s, color) => {
      ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
      ctx.fillStyle = color; ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-10, -60); ctx.lineTo(30, -60); ctx.lineTo(8, -12); ctx.lineTo(34, -12); ctx.lineTo(-22, 66); ctx.lineTo(-4, 6); ctx.lineTo(-30, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    };
    switch (id) {
      case 'wrecker': {
        pix((x, y) => { const v = n(x * 0.01, y * 0.02); const s = 28 + v * 30; return [s, s, s + 3]; });
        // painted bolt with worn edges
        bolt(256, 256, 1.5, '#f6d21c'); bolt(768, 256, 1.5, '#f6d21c');
        const r = rng(3);
        for (let k = 0; k < 400; k++) { ctx.fillStyle = `rgba(20,20,22,${r() * 0.6})`; ctx.fillRect(r() * W, r() * H, 1 + r() * 4, 1 + r() * 3); }
        ctx.strokeStyle = 'rgba(160,160,165,0.35)';
        for (let k = 0; k < 120; k++) { ctx.lineWidth = r(); ctx.beginPath(); const x = r() * W, y = r() * H; ctx.moveTo(x, y); ctx.lineTo(x + (r() - 0.5) * 40, y + (r() - 0.5) * 20); ctx.stroke(); }
        break;
      }
      case 'marble': {
        pix((x, y) => { const v = n(x * 0.004, y * 0.008); const vein = Math.pow(Math.abs(Math.sin((x * 0.01 + v * 12))), 0.15); const s = 200 + vein * 50; return [s, s - 4, s - 10]; });
        break;
      }
      case 'beach': {
        const cols = ['#e8322d', '#f8f8f2', '#2b74d9', '#f8f8f2', '#f5c518', '#f8f8f2'];
        for (let i = 0; i < 6; i++) { ctx.fillStyle = cols[i]; ctx.fillRect(i * W / 6, 0, W / 6 + 1, H); }
        ctx.fillStyle = '#f8f8f2'; ctx.fillRect(0, 0, W, 34); ctx.fillRect(0, H - 34, W, 34);
        break;
      }
      case 'lava': {
        const e = makeCanvas(W, H); const ex = e.getContext('2d'); const img = ex.createImageData(W, H);
        pix((x, y) => {
          const v = n(x * 0.008, y * 0.016); const crack = Math.abs(v - 0.5) < 0.035 ? 1 : 0;
          const i = (y * W + x) * 4; const g = crack ? 1 : Math.max(0, 0.06 - Math.abs(v - 0.5)) * 6;
          img.data[i] = 255 * Math.min(1, g * 1.2); img.data[i + 1] = 110 * g; img.data[i + 2] = 20 * g; img.data[i + 3] = 255;
          const s = 30 + v * 25; return crack ? [255, 120, 30] : [s + 6, s, s - 4];
        });
        ex.putImageData(img, 0, 0); emissive = toTexture(e);
        break;
      }
      case 'planet': {
        pix((x, y) => {
          const v = n(x * 0.006, y * 0.012); const lat = Math.abs(y / H - 0.5) * 2;
          if (lat > 0.86) return [235, 240, 248];
          if (v > 0.53) { const t = (v - 0.53) * 6; return [70 + t * 90, 130 - t * 20, 60 + t * 20]; }
          return [20 + v * 40, 70 + v * 80, 150 + v * 80];
        });
        break;
      }
      case 'neon': {
        ctx.fillStyle = '#0a0b16'; ctx.fillRect(0, 0, W, H);
        const e = makeCanvas(W, H); const ex = e.getContext('2d'); ex.fillStyle = '#000'; ex.fillRect(0, 0, W, H);
        for (const g of [ctx, ex]) {
          g.strokeStyle = '#19f6ff'; g.lineWidth = 6;
          for (let i = 0; i <= 16; i++) { g.beginPath(); g.moveTo(i * W / 16, 0); g.lineTo(i * W / 16, H); g.stroke(); }
          g.strokeStyle = '#ff2bd6';
          for (let i = 1; i < 8; i++) { g.beginPath(); g.moveTo(0, i * H / 8); g.lineTo(W, i * H / 8); g.stroke(); }
        }
        emissive = toTexture(e);
        break;
      }
      case 'bowling': {
        pix((x, y) => { const v = n(x * 0.004, y * 0.01); const sw = Math.sin(x * 0.02 + v * 14) * 0.5 + 0.5; return [60 + sw * 70, 20 + sw * 30, 110 + sw * 90]; });
        ctx.fillStyle = '#0c0614';
        for (const [x, y, r] of [[480, 200, 22], [540, 200, 22], [510, 270, 26]]) { ctx.beginPath(); ctx.ellipse(x, y, r, r * 1.6, 0, 0, Math.PI * 2); ctx.fill(); }
        break;
      }
      case 'eight': {
        ctx.fillStyle = '#121214'; ctx.fillRect(0, 0, W, H);
        for (const cx of [256, 768]) {
          ctx.fillStyle = '#f4f4f0'; ctx.beginPath(); ctx.ellipse(cx, 256, 84, 140, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#121214'; ctx.font = 'bold 150px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('8', cx, 262);
        }
        break;
      }
      case 'melon': {
        pix((x, y) => { const v = n(x * 0.01, y * 0.004); const s = Math.sin(x / W * Math.PI * 2 * 9 + v * 3); return s > 0.15 ? [40, 110 + v * 30, 40] : [130 + v * 30, 190, 90]; });
        break;
      }
      case 'candy': {
        pix((x, y) => { const s = Math.sin((x / W * 6 + y / H * 3) * Math.PI * 2); return s > 0 ? [255, 110, 170] : [255, 245, 250]; });
        break;
      }
      case 'camo': {
        const n2 = fbmFactory(64, 999, 4);
        pix((x, y) => { const v = n(x * 0.01, y * 0.02), w = n2(x * 0.012, y * 0.024); if (v > 0.56) return [56, 64, 38]; if (w > 0.55) return [120, 100, 64]; if (v < 0.42) return [30, 34, 26]; return [92, 108, 66]; });
        break;
      }
      case 'gold': {
        pix((x, y) => { const v = n(x * 0.03, y * 0.06); const s = 0.85 + v * 0.3; return [255 * s, 196 * s, 70 * s]; });
        break;
      }
      case 'disco': {
        ctx.fillStyle = '#c9ccd4'; ctx.fillRect(0, 0, W, H);
        const r = rng(12); const hgt = new Float32Array(W * H);
        const tiles = 48, rows = 24;
        for (let j = 0; j < rows; j++) for (let i = 0; i < tiles; i++) {
          const s = 150 + r() * 105; ctx.fillStyle = `rgb(${s},${s},${s + 8})`;
          ctx.fillRect(i * W / tiles + 1, j * H / rows + 1, W / tiles - 2, H / rows - 2);
          const tilt = r();
          for (let y = Math.floor(j * H / rows); y < (j + 1) * H / rows; y++) for (let x = Math.floor(i * W / tiles); x < (i + 1) * W / tiles; x++) hgt[y * W + x] = tilt * ((x % (W / tiles)) / (W / tiles));
        }
        normal = heightToNormal(hgt, W, H, 2);
        break;
      }
      default: {
        pix((x, y) => { const v = n(x * 0.02, y * 0.04); const s = 200 + v * 40; return [s, s, s]; });
      }
    }
    const map = toTexture(c, true, true);
    map.wrapT = THREE.ClampToEdgeWrapping;
    return { map, emissiveMap: emissive, roughnessMap: rough, normalMap: normal };
  });
}
