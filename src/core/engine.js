// Rendering core: renderer, scene, camera, lights, post-processing and quality tiers.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';

export const QUALITY_PRESETS = {
  low: { label: 'Low', pixelRatio: 0.8, shadows: false, shadowSize: 512, bloom: false, ao: false, msaa: 0, scenery: 0.45, aniso: 1 },
  medium: { label: 'Medium', pixelRatio: 1.0, shadows: true, shadowSize: 1024, bloom: false, ao: false, msaa: 0, scenery: 0.7, aniso: 4 },
  high: { label: 'High', pixelRatio: 1.5, shadows: true, shadowSize: 2048, bloom: true, ao: false, msaa: 4, scenery: 1.0, aniso: 8 },
  ultra: { label: 'Ultra', pixelRatio: 2.0, shadows: true, shadowSize: 4096, bloom: true, ao: true, msaa: 4, scenery: 1.25, aniso: 16 },
};

export class Engine {
  constructor(container) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.id = 'game-canvas';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, 1, 0.1, 2600);
    this.camera.position.set(0, 5, 10);
    this.baseFov = 62;

    // Key light (sun) with a shadow frustum that follows the player.
    this.sun = new THREE.DirectionalLight(0xffffff, 3.0);
    this.sun.castShadow = true;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.035;
    const sc = this.sun.shadow.camera;
    sc.left = -34; sc.right = 34; sc.top = 34; sc.bottom = -34; sc.near = 1; sc.far = 260;
    this.scene.add(this.sun, this.sun.target);
    this.sunDir = new THREE.Vector3(0.4, 0.8, 0.3).normalize();

    this.hemi = new THREE.HemisphereLight(0xbfd9ff, 0x6b5a48, 0.8);
    this.scene.add(this.hemi);

    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    this.quality = 'high';
    this.composer = null;
    this.bloomPass = null;
    this.bloomStrength = 0.28;
    this._size = new THREE.Vector2();
    this.onResize = this.onResize.bind(this);
    window.addEventListener('resize', this.onResize);
    this.setQuality('high');
  }

  setQuality(q) {
    if (!QUALITY_PRESETS[q]) q = 'high';
    this.quality = q;
    const p = QUALITY_PRESETS[q];
    this.preset = p;
    const dpr = Math.min(window.devicePixelRatio || 1, p.pixelRatio);
    this.renderer.setPixelRatio(dpr);
    this.renderer.shadowMap.enabled = p.shadows;
    this.sun.castShadow = p.shadows;
    if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; }
    this.sun.shadow.mapSize.set(p.shadowSize, p.shadowSize);
    // Force materials to recompile for shadow changes.
    this.scene.traverse((o) => { if (o.material) { const m = Array.isArray(o.material) ? o.material : [o.material]; m.forEach((mm) => (mm.needsUpdate = true)); } });
    this.buildComposer();
    this.onResize();
  }

  buildComposer() {
    if (this.composer) {
      this.composer.passes.forEach((ps) => ps.dispose && ps.dispose());
      this.composer.renderTarget1.dispose();
      this.composer.renderTarget2.dispose();
      this.composer = null;
    }
    const p = this.preset;
    if (!p.bloom && !p.ao) return; // render directly (keeps native MSAA)
    const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    const rt = new THREE.WebGLRenderTarget(Math.max(1, size.x), Math.max(1, size.y), {
      type: THREE.HalfFloatType,
      samples: p.msaa,
    });
    this.composer = new EffectComposer(this.renderer, rt);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    if (p.ao) {
      const ao = new GTAOPass(this.scene, this.camera, size.x, size.y);
      ao.output = GTAOPass.OUTPUT.Default;
      ao.blendIntensity = 0.85;
      ao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.4, thickness: 1.2, scale: 1.0, samples: 12 });
      this.composer.addPass(ao);
      this.aoPass = ao;
    }
    if (p.bloom) {
      this.bloomPass = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), this.bloomStrength, 0.55, 0.86);
      this.composer.addPass(this.bloomPass);
    }
    this.composer.addPass(new OutputPass());
  }

  setBloom(strength, threshold = 0.86) {
    this.bloomStrength = strength;
    if (this.bloomPass) { this.bloomPass.strength = strength; this.bloomPass.threshold = threshold; }
  }

  onResize() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.applyFov(this.baseFov);
    if (this.composer) {
      this.composer.setPixelRatio(this.renderer.getPixelRatio());
      this.composer.setSize(w, h);
    }
  }

  // Keep horizontal field of view sensible in portrait orientation.
  applyFov(fov) {
    this.baseFov = fov;
    const a = this.camera.aspect;
    let f = fov;
    if (a < 1.0) {
      const hfov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(fov) / 2) * 1.0);
      f = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(hfov / 2) / Math.max(a, 0.45)));
      f = Math.min(f, 100);
    }
    this.camera.fov = f;
    this.camera.updateProjectionMatrix();
  }

  // Move the sun's shadow frustum with the focus point; snap to texels to avoid shimmer.
  updateSun(focus) {
    const d = this.sunDir;
    const p = this.preset;
    const texel = (68 / p.shadowSize);
    const fx = Math.round(focus.x / texel) * texel;
    const fy = Math.round(focus.y / texel) * texel;
    const fz = Math.round(focus.z / texel) * texel;
    this.sun.target.position.set(fx, fy, fz);
    this.sun.position.set(fx + d.x * 120, fy + d.y * 120, fz + d.z * 120);
    this.sun.target.updateMatrixWorld();
  }

  setEnvironmentMap(scene) {
    if (this.envRT) this.envRT.dispose();
    this.envRT = this.pmrem.fromScene(scene, 0.02, 1, 3000);
    this.scene.environment = this.envRT.texture;
  }

  render() {
    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }
}
