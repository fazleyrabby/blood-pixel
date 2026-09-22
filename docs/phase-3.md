# Phase 3 — Game Feel, Combat Depth & Depth Tilt

**Date**: 2026-09-22
**Goal**: Make the Phase 2 slice *feel* like a game — a tilted pseudo-3D
presentation, screen shake, hit-stop, blood/acid particles, procedural audio,
per-type zombie special moves, and a real debug/cheat toolset.

---

## 1. Pseudo-3D depth tilt ("2.5D")

The world is still simulated as flat top-down 2D. Rendering applies an
**orthographic rotation around the X axis** (vertical compression) plus
depth-sorted drawing, so the field reads as a tilted plane receding away from
the camera — 2D sprites, angled point of view.

| Piece | Where | Notes |
|---|---|---|
| Tilt factor | `rendering/depth.ts` `TILT_Y_SCALE = 0.78` | 1 = flat top-down |
| Projection | `game/Camera.ts` `setYScale` / `worldToScreen` / `screenToWorld` / `applyToContainer` | Tilt + shake are baked into the coordinate conversion, so **aiming stays pixel-accurate** while tilted |
| Vertical clamp | `Camera._clampToBounds` | `halfH = screenH / (2 * yScale)` — more world fits on screen when tilted |
| Y-sorting | `CharacterRenderer` (`container.sortableChildren`, `zIndex = depthSortKey(y)`) | Painter's algorithm: lower on the field draws in front |
| Ground shadows | `CharacterRenderer._placeShadow` | Ellipse at each entity's feet, squashed by the tilt |
| Depth scale | `depthScale(worldY, worldH)` | ±8% size falloff, near = larger |
| Sprite compensation | `CharacterRenderer.setTilt` | Sprite `scale.y = base / tilt` so glyphs stay unsquashed while the plane compresses |
| Depth fog | `ArenaRenderer.buildArena` | 18 black bands fading from the far edge — the strongest "receding plane" cue |
| Object height | `ArenaRenderer._drawBlock` / `_drawTree` | Lit top face + dark front wall (buildings 28, containers 30, pillars 36, rocks 16 units) |

**Setting**: `depthTilt` (default ON). Reduced Motion forces tilt off (flat).
The tilt value is exposed in the dev overlay and `__bp.snapshot().tilt`.

> First attempt used a 0.86 tilt only — invisible against the near-black
> ground. The effect only reads once the fog gradient and object height were
> added; tilt was then pushed to 0.78.

## 2. Game feel

- **Screen shake** (`Camera.addShake`): strongest-request-wins (no stacking).
  Fired on shot (shotgun 3.2 / pistol 1.6 / smg 1.0), hurt 9, kill 1.4, death 14.
  Gated by `screenShake` **and** `!reducedMotion`.
- **Hit-stop**: 60 ms freeze on player hurt, 30 ms on kill. Implemented in
  `Game.fixedUpdate` (skips `runSim` but still consumes input + renders).
  Disabled under Reduced Motion.
- **Particles** (`rendering/EffectsRenderer.ts`): pooled pixel-chunk bursts,
  420 active cap. Blood on hit (4), kill (13), hurt (9); acid on splash (7).
- **Muzzle flash**: three-ray star + core glow, two-tone.

## 3. Procedural audio (`audio/AudioSystem.ts`)

No assets — everything is synthesized from oscillators + a noise buffer.

- 19 cues: 3 weapon shots, dry fire, hit, kill, hurt, acid, pickup,
  reload start/end, UI tick, level-up arpeggio, countdown beep, "go",
  mission complete jingle, mission failed motif, death, mute toggle.
- `AudioContext` is created lazily on the first pointer/key gesture (autoplay policy).
- Wired to `soundEnabled` + `masterVolume`; `M` toggles a runtime mute.
- Menu buttons tick automatically via a delegated click listener.

## 4. Combat depth

| Zombie | Behavior |
|---|---|
| Runner | **Lunge**: 3× speed burst for 0.4 s when 70–210 units away, 3 s cooldown |
| Brute | **Charge**: 0.5 s telegraphed windup (flashing yellow) → 0.65 s dash at 6.5× → 0.8 s exhausted recovery; 4.5 s cooldown, triggers at 130–320 units |
| Spitter | Holds range band, spits acid, then **recoil-hops backwards** 0.35 s; acid spawns a splash burst on impact (wall **or** player) |

Weapons gained a **recoil kick** applied as a knockback impulse along the aim
axis (decays via the existing knockback model): shotgun 140, pistol 45, smg 20.
Empty-mag dry fire plays a click and locks fire for 0.25 s.

## 5. Debug & cheat system

- **Backtick** — dev overlay: fps, phase, position, HP, enemies, projectiles,
  pickups, weapon, level/XP, tilt, god + mute state.
- **F2** — cheat panel: God Mode, Heal, Full Ammo, +500 XP, Max Upgrades,
  Unlock Weapons, Unlock Missions, Kill All, Skip Mission, Kill Player.
- `window.__bp` — `phase()`, `snapshot()` (now with `fps`, `god`, `tilt`,
  `muted`), `god(on?)`, `heal()`, `fullAmmo()`, `giveXp(n)`, `maxUpgrades()`,
  `unlockWeapons()`, `unlockAllMissions()`, `killAll()`, `killPlayer()`,
  `skipMission()`, `overlay()`, `cheats()`, `mute()`.
- God mode lives in `GameState.godMode` (runtime-only, never persisted) and is
  checked at the top of `damagePlayer`.
- HTML UI clicks are ignored by the input system, so using the cheat panel no
  longer fires the weapon.

## 6. Settings wired to real systems

| Setting | Effect |
|---|---|
| Sound | Enables/disables all SFX |
| Volume (new slider) | Master gain, persisted |
| Depth Tilt (new toggle) | Camera tilt 0.78 ⇄ 1.0 |
| Screen Shake | Gates `Camera.addShake` |
| Reduced Motion | Camera snap, no shake, no hit-stop, no tilt |
| Dithering / High Contrast / CRT / Damage Numbers | (Phase 2 behavior, unchanged) |

---

## Verification

- ✅ `npx tsc --noEmit` clean
- ✅ `npm run build` succeeds
- ✅ **56/56 vitest tests pass** (36 Phase 2 + 20 new: Camera tilt/shake,
  depth projection/scale/sort, AI special-move gating, weapon recoil config)
- ✅ 0 console errors in Playwright (only the pre-existing `favicon.ico` 404)
- ✅ Tilt verified live at `0.78` via `__bp.snapshot().tilt`
- ✅ Dev overlay + all 10 cheat buttons verified with real mouse
- ✅ God mode blocks damage; Kill All → 15 kills → level-up; Skip Mission →
  MISSION_COMPLETE + XP/unlock persistence
- ✅ Settings: volume slider drag persists (25 → 75), Depth Tilt toggles + persists
- ✅ Real-mouse firing still registers (ammo 12 → 6); blood + damage numbers render
- ✅ Mission 9 (25 runners/spitters) runs at 60 fps with god mode, no errors

### Screenshots

- `phase3-tilt.png` — tilted view, first pass (0.86, too subtle)
- `phase3-depth2.png` — final tilt: depth fog, lit building tops, player shadow
- `phase3-dev.png` — dev overlay + cheat panel + 12 Y-sorted zombies
- `phase3-blood.png` — blood bursts + damage numbers on Kill All
- `phase3-spitters.png` — mission 9 (runners + spitters), 25 enemies
- `phase3-complete.png` — mission complete after Skip Mission

## Known limitations (deferred)

- `fullscreen` setting still has no UI control
- Depth tilt is orthographic (no perspective convergence); grid spacing is uniform
- `claimedMilestones` save field remains cosmetic
- Audio is synthesized — no music track yet
