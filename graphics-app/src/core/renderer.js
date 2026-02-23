import * as THREE from 'three';

export function createRenderer(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.5;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  container.appendChild(renderer.domElement);

  return renderer;
}
