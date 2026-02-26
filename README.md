# Terrain Explorer

An interactive, infinite procedurally generated world built with Three.js.

## Team
- Rudra Patel (Group Leader), Cierra Wickliff, Krupa Ray, Jasman Mangat

## Pillars
- Rendering
- Procedural Generation

## Project Structure

```
graphics-app/
├── index.html                  Entry point HTML
├── package.json
├── src/
│   ├── main.js                 App entry -- wires all modules, runs the loop
│   ├── style.css               Global styles
│   │
│   ├── core/                   Rendering & environment (renderer, camera, lights, sky)
│   │   ├── index.js            Barrel exports
│   │   ├── renderer.js         WebGL2 renderer setup
│   │   ├── camera.js           Fly camera (PointerLock + WASD)
│   │   └── environment.js      Sky shader, fog, lighting
│   │
│   ├── terrain/                Procedural terrain generation
│   │   └── index.js            (stub -- terrain chunks, noise, LOD)
│   │
│   ├── ui/                     React UI overlay
│   │   └── index.js            (stub -- seed input, sliders, debug panel)
│   │
│   └── utils/                  Shared helpers
│       └── index.js            (stub -- noise functions, seeded PRNG)
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
