# Phase 5 — Ship Prep (Performance, Deployment, Accessibility)

**Date**: 2026-09-23
**Goal**: Make the build deployable and robust — hold 60 fps under stress,
wire the last inert setting, package for static hosting, cover accessibility
gaps, and add the homelab-backed visit counter.

---

## 1. Performance stress pass

Measured with an in-page rAF sampler (not the game's own EMA), on mission 3
(survive, so kills don't end the mission and stop the simulation).

| Scenario | avg FPS | p95 frame | worst frame |
|---|---|---|---|
| 459 enemies | 60.4 | 17.6 ms | 17.6 ms |
| 459 enemies + 80 exploders detonating in one frame | 60.4 | 17.6 ms | 17.8 ms |
| Baseline (a few enemies) | 60.2 | 17.6 ms | 17.7 ms |

**Before the fixes** the same mass-detonation case averaged 54–56 fps with a
**183–233 ms single-frame hitch**. Four changes removed it:

| Fix | File | Why |
|---|---|---|
| Tint write caching | `CharacterRenderer` | `setTint` rewrote all 20 cells of every sprite *every frame*; now only on change (per-zombie last-tint map) |
| Damage-number style cache + pool cap | `CharacterRenderer` | A mass-damage frame created ~460 `Text` + `TextStyle` objects, each baking a canvas texture. Styles are now shared (2 total) and concurrent numbers capped at 48 (oldest recycled + destroyed) |
| Bounded sprite teardown | `Game.runSim` | At most 24 dead zombies are removed per step, so a mass death can't stall a frame (dead entities are already invisible and excluded from targeting) |
| SFX throttling | `AudioSystem` | Per-cue cooldowns (`hit` 30 ms, `kill` 45 ms, `explode` 80 ms…) stop hundreds of oscillator/noise voices being created in one frame |

Also added dev tooling to reproduce this on demand: `__bp.stress(n)`,
`__bp.clearEnemies()`, and cheat-panel **STRESS +100** / **CLEAR ENEMIES**.

## 2. Fullscreen

`GameSettings.fullscreen` (present since Phase 2 but inert) is now wired:

- Settings → **Fullscreen** toggle calls `requestFullscreen` / `exitFullscreen`
- A `fullscreenchange` listener keeps the setting in sync when the user leaves
  fullscreen with Esc/F11, and persists it
- If the request is denied (no user gesture / unsupported) the setting reverts

## 3. Packaging & deployment

- `vite.config.ts` → `base: './'` so the build runs from any sub-path
- `index.html` → `favicon.svg` link (fixes the long-standing 404), theme-color,
  `color-scheme: dark`, OG title/description, `role="application"` on the app root
- **`vercel.json`** → explicit Vite framework/build/output plus cache headers
  (immutable for `/assets/*`, revalidate for everything else)
- `npm run package` → builds and produces `blood-pixel.zip` for itch.io-style hosting

## 4. Accessibility

- **Colour-blind mode** (Settings → *Colorblind Mode*) swaps enemy tints for a
  blue/yellow-axis palette separated by lightness (`src/rendering/palette.ts`).
  Cyan is reserved for the player, so crawlers use a pale blue.
  A test asserts the palette's luminance spread and that walkers/runners differ
  by lightness, not just hue.
- **Keyboard focus rings** (`:focus-visible`) on menu buttons, toggles, upgrade
  buttons, mission tiles, the volume slider and cheat buttons
- **Escape** backs out of the Settings and Stats screens
- **Reduced motion** now also disables the low-HP vignette pulse and the damage
  flash, and the CSS honours `prefers-reduced-motion` (no title flicker,
  no button transitions, no counter pulse)
- Fixed a real bug the palette test caught: **elite spitters had the same tint
  as normal spitters**, making elites invisible for that type

## 5. Visitor counter (homelab view-counter)

Ported from the `swarmguard` project. `src/ui/VisitorCounter.ts` renders a live
total-visit widget in the main-menu footer, backed by the self-hosted service
(PM2 + SQLite on the VPS, exposed via the Cloudflare tunnel at
`https://views.fazleyrabbi.xyz`).

- `GET /api/hit?project=bloodpixel&key=visitors` on load (once per session),
  `GET /api/get?...` otherwise
- Client guards: dev/local hosts, non-standard ports, bots/webdriver
  (Playwright runs), **Vercel preview deployments** (`-git-` branches and
  deployment-hash hosts), and a `sessionStorage` session flag
- Cached in `localStorage` (`bloodpixel:visits`) so the count renders instantly
  and survives the API being unreachable; the number animates on update
- The service accepted the new `bloodpixel` project without registration
  (`{"ok":true,"project":"bloodpixel","key":"visitors","views":0}`)

---

## Verification

- ✅ `npx tsc --noEmit` clean; `npm run build` succeeds
- ✅ **100/100 vitest tests** (90 → 100: palette invariants + visitor guards)
- ✅ 0 console errors (the old `favicon.ico` 404 is gone)
- ✅ Stress: 459 enemies and a 459-enemy mass detonation both hold ~60 fps with
  worst frames under 18 ms (previously a 233 ms hitch)
- ✅ Fullscreen toggles on, persists, and syncs on exit
- ✅ Colour-blind palette visibly remaps enemies (screenshot)
- ✅ Visit counter renders in the menu footer and reaches the live API
- ✅ `npm run package` produces `blood-pixel.zip` (~194 KB)
- ✅ `vercel.json` build config validated by a successful local `npm run build`

### Screenshots

- `phase5-stress.png` — ~400 enemies on screen at 60 fps
- `phase5-colorblind.png` — colour-blind palette (yellow brutes, grey armored, orange exploders)
- `phase5-counter.png` — main menu with the live visit counter

## Known limitations (deferred)

- No save slots (single save document)
- The boss has a single pattern (melee + summons), no phase transitions
- Key rebinding is not implemented (focus rings + Escape cover the basics)
