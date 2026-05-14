import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { getTerrainHeight } from '../terrain/index.js';

const MOVE_SPEED = 50;
const SPRINT_MULTIPLIER = 2.5;
const PLAYER_HEIGHT = 2;  // metres above terrain surface

export function createCamera(domElement) {
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.5,
    2000
  );
  camera.position.set(0, 80, 0);

  const controls = new PointerLockControls(camera, domElement);

  const keysPressed = new Set();

  const overlay = document.createElement('div');
  overlay.id = 'pointer-lock-overlay';
  overlay.textContent = 'Click to fly';
  overlay.style.display = 'none';
  domElement.parentElement.appendChild(overlay);

  // Lock pointer on click — canvas is the primary target, overlay is fallback after ESC
  domElement.addEventListener('click', () => controls.lock());
  overlay.addEventListener('click', () => controls.lock());

  controls.addEventListener('lock', () => {
    overlay.style.display = 'none';
  });

  controls.addEventListener('unlock', () => {
    overlay.style.display = '';
  });

  window.addEventListener('keydown', (e) => keysPressed.add(e.code));
  window.addEventListener('keyup', (e) => keysPressed.delete(e.code));

  const direction = new THREE.Vector3();

  function update(delta) {
    if (!controls.isLocked) return;

    const speed = keysPressed.has('ShiftLeft') || keysPressed.has('ShiftRight')
      ? MOVE_SPEED * SPRINT_MULTIPLIER
      : MOVE_SPEED;

    direction.set(0, 0, 0);

    if (keysPressed.has('KeyW')) direction.z -= 1;
    if (keysPressed.has('KeyS')) direction.z += 1;
    if (keysPressed.has('KeyA')) direction.x -= 1;
    if (keysPressed.has('KeyD')) direction.x += 1;
    if (keysPressed.has('Space')) direction.y += 1;
    if (keysPressed.has('KeyC')) direction.y -= 1;

    if (direction.lengthSq() > 0) {
      direction.normalize();

      controls.moveRight(direction.x * speed * delta);
      controls.moveForward(-direction.z * speed * delta);
      camera.position.y += direction.y * speed * delta;
    }

    // ── Terrain collision — prevent camera from clipping underground ──
    const groundY = getTerrainHeight(camera.position.x, camera.position.z);
    camera.position.y = Math.max(camera.position.y, groundY + PLAYER_HEIGHT);
  }

  return { camera, controls, update };
}
