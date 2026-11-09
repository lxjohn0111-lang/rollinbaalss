// Keyboard + touch input. Produces a normalized steer value [-1..1] and edge-triggered actions.
export class Input {
  constructor(el) {
    this.keys = new Set();
    this.steer = 0;
    this.touchSteer = 0;
    this.dragSteer = 0;
    this.jumpQueued = false;
    this.handlers = {};
    this.touchMode = 'buttons'; // 'buttons' | 'drag'
    this.enabled = true;
    this.isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    this.pointers = new Map();
    this.leftHeld = false; this.rightHeld = false;
    window.addEventListener('keydown', (e) => this.onKey(e, true));
    window.addEventListener('keyup', (e) => this.onKey(e, false));
    window.addEventListener('blur', () => { this.keys.clear(); this.leftHeld = this.rightHeld = false; this.pointers.clear(); });
    this.el = el;
    el.addEventListener('pointerdown', (e) => this.onPointer(e, 'down'));
    window.addEventListener('pointermove', (e) => this.onPointer(e, 'move'));
    window.addEventListener('pointerup', (e) => this.onPointer(e, 'up'));
    window.addEventListener('pointercancel', (e) => this.onPointer(e, 'up'));
  }

  on(evt, fn) { this.handlers[evt] = fn; }
  emit(evt) { if (this.handlers[evt]) this.handlers[evt](); }

  onKey(e, down) {
    const k = e.code;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(k) && e.target === document.body) e.preventDefault();
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
    if (!this.enabled) return;
    if (type === 'down') {
      if (e.target.closest && e.target.closest('.ui-btn, button, .hud-btn')) return;
      this.pointers.set(e.pointerId, { x0: e.clientX, x: e.clientX, lastX: e.clientX, t: performance.now() });
    } else if (type === 'move') {
      const p = this.pointers.get(e.pointerId); if (!p) return;
      p.x = e.clientX;
    } else {
      this.pointers.delete(e.pointerId);
    }
    this.updateTouch();
  }

  updateTouch() {
    let left = false, right = false;
    const w = window.innerWidth;
    for (const p of this.pointers.values()) {
      if (this.touchMode === 'buttons') { if (p.x < w / 2) left = true; else right = true; }
    }
    this.leftHeld = left; this.rightHeld = right;
  }

  // set from on-screen buttons
  setButton(side, held) { if (side === 'left') this.btnLeft = held; else this.btnRight = held; }

  sample(dt) {
    let target = 0;
    const L = this.keys.has('KeyA') || this.keys.has('ArrowLeft') || this.btnLeft || (this.touchMode === 'buttons' && this.leftHeld && !this.rightHeld);
    const Rr = this.keys.has('KeyD') || this.keys.has('ArrowRight') || this.btnRight || (this.touchMode === 'buttons' && this.rightHeld && !this.leftHeld);
    if (L) target -= 1;
    if (Rr) target += 1;
    // drag steering: finger displacement from its anchor maps to steer, anchor follows slowly
    if (this.touchMode === 'drag' && this.pointers.size) {
      const p = this.pointers.values().next().value;
      const dx = (p.x - p.x0) / Math.max(60, window.innerWidth * 0.12);
      target = Math.max(-1, Math.min(1, dx));
      if (Math.abs(p.x - p.x0) > window.innerWidth * 0.14) p.x0 += (p.x - p.x0 - Math.sign(p.x - p.x0) * window.innerWidth * 0.14);
    }
    // keyboard ramps quickly for smooth but responsive steering
    const rate = target === 0 ? 14 : 10;
    this.steer += (target - this.steer) * Math.min(1, rate * dt);
    if (Math.abs(this.steer) < 0.01 && target === 0) this.steer = 0;
    const out = {
      steer: this.steer,
      jump: this.jumpQueued || this.jumpBtn,
      accel: this.keys.has('KeyW') || this.keys.has('ArrowUp'),
      brake: this.keys.has('KeyS') || this.keys.has('ArrowDown'),
    };
    this.jumpQueued = false; this.jumpBtn = false;
    return out;
  }

  pressJump() { this.jumpBtn = true; }
}
