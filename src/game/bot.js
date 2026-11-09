// Autopilot used by the menu attract mode and the automated play-tests.
// It reads per-section hints, or plans a lateral lane against the section's danger/ground model.
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class Bot {
  constructor(game) {
    this.game = game;
    this.integral = 0;
    this.plan = 0;
    this.lastTarget = 0;
  }

  reset() { this.integral = 0; this.plan = 0; }

  compute(dt) {
    const g = this.game, ball = g.ball, course = g.course;
    const v = Math.max(4, ball.speed);
    const sec = course.sectionAtS(ball.s + Math.min(3.5, v * 0.25));
    const B = sec.B;
    const local = B.toLocal(ball.curPos);
    const ctx = { sl: ball.s - sec.s0, lat: ball.lat, t: g.time, v, local, ball };
    let target = { lat: 0 };
    if (sec.hint) target = sec.hint(ctx) || target;
    else if (B.danger || B.ground) target = this.planLanes(B, local, ctx);
    const tl = target.lat ?? 0;
    const err = tl - ball.lat;
    const latVel = ball.vel.dot(ball.right) - ball.groundVel.dot(ball.right);
    this.integral = clamp(this.integral + err * dt * 0.9, -0.7, 0.7);
    if (Math.abs(err) > 1.2) this.integral *= 0.98;
    const steer = clamp(err * 1.25 - latVel * 0.1 + this.integral, -1, 1);
    this.lastTarget = tl;
    // speed: follow the section's advised cruise speed, brake to wait out timed hazards
    const vCur = target.speed ?? ball.baseSpeed * ball.speedMul * (sec.speedMul || 1) * (target.accel ? 1.15 : 1);
    let vT = vCur, slowAhead = false;
    // look further ahead: slow down early for sections that want less speed
    const nxt = course.sectionAtS(ball.s + Math.max(8, v * 1.3));
    if (nxt !== sec && nxt.speedMul && nxt.speedMul < (sec.speedMul || 1) && !(nxt.hint && sec === nxt)) {
      const vN = ball.baseSpeed * ball.speedMul * nxt.speedMul + 1;
      if (vN < vT) { vT = vN; slowAhead = true; }
    }
    const vf = ball.vel.dot(ball.fwd);
    let throttle = clamp((vT - vf) * 0.6 + 0.08, 0, 1);
    const margin = slowAhead ? 1.5 : 3;
    if (vf > vT + margin && (slowAhead || ball.boostT <= 0)) throttle = -clamp((vf - vT - margin) * 0.35, 0, 1);
    if (target.brake) throttle = vf > 2.5 ? -1 : 0.15;
    return { steer, throttle, jump: !!target.jump, boost: !!target.boost };
  }

  planLanes(B, local, ctx) {
    const half = (B.width || 4.6) / 2 - 0.35;
    const t0 = ctx.t, v = ctx.v;
    let best = local.x, bestScore = -Infinity;
    for (let c = -half; c <= half + 1e-6; c += 0.3) {
      let score = 0;
      for (let k = 0; k <= 28; k++) {
        const tau = k * 0.05;
        const x = local.x + (c - local.x) * Math.min(1, tau / 0.38);
        const d = local.d + v * tau;
        let cl = B.danger ? B.danger(x, d, t0 + tau) : 9;
        if (B.ground && !B.ground(x, d, t0 + tau)) cl = Math.min(cl, -2);
        const f = cl < 0 ? cl * 4 - 2 : Math.min(cl, 1);
        score += f * Math.exp(-tau * 2.2);
      }
      score -= Math.abs(c - local.x) * 0.06 + Math.abs(c - this.plan) * 0.04;
      if (score > bestScore) { bestScore = score; best = c; }
    }
    this.plan = best;
    return { lat: ctx.lat + (best - local.x), brake: !B.noWait && bestScore < -2.2 };
  }
}
