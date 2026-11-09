// Course: an ordered chain of track sections built from the obstacle library.
// Provides the SectionBuilder toolkit used by every obstacle, the centre-line path used for
// steering/camera/progress, coins, gems, checkpoints, supports and physics bookkeeping.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { R, Physics } from '../core/physics.js';
import { MaterialLib, boxUV } from '../gfx/materials.js';
import { Environment, THEMES } from '../gfx/environments.js';
import { rng as makeRng } from '../gfx/textures.js';

const UP = new THREE.Vector3(0, 1, 0);
const _v = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _m = new THREE.Matrix4();
const _e = new THREE.Euler();

// ------------------------------------------------------------------ Path
export class PathTrack {
  constructor() {
    this.p = []; this.t = []; this.r = []; this.s = []; this.sec = [];
    this.length = 0;
  }
  push(pos, sec) {
    const n = this.p.length;
    if (n > 0) {
      const d = pos.distanceTo(this.p[n - 1]);
      if (d < 0.25) return;
      this.length += d;
    }
    this.p.push(pos.clone()); this.s.push(this.length); this.sec.push(sec);
    this.t.push(new THREE.Vector3(0, 0, -1)); this.r.push(new THREE.Vector3(1, 0, 0));
    this._fixTangent(n); if (n > 0) this._fixTangent(n - 1);
  }
  _fixTangent(i) {
    const n = this.p.length;
    const a = this.p[Math.max(0, i - 1)], b = this.p[Math.min(n - 1, i + 1)];
    const t = this.t[i].subVectors(b, a); t.y = 0;
    if (t.lengthSq() < 1e-6) t.set(0, 0, -1);
    t.normalize();
    this.r[i].crossVectors(t, UP).normalize();
  }
  get count() { return this.p.length; }
  // nearest sample index near a guess
  nearest(pos, guess = 0, win = 60) {
    const n = this.p.length; if (!n) return 0;
    let best = -1, bd = Infinity;
    const a = Math.max(0, guess - win), b = Math.min(n - 1, guess + win * 2);
    for (let i = a; i <= b; i++) {
      const p = this.p[i]; const dx = p.x - pos.x, dy = (p.y - pos.y) * 0.35, dz = p.z - pos.z;
      const d = dx * dx + dy * dy + dz * dz;
      if (d < bd) { bd = d; best = i; }
    }
    if (bd > 400) { // lost: global search
      for (let i = 0; i < n; i++) { const p = this.p[i]; const dx = p.x - pos.x, dy = (p.y - pos.y) * 0.35, dz = p.z - pos.z; const d = dx * dx + dy * dy + dz * dz; if (d < bd) { bd = d; best = i; } }
    }
    return best;
  }
  indexAtS(s, guess = 0) {
    const n = this.s.length; let i = Math.max(0, Math.min(n - 1, guess));
    while (i < n - 1 && this.s[i + 1] < s) i++;
    while (i > 0 && this.s[i] > s) i--;
    return i;
  }
  // interpolated sample at arc length s
  sampleAt(s, out = {}, guess = 0) {
    const i = this.indexAtS(s, guess); const j = Math.min(this.p.length - 1, i + 1);
    const span = Math.max(1e-6, this.s[j] - this.s[i]);
    const k = Math.max(0, Math.min(1, (s - this.s[i]) / span));
    out.p = (out.p || new THREE.Vector3()).lerpVectors(this.p[i], this.p[j], k);
    out.t = (out.t || new THREE.Vector3()).lerpVectors(this.t[i], this.t[j], k).normalize();
    out.r = (out.r || new THREE.Vector3()).crossVectors(out.t, UP).normalize();
    out.i = i; out.sec = this.sec[i];
    return out;
  }
  // continuous arc position of a world point (projected onto the segment around index)
  project(pos, i) {
    const n = this.p.length;
    const a = this.p[i];
    let s = this.s[i];
    const t = this.t[i];
    const dx = pos.x - a.x, dz = pos.z - a.z;
    const along = dx * t.x + dz * t.z;
    s += along;
    const lat = dx * this.r[i].x + dz * this.r[i].z;
    return { s: Math.max(0, Math.min(this.length, s)), lat, y: a.y, i: Math.min(n - 1, i) };
  }
}

// ------------------------------------------------------------------ Coins
export class CoinSystem {
  constructor(course, cap = 1200) {
    this.course = course; this.cap = cap;
    const g = new THREE.CylinderGeometry(0.34, 0.34, 0.08, 28, 1);
    g.rotateX(Math.PI / 2);
    const m = course.mats;
    this.mesh = new THREE.InstancedMesh(g, [m.coinEdge, m.coin, m.coin], cap);
    this.mesh.castShadow = true;
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.pos = new Float32Array(cap * 3);
    this.state = new Uint8Array(cap); // 0 free, 1 active, 2 collecting
    this.ct = new Float32Array(cap);
    this.owner = new Int32Array(cap);
    this.free = [];
    this.top = 0;
    this.total = 0;
    course.root.add(this.mesh);
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3(); this._p = new THREE.Vector3();
    this._zero = new THREE.Matrix4().makeScale(0, 0, 0);
  }
  add(p, owner) {
    let id = this.free.length ? this.free.pop() : this.top++;
    if (id >= this.cap) return -1;
    this.pos[id * 3] = p.x; this.pos[id * 3 + 1] = p.y; this.pos[id * 3 + 2] = p.z;
    this.state[id] = 1; this.owner[id] = owner; this.ct[id] = 0;
    this.total++;
    if (id + 1 > this.mesh.count) this.mesh.count = id + 1;
    return id;
  }
  releaseOwner(owner) {
    for (let i = 0; i < this.top; i++) if (this.owner[i] === owner && this.state[i] !== 0) { this.state[i] = 0; this.free.push(i); this.mesh.setMatrixAt(i, this._zero); }
  }
  update(t, dt, ball, onCollect) {
    const bx = ball.x, by = ball.y, bz = ball.z;
    const rot = t * 3.2;
    for (let i = 0; i < this.top; i++) {
      const st = this.state[i];
      if (st === 0) continue;
      const x = this.pos[i * 3], y = this.pos[i * 3 + 1], z = this.pos[i * 3 + 2];
      if (st === 1) {
        const dx = x - bx, dy = y - by, dz = z - bz;
        if (dx * dx + dy * dy + dz * dz < 0.95 * 0.95) { this.state[i] = 2; this.ct[i] = 0; onCollect && onCollect(i, x, y, z); }
        else if (dx * dx + dz * dz > 160 * 160) { this.mesh.setMatrixAt(i, this._zero); continue; }
        this._q.setFromAxisAngle(UP, rot + x * 0.3 + z * 0.3);
        this._p.set(x, y + Math.sin(t * 3 + i) * 0.07, z); this._s.set(1, 1, 1);
      } else {
        this.ct[i] += dt;
        const k = this.ct[i] / 0.28;
        if (k >= 1) { this.state[i] = 3; this.mesh.setMatrixAt(i, this._zero); continue; }
        this._q.setFromAxisAngle(UP, rot * 4);
        this._p.set(x, y + k * 1.4, z); const sc = 1 + k * 0.6 - k * k * 1.4; this._s.set(sc, sc, sc);
      }
      if (st === 3) continue;
      this._m.compose(this._p, this._q, this._s);
      this.mesh.setMatrixAt(i, this._m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
  activeIn(owner) { let n = 0; for (let i = 0; i < this.top; i++) if (this.owner[i] === owner && this.state[i] === 1) n++; return n; }
}

// ------------------------------------------------------------------ Supports (instanced pylons under the deck)
class SupportSystem {
  constructor(course, style, cap = 900) {
    this.course = course; this.style = style; this.cap = cap; this.n = 0;
    if (style === 'none') return;
    let geo, mat;
    if (style === 'concrete') {
      const a = new THREE.CylinderGeometry(0.75, 0.95, 1, 16); a.translate(0, 0.5, 0);
      geo = a; mat = course.mats.concrete;
    } else if (style === 'wood') {
      const parts = [new THREE.BoxGeometry(0.45, 1, 0.45).translate(-0.9, 0.5, 0), new THREE.BoxGeometry(0.45, 1, 0.45).translate(0.9, 0.5, 0), new THREE.BoxGeometry(0.35, 1, 0.35).translate(0, 0.5, 0.7)];
      geo = mergeGeometries(parts); parts.forEach((g) => g.dispose());
      mat = course.mats.deckSide;
    } else {
      const parts = [new THREE.BoxGeometry(0.9, 1, 0.18).translate(0, 0.5, 0), new THREE.BoxGeometry(0.18, 1, 0.9).translate(0, 0.5, 0)];
      geo = mergeGeometries(parts); parts.forEach((g) => g.dispose());
      mat = course.mats.darkSteel;
    }
    this.mesh = new THREE.InstancedMesh(geo, mat, cap);
    this.mesh.count = 0; this.mesh.castShadow = true; this.mesh.receiveShadow = true; this.mesh.frustumCulled = false;
    this.owner = new Int32Array(cap).fill(-1);
    course.root.add(this.mesh);
    this._m = new THREE.Matrix4();
  }
  add(x, top, z, owner, yaw = 0) {
    if (!this.mesh) return;
    let i = -1;
    for (let k = 0; k < this.n; k++) if (this.owner[k] === -2) { i = k; break; }
    if (i < 0) { if (this.n >= this.cap) return; i = this.n++; }
    const env = this.course.env;
    const ground = env.heightAt ? env.heightAt(x, z) : 0;
    const h = top - ground; if (h <= 0.5) return;
    _q.setFromAxisAngle(UP, yaw);
    this._m.compose(_v.set(x, ground, z), _q, new THREE.Vector3(1, h, 1));
    this.mesh.setMatrixAt(i, this._m);
    this.owner[i] = owner;
    this.mesh.count = this.n;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
  releaseOwner(owner) {
    if (!this.mesh) return;
    const z = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let k = 0; k < this.n; k++) if (this.owner[k] === owner) { this.owner[k] = -2; this.mesh.setMatrixAt(k, z); }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// ------------------------------------------------------------------ Mover (kinematic group)
class Mover {
  constructor(B, x, y, d, parentObj) {
    this.B = B;
    this.obj = new THREE.Group();
    this.obj.position.set(x, y, -d);
    (parentObj || B.group).add(this.obj);
    this.obj.updateMatrixWorld(true);
    this.obj.matrixWorld.decompose(_v, _q, new THREE.Vector3());
    this.body = B.phys.kinematicBody(_v, _q);
    this.prev = this.obj.matrixWorld.clone();
    this.cur = this.obj.matrixWorld.clone();
    this.inv = new THREE.Matrix4();
    this.colliders = [];
    this.enabled = true;
    B.movers.push(this);
  }
  box(x, y, d, w, h, l, mat, o = {}) { return this.B.box(x, y, d, w, h, l, mat, { ...o, mover: this }); }
  cyl(x, y, d, r, len, axis, mat, o = {}) { return this.B.cyl(x, y, d, r, len, axis, mat, { ...o, mover: this }); }
  pipe(a, b, r, mat, o = {}) { return this.B.pipe(a, b, r, mat, { ...o, mover: this }); }
  sphere(x, y, d, r, mat, o = {}) { return this.B.sphere(x, y, d, r, mat, { ...o, mover: this }); }
  mesh(geo, mat, x, y, d, o = {}) { return this.B.mesh(geo, mat, x, y, d, { ...o, mover: this }); }
  sync(dt, teleport = false) {
    this.prev.copy(this.cur);
    this.obj.updateMatrixWorld(true);
    this.cur.copy(this.obj.matrixWorld);
    this.cur.decompose(_v, _q, new THREE.Vector3());
    if (teleport) {
      this.body.setTranslation({ x: _v.x, y: _v.y, z: _v.z }, true);
      this.body.setRotation({ x: _q.x, y: _q.y, z: _q.z, w: _q.w }, true);
      this.prev.copy(this.cur);
    } else {
      this.body.setNextKinematicTranslation({ x: _v.x, y: _v.y, z: _v.z });
      this.body.setNextKinematicRotation({ x: _q.x, y: _q.y, z: _q.z, w: _q.w });
    }
    this.dt = dt;
  }
  // velocity of a world point attached to this mover
  pointVelocity(p, out) {
    if (!this.dt) return out.set(0, 0, 0);
    this.inv.copy(this.prev).invert();
    out.copy(p).applyMatrix4(this.inv).applyMatrix4(this.cur).sub(p).divideScalar(this.dt);
    return out;
  }
  setCollidable(on) {
    if (this.enabled === on) return;
    this.enabled = on;
    const n = this.body.numColliders();
    for (let i = 0; i < n; i++) this.body.collider(i).setEnabled(on);
  }
}

// ------------------------------------------------------------------ Section builder
export class SectionBuilder {
  constructor(course, frame, def, index, obstacle) {
    this.course = course; this.def = def; this.index = index; this.ob = obstacle;
    this.m = course.mats; this.phys = course.physics; this.R = R;
    this.rng = makeRng((def.seed ?? index * 7919 + 17) >>> 0);
    this.p = def.params || {};
    this.origin = frame.pos.clone(); this.yaw = frame.yaw;
    this.group = new THREE.Group();
    this.group.position.copy(this.origin); this.group.rotation.y = this.yaw;
    this.group.name = 'section:' + def.type;
    course.root.add(this.group);
    this.group.updateMatrixWorld(true);
    this.quat = new THREE.Quaternion().setFromAxisAngle(UP, this.yaw);
    this.body = this.phys.fixedBody(this.origin, this.quat);
    this.statics = []; this.movers = []; this.dyns = []; this.sets = []; this.updaters = []; this.resetters = []; this.joints = [];
    this.pathPts = []; this.coinIds = []; this.gems = [];
    this.exitLocal = { x: 0, y: 0, d: 0, h: 0 };
    this.jump = !!obstacle.jump;
    this.cam = null; this.hint = null; this.speedMul = 1;
    this.extraMeshes = [];
    this.triggers = [];
    this.audioTag = null;
    this.disposables = [];
  }

  // local (x right, y up, d forward) -> three local vector
  V(x, y, d) { return new THREE.Vector3(x, y, -d); }
  W(x, y, d) { return this.V(x, y, d).applyMatrix4(this.group.matrixWorld); }
  dirW(x, d) { return new THREE.Vector3(x, 0, -d).normalize().applyQuaternion(this.quat); }

  _attach(mesh, o) {
    mesh.castShadow = o.cast !== false; mesh.receiveShadow = true;
    if (o.mover) { o.mover.obj.add(mesh); }
    else if (o.parent) { o.parent.add(mesh); }
    else if (o.merge === false || o.dynamicVisual) { this.group.add(mesh); this.extraMeshes.push(mesh); }
    else { this.group.add(mesh); this.statics.push(mesh); }
    return mesh;
  }

  _info(o) {
    if (!o.surface && !o.mover && !o.info) return null;
    const info = { section: this.index };
    if (o.surface) Object.assign(info, o.surface);
    if (o.info) Object.assign(info, o.info);
    if (o.mover) info.mover = o.mover;
    return info;
  }

  _collider(desc, mesh, o) {
    if (o.collide === false) return null;
    const pos = mesh.position, q = mesh.quaternion;
    desc.setTranslation(pos.x, pos.y, pos.z).setRotation({ x: q.x, y: q.y, z: q.z, w: q.w });
    desc.setFriction(o.friction ?? 0.9).setRestitution(o.restitution ?? 0.05);
    if (o.sensor) desc.setSensor(true);
    const body = o.mover ? o.mover.body : this.body;
    const c = this.phys.addCollider(desc, body, this._info(o));
    if (o.mover) o.mover.colliders.push(c);
    return c;
  }

  box(x, y, d, w, h, l, mat, o = {}) {
    const geo = new THREE.BoxGeometry(w, h, l);
    boxUV(geo, o.uv || mat.userData.uvMeters || 2, o.uvOffset || 0);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, -d);
    if (o.rx || o.ry || o.rz) mesh.rotation.set(o.rx || 0, o.ry || 0, o.rz || 0, o.order || 'XYZ');
    this._attach(mesh, o);
    mesh.updateMatrix();
    const c = this._collider(R.ColliderDesc.cuboid(w / 2, h / 2, l / 2), mesh, o);
    mesh.userData.collider = c;
    return mesh;
  }

  // Cylinder whose axis is 'x', 'y' or 'z' (z = forward)
  cyl(x, y, d, r, len, axis, mat, o = {}) {
    const geo = new THREE.CylinderGeometry(o.r2 ?? r, r, len, o.seg || 20, 1, !!o.open);
    if (o.uv !== false) { const uv = geo.attributes.uv; const m = mat.userData.uvMeters || 2; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.max(1, Math.round(2 * Math.PI * r / m)), uv.getY(i) * len / m); }
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, -d);
    if (axis === 'x') mesh.rotation.z = Math.PI / 2;
    else if (axis === 'z') mesh.rotation.x = Math.PI / 2;
    if (o.rx || o.ry || o.rz) { const e = new THREE.Quaternion().setFromEuler(new THREE.Euler(o.rx || 0, o.ry || 0, o.rz || 0)); mesh.quaternion.premultiply(e); }
    this._attach(mesh, o);
    mesh.updateMatrix();
    const desc = o.capsule ? R.ColliderDesc.capsule(len / 2, r) : (o.r2 != null && o.r2 !== r ? R.ColliderDesc.cone(len / 2, Math.max(r, o.r2)) : R.ColliderDesc.cylinder(len / 2, r));
    const c = this._collider(desc, mesh, o);
    mesh.userData.collider = c;
    return mesh;
  }

  // pipe between two local points [x,y,d]
  pipe(a, b, r, mat, o = {}) {
    const A = this.V(...a), Bv = this.V(...b);
    const len = A.distanceTo(Bv);
    const geo = new THREE.CylinderGeometry(r, r, len, o.seg || 18, 1, false);
    const uv = geo.attributes.uv; const mm = mat.userData.uvMeters || 2; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i), uv.getY(i) * len / mm);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(A).add(Bv).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(UP, _v.copy(Bv).sub(A).normalize());
    this._attach(mesh, o);
    mesh.updateMatrix();
    const c = this._collider(R.ColliderDesc.capsule(len / 2, r), mesh, o);
    if (o.caps !== false && o.collide !== false) {
      for (const P of [A, Bv]) { const s = new THREE.Mesh(new THREE.SphereGeometry(r, o.seg || 18, 10), mat); s.position.copy(P); this._attach(s, o); }
    }
    mesh.userData.collider = c;
    return mesh;
  }

  sphere(x, y, d, r, mat, o = {}) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, o.seg || 24, o.seg2 || 16), mat);
    mesh.position.set(x, y, -d);
    this._attach(mesh, o);
    mesh.updateMatrix();
    this._collider(R.ColliderDesc.ball(r), mesh, o);
    return mesh;
  }

  // Arbitrary visual mesh (collider optional via o.hull: convex hull of geometry)
  mesh(geo, mat, x, y, d, o = {}) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, -d);
    if (o.rx || o.ry || o.rz) mesh.rotation.set(o.rx || 0, o.ry || 0, o.rz || 0);
    if (o.scale) mesh.scale.setScalar(o.scale);
    this._attach(mesh, { collide: false, ...o });
    mesh.updateMatrix();
    if (o.hull) {
      const pts = geo.attributes.position.array;
      const desc = R.ColliderDesc.convexHull(new Float32Array(pts));
      if (desc) this._collider(desc, mesh, o);
    } else if (o.trimesh) {
      const pos = geo.attributes.position.array; const idx = geo.index ? geo.index.array : null;
      const indices = idx ? new Uint32Array(idx) : new Uint32Array(pos.length / 3).map((_, i) => i);
      this._collider(R.ColliderDesc.trimesh(new Float32Array(pos), indices), mesh, o);
    }
    return mesh;
  }

  // Flat deck with top surface at y (default 0), spanning d0..d1, centred at x.
  deck(x, d0, d1, w, o = {}) {
    const y = o.y || 0, th = o.th || 0.5;
    const mat = o.mat || this.m.deck;
    const top = this.box(x, y - th / 2, (d0 + d1) / 2, w, th, d1 - d0 + (o.overlap ?? 0.04), mat, o);
    if (o.trim !== false && w > 1.2) {
      // darker structural beam underneath and edge trims
      this.box(x, y - th - 0.25, (d0 + d1) / 2, Math.max(0.6, w * 0.55), 0.5, d1 - d0, this.m.deckSide, { collide: false, mover: o.mover, cast: false });
    }
    if (o.edges) {
      const em = o.edgeMat || this.m.rail;
      this.box(x - w / 2 + 0.06, y + 0.02, (d0 + d1) / 2, 0.12, 0.08, d1 - d0, em, { collide: false, mover: o.mover, cast: false });
      this.box(x + w / 2 - 0.06, y + 0.02, (d0 + d1) / 2, 0.12, 0.08, d1 - d0, em, { collide: false, mover: o.mover, cast: false });
    }
    if (o.support !== false && !o.mover && (d1 - d0) > 3) {
      const step = o.supportStep || 16;
      for (let dd = d0 + Math.min(step / 2, (d1 - d0) / 2); dd < d1; dd += step) this.support(x, dd, y - th - 0.5);
    }
    return top;
  }

  // Side wall along d (for half-pipes, guard rails)
  wall(x, d0, d1, h, o = {}) {
    const t = o.t || 0.25;
    return this.box(x, (o.y || 0) + h / 2, (d0 + d1) / 2, t, h, d1 - d0, o.mat || this.m.rail, o);
  }

  // Ribbon: a swept deck along fn(u) -> {x, y, d, h (heading, +right), bank, w}
  ribbon(fn, steps, w, th, mat, o = {}) {
    const top = [], bot = [], nrmTop = [];
    let arc = 0; let prev = null;
    const cs = [];
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const c = fn(u);
      const h = c.h || 0, bank = c.bank || 0, ww = (c.w ?? w) / 2;
      const C = new THREE.Vector3(c.x, c.y, -c.d);
      const f = new THREE.Vector3(Math.sin(h), 0, -Math.cos(h));
      const pitchDir = prev ? _v.copy(C).sub(prev.C) : null;
      if (pitchDir && pitchDir.lengthSq() > 1e-8) f.copy(pitchDir).normalize();
      const rgt = new THREE.Vector3(Math.cos(h), 0, Math.sin(h));
      const up = new THREE.Vector3().crossVectors(rgt, f).normalize();
      const rB = rgt.clone().multiplyScalar(Math.cos(bank)).addScaledVector(up, -Math.sin(bank));
      const uB = up.clone().multiplyScalar(Math.cos(bank)).addScaledVector(rgt, Math.sin(bank));
      if (prev) arc += C.distanceTo(prev.C);
      prev = { C };
      const L = C.clone().addScaledVector(rB, -ww), Rr = C.clone().addScaledVector(rB, ww);
      top.push(L, Rr); bot.push(L.clone().addScaledVector(uB, -th), Rr.clone().addScaledVector(uB, -th));
      nrmTop.push(uB);
      cs.push({ C, rB, uB, arc, ww, c });
    }
    // fix first forward dir (we used heading for first sample)
    const pos = [], uv = [], idx = [];
    const mm = mat.userData.uvMeters || 2;
    const quad = (a, b, c, d, ua, ub, uc, ud) => {
      const base = pos.length / 3;
      for (const P of [a, b, c, d]) pos.push(P.x, P.y, P.z);
      uv.push(...ua, ...ub, ...uc, ...ud);
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    };
    for (let i = 0; i < steps; i++) {
      const a0 = cs[i], a1 = cs[i + 1];
      const TL0 = top[i * 2], TR0 = top[i * 2 + 1], TL1 = top[i * 2 + 2], TR1 = top[i * 2 + 3];
      const BL0 = bot[i * 2], BR0 = bot[i * 2 + 1], BL1 = bot[i * 2 + 2], BR1 = bot[i * 2 + 3];
      const v0 = a0.arc / mm, v1 = a1.arc / mm;
      // top (counter-clockwise seen from above): TL0, TR0, TR1, TL1  -> forward is -z
      quad(TL0, TR0, TR1, TL1, [-a0.ww / mm, v0], [a0.ww / mm, v0], [a1.ww / mm, v1], [-a1.ww / mm, v1]);
      quad(BR0, BL0, BL1, BR1, [0, v0], [1, v0], [1, v1], [0, v1]);
      quad(BL0, TL0, TL1, BL1, [0, v0], [th / mm, v0], [th / mm, v1], [0, v1]);
      quad(TR0, BR0, BR1, TR1, [0, v0], [th / mm, v0], [th / mm, v1], [0, v1]);
    }
    // end caps
    quad(bot[0], bot[1], top[1], top[0], [0, 0], [1, 0], [1, 1], [0, 1]);
    const n = steps * 2;
    quad(bot[n + 1], bot[n], top[n], top[n + 1], [0, 0], [1, 0], [1, 1], [0, 1]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    // ensure top faces point upward: if not, flip winding
    const nr = geo.attributes.normal;
    if (nr.getY(0) < 0) {
      for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
      geo.setIndex(idx); geo.computeVertexNormals();
    }
    const mesh = new THREE.Mesh(geo, mat);
    this._attach(mesh, o);
    if (o.collide !== false) {
      const desc = R.ColliderDesc.trimesh(new Float32Array(pos), new Uint32Array(idx), R.TriMeshFlags.FIX_INTERNAL_EDGES);
      desc.setFriction(o.friction ?? 0.9).setRestitution(o.restitution ?? 0.05);
      const body = o.mover ? o.mover.body : this.body;
      const c = this.phys.addCollider(desc, body, this._info(o));
      if (o.mover) o.mover.colliders.push(c);
    }
    if (o.walls) {
      const wh = o.walls.h || 0.6, wt = o.walls.t || 0.2, wm = o.walls.mat || this.m.rail;
      for (const side of [-1, 1]) {
        if (o.walls.side && o.walls.side !== side) continue;
        this.ribbon((u) => {
          const c = fn(u); const ww = (c.w ?? w) / 2;
          const h = c.h || 0; const bank = c.bank || 0;
          const off = side * (ww - wt / 2);
          return { x: c.x + Math.cos(h) * off * Math.cos(bank), y: c.y + wh - off * Math.sin(bank), d: c.d - Math.sin(h) * off * Math.cos(bank), h, bank, w: wt };
        }, steps, wt, wh, wm, { mover: o.mover, surface: o.wallSurface });
      }
    }
    if (o.path) for (const s of cs) this.pathPts.push(s.C.clone());
    if (o.supports && !o.mover) {
      const every = o.supportStep || 14; let next = every / 2;
      for (const s of cs) if (s.arc >= next) { next += every; this.supportLocal(s.C.x, s.C.y - th - 0.3, s.C.z); }
    }
    mesh.userData.samples = cs;
    return mesh;
  }

  mover(x = 0, y = 0, d = 0, parent) { return new Mover(this, x, y, d, parent); }

  // Dynamic physics box (knock-down blocks). Visual lives in world space.
  dynBox(x, y, d, w, h, l, o = {}) {
    const wp = this.W(x, y, d);
    const q = this.quat.clone();
    if (o.ry) q.multiply(new THREE.Quaternion().setFromAxisAngle(UP, o.ry));
    const body = this.phys.dynamicBody(wp, q, { linearDamping: 0.05, angularDamping: 0.15, dominance: o.dominance ?? -1, sleeping: true });
    const desc = R.ColliderDesc.cuboid(w / 2, h / 2, l / 2).setDensity(o.density ?? 0.35).setFriction(0.6).setRestitution(0.1);
    this.phys.addCollider(desc, body, { type: 'block', section: this.index });
    const rec = { body, w, h, l, p0: wp.clone(), q0: q.clone(), color: o.color, set: o.set, toppled: false };
    this.dyns.push(rec);
    return rec;
  }

  // Group of blocks rendered as one instanced mesh. Returns set (tracks toppled ratio).
  blockSet(list, mat, o = {}) {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    boxUV(geo, 1);
    const im = new THREE.InstancedMesh(geo, mat || this.m.block, list.length);
    im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false;
    im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(list.length * 3), 3);
    this.course.root.add(im);
    const set = { mesh: im, blocks: [], bonus: o.bonus ?? 25, done: false, name: o.name || 'STRUCTURE', section: this.index };
    const cols = this.m.blockColors;
    list.forEach((b, i) => {
      const r = this.dynBox(b.x, b.y, b.d, b.w, b.h, b.l, { set, density: b.density, ry: b.ry });
      r.color = b.color || cols[(b.ci ?? i) % cols.length];
      im.setColorAt(i, r.color);
      set.blocks.push(r);
    });
    this.sets.push(set);
    return set;
  }

  revolute(bodyA, bodyB, anchorA, anchorB, axis) {
    const jd = R.JointData.revolute(anchorA, anchorB, axis);
    const j = this.phys.world.createImpulseJoint(jd, bodyA, bodyB, true);
    this.joints.push(j);
    return j;
  }

  // ---------------------------------------------------- collectibles
  coin(x, y, d) {
    const p = this.W(x, y ?? 0.65, d);
    const id = this.course.coins.add(p, this.index);
    if (id >= 0) this.coinIds.push(id);
  }
  coinLine(x0, d0, x1, d1, n, y0 = 0.65, y1 = y0) {
    for (let i = 0; i < n; i++) { const k = n === 1 ? 0.5 : i / (n - 1); this.coin(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, d0 + (d1 - d0) * k); }
  }
  coinArc(x0, d0, x1, d1, n, base, peak) {
    for (let i = 0; i < n; i++) { const k = n === 1 ? 0.5 : i / (n - 1); this.coin(x0 + (x1 - x0) * k, base + Math.sin(k * Math.PI) * peak, d0 + (d1 - d0) * k); }
  }
  gem(x, y, d) { this.gems.push(this.W(x, y ?? 0.9, d)); }

  // ---------------------------------------------------- path, supports, exit, hints
  pathLine(x0, d0, x1, d1, y0 = 0, y1 = y0, step = 1) {
    const len = Math.hypot(x1 - x0, d1 - d0);
    const n = Math.max(1, Math.ceil(len / step));
    for (let i = 0; i <= n; i++) { const k = i / n; this.pathPts.push(this.V(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, d0 + (d1 - d0) * k)); }
  }
  pathFn(fn, steps) { for (let i = 0; i <= steps; i++) { const c = fn(i / steps); this.pathPts.push(this.V(c.x, c.y, c.d)); } }
  support(x, d, top) { const p = this.W(x, top, d); this.course.supports.add(p.x, p.y, p.z, this.index, this.yaw); }
  supportLocal(lx, ly, lz) { const p = new THREE.Vector3(lx, ly, lz).applyMatrix4(this.group.matrixWorld); this.course.supports.add(p.x, p.y, p.z, this.index, this.yaw); }
  exit(x, y, d, h = 0) { this.exitLocal = { x, y, d, h }; }
  kill(reason) { const g = this.course.game; if (g && g.killBall) g.killBall(reason); }
  get ball() { return this.course.game.ball; }
  // ball position in this section's local coords (x right, y up, d forward)
  ballLocal() { const b = this.course.game.ball; return b && b.body ? this.toLocal(b.curPos) : null; }
  onUpdate(fn) { this.updaters.push(fn); }
  onReset(fn) { this.resetters.push(fn); }
  // trigger volume in local coords: fires cb once per pass when ball inside box
  trigger(x, y, d, w, h, l, cb, o = {}) { this.triggers.push({ c: this.V(x, y, d), hw: w / 2, hh: h / 2, hl: l / 2, cb, inside: false, repeat: o.repeat !== false }); }
  toLocal(world, out = new THREE.Vector3()) {
    out.copy(world).sub(this.origin).applyAxisAngle(UP, -this.yaw);
    return { x: out.x, y: out.y, d: -out.z };
  }

  finish() {
    // Merge static meshes by material to reduce draw calls.
    const byMat = new Map();
    for (const m of this.statics) {
      const k = m.material.uuid;
      if (!byMat.has(k)) byMat.set(k, { mat: m.material, geos: [], cast: false });
      m.updateMatrix();
      const g = m.geometry.clone().applyMatrix4(m.matrix);
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      for (const a of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(a)) g.deleteAttribute(a);
      const entry = byMat.get(k);
      entry.geos.push(g.index ? g : g); entry.cast = entry.cast || m.castShadow;
      this.group.remove(m); m.geometry.dispose();
    }
    this.merged = [];
    for (const { mat, geos, cast } of byMat.values()) {
      const allIdx = geos.every((g) => g.index); const list = allIdx ? geos : geos.map((g) => (g.index ? g.toNonIndexed() : g));
      const merged = mergeGeometries(list, false);
      list.forEach((g) => g.dispose());
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, mat);
      mesh.castShadow = cast; mesh.receiveShadow = true;
      this.group.add(mesh); this.merged.push(mesh);
    }
    this.statics = [];
    for (const mv of this.movers) mv.sync(1 / 120, true);
  }
}

// ------------------------------------------------------------------ Course
export class Course {
  constructor(game, opts) {
    this.game = game;
    this.engine = game.engine;
    this.opts = opts;
    this.themeId = opts.themeId;
    this.theme = THEMES[this.themeId] || THEMES.metropolis;
    this.physics = new Physics();
    this.env = new Environment(this.engine, this.themeId, this.engine.preset);
    this.mats = new MaterialLib({ ...this.theme.palette, ...(opts.palette || {}) });
    if (this.theme.deckMat === 'plate') { this.mats.deck = this.mats.plate; }
    this.root = new THREE.Group(); this.root.name = 'course';
    this.engine.scene.add(this.root);
    this.path = new PathTrack();
    this.coins = new CoinSystem(this);
    this.supports = new SupportSystem(this, this.theme.support);
    this.sections = [];
    this.frame = { pos: new THREE.Vector3(0, this.theme.trackY, 0), yaw: 0 };
    this.checkpoints = [];
    this.finishS = Infinity;
    this.gems = [];
    this.registry = null;
    this.firstActive = 0;
    this.lastEnvSample = null;
  }

  addSection(def, registry) {
    const ob = registry[def.type];
    if (!ob) throw new Error('Unknown obstacle ' + def.type);
    const index = this.sections.length;
    const B = new SectionBuilder(this, this.frame, def, index, ob);
    ob.build(B, B.p, B.rng);
    if (B.p.gemAt) B.gem(...B.p.gemAt);
    if (!B.pathPts.length) B.pathLine(0, 0, B.exitLocal.x, B.exitLocal.d, 0, B.exitLocal.y);
    else {
      const first = B.pathPts[0];
      if (first.length() > 0.6) { const pre = []; const n = Math.ceil(first.length()); for (let i = 0; i < n; i++) pre.push(first.clone().multiplyScalar(i / n)); B.pathPts.unshift(...pre); }
      const ex = B.V(B.exitLocal.x, B.exitLocal.y, B.exitLocal.d); const last = B.pathPts[B.pathPts.length - 1];
      if (last.distanceTo(ex) > 0.6) { const n = Math.ceil(last.distanceTo(ex)); for (let i = 1; i <= n; i++) B.pathPts.push(last.clone().lerp(ex, i / n)); }
    }
    B.finish();
    const sec = {
      index, type: def.type, def, ob, B, group: B.group, body: B.body,
      movers: B.movers, dyns: B.dyns, sets: B.sets, updaters: B.updaters, resetters: B.resetters, triggers: B.triggers,
      jump: B.jump, cam: B.cam, hint: B.hint, speedMul: B.speedMul, checkpoint: !!ob.checkpoint || !!def.checkpoint,
      s0: this.path.length, s1: 0, gems: [], name: ob.name, category: ob.category, isFinish: !!ob.finish,
    };
    // path
    const worldPts = B.pathPts.map((p) => p.clone().applyMatrix4(B.group.matrixWorld));
    for (const p of worldPts) {
      this.path.push(p, index);
      if (!this.lastEnvSample || this.lastEnvSample.distanceTo(p) > 4) { this.env.addPathSample(p.x, p.y, p.z); this.lastEnvSample = p.clone(); }
    }
    sec.s1 = this.path.length;
    if (index === 0) sec.s0 = 0;
    // gems
    for (const g of B.gems) {
      const gem = this.game.effects.makeGem(g, this.mats);
      this.root.add(gem);
      gem.userData.section = index;
      this.gems.push({ mesh: gem, pos: g.clone(), taken: false, section: index, id: this.gems.length });
    }
    if (sec.checkpoint) this.checkpoints.push({ s: sec.s0 + (B.checkpointOffset || 2), section: index, pos: B.W(0, 0, B.checkpointOffset || 2), active: false, flag: B.flag });
    if (sec.isFinish) this.finishS = sec.s0 + (B.finishOffset || 4);
    // advance frame
    const ex = B.exitLocal;
    this.frame = { pos: B.W(ex.x, ex.y, ex.d), yaw: this.frame.yaw - ex.h };
    this.sections.push(sec);
    this.env.markDirty();
    return sec;
  }

  removeSection(sec) {
    if (sec.removed) return;
    sec.removed = true;
    this.root.remove(sec.group);
    sec.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    for (const st of sec.sets) { this.root.remove(st.mesh); st.mesh.geometry.dispose(); st.mesh.dispose(); }
    for (const j of sec.B.joints) { try { this.physics.world.removeImpulseJoint(j, true); } catch (e) { /* ignore */ } }
    for (const d of sec.dyns) this.physics.removeBody(d.body);
    if (sec.B.onDispose) sec.B.onDispose();
    for (const d of sec.B.disposables) d.dispose();
    if (sec.B.extraBodies) for (const b of sec.B.extraBodies) this.physics.removeBody(b);
    for (const mv of sec.movers) this.physics.removeBody(mv.body);
    this.physics.removeBody(sec.body);
    this.coins.releaseOwner(sec.index);
    this.supports.releaseOwner(sec.index);
    for (const g of this.gems) if (g.section === sec.index && g.mesh.parent) { this.root.remove(g.mesh); }
  }

  sectionAtS(s) {
    for (let i = this.sections.length - 1; i >= 0; i--) if (this.sections[i].s0 <= s && !this.sections[i].removed) return this.sections[i];
    return this.sections[0];
  }

  // per fixed step
  stepUpdate(t, dt, ballS) {
    const n = this.sections.length;
    const cur = this.sectionAtS(ballS);
    const a = Math.max(0, cur.index - 3), b = Math.min(n - 1, cur.index + 7);
    for (let i = a; i <= b; i++) {
      const sec = this.sections[i]; if (sec.removed) continue;
      for (const u of sec.updaters) u(t, dt);
      for (const mv of sec.movers) mv.sync(dt);
    }
  }

  // per render frame: dynamic body visuals, visibility culling
  frameUpdate(ballPos, ballS) {
    const m = _m; const s = new THREE.Vector3();
    for (const sec of this.sections) {
      if (sec.removed) continue;
      const vis = sec.s0 < ballS + 420 && sec.s1 > ballS - 90;
      sec.group.visible = vis;
      for (const st of sec.sets) {
        st.mesh.visible = vis || st.blocks.some((b) => !b.disabled && !b.body.isSleeping());
        if (!st.mesh.visible) continue;
        st.blocks.forEach((b, i) => {
          const t = b.body.translation(), r = b.body.rotation();
          s.set(b.w, b.h, b.l);
          m.compose(_v.set(t.x, t.y, t.z), _q.set(r.x, r.y, r.z, r.w), s);
          st.mesh.setMatrixAt(i, m);
          if (t.y < b.p0.y - 60 && !b.disabled) { b.disabled = true; b.body.setEnabled(false); }
        });
        st.mesh.instanceMatrix.needsUpdate = true;
      }
    }
    void ballPos;
  }

  // restore obstacles from section index onward (after respawn)
  resetFrom(index, t) {
    for (const sec of this.sections) {
      if (sec.removed || sec.index < index - 1) continue;
      for (const r of sec.resetters) r(t);
      for (const d of sec.dyns) {
        if (sec.index < index) continue;
        d.body.setEnabled(true); d.disabled = false;
        d.body.setTranslation({ x: d.p0.x, y: d.p0.y, z: d.p0.z }, false);
        d.body.setRotation({ x: d.q0.x, y: d.q0.y, z: d.q0.z, w: d.q0.w }, false);
        d.body.setLinvel({ x: 0, y: 0, z: 0 }, false); d.body.setAngvel({ x: 0, y: 0, z: 0 }, false);
        d.body.sleep(); d.toppled = false;
      }
      for (const st of sec.sets) if (sec.index >= index && !st.done) { st.blocks.forEach((b) => (b.toppled = false)); }
      for (const mv of sec.movers) mv.sync(1 / 120, true);
    }
  }

  dispose() {
    for (const sec of this.sections) this.removeSection(sec);
    this.engine.scene.remove(this.root);
    this.root.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    this.coins.mesh.dispose();
    this.mats.dispose();
    this.env.dispose();
    this.physics.dispose();
  }
}
