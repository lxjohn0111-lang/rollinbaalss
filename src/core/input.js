// Keyboard + touch input. Produces steer [-1..1], throttle [-1..1] (accelerate / brake-reverse),
// boost (held) and an edge-triggered jump.
//  Desktop: W/↑ accelerate · S/↓ brake & reverse · A/D or ←/→ steer · Space jump · Shift boost
//  Touch:   'stick' mode - a floating analog stick on the left (sideways = steer, up = throttle,
//           down = brake) with JUMP and BOOST buttons on the right. 'buttons' mode - left/right
//           buttons plus automatic acceleration and a brake button.
export class Input {
  constructor(el) {
    this.keys = new Set();
    this.steer = 0;
    this.jumpQueued = false;
    this.handlers = {};
    this.touchMode = 'stick';
    this.autoAccel = false;
    this.enabled = true;
    this.isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    this.stick = { active: false, id: null, x0: 0, y0: 0, dx: 0, dy: 0 };
    this.btnLeft = false; this.btnRight = false; this.btnBoost = false; this.btnBrake = false;
    this.anyThrottle = false;
    window.addEventListener('keydown', (e) => this.onKey(e, true));
    window.addEventListener('keyup', (e) => this.onKey(e, false));
    window.addEventListener('blur', () => this.releaseAll());
    this.el = el;
    el.addEventListener('pointerdown', (e) => this.onPointer(e, 'down'));
    window.addEventListener('pointermove', (e) => this.onPointer(e, 'move'));
    window.addEventListener('pointerup', (e) => this.onPointer(e, 'up'));
    window.addEventListener('pointercancel', (e) => this.onPointer(e, 'up'));
  }

  releaseAll() { this.keys.clear(); this.btnLeft = this.btnRight = this.btnBoost = this.btnBrake = false; this.stick.active = false; this.stick.id = null; }

  on(evt, fn) { this.handlers[evt] = fn; }
  emit(evt) { if (this.handlers[evt]) this.handlers[evt](); }

  onKey(e, down) {
    const k = e.code;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(k) && (e.target === document.body || e.target.tagName === 'CANVAS')) e.preventDefault();
    if (down) {
      if (!this.keys.has(k)) {
        if (k === 'Space') this.jumpQueued = true;
        if (k === 'Escape' || k === 'KeyP') this.emit('pause');
        if (k === 'KeyR') this.emit('restart');
        if (k === 'Enter') this.emit('confirm');
      }
      this.keys.add(k);
    } else this.keys.delete(k);
  }

  onPointer(e, type) {
    if (!this.enabled || this.touchMode !== 'stick') return;
    const s = this.stick;
    if (type === 'down') {
      if (e.target.closest && e.target.closest('.ui-btn, button, .hud-btn')) return;
      if (e.clientX > window.innerWidth * 0.6 || s.active) return;
      s.active = true; s.id = e.pointerId; s.x0 = e.clientX; s.y0 = e.clientY; s.dx = 0; s.dy = 0;
    } else if (type === 'move') {
      if (!s.active || e.pointerId !== s.id) return;
      s.dx = e.clientX - s.x0; s.dy = e.clientY - s.y0;
      // the anchor follows the finger when it drags far, so the stick never "runs out"
      const max = 70; const len = Math.hypot(s.dx, s.dy);
      if (len > max) { const k = (len - max) / len; s.x0 += s.dx * k; s.y0 += s.dy * k; s.dx -= s.dx * k; s.dy -= s.dy * k; }
    } else if (s.active && e.pointerId === s.id) {
      s.active = false; s.id = null; s.dx = 0; s.dy = 0;
    }
  }

  setButton(name, held) {
    if (name === 'left') this.btnLeft = held; else if (name === 'right') this.btnRight = held;
    else if (name === 'boost') this.btnBoost = held; else if (name === 'brake') this.btnBrake = held;
  }

  pressJump() { this.jumpBtn = true; }

  sample(dt) {
    let target = 0;
    const kL = this.keys.has('KeyA') || this.keys.has('ArrowLeft') || this.btnLeft;
    const kR = this.keys.has('KeyD') || this.keys.has('ArrowRight') || this.btnRight;
    if (kL) target -= 1;
    if (kR) target += 1;
    const fwdKey = this.keys.has('KeyW') || this.keys.has('ArrowUp');
    const backKey = this.keys.has('KeyS') || this.keys.has('ArrowDown') || this.btnBrake;
    let throttle = fwdKey ? 1 : 0;
    if (backKey) throttle = -1;
    const s = this.stick;
    if (s.active) {
      target = Math.max(-1, Math.min(1, s.dx / 55));
      const pull = -s.dy / 50; // up = positive
      throttle = this.autoAccel ? (pull < -0.45 ? Math.max(-1, pull) : 1) : Math.max(-1, Math.min(1, pull * 1.4));
    } else if (this.autoAccel && throttle === 0) throttle = 1;
    if (throttle !== 0) this.anyThrottle = true;
    const rate = target === 0 ? 16 : 11;
    this.steer += (target - this.steer) * Math.min(1, rate * dt);
    if (Math.abs(this.steer) < 0.01 && target === 0) this.steer = 0;
    const out = {
      steer: s.active ? target : this.steer,
      throttle,
      boost: this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.btnBoost,
      jump: this.jumpQueued || this.jumpBtn,
    };
    this.jumpQueued = false; this.jumpBtn = false;
    return out;
  }
}
