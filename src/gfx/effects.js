// Particle effects (sparkles, dust, confetti, speed streaks) and special collectible visuals.
import * as THREE from 'three';
import { softSprite } from './textures.js';

const UP = new THREE.Vector3(0, 1, 0);

class ParticlePool {
  constructor(scene, cap, tex, additive, gravity = 0) {
    this.cap = cap; this.gravity = gravity;
    const geo = new THREE.PlaneGeometry(1, 1);
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: { map: { value: tex } },
      vertexShader: `
        attribute vec4 pcolor; attribute vec2 pextra; varying vec4 vC; varying vec2 vUv;
        void main(){ vUv = uv; vC = pcolor;
          vec3 c = (modelMatrix * instanceMatrix * vec4(0.,0.,0.,1.)).xyz;
          float s = length(instanceMatrix[0].xyz);
          vec3 r = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
          vec3 u = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
          float a = pextra.x; float ca = cos(a), sa = sin(a);
          vec2 p = vec2(position.x*ca - position.y*sa, position.x*sa + position.y*ca) * vec2(1.0, pextra.y);
          gl_Position = projectionMatrix * viewMatrix * vec4(c + (r*p.x + u*p.y)*s, 1.0); }`,
      fragmentShader: `uniform sampler2D map; varying vec4 vC; varying vec2 vUv;
        void main(){ vec4 t = texture2D(map, vUv); gl_FragColor = vec4(vC.rgb * t.rgb, t.a * vC.a); if (gl_FragColor.a < 0.01) discard;
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        }`,
    });
    this.mesh = new THREE.InstancedMesh(geo, mat, cap);
    this.mesh.frustumCulled = false;
    this.color = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4);
    this.extra = new THREE.InstancedBufferAttribute(new Float32Array(cap * 2), 2);
    geo.setAttribute('pcolor', this.color); geo.setAttribute('pextra', this.extra);
    this.p = Array.from({ length: cap }, () => ({ life: 0, max: 1, pos: new THREE.Vector3(), vel: new THREE.Vector3(), size: 1, grow: 0, col: new THREE.Color(), rot: 0, vr: 0, drag: 0, stretch: 1, g: 1 }));
    this.next = 0;
    this.m = new THREE.Matrix4();
    this.renderOrder = 3; this.mesh.renderOrder = 3;
    scene.add(this.mesh);
  }
  spawn(o) {
    const p = this.p[this.next]; this.next = (this.next + 1) % this.cap;
    p.life = o.life; p.max = o.life; p.pos.copy(o.pos); p.vel.copy(o.vel || UP.clone().multiplyScalar(0));
    p.size = o.size || 0.3; p.grow = o.grow || 0; p.col.set(o.color || '#ffffff'); p.rot = o.rot || Math.random() * 6.28; p.vr = o.vr || 0; p.drag = o.drag || 0; p.stretch = o.stretch || 1; p.g = o.g ?? 1; p.alpha = o.alpha ?? 1;
  }
  update(dt) {
    for (let i = 0; i < this.cap; i++) {
      const p = this.p[i];
      if (p.life <= 0) { this.m.makeScale(0, 0, 0); this.mesh.setMatrixAt(i, this.m); continue; }
      p.life -= dt;
      p.vel.y -= this.gravity * p.g * dt;
      p.vel.multiplyScalar(1 - p.drag * dt);
      p.pos.addScaledVector(p.vel, dt);
      p.rot += p.vr * dt;
      const k = Math.max(0, p.life / p.max);
      const s = Math.max(0.001, p.size + p.grow * (1 - k));
      this.m.makeScale(s, s, s).setPosition(p.pos);
      this.mesh.setMatrixAt(i, this.m);
      this.color.setXYZW(i, p.col.r, p.col.g, p.col.b, Math.min(1, k * 2.2) * p.alpha);
      this.extra.setXY(i, p.rot, p.stretch);
    }
    this.mesh.instanceMatrix.needsUpdate = true; this.color.needsUpdate = true; this.extra.needsUpdate = true;
  }
  clear() { this.p.forEach((p) => (p.life = 0)); }
  dispose() { this.mesh.geometry.dispose(); this.mesh.material.dispose(); }
}

export class Effects {
  constructor(engine) {
    this.engine = engine;
    const scene = engine.scene;
    this.spark = new ParticlePool(scene, 220, softSprite('spark').map, true, 2);
    this.dust = new ParticlePool(scene, 160, softSprite('blob').map, false, -0.5);
    const confTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 16; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 16, 16); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    this.confetti = new ParticlePool(scene, 360, confTex, false, 9);
    this.streak = new ParticlePool(scene, 80, softSprite('blob').map, true, 0);
    this.gems = [];
    this.time = 0;
    this.tmp = new THREE.Vector3();
  }

  coinBurst(pos) {
    for (let i = 0; i < 9; i++) {
      const a = Math.random() * Math.PI * 2, s = 1.5 + Math.random() * 2.5;
      this.spark.spawn({ pos, vel: new THREE.Vector3(Math.cos(a) * s, 1.5 + Math.random() * 3, Math.sin(a) * s), life: 0.45 + Math.random() * 0.3, size: 0.28 + Math.random() * 0.2, color: i % 3 ? '#ffd34d' : '#ffffff', drag: 2 });
    }
  }

  gemBurst(pos) {
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2, e = Math.random() * 1.2, s = 3 + Math.random() * 5;
      this.spark.spawn({ pos, vel: new THREE.Vector3(Math.cos(a) * Math.cos(e) * s, Math.sin(e) * s + 2, Math.sin(a) * Math.cos(e) * s), life: 0.8 + Math.random() * 0.5, size: 0.35 + Math.random() * 0.3, color: i % 2 ? '#c69bff' : '#ffffff', drag: 1.5 });
    }
  }

  landDust(pos, strength) {
    const n = Math.min(18, 4 + Math.floor(strength * 1.5));
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 1 + Math.random() * 1.5 + strength * 0.15;
      this.dust.spawn({ pos: this.tmp.copy(pos).setY(pos.y - 0.42), vel: new THREE.Vector3(Math.cos(a) * s, 0.3 + Math.random() * 0.6, Math.sin(a) * s), life: 0.6 + Math.random() * 0.4, size: 0.35, grow: 0.9, color: '#d8cbb5', drag: 3, alpha: 0.55 });
    }
  }

  impact(pos, color = '#ffffff') {
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * Math.PI * 2, s = 3 + Math.random() * 3;
      this.spark.spawn({ pos, vel: new THREE.Vector3(Math.cos(a) * s, Math.random() * 3, Math.sin(a) * s), life: 0.35, size: 0.25, color, drag: 3 });
    }
  }

  confettiBurst(pos, n = 220) {
    const cols = ['#ff4d6d', '#ffd34d', '#4dd2ff', '#7cff6b', '#c38bff', '#ffffff'];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 3 + Math.random() * 9;
      this.confetti.spawn({ pos: this.tmp.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 3, Math.random() * 2, (Math.random() - 0.5) * 3)), vel: new THREE.Vector3(Math.cos(a) * s * 0.6, 6 + Math.random() * 10, Math.sin(a) * s * 0.6), life: 2.5 + Math.random() * 1.5, size: 0.14 + Math.random() * 0.1, color: cols[i % cols.length], vr: (Math.random() - 0.5) * 18, drag: 1.4, stretch: 0.5 + Math.random() });
    }
  }

  speedStreaks(pos, dir) {
    if (Math.random() > 0.6) return;
    const off = new THREE.Vector3((Math.random() - 0.5) * 4, Math.random() * 2.5, (Math.random() - 0.5) * 4);
    this.streak.spawn({ pos: this.tmp.copy(pos).add(off).addScaledVector(dir, 6), vel: dir.clone().multiplyScalar(-25), life: 0.25, size: 0.12, color: '#bfe8ff', stretch: 8, rot: 0, alpha: 0.6 });
  }

  makeGem(pos, mats) {
    const g = new THREE.Group();
    const geo = new THREE.OctahedronGeometry(0.42, 0);
    geo.scale(1, 1.35, 1);
    const m = new THREE.Mesh(geo, mats.gem);
    m.castShadow = true;
    g.add(m);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softSprite('blob').map, color: 0xb98cff, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.scale.set(2.2, 2.2, 1);
    g.add(glow);
    g.position.copy(pos);
    g.userData.base = pos.y;
    this.gems.push(g);
    return g;
  }

  update(dt) {
    this.time += dt;
    for (const g of this.gems) {
      if (!g.parent) continue;
      g.rotation.y += dt * 1.8;
      g.position.y = g.userData.base + Math.sin(this.time * 2.4) * 0.12;
    }
    this.spark.update(dt); this.dust.update(dt); this.confetti.update(dt); this.streak.update(dt);
  }

  clear() {
    this.spark.clear(); this.dust.clear(); this.confetti.clear(); this.streak.clear();
    this.gems = [];
  }
}
