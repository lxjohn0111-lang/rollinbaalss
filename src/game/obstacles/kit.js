// Shared helpers for obstacle builders.
import * as THREE from 'three';

export const W = 5; // standard track width
export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, k) => a + (b - a) * k;
export const smooth = (k) => k * k * (3 - 2 * k);

// Text texture for banners/signs.
const texCache = new Map();
export function textTexture(text, { bg = '#1b1d24', fg = '#ffffff', accent = '#ffcf33', w = 512, h = 128, stripes = false } = {}) {
  const key = [text, bg, fg, accent, w, h, stripes].join('|');
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, w, h);
  if (stripes) {
    for (let i = 0; i < w / 32 + 2; i++) { x.fillStyle = i % 2 ? '#111' : '#f5f5f5'; x.fillRect(i * 32, 0, 32, 18); x.fillRect(i * 32 + 16, h - 18, 32, 18); x.fillStyle = i % 2 ? '#f5f5f5' : '#111'; x.fillRect(i * 32 + 16, 0, 16, 18); }
  } else {
    x.fillStyle = accent; x.fillRect(0, 0, w, 10); x.fillRect(0, h - 10, w, 10);
  }
  x.font = `${Math.round(h * 0.52)}px "Lilita One", "Arial Black", Impact, sans-serif`;
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.lineWidth = 8; x.strokeStyle = 'rgba(0,0,0,0.55)'; x.strokeText(text, w / 2, h / 2 + 4);
  x.fillStyle = fg; x.fillText(text, w / 2, h / 2 + 4);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  texCache.set(key, t);
  return t;
}

const matCache = new Map();
function textMat(text, opts) {
  const key = text + JSON.stringify(opts || {});
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ map: textTexture(text, opts), roughness: 0.5, emissive: 0xffffff, emissiveMap: textTexture(text, opts), emissiveIntensity: 0.25 }));
  return matCache.get(key);
}

// Gantry arch across the track with a text banner (visual only, posts collide).
export function arch(B, d, w, text, opts = {}) {
  const h = opts.h || 5.2, postMat = opts.postMat || B.m.darkSteel;
  const hw = w / 2 + 0.6;
  B.box(-hw, h / 2 - 0.3, d, 0.5, h + 0.6, 0.5, postMat, { collide: !opts.noCollide });
  B.box(hw, h / 2 - 0.3, d, 0.5, h + 0.6, 0.5, postMat, { collide: !opts.noCollide });
  B.box(0, h, d, w + 2, 0.4, 0.5, postMat, { collide: false });
  if (text) {
    const m = textMat(text, opts.text);
    const geo = new THREE.PlaneGeometry(w + 1.4, (w + 1.4) / 4);
    const front = new THREE.Mesh(geo, m); front.position.set(0, h + 0.75, -d + 0.27); front.rotation.y = Math.PI;
    const back = new THREE.Mesh(geo, m); back.position.set(0, h + 0.75, -d - 0.27);
    // front faces the approaching camera (camera looks toward -z, so face +z)
    front.rotation.y = 0;
    back.rotation.y = Math.PI;
    B.group.add(front, back);
    const panel = B.box(0, h + 0.75, d, w + 1.5, (w + 1.4) / 4 + 0.15, 0.5, B.m.dark, { collide: false });
    void panel;
  }
  // lamps on top
  if (opts.lamps !== false) for (const s of [-1, 1]) B.box(s * hw, h + 0.5, d, 0.35, 0.35, 0.35, opts.lampMat || B.m.glow, { collide: false, cast: false });
}

// Painted arrows on the deck surface (decal).
export function arrows(B, x, d, w, l, mat, y = 0.012) {
  const geo = new THREE.PlaneGeometry(w, l);
  const m = new THREE.Mesh(geo, mat || B.m.arrowBlue);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y, -d);
  m.receiveShadow = true;
  B.group.add(m); B.extraMeshes.push(m);
  return m;
}

// Low decorative + collidable guard posts with a top rail (used for safety barriers).
export function guardRail(B, x, d0, d1, o = {}) {
  const h = o.h || 0.7;
  B.box(x, h / 2, (d0 + d1) / 2, 0.16, h, d1 - d0, o.mat || B.m.rail, { collide: true });
  for (let d = d0; d <= d1 + 0.01; d += o.step || 3) B.box(x, h * 0.5, d, 0.24, h + 0.12, 0.24, B.m.darkSteel, { collide: false });
}

// Standard entry/exit pad.
export function pad(B, d0, d1, w = W, o = {}) { return B.deck(0, d0, d1, w, o); }

// Lane planner helper: build a danger function from a list of moving segment hazards.
export function segDist(px, pz, ax, az, bx, bz) {
  const vx = bx - ax, vz = bz - az; const wx = px - ax, wz = pz - az;
  const L = vx * vx + vz * vz; let t = L > 0 ? (wx * vx + wz * vz) / L : 0; t = clamp(t, 0, 1);
  const dx = px - (ax + vx * t), dz = pz - (az + vz * t);
  return Math.sqrt(dx * dx + dz * dz);
}

// Spinning hazard-striped end caps etc.
export function hazardCap(B, mover, x, y, d, r, axis) {
  return (mover || B).cyl(x, y, d, r, 0.25, axis, B.m.hazard, { collide: false });
}

export function speedOf(B) { return B.course.baseSpeed || 10; }
