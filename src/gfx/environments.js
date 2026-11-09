// Environment themes: sky, lighting, fog, ground and large-scale scenery that surrounds the course.
// Scenery is instanced and laid out on a camera-relative wrapped grid so it works for both
// handcrafted levels and the endless mode. A path index keeps scenery out of the track corridor.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import * as T from './textures.js';

// ------------------------------------------------------------------ Theme definitions
export const THEMES = {
  metropolis: {
    name: 'Skyline City',
    sky: { top: '#2f6fd0', horizon: '#d6e6f4', bottom: '#e6dccb', sun: '#fff4dc', stars: 0 },
    sunDir: [0.45, 0.72, -0.52], sunColor: '#fff0d8', sunIntensity: 3.3,
    hemi: ['#d2e6ff', '#9c8468', 1.0], fog: ['#d3e1ef', 0.0016], exposure: 1.0, bloom: 0.22,
    palette: { deck: '#d9b07c', deckAlt: '#c99a66', deckSide: '#8d5a31', rail: '#d9261d', accent: '#2f7de1', accent2: '#f5b81c', machine: '#e9b31b', concrete: '#bdb6aa', glow: '#38e0ff' },
    scenery: 'city', ground: 'city', support: 'concrete', trackY: 48,
    city: { styles: [0, 1, 2], tints: ['#c9cdd3', '#d9d2c4', '#a9b6c4', '#e4ddd2', '#b7c3cf', '#cfc6b6'], glass: ['#4f7aa6', '#7fa7c9'], hMin: 25, hMax: 190, density: 0.82, night: 0 },
    music: { root: 57, tempo: 112, scale: 'major', style: 'pop' },
  },
  construction: {
    name: 'Construction Zone',
    sky: { top: '#5b8fcf', horizon: '#ead9bd', bottom: '#d9c4a2', sun: '#fff0cf', stars: 0 },
    sunDir: [-0.5, 0.62, -0.6], sunColor: '#ffe7c2', sunIntensity: 3.0,
    hemi: ['#e8dcc8', '#8a6d4c', 0.95], fog: ['#e2d3bb', 0.0024], exposure: 1.02, bloom: 0.2,
    palette: { deck: '#cf9a5c', deckAlt: '#b9864e', deckSide: '#7a4e2a', rail: '#f2a20c', accent: '#e8541e', accent2: '#2b6cb3', machine: '#f3b90f', concrete: '#a59e92', glow: '#ffb02e' },
    scenery: 'construction', ground: 'dirt', support: 'steel', trackY: 44,
    city: { styles: [2, 1], tints: ['#b5aea3', '#9f988d', '#c2b8a6', '#8d8a85'], glass: ['#5d7286', '#7c8e9e'], hMin: 18, hMax: 110, density: 0.55, night: 0 },
    music: { root: 55, tempo: 118, scale: 'mixolydian', style: 'funk' },
  },
  coastal: {
    name: 'Sunset Coast',
    sky: { top: '#3b4c8f', horizon: '#ffb36b', bottom: '#f08a5d', sun: '#ffd28a', stars: 0 },
    sunDir: [0.1, 0.16, -0.98], sunColor: '#ffbd7a', sunIntensity: 3.6,
    hemi: ['#ffc9a3', '#4b5a7a', 0.95], fog: ['#f5b289', 0.0013], exposure: 1.05, bloom: 0.38,
    palette: { deck: '#e3b27a', deckAlt: '#cf9d66', deckSide: '#90603a', rail: '#2fb5c9', accent: '#ff5f6d', accent2: '#ffd166', machine: '#f2f2f2', concrete: '#e8dccb', glow: '#ffd28a' },
    scenery: 'coastal', ground: 'water', support: 'concrete', trackY: 40,
    city: { styles: [2, 0], tints: ['#fff6ea', '#f3e7d6', '#ffe1c8', '#e6f2f6'], glass: ['#6a8fb5', '#95b7d0'], hMin: 18, hMax: 95, density: 0.42, night: 0.35 },
    music: { root: 53, tempo: 100, scale: 'major', style: 'chill' },
  },
  neon: {
    name: 'Neon District',
    sky: { top: '#05061a', horizon: '#3a1659', bottom: '#120822', sun: '#c58cff', stars: 1 },
    sunDir: [-0.3, 0.55, 0.78], sunColor: '#9fb4ff', sunIntensity: 1.4,
    hemi: ['#6d5be0', '#1a0f2e', 1.1], fog: ['#1b0f33', 0.0021], exposure: 1.0, bloom: 0.42,
    palette: { deck: '#8d92b6', deckAlt: '#787d9e', deckSide: '#2a2c3a', rail: '#ff2bd6', accent: '#19f6ff', accent2: '#ffe84a', machine: '#7a5cff', concrete: '#4b4d5c', glow: '#19f6ff', blocks: ['#ff2bd6', '#19f6ff', '#ffe84a', '#7a5cff', '#3cff9a'] },
    scenery: 'neon', ground: 'neon', support: 'steel', trackY: 52,
    city: { styles: [0, 1, 2], tints: ['#2a2d3f', '#1f2233', '#32293f', '#262b3a'], glass: ['#16203a', '#22315a'], hMin: 30, hMax: 230, density: 0.9, night: 0.55, lit: '#ffb86b', lit2: '#7fd6ff' },
    music: { root: 50, tempo: 124, scale: 'minor', style: 'synth' },
  },
  alpine: {
    name: 'Alpine Summit',
    sky: { top: '#2564c8', horizon: '#cfe4f7', bottom: '#eef3f8', sun: '#ffffff', stars: 0 },
    sunDir: [0.55, 0.6, 0.55], sunColor: '#fff8ee', sunIntensity: 3.4,
    hemi: ['#d7e9ff', '#7e8a7a', 1.0], fog: ['#d9e7f5', 0.0013], exposure: 1.0, bloom: 0.22,
    palette: { deck: '#c98f55', deckAlt: '#b07a46', deckSide: '#6e4523', rail: '#c4302b', accent: '#2f7de1', accent2: '#ffffff', machine: '#e9b31b', concrete: '#9aa0a6', glow: '#7fd6ff' },
    scenery: 'alpine', ground: 'terrain', support: 'wood', trackY: 70,
    music: { root: 52, tempo: 96, scale: 'dorian', style: 'folk' },
  },
  factory: {
    name: 'Mega Factory',
    sky: { top: '#3b3a38', horizon: '#6b6156', bottom: '#2a2724', sun: '#ffd9a0', stars: 0 },
    sunDir: [0.15, 0.95, 0.2], sunColor: '#ffe2b8', sunIntensity: 2.4,
    hemi: ['#ffd8a8', '#3b342c', 1.1], fog: ['#5d5346', 0.0042], exposure: 1.12, bloom: 0.45,
    palette: { deck: '#8f9399', deckAlt: '#7d8187', deckSide: '#4b4f55', rail: '#f3b90f', accent: '#e8541e', accent2: '#2f7de1', machine: '#f3b90f', concrete: '#8b8680', glow: '#ffb02e' },
    deckMat: 'plate',
    scenery: 'factory', ground: 'factory', support: 'steel', trackY: 38,
    music: { root: 48, tempo: 128, scale: 'phrygian', style: 'industrial' },
  },
  clouds: {
    name: 'Cloud Kingdom',
    sky: { top: '#2a7de8', horizon: '#cfe5fb', bottom: '#eaf3fc', sun: '#ffffff', stars: 0 },
    sunDir: [-0.4, 0.78, -0.48], sunColor: '#fff6e8', sunIntensity: 3.2,
    hemi: ['#e6f3ff', '#b9cde6', 1.1], fog: ['#dceaf8', 0.0009], exposure: 0.92, bloom: 0.22,
    palette: { deck: '#d09a5e', deckAlt: '#bf8a52', deckSide: '#8a5a32', rail: '#ff7a3d', accent: '#ffb84a', accent2: '#3f8ff0', machine: '#ffd34d', concrete: '#e9edf2', glow: '#fff3a0', blocks: ['#ff6b6b', '#ffd34d', '#4dabff', '#ff8ad0', '#6bdc7a'] },
    scenery: 'clouds', ground: 'clouds', support: 'none', trackY: 60,
    music: { root: 60, tempo: 92, scale: 'lydian', style: 'dream' },
  },
  architect: {
    name: 'Pastel Plaza',
    sky: { top: '#68a8f0', horizon: '#f6e6f2', bottom: '#f3e8dd', sun: '#fff6e8', stars: 0 },
    sunDir: [0.6, 0.66, -0.3], sunColor: '#fff3e6', sunIntensity: 3.0,
    hemi: ['#ffe9f6', '#b2a59a', 1.1], fog: ['#f1e4ee', 0.0017], exposure: 1.02, bloom: 0.25,
    palette: { deck: '#f2c690', deckAlt: '#e9b680', deckSide: '#b07850', rail: '#ff6f91', accent: '#5ec2b7', accent2: '#ffd166', machine: '#7b6cf6', concrete: '#efe6dc', glow: '#ff9ad5', blocks: ['#ff6f91', '#5ec2b7', '#ffd166', '#7b6cf6', '#8ad7ff'] },
    scenery: 'architect', ground: 'plaza', support: 'concrete', trackY: 42,
    city: { styles: [2, 1], tints: ['#ffc8d6', '#c9f0e4', '#fff1b8', '#d9ccff', '#bfe6ff', '#ffd9b8'], glass: ['#87b6d8', '#a8d0e6'], hMin: 14, hMax: 90, density: 0.6, night: 0 },
    music: { root: 62, tempo: 108, scale: 'major', style: 'bounce' },
  },
  desert: {
    name: 'Canyon Mesa',
    sky: { top: '#3f7bd0', horizon: '#f4dcb8', bottom: '#e4b98a', sun: '#fff1d6', stars: 0 },
    sunDir: [-0.65, 0.55, 0.5], sunColor: '#ffe2b8', sunIntensity: 3.5,
    hemi: ['#f5e3cc', '#a0643a', 1.0], fog: ['#efd7b6', 0.0016], exposure: 1.02, bloom: 0.25,
    palette: { deck: '#d4a066', deckAlt: '#bf8a52', deckSide: '#7b4a26', rail: '#2f9fb0', accent: '#e8541e', accent2: '#ffd166', machine: '#e9b31b', concrete: '#c9a27c', glow: '#ffcf7a' },
    scenery: 'desert', ground: 'terrain', support: 'wood', trackY: 56,
    music: { root: 50, tempo: 104, scale: 'phrygian', style: 'western' },
  },
  harbor: {
    name: 'Night Harbor',
    sky: { top: '#0b1430', horizon: '#3a4f7a', bottom: '#162238', sun: '#cfe0ff', stars: 1 },
    sunDir: [0.4, 0.5, 0.75], sunColor: '#aac4ff', sunIntensity: 1.6,
    hemi: ['#6f87c9', '#1a2236', 1.0], fog: ['#24324f', 0.0019], exposure: 1.12, bloom: 0.6,
    palette: { deck: '#b88a5c', deckAlt: '#a27750', deckSide: '#5a3b22', rail: '#ff8a1f', accent: '#36d3ff', accent2: '#ffe84a', machine: '#ff8a1f', concrete: '#6f7680', glow: '#ffb35a' },
    scenery: 'coastal', ground: 'water', support: 'steel', trackY: 42,
    city: { styles: [1, 2, 0], tints: ['#3b4250', '#454b58', '#2f3542', '#50565f'], glass: ['#1f2b44', '#2c3b58'], hMin: 20, hMax: 140, density: 0.55, night: 0.85 },
    music: { root: 49, tempo: 98, scale: 'minor', style: 'chill' },
  },
};

// ------------------------------------------------------------------ Path spatial index
export class PathIndex {
  constructor(cell = 40) { this.cell = cell; this.map = new Map(); this.minY = Infinity; this.maxY = -Infinity; this.count = 0; }
  key(ix, iz) { return ix * 73856093 ^ iz * 19349663; }
  add(x, y, z) {
    if (!this.box) this.box = { x0: x, x1: x, z0: z, z1: z };
    else { this.box.x0 = Math.min(this.box.x0, x); this.box.x1 = Math.max(this.box.x1, x); this.box.z0 = Math.min(this.box.z0, z); this.box.z1 = Math.max(this.box.z1, z); }
    const ix = Math.floor(x / this.cell), iz = Math.floor(z / this.cell);
    const k = this.key(ix, iz);
    let a = this.map.get(k);
    if (!a) { a = []; this.map.set(k, a); }
    a.push(x, y, z);
    this.minY = Math.min(this.minY, y); this.maxY = Math.max(this.maxY, y);
    this.count++;
  }
  clear() { this.map.clear(); this.count = 0; this.minY = Infinity; this.maxY = -Infinity; this.box = null; }
  takeBox() { const b = this.box; this.box = null; return b; }
  // returns {d, y} distance (horizontal) to nearest sample within radius
  nearest(x, z, radius) {
    const c = this.cell; const r = Math.ceil(radius / c);
    const ix = Math.floor(x / c), iz = Math.floor(z / c);
    let best = Infinity, by = 0;
    for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) {
      const arr = this.map.get(this.key(ix + a, iz + b));
      if (!arr) continue;
      for (let i = 0; i < arr.length; i += 3) {
        const dx = arr[i] - x, dz = arr[i + 2] - z; const d = dx * dx + dz * dz;
        if (d < best) { best = d; by = arr[i + 1]; }
      }
    }
    return { d: Math.sqrt(best), y: by };
  }
}

function hash2(x, z, s = 0) {
  let h = (x * 374761393 + z * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// ------------------------------------------------------------------ Shaders
function skyMaterial(sky, sunDir) {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      top: { value: new THREE.Color(sky.top) }, horizon: { value: new THREE.Color(sky.horizon) },
      bottom: { value: new THREE.Color(sky.bottom) }, sunCol: { value: new THREE.Color(sky.sun) },
      sunDir: { value: new THREE.Vector3(...sunDir).normalize() }, stars: { value: sky.stars || 0 },
      time: { value: 0 },
    },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix*vec4(position,1.0); gl_Position = projectionMatrix*p; gl_Position.z = gl_Position.w*0.99999; }`,
    fragmentShader: `
      uniform vec3 top, horizon, bottom, sunCol, sunDir; uniform float stars, time; varying vec3 vDir;
      float h21(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
      void main(){
        vec3 d = normalize(vDir);
        float y = d.y;
        vec3 col = y > 0.0 ? mix(horizon, top, pow(clamp(y,0.0,1.0), 0.55)) : mix(horizon, bottom, pow(clamp(-y,0.0,1.0), 0.4));
        float sd = max(dot(d, normalize(sunDir)), 0.0);
        col += sunCol * (pow(sd, 900.0) * 6.0 + pow(sd, 60.0) * 0.45 + pow(sd, 6.0) * 0.18);
        col = mix(col, horizon*1.04, exp(-abs(y)*22.0)*0.5);
        if (stars > 0.0 && y > 0.0) {
          vec2 g = d.xz / (y + 0.35) * 160.0; vec2 id = floor(g); float r = h21(id);
          float s = step(0.985, r) * smoothstep(0.5, 0.0, length(fract(g)-0.5)) * (0.6+0.4*sin(time*2.0+r*40.0));
          col += vec3(s) * stars * smoothstep(0.0, 0.3, y);
        }
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}

// Facade material: procedurally drawn windows in world space, with night lights.
function facadeMaterial(style, opts) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, metalness: 0.05 });
  const params = [
    { win: new THREE.Vector2(2.2, 3.6), frame: new THREE.Vector2(0.05, 0.07), glassRough: 0.06, glassMetal: 0.85 }, // glass curtain
    { win: new THREE.Vector2(3.2, 3.8), frame: new THREE.Vector2(0.14, 0.26), glassRough: 0.1, glassMetal: 0.7 }, // office bands
    { win: new THREE.Vector2(2.6, 3.2), frame: new THREE.Vector2(0.28, 0.3), glassRough: 0.15, glassMetal: 0.5 }, // residential
  ][style];
  m.userData.uniforms = {
    uWin: { value: params.win }, uFrame: { value: params.frame },
    uGlassA: { value: new THREE.Color(opts.glass[0]) }, uGlassB: { value: new THREE.Color(opts.glass[1]) },
    uNight: { value: opts.night || 0 }, uLit: { value: new THREE.Color(opts.lit || '#ffd59a') },
    uLit2: { value: new THREE.Color(opts.lit2 || '#9fd8ff') },
    uGR: { value: params.glassRough }, uGM: { value: params.glassMetal },
  };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, m.userData.uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vFP; varying vec3 vFN; varying vec2 vSeed;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        vec4 fwp = vec4(transformed, 1.0);
        vec3 fn = objectNormal;
        #ifdef USE_INSTANCING
          fwp = instanceMatrix * fwp; fn = mat3(instanceMatrix) * fn; vSeed = instanceMatrix[3].xz;
        #else
          vSeed = vec2(0.0);
        #endif
        fwp = modelMatrix * fwp; vFP = fwp.xyz; vFN = normalize(mat3(modelMatrix) * fn);`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vFP; varying vec3 vFN; varying vec2 vSeed;
        uniform vec2 uWin; uniform vec2 uFrame; uniform vec3 uGlassA; uniform vec3 uGlassB; uniform float uNight; uniform vec3 uLit; uniform vec3 uLit2; uniform float uGR; uniform float uGM;
        float fh(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 wn = normalize(vFN);
        float roof = step(0.6, wn.y);
        vec2 fuv = abs(wn.x) > 0.5 ? vec2(vFP.z, vFP.y) : vec2(vFP.x, vFP.y);
        vec2 cell = fuv / uWin; vec2 fr = fract(cell); vec2 cid = floor(cell);
        float win = step(uFrame.x, fr.x) * step(fr.x, 1.0 - uFrame.x) * step(uFrame.y, fr.y) * step(fr.y, 1.0 - uFrame.y);
        win *= (1.0 - roof) * step(2.0, vFP.y);
        float rnd = fh(cid + vSeed * 0.123);
        vec3 glass = mix(uGlassA, uGlassB, rnd * 0.7 + fr.y * 0.3);
        vec3 wall = diffuseColor.rgb;
        diffuseColor.rgb = mix(wall, glass * (0.75 + 0.5 * diffuseColor.rgb), win);
        diffuseColor.rgb = mix(diffuseColor.rgb, wall * 0.55, roof);
        float lit = step(1.0 - (0.18 + 0.5 * uNight), fh(cid * 1.7 + vSeed * 0.31)) * win;`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, uGR, win);`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
        metalnessFactor = mix(metalnessFactor, uGM, win);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += lit * mix(uLit, uLit2, step(0.7, rnd)) * uNight * (0.45 + 0.4 * rnd);`);
  };
  m.customProgramCacheKey = () => 'facade' + style;
  return m;
}

// Camera-facing instanced quads (clouds, glows, foliage cards).
function billboardMaterial(map, color, opacity = 1, fogged = true, additive = false) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: fogged,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { map: { value: map }, color: { value: new THREE.Color(color) }, opacity: { value: opacity } }]),
    vertexShader: `
      #include <fog_pars_vertex>
      varying vec2 vUv; varying float vShade;
      void main(){
        vUv = uv;
        vec3 center = (modelMatrix * instanceMatrix * vec4(0.0,0.0,0.0,1.0)).xyz;
        float sx = length(instanceMatrix[0].xyz); float sy = length(instanceMatrix[1].xyz);
        vec3 camR = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
        vec3 camU = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
        vec3 wp = center + camR * position.x * sx + camU * position.y * sy;
        vShade = 0.82 + 0.18 * uv.y;
        vec4 mvPosition = viewMatrix * vec4(wp, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      #include <fog_pars_fragment>
      uniform sampler2D map; uniform vec3 color; uniform float opacity; varying vec2 vUv; varying float vShade;
      void main(){ vec4 t = texture2D(map, vUv); gl_FragColor = vec4(color * t.rgb * vShade, t.a * opacity); if (gl_FragColor.a < 0.01) discard;
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
}

function waterMaterial(theme) {
  const sky = theme.sky;
  return new THREE.ShaderMaterial({
    fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      time: { value: 0 }, deep: { value: new THREE.Color(theme.water?.deep || '#0d3b5c') }, shallow: { value: new THREE.Color(theme.water?.shallow || '#2a7c9a') },
      skyCol: { value: new THREE.Color(sky.horizon) }, sunCol: { value: new THREE.Color(theme.sunColor) }, sunDir: { value: new THREE.Vector3(...theme.sunDir).normalize() },
    }]),
    vertexShader: `
      #include <fog_pars_vertex>
      varying vec3 vW;
      void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      #include <fog_pars_fragment>
      uniform float time; uniform vec3 deep, shallow, skyCol, sunCol, sunDir; varying vec3 vW;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      float wave(vec2 p){ float s=0.0, a=0.5; mat2 m = mat2(1.6,1.2,-1.2,1.6); for(int i=0;i<5;i++){ s += a*n(p); p = m*p + time*0.35; a*=0.5; } return s; }
      void main(){
        vec2 p = vW.xz * 0.06;
        float e = 0.08;
        float h0 = wave(p), hx = wave(p+vec2(e,0.0)), hz = wave(p+vec2(0.0,e));
        vec3 nrm = normalize(vec3((h0-hx)*3.2, 1.0, (h0-hz)*3.2));
        vec3 V = normalize(cameraPosition - vW);
        float fres = pow(1.0 - max(dot(nrm, V), 0.0), 4.0);
        vec3 col = mix(deep, shallow, h0*0.7);
        col = mix(col, skyCol, 0.25 + fres*0.6);
        vec3 R = reflect(-V, nrm);
        float spec = pow(max(dot(R, normalize(sunDir)), 0.0), 220.0);
        col += sunCol * spec * 3.5;
        float spark = pow(max(dot(R, normalize(sunDir)), 0.0), 28.0);
        col += sunCol * spark * 0.25;
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
}

function cloudSeaMaterial(theme) {
  return new THREE.ShaderMaterial({
    fog: true, transparent: false,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      time: { value: 0 }, sunDir: { value: new THREE.Vector3(...theme.sunDir).normalize() },
      lit: { value: new THREE.Color('#f2f6fc') }, shade: { value: new THREE.Color('#93a9c8') },
    }]),
    vertexShader: `
      #include <fog_pars_vertex>
      varying vec3 vW;
      void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      #include <fog_pars_fragment>
      uniform float time; uniform vec3 sunDir, lit, shade; varying vec3 vW;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      float fbm(vec2 p){ float s=0.0,a=0.5; for(int i=0;i<6;i++){ s+=a*n(p); p=p*2.03+vec2(time*0.01,0.0); a*=0.5;} return s; }
      void main(){
        vec2 p = vW.xz * 0.004;
        float d = fbm(p + vec2(time*0.004, 0.0));
        float dx = fbm(p + vec2(0.01,0.0) + vec2(time*0.004,0.0)) - d;
        float puff = smoothstep(0.25, 0.75, d);
        float light = clamp(0.6 + dx * 30.0 * sunDir.x + puff*0.4, 0.0, 1.2);
        vec3 col = mix(shade, lit, light);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
}

// Far silhouette ring (distant skyline / mountains), drawn behind the scenery.
function silhouetteRing(kind, color, radius, height, seed = 1) {
  const W = 2048, H = 256;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const r = T.rng(seed);
  ctx.fillStyle = '#ffffff';
  if (kind === 'city') {
    let x = 0;
    while (x < W) {
      const w = 12 + r() * 40, h = 30 + Math.pow(r(), 1.6) * 200;
      ctx.fillRect(x, H - h, w, h);
      if (r() < 0.25) ctx.fillRect(x + w / 2 - 1, H - h - 18, 2, 18);
      x += w + r() * 6;
    }
  } else {
    const f = T.fbmFactory(64, seed * 7, 5);
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 4) {
      const v = f(x * 0.012, 3.3);
      const h = kind === 'mesa' ? (v > 0.52 ? 150 : 70 + v * 40) : 40 + Math.pow(v, 1.6) * 230;
      ctx.lineTo(x, H - h);
    }
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c); tex.wrapS = THREE.RepeatWrapping; tex.repeat.set(2, 1); tex.colorSpace = THREE.SRGBColorSpace;
  const geo = new THREE.CylinderGeometry(radius, radius, height, 64, 1, true);
  const mat = new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(color), transparent: true, side: THREE.BackSide, depthWrite: false, fog: false, alphaTest: 0.5 });
  // Use texture as alpha mask: white silhouette on transparent background.
  mat.alphaMap = tex;
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = -5;
  mesh.userData.height = height;
  return mesh;
}

// ------------------------------------------------------------------ Environment
export class Environment {
  constructor(engine, themeId, quality) {
    this.engine = engine;
    this.themeId = THEMES[themeId] ? themeId : 'metropolis';
    this.theme = THEMES[this.themeId];
    this.quality = quality;
    this.root = new THREE.Group();
    this.root.name = 'environment';
    this.follow = new THREE.Group(); // objects that follow camera on XZ
    this.root.add(this.follow);
    this.pathIndex = new PathIndex(40);
    this.layers = [];
    this.onDirty = [];
    this.disposables = [];
    this.time = 0;
    this.lastCell = null;
    this.dirty = true;
    this.build();
  }

  get trackY() { return this.theme.trackY; }

  build() {
    const th = this.theme, eng = this.engine, scene = eng.scene;
    // Sky
    this.skyMat = skyMaterial(th.sky, th.sunDir);
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(2400, 32, 16), this.skyMat);
    this.sky.renderOrder = -10; this.sky.frustumCulled = false;
    this.follow.add(this.sky);
    // Fog / lights
    scene.fog = new THREE.FogExp2(new THREE.Color(th.fog[0]), th.fog[1]);
    scene.background = new THREE.Color(th.sky.horizon);
    eng.sun.color.set(th.sunColor); eng.sun.intensity = th.sunIntensity;
    eng.sunDir.set(...th.sunDir).normalize();
    eng.hemi.color.set(th.hemi[0]); eng.hemi.groundColor.set(th.hemi[1]); eng.hemi.intensity = th.hemi[2];
    eng.renderer.toneMappingExposure = th.exposure;
    eng.setBloom(th.bloom, th.bloom > 0.4 ? 0.8 : 0.86);
    // Environment map from sky (+ a ground disc so reflections have a horizon)
    const envScene = new THREE.Scene();
    const envSky = new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), skyMaterial(th.sky, th.sunDir));
    envScene.add(envSky);
    const g = new THREE.Mesh(new THREE.CircleGeometry(90, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(th.sky.bottom).multiplyScalar(0.6) }));
    g.rotation.x = -Math.PI / 2; g.position.y = -12; envScene.add(g);
    eng.setEnvironmentMap(envScene);
    envSky.geometry.dispose(); envSky.material.dispose(); g.geometry.dispose(); g.material.dispose();

    const q = this.quality.scenery;
    switch (th.scenery) {
      case 'city': this.buildGround(); this.buildCity(th.city, q); this.addRing('city', th.sky.horizon, 0.86); this.buildCloudPuffs(q, 0.6); break;
      case 'construction': this.buildGround(); this.buildCity(th.city, q * 0.8); this.buildCranes(q); this.buildFrames(q); this.addRing('city', th.sky.horizon, 0.82); break;
      case 'coastal': this.buildWater(); this.buildIslands(q); this.addRing('mountain', th.sky.horizon, 0.7); this.buildCloudPuffs(q, 0.5); break;
      case 'neon': this.buildGround(); this.buildCity(th.city, q); this.buildNeonStrips(q); this.addRing('city', '#2a1446', 0.95); break;
      case 'alpine': this.buildTerrain('alpine', q); this.addRing('mountain', '#b8cde4', 0.75); this.buildCloudPuffs(q, 0.4); break;
      case 'desert': this.buildTerrain('desert', q); this.addRing('mesa', '#e2b98e', 0.8); break;
      case 'factory': this.buildGround(); this.buildFactory(q); break;
      case 'clouds': this.buildCloudSea(); this.buildFloatingIslands(q); this.buildCloudPuffs(q, 1.4); this.buildBalloons(q); break;
      case 'architect': this.buildGround(); this.buildCity(th.city, q); this.buildPastelShapes(q); this.buildTrees(q, 'round'); this.buildCloudPuffs(q, 0.5); break;
      default: this.buildGround(); this.buildCity(th.city || THEMES.metropolis.city, q);
    }
    scene.add(this.root);
  }

  // -------------------------------------------------------------- ground
  buildGround() {
    const th = this.theme;
    let mat;
    if (th.ground === 'city') {
      const t = T.cityGround();
      const map = t.map.clone(); map.needsUpdate = true; map.repeat.set(4000 / 80, 4000 / 80);
      mat = new THREE.MeshStandardMaterial({ map, roughness: 0.95 });
      this.disposables.push(map);
    } else if (th.ground === 'neon') {
      const c = document.createElement('canvas'); c.width = c.height = 256; const ctx = c.getContext('2d');
      ctx.fillStyle = '#0b0a14'; ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = '#ff2bd6'; ctx.lineWidth = 4; ctx.strokeRect(2, 2, 252, 252);
      ctx.strokeStyle = 'rgba(25,246,255,0.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(128, 0); ctx.lineTo(128, 256); ctx.moveTo(0, 128); ctx.lineTo(256, 128); ctx.stroke();
      const map = new THREE.CanvasTexture(c); map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(4000 / 80, 4000 / 80); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8;
      mat = new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: 0xffffff, emissiveIntensity: 0.6, roughness: 0.4, metalness: 0.5 });
      this.disposables.push(map);
    } else {
      const t = T.naturalGround(th.ground === 'factory' ? 'factory' : th.ground);
      const map = t.map.clone(); map.needsUpdate = true; map.repeat.set(4000 / t.meters, 4000 / t.meters);
      mat = new THREE.MeshStandardMaterial({ map, roughness: 0.9 });
      this.disposables.push(map);
    }
    const period = th.ground === 'city' || th.ground === 'neon' ? 80 : T.naturalGround(th.ground === 'factory' ? 'factory' : th.ground).meters;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), mat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.ground = ground;
    this.groundMap = mat.map;
    this.root.add(ground);
    this.layers.push({
      update: (cam) => {
        // keep ground under camera; shift texture offset to stay world-aligned
        const s = period * Math.max(1, Math.round(80 / period));
        const gx = Math.floor(cam.x / s) * s, gz = Math.floor(cam.z / s) * s;
        ground.position.set(gx, 0, gz);
      },
      dispose: () => { ground.geometry.dispose(); mat.dispose(); },
    });
  }

  buildWater() {
    const mat = waterMaterial(this.theme);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000), mat);
    water.rotation.x = -Math.PI / 2;
    this.root.add(water);
    this.layers.push({
      update: (cam, t) => { water.position.set(cam.x, 0, cam.z); mat.uniforms.time.value = t; },
      dispose: () => { water.geometry.dispose(); mat.dispose(); },
    });
  }

  buildCloudSea() {
    const mat = cloudSeaMaterial(this.theme);
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000), mat);
    sea.rotation.x = -Math.PI / 2;
    sea.position.y = 0;
    this.root.add(sea);
    this.layers.push({
      update: (cam, t) => { sea.position.set(cam.x, 0, cam.z); mat.uniforms.time.value = t; },
      dispose: () => { sea.geometry.dispose(); mat.dispose(); },
    });
  }

  addRing(kind, color, heightFactor) {
    const c = new THREE.Color(color);
    const hsl = {}; c.getHSL(hsl);
    c.setHSL(hsl.h, Math.min(1, hsl.s * 0.8), hsl.l * 0.8);
    const ring = silhouetteRing(kind, c, 2100, 520 * heightFactor, kind.length * 3 + 1);
    ring.position.y = ring.userData.height / 2 - 30;
    this.follow.add(ring);
    this.disposables.push(ring.geometry, ring.material, ring.material.map);
  }

  // -------------------------------------------------------------- wrapped grid helper
  // Generic camera-relative instanced placement. fill(cellX, cellZ, out) pushes instance data.
  addGridLayer({ cell, radius, meshes, place }) {
    const layer = { cell, radius, meshes, place, lastKey: null };
    meshes.forEach((m) => { m.frustumCulled = false; this.root.add(m); });
    const mtx = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const sV = new THREE.Vector3(); const pV = new THREE.Vector3();
    const col = new THREE.Color();
    const yAxis = new THREE.Vector3(0, 1, 0);
    layer.update = (cam, t, force) => {
      const cx = Math.floor(cam.x / cell), cz = Math.floor(cam.z / cell);
      const key = cx + ',' + cz;
      if (key === layer.lastKey && !force) return;
      layer.lastKey = key;
      layer.stale = false;
      const counts = meshes.map(() => 0);
      const emit = (mi, x, y, z, sx, sy, sz, rotY = 0, color = null) => {
        const m = meshes[mi];
        if (counts[mi] >= m.instanceMatrix.count) return;
        pV.set(x, y, z); sV.set(sx, sy, sz); q.setFromAxisAngle(yAxis, rotY);
        mtx.compose(pV, q, sV);
        m.setMatrixAt(counts[mi], mtx);
        if (color && m.instanceColor) { col.set(color); m.setColorAt(counts[mi], col); }
        counts[mi]++;
      };
      for (let a = -radius; a <= radius; a++) for (let b = -radius; b <= radius; b++) {
        if (a * a + b * b > radius * radius + 1) continue;
        place(cx + a, cz + b, emit);
      }
      meshes.forEach((m, i) => { m.count = counts[i]; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; });
    };
    layer.dispose = () => meshes.forEach((m) => { m.geometry.dispose(); m.dispose && m.dispose(); });
    layer.grid = true;
    this.layers.push(layer);
    return layer;
  }

  // Check corridor: returns max allowed height at x,z given footprint radius (Infinity = free).
  corridorLimit(x, z, rad, clearance = 16) {
    if (!this.pathIndex.count) return Infinity;
    const n = this.pathIndex.nearest(x, z, rad + clearance + 40);
    if (n.d === Infinity) return Infinity;
    if (n.d < rad + clearance) return n.y - 14;
    if (n.d < rad + clearance + 18) return n.y - 6 + (n.d - rad - clearance) * 3; // soft
    return Infinity;
  }

  // -------------------------------------------------------------- city
  buildCity(cfg, q) {
    const cell = 40;
    const radius = Math.round(15 * Math.sqrt(q)) + 3;
    const cap = (2 * radius + 1) ** 2;
    const box = new THREE.BoxGeometry(1, 1, 1); box.translate(0, 0.5, 0);
    const meshes = cfg.styles.map((s) => {
      const mat = facadeMaterial(s, { glass: cfg.glass, night: cfg.night, lit: cfg.lit, lit2: cfg.lit2 });
      const im = new THREE.InstancedMesh(box, mat, cap);
      im.castShadow = false; im.receiveShadow = true;
      im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
      this.disposables.push(mat);
      return im;
    });
    const roofMat = new THREE.MeshStandardMaterial({ color: cfg.night ? 0x2a2c36 : 0x8f9196, roughness: 0.8, metalness: 0.3 });
    const roofGeo = new THREE.BoxGeometry(1, 1, 1); roofGeo.translate(0, 0.5, 0);
    const roofs = new THREE.InstancedMesh(roofGeo, roofMat, cap * 2);
    const antGeo = new THREE.CylinderGeometry(0.08, 0.25, 1, 6); antGeo.translate(0, 0.5, 0);
    const antMat = new THREE.MeshStandardMaterial({ color: 0x9a9da3, metalness: 0.8, roughness: 0.35, emissive: cfg.night ? 0xff2030 : 0x000000, emissiveIntensity: 0.5 });
    const ants = new THREE.InstancedMesh(antGeo, antMat, cap);
    this.disposables.push(roofMat, antMat);
    const all = [...meshes, roofs, ants];
    const ns = meshes.length;
    const tints = cfg.tints;
    this.addGridLayer({
      cell, radius, meshes: all,
      place: (ix, iz, emit) => {
        const h0 = hash2(ix, iz, 1);
        if (h0 > cfg.density) return;
        // 80m blocks with roads: a cell is half a block; keep buildings inside block interior
        const bx = ix * cell, bz = iz * cell;
        const inX = ((ix % 2) + 2) % 2, inZ = ((iz % 2) + 2) % 2;
        const fw = 16 + hash2(ix, iz, 2) * 14, fd = 16 + hash2(ix, iz, 3) * 14;
        const cx = bx + cell / 2 + (inX ? 4 : -4), cz = bz + cell / 2 + (inZ ? 4 : -4);
        let h = cfg.hMin + Math.pow(hash2(ix, iz, 4), 2.2) * (cfg.hMax - cfg.hMin);
        const lim = this.corridorLimit(cx, cz, Math.max(fw, fd) * 0.7);
        if (lim < h) h = lim;
        if (h < 8) return;
        const style = Math.floor(hash2(ix, iz, 5) * ns);
        const tint = tints[Math.floor(hash2(ix, iz, 6) * tints.length)];
        emit(style, cx, 0, cz, fw, h, fd, 0, tint);
        // setbacks for tall towers
        if (h > 70 && hash2(ix, iz, 7) > 0.4) {
          const h2 = h * (0.15 + hash2(ix, iz, 8) * 0.25);
          if (h + h2 < lim) emit(style, cx, h, cz, fw * 0.72, h2, fd * 0.72, 0, tint);
        }
        // roof equipment
        const ru = 2 + hash2(ix, iz, 9) * 3;
        if (h + ru < lim) emit(ns, cx + (hash2(ix, iz, 10) - 0.5) * fw * 0.4, h, cz + (hash2(ix, iz, 11) - 0.5) * fd * 0.4, fw * 0.3, ru, fd * 0.25);
        if (h > 110 && hash2(ix, iz, 12) > 0.5 && h + 26 < lim) emit(ns + 1, cx, h, cz, 1, 18 + hash2(ix, iz, 13) * 14, 1);
      },
    });
  }

  buildNeonStrips(q) {
    const cell = 40, radius = Math.round(13 * Math.sqrt(q)) + 2;
    const cap = (2 * radius + 1) ** 2 * 2;
    const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
    const im = new THREE.InstancedMesh(geo, mat, cap);
    im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
    const cols = ['#ff2bd6', '#19f6ff', '#ffe84a', '#7a5cff', '#3cff9a'];
    const holoGeo = new THREE.PlaneGeometry(1, 1);
    const holoMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, side: THREE.DoubleSide, toneMapped: false, depthWrite: false });
    const holo = new THREE.InstancedMesh(holoGeo, holoMat, cap / 2);
    holo.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap / 2 * 3), 3);
    this.disposables.push(mat, holoMat);
    const cfg = this.theme.city;
    this.addGridLayer({
      cell, radius, meshes: [im, holo],
      place: (ix, iz, emit) => {
        if (hash2(ix, iz, 1) > cfg.density) return;
        const fw = 16 + hash2(ix, iz, 2) * 14, fd = 16 + hash2(ix, iz, 3) * 14;
        const inX = ((ix % 2) + 2) % 2, inZ = ((iz % 2) + 2) % 2;
        const cx = ix * cell + cell / 2 + (inX ? 4 : -4), cz = iz * cell + cell / 2 + (inZ ? 4 : -4);
        let h = cfg.hMin + Math.pow(hash2(ix, iz, 4), 2.2) * (cfg.hMax - cfg.hMin);
        const lim = this.corridorLimit(cx, cz, Math.max(fw, fd) * 0.7);
        if (lim < h) h = lim;
        if (h < 8) return;
        const c = cols[Math.floor(hash2(ix, iz, 20) * cols.length)];
        if (hash2(ix, iz, 21) > 0.35) {
          emit(0, cx + fw / 2, 0, cz + fd / 2, 0.5, h, 0.5, 0, c);
          emit(0, cx - fw / 2, 0, cz + fd / 2, 0.5, h, 0.5, 0, c);
        }
        if (hash2(ix, iz, 22) > 0.55) emit(0, cx, h * (0.3 + hash2(ix, iz, 23) * 0.5), cz + fd / 2 + 0.1, fw * 1.01, 0.6, 0.4, 0, cols[(Math.floor(hash2(ix, iz, 24) * 5))]);
        if (hash2(ix, iz, 25) > 0.7 && h > 30) emit(1, cx, h * 0.6, cz + fd / 2 + 1.5, 10, 6, 1, 0, cols[Math.floor(hash2(ix, iz, 26) * 5)]);
      },
    });
  }

  buildCloudPuffs(q, amount) {
    const cell = 180, radius = Math.max(2, Math.round(7 * Math.sqrt(q)));
    const cap = (2 * radius + 1) ** 2 * 3;
    const tex = T.softSprite('cloud').map;
    const mat = billboardMaterial(tex, '#ffffff', this.theme.scenery === 'clouds' ? 0.7 : 0.85, true);
    const geo = new THREE.PlaneGeometry(1, 1);
    const im = new THREE.InstancedMesh(geo, mat, cap);
    im.renderOrder = 2;
    this.disposables.push(mat);
    const baseY = this.theme.scenery === 'clouds' ? 0 : this.trackY + 110;
    this.addGridLayer({
      cell, radius, meshes: [im],
      place: (ix, iz, emit) => {
        const n = Math.floor(hash2(ix, iz, 40) * 3 * amount + 0.3);
        for (let k = 0; k < n; k++) {
          const x = ix * cell + hash2(ix, iz, 41 + k) * cell, z = iz * cell + hash2(ix, iz, 44 + k) * cell;
          const s = 70 + hash2(ix, iz, 47 + k) * 120;
          let y = baseY + (hash2(ix, iz, 50 + k) - 0.3) * 60;
          if (this.theme.scenery === 'clouds') {
            const near = this.pathIndex.count ? this.pathIndex.nearest(x, z, 60) : { d: Infinity };
            if (near.d < 45) continue;
            y = 4 + hash2(ix, iz, 53 + k) * 30;
          }
          emit(0, x, y, z, s, s * 0.55, 1);
        }
      },
    });
  }

  // -------------------------------------------------------------- construction
  buildCranes(q) {
    const yellow = new THREE.MeshStandardMaterial({ color: 0xf3b90f, roughness: 0.5, metalness: 0.4 });
    const parts = [];
    const add = (g, x, y, z) => { g.translate(x, y, z); parts.push(g); };
    // lattice mast (approximated with 4 posts + cross braces)
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(new THREE.BoxGeometry(0.3, 100, 0.3), x, 50, z);
    for (let y = 2; y < 100; y += 4) { add(new THREE.BoxGeometry(2.2, 0.2, 0.2), 0, y, -1); add(new THREE.BoxGeometry(2.2, 0.2, 0.2), 0, y, 1); add(new THREE.BoxGeometry(0.2, 0.2, 2.2), -1, y + 2, 0); add(new THREE.BoxGeometry(0.2, 0.2, 2.2), 1, y + 2, 0); }
    add(new THREE.BoxGeometry(60, 1.6, 1.6), 18, 101, 0); // jib
    add(new THREE.BoxGeometry(8, 3, 3), -10, 99.5, 0); // counterweight
    add(new THREE.BoxGeometry(3, 3, 3), 0, 103, 0); // cab
    add(new THREE.CylinderGeometry(0.15, 0.15, 30, 4), 36, 86, 0); // cable
    add(new THREE.BoxGeometry(0.4, 22, 0.4), 0, 112, 0);
    const geo = mergeGeometries(parts.map((g) => g.toNonIndexed()));
    parts.forEach((g) => g.dispose());
    const cap = 80;
    const im = new THREE.InstancedMesh(geo, yellow, cap);
    this.disposables.push(yellow);
    this.addGridLayer({
      cell: 200, radius: Math.max(2, Math.round(5 * Math.sqrt(q))), meshes: [im],
      place: (ix, iz, emit) => {
        if (hash2(ix, iz, 60) > 0.6) return;
        const x = ix * 200 + 40 + hash2(ix, iz, 61) * 120, z = iz * 200 + 40 + hash2(ix, iz, 62) * 120;
        const s = 0.8 + hash2(ix, iz, 63) * 0.6;
        const lim = this.corridorLimit(x, z, 40 * s, 10);
        if (lim < 125 * s) return;
        emit(0, x, 0, z, s, s, s, hash2(ix, iz, 64) * Math.PI * 2 + this.time * 0);
      },
    });
  }

  buildFrames(q) {
    const steel = new THREE.MeshStandardMaterial({ color: 0x8a5a3a, roughness: 0.7, metalness: 0.6 });
    const slab = new THREE.MeshStandardMaterial({ color: 0xa8a399, roughness: 0.9 });
    const beams = [], slabs = [];
    const floors = 10, fh = 4.2, w = 24;
    for (let f = 0; f <= floors; f++) {
      const y = f * fh;
      if (f > 0) for (const [x, z] of [[-w / 2, -w / 2], [w / 2, -w / 2], [-w / 2, w / 2], [w / 2, w / 2], [0, -w / 2], [0, w / 2], [-w / 2, 0], [w / 2, 0]]) { const g = new THREE.BoxGeometry(0.5, fh, 0.5); g.translate(x, y - fh / 2, z); beams.push(g); }
      for (const z of [-w / 2, 0, w / 2]) { const g = new THREE.BoxGeometry(w, 0.5, 0.5); g.translate(0, y, z); beams.push(g); }
      for (const x of [-w / 2, 0, w / 2]) { const g = new THREE.BoxGeometry(0.5, 0.5, w); g.translate(x, y, 0); beams.push(g); }
      if (f < floors - 3) { const g = new THREE.BoxGeometry(w, 0.35, w); g.translate(0, y - 0.3, 0); slabs.push(g); }
    }
    const bg = mergeGeometries(beams.map((g) => g.toNonIndexed())); beams.forEach((g) => g.dispose());
    const sg = mergeGeometries(slabs.map((g) => g.toNonIndexed())); slabs.forEach((g) => g.dispose());
    const r = Math.max(2, Math.round(8 * Math.sqrt(q)));
    const cap = (2 * r + 1) ** 2;
    const im1 = new THREE.InstancedMesh(bg, steel, cap), im2 = new THREE.InstancedMesh(sg, slab, cap);
    im1.castShadow = false;
    this.disposables.push(steel, slab);
    this.addGridLayer({
      cell: 90, radius: r, meshes: [im1, im2],
      place: (ix, iz, emit) => {
        if (hash2(ix, iz, 70) > 0.35) return;
        const x = ix * 90 + 45, z = iz * 90 + 45;
        const sy = 0.6 + hash2(ix, iz, 71) * 0.9;
        const lim = this.corridorLimit(x, z, 18);
        if (lim < floors * fh * sy) return;
        const rot = Math.floor(hash2(ix, iz, 72) * 4) * Math.PI / 2;
        emit(0, x, 0, z, 1, sy, 1, rot); emit(1, x, 0, z, 1, sy, 1, rot);
      },
    });
  }

  // -------------------------------------------------------------- coastal
  buildIslands(q) {
    const sand = new THREE.MeshStandardMaterial({ color: 0xe8d2a6, roughness: 0.95 });
    const grass = new THREE.MeshStandardMaterial({ color: 0x5c8f45, roughness: 0.9 });
    const isl = new THREE.CylinderGeometry(1, 1.15, 1, 24); isl.translate(0, 0.5, 0);
    const top = new THREE.CylinderGeometry(0.82, 0.86, 1, 24); top.translate(0, 0.5, 0);
    const r = Math.max(2, Math.round(6 * Math.sqrt(q)));
    const cap = (2 * r + 1) ** 2;
    const im1 = new THREE.InstancedMesh(isl, sand, cap); const im2 = new THREE.InstancedMesh(top, grass, cap);
    im1.receiveShadow = im2.receiveShadow = true;
    this.disposables.push(sand, grass);
    const cfg = this.theme.city;
    const box = new THREE.BoxGeometry(1, 1, 1); box.translate(0, 0.5, 0);
    const towers = cfg.styles.map((s) => {
      const m = facadeMaterial(s, { glass: cfg.glass, night: cfg.night, lit: '#ffc77a' });
      const im = new THREE.InstancedMesh(box, m, cap * 3);
      im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3 * 3), 3);
      this.disposables.push(m);
      return im;
    });
    // palms
    const trunk = new THREE.CylinderGeometry(0.25, 0.4, 1, 6); trunk.translate(0, 0.5, 0);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7a5a3a, roughness: 0.9 });
    const leaves = new THREE.ConeGeometry(1, 0.35, 7); leaves.translate(0, 0, 0);
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x3f7a35, roughness: 0.8 });
    const palms = new THREE.InstancedMesh(trunk, trunkMat, cap * 8); const crowns = new THREE.InstancedMesh(leaves, leafMat, cap * 8);
    // boats
    const hull = new THREE.BoxGeometry(3, 1.2, 9); hull.translate(0, 0.4, 0);
    const hullMat = new THREE.MeshStandardMaterial({ color: 0xf4f4f4, roughness: 0.4 });
    const boats = new THREE.InstancedMesh(hull, hullMat, cap);
    const sail = new THREE.ConeGeometry(2.5, 11, 3); sail.translate(0, 6.5, 0);
    const sails = new THREE.InstancedMesh(sail, new THREE.MeshStandardMaterial({ color: 0xfff7ea, roughness: 0.8 }), cap);
    this.disposables.push(trunkMat, leafMat, hullMat, sails.material);
    const ns = towers.length;
    this.addGridLayer({
      cell: 150, radius: r, meshes: [im1, im2, ...towers, palms, crowns, boats, sails],
      place: (ix, iz, emit) => {
        const hv = hash2(ix, iz, 80);
        const x = ix * 150 + 30 + hash2(ix, iz, 81) * 90, z = iz * 150 + 30 + hash2(ix, iz, 82) * 90;
        if (hv < 0.55) {
          const rad = 22 + hash2(ix, iz, 83) * 40;
          const near = this.pathIndex.count ? this.pathIndex.nearest(x, z, rad + 30) : { d: Infinity, y: 0 };
          const tall = near.d > rad + 20;
          emit(0, x, -1, z, rad, 3, rad); emit(1, x, 1.5, z, rad, 0.8, rad);
          if (tall) {
            const nT = 1 + Math.floor(hash2(ix, iz, 84) * 3);
            for (let k = 0; k < nT; k++) {
              const a = k * 2.1 + hash2(ix, iz, 85) * 6, d = rad * 0.35;
              const tx = x + Math.cos(a) * d, tz = z + Math.sin(a) * d;
              let h = cfg.hMin + hash2(ix, iz, 86 + k) * (cfg.hMax - cfg.hMin);
              const lim = this.corridorLimit(tx, tz, 14); if (lim < h) h = lim;
              if (h > 10) emit(2 + Math.floor(hash2(ix, iz, 90 + k) * ns), tx, 2, tz, 14 + hash2(ix, iz, 92 + k) * 8, h, 12 + hash2(ix, iz, 93 + k) * 6, 0, cfg.tints[k % cfg.tints.length]);
            }
          }
          const nP = 3 + Math.floor(hash2(ix, iz, 95) * 5);
          for (let k = 0; k < nP; k++) {
            const a = hash2(ix, iz, 100 + k) * 6.28, d = rad * (0.6 + hash2(ix, iz, 110 + k) * 0.25);
            const px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d, ph = 7 + hash2(ix, iz, 120 + k) * 5;
            emit(2 + ns, px, 2, pz, 1, ph, 1); emit(3 + ns, px, 2 + ph, pz, 4, 4, 4, a);
          }
        } else if (hv > 0.8) {
          emit(4 + ns, x, 0, z, 1, 1, 1, hash2(ix, iz, 130) * 6.28); emit(5 + ns, x, 0, z, 1, 1, 1, hash2(ix, iz, 130) * 6.28);
        }
      },
    });
  }

  // -------------------------------------------------------------- terrain (alpine & desert)
  buildTerrain(kind, q) {
    const f = T.fbmFactory(256, kind === 'alpine' ? 1234 : 4321, 6);
    const ridge = T.fbmFactory(256, 999, 4);
    const size = 600, seg = Math.round(58 * Math.min(1.2, Math.sqrt(q)));
    const chunkN = 2; // radius in chunks
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, flatShading: false });
    this.disposables.push(mat);
    const trackY = this.trackY;
    const hCache = new Map();
    const heightAt = (x, z) => {
      let h = Math.pow(f(x * 0.0022, z * 0.0022), 1.5) * 420 + ridge(x * 0.006, z * 0.006) * 60 - 60;
      if (kind === 'desert') { const v = f(x * 0.003, z * 0.003); h = (v > 0.55 ? 120 + (v - 0.55) * 200 : v * 80) - 10; h = Math.round(h / 30) * 30 * 0.6 + h * 0.4; }
      if (this.pathIndex.count && h > this.pathIndex.minY - 23) {
        const qk = Math.round(x / 10) * 100003 + Math.round(z / 10);
        let n = hCache.get(qk);
        if (!n) { n = this.pathIndex.nearest(Math.round(x / 10) * 10, Math.round(z / 10) * 10, 180); hCache.set(qk, n); }
        if (n.d < 180) {
          const t = Math.max(0, (n.d - 25) / 155);
          const maxH = (n.y - 22) + t * t * 500;
          h = Math.min(h, maxH);
        }
      }
      return Math.max(h, kind === 'desert' ? 0 : -5);
    };
    this.heightAt = heightAt;
    const chunks = new Map();
    const makeChunk = (cx, cz) => {
      const geo = new THREE.PlaneGeometry(size, size, seg, seg);
      geo.rotateX(-Math.PI / 2);
      const pos = geo.attributes.position;
      const colors = new Float32Array(pos.count * 3);
      const cRock = new THREE.Color(kind === 'alpine' ? '#7d7f84' : '#b0673c');
      const cSnow = new THREE.Color(kind === 'alpine' ? '#f4f7fb' : '#e8c08a');
      const cLow = new THREE.Color(kind === 'alpine' ? '#4d7a3a' : '#d49a62');
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i) + cx * size, z = pos.getZ(i) + cz * size;
        const h = heightAt(x, z);
        pos.setY(i, h);
      }
      geo.computeVertexNormals();
      const nrm = geo.attributes.normal;
      const c = new THREE.Color();
      for (let i = 0; i < pos.count; i++) {
        const h = pos.getY(i), slope = 1 - nrm.getY(i);
        if (kind === 'alpine') {
          c.copy(cLow).lerp(cRock, THREE.MathUtils.smoothstep(h, 40, 140));
          if (h > 150 && slope < 0.35) c.lerp(cSnow, THREE.MathUtils.smoothstep(h, 150, 210));
          if (slope > 0.45) c.lerp(cRock, 0.7);
        } else {
          c.copy(cSnow).lerp(cLow, THREE.MathUtils.smoothstep(slope, 0.05, 0.2));
          c.lerp(cRock, THREE.MathUtils.smoothstep(slope, 0.25, 0.5) * 0.9);
          const band = Math.sin(h * 0.25) * 0.5 + 0.5; c.multiplyScalar(0.88 + band * 0.14);
        }
        colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
      }
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      const m = new THREE.Mesh(geo, mat);
      m.position.set(cx * size, 0, cz * size);
      m.receiveShadow = true;
      this.root.add(m);
      return m;
    };
    const stale = new Set();
    this.onDirty.push((box) => {
      hCache.clear();
      if (!box) return;
      for (const k of chunks.keys()) {
        const [a, b] = k.split(',').map(Number);
        const x0 = a * size - size / 2 - 200, x1 = a * size + size / 2 + 200, z0 = b * size - size / 2 - 200, z1 = b * size + size / 2 + 200;
        if (box.x1 >= x0 && box.x0 <= x1 && box.z1 >= z0 && box.z0 <= z1) stale.add(k);
      }
    });
    this.layers.push({
      update: (cam, t, force, immediate) => {
        const cx = Math.round(cam.x / size), cz = Math.round(cam.z / size);
        const want = new Set();
        for (let a = -chunkN; a <= chunkN; a++) for (let b = -chunkN; b <= chunkN; b++) want.add((cx + a) + ',' + (cz + b));
        for (const [k, m] of chunks) if (!want.has(k)) { this.root.remove(m); m.geometry.dispose(); chunks.delete(k); stale.delete(k); }
        let budget = immediate ? Infinity : 1;
        // nearest missing chunks first
        const todo = [...want].filter((k) => !chunks.has(k) || stale.has(k));
        todo.sort((k1, k2) => { const [a1, b1] = k1.split(',').map(Number), [a2, b2] = k2.split(',').map(Number); return Math.hypot(a1 - cx, b1 - cz) - Math.hypot(a2 - cx, b2 - cz); });
        for (const k of todo) {
          if (budget-- <= 0) break;
          const [a, b] = k.split(',').map(Number);
          const old = chunks.get(k);
          chunks.set(k, makeChunk(a, b));
          if (old) { this.root.remove(old); old.geometry.dispose(); }
          stale.delete(k);
        }
      },
      dispose: () => { for (const m of chunks.values()) { this.root.remove(m); m.geometry.dispose(); } chunks.clear(); },
    });
    // trees / cacti
    if (kind === 'alpine') this.buildTrees(q, 'pine');
    else this.buildTrees(q, 'cactus');
    void trackY;
  }

  buildTrees(q, kind) {
    const cell = kind === 'round' ? 34 : 22;
    const r = Math.max(3, Math.round((kind === 'round' ? 10 : 14) * Math.sqrt(q)));
    const cap = (2 * r + 1) ** 2 * 2;
    let geoA, geoB, matA, matB;
    if (kind === 'pine') {
      geoA = new THREE.CylinderGeometry(0.3, 0.45, 1, 5); geoA.translate(0, 0.5, 0);
      const cones = [new THREE.ConeGeometry(1, 1.2, 8).translate(0, 0.6, 0), new THREE.ConeGeometry(0.8, 1.0, 8).translate(0, 1.15, 0), new THREE.ConeGeometry(0.55, 0.8, 8).translate(0, 1.6, 0)];
      geoB = mergeGeometries(cones.map((g) => g.toNonIndexed())); cones.forEach((g) => g.dispose());
      matA = new THREE.MeshStandardMaterial({ color: 0x5b3d24, roughness: 0.9 });
      matB = new THREE.MeshStandardMaterial({ color: 0x2f5a35, roughness: 0.85 });
    } else if (kind === 'cactus') {
      geoA = new THREE.CylinderGeometry(0.5, 0.6, 1, 8); geoA.translate(0, 0.5, 0);
      const arms = [new THREE.CylinderGeometry(0.35, 0.35, 1, 8).translate(1, 0.6, 0), new THREE.BoxGeometry(1, 0.5, 0.5).translate(0.5, 0.25, 0), new THREE.CylinderGeometry(0.35, 0.35, 0.8, 8).translate(-0.9, 0.9, 0), new THREE.BoxGeometry(0.9, 0.5, 0.5).translate(-0.45, 0.55, 0)];
      geoB = mergeGeometries(arms.map((g) => g.toNonIndexed())); arms.forEach((g) => g.dispose());
      matA = new THREE.MeshStandardMaterial({ color: 0x4f7a3a, roughness: 0.85 });
      matB = matA;
    } else {
      geoA = new THREE.CylinderGeometry(0.2, 0.3, 1, 6); geoA.translate(0, 0.5, 0);
      geoB = new THREE.IcosahedronGeometry(1, 1); geoB.translate(0, 0.3, 0);
      matA = new THREE.MeshStandardMaterial({ color: 0x6d4c33, roughness: 0.9 });
      matB = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, flatShading: true });
    }
    const a = new THREE.InstancedMesh(geoA, matA, cap), b = new THREE.InstancedMesh(geoB, matB, cap);
    if (kind === 'round') b.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
    this.disposables.push(matA, matB);
    const roundCols = ['#7cc576', '#a6d96a', '#5fb37d', '#f5a3c7', '#ffd27a'];
    this.addGridLayer({
      cell, radius: r, meshes: [a, b],
      place: (ix, iz, emit) => {
        const n = kind === 'round' ? (hash2(ix, iz, 150) > 0.55 ? 2 : 0) : Math.floor(hash2(ix, iz, 150) * 3);
        for (let k = 0; k < n; k++) {
          const x = ix * cell + hash2(ix, iz, 151 + k) * cell, z = iz * cell + hash2(ix, iz, 155 + k) * cell;
          let y = 0;
          if (this.heightAt) { y = this.heightAt(x, z); if (kind === 'pine' && (y > 150 || y < -2)) continue; if (kind === 'cactus' && y > 60) continue; }
          else if (kind === 'round') { const inX = ((ix % 2) + 2) % 2; void inX; }
          const s = (kind === 'pine' ? 5 : kind === 'cactus' ? 3 : 3.2) * (0.7 + hash2(ix, iz, 160 + k) * 0.7);
          const lim = this.corridorLimit(x, z, s, 6);
          if (lim < y + s * 3) continue;
          if (kind === 'pine') { emit(0, x, y, z, s * 0.6, s * 0.6, s * 0.6); emit(1, x, y + s * 0.4, z, s * 1.2, s * 2.2, s * 1.2); }
          else if (kind === 'cactus') { emit(0, x, y, z, s * 0.7, s * 2.3, s * 0.7); emit(1, x, y + s * 0.8, z, s * 0.8, s, s * 0.8, hash2(ix, iz, 170 + k) * 6); }
          else { emit(0, x, 0, z, s * 0.6, s * 1.4, s * 0.6); emit(1, x, s * 1.6, z, s, s * 0.9, s, 0, roundCols[Math.floor(hash2(ix, iz, 175 + k) * roundCols.length)]); }
        }
      },
    });
  }

  // -------------------------------------------------------------- factory interior
  buildFactory(q) {
    const H = 105;
    const steel = new THREE.MeshStandardMaterial({ color: 0x4a4e55, roughness: 0.55, metalness: 0.75 });
    const orange = new THREE.MeshStandardMaterial({ color: 0xe8541e, roughness: 0.5, metalness: 0.4 });
    const tankMat = new THREE.MeshStandardMaterial({ color: 0xb8bcc2, roughness: 0.3, metalness: 0.9 });
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xffe2a8, toneMapped: false });
    const skyMat = new THREE.MeshBasicMaterial({ color: 0xfff1d6, toneMapped: false });
    this.disposables.push(steel, orange, tankMat, lampMat, skyMat);
    // ceiling
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000), new THREE.MeshStandardMaterial({ color: 0x2e2b28, roughness: 0.9, side: THREE.DoubleSide }));
    ceil.rotation.x = Math.PI / 2; ceil.position.y = H + 4; this.root.add(ceil);
    this.disposables.push(ceil.geometry, ceil.material);
    this.layers.push({ update: (cam) => { ceil.position.x = cam.x; ceil.position.z = cam.z; }, dispose: () => {} });
    const box = new THREE.BoxGeometry(1, 1, 1); box.translate(0, 0.5, 0);
    const cyl = new THREE.CylinderGeometry(1, 1, 1, 16); cyl.translate(0, 0.5, 0);
    const r = Math.max(3, Math.round(9 * Math.sqrt(q)));
    const cap = (2 * r + 1) ** 2;
    const cols = new THREE.InstancedMesh(box, steel, cap * 2);
    const trussX = new THREE.InstancedMesh(box, steel, cap * 2);
    const lamps = new THREE.InstancedMesh(cyl, lampMat, cap);
    const sky = new THREE.InstancedMesh(box, skyMat, cap);
    const tanks = new THREE.InstancedMesh(cyl, tankMat, cap);
    const machines = new THREE.InstancedMesh(box, orange, cap * 2);
    const pipes = new THREE.InstancedMesh(box, steel, cap * 2);
    const cell = 48;
    this.addGridLayer({
      cell, radius: r, meshes: [cols, trussX, lamps, sky, tanks, machines, pipes],
      place: (ix, iz, emit) => {
        const x = ix * cell, z = iz * cell;
        const lim = this.corridorLimit(x, z, 2, 9);
        if (lim > H) emit(0, x, 0, z, 2.2, H + 4, 2.2);
        emit(1, x + cell / 2, H - 2, z, cell, 3, 0.8);
        emit(1, x, H - 5, z + cell / 2, 0.8, 2, cell);
        emit(2, x + cell / 2, H - 6, z + cell / 2, 2.4, 0.5, 2.4);
        if (((ix + iz) & 1) === 0) emit(3, x + cell / 2, H + 3.6, z + cell / 2, 16, 0.3, 16);
        const hv = hash2(ix, iz, 200);
        const mx = x + cell / 2 + (hash2(ix, iz, 201) - 0.5) * 20, mz = z + cell / 2 + (hash2(ix, iz, 202) - 0.5) * 20;
        if (hv < 0.3) {
          const rr = 5 + hash2(ix, iz, 203) * 5, hh = 12 + hash2(ix, iz, 204) * 25;
          if (this.corridorLimit(mx, mz, rr, 6) > hh) emit(4, mx, 0, mz, rr, hh, rr);
        } else if (hv < 0.65) {
          const w = 8 + hash2(ix, iz, 205) * 10, hh = 4 + hash2(ix, iz, 206) * 10, d = 6 + hash2(ix, iz, 207) * 10;
          if (this.corridorLimit(mx, mz, Math.max(w, d) / 2, 6) > hh) { emit(5, mx, 0, mz, w, hh, d); emit(5, mx, hh, mz, w * 0.4, 3, d * 0.4); }
        }
        if (hash2(ix, iz, 210) > 0.5) emit(6, x + cell / 2, 20 + hash2(ix, iz, 211) * 40, z, cell, 1.2, 1.2);
      },
    });
    this.engine.hemi.intensity = this.theme.hemi[2];
  }

  // -------------------------------------------------------------- sky kingdom
  buildFloatingIslands(q) {
    const rock = new THREE.IcosahedronGeometry(1, 2);
    const p = rock.attributes.position; const rr = T.rng(5);
    for (let i = 0; i < p.count; i++) {
      let y = p.getY(i); const x = p.getX(i), z = p.getZ(i);
      if (y > 0.2) y = 0.25 + (y - 0.2) * 0.15; else y = y * 1.8 - rr() * 0.15;
      p.setXYZ(i, x * (1 + (rr() - 0.5) * 0.15), y, z * (1 + (rr() - 0.5) * 0.15));
    }
    rock.computeVertexNormals();
    const top = new THREE.CylinderGeometry(0.98, 0.9, 0.12, 20); top.translate(0, 0.3, 0);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x9a8a7a, roughness: 0.9, flatShading: true });
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x7cc56a, roughness: 0.85 });
    this.disposables.push(rockMat, grassMat);
    const r = Math.max(2, Math.round(6 * Math.sqrt(q)));
    const cap = (2 * r + 1) ** 2 * 2;
    const a = new THREE.InstancedMesh(rock, rockMat, cap), b = new THREE.InstancedMesh(top, grassMat, cap);
    a.castShadow = false;
    this.addGridLayer({
      cell: 130, radius: r, meshes: [a, b],
      place: (ix, iz, emit) => {
        if (hash2(ix, iz, 300) > 0.5) return;
        const x = ix * 130 + 20 + hash2(ix, iz, 301) * 90, z = iz * 130 + 20 + hash2(ix, iz, 302) * 90;
        const s = 12 + hash2(ix, iz, 303) * 28;
        const near = this.pathIndex.count ? this.pathIndex.nearest(x, z, s + 60) : { d: Infinity, y: 60 };
        let y = 30 + hash2(ix, iz, 304) * 90;
        if (near.d < s + 25) { y = Math.min(y, near.y - 22 - s * 0.4); if (y < 10) return; }
        emit(0, x, y, z, s, s, s, hash2(ix, iz, 305) * 6); emit(1, x, y, z, s, s, s, 0);
      },
    });
  }

  buildBalloons(q) {
    const env = new THREE.SphereGeometry(1, 16, 12); env.scale(1, 1.15, 1); env.translate(0, 1.6, 0);
    const basket = new THREE.BoxGeometry(0.6, 0.5, 0.6); basket.translate(0, 0, 0);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
    const bm = new THREE.MeshStandardMaterial({ color: 0x7a5432, roughness: 0.9 });
    this.disposables.push(mat, bm);
    const r = Math.max(2, Math.round(4 * Math.sqrt(q))); const cap = (2 * r + 1) ** 2;
    const a = new THREE.InstancedMesh(env, mat, cap); a.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
    const b = new THREE.InstancedMesh(basket, bm, cap);
    const cols = ['#ff6b6b', '#ffd34d', '#5aa9ff', '#7bdc8a', '#c38bff'];
    this.addGridLayer({
      cell: 220, radius: r, meshes: [a, b],
      place: (ix, iz, emit) => {
        if (hash2(ix, iz, 400) > 0.5) return;
        const x = ix * 220 + hash2(ix, iz, 401) * 220, z = iz * 220 + hash2(ix, iz, 402) * 220;
        const y = 40 + hash2(ix, iz, 403) * 140; const s = 6 + hash2(ix, iz, 404) * 5;
        if (this.corridorLimit(x, z, s * 1.5, 20) < y + s * 3) return;
        emit(0, x, y, z, s, s, s, 0, cols[Math.floor(hash2(ix, iz, 405) * 5)]); emit(1, x, y, z, s, s, s);
      },
    });
  }

  buildPastelShapes(q) {
    const mats = ['#ff8fab', '#7ed6c8', '#ffd166', '#9d8cff', '#8ad7ff'].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55 }));
    this.disposables.push(...mats);
    const torus = new THREE.TorusGeometry(1, 0.22, 12, 32, Math.PI); // arches
    const sphere = new THREE.SphereGeometry(1, 24, 16);
    const cone = new THREE.ConeGeometry(1, 1, 4); cone.translate(0, 0.5, 0);
    const cyl = new THREE.CylinderGeometry(1, 1, 1, 24); cyl.translate(0, 0.5, 0);
    const geos = [torus, sphere, cone, cyl];
    const r = Math.max(2, Math.round(7 * Math.sqrt(q))); const cap = (2 * r + 1) ** 2;
    const meshes = geos.map((g, i) => { const im = new THREE.InstancedMesh(g, mats[i], cap); return im; });
    this.addGridLayer({
      cell: 70, radius: r, meshes,
      place: (ix, iz, emit) => {
        const hv = hash2(ix, iz, 500); if (hv > 0.45) return;
        const k = Math.floor(hash2(ix, iz, 501) * 4);
        const x = ix * 70 + 35, z = iz * 70 + 35;
        const s = 10 + hash2(ix, iz, 502) * 22;
        const lim = this.corridorLimit(x, z, s, 10);
        if (k === 0) { if (lim > s * 1.3) emit(0, x, 0, z, s, s, s * 1.4, hash2(ix, iz, 503) * 3); }
        else if (k === 1) { if (lim > s * 2.2) emit(1, x, s * 1.2, z, s, s, s); }
        else if (k === 2) { if (lim > s * 2) emit(2, x, 0, z, s, s * 2, s, Math.PI / 4); }
        else if (lim > s * 3) emit(3, x, 0, z, s * 0.5, s * 3, s * 0.5);
      },
    });
  }

  // -------------------------------------------------------------- per-frame
  addPathSample(x, y, z) { this.pathIndex.add(x, y, z); }
  markDirty() { this.dirty = true; }

  // immediate: process everything now (course build); otherwise scenery refreshes are time-sliced
  update(cam, dt, immediate = false) {
    this.time += dt;
    this.follow.position.set(cam.x, 0, cam.z);
    this.skyMat.uniforms.time.value = this.time;
    if (this.dirty) {
      this.dirty = false;
      const box = this.pathIndex.takeBox();
      for (const f of this.onDirty) f(box);
      for (const l of this.layers) if (l.grid) l.stale = true;
    }
    let gridBudget = immediate ? Infinity : 1;
    for (const l of this.layers) {
      if (l.grid && l.stale) {
        if (gridBudget-- > 0) l.update(cam, this.time, true);
        else l.update(cam, this.time, false);
      } else l.update(cam, this.time, false, immediate);
    }
  }

  dispose() {
    this.engine.scene.remove(this.root);
    for (const l of this.layers) l.dispose && l.dispose();
    this.sky.geometry.dispose(); this.skyMat.dispose();
    this.disposables.forEach((d) => d && d.dispose && d.dispose());
    this.layers = [];
  }
}
