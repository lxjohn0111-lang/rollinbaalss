// Cosmetic ball skins. Purely visual: physics is identical for every skin.
import * as THREE from 'three';
import { ballSkin } from '../gfx/textures.js';

export const SKINS = [
  { id: 'wrecker', name: 'Iron Wrecker', price: 0, desc: 'Battle-scarred cast iron with a painted bolt.', mat: { metalness: 0.75, roughness: 0.38 } },
  { id: 'chrome', name: 'Mirror Chrome', price: 150, desc: 'Polished to a perfect mirror finish.', mat: { color: '#f2f4f8', metalness: 1, roughness: 0.04, tex: false } },
  { id: 'marble', name: 'Carrara Marble', price: 250, desc: 'Hand-picked stone with deep grey veins.', mat: { metalness: 0, roughness: 0.18, clearcoat: 1 } },
  { id: 'beach', name: 'Beach Ball', price: 300, desc: 'Summer stripes, all year round.', mat: { metalness: 0, roughness: 0.35, clearcoat: 0.6 } },
  { id: 'melon', name: 'Watermelon', price: 350, desc: 'Fresh, juicy and surprisingly aerodynamic.', mat: { metalness: 0, roughness: 0.4, clearcoat: 0.4 } },
  { id: 'eight', name: 'Eight Ball', price: 400, desc: 'Classic billiard lacquer.', mat: { metalness: 0, roughness: 0.08, clearcoat: 1 } },
  { id: 'candy', name: 'Candy Swirl', price: 450, desc: 'Peppermint spiral with a glossy shell.', mat: { metalness: 0, roughness: 0.12, clearcoat: 1 } },
  { id: 'camo', name: 'Field Camo', price: 500, desc: 'Matte rubberised camouflage.', mat: { metalness: 0, roughness: 0.85 } },
  { id: 'bowling', name: 'Pro Bowler', price: 600, desc: 'Urethane shell with a violet swirl.', mat: { metalness: 0.1, roughness: 0.1, clearcoat: 1 } },
  { id: 'planet', name: 'Tiny Planet', price: 750, desc: 'Oceans, continents and polar caps.', mat: { metalness: 0, roughness: 0.6 } },
  { id: 'lava', name: 'Magma Core', price: 900, desc: 'Molten cracks glowing through basalt.', mat: { metalness: 0.2, roughness: 0.7, emissive: '#ff6a1a', emissiveIntensity: 2.2 } },
  { id: 'neon', name: 'Neon Grid', price: 1100, desc: 'A synthwave sphere straight from the grid.', mat: { metalness: 0.4, roughness: 0.3, emissive: '#ffffff', emissiveIntensity: 1.8 } },
  { id: 'gold', name: '24K Gold', price: 1500, desc: 'Solid gold. Obviously.', mat: { metalness: 1, roughness: 0.18 } },
  { id: 'disco', name: 'Disco Fever', price: 0, unlock: 'ach:all_levels', desc: 'Unlocked by completing all 20 levels.', mat: { metalness: 1, roughness: 0.12 } },
  { id: 'crystal', name: 'Crystal Orb', price: 0, unlock: 'ach:gems_all', desc: 'Unlocked by collecting every gem.', mat: { color: '#bfe8ff', metalness: 0, roughness: 0.02, transmission: 0.9, thickness: 1.2, ior: 1.6, tex: false } },
];

export function skinById(id) { return SKINS.find((s) => s.id === id) || SKINS[0]; }

export function makeBallMaterial(id, quality = 'high') {
  const s = skinById(id);
  const cfg = s.mat;
  const useTex = cfg.tex !== false;
  const t = useTex ? ballSkin(s.id) : {};
  const params = {
    map: t.map || null,
    color: new THREE.Color(cfg.color || '#ffffff'),
    metalness: cfg.metalness ?? 0.3,
    roughness: cfg.roughness ?? 0.4,
    normalMap: t.normalMap || null,
    emissiveMap: t.emissiveMap || null,
    emissive: new THREE.Color(cfg.emissive || '#000000'),
    emissiveIntensity: cfg.emissiveIntensity ?? 1,
    envMapIntensity: 1.2,
  };
  let m;
  if (cfg.transmission && quality !== 'low') {
    m = new THREE.MeshPhysicalMaterial({ ...params, transmission: cfg.transmission, thickness: cfg.thickness, ior: cfg.ior, clearcoat: 1 });
  } else if (cfg.clearcoat) {
    m = new THREE.MeshPhysicalMaterial({ ...params, clearcoat: cfg.clearcoat, clearcoatRoughness: 0.08 });
  } else if (cfg.transmission) {
    m = new THREE.MeshStandardMaterial({ ...params, transparent: true, opacity: 0.6 });
  } else {
    m = new THREE.MeshStandardMaterial(params);
  }
  return m;
}
