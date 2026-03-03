# Terrain Explorer

An interactive, procedurally generated 3D world built with Three.js. Fly around a landscape that's created from a single seed — same seed, same world every time.

## Team
- Rudra Patel (Group Leader), Cierra Wickliff, Krupa Ray, Jasman Mangat

## Pillars
- Rendering
- Procedural Generation

## What's Working

- **Procedural terrain** — a landscape generated from layered noise, coloured by altitude (water, sand, grass, forest, rock, snow)
- **Seeded generation** — every world is reproducible from a seed string
- **Fly camera** — explore the world with mouse + keyboard (WASD, Space, Ctrl)
- **Sky & lighting** — dynamic sky shader with sun, fog, and shadows
- **FPS counter** — performance stats overlay

## Project Structure

```
graphics-app/
├── index.html                  Entry point
├── package.json
├── src/
│   ├── main.js                 App entry — sets up scene, terrain, and render loop
│   ├── style.css               Global styles
│   │
│   ├── core/                   Rendering & environment
│   │   ├── index.js            Barrel exports
│   │   ├── renderer.js         WebGL2 renderer setup
│   │   ├── camera.js           Fly camera (PointerLock + WASD)
│   │   └── environment.js      Sky, fog, and lighting
│   │
│   ├── terrain/                Procedural terrain generation
│   │   └── index.js            Heightmap mesh from seeded noise + altitude colouring
│   │
│   ├── ui/                     Custom UI overlay
│   │   └── index.js            (seed input, sliders, debug panel)
│   │
│   └── utils/                  Shared helpers
│       ├── index.js            Barrel exports
│       ├── random.js           Seeded random number generator
│       ├── noise.js            Simplex noise + fractal layering (fBm)
│       ├── random.test.js      Tests for random module
│       └── noise.test.js       Tests for noise module
```


## Build Instructions

### Install
```sh
cd graphics-app
npm install
```

### Development server
```sh
npm run dev
# open http://localhost:5173 in your browser
```

### Production build
```sh
npm run build
```

### Preview production build
```sh
npm run preview
```

## Controls

| Key | Action |
|-----|--------|
| Click canvas | Lock pointer / enter fly mode |
| Mouse | Look around |
| W / S | Move forward / backward |
| A / D | Strafe left / right |
| Space | Ascend |
| Left Ctrl | Descend |
| Shift | Sprint (2.5x speed) |
| Esc | Release pointer lock |
