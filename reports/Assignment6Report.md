# Assignment 6: Feature Complete — Release Notes & User Study

## Team
- Rudra Patel (Group Leader), Cierra Wickliff, Krupa Ray, Jasman Mangat

## Links
- **Live Build:** https://cs428-graphics-project.vercel.app/
- **Source Code:** https://github.com/cierraw01/cs428-graphics-project

---

## Feature Complete Release Notes

These are all changes since the Beta Build (Assignment 5). This assignment represents the Feature Freeze — no new features will be added after this point.

### Biome System & Texture Splatting

The terrain module was overhauled from a single-biome heightmap to a full multi-biome system with GPU-based texture splatting:

- **6 biomes** — plains, rolling hills, forest, desert, mountains, and tundra. Each has its own height scale, noise parameters (octave count, lacunarity, gain, frequency), and colour ramp.
- **Biome blending** — Two independent simplex noise fields (temperature and moisture) drive biome selection. Each biome is placed at a point in temperature-moisture space, and biome weights are computed using Gaussian falloff from each center. This produces smooth, natural transitions between biomes rather than hard edges.
- **Ridged fBm for mountains** — The mountain biome uses our `ridgeFbm()` function instead of standard fBm, producing sharp ridgelines and peaks.
- **Texture splatting via custom shader** — We use `onBeforeCompile` on a shared `MeshStandardMaterial` to inject a three-way texture splat in the fragment shader. Rock, sand, and snow diffuse/normal/roughness maps are blended based on per-vertex `texWeights` attributes. The biome type and altitude both contribute to the splat weights (e.g., desert biome increases sand weight, high altitude increases snow weight).
- **Coarse biome grid optimization** — Instead of evaluating biome noise per vertex (16k+ per chunk), we sample a 17×17 grid and bilinearly interpolate, reducing biome noise calls by ~50x with minimal visual difference.
- **Global UV mapping** — Texture UVs are computed from world-space coordinates (`wx * 0.1, wz * 0.1`) so textures tile seamlessly across chunk boundaries.

### Particle VFX System

A new `vfx/index.js` module adds three particle systems:

- **Clouds** — 18 stretched sphere meshes at high altitude (120–200 units) with transparent white material. They drift slowly across the sky and recycle when they pass the camera, so the sky always feels alive without spawning new objects.
- **Dust particles** — 120 small points that appear near the player's feet only when moving. They float upward and reset, creating a subtle trail effect. When the player stops, dust fades to invisible.
- **Rain** — 700 rain particles toggled with the `R` key. Rain falls at 1.6 units/frame, centered around the camera, and resets to the top when hitting the ground. Rain also triggers a separate rain audio loop.

### Ambient Audio

A new `audio/index.js` module provides ambient soundscapes:

- **Day ambient** — Nature sounds (birds, wind) that play during Dawn, Day, and Sunset presets.
- **Night ambient** — Crickets and wind that play during the Night preset. Audio mode switches automatically when clicking time-of-day presets.
- **Rain audio** — A looping rain sound effect that plays while rain particles are active, toggled together with the `R` key.
- All audio uses the HTML5 `<audio>` element with `.loop = true` and volume at 0.45–0.5.

### Hero Landing Page & Loading Screen

The app now has a proper entry flow instead of dropping straight into the scene:

- **Hero page** — A full-screen landing page with the project title, seed input, random seed button, and a "Generate World" button. It also exposes world settings (view distance, terrain quality, chunk size) and graphics settings (shadows, resolution scale, max chunks per frame) so the user can tune performance before entering.
- **Loading screen** — After clicking "Generate World," a loading bar animates from 0–100% while terrain chunks build in the background. Hint text cycles through messages like "Sculpting mountains," "Filling oceans," "Planting forests." The loading screen fades out and the game UI appears.
- **Settings are applied before terrain generation** — View distance, chunk segments, shadow resolution, and pixel ratio are all configured before the first chunk is created, so the initial experience matches the user's hardware.

### Terrain Collision Detection

The camera module (`camera.js`) now queries terrain height at the camera's (x, z) position each frame using the exported `getTerrainHeight()` function:

- `getTerrainHeight(x, z)` evaluates the same biome weight + noise computation used during chunk creation, so the collision height matches the rendered surface exactly.
- The camera Y is clamped to `max(camera.y, groundY + 2)`, preventing the player from clipping through the terrain surface.
- The player can still ascend freely with Space, but cannot descend below the terrain.

### Frustum Culling

`updateTerrain()` now computes a camera frustum each frame and uses it to:

1. **Skip loading** chunks that are behind the camera (even if within view radius).
2. **Hide existing chunks** (`chunk.visible = false`) that rotate out of the frustum as the player looks around.

This reduces draw calls significantly when looking in one direction.

### Shadow Follow-Camera

The directional light shadow camera now repositions to follow the player, so shadows are always rendered around the player's current position rather than being fixed at the world origin.

### Async Chunk Building

Chunk creation is now `async` — it yields to the main thread (`setTimeout(resolve, 0)`) every 4000 vertices during the displacement + colouring loop. This prevents frame stutter when new chunks stream in during gameplay. A `maxBuilds` parameter limits how many chunks can start building per frame (default 2 during gameplay, 200 during the initial loading screen).

### Per-Chunk Water Planes

Each terrain chunk now includes its own water plane at sea level (Y=10) using a shared `MeshPhysicalMaterial` with transmission, transparency, and IOR 1.4. This replaced the single global water plane, ensuring water is visible in every loaded chunk.

### UI Additions

- **Coordinate HUD** — Displays the player's current X, Y, Z position in the bottom-left corner. Toggleable from the control panel.
- **Onboarding overlay** — Shows controls help (WASD, Mouse, R for rain, ESC, H to hide) when the game starts. Press `H` to toggle.
- **Exit to Title Screen** button — Returns to the hero page.
- **Coordinates toggle** — Show/hide the position HUD from the settings panel.

### Other Changes

- **Descend key changed** from Left Ctrl to `C` to avoid browser conflicts.
- **FPS counter hidden by default** — Only shown after entering the game.
- **Pointer lock overlay hidden initially** — Only appears after the first ESC unlock, since the hero page handles initial entry.

---

## Known Issues

1. **Chunk pop-in** — New chunks appear instantly when they finish building. A fade-in transition would make streaming less noticeable.
2. **Biome transition seams** — At certain biome boundaries, colour blending is smooth but texture splatting can create visible lines where rock/sand/snow weights change abruptly.
3. **Rain particles don't interact with terrain** — Rain falls through the ground rather than splashing at the surface.
4. **Audio doesn't crossfade** — Switching between day/night audio cuts abruptly instead of blending.
5. **Cloud meshes are simple spheres** — They look flat from close up. Replacing with billboarded sprites or volumetric noise would improve realism.
6. **No collision with water** — The player can descend below the water surface.
7. **Performance on low-end devices** — High quality settings with large view distance can drop below 30 FPS on integrated GPUs.

---

## User Study Results

### Methodology

We shared a Google Form along with the live Vercel link to classmates in CS 428 and collected 5 responses. The form asked testers to spend a few minutes exploring the terrain, try out the different time-of-day presets, and then answer questions about their experience. We didn't give them any instructions on how the controls work besides what's already shown on the hero page and the in-game onboarding overlay.

**Form questions:**
- What seed did you use?
- How intuitive were the controls? (1-10)
- What stood out to you visually?
- What was confusing or frustrating?
- Did you run into any visual bugs or lag?
- Any suggestions for improvement?

### Subject Feedback

**Tester 1** — used seed "mountain-test", controls: 7/10
> Liked the sunset preset a lot, the sky colors looked really nice with the fog. Took a sec to figure out you press C to go down instead of ctrl. Noticed some lag when flying fast in one direction, new terrain chunks kind of pop in out of nowhere. Suggested adding some kind of minimap.

**Tester 2** — used seed "abcdef", controls: 8/10
> Said the biomes were cool, especially going from desert to mountains. Didn't realize you could toggle rain until we told them after. The clouds looked a bit weird when they flew up close to them. No major lag on their laptop. Would like to see trees or something on the terrain.

**Tester 3** — used random seed, controls: 6/10
> Had trouble with the camera at first, kept looking straight down. Eventually figured it out. Thought the snow textures on the mountains looked good. Said the night mode was really dark and hard to see anything. Audio was a nice touch. Wished there was a way to walk on the ground instead of just flying.

**Tester 4** — used seed "demo-seed", controls: 8/10
> Really liked the loading screen with the different messages. Found the settings panel and tried changing bloom and fog which was cool. Said the water looked flat compared to the terrain. Noticed the exit button and went back to the menu to try a different seed. No lag issues.

**Tester 5** — used seed "cs428", controls: 7/10
> First thing they did was crank the view distance to max and it got kinda choppy for a few seconds. After that it was fine. Liked switching between dawn and night, said the lighting changes felt smooth. Said the dust particles were a cool detail. Complained that the help overlay (H key) was easy to miss.

### Takeaways

Average controls score was 7.2/10 which is decent. Most people liked the lighting system and biome variety. The main complaints were around discoverability (rain toggle, help overlay) and the clouds looking basic up close. A couple people mentioned wanting more stuff on the terrain like trees or rocks.

### Action Items for Assignment 7

1. **Put the rain toggle in the UI** — Nobody found the R key on their own. We should add an actual button in the control panel so its obvious.

2. **Better clouds** — The sphere meshes look fine from far away but up close they're clearly just stretched balls. We should swap them for sprite-based clouds or at least make them fade out when the camera gets too close.

3. **Chunk pop-in** — When flying fast, new chunks just appear which is jarring. Adding a quick fade-in when a chunk loads would help a lot.

4. **Night mode visibility** — One tester said night was too dark to see. We could add a subtle ambient light floor so the terrain is still slightly visible even with the sun below the horizon.

5. **Help overlay needs a close button** — Right now its only dismissible with H which people miss. Adding an X button or "Got it" would fix this.

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
| C | Descend |
| Shift | Sprint (2.5× speed) |
| R | Toggle rain + rain audio |
| H | Toggle onboarding help overlay |
| Esc | Release pointer lock |
