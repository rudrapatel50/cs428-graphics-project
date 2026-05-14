# 🌍 Terrain Explorer

A real-time, procedurally generated 3D terrain explorer built with [Three.js](https://threejs.org/). Fly through infinite landscapes shaped by layered noise, multi-biome blending, and GPU-accelerated texture splatting — all driven by a single seed string.

> **CS 428/523 — Computer Graphics Final Project**
> University of Illinois Chicago · Spring 2026

---

## Team

| Name | Role |
|------|------|
| **Rudra Patel** | Team Lead — Architecture, terrain engine, integration |
| **Cierra Wickliff** | UI/UX design, control panel, hero page |
| **Krupa Ray** | VFX systems (clouds, dust, rain), visual polish |
| **Jasman Mangat** | Audio system, performance optimization |

---

## Technical Pillars

### 1. Procedural Terrain Generation
- **6 biomes** (plains, rolling hills, forest, desert, mountains, tundra) placed via temperature/moisture noise with Gaussian-weighted blending
- **Ridged fBm** for mountain biome — sharp peaks and ridgelines using absolute-value noise folding
- **Seeded determinism** — same seed always produces the same world
- **Infinite chunk streaming** — terrain loads/unloads around the camera with frustum culling and async building (yields to main thread every 4000 vertices)
- **Coarse biome grid** — 17×17 bilinear interpolation reduces per-vertex biome noise calls by ~50×
- **Chunk fade-in** — new chunks animate from transparent to opaque over 600ms to prevent jarring pop-in

### 2. Rendering — Environmental Lighting & Shaders
- **Preetham sky model** with dynamic turbidity and Rayleigh scattering
- **Time-of-day system** — sun elevation drives fog colour, light colour/intensity, hemisphere ambient, and sky parameters through smooth three-stop interpolation
- **GPU texture splatting** — custom `onBeforeCompile` shader injects three-way rock/sand/snow blending on diffuse, normal, and roughness maps based on per-vertex weights
- **Animated water** — vertex-displaced sine-wave superposition (4 frequencies) with `MeshPhysicalMaterial` clearcoat for fresnel reflections
- **Post-processing** — HDR bloom (UnrealBloomPass), custom vignette shader, ACES filmic tone mapping
- **Cascaded shadow mapping** with follow-camera shadow frustum

---

## Live Demo

🔗 **https://cs428-graphics-project.vercel.app/**

---

## Build & Run

```sh
# Clone
git clone https://github.com/cierraw01/cs428-graphics-project.git
cd cs428-graphics-project/graphics-app

# Install dependencies
npm install

# Development server (hot reload)
npm run dev
# → http://localhost:5173

# Production build
npm run build

# Preview production build
npm run preview

# Run tests
npm test
```

**Requirements:** Node.js 18+, a WebGL 2-capable browser (Chrome, Firefox, Safari, Edge).

---

## Controls

| Key | Action |
|-----|--------|
| Click canvas | Lock pointer / enter fly mode |
| Mouse | Look around |
| W / S | Move forward / backward |
| A / D | Strafe left / right |
| Space | Ascend |
| C | Descend |
| Shift | Sprint (2.5× speed) |
| R | Toggle rain + rain audio |
| H | Toggle help overlay |
| Esc | Release pointer lock |

---

## Project Structure

```
graphics-app/
├── index.html                  Entry point (hero page, loading screen)
├── package.json
├── src/
│   ├── main.js                 App bootstrap — scene, terrain, render loop
│   ├── style.css               Global styles (hero, UI, HUD, overlays)
│   │
│   ├── core/                   Rendering & environment
│   │   ├── renderer.js         WebGL2 renderer setup
│   │   ├── camera.js           Fly camera (PointerLock + WASD + collision)
│   │   ├── environment.js      Sky, fog, dynamic time-of-day lighting
│   │   ├── postprocessing.js   Bloom + vignette + tone mapping pipeline
│   │   └── water.js            Animated water surface (vertex displacement)
│   │
│   ├── terrain/                Procedural terrain generation
│   │   └── index.js            Biomes, chunk streaming, texture splatting
│   │
│   ├── vfx/                    Particle visual effects
│   │   └── index.js            Clouds, dust, rain systems
│   │
│   ├── audio/                  Ambient audio with crossfade
│   │   └── index.js            Day/night audio, rain audio
│   │
│   ├── ui/                     In-game control panel
│   │   └── index.js            Glassmorphic settings overlay
│   │
│   └── utils/                  Shared helpers
│       ├── random.js            Seeded RNG
│       ├── noise.js             Simplex noise + fBm + ridged fBm
│       ├── random.test.js       Tests
│       └── noise.test.js        Tests
│
├── public/                     Static assets
│   ├── audio/                  Ambient sound files
│   ├── rocky_terrain/          Rock texture maps
│   ├── sand/                   Sand texture maps
│   └── snow/                   Snow texture maps
│
└── reports/                    Assignment reports
```

---

## License

This project was created for CS 428/523 at UIC. For academic use only.
