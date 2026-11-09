// Thin wrapper around the Rapier physics world with helpers used by the course builder.
import RAPIER from '@dimforge/rapier3d-compat';

export let R = null;

export async function initPhysics() {
  if (R) return R;
  await RAPIER.init();
  R = RAPIER;
  return R;
}

export const GRAVITY = -24;
export const FIXED_DT = 1 / 120;

// Collider metadata lookup (surface types, bumpers, etc.).
export class Physics {
  constructor() {
    this.world = new R.World({ x: 0, y: GRAVITY, z: 0 });
    this.world.timestep = FIXED_DT;
    this.world.numSolverIterations = 6;
    this.info = new Map(); // collider handle -> info object
    this.tmpRay = new R.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: -1, z: 0 });
  }

  step() {
    this.world.step();
  }

  fixedBody(pos, quat) {
    const d = R.RigidBodyDesc.fixed().setTranslation(pos.x, pos.y, pos.z);
    if (quat) d.setRotation({ x: quat.x, y: quat.y, z: quat.z, w: quat.w });
    return this.world.createRigidBody(d);
  }

  kinematicBody(pos, quat) {
    const d = R.RigidBodyDesc.kinematicPositionBased().setTranslation(pos.x, pos.y, pos.z);
    if (quat) d.setRotation({ x: quat.x, y: quat.y, z: quat.z, w: quat.w });
    return this.world.createRigidBody(d);
  }

  dynamicBody(pos, quat, opts = {}) {
    const d = R.RigidBodyDesc.dynamic().setTranslation(pos.x, pos.y, pos.z);
    if (quat) d.setRotation({ x: quat.x, y: quat.y, z: quat.z, w: quat.w });
    if (opts.linearDamping != null) d.setLinearDamping(opts.linearDamping);
    if (opts.angularDamping != null) d.setAngularDamping(opts.angularDamping);
    if (opts.ccd) d.setCcdEnabled(true);
    if (opts.sleeping) d.setSleeping(true);
    if (opts.dominance != null) d.setDominanceGroup(opts.dominance);
    return this.world.createRigidBody(d);
  }

  addCollider(desc, body, info) {
    const c = this.world.createCollider(desc, body);
    if (info) this.info.set(c.handle, info);
    return c;
  }

  removeBody(body) {
    if (!body) return;
    const n = body.numColliders();
    for (let i = 0; i < n; i++) this.info.delete(body.collider(i).handle);
    this.world.removeRigidBody(body);
  }

  castDown(origin, maxDist, excludeBody) {
    this.tmpRay.origin = { x: origin.x, y: origin.y, z: origin.z };
    this.tmpRay.dir = { x: 0, y: -1, z: 0 };
    const hit = this.world.castRayAndGetNormal(this.tmpRay, maxDist, true, R.QueryFilterFlags.EXCLUDE_SENSORS, undefined, undefined, excludeBody);
    return hit;
  }

  dispose() {
    this.world.free();
    this.info.clear();
  }
}
