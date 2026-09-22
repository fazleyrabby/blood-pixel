# Phase 2 — Vertical Slice (Playable Mission 1)

**Date**: 2026-09-22
**Goal**: A complete, playable loop — menu → brief → fight → results → upgrade → persistence — validated end-to-end with zero console errors.

---

## What was built

| Area | Files | Purpose |
|---|---|---|
| Orchestrator | `src/game/Game.ts` | Boot, phase machine wiring, fixed-step sim order, render, mission lifecycle, persistence, debug hooks |
| World | `src/game/World.ts` | Shared context, game events, tuning constants |
| Systems | `src/systems/*` | Movement, AI, Collision (spatial hash), Combat (damage/XP/pickups), Projectile, Spawn (waves), Mission (objectives), Input, SpatialHash |
| Weapons | `src/weapons/Weapon.ts` | Fire / reload / weapon switch / cycle |
| Entities | `src/entities/*` | Player, Zombie (kb velocity), Projectile, Pickup |
| Config | `src/config/*` | 15 missions, 3 arenas, 3 weapons, 4 zombie types, XP/upgrades/milestones |
| UI | `src/ui/ScreenManager.ts`, `HUD.ts` | All HTML screens (menu, select, brief, results, upgrade, settings, victory) + HUD + crosshair |
| Persistence | `src/persistence/SaveData.ts` | Versioned localStorage save, migration, corruption recovery |
| Rendering | `CharacterRenderer.ts`, `ArenaRenderer.ts` | Entity glyph sprites (zombie scale 0.85), arena tiles/obstacles/spawn zones |

---

## Phase machine

```
BOOT → MAIN_MENU → MISSION_SELECT → MISSION_BRIEF
  → COUNTDOWN (3s) ⇄ PLAYING ⇄ PAUSED
  → MISSION_COMPLETE → UPGRADE_SELECT → MISSION_SELECT
  → MISSION_FAILED (retry → COUNTDOWN)
  → VICTORY (mission 15)
```

`StateMachine` runs `onExit(prev)` → `onEnter(next)`; `Game.state.phase` mirrors it. Pause is driven solely by the `input.pausePressed` edge consumed in `fixedUpdate` (a second keydown listener caused an instant pause→resume toggle and was removed).

## Simulation order (fixed 60 Hz)

`missionTimer → aim → weapon switch/reload/fire edges → AI → movement → projectiles → collision → spawn → zombie/pickup timers + sweep → mission outcome`

Render interpolates nothing yet (alpha unused); camera follows in render at display rate, `camera.setScreenSize(app.screen…)` keeps logical pixels correct under HiDPI.

## Objective types

`kill` (N eliminations), `survive` (timer), `eliminate` (all waves cleared), `survive_then_eliminate` (timer → final horde, mission 15).

---

## Bugs found & fixed during exit-gate verification

1. **Milestone skipped for kill XP** — `grantXp` leveled mid-mission but `completeMission` only scanned levels crossed by the *mission reward*. Centralized `applyMilestones(state, from, to)` called from both (XP is monotonic → each level claimed exactly once).
2. **Pause double-toggle** — synchronous `keydown` listener paused, then the same `pausePressed` flag in `fixedUpdate` immediately resumed. Removed the listener; flag-only path remains.
3. **Settings (and ALL menus) dead to mouse** — `#ui-layer { pointer-events: none }` let every real click fall through to the Pixi canvas; only `.mission-btn.unlocked` had been locally patched. Fixed with `.screen { pointer-events: auto }` + `pointer-events: auto` on the pause overlay. Hidden screens stay `display: none` so gameplay input is unaffected.
4. **Settings saved but did nothing** — wired **Dithering** (CRT noise), **Reduced Motion** (camera snaps, `Camera.setSmoothing(0)`), **High Contrast** (`body.high-contrast` CSS filter). Sound/Screen Shake remain state-only until Phase 7 systems exist.

## Known limitations (deferred)

- `claimedMilestones` save field is not yet populated (effects apply immediately; tracking is cosmetic)
- Accuracy stats count each damage instance as a "hit"; debug `killAll` inflates hits without shots
- No audio, screen shake, or dithered scanline shader behavior beyond noise gate (Phase 7)

---

## Exit gate status

- ✅ TypeScript clean (`npx tsc --noEmit`)
- ✅ Production build succeeds (`npm run build`)
- ✅ **36/36 vitest tests pass** (`npm test`) — mission config validation, XP/milestone/upgrade math, falloff damage, save roundtrip/migration/corruption/reset
- ✅ 0 console errors/warnings in Playwright
- ✅ Mission 1 playable: kill 20 walkers → MISSION_COMPLETE (XP + level-up + milestone applied)
- ✅ Upgrade choice applies rank, commits save
- ✅ Mission 2 unlocked; locked missions show 🔒; reload restores XP/level/ranks/unlocks
- ✅ Death → MISSION_FAILED → RETRY restarts the failed mission
- ✅ Escape pause/resume with overlay; blur auto-pause
- ✅ Real mouse clicks work on every screen (settings toggles persist + apply effects)
- ✅ `window.__bp` debug hooks: `phase()`, `snapshot()`, `killAll()`, `killPlayer()`

### Screenshots

- `phase2-playing.png` — in-game HUD (HP, objective, timer/kills, ammo, XP)
- `phase2-complete.png`, `phase2-upgrade.png`, `phase2-select.png` — results → upgrade → select flow
- `settings-toggled.png` — settings screen with live toggles
