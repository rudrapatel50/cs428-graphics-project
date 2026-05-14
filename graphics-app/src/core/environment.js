/**
 * environment.js — Sky, fog, and lighting with dynamic time-of-day.
 *
 * The fog colour, hemisphere light, and directional light all react
 * to the sun elevation so that moving the "time of day" slider
 * produces dramatic, physically-motivated colour shifts:
 *   high sun  → cool blue fog, bright white light
 *   sunset    → warm golden fog, orange light
 *   night     → deep blue-black fog, dim blue light
 *
 * CG techniques demonstrated:
 *   - Physically-based sky shader (Preetham model via Three.js Sky)
 *   - Exponential-squared fog with dynamic colouring
 *   - Cascaded shadow mapping
 *   - Hemisphere ambient light (sky + ground bounce)
 */

import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';

// ─── Defaults ────────────────────────────────────────────────────────

const DEFAULT_SUN_ELEVATION = 45;
const DEFAULT_SUN_AZIMUTH = 200;
const DEFAULT_FOG_DENSITY = 0.0004;

// ─── Colour palettes for time-of-day interpolation ───────────────────

/** Sky/fog colour at various sun elevations. */
const FOG_NIGHT = new THREE.Color(0x0c1628);
const FOG_SUNSET = new THREE.Color(0xc47040);
const FOG_DAY = new THREE.Color(0x6ba3cc);

const LIGHT_NIGHT = new THREE.Color(0x223355);
const LIGHT_SUNSET = new THREE.Color(0xff9944);
const LIGHT_DAY = new THREE.Color(0xfff4e0);

const HEMI_SKY_NIGHT = new THREE.Color(0x111833);
const HEMI_SKY_SUNSET = new THREE.Color(0xcc7744);
const HEMI_SKY_DAY = new THREE.Color(0x87ceeb);

const HEMI_GND_NIGHT = new THREE.Color(0x050508);
const HEMI_GND_SUNSET = new THREE.Color(0x332211);
const HEMI_GND_DAY = new THREE.Color(0x553311);

// ─── Helpers ─────────────────────────────────────────────────────────

/** Smooth-step for nicer transitions. */
function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Blend between three colour stops based on sun elevation. */
function lerpTriple(night, sunset, day, elevation, target) {
  if (elevation <= 0) {
    return target.copy(night);
  } else if (elevation <= 10) {
    const t = smoothstep(0, 10, elevation);
    return target.copy(night).lerp(sunset, t);
  } else if (elevation <= 30) {
    const t = smoothstep(10, 30, elevation);
    return target.copy(sunset).lerp(day, t);
  } else {
    return target.copy(day);
  }
}

// ─── Public factory ──────────────────────────────────────────────────

export function createEnvironment(scene) {
  // --- Sky shader (Preetham model) ---
  const sky = new Sky();
  sky.scale.setScalar(50000);
  scene.add(sky);

  const skyUniforms = sky.material.uniforms;
  skyUniforms['turbidity'].value = 2;
  skyUniforms['rayleigh'].value = 1.2;
  skyUniforms['mieCoefficient'].value = 0.003;
  skyUniforms['mieDirectionalG'].value = 0.85;

  // --- Fog (exponential²) ---
  const fogColor = new THREE.Color();
  scene.fog = new THREE.FogExp2(fogColor, DEFAULT_FOG_DENSITY);
  scene.background = fogColor.clone();

  // --- Hemisphere light (sky + ground bounce) ---
  const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x553311, 0.6);
  scene.add(hemiLight);

  // --- Ambient fill for night ---
  const ambientLight = new THREE.AmbientLight(0x222244, 0.15);
  scene.add(ambientLight);

  // --- Directional light (sun) with shadows ---
  const sunLight = new THREE.DirectionalLight(0xfff4e0, 1.8);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.bias = -0.0005;
  sunLight.shadow.normalBias = 0.02;

  const shadowCam = sunLight.shadow.camera;
  shadowCam.left = -150;
  shadowCam.right = 150;
  shadowCam.top = 150;
  shadowCam.bottom = -150;
  shadowCam.near = 0.5;
  shadowCam.far = 600;

  scene.add(sunLight);
  scene.add(sunLight.target);

  // --- Sun position vector ---
  const sunPosition = new THREE.Vector3();
  const _tmpColor = new THREE.Color();

  // --- State ---
  let currentElevation = DEFAULT_SUN_ELEVATION;
  let currentAzimuth = DEFAULT_SUN_AZIMUTH;
  let currentFogDensity = DEFAULT_FOG_DENSITY;

  /**
   * Recompute sun position and all dynamic colours.
   */
  function setSunPosition(
    elevation,
    azimuth,
    followPosition = new THREE.Vector3(),
  ) {
    currentElevation = elevation;
    currentAzimuth = azimuth;

    const phi = THREE.MathUtils.degToRad(90 - elevation);
    const theta = THREE.MathUtils.degToRad(azimuth);

    sunPosition.setFromSphericalCoords(1, phi, theta);
    skyUniforms['sunPosition'].value.copy(sunPosition);

    sunLight.position.copy(sunPosition).multiplyScalar(300).add(followPosition);
    sunLight.target.position.copy(followPosition);

    // --- Dynamic light intensity ---
    const dayFactor = smoothstep(-5, 30, elevation);
    sunLight.intensity = THREE.MathUtils.lerp(0.05, 1.6, dayFactor);
    hemiLight.intensity = THREE.MathUtils.lerp(0.15, 0.55, dayFactor);
    ambientLight.intensity = THREE.MathUtils.lerp(0.4, 0.08, dayFactor);

    // --- Dynamic colours ---
    lerpTriple(LIGHT_NIGHT, LIGHT_SUNSET, LIGHT_DAY, elevation, sunLight.color);
    lerpTriple(HEMI_SKY_NIGHT, HEMI_SKY_SUNSET, HEMI_SKY_DAY, elevation, hemiLight.color);
    lerpTriple(HEMI_GND_NIGHT, HEMI_GND_SUNSET, HEMI_GND_DAY, elevation, hemiLight.groundColor);

    // --- Dynamic fog colour ---
    lerpTriple(FOG_NIGHT, FOG_SUNSET, FOG_DAY, elevation, fogColor);
    scene.fog.color.copy(fogColor);
    scene.background.copy(fogColor);

    // --- Sky turbidity / rayleigh tweak for time of day ---
    skyUniforms['turbidity'].value = THREE.MathUtils.lerp(1, 3, smoothstep(0, 15, elevation));
    skyUniforms['rayleigh'].value = THREE.MathUtils.lerp(0.5, 1.5, smoothstep(5, 40, elevation));
  }

  setSunPosition(DEFAULT_SUN_ELEVATION, DEFAULT_SUN_AZIMUTH);

  // --- Public API ---
  function update(
    sunElevation,
    sunAzimuth,
    followPosition = new THREE.Vector3(),
  ) {
    setSunPosition(sunElevation, sunAzimuth, followPosition);
  }

  function setFogDensity(density) {
    currentFogDensity = density;
    scene.fog.density = density;
  }

  function getFogDensity() {
    return currentFogDensity;
  }

  return {
    sunLight,
    hemiLight,
    ambientLight,
    sky,
    update,
    setFogDensity,
    getFogDensity,
    getElevation: () => currentElevation,
    getAzimuth: () => currentAzimuth,
  };
}
