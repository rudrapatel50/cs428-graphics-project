/**
 * main.js — App entry point.
 *
 * Flow: Hero page → Loading screen → Game world
 *
 * Sets up the scene, terrain, environment, water, post-processing,
 * and UI overlay. Shows a hero landing page where the user can enter
 * a seed, then a Minecraft-style loading screen while terrain generates.
 */

import { seedRandom } from './utils/index.js';
import * as THREE from 'three';
import Stats from 'stats.js';
import {
  createRenderer,
  createCamera,
  createEnvironment,
  createPostProcessing,
  createWater,
} from './core/index.js';
import { createTerrain, updateTerrain, setTerrainConfig } from './terrain/index.js';
import createUI from './ui/index.js';
import { createVFX, updateVFX, toggleRain } from './vfx/index.js'; 
import { createAmbientAudio, startAmbientAudio, setAmbientMode, toggleRainAudio } from './audio/index.js';

// ─── Stats (FPS counter) ────────────────────────────────────────────

const stats = new Stats();
stats.showPanel(0);
stats.dom.style.display = 'none';
document.body.appendChild(stats.dom);

// ─── Scene ──────────────────────────────────────────────────────────

const scene = new THREE.Scene();
let currentSeed = 'demo-seed';
seedRandom(currentSeed);

// ─── Renderer ───────────────────────────────────────────────────────

const container = document.getElementById('app') || document.body;
const renderer = createRenderer(container);

// ─── Camera ─────────────────────────────────────────────────────────

const { camera, controls, update: updateCamera } = createCamera(renderer.domElement);

// ─── Environment (sky, fog, dynamic lights) ─────────────────────────

const env = createEnvironment(scene);

// ─── Post-processing (bloom + vignette) ─────────────────────────────

const pp = createPostProcessing(renderer, scene, camera);

// ─── Water ──────────────────────────────────────────────────────────

const water = createWater(scene);
createVFX(scene, camera);
createAmbientAudio();

// ─── UI overlay (hidden until game starts) ──────────────────────────

const ui = createUI(env, scene, { postprocessing: pp, stats });
ui.root.style.display = 'none';

// ─── Coordinate / altitude HUD ──────────────────────────────────────

const coordHud = document.createElement('div');
coordHud.id = 'coord-hud';
coordHud.textContent = 'X 0  Y 0  Z 0';
coordHud.style.display = 'none';
document.body.appendChild(coordHud);

window.__coordHud = coordHud;
const onboarding = document.createElement('div');
onboarding.id = 'onboarding-overlay';
onboarding.innerHTML = `
  <button id="onboarding-close-btn" class="onboarding-close-btn" aria-label="Close help">
    ×
  </button>
  <div>
    <h2>Controls</h2>
    <p>WASD: Move</p>
    <p>Mouse: Look around</p>
    <p>R: Toggle rain</p>
    <p>ESC: Unlock mouse</p>
    <p>Press H to hide this help screen.</p>
  </div>
`;
onboarding.style.display = 'none';
document.body.appendChild(onboarding); 

const onboardingCloseBtn = document.getElementById('onboarding-close-btn');
onboardingCloseBtn.addEventListener('click', () => {
  onboarding.style.display = 'none';
});

// ─── Loading screen helpers ─────────────────────────────────────────

const loadingScreen = document.getElementById('loading-screen');
const loadingBar = document.getElementById('loading-bar-fill');
const loadingHint = document.getElementById('loading-hint');

const LOADING_HINTS = [
  'Preparing world',
  'Sculpting mountains',
  'Filling oceans',
  'Planting forests',
  'Painting biomes',
  'Placing sunlight',
  'Finalizing terrain',
];

/**
 * Animate the loading bar from 0–100% with hint text changes,
 * then resolve the promise.
 */
function runLoadingAnimation(durationMs = 2200) {
  return new Promise((resolve) => {
    const start = performance.now();
    let hintIdx = 0;

    function tick() {
      const elapsed = performance.now() - start;
      const progress = Math.min(elapsed / durationMs, 1);

      // Update progress bar
      loadingBar.style.width = `${(progress * 100).toFixed(1)}%`;

      // Cycle through hint text
      const nextIdx = Math.min(
        Math.floor(progress * LOADING_HINTS.length),
        LOADING_HINTS.length - 1
      );
      if (nextIdx !== hintIdx) {
        hintIdx = nextIdx;
        loadingHint.textContent = LOADING_HINTS[hintIdx];
      }

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        // Hold at 100% briefly
        setTimeout(resolve, 400);
      }
    }

    requestAnimationFrame(tick);
  });
}

// ─── Hero page wiring ──────────────────────────────────────────────

const heroPage = document.getElementById('hero-page');
const heroSeedInput = document.getElementById('hero-seed-input');
const heroRandomBtn = document.getElementById('hero-random-seed');
const heroGenBtn = document.getElementById('hero-generate-btn');

// Random seed button
heroRandomBtn.addEventListener('click', () => {
  heroSeedInput.value = Math.random().toString(36).substring(2, 10);
});

// View distance slider live value
const heroVDSlider = document.getElementById('hero-view-distance');
const heroVDVal = document.getElementById('hero-vd-val');
if (heroVDSlider && heroVDVal) {
  heroVDSlider.addEventListener('input', () => {
    heroVDVal.textContent = heroVDSlider.value;
  });
}

// Max chunks slider live value
const heroMCSlider = document.getElementById('hero-max-chunks');
const heroMCVal = document.getElementById('hero-mc-val');
if (heroMCSlider && heroMCVal) {
  heroMCSlider.addEventListener('input', () => {
    heroMCVal.textContent = heroMCSlider.value;
  });
}

// Generate World button
heroGenBtn.addEventListener('click', startGame);
heroSeedInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') startGame();
});

let gameStarted = false;
let maxChunksPerFrame = 1;

async function startGame() {
  if (gameStarted) return;
  gameStarted = true;

  const seed = heroSeedInput.value.trim() || 'demo-seed';
  currentSeed = seed;
  seedRandom(seed);

  // 1. Fade out hero
  heroPage.classList.add('fade-out');

  // 2. Show loading screen
  loadingScreen.style.display = '';

  // Wait for hero fade to finish
  await new Promise((r) => setTimeout(r, 700));
  heroPage.style.display = 'none';
  heroPage.classList.remove('fade-out');

  // 3. Read settings from hero page
  const viewDist = parseInt(document.getElementById('hero-view-distance')?.value || '3', 10);
  const quality = document.getElementById('hero-quality')?.value || 'medium';
  const chunkSize = parseInt(document.getElementById('hero-chunk-size')?.value || '200', 10);
  const segMap = { low: 64, medium: 128, high: 192 };
  setTerrainConfig({ viewRadius: viewDist, chunkSegments: segMap[quality] || 128, chunkSize });

  // Graphics settings
  const shadowSetting = document.getElementById('hero-shadows')?.value || 'high';
  if (shadowSetting === 'off') {
    renderer.shadowMap.enabled = false;
    env.sunLight.castShadow = false;
  } else {
    renderer.shadowMap.enabled = true;
    env.sunLight.castShadow = true;
    const shadowRes = shadowSetting === 'low' ? 1024 : 2048;
    env.sunLight.shadow.mapSize.width = shadowRes;
    env.sunLight.shadow.mapSize.height = shadowRes;
    if (env.sunLight.shadow.map) {
      env.sunLight.shadow.map.dispose();
      env.sunLight.shadow.map = null;
    }
  }

  const resSetting = document.getElementById('hero-resolution')?.value || '1';
  if (resSetting === 'native') {
    renderer.setPixelRatio(window.devicePixelRatio);
  } else {
    renderer.setPixelRatio(Math.min(parseFloat(resSetting), 2));
  }
  renderer.setSize(window.innerWidth, window.innerHeight);

  maxChunksPerFrame = parseInt(document.getElementById('hero-max-chunks')?.value || '1', 10);

  // 4. Generate terrain (bulk load behind loading screen)
  createTerrain(scene, seed);
  updateTerrain(camera, 200);

  await runLoadingAnimation(2200);

  // 5. Sync the in-game seed input
  ui.setSeed(seed);

  // 6. Fade out loading screen
  loadingScreen.classList.add('fade-out');

  await new Promise((r) => setTimeout(r, 800));
  loadingScreen.style.display = 'none';
  loadingScreen.classList.remove('fade-out');

  // 7. Show in-game UI
  ui.root.style.display = '';
  coordHud.style.display = '';
  stats.dom.style.display = '';

  startAmbientAudio();
  onboarding.style.display = '';

  // Pointer lock must be requested from a fresh user gesture.
  // The overlay click handler in camera.js handles this — no auto-lock here.
}

// ─── Seed regeneration event (in-game) ──────────────────────────────

window.addEventListener('ui:regenerateSeed', (e) => {
  const newSeed = e.detail.seed;
  currentSeed = newSeed;
  seedRandom(newSeed);
  createTerrain(scene, newSeed);
  updateTerrain(camera, 200);
});

// ─── Exit to Menu event ─────────────────────────────────────────────

window.addEventListener('ui:exitToMenu', () => {
  if (!gameStarted) return;
  gameStarted = false;
  

  // Unlock controls
  if (controls.isLocked) {
    controls.unlock();
  }

  // Hide in-game UI
  ui.root.style.display = 'none';
  coordHud.style.display = 'none';
  stats.dom.style.display = 'none';

  // Show hero page
  heroPage.style.display = '';
});
// Rain toggle
window.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() === 'r') {
    const rainState = toggleRain();

    toggleRainAudio();

    console.log(
      rainState
        ? 'Rain enabled'
        : 'Rain disabled'
    );
  }
});
// Ambient audio switching based on UI preset clicks
document.addEventListener('click', (event) => {
  const clickedText = event.target.textContent?.toLowerCase() || '';

  if (clickedText.includes('night')) {
    setAmbientMode('night');
    console.log('Night audio enabled');
  }

  if (
    clickedText.includes('day') ||
    clickedText.includes('dawn') ||
    clickedText.includes('sunset') ||
    clickedText.includes('morning') ||
    clickedText.includes('noon')
  ) {
    setAmbientMode('day');
    console.log('Day/dawn/sunset audio enabled');
  }
});

// Onboarding overlay toggle
window.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() === 'h') {
    onboarding.style.display =
      onboarding.style.display === 'none'
        ? ''
        : 'none';
  }
});
// ─── Clock ──────────────────────────────────────────────────────────

const clock = new THREE.Clock();

// ─── Animate ────────────────────────────────────────────────────────

function animate() {
  requestAnimationFrame(animate);
  stats.begin();

  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  updateCamera(delta);
  updateTerrain(camera, maxChunksPerFrame);
  water.update(elapsed);
  updateVFX();

  env.update(env.getElevation(), env.getAzimuth(), camera.position);

  // Update coordinate HUD
  coordHud.textContent =
    `X ${camera.position.x.toFixed(0)}  ` +
    `Y ${camera.position.y.toFixed(0)}  ` +
    `Z ${camera.position.z.toFixed(0)}`;

  pp.composer.render();

  stats.end();
}

// ─── Resize ─────────────────────────────────────────────────────────

window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  pp.resize(w, h);
});

animate();
