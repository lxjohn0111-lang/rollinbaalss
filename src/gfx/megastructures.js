// Giant animated background machinery placed beside the course so the world never feels static.
import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);

function ringMachine(m, glowMat) {
  const g = new THREE.Group();
  const spin = new THREE.Group(); g.add(spin);
  spin.add(new THREE.Mesh(new THREE.TorusGeometry(16, 1.2, 12, 64), m.darkSteel));
  spin.add(new THREE.Mesh(new THREE.TorusGeometry(14.6, 0.35, 8, 64), glowMat));
  for (let k = 0; k < 6; k++) { const s = new THREE.Mesh(new THREE.BoxGeometry(1, 30, 0.8), m.steel); s.rotation.z = k * Math.PI / 6; spin.add(s); }
  spin.add(new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 2, 24).rotateX(Math.PI / 2), m.machine));
  const tower = new THREE.Mesh(new THREE.BoxGeometry(3, 1, 3).translate(0, -0.5, 0), m.darkSteel); tower.scale.y = 200; tower.position.y = -16; g.add(tower);
  return { g, update: (t) => { spin.rotation.z = t * 0.25; } };
}

function gearMachine(m) {
  const g = new THREE.Group();
  const gears = [];
  for (const [x, y, r, dir] of [[0, 0, 10, 1], [16.5, 6, 7, -1.43], [-14, 10, 5.5, -1.82]]) {
    const gear = new THREE.Group(); gear.position.set(x, y, 0);
    gear.add(new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1.6, 40).rotateX(Math.PI / 2), dir > 0 ? m.machine : m.steel));
    const teeth = Math.round(r * 2.4);
    for (let k = 0; k < teeth; k++) { const tth = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.6, 1.5), dir > 0 ? m.machine : m.steel); const a = k / teeth * Math.PI * 2; tth.position.set(Math.cos(a) * (r + 0.5), Math.sin(a) * (r + 0.5), 0); tth.rotation.z = a; gear.add(tth); }
    gear.add(new THREE.Mesh(new THREE.CylinderGeometry(r * 0.25, r * 0.25, 2.2, 16).rotateX(Math.PI / 2), m.darkSteel));
    g.add(gear); gears.push({ gear, dir });
  }
  const tower = new THREE.Mesh(new THREE.BoxGeometry(4, 1, 4).translate(0, -0.5, 0), m.darkSteel); tower.scale.y = 200; tower.position.y = -10; g.add(tower);
  return { g, update: (t) => { for (const q of gears) q.gear.rotation.z = t * 0.3 * q.dir; } };
}

function pistonTower(m, glowMat) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(9, 1, 9).translate(0, -0.5, 0), m.concrete); body.scale.y = 220; g.add(body);
  const pistons = [];
  for (let k = 0; k < 3; k++) {
    const p = new THREE.Group(); p.position.set(-3 + k * 3, 0, 0);
    p.add(new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 14, 16).translate(0, 7, 0), m.steel));
    const head = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 2.4), m.machine); head.position.y = 14; p.add(head);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), glowMat); lamp.position.y = 14.9; p.add(lamp);
    g.add(p); pistons.push(p);
  }
  return { g, update: (t) => { pistons.forEach((p, i) => { p.position.y = Math.max(0, Math.sin(t * 1.6 + i * 2.1)) * 6; }); } };
}

function turbine(m) {
  const g = new THREE.Group();
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.6, 1, 16).translate(0, -0.5, 0), m.white); mast.scale.y = 240; mast.position.y = 6; g.add(mast);
  const hub = new THREE.Group(); hub.position.y = 8; g.add(hub);
  hub.add(new THREE.Mesh(new THREE.SphereGeometry(1.4, 16, 12), m.white));
  for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.2, 18, 0.3).translate(0, 9.5, 0), m.white); b.rotation.z = k * Math.PI * 2 / 3; hub.add(b); }
  return { g, update: (t) => { hub.rotation.z = t * 0.6; } };
}

function beaconPlatform(m, glowMat) {
  const g = new THREE.Group();
  const disc = new THREE.Group(); g.add(disc);
  disc.add(new THREE.Mesh(new THREE.CylinderGeometry(9, 7, 2, 32), m.darkSteel));
  for (let k = 0; k < 8; k++) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.6), glowMat); const a = k / 8 * Math.PI * 2; l.position.set(Math.cos(a) * 8.6, 1.1, Math.sin(a) * 8.6); disc.add(l); }
  const spire = new THREE.Mesh(new THREE.ConeGeometry(1.2, 12, 8).translate(0, 7, 0), m.machine); disc.add(spire);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 2.5, 40, 12, 1, true).translate(0, 20, 0), new THREE.MeshBasicMaterial({ color: 0xbfeaff, transparent: true, opacity: 0.08, depthWrite: false }));
  disc.add(beam);
  return { g, update: (t) => { disc.rotation.y = t * 0.4; disc.position.y = Math.sin(t * 0.7) * 1.5; beam.rotation.z = Math.sin(t * 0.5) * 0.3; }, dispose: () => beam.material.dispose() };
}

const MAKERS = [ringMachine, gearMachine, pistonTower, turbine, beaconPlatform];

export class MegaStructures {
  constructor(course) {
    this.course = course;
    this.items = [];
    this.nextAt = 60;
    this.count = 0;
    const glow = course.theme.palette.glow || '#38e0ff';
    this.glowMat = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: new THREE.Color(glow), emissiveIntensity: 2.2 });
  }

  // called with the path length after each section is added
  extend(section) {
    const path = this.course.path;
    const sample = {};
    while (this.nextAt < path.length - 10) {
      path.sampleAt(this.nextAt, sample);
      const kind = MAKERS[this.count % MAKERS.length];
      const side = this.count % 2 ? 1 : -1;
      const off = 42 + (this.count * 13) % 20;
      const m = kind(this.course.mats, this.glowMat);
      m.g.position.copy(sample.p).addScaledVector(sample.r, side * off).addScaledVector(UP, (this.count % 3) * 4 - 2);
      m.g.lookAt(sample.p.x, m.g.position.y, sample.p.z);
      m.g.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
      m.owner = section.index;
      this.course.root.add(m.g);
      this.items.push(m);
      this.count++;
      this.nextAt += 95 + (this.count * 37) % 50;
    }
  }

  update(t, ballPos) {
    for (const m of this.items) {
      if (m.g.position.distanceToSquared(ballPos) > 450 * 450) { m.g.visible = false; continue; }
      m.g.visible = true;
      m.update(t);
    }
  }

  release(owner) {
    this.items = this.items.filter((m) => {
      if (m.owner !== owner) return true;
      this.course.root.remove(m.g);
      m.g.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
      if (m.dispose) m.dispose();
      return false;
    });
  }

  dispose() { for (const m of this.items) { m.g.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); if (m.dispose) m.dispose(); } this.items = []; this.glowMat.dispose(); }
}
