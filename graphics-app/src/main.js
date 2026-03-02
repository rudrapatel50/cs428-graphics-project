import { seedRandom } from './utils/index.js';
import * as THREE from 'three';
import Stats from 'stats.js';
import { createRenderer, createCamera, createEnvironment } from './core/index.js';
import { createTerrain, updateTerrain } from './terrain/index.js';
import createUI from './ui/index.js';

// --- Stats ---
const stats = new Stats();
stats.showPanel(0);
document.body.appendChild(stats.dom);

// --- Scene ---
const scene = new THREE.Scene();
const SEED = "demo-seed";
seedRandom(SEED);

// --- Renderer ---
const container = document.getElementById('app') || document.body;
const renderer = createRenderer(container);

// --- Camera ---
const { camera, controls, update: updateCamera } = createCamera(renderer.domElement);

// --- Environment (sky, fog, lights) ---
const env = createEnvironment(scene);

// --- Procedural Terrain ---
createTerrain(scene, SEED);

// --- UI overlay ---
createUI(env, scene);

// --- Clock ---
const clock = new THREE.Clock();

// --- Animate ---
function animate() {
  requestAnimationFrame(animate);

  stats.begin();

  const delta = clock.getDelta();
  updateCamera(delta);
  updateTerrain(camera);

  renderer.render(scene, camera);

  stats.end();
}

// --- Resize ---
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
});

animate();
