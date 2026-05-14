# Assignment 7: Engineering Retrospective (Post-Mortem)

## Team
- Rudra Patel (Group Leader), Cierra Wickliff, Krupa Ray, Jasman Mangat

## Links
- **Live Build:** https://cs428-graphics-project.vercel.app/
- **Source Code:** https://github.com/cierraw01/cs428-graphics-project
- **Demo Video:** [TODO: Insert YouTube/Vimeo link]

---

## Project Overview & Pillar Summary

## Playtest Resolution

1. **Accessible Rain Controls** - Many players from our user study noted they were not aware of all the control features, especially the keyboard shortcuts, such as to trigger the rain or show the help overlay. Now, we added a rain toggle to the control panel, which is more apparent to the player.

2. **Better cloud visuals** — We have substituted the previous sphere meshes clouds for sprite-based clouds.

3. **Chunk pop-in** — One of the observations from our testers was that when flying fast, it looked like the terrain chunks pop up sharply, seemingly out of nowhere. Now, the player's view of new terrain is more gradual as new chunks have a fading transition.

4. **Visual Clarity in night-mode** - A tester pointed out that it is hard to see the terrain environment when there is less sunlight like in night-mode as it all goes dark. Now, we have added more clarity and its easier for the player to differentiate different features in the terrain environment.

5. **Help Overlay Functionality** - The help overlay is automatic displayed upon startup, and now has a 'x' button to close it.

## Technical Post-Mortem

### Challenges

- **Chunk fade-in vs shared material** — All chunks share one material with custom splatting shaders. To fade individual chunks, we clone the material temporarily, animate opacity 0→1, then swap back and dispose. Avoids GPU memory bloat.
- **Async chunk building** — Synchronous builds caused 200-300ms frame drops. Switching to async with yields every 4000 vertices + a `maxBuilds` cap (2/frame gameplay, 200 during loading) fixed it without needing Web Workers.
- **Biome noise cost** — Per-vertex biome noise was the biggest bottleneck. A coarse 17×17 grid with bilinear interpolation cut biome noise calls by ~50× with no visible difference.
- **Audio crossfade** — Day/night audio used to hard-cut. Replaced with a 500ms RAF-driven volume ramp.

### Pivots & Cut Features

No major cuts from our A2 MVP. The main pivot was expanding from single-biome to multi-biome blending in A5/6. We skipped tree/rock placement (testers asked for it) since that would violate the feature freeze.

### Performance

60 FPS on medium settings with discrete GPUs, 45-60 on integrated. High quality + large view distance can still cause brief stutter but individual frame drops stay under 16ms.

## AI Tool Evaluation

---

## Final Deliverables

- [x] Final Build / Live URL: https://cs428-graphics-project.vercel.app/
- [x] Source Code: https://github.com/cierraw01/cs428-graphics-project
- [x] Polished README with build instructions
- [ ] Demo Video: [TODO: Insert link]
- [x] Engineering Retrospective (this document)
