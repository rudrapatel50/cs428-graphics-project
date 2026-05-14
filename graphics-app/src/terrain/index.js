/**
 * terrain/index.js — Procedural terrain with biomes and infinite chunk streaming.
 *
 * Uses temperature/moisture noise to create 5 biomes with smooth blending.
 * Chunks load asynchronously (max 2/frame) to prevent stutter.
 */

import * as THREE from "three";
import { createSeededNoise2D, fbm, ridgeFbm } from "../utils/index.js";

// ─── Textures & Shader Splatting ───────────────────────────────────

const textureLoader = new THREE.TextureLoader();
const tRockDiff = textureLoader.load(
  "/rocky_terrain/rocky_terrain_diffuse.jpg",
);
const tRockNorm = textureLoader.load("/rocky_terrain/rocky_terrain_nor_gl.jpg");
const tRockRoug = textureLoader.load("/rocky_terrain/rocky_terrain_rough.jpg");

const tSandDiff = textureLoader.load("/sand/sand_diffuse.jpg");
const tSandNorm = textureLoader.load("/sand/sand_nor_gl.jpg");
const tSandRoug = textureLoader.load("/sand/sand_rough.jpg");

const tSnowDiff = textureLoader.load("/snow/snow_diff.jpg");
const tSnowNorm = textureLoader.load("/snow/snow_nor_gl.jpg");
const tSnowRoug = textureLoader.load("/snow/snow_rough.jpg");

const allTex = [
  tRockDiff,
  tRockNorm,
  tRockRoug,
  tSandDiff,
  tSandNorm,
  tSandRoug,
  tSnowDiff,
  tSnowNorm,
  tSnowRoug,
];
allTex.forEach((t) => {
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
});

const sharedTerrainMaterial = new THREE.MeshStandardMaterial({
  vertexColors: true,
  map: tRockDiff, // Fallback (Texture Unit 0)
  normalMap: tRockNorm,
  roughnessMap: tRockRoug,
  metalness: 0.05,
  flatShading: false,
});

// CRITICAL: Custom uniforms must be stored in userData so the renderer binds them properly
sharedTerrainMaterial.userData = {
  tSandDiff: { value: tSandDiff },
  tSandNorm: { value: tSandNorm },
  tSandRoug: { value: tSandRoug },
  tSnowDiff: { value: tSnowDiff },
  tSnowNorm: { value: tSnowNorm },
  tSnowRoug: { value: tSnowRoug },
};

const sharedWaterMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x1ca3ec,
  transmission: 0.9,
  opacity: 1,
  transparent: true,
  roughness: 0.1,
  ior: 1.4,
  thickness: 0.5,
  side: THREE.DoubleSide,
});

sharedTerrainMaterial.onBeforeCompile = (shader) => {
  shader.uniforms.tSandDiff = sharedTerrainMaterial.userData.tSandDiff;
  shader.uniforms.tSandNorm = sharedTerrainMaterial.userData.tSandNorm;
  shader.uniforms.tSandRoug = sharedTerrainMaterial.userData.tSandRoug;
  shader.uniforms.tSnowDiff = sharedTerrainMaterial.userData.tSnowDiff;
  shader.uniforms.tSnowNorm = sharedTerrainMaterial.userData.tSnowNorm;
  shader.uniforms.tSnowRoug = sharedTerrainMaterial.userData.tSnowRoug;

  // Add custom attribute vTexWeights
  shader.vertexShader = shader.vertexShader.replace(
    "#include <common>",
    `
    attribute vec3 texWeights;
    varying vec3 vTexWeights;
    #include <common>
    `,
  );
  shader.vertexShader = shader.vertexShader.replace(
    "#include <color_vertex>",
    `#include <color_vertex>
     vTexWeights = texWeights;
    `,
  );

  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <common>",
    `
    uniform sampler2D tSandDiff;
    uniform sampler2D tSandNorm;
    uniform sampler2D tSandRoug;
    uniform sampler2D tSnowDiff;
    uniform sampler2D tSnowNorm;
    uniform sampler2D tSnowRoug;
    varying vec3 vTexWeights;
    #include <common>
    `,
  );

  // Splat Diffuse Map
  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <map_fragment>",
    `
#ifdef USE_MAP
    vec4 texelColor = texture2D(map, vMapUv); // Rock
    vec4 sandColor  = texture2D(tSandDiff, vMapUv);
    vec4 snowColor  = texture2D(tSnowDiff, vMapUv);

    vec4 mixedTex = texelColor * vTexWeights.x + sandColor * vTexWeights.y + snowColor * vTexWeights.z;
    diffuseColor *= mixedTex;
#endif
    `,
  );

  // Splat Roughness Map
  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <roughnessmap_fragment>",
    `
    float roughnessFactor = roughness;
    #ifdef USE_ROUGHNESSMAP
      float rockR = texture2D(roughnessMap, vRoughnessMapUv).g;
      float sandR = texture2D(tSandRoug, vRoughnessMapUv).g;
      float snowR = texture2D(tSnowRoug, vRoughnessMapUv).g;

      float mixedRough = rockR * vTexWeights.x + sandR * vTexWeights.y + snowR * vTexWeights.z;
      roughnessFactor *= mixedRough;
    #endif
    `,
  );

  // Splat Normal Map
  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <normal_fragment_maps>",
    `
#ifdef USE_NORMALMAP_TANGENTSPACE
    vec3 rockN = texture2D(normalMap, vNormalMapUv).xyz * 2.0 - 1.0;
    vec3 sandN = texture2D(tSandNorm, vNormalMapUv).xyz * 2.0 - 1.0;
    vec3 snowN = texture2D(tSnowNorm, vNormalMapUv).xyz * 2.0 - 1.0;

    vec3 mixedN = normalize(rockN * vTexWeights.x + sandN * vTexWeights.y + snowN * vTexWeights.z);
    
    vec3 mapN = mixedN;
    mapN.xy *= normalScale;
    normal = normalize(tbn * mapN);
#elif defined( USE_BUMPMAP )
    normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif
    `,
  );
};

// ─── Configurable settings ─────────────────────────────────────────

let CHUNK_SIZE = 200;
let CHUNK_SEGMENTS = 128;
let VIEW_RADIUS = 3;
let SNOW_LEVEL = 80;

export function setTerrainConfig({
  viewRadius,
  chunkSegments,
  chunkSize,
  biomeScale,
  snowLevel,
} = {}) {
  if (viewRadius != null) VIEW_RADIUS = viewRadius;
  if (chunkSegments != null) CHUNK_SEGMENTS = chunkSegments;
  if (chunkSize != null) CHUNK_SIZE = chunkSize;
  if (snowLevel != null) SNOW_LEVEL = snowLevel;
  if (biomeScale != null) {
    BIOME_NOISE_1.scale = biomeScale;
    BIOME_NOISE_2.scale = biomeScale * 1.33; // Offset second noise to avoid alignment
  }
}

// ─── Biome definitions ──────────────────────────────────────────────

const BIOMES = {
  plains: {
    heightScale: 20,
    noiseOpts: { octaves: 4, lacunarity: 2.0, gain: 0.35, scale: 0.003 },
    useRidged: false,
    colours: [
      [0.0, 0x1a3c5e],
      [0.22, 0x2a6e9e],
      [0.28, 0xc2b280],
      [0.35, 0x6db34f],
      [0.55, 0x4a8c38],
      [0.8, 0x3d7a2e],
      [1.0, 0x6b8a50],
    ],
  },
  rollingHills: {
    heightScale: 55,
    noiseOpts: { octaves: 5, lacunarity: 2.0, gain: 0.42, scale: 0.0025 },
    useRidged: false,
    colours: [
      [0.0, 0x1a3c5e],
      [0.18, 0x2a6e9e],
      [0.24, 0xc2b280],
      [0.3, 0x5ca040],
      [0.5, 0x3a7d44],
      [0.7, 0x5a6b4a],
      [0.85, 0x7a7a6a],
      [1.0, 0x9a9a88],
    ],
  },
  forest: {
    heightScale: 42,
    noiseOpts: { octaves: 5, lacunarity: 2.2, gain: 0.4, scale: 0.003 },
    useRidged: false,
    colours: [
      [0.0, 0x1a3c5e],
      [0.2, 0x2a6e9e],
      [0.26, 0xb0a070],
      [0.32, 0x2d7030],
      [0.5, 0x1a5a1e],
      [0.7, 0x14481a],
      [0.85, 0x2d5a1e],
      [1.0, 0x506050],
    ],
  },
  desert: {
    heightScale: 25,
    noiseOpts: { octaves: 3, lacunarity: 2.0, gain: 0.3, scale: 0.002 },
    useRidged: false,
    colours: [
      [0.0, 0x1a3c5e],
      [0.2, 0x2a6e9e],
      [0.26, 0xd4b896],
      [0.35, 0xc8a86e],
      [0.55, 0xd4b078],
      [0.75, 0xbf9c5a],
      [0.9, 0xc8a870],
      [1.0, 0xd8c8a0],
    ],
  },
  mountains: {
    heightScale: 140,
    noiseOpts: { octaves: 7, lacunarity: 2.0, gain: 0.48, scale: 0.002 },
    useRidged: true,
    colours: [
      [0.0, 0x1a3c5e],
      [0.15, 0x2a6e9e],
      [0.2, 0xc2b280],
      [0.26, 0x3a7d44],
      [0.38, 0x2d5a1e],
      [0.5, 0x6b6b5b],
      [0.65, 0x7a7a6a],
      [0.8, 0x9e9e8e],
      [0.92, 0xc8c8c0],
      [1.0, 0xffffff],
    ],
  },
  tundra: {
    heightScale: 22,
    noiseOpts: { octaves: 4, lacunarity: 2.1, gain: 0.4, scale: 0.0025 },
    useRidged: false,
    colours: [
      [0.0, 0x1a3c5e],
      [0.22, 0x2a6e9e],
      [0.28, 0xcccccc],
      [0.35, 0xdddddd],
      [0.55, 0xeeeeee],
      [0.8, 0xf4f4f4],
      [1.0, 0xffffff],
    ],
  },
};

// Pre-build THREE.Color stop arrays
for (const b of Object.values(BIOMES)) {
  b.colourStops = b.colours.map(([t, hex]) => [t, new THREE.Color(hex)]);
}

// ─── Module state ───────────────────────────────────────────────────

let sceneRef = null;
let noise2D = null;
let biomeNoise1 = null;
let biomeNoise2 = null;
const chunks = new Map();
const buildingChunks = new Set();
let lastCX = null;
let lastCZ = null;
const buildQueue = [];

// ─── Helpers ────────────────────────────────────────────────────────

const worldToChunk = (v) => Math.floor(v / CHUNK_SIZE);
const chunkKey = (cx, cz) => `${cx},${cz}`;

// Biome noise config — uses fbm for richer variation
const BIOME_NOISE_1 = { octaves: 3, lacunarity: 2.0, gain: 0.5, scale: 0.0006 };
const BIOME_NOISE_2 = { octaves: 2, lacunarity: 2.0, gain: 0.5, scale: 0.0008 };

// Biome centers placed at corners + center of the 2D noise space
// so all biomes are reachable as noise sweeps [-0.6, 0.6]
const BIOME_CENTERS = [
  { name: "plains", x: -0.4, y: -0.4 },
  { name: "desert", x: 0.4, y: -0.4 },
  { name: "forest", x: -0.4, y: 0.4 },
  { name: "mountains", x: 0.4, y: 0.4 },
  { name: "rollingHills", x: 0.0, y: 0.0 },
  { name: "tundra", x: 0.0, y: -0.55 },
];

function getBiomeWeights(wx, wz) {
  const n1 = fbm(biomeNoise1, wx, wz, BIOME_NOISE_1);
  const n2 = fbm(biomeNoise2, wx, wz, BIOME_NOISE_2);

  const sharpness = 2.8;
  const weights = [];
  let total = 0;

  for (const c of BIOME_CENTERS) {
    const dx = n1 - c.x;
    const dy = n2 - c.y;
    const w = Math.exp(-(dx * dx + dy * dy) * sharpness);
    weights.push({ biome: c.name, weight: w });
    total += w;
  }

  for (const w of weights) w.weight /= total;
  return weights;
}

function sampleColour(t, stops, target) {
  t = Math.max(0, Math.min(1, t));
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const blend = (t - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]);
      return target.copy(stops[i - 1][1]).lerp(stops[i][1], blend);
    }
  }
  return target.copy(stops[stops.length - 1][1]);
}

function computeHeight(wx, wz, biome) {
  const b = BIOMES[biome];
  const raw = b.useRidged
    ? ridgeFbm(noise2D, wx, wz, b.noiseOpts)
    : fbm(noise2D, wx, wz, b.noiseOpts);
  const macro = noise2D(wx * 0.0004, wz * 0.0004); // single sample, not fbm
  return (raw + macro * 0.2) * b.heightScale;
}

// ─── Chunk lifecycle ────────────────────────────────────────────────

async function createChunk(cx, cz) {
  const key = chunkKey(cx, cz);
  if (buildingChunks.has(key)) return;
  buildingChunks.add(key);

  const originX = cx * CHUNK_SIZE;
  const originZ = cz * CHUNK_SIZE;

  const geometry = new THREE.PlaneGeometry(
    CHUNK_SIZE,
    CHUNK_SIZE,
    CHUNK_SEGMENTS,
    CHUNK_SEGMENTS,
  );
  geometry.rotateX(-Math.PI / 2);

  const positions = geometry.attributes.position;
  const uvs = geometry.attributes.uv;
  const colours = new Float32Array(positions.count * 3);
  const texWeights = new Float32Array(positions.count * 3);
  const tempCol = new THREE.Color();
  const blendCol = new THREE.Color();

  // ── Coarse biome grid (17×17) — avoids per-vertex fbm for biome noise ──
  const BG = 16; // grid divisions
  const biomeGrid = new Array((BG + 1) * (BG + 1));
  for (let gz = 0; gz <= BG; gz++) {
    for (let gx = 0; gx <= BG; gx++) {
      const wx = originX + (gx / BG) * CHUNK_SIZE;
      const wz = originZ + (gz / BG) * CHUNK_SIZE;
      biomeGrid[gz * (BG + 1) + gx] = getBiomeWeights(wx, wz);
    }
  }

  for (let i = 0; i < positions.count; i++) {
    // Yield to the main thread periodically to prevent stutter
    if (i % 4000 === 0 && i !== 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    const lx = positions.getX(i) + CHUNK_SIZE / 2; // local [0, CHUNK_SIZE]
    const lz = positions.getZ(i) + CHUNK_SIZE / 2;
    const wx = lx + originX;
    const wz = lz + originZ;

    // Apply global UV mapping so the texture tiles seamlessly across chunks
    uvs.setXY(i, wx * 0.1, wz * 0.1);

    // Bilinear interpolation of biome weights from coarse grid
    const gxf = (lx / CHUNK_SIZE) * BG;
    const gzf = (lz / CHUNK_SIZE) * BG;
    const gx0 = Math.min(Math.floor(gxf), BG - 1);
    const gz0 = Math.min(Math.floor(gzf), BG - 1);
    const fx = gxf - gx0;
    const fz = gzf - gz0;

    const w00 = biomeGrid[gz0 * (BG + 1) + gx0];
    const w10 = biomeGrid[gz0 * (BG + 1) + gx0 + 1];
    const w01 = biomeGrid[(gz0 + 1) * (BG + 1) + gx0];
    const w11 = biomeGrid[(gz0 + 1) * (BG + 1) + gx0 + 1];

    const f00 = (1 - fx) * (1 - fz);
    const f10 = fx * (1 - fz);
    const f01 = (1 - fx) * fz;
    const f11 = fx * fz;

    // Blended height + per-biome colour + texture splat weights
    let height = 0;
    let sandW = 0;
    let baseSnowW = 0;
    blendCol.setRGB(0, 0, 0);

    for (let b = 0; b < w00.length; b++) {
      const weight =
        w00[b].weight * f00 +
        w10[b].weight * f10 +
        w01[b].weight * f01 +
        w11[b].weight * f11;
      if (weight < 0.001) continue; // skip negligible biomes

      const biome = w00[b].biome;
      if (biome === "desert") sandW += weight;
      if (biome === "tundra") baseSnowW += weight;

      const h = computeHeight(wx, wz, biome);
      height += h * weight;

      const bd = BIOMES[biome];
      const t = Math.max(0, Math.min(1, (h / bd.heightScale + 1.2) / 2.4));
      sampleColour(t, bd.colourStops, tempCol);
      blendCol.r += tempCol.r * weight;
      blendCol.g += tempCol.g * weight;
      blendCol.b += tempCol.b * weight;
    }

    // Snow dynamically based on altitude (configurable via SNOW_LEVEL)
    let altSnow = Math.max(0, Math.min(1, (height - SNOW_LEVEL) / 20));
    let snowW = Math.max(0, Math.min(1, baseSnowW + altSnow));

    // Normalize splat weights
    let rockW = Math.max(0, 1.0 - sandW - snowW);
    const sum = rockW + sandW + snowW || 1;

    texWeights[i * 3] = rockW / sum;
    texWeights[i * 3 + 1] = sandW / sum;
    texWeights[i * 3 + 2] = snowW / sum;

    positions.setY(i, height);
    colours[i * 3] = blendCol.r;
    colours[i * 3 + 1] = blendCol.g;
    colours[i * 3 + 2] = blendCol.b;
  }

  geometry.setAttribute("color", new THREE.BufferAttribute(colours, 3));
  geometry.setAttribute("texWeights", new THREE.BufferAttribute(texWeights, 3));

  // Yield before normals computation (can take a few ms)
  await new Promise((resolve) => setTimeout(resolve, 0));
  geometry.computeVertexNormals();

  const group = new THREE.Group();
  group.position.set(originX + CHUNK_SIZE / 2, 0, originZ + CHUNK_SIZE / 2);

  const mesh = new THREE.Mesh(geometry, sharedTerrainMaterial);
  mesh.receiveShadow = true;
  group.add(mesh);

  // Add water plane
  const waterGeo = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE);
  waterGeo.rotateX(-Math.PI / 2);
  const waterMesh = new THREE.Mesh(waterGeo, sharedWaterMaterial);
  waterMesh.position.y = 10; // Sea level
  group.add(waterMesh);

  sceneRef.add(group);
  chunks.set(key, group);
  buildingChunks.delete(key);
}

function removeChunk(k) {
  const group = chunks.get(k);
  if (!group) return;
  sceneRef.remove(group);
  group.children.forEach((c) => {
    if (c.geometry) c.geometry.dispose();
  });
  chunks.delete(k);
}

function clearAllChunks() {
  for (const k of chunks.keys()) removeChunk(k);
  lastCX = null;
  lastCZ = null;
  buildQueue.length = 0;
  buildingChunks.clear();
}

// ─── Public API ─────────────────────────────────────────────────────

export function getTerrainHeight(x, z) {
  if (!noise2D) return 0;
  const weights = getBiomeWeights(x, z);
  let h = 0;
  for (const { biome, weight } of weights) {
    if (weight < 0.001) continue;
    h += computeHeight(x, z, biome) * weight;
  }
  return h;
}

export function createTerrain(scene, seed) {
  sceneRef = scene;
  noise2D = createSeededNoise2D(seed);
  biomeNoise1 = createSeededNoise2D(seed + "-biome1");
  biomeNoise2 = createSeededNoise2D(seed + "-biome2");
  clearAllChunks();
}

/**
 * Stream chunks around camera. maxBuilds controls stutter:
 *   - Large value (100+) for initial load behind loading screen
 *   - Small value (1-2) for smooth streaming during gameplay
 */
export function updateTerrain(camera, maxBuilds = 2) {
  if (!sceneRef || !noise2D) return;

  // Setup frustum for culling
  const frustum = new THREE.Frustum();
  const projMatrix = new THREE.Matrix4();
  projMatrix.multiplyMatrices(
    camera.projectionMatrix,
    camera.matrixWorldInverse,
  );
  frustum.setFromProjectionMatrix(projMatrix);

  // Helper to test if chunk sphere is in frustum
  const isChunkVisible = (chunkX, chunkZ) => {
    const cx = chunkX * CHUNK_SIZE + CHUNK_SIZE / 2;
    const cz = chunkZ * CHUNK_SIZE + CHUNK_SIZE / 2;
    const sphere = new THREE.Sphere(
      new THREE.Vector3(cx, 0, cz),
      CHUNK_SIZE * 0.866,
    );
    return frustum.intersectsSphere(sphere);
  };

  const cx = worldToChunk(camera.position.x);
  const cz = worldToChunk(camera.position.z);

  // Re-evaluate needed chunks when camera crosses a chunk boundary
  if (cx !== lastCX || cz !== lastCZ) {
    lastCX = cx;
    lastCZ = cz;

    const needed = new Set();
    for (let dz = -VIEW_RADIUS; dz <= VIEW_RADIUS; dz++) {
      for (let dx = -VIEW_RADIUS; dx <= VIEW_RADIUS; dx++) {
        const nx = cx + dx,
          nz = cz + dz;
        const k = chunkKey(nx, nz);

        // Only load chunks in frustum
        if (isChunkVisible(nx, nz)) {
          needed.add(k);
          if (!chunks.has(k)) {
            buildQueue.push({ cx: nx, cz: nz, key: k });
          }
        }
      }
    }

    // Remove chunks no longer needed
    for (const k of chunks.keys()) {
      if (!needed.has(k)) removeChunk(k);
    }
  }

  // Cull existing chunks: hide those outside frustum
  for (const [key, chunk] of chunks) {
    const [nx, nz] = key.split(",").map(Number);
    chunk.visible = isChunkVisible(nx, nz);
  }

  // Process build queue (limited per tick to prevent stutter)
  let built = 0;
  while (buildQueue.length > 0 && built < maxBuilds) {
    const item = buildQueue.shift();
    if (chunks.has(item.key) || buildingChunks.has(item.key)) continue;
    // Skip if no longer in range
    if (lastCX !== null) {
      if (
        Math.abs(item.cx - lastCX) > VIEW_RADIUS ||
        Math.abs(item.cz - lastCZ) > VIEW_RADIUS
      )
        continue;
    }
    createChunk(item.cx, item.cz);
    built++;
  }
}
