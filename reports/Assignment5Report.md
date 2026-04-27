# Assignment 5: Beta Build — Release Notes

## Team
- Rudra Patel (Group Leader), Cierra Wickliff, Krupa Ray, Jasman Mangat

## Links
- **Live Build:** https://cs428-graphics-project.vercel.app/
- **Source Code:** https://github.com/cierraw01/cs428-graphics-project

---

## Quick Review

Our first pillar is **Procedural Terrain Generation**. In the Alpha Build (Assignment 4), we implemented:
- Seeded simplex-noise heightmap with fractal Brownian motion (fBm) producing varied terrain with mountains, valleys, and coastlines.
- Infinite chunk-streaming system that dynamically loads/unloads terrain patches around the camera.
- Altitude-based vertex colouring (water → sand → grass → forest → rock → snow) with global height normalization so neighbouring chunks colour-match seamlessly.
- A deterministic world from a seed string — the same seed always produces the same terrain, making worlds shareable.

Performance target of ~60 FPS was met, and terrain generates without visible gaps between chunks.

---

## Secondary Pillar Integration

Our second technical pillar is **Rendering — Advanced Environmental Lighting & Shaders**. For this Beta Build, the secondary pillar was fully integrated into the core terrain exploration loop, not as a separate demo:

### How It Integrates

The terrain, atmosphere, and water are all driven by a **unified time-of-day system**. When the user adjusts the sun elevation (or clicks a preset like "Sunset"), the following all update together in real time:

1. **Sun directional light** — colour shifts from warm white (day) → orange (sunset) → dim blue (night), with intensity scaling smoothly.
2. **Hemisphere ambient light** — sky colour and ground-bounce colour both change to match the atmospheric state.  
3. **Exponential² fog** — the fog colour interpolates between cool blue (day), warm orange (sunset), and deep navy (night), so the atmosphere always feels cohesive with the lighting.
4. **Sky shader** — the Three.js Preetham atmospheric model adjusts turbidity and Rayleigh scattering per sun angle.
5. **Water surface** — a physical-material water plane with clearcoat fresnel reflects the changing light environment realistically.
6. **Post-processing** — HDR bloom catches bright sky pixels and sun reflections, creating a cinematic glow that intensifies naturally at sunset angles.

This means the secondary pillar (rendering) directly reacts to user input and affects every visual element the player sees while exploring. The terrain and the rendering pipeline are not separate modules — they work together to produce an immersive experience.

---

## New Features (Since Alpha Build)

### Dynamic Time-of-Day Lighting System
- Fog, directional light, hemisphere light, and sky shader all interpolate colours across three stops (night → sunset → day) using a custom `smoothstep` blending function.
- Light intensity scales automatically — near-zero at night, full power at high sun.
- Four one-click presets: **Dawn** (elev 5°, azim 90°), **Day** (elev 55°, azim 180°), **Sunset** (elev 8°, azim 270°), **Night** (elev −5°, azim 180°).

### HDR Bloom (Post-Processing)
- `EffectComposer` pipeline with `UnrealBloomPass` (strength 0.35, threshold 0.85, radius 0.6).
- Adds cinematic glow to bright highlights (sky near sun, reflective water) without washing out the terrain.
- User-adjustable bloom strength slider.

### Vignette Effect (Custom Shader)
- Custom GLSL fragment shader that darkens screen edges for cinematic framing.
- Implemented as a `ShaderPass` in the post-processing pipeline.

### Animated Water Plane
- `MeshPhysicalMaterial` with clearcoat (0.9) for fresnel-like reflections.
- GPU-side vertex displacement using `onBeforeCompile` to inject multi-frequency sine wave animation directly into the vertex shader.
- 4 overlapping sine waves at different frequencies/amplitudes create natural-looking water movement.
- Transparent with `depthWrite: false` to avoid z-fighting with submerged terrain.

### Macro Terrain Variation
- Added a secondary low-frequency fBm pass (`scale: 0.0003`, 2 octaves) that modulates the base terrain height.
- This creates natural large-scale elevation variation (flat plains vs. dramatic mountain ranges) without changing the fine detail.

### Working Seed Regeneration
- The "Generate" button now fully rebuilds terrain: clears all loaded chunks, reseeds the noise function, and streams new chunks around the camera.
- Random seed button (🎲) generates an alphanumeric seed for quick exploration.

### Polished UI Controls
- Glassmorphic panel design with `backdrop-filter: blur(16px)`, gradient accents, custom slider thumbs with glow effects, and toggle switches.
- Typography upgrade to Inter (Google Fonts).
- Collapsible panel (minimize button) so it doesn't obstruct the view.
- Inline keyboard controls reference (WASD, Space, Ctrl, Shift, Esc).
- FPS counter toggle to show/hide the stats overlay.
- Live value readouts on all sliders.

### Tone Mapping & Colour Space
- ACES Filmic tone mapping for HDR-to-LDR conversion (cinematic contrast curve).
- sRGB output colour space for correct display.
- Pixel ratio capped at 2× for consistent performance on retina displays.

---

## Known Issues

1. **Water reflections are approximated** — the water plane does not have real-time planar reflections of the terrain. It uses the material's built-in environment mapping (clearcoat + metalness) to approximate reflective behaviour. A proper reflection camera or screen-space reflections would improve realism.

2. **Momentary frame stutter on seed change** — regenerating a seed disposes and recreates all chunk meshes at once, causing a brief frame drop (~100–200ms). Amortizing chunk creation over multiple frames would smooth this out.

3. **Chunk borders at extreme fog settings** — at very low fog densities, subtle colour differences between neighbouring chunks can sometimes be visible at their borders. The global height normalization handles most cases, but extreme parameter combinations may still produce minor mismatches.

4. **Shadow cascade coverage** — the shadow camera is centered on the world origin with a fixed 300-unit radius. When the player is very far from origin, shadows may not cover the visible terrain. A follow-camera shadow system would fix this.

5. **No collision detection** — the camera can fly through and beneath the terrain surface. Adding terrain-height queries for camera clamping is planned for the final build.

6. **Water level is static** — the water plane sits at a fixed world-Y position (−30). It does not dynamically adapt if terrain parameters change; adjusting `HEIGHT_SCALE` or noise parameters may require retuning the water level.

---

## Build & Run Instructions

```sh
# Clone
git clone https://github.com/cierraw01/cs428-graphics-project.git
cd cs428-graphics-project/graphics-app

# Install dependencies
npm install

# Development server
npm run dev
# → http://localhost:5173

# Production build
npm run build

# Run tests
npm test
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
| Shift | Sprint (2.5× speed) |
| Esc | Release pointer lock |
