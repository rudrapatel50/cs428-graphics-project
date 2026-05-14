// Import Three.js so we can create particles, geometry, materials, and groups
import * as THREE from "three";

// Store references to the main scene and camera so VFX systems
// can follow the player and exist inside the same world
let sceneRef;
let cameraRef;

// Main particle systems / groups
let rain;     // Rain particle system
let dust;     // Dust particle system
let clouds;   // Cloud visual group

// Keeps track of whether rain is currently active
let rainEnabled = false;

// Stores the camera’s previous frame position
// so we can detect movement and trigger dust effects
let lastCameraPosition = new THREE.Vector3();


// MAIN SETUP FUNCTION

/**
 * Initializes all VFX systems for the project.
 * This includes:
 * - Clouds
 * - Dust
 * - Rain
 *
 * @param {THREE.Scene} scene - Main scene
 * @param {THREE.Camera} camera - Main player camera
 */
export function createVFX(scene, camera) {
  // Save scene and camera references globally
  sceneRef = scene;
  cameraRef = camera;

  // Create all particle systems
  createClouds();
  createDust();
  createRain();

  // Save initial player position
  lastCameraPosition.copy(camera.position);
  // Listen for UI rain toggle
window.addEventListener('ui:toggleRain', () => {
  toggleRain();
});
}


// CLOUD SYSTEM
 // Creates large floating cloud objects using sphere meshes.
 // These are lightweight visual objects that slowly move
 // to make the sky feel more alive.
 
function createClouds() {
  // Group to hold all cloud meshes
  const cloudGroup = new THREE.Group();

  // Basic sphere geometry for cloud puffs
  const geometry = new THREE.SphereGeometry(18, 16, 16);

  // Soft white transparent material
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.45,
    roughness: 1,
  });

  // Create multiple cloud objects
  for (let i = 0; i < 18; i++) {
    // Clone material so each cloud can remain independent
    const cloud = new THREE.Mesh(geometry, material.clone());

    // Randomly spread clouds across the sky
    cloud.position.set(
      (Math.random() - 0.5) * 900,   // X spread
      120 + Math.random() * 80,      // Height
      (Math.random() - 0.5) * 900    // Z spread
    );

    // Stretch clouds to feel more natural
    cloud.scale.set(
      2 + Math.random() * 3,
      0.4 + Math.random() * 0.4,
      1 + Math.random() * 2
    );

    // Add cloud to group
    cloudGroup.add(cloud);
  }

  // Save cloud system
  clouds = cloudGroup;

  // Add clouds to scene
  sceneRef.add(clouds);
}


// DUST SYSTEM

// Creates lightweight dust particles that appear
// when the player is moving.

function createDust() {
  // Total dust particles
  const particleCount = 120;

  // Buffer geometry for particle positions
  const geometry = new THREE.BufferGeometry();

  // Store XYZ positions for every particle
  const positions = new Float32Array(particleCount * 3);

  // Randomize particle spawn positions
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 12;       // X
    positions[i * 3 + 1] = Math.random() * 3;            // Y
    positions[i * 3 + 2] = (Math.random() - 0.5) * 12;  // Z
  }

  // Apply positions to geometry
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  // Dust material
  const material = new THREE.PointsMaterial({
    color: 0xc2a878,
    size: 0.18,
    transparent: true,
    opacity: 0.0,       // Initially invisible
    depthWrite: false,
  });

  // Create particle system
  dust = new THREE.Points(geometry, material);

  // Add to scene
  sceneRef.add(dust);
}


// RAIN SYSTEM

//Creates rain particles that can be toggled on/off.

function createRain() {
  // Total rain particles
  const rainCount = 700;

  // Geometry
  const geometry = new THREE.BufferGeometry();

  // Particle positions
  const positions = new Float32Array(rainCount * 3);

  // Spread rain particles around player
  for (let i = 0; i < rainCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 180;      // X
    positions[i * 3 + 1] = Math.random() * 120;          // Y
    positions[i * 3 + 2] = (Math.random() - 0.5) * 180; // Z
  }

  // Apply geometry
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  // Rain material
  const material = new THREE.PointsMaterial({
    color: 0x9ecfff,
    size: 0.22,
    transparent: true,
    opacity: 0.0,       // Starts hidden
    depthWrite: false,
  });

  // Create rain particle system
  rain = new THREE.Points(geometry, material);

  // Add to scene
  sceneRef.add(rain);
}


// TOGGLE RAIN

/**
 * Turns rain on or off.
 * @returns {boolean} Current rain state
 */
export function toggleRain() {
  // Flip rain state
  rainEnabled = !rainEnabled;

  // Change visibility
  if (rain) {
    rain.material.opacity = rainEnabled ? 0.65 : 0.0;
  }

  return rainEnabled;
}

// MASTER UPDATE LOOP

// Updates all VFX systems every frame.

export function updateVFX() {
  // Safety check
  if (!cameraRef) return;

  // Update each system
  updateClouds();
  updateDust();
  updateRain();

  // Save current camera position for next frame
  lastCameraPosition.copy(cameraRef.position);
}


// CLOUD MOVEMENT

// Slowly moves clouds across the sky.

function updateClouds() {
  if (!clouds) return;

  clouds.children.forEach((cloud, index) => {
    // Move cloud slowly
    cloud.position.x += 0.25 + index * 0.005;

    // Recycle cloud when too far
    if (cloud.position.x > cameraRef.position.x + 500) {
      cloud.position.x = cameraRef.position.x - 500;
    }
  });
}


// DUST MOVEMENT
// Activates dust only when player is moving.

function updateDust() {
  if (!dust) return;

  // Measure player movement
  const movementDistance = cameraRef.position.distanceTo(lastCameraPosition);

  // Keep dust near player
  dust.position.set(
    cameraRef.position.x,
    cameraRef.position.y - 4,
    cameraRef.position.z + 4
  );

  // Show dust if moving
  dust.material.opacity = movementDistance > 0.05 ? 0.35 : 0.0;

  // Animate particles upward
  const positions = dust.geometry.attributes.position.array;

  for (let i = 0; i < positions.length / 3; i++) {
    positions[i * 3 + 1] += 0.015;

    // Reset particle height
    if (positions[i * 3 + 1] > 4) {
      positions[i * 3 + 1] = 0;
    }
  }

  // Mark update
  dust.geometry.attributes.position.needsUpdate = true;
}

// RAIN MOVEMENT
// Updates falling rain.

function updateRain() {
  if (!rain || !rainEnabled) return;

  // Keep rain centered around player
  rain.position.set(
    cameraRef.position.x,
    cameraRef.position.y,
    cameraRef.position.z
  );

  const positions = rain.geometry.attributes.position.array;

  for (let i = 0; i < positions.length / 3; i++) {
    // Fall downward
    positions[i * 3 + 1] -= 1.6;

    // Reset raindrop
    if (positions[i * 3 + 1] < -10) {
      positions[i * 3 + 1] = 120;
    }
  }

  // Apply changes
  rain.geometry.attributes.position.needsUpdate = true;
}