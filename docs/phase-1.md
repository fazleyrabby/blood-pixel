# Phase 1 — Technical Spike

**Date**: 2026-09-22  
**Goal**: Validate the rendering pipeline before building game logic.

---

## What was built

| File | Purpose |
|---|---|
| `src/rendering/GlyphAtlas.ts` | Canvas-drawn ASCII glyph atlas → PixiJS Texture |
| `src/rendering/AsciiRenderer.ts` | `AsciiSprite` (multi-frame, atlas-backed) + `AsciiSpritePool` |
| `src/rendering/CRTFilter.ts` | GLSL CRT post-process (scanlines, noise, vignette, CA) |
| `src/game/Camera.ts` | Smooth follow camera, world↔screen coords |
| `src/game/GameLoop.ts` | Fixed 60 Hz step + render interpolation |
| `src/spike/SpikeScene.ts` | 200-entity benchmark scene |

---

## GlyphAtlas

The atlas is built at startup by drawing monospace characters onto a `<canvas>` element using `'Share Tech Mono'` (falling back to Courier New). It covers:

- All printable ASCII (`!` through `~`)
- Block characters: `░ ▒ ▓ █ ▄ ▀`
- Box-drawing: `─ │ ┌ ┐ └ ┘ ...`
- Arrows: `↑ ↓ ← →`
- Custom glyphs: `/ \ | _ - + * = ^`

PixiJS v8 API used:
```ts
import { getCanvasTexture, Texture, Rectangle } from 'pixi.js';
const atlasTexture = getCanvasTexture(canvas);
const glyphTex = new Texture({ source: atlasTexture.source, frame: new Rectangle(x, y, w, h) });
```

All glyph sprites share the same `TextureSource` → single GPU texture, enabling PixiJS batch rendering.

---

## AsciiSprite

Each entity is a `Container` of pre-allocated `Sprite` cells (one per glyph position). Frame switching swaps textures and toggles visibility — no DOM/GC allocation.

```ts
const sprite = new AsciiSprite(atlas, {
  frames: [
    [' ███ ', '█x x█', ' █▀█ ', '▄███▄'],  // frame 0
    [' ███ ', '█• •█', ' █▄█ ', '▄▄█▄▄'],  // frame 1
  ],
  tint: 0x39ff14
});
sprite.showFrame(1); // switch animation frame
```

---

## CRTFilter

PixiJS v8 requires `GlProgram` instead of the v7 `(vert, frag, uniforms)` constructor:

```ts
import { Filter, GlProgram, UniformGroup } from 'pixi.js';

const uniforms = new UniformGroup({ uTime: { value: 0, type: 'f32' }, ... });
const glProgram = GlProgram.from({ vertex: VERT_SRC, fragment: FRAG_SRC, name: 'crt-filter' });
super({ glProgram, resources: { crtUniforms: uniforms } });
```

Effects: scanlines, RGB noise, vignette, chromatic aberration. Each can be tuned per `CRTFilterOptions`.

---

## GameLoop

Fixed-step simulation at 60 Hz with render interpolation alpha:

```
accumulator += dt
while accumulator >= FIXED_STEP:
    fixedUpdate(FIXED_STEP)
    accumulator -= FIXED_STEP
render(alpha = accumulator / FIXED_STEP)
```

Accumulator is clamped to 250ms to prevent spiral-of-death after tab restore.

---

## Known Issues / Gotchas

- `TextStyle` in PixiJS v8 does not accept an `alpha` property — use `Container.alpha` instead
- `app.canvas` (not `app.view`) is the canvas element in v8
- `app.init()` is async — must be awaited before any rendering
- `Graphics` API changed: use `.stroke({color, width})` / `.fill({color})` not `.lineStyle()` / `.beginFill()`
- `Text` constructor: `new Text({ text: '...', style: ... })` not `new Text('...', style)`

---

## Performance Baseline (Phase 1)

| Scenario | Result |
|---|---|
| 200 entities on screen | 60 FPS target met |
| Production bundle JS | ~284 KB raw / ~85 KB gzip |
| TypeScript errors | 0 |
| Console errors | 0 |

---

## Next Phase

**Phase 2 — Vertical Slice**: implement a complete playable Mission 1 end-to-end. See `CHANGELOG.md` and `docs/phase-2.md` when complete.
