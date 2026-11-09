// Third-person follow camera: behind & above the ball, aligned to the course direction,
// with damping, jump smoothing, collision shake, speed FOV and anti-clipping.
import * as THREE from 'three';
import { R } from '../core/physics.js';

const UP = new THREE.Vector3(0, 1, 0);

export class FollowCamera {
  constructor(engine) {
    this.engine = engine;
    this.cam = engine.camera;
    this.dir = new THREE.Vector3(0, 0, -1);
    this.pos = new THREE.Vector3();
    this.look = new THREE.Vector3();
    this.focusY = 0;
    this.shakeAmt = 0; this.shakeT = 0;
    this.dist = 5.6; this.height = 2.7; this.fov = 62; this.lookAhead = 6.5;
    this.curDist = 5.6; this.curHeight = 2.7; this.curFov = 62;
    this.mode = 'follow';
    this.tmp = new THREE.Vector3(); this.tmp2 = new THREE.Vector3();
    this.ray = null;
    this.clipDist = 99;
    this.orbit = 0;
  }

  reset(ballPos, dir) {
    this.dir.copy(dir).setY(0).normalize();
    this.focusY = ballPos.y;
    this.pos.copy(ballPos).addScaledVector(this.dir, -this.dist).addScaledVector(UP, this.height);
    this.look.copy(ballPos).addScaledVector(this.dir, this.lookAhead);
    this.cam.position.copy(this.pos);
    this.cam.lookAt(this.look);
    this.mode = 'follow';
    this.clipDist = 99;
  }

  shake(a) { this.shakeAmt = Math.min(1.2, Math.max(this.shakeAmt, a)); }

  landKick(k) { this.kick = Math.max(this.kick || 0, k * 0.55); }

  // Sweeping establishing shot that settles behind the ball (READY... GO!).
  startIntro(ballPos, dir) {
    this.reset(ballPos, dir);
    const side = new THREE.Vector3().crossVectors(dir, UP).normalize();
    this.introFrom = ballPos.clone().addScaledVector(dir, 16).addScaledVector(UP, 9).addScaledVector(side, 9);
    this.introLook = ballPos.clone().addScaledVector(dir, 4);
    this.introT = 0;
    this.mode = 'intro';
    this.cam.position.copy(this.introFrom);
    this.cam.lookAt(ballPos);
  }

  // pathDir: averaged course direction ahead of the ball; hint: per-section camera hint
  update(dt, ball, pathDir, hint, physics, opts = {}) {
    const bp = ball.mesh.position;
    const k = (rate) => 1 - Math.exp(-rate * dt);
    if (this.mode === 'fall') {
      // hold position, keep looking at the falling ball
      this.look.lerp(bp, k(6));
      this.cam.position.copy(this.pos);
      this.cam.lookAt(this.look);
      return;
    }
    if (this.mode === 'intro') {
      this.introT += dt;
      const u = Math.min(1, this.introT / 1.3); const e = u * u * (3 - 2 * u);
      this.tmp.copy(bp).addScaledVector(this.dir, -this.dist).addScaledVector(UP, this.height);
      this.pos.lerpVectors(this.introFrom, this.tmp, e);
      this.look.copy(bp).lerp(this.tmp2.copy(bp).addScaledVector(this.dir, this.lookAhead).addScaledVector(UP, 0.4), e);
      this.cam.position.copy(this.pos);
      this.cam.lookAt(this.look);
      this.focusY = bp.y;
      return;
    }
    if (this.mode === 'cinematic') {
      // menu attract mode: high, wide chase view offset to the side so the course reads above the UI
      this.orbit += dt * 0.12;
      this.tmp.copy(pathDir).setY(0);
      if (this.tmp.lengthSq() > 0.001) { this.tmp.normalize(); this.dir.lerp(this.tmp, k(1.5)).normalize(); }
      const side = new THREE.Vector3().crossVectors(this.dir, UP).normalize();
      const sway = Math.sin(this.orbit) * 5;
      this.focusY += (bp.y - this.focusY) * k(3);
      const want = this.tmp2.set(bp.x, this.focusY, bp.z).addScaledVector(this.dir, -11).addScaledVector(UP, 7.5).addScaledVector(side, sway);
      this.pos.lerp(want, k(2.5));
      this.look.lerp(this.tmp.set(bp.x, this.focusY - 2.5, bp.z).addScaledVector(this.dir, 10), k(3));
      this.cam.position.copy(this.pos);
      this.cam.lookAt(this.look);
      if (Math.abs(this.engine.baseFov - 58) > 0.05) this.engine.applyFov(58);
      return;
    }
    if (this.mode === 'orbit') {
      this.orbit += dt * 0.25;
      const r = 9;
      this.tmp.set(Math.sin(this.orbit) * r, 3.4, Math.cos(this.orbit) * r).add(bp);
      this.cam.position.lerp(this.tmp, k(3));
      this.cam.lookAt(bp);
      return;
    }
    const airK = ball.grounded ? 0 : Math.min(1, Math.max(0, (ball.airTime - 0.3) / 0.6));
    const tDist = (hint?.dist ?? this.dist) + airK * 2.2, tH = (hint?.height ?? this.height) + airK * 1.3;
    const tFov = (hint?.fov ?? this.fov) + Math.min(12, Math.max(0, ball.speed - 11) * 0.8) + (ball.boosting ? 7 : 0) + airK * 5;
    this.curDist += (tDist - this.curDist) * k(2.2);
    this.curHeight += (tH - this.curHeight) * k(2.2);
    this.curFov += (tFov - this.curFov) * k(3);
    // direction smoothing
    this.tmp.copy(pathDir).setY(0);
    if (this.tmp.lengthSq() > 0.001) { this.tmp.normalize(); this.dir.lerp(this.tmp, k(opts.turnRate || 3.6)).normalize(); }
    // vertical focus: slow while airborne so jumps feel big, tighter when grounded
    const airborne = !ball.grounded && ball.airTime > 0.1;
    const fyTarget = airborne ? Math.max(bp.y, ball.pathY + 0.5) * 0.5 + Math.min(bp.y, ball.pathY + 0.5) * 0.5 : bp.y;
    this.focusY += (fyTarget - this.focusY) * k(airborne ? 2.4 : 7);
    const focus = this.tmp2.set(bp.x, this.focusY, bp.z);
    // desired position
    const want = this.tmp.copy(focus).addScaledVector(this.dir, -Math.min(this.curDist, this.clipDist)).addScaledVector(UP, this.curHeight);
    // anti-clip: cast from focus to camera against static geometry
    if (physics) {
      const dirv = new THREE.Vector3().subVectors(want, focus);
      const len = dirv.length(); dirv.normalize();
      const ray = new R.Ray({ x: focus.x, y: focus.y + 0.6, z: focus.z }, { x: dirv.x, y: dirv.y, z: dirv.z });
      const hit = physics.world.castRay(ray, len, true, R.QueryFilterFlags.EXCLUDE_DYNAMIC | R.QueryFilterFlags.EXCLUDE_KINEMATIC | R.QueryFilterFlags.EXCLUDE_SENSORS, undefined, undefined, ball.body,
        (c) => { const inf = physics.info.get(c.handle); return !(inf && inf.noCamClip); });
      const allowed = hit ? Math.max(2.2, hit.timeOfImpact - 0.6) : 99;
      this.clipDist += (allowed - this.clipDist) * (allowed < this.clipDist ? k(14) : k(1.5));
    }
    this.pos.lerp(want, k(9));
    // look target
    this.look.copy(focus).addScaledVector(this.dir, this.lookAhead).addScaledVector(UP, 0.4);
    // shake
    this.shakeT += dt;
    this.shakeAmt = Math.max(0, this.shakeAmt - dt * 2.2);
    const sa = this.shakeAmt * this.shakeAmt * 0.35 * (opts.shake === false ? 0 : 1);
    this.kick = Math.max(0, (this.kick || 0) - dt * 2.5);
    this.cam.position.copy(this.pos);
    if (this.kick > 0) this.cam.position.y -= Math.sin(Math.min(1, this.kick) * Math.PI) * 0.35;
    if (sa > 0) this.cam.position.add(this.tmp.set(Math.sin(this.shakeT * 53) * sa, Math.sin(this.shakeT * 61 + 1) * sa, Math.sin(this.shakeT * 47 + 2) * sa));
    this.cam.lookAt(this.look);
    if (Math.abs(this.engine.baseFov - this.curFov) > 0.05) this.engine.applyFov(this.curFov);
  }
}
