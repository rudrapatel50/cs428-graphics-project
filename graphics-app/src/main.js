import { seedRandom } from "./utils/index.js";
import * as THREE from 'three';
import Stats from 'stats.js';
import { createRenderer, createCamera, createEnvironment } from './core/index.js';
import createUI from './ui/index.js';

// --- Stats ---
const stats = new Stats();
stats.showPanel(0);
document.body.appendChild(stats.dom);

// --- Scene ---
const scene = new THREE.Scene();
seedRandom("demo-seed");

// --- Renderer ---
const container = document.getElementById('app') || document.body;
const renderer = createRenderer(container);

// --- Camera ---
const { camera, controls, update: updateCamera } = createCamera(renderer.domElement);

// --- Environment (sky, fog, lights) ---
const env = createEnvironment(scene);

// --- Temporary ground plane ---
const groundGeo = new THREE.PlaneGeometry(2000, 2000);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x3a7d44, roughness: 0.9 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// --- UI ---
createUI(env, scene);

// --- Placeholder objects to verify lighting & shadows ---
const placeholders = [
  { geo: new THREE.BoxGeometry(6, 6, 6), pos: [0, 3, -30] },
  { geo: new THREE.SphereGeometry(4, 32, 32), pos: [20, 4, -50] },
  { geo: new THREE.ConeGeometry(3, 8, 32), pos: [-15, 4, -40] },
  { geo: new THREE.TorusKnotGeometry(3, 0.8, 128, 32), pos: [10, 6, -70] },
];

placeholders.forEach(({ geo, pos }) => {
  const mat = new THREE.MeshStandardMaterial({
    color: Math.random() * 0xffffff,
    roughness: 0.6,
    metalness: 0.2,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(...pos);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
});

// --- Clock ---
const clock = new THREE.Clock();

// --- Animate ---
function animate() {
  requestAnimationFrame(animate);

  stats.begin();

  const delta = clock.getDelta();
  updateCamera(delta);

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
