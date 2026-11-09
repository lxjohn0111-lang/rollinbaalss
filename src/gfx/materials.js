// Material library. Each environment provides a palette; materials are created per course.
import * as THREE from 'three';
import * as T from './textures.js';

function std(opts) { return new THREE.MeshStandardMaterial(opts); }

export class MaterialLib {
  constructor(palette) {
    this.p = palette;
    this.all = [];
    const add = (k, m) => { this[k] = m; this.all.push(m); m.name = k; return m; };
    const p = palette;

    const wood = T.woodDeck(p.deck);
    add('deck', std({ map: wood.map, normalMap: wood.normalMap, roughnessMap: wood.roughnessMap, roughness: 1, metalness: 0.0, normalScale: new THREE.Vector2(0.9, 0.9) }));
    this.deck.userData.uvMeters = wood.meters;
    const wood2 = T.woodDeck(p.deckAlt || '#c48f58', 'alt');
    add('deckAlt', std({ map: wood2.map, normalMap: wood2.normalMap, roughnessMap: wood2.roughnessMap, roughness: 1, metalness: 0 }));
    this.deckAlt.userData.uvMeters = wood2.meters;
    add('deckSide', std({ color: new THREE.Color(p.deckSide || '#8a5a32'), roughness: 0.75, metalness: 0.05, map: wood.map }));
    this.deckSide.userData.uvMeters = 2;

    const rail = T.paintedMetal(p.rail);
    add('rail', std({ map: rail.map, roughnessMap: rail.roughnessMap, normalMap: rail.normalMap, roughness: 1, metalness: 0.25 }));
    this.rail.userData.uvMeters = 2;
    const acc = T.paintedMetal(p.accent);
    add('accent', std({ map: acc.map, roughnessMap: acc.roughnessMap, normalMap: acc.normalMap, roughness: 1, metalness: 0.25 }));
    this.accent.userData.uvMeters = 2;
    const acc2 = T.paintedMetal(p.accent2 || '#2f7de1');
    add('accent2', std({ map: acc2.map, roughnessMap: acc2.roughnessMap, normalMap: acc2.normalMap, roughness: 1, metalness: 0.25 }));
    this.accent2.userData.uvMeters = 2;
    const mach = T.paintedMetal(p.machine || '#e8b21a');
    add('machine', std({ map: mach.map, roughnessMap: mach.roughnessMap, normalMap: mach.normalMap, roughness: 1, metalness: 0.3 }));
    this.machine.userData.uvMeters = 2;

    const br = T.brushedMetal();
    add('steel', std({ map: br.map, roughnessMap: br.roughnessMap, roughness: 1, metalness: 0.92 }));
    this.steel.userData.uvMeters = 1.5;
    add('darkSteel', std({ color: 0x3b3f46, map: br.map, roughness: 0.45, metalness: 0.85 }));
    this.darkSteel.userData.uvMeters = 1.5;
    const dp = T.diamondPlate();
    add('plate', std({ map: dp.map, normalMap: dp.normalMap, roughness: 0.4, metalness: 0.85 }));
    this.plate.userData.uvMeters = dp.meters;
    const cc = T.concrete(p.concrete || '#b8b2a8');
    add('concrete', std({ map: cc.map, normalMap: cc.normalMap, roughness: 0.92, metalness: 0 }));
    this.concrete.userData.uvMeters = cc.meters;
    const hz = T.hazard();
    add('hazard', std({ map: hz.map, roughness: 0.5, metalness: 0.2 }));
    this.hazard.userData.uvMeters = 1;
    const rb = T.rubber();
    add('rubber', std({ map: rb.map, normalMap: rb.normalMap, roughness: 0.85, metalness: 0 }));
    this.rubber.userData.uvMeters = 1;
    add('bumper', std({ color: 0xff3b6b, roughness: 0.25, metalness: 0.1, emissive: 0x5a0018, emissiveIntensity: 0.6 }));
    add('bouncy', std({ color: 0x2ad3ff, roughness: 0.3, metalness: 0.05, emissive: 0x003a55, emissiveIntensity: 0.6 }));
    const ic = T.ice();
    add('ice', std({ map: ic.map, normalMap: ic.normalMap, roughness: 0.06, metalness: 0.1, transparent: true, opacity: 0.92 }));
    this.ice.userData.uvMeters = ic.meters;
    const gm = T.goo('#6b3f1d');
    add('goo', std({ map: gm.map, normalMap: gm.normalMap, roughness: 0.2, metalness: 0.05 }));
    this.goo.userData.uvMeters = gm.meters;
    const belt = T.conveyorBelt();
    this.beltMap = belt.map.clone(); this.beltMap.needsUpdate = true;
    add('belt', std({ map: this.beltMap, normalMap: belt.normalMap, roughness: 0.7, metalness: 0.2 }));
    this.belt.userData.uvMeters = belt.meters;
    const ck = T.checker();
    add('checker', std({ map: ck.map, roughness: 0.5, metalness: 0.1 }));
    this.checker.userData.uvMeters = 1;
    add('glass', std({ color: 0x9fd8ff, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.35, depthWrite: false }));
    add('glow', std({ color: 0xffffff, emissive: new THREE.Color(p.glow || '#38e0ff'), emissiveIntensity: 2.2, roughness: 0.4 }));
    add('glowRed', std({ color: 0x220000, emissive: 0xff2a2a, emissiveIntensity: 2.6, roughness: 0.4 }));
    add('glowGreen', std({ color: 0x002200, emissive: 0x2aff6a, emissiveIntensity: 2.2, roughness: 0.4 }));
    add('glowGold', std({ color: 0x332200, emissive: 0xffc23a, emissiveIntensity: 2.0, roughness: 0.4 }));
    const ch = T.chevrons('#2f8bff');
    add('arrowBlue', std({ map: ch.map, transparent: true, roughness: 0.4, emissive: 0x0a3aa0, emissiveIntensity: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    const ch2 = T.chevrons('#ffb21f');
    add('arrowGold', std({ map: ch2.map, transparent: true, roughness: 0.4, emissive: 0x804000, emissiveIntensity: 0.8, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    const ch3 = T.chevrons('#3cff7a');
    add('arrowGreen', std({ map: ch3.map, transparent: true, roughness: 0.4, emissive: 0x0a6020, emissiveIntensity: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    add('white', std({ color: 0xf2f2ee, roughness: 0.5 }));
    add('dark', std({ color: 0x1d1f24, roughness: 0.6, metalness: 0.3 }));
    add('rope', std({ color: 0xa07a48, roughness: 0.95 }));
    const coin = T.coinFace();
    add('coin', std({ map: coin.map, normalMap: coin.normalMap, color: 0xffffff, metalness: 1.0, roughness: 0.22, emissive: 0xa86400, emissiveIntensity: 0.6 }));
    add('coinEdge', std({ color: 0xffb627, metalness: 1.0, roughness: 0.25, emissive: 0xa86400, emissiveIntensity: 0.55 }));
    add('gem', new THREE.MeshPhysicalMaterial({ color: 0x9a5bff, metalness: 0.0, roughness: 0.05, clearcoat: 1, emissive: 0x5a1fd0, emissiveIntensity: 0.9, transparent: true, opacity: 0.95 }));
    this.all.push(this.gem);
    // Block palette for knock-down structures
    this.blockColors = (p.blocks || ['#ff5a3c', '#ffc23a', '#3cc2ff', '#7a5cff', '#3cff9a']).map((c) => new THREE.Color(c));
    add('block', std({ color: 0xffffff, roughness: 0.45, metalness: 0.05 }));
    const bk = T.woodDeck('#e6c08a', 'blk');
    add('crate', std({ map: bk.map, normalMap: bk.normalMap, roughness: 0.8 }));
    this.crate.userData.uvMeters = 1;
  }

  dispose() {
    this.all.forEach((m) => m.dispose());
    if (this.beltMap) this.beltMap.dispose();
  }
}

// Generates box-projected UVs scaled in meters so textures keep a consistent density.
export function boxUV(geo, meters = 2, offset = 0) {
  const pos = geo.attributes.position;
  const nrm = geo.attributes.normal;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const ax = Math.abs(nrm.getX(i)), ay = Math.abs(nrm.getY(i)), az = Math.abs(nrm.getZ(i));
    let u, v;
    if (ay >= ax && ay >= az) { u = x; v = z; }
    else if (ax >= az) { u = z; v = y; }
    else { u = x; v = y; }
    uv[i * 2] = u / meters + offset; uv[i * 2 + 1] = v / meters;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}
