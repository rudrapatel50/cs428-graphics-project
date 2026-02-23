import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';

const DEFAULT_SUN_ELEVATION = 30;
const DEFAULT_SUN_AZIMUTH = 180;

export function createEnvironment(scene) {
  // --- Sky ---
  const sky = new Sky();
  sky.scale.setScalar(10000);
  scene.add(sky);

  const skyUniforms = sky.material.uniforms;
  skyUniforms['turbidity'].value = 2;
  skyUniforms['rayleigh'].value = 1;
  skyUniforms['mieCoefficient'].value = 0.005;
  skyUniforms['mieDirectionalG'].value = 0.8;

  // --- Fog ---
  const fogColor = new THREE.Color(0xb0d0e8);
  scene.fog = new THREE.FogExp2(fogColor, 0.0015);
  scene.background = fogColor;

  // --- Hemisphere Light (ambient fill) ---
  const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x553311, 0.4);
  scene.add(hemiLight);

  // --- Directional Light (sun) ---
  const sunLight = new THREE.DirectionalLight(0xfff4e0, 1.5);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;

  const shadowCam = sunLight.shadow.camera;
  shadowCam.left = -100;
  shadowCam.right = 100;
  shadowCam.top = 100;
  shadowCam.bottom = -100;
  shadowCam.near = 0.5;
  shadowCam.far = 500;

  scene.add(sunLight);
  scene.add(sunLight.target);

  // --- Sun position helper ---
  const sunPosition = new THREE.Vector3();

  function setSunPosition(elevation, azimuth) {
    const phi = THREE.MathUtils.degToRad(90 - elevation);
    const theta = THREE.MathUtils.degToRad(azimuth);

    sunPosition.setFromSphericalCoords(1, phi, theta);
    skyUniforms['sunPosition'].value.copy(sunPosition);

    sunLight.position.copy(sunPosition).multiplyScalar(200);
    sunLight.target.position.set(0, 0, 0);
  }

  setSunPosition(DEFAULT_SUN_ELEVATION, DEFAULT_SUN_AZIMUTH);

  function update(sunElevation, sunAzimuth) {
    setSunPosition(sunElevation, sunAzimuth);
  }

  return { sunLight, sky, update };
}
