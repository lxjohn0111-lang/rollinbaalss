// Entry point: wires save data, audio, UI and the game together.
import '@fontsource/lilita-one/400.css';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/800.css';
import './ui/styles.css';
import { Game } from './game/game.js';
import { SaveData } from './core/save.js';
import { AudioEngine } from './core/audio.js';
import { UI } from './ui/ui.js';
import { REGISTRY, OBSTACLE_IDS } from './game/obstacles/index.js';
import { LEVELS } from './game/levels.js';
import { EndlessGenerator } from './game/endless.js';

const params = Object.fromEntries(new URLSearchParams(location.search));
const save = new SaveData();
const audio = new AudioEngine();
audio.setVolumes(save.data.settings.music, save.data.settings.sfx);
const ui = new UI(document.getElementById('ui'), save, audio);
const game = new Game({ container: document.getElementById('game'), save, audio, ui, params });
ui.setGame(game);
window.__game = game;
window.__modules = { REGISTRY, OBSTACLE_IDS, LEVELS, EndlessGenerator };

ui.showLoading('SkyRoll');
game.init().then(async () => {
  if (document.fonts && document.fonts.load) { try { await document.fonts.load('40px "Lilita One"'); } catch (e) { /* ignore */ } }
  if (params.test) { game.headless = true; ui.hideLoading(); window.__ready = true; return; }
  if (params.sandbox) { ui.hideLoading(); game.startSandbox(params.sandbox.split(','), params.theme || 'metropolis'); return; }
  if (params.level) { game.startLevel(Number(params.level) - 1); return; }
  if (params.endless) { game.startEndless(); return; }
  game.startDemo();
  ui.hideLoading();
  ui.showMenu();
  window.__ready = true;
}).catch((e) => {
  console.error(e);
  ui.showLoading('Something went wrong');
  document.querySelector('.ld-sub').textContent = String(e && e.message || e);
});
