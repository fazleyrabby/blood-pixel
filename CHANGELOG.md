# BLOOD PIXEL — Changelog

All notable changes to **Blood Pixel** are documented here.
Format: `[Phase N] YYYY-MM-DD — Description`

---

## [Phase 1] 2026-09-22 — Technical Spike

### Added
- Vite + TypeScript + PixiJS v8 project scaffold
- `GlyphAtlas` — canvas-drawn monospace glyph atlas, shared GPU texture
- `AsciiSprite` — multi-frame ASCII entity backed by atlas sprites (GPU batched)
- `AsciiSpritePool` — reuse pool for high-frequency entities
- `CRTFilter` — GLSL post-process: scanlines, noise, vignette, chromatic aberration (PixiJS v8 GlProgram)
- `Camera` — smooth follow camera with arena bounds clamping + world↔screen coordinate conversion
- `GameLoop` — fixed 60 Hz simulation step with render interpolation, clamped accumulator
- `SpikeScene` — benchmark: 200 animated ASCII entities (walkers, runners, player) at 60 FPS
- Global dark-terminal CSS with Share Tech Mono font
- Small-viewport CSS guard (< 1024×640)

### Architecture Decisions
- **PixiJS v8** (8.21.0) selected — async `app.init()`, `GlProgram`, `getCanvasTexture`
- **Canvas-drawn glyph atlas** preferred over PixiJS BitmapText for frame-level control and custom glyph sets (block characters ░▒▓█▄▀ etc.)
- **GPU batching** confirmed: all ASCII entity sprites share the same `TextureSource` → single draw call batch
- **Fixed simulation, interpolated render** — simulation at 60 Hz, render at display refresh rate

### Exit Gate Status
- ✅ PixiJS v8 boots and renders
- ✅ 200 animated ASCII entities render without drop
- ✅ CRT filter active
- ✅ Camera smooth-follows with arena clamping
- ✅ TypeScript clean (no errors)
- ✅ Production build succeeds (~284 KB JS gzip ~85 KB)
- ✅ Dev server: `http://localhost:5174`

---

## [Phase 2] 2026-09-22 — Vertical Slice (Playable Mission 1)

### Added
- `Game` orchestrator — boot, phase state machine, fixed 60 Hz simulation, render loop, mission lifecycle, persistence
- Full simulation systems: Movement, AI, Collision (spatial hash), Combat (damage/XP/drops/pickups), Projectile, Spawn (data-driven waves), Mission (4 objective types), Input
- `Weapon` — fire / reload / switch / mouse-wheel cycle across pistol, shotgun, SMG
- Data configs: 15 missions, 3 arenas (town/forest/industrial), 3 weapons, 4 zombie types, XP table, 6 upgrade tracks, level milestones
- All HTML screens: main menu, mission select (lock/complete states), mission brief, countdown HUD, mission complete/failed, upgrade select (3 random choices), settings, victory
- HUD — HP bar, ammo, weapon name, reload state, XP/level bar, kill counter, mission timer, objective, countdown, crosshair
- `SaveData` — versioned localStorage schema (v1), migration, corruption recovery, reset
- `CharacterRenderer` / `ArenaRenderer` — entity glyphs (zombies scaled ×0.85, death fade), arena tiles/obstacles/spawn zones
- Vitest setup (`npm test`) — **36 tests**: mission config validation, XP/milestone/upgrade math, falloff damage, save roundtrip/migration/corruption/reset
- `docs/phase-2.md`

### Fixed
- **All menus dead to real mouse clicks** — `#ui-layer { pointer-events: none }` let clicks fall through to the canvas; `.screen` and pause overlay now set `pointer-events: auto`
- **Pause toggled twice per Escape** — duplicate keydown listener + `pausePressed` flag paused then instantly resumed; flag-only path kept
- **Level milestones skipped for kill XP** — `applyMilestones()` now centralized and called from both `grantXp` and mission-complete reward
- **Settings saved but inert** — Dithering gates CRT noise, Reduced Motion snaps the camera, High Contrast toggles a body CSS filter (Sound/Screen Shake await Phase 7 systems)
- Zombie sprite centering now accounts for visual scale (collision radii unchanged)

### Exit Gate Status
- ✅ Playable end-to-end: menu → brief → 3s countdown → fight → results → upgrade → select
- ✅ Mission 1 completion, Mission 2 unlock, upgrade rank, XP/level/milestone persistence across reload
- ✅ Death → failed screen → retry; Escape pause/resume; blur auto-pause
- ✅ Real-mouse click verification on every screen (Playwright)
- ✅ 0 console errors; TypeScript clean; `npm run build` succeeds; **36/36 tests pass**

---

## [Phase 3] 2026-09-22 — Game Feel, Combat Depth & Depth Tilt

### Added
- **Pseudo-3D depth tilt (2.5D)** — orthographic Y-axis compression (`TILT_Y_SCALE = 0.78`) with the tilt baked into the camera's world↔screen conversion so aiming stays pixel-accurate. Includes Y-sorted (painter's algorithm) sprites, ground shadow ellipses, ±8% depth size falloff, a far-field depth-fog gradient, and obstacles drawn with apparent height (lit top face + dark front wall). Toggleable via the new **Depth Tilt** setting; forced off by Reduced Motion. `src/rendering/depth.ts`, `Camera.ts`, `CharacterRenderer.ts`, `ArenaRenderer.ts`
- **Screen shake** — `Camera.addShake` (strongest-request-wins), fired on shots, hurt, kill, and death; gated by the Screen Shake setting and Reduced Motion
- **Hit-stop** — 60 ms freeze on hurt, 30 ms on kill (skipped under Reduced Motion)
- **Particle system** — `src/rendering/EffectsRenderer.ts`: pooled blood/acid pixel bursts (420 cap) on hit, kill, hurt, and acid splash
- **Procedural audio** — `src/audio/AudioSystem.ts`: 19 synthesized Web Audio cues (3 weapon shots, dry fire, hit, kill, hurt, acid, pickup, reload start/end, UI tick, level-up, countdown, go, complete, failed, death, mute). Lazy `AudioContext` on first gesture; wired to Sound + new Volume slider; `M` mutes
- **Combat depth** — runner lunge (3× burst, band 70–210, 3 s cooldown), brute charge state machine (0.5 s windup telegraph → 6.5× dash → recovery, 4.5 s cooldown), spitter recoil hop + acid splash on impact, weapon recoil kick (shotgun 140 > pistol 45 > smg 20), empty-mag dry fire
- **Debug/cheat system** — backtick dev overlay (fps, phase, pos, enemies, projectiles, tilt, god/mute), F2 cheat panel (god mode, heal, full ammo, +500 XP, max upgrades, unlock weapons, unlock missions, kill all, skip mission, kill player), expanded `window.__bp` API
- **Settings** — Depth Tilt toggle and Master Volume slider (persisted)
- **Tests** — 20 new (Camera tilt/shake, depth projection/scale/sort, AI special-move gating, weapon recoil config); **56/56 pass**
- `docs/phase-3.md`

### Fixed
- Weapon no longer fires when clicking HTML UI (cheat panel / menu buttons) — input system ignores clicks on `button, input, select, textarea`
- First depth-tilt pass (0.86) was imperceptible against the near-black ground; strengthened with depth fog + object height and raised to 0.78

### Exit Gate Status
- ✅ TypeScript clean; `npm run build` succeeds; **56/56 tests pass**
- ✅ 0 console errors (only pre-existing `favicon.ico` 404)
- ✅ Tilt live at 0.78; dev overlay + all 10 cheat buttons verified with real mouse
- ✅ God mode, Kill All (level-up), Skip Mission (complete + persistence) verified
- ✅ Volume slider + Depth Tilt toggle persist; real-mouse firing registers; blood + damage numbers render
- ✅ Mission 9 (25 runners/spitters) at 60 fps with no errors

## [Phase 4] 2026-09-22 — Content, Balance, Presentation & Meta-Progression

### Added
- **New zombie types** — `crawler` (fast swarm), `armored` (45% damage reduction), `exploder` (detonates on contact or death, 95-unit blast), and the `abomination` boss (2600 HP, 25% armor, knockback-immune, summons crawlers every 6 s). Woven through missions 8–14
- **New weapon: RIFLE** — 34 damage, 900 range, pierces up to 2 extra enemies; unlocked by mission 12
- **Boss support** — `boss` mission objective, boss runtime state, HUD boss name + health bar; **Mission 15 is now "THE ABOMINATION"** (4 min escalating horde → boss + escort)
- **Bullet knockback** — projectiles now push zombies along the bullet direction (armor-scaled, bosses immune); the `kbVx/kbVy` fields were previously never applied to zombies
- **Balance tooling** — `src/config/balance.test.ts` computes required HP / threat rate per mission and enforces the curve, weapon identities and XP pacing
- **Presentation** — procedural ambient drone, damage vignette, low-HP pulse vignette, level-up + achievement banners, low-ammo flash, achievement chime
- **Meta-progression** — 8 achievements (`achievements.ts`) evaluated idempotently after each mission, surfaced on the results screen; **SURVIVOR RECORD stats screen** (main menu → STATS) with lifetime stats + achievement grid
- **Save schema v2** — `achievements: string[]` with migration from v1
- **Dev spawn tools** — `__bp.spawn(type, count)` / `__bp.spawnBoss()`, plus cheat-panel buttons SPAWN BOSS / SPAWN MIXED WAVE
- **Tests** — 76 → **85**: zombie roster invariants, balance curve, achievements, save v2 migration/roundtrip
- `docs/phase-4.md`

### Fixed
- **All zombie tints rendered green** — the glyph atlas baked green glyphs, so every `tint` multiplied against green. The atlas now bakes white and tints are exact
- **Difficulty regressions** — mission 8 was gentler than mission 5 (spawn interval 900→650 ms, active cap 85→100); mission 11 required more HP than mission 13 (per-wave spawns 30→20)
- **Achievements unlocked invisibly** — they fired while the HUD was hidden on results screens; now listed on the mission complete/failed panels

### Exit Gate Status
- ✅ TypeScript clean; `npm run build` succeeds; **85/85 tests pass**
- ✅ 0 console errors (only the pre-existing `favicon.ico` 404)
- ✅ New types render distinctly; boss bar + summons work; mission 15 boss objective live
- ✅ Achievement unlock → results screen → save persistence verified
- ✅ Damage vignette verified live (HP 92 → opacity 0.55)
