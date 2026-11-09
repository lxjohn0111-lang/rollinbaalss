// Player ball: Rapier rigid body + path-relative steering controller + interpolated visuals.
import * as THREE from 'three';
import { R } from '../core/physics.js';
import { makeBallMaterial } from './skins.js';
import { softSprite } from '../gfx/textures.js';

export const BALL_R = 0.5;
const UP = new THREE.Vector3(0, 1, 0);

export const TUNING = {
  latSpeed: 6.6, kF: 2.6, accMax: 16, brakeMax: 11, kL: 11, latAcc: 34,
  kAir: 3.4, latAccAir: 10, jumpV: 8.6, coyote: 0.13, jumpBuffer: 0.16, maxSpeed: 42,
};

export class Ball {
  constructor(game) {
    this.game = game;
    this.geo = new THREE.SphereGeometry(BALL_R, 48, 32);
    this.mesh = new THREE.Mesh(this.geo, new THREE.MeshStandardMaterial());
    this.mesh.castShadow = true; this.mesh.receiveShadow = false;
    this.skinId = null;
    // soft contact shadow so the ball always reads as grounded/airborne
    const blobTex = softSprite('blob').map;
    this.blob = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), new THREE.MeshBasicMaterial({ map: blobTex, color: 0x000000, transparent: true, opacity: 0.45, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }));
    this.blob.rotation.x = -Math.PI / 2;
    this.blob.renderOrder = 1;
    this.root = new THREE.Group();
    this.root.add(this.mesh, this.blob);
    this.body = null; this.collider = null;
    this.pos = new THREE.Vector3(); this.vel = new THREE.Vector3();
    this.prevPos = new THREE.Vector3(); this.curPos = new THREE.Vector3();
    this.prevQ = new THREE.Quaternion(); this.curQ = new THREE.Quaternion();
    this.fwd = new THREE.Vector3(0, 0, -1); this.right = new THREE.Vector3(1, 0, 0);
    this.groundVel = new THREE.Vector3(); this.groundN = new THREE.Vector3(0, 1, 0);
    this.extAccel = new THREE.Vector3();
    this.pathIdx = 0; this.s = 0; this.lat = 0; this.pathY = 0;
    this.grounded = false; this.airTime = 0; this.coyote = 0; this.jumpBuf = 0;
    this.groundInfo = null; this.groundType = null;
    this.boostT = 0; this.boostMul = 1; this.slowT = 0;
    this.baseSpeed = 10; this.speedMul = 1;
    this.lastVy = 0; this.events = [];
    this.bumpCd = 0; this.springCd = 0; this.jumpLock = 0;
    this.gravityScale = 1;
    this.tmp = new THREE.Vector3(); this.tmp2 = new THREE.Vector3();
    this.sample = {};
    this.jumpAllowed = false;
  }

  setSkin(id, quality) {
    if (this.skinId === id && this.mesh.material && this.mesh.material.userData.q === quality) return;
    this.skinId = id;
    if (this.mesh.material) this.mesh.material.dispose();
    this.mesh.material = makeBallMaterial(id, quality);
    this.mesh.material.userData.q = quality;
  }

  attach(course, pos, fwd) {
    this.course = course;
    const phys = course.physics;
    const d = R.RigidBodyDesc.dynamic().setTranslation(pos.x, pos.y, pos.z).setCcdEnabled(true).setLinearDamping(0.02).setAngularDamping(0.25).setCanSleep(false);
    this.body = phys.world.createRigidBody(d);
    const cd = R.ColliderDesc.ball(BALL_R).setDensity(2.0).setFriction(1.1).setRestitution(0.12)
      .setFrictionCombineRule(R.CoefficientCombineRule.Min).setRestitutionCombineRule(R.CoefficientCombineRule.Max);
    this.collider = phys.world.createCollider(cd, this.body);
    this.mass = this.body.mass();
    course.root.add(this.root);
    this.respawn(pos, fwd);
  }

  detach() {
    if (this.course && this.body) {
      this.course.physics.world.removeRigidBody(this.body);
      this.course.root.remove(this.root);
    }
    this.body = null; this.collider = null; this.course = null;
  }

  respawn(pos, fwd) {
    this.body.setTranslation({ x: pos.x, y: pos.y, z: pos.z }, true);
    const v = fwd ? fwd.clone().multiplyScalar(this.baseSpeed * 0.45) : new THREE.Vector3();
    this.body.setLinvel({ x: v.x, y: 0, z: v.z }, true);
    this.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    this.body.setGravityScale(1, true);
    this.gravityScale = 1;
    this.curPos.copy(pos); this.prevPos.copy(pos); this.pos.copy(pos);
    this.curQ.identity(); this.prevQ.identity();
    this.grounded = false; this.airTime = 0; this.boostT = 0; this.slowT = 0; this.jumpBuf = 0;
    this.pathIdx = this.course.path.nearest(pos, this.pathIdx, 200);
    if (fwd) this.fwd.copy(fwd);
  }

  boost(mul = 1.7, time = 1.4) { this.boostT = Math.max(this.boostT, time); this.boostMul = Math.max(mul, this.boostT > 0 ? this.boostMul : 1); }

  // One fixed physics step of control logic. input: {steer, jump (pressed edge), accel, brake}
  control(dt, input, sec) {
    const body = this.body, phys = this.course.physics, world = phys.world, path = this.course.path;
    const t = body.translation();
    this.pos.set(t.x, t.y, t.z);
    const lv = body.linvel();
    this.vel.set(lv.x, lv.y, lv.z);

    // --- path tracking
    this.pathIdx = path.nearest(this.pos, this.pathIdx, 30);
    const pr = path.project(this.pos, this.pathIdx);
    this.s = pr.s; this.lat = pr.lat; this.pathY = pr.y;
    const ahead = path.sampleAt(this.s + 1.6 + Math.max(0, this.vel.length() * 0.08), this.sample, this.pathIdx);
    this.fwd.copy(ahead.t); this.right.copy(ahead.r);

    // --- ground detection (ray + contact manifolds)
    let grounded = false; let gInfo = null; let gCollider = null;
    this.groundN.set(0, 1, 0);
    const hit = phys.castDown(this.pos, BALL_R + 0.18, body);
    if (hit && hit.normal.y > 0.45) { grounded = true; gCollider = hit.collider; this.groundN.set(hit.normal.x, hit.normal.y, hit.normal.z); }
    let bumped = null;
    world.contactPairsWith(this.collider, (other) => {
      world.contactPair(this.collider, other, (man, flipped) => {
        if (man.numContacts() === 0 || man.contactDist(0) > 0.08) return;
        const n = man.normal();
        let nx = n.x, ny = n.y, nz = n.z;
        if (!flipped) { nx = -nx; ny = -ny; nz = -nz; }
        const info = phys.info.get(other.handle);
        if (info && info.type === 'bumper') bumped = { info, nx, ny, nz };
        if (info && info.type === 'hazard') this.events.push({ type: 'hazard', info });
        if (ny > 0.45) {
          if (!grounded || (info && info.type)) { gCollider = other; this.groundN.set(nx, ny, nz); }
          grounded = true;
        }
      });
    });
    if (this.jumpLock > 0) { this.jumpLock -= dt; if (this.vel.y > 0.5) { grounded = false; gCollider = null; } }
    if (gCollider) gInfo = phys.info.get(gCollider.handle) || null;
    this.groundInfo = gInfo;
    this.groundType = gInfo ? gInfo.type || null : null;

    // landing
    if (grounded && !this.grounded && this.airTime > 0.22) {
      this.events.push({ type: 'land', impact: Math.max(0, -this.lastVy), air: this.airTime });
    }
    if (grounded) { this.airTime = 0; this.coyote = TUNING.coyote; } else { this.airTime += dt; this.coyote -= dt; }
    this.grounded = grounded;
    this.lastVy = this.vel.y;

    // ground velocity (moving platforms)
    this.groundVel.set(0, 0, 0);
    if (grounded && gInfo && gInfo.mover) {
      this.tmp.copy(this.pos).addScaledVector(this.groundN, -BALL_R);
      gInfo.mover.pointVelocity(this.tmp, this.groundVel);
      if (gInfo.mover.onTouch) gInfo.mover.onTouch();
    }
    if (grounded && gInfo && gInfo.onTouch) gInfo.onTouch(this);

    // --- surface behaviour
    let kF = TUNING.kF, kL = TUNING.kL, latAcc = TUNING.latAcc, speedSurf = 1;
    const type = grounded ? this.groundType : null;
    if (type === 'ice') { kF = 0.35; kL = 1.3; latAcc = 6; }
    else if (type === 'sticky') { speedSurf = 0.38; kF = 6; this.vel.multiplyScalar(1 - 3.2 * dt); body.setLinvel({ x: this.vel.x, y: this.vel.y, z: this.vel.z }, true); }
    else if (type === 'boost') { this.boost(gInfo.power || 1.75, gInfo.time || 1.3); }
    else if (type === 'conveyor') {
      const dir = gInfo.dir; // world vector * speed (m/s)
      const df = dir.x * this.fwd.x + dir.z * this.fwd.z;
      this.extAccel.addScaledVector(this.fwd, df * 2.6);
      this.groundVel.add(dir); // belt carries the ball laterally
    }
    if (type === 'spring' && this.springCd <= 0) {
      const p = gInfo.power || 13;
      body.setLinvel({ x: this.vel.x, y: p, z: this.vel.z }, true);
      this.vel.y = p; this.springCd = 0.25; this.grounded = false; this.coyote = 0; this.jumpLock = 0.2;
      this.events.push({ type: 'spring', power: p });
      if (gInfo.onSpring) gInfo.onSpring();
    }
    if (bumped && this.bumpCd <= 0) {
      const p = bumped.info.power || 9;
      const n = this.tmp.set(bumped.nx, 0, bumped.nz);
      if (n.lengthSq() < 0.01) n.copy(this.fwd).negate();
      n.normalize();
      body.applyImpulse({ x: n.x * p * this.mass, y: 1.5 * this.mass, z: n.z * p * this.mass }, true);
      this.bumpCd = 0.25;
      this.events.push({ type: 'bump', power: p });
      if (bumped.info.onBump) bumped.info.onBump();
    }
    this.springCd -= dt; this.bumpCd -= dt;

    // --- jumping
    if (input.jump) this.jumpBuf = TUNING.jumpBuffer; else this.jumpBuf -= dt;
    this.jumpAllowed = !!(sec && sec.jump);
    if (this.jumpBuf > 0 && this.coyote > 0 && this.jumpAllowed) {
      const vy = Math.max(this.vel.y, 0) * 0.3 + TUNING.jumpV * (this.gravityScale < 1 ? 0.8 : 1);
      body.setLinvel({ x: this.vel.x, y: vy, z: this.vel.z }, true);
      this.vel.y = vy;
      this.jumpBuf = 0; this.coyote = 0; this.grounded = false; this.jumpLock = 0.2;
      this.events.push({ type: 'jump' });
    }

    // --- drive & steering (path-relative)
    if (this.boostT > 0) { this.boostT -= dt; if (this.boostT <= 0) this.boostMul = 1; }
    const secMul = sec ? sec.speedMul || 1 : 1;
    let target = this.baseSpeed * this.speedMul * secMul * speedSurf * (this.boostT > 0 ? this.boostMul : 1);
    if (input.brake) target *= 0.62; else if (input.accel) target *= 1.18;
    const f = this.fwd, r = this.right;
    const vf = this.vel.dot(f);
    const vLat = this.vel.dot(r) - this.groundVel.dot(r);
    const steerTarget = input.steer * TUNING.latSpeed;
    let aF, aL;
    if (this.grounded || this.coyote > 0.05) {
      aF = THREE.MathUtils.clamp((target - vf) * kF, -TUNING.brakeMax, TUNING.accMax);
      aL = THREE.MathUtils.clamp((steerTarget - vLat) * kL, -latAcc, latAcc);
    } else {
      aF = THREE.MathUtils.clamp((target - vf) * 1.4, -2.5, 5);
      aL = THREE.MathUtils.clamp((steerTarget * 0.9 - vLat) * TUNING.kAir, -TUNING.latAccAir, TUNING.latAccAir);
    }
    const m = this.mass * dt;
    const ix = (f.x * aF + r.x * aL + this.extAccel.x) * m;
    const iy = this.extAccel.y * m;
    const iz = (f.z * aF + r.z * aL + this.extAccel.z) * m;
    body.applyImpulse({ x: ix, y: iy, z: iz }, true);
    this.extAccel.set(0, 0, 0);

    // keep visual spin consistent while airborne/sliding is handled by physics; clamp extremes
    const sp = Math.hypot(this.vel.x, this.vel.z);
    if (sp > TUNING.maxSpeed) { const k = TUNING.maxSpeed / sp; body.setLinvel({ x: this.vel.x * k, y: this.vel.y, z: this.vel.z * k }, true); }
  }

  addAccel(x, y, z) { this.extAccel.x += x; this.extAccel.y += y; this.extAccel.z += z; }

  setGravityScale(g) { if (this.gravityScale !== g) { this.gravityScale = g; this.body.setGravityScale(g, true); } }

  // record state before/after physics step for interpolation
  preStep() { this.prevPos.copy(this.curPos); this.prevQ.copy(this.curQ); }
  postStep() {
    const t = this.body.translation(), q = this.body.rotation();
    this.curPos.set(t.x, t.y, t.z); this.curQ.set(q.x, q.y, q.z, q.w);
  }

  render(alpha) {
    this.mesh.position.lerpVectors(this.prevPos, this.curPos, alpha);
    this.mesh.quaternion.slerpQuaternions(this.prevQ, this.curQ, alpha);
    // contact shadow
    const phys = this.course.physics;
    const hit = phys.castDown(this.mesh.position, 30, this.body);
    if (hit) {
      const y = this.mesh.position.y - hit.timeOfImpact;
      this.blob.position.set(this.mesh.position.x, y + 0.03, this.mesh.position.z);
      const h = hit.timeOfImpact - BALL_R;
      this.blob.material.opacity = Math.max(0, 0.5 - h * 0.06);
      const s = 1 + h * 0.08; this.blob.scale.set(s, s, s);
      this.blob.visible = true;
    } else this.blob.visible = false;
  }

  get speed() { return Math.hypot(this.vel.x, this.vel.z); }
}
