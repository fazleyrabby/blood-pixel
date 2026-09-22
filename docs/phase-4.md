# Phase 4 — Content, Balance, Presentation & Meta-Progression

**Date**: 2026-09-22
**Goal**: Widen the campaign (new enemies, a boss, a 4th weapon), make the
difficulty curve mechanically verifiable, add atmosphere, and give the player
long-term goals.

---

## 1. Content expansion

### New zombie types (`src/config/zombies.ts`, `entities/Zombie.ts`, `systems/AISystem.ts`)

| Type | Role | Stats |
|---|---|---|
| `crawler` | Fast swarm unit | 16 HP, 125 speed, 8 radius, 12 XP |
| `armored` | Damage sponge | 220 HP, **45% damage reduction**, 35 XP |
| `exploder` | Kamikaze | 40 HP, detonates on contact **or** death — 95-unit blast, 30 damage (falloff to 35%) |
| `abomination` | **Boss** | 2600 HP, 25% armor, knockback-immune, summons 3 crawlers every 6 s |

New entity fields: `armor`, `isBoss`, `explodeRadius`, `explodeDamage`,
`detonated`, `summonTimer/Interval/Type/Count`.
New `ChargePhase` telegraph tints reuse the brute charge visual language.

### New weapon — RIFLE (`src/config/weapons.ts`)

Unlocked by mission 12. 34 damage, 420 ms interval, 900 range, **pierces up to
2 extra enemies** (projectiles track `pierce` + `hitIds` so each enemy is hit
once per shot). Highest single-shot damage and range; slowest fire rate.

### Boss objective + HUD

- `MissionObjective` gains `{ type: 'boss' }`; `MissionSystem` completes when a
  boss has spawned and none remain alive.
- `GameState` tracks `bossSpawned / bossActive / bossHp / bossMaxHp / bossName`.
- HUD gains a boss name + health bar (hidden unless a boss is alive).
- **Mission 15 is now "THE ABOMINATION"**: four minutes of escalating,
  duration-limited horde waves, then the boss (with a crawler/exploder escort).
  The boss wave uses a high `maxActive` so leftover horde enemies can't block
  its spawn.

### Missions 8–14 reworked to include the new types

Crawlers, armored and exploders are woven through the mid/late campaign with
weights that preserve each mission's identity (e.g. mission 11 "IRON GIANTS"
leans armored).

### Bullet knockback

Projectile hits now push zombies along the bullet direction (34 units/s,
scaled down by armor, zero for bosses) — previously `kbVx/kbVy` existed but was
never applied to zombies.

---

## 2. Balance pass

Measured the campaign with two metrics (`src/config/balance.test.ts`):

- **required HP** — HP the player *must* destroy (kill/eliminate/boss)
- **threat rate** — HP spawned per second (survive missions)

Two real dips were found and fixed:

| Mission | Problem | Fix |
|---|---|---|
| 8 (ACID RAIN) | Threat rate 176 < mission 5's 231 — a mid-campaign lull | `spawnIntervalMs` 900→650, `maxActive` 85→100 (rate ≈ 243) |
| 11 (IRON GIANTS) | 36.1k required HP > mission 13's 25.3k — a regression | Per-wave `totalSpawns` 30→20 (last wave 15) |

The test suite now enforces: authored `threatRating` never decreases, reward XP
escalates, must-clear required HP rises monotonically, survive threat rate
rises monotonically, the finale is the only boss mission and the heaviest, and
weapon identities hold (shotgun = highest burst but range-limited, SMG =
sustained automatic, rifle = range + pierce).

---

## 3. Presentation polish

- **Ambient drone** (`AudioSystem.startAmbient/stopAmbient`) — detuned 55/82.5 Hz
  pair through a lowpass with a slow LFO, faded in/out around gameplay phases.
- **Damage vignette** — red edge flash on hit (260 ms).
- **Low-HP vignette** — pulsing red edge below 25% HP.
- **Level-up banner** + **achievement banner** — transient center-screen text.
- **Low-ammo flash** — ammo readout turns red with a glow at ≤2 rounds.
- **Glyph atlas now bakes white glyphs**, so `tint` fully controls colour.
  Previously the atlas baked green glyphs and every tint multiplied against
  green — which is why all zombies (including the new ones) rendered green.

---

## 4. Meta-progression

### Achievements (`src/config/achievements.ts`)

Eight predicates over the save, evaluated idempotently after every mission:

`FIRST BLOOD`, `CENTURION` (100 kills), `EXTERMINATOR` (1,000 kills),
`SURVIVOR`, `ARSENAL` (all 4 weapons), `PEAK PERFORMANCE` (level 10),
`SHARPSHOOTER` (60%+ over 200+ shots), `DEAD WORLD CLEARED` (all 15 missions).

Unlocks are appended to the save, announced with a chime, and listed on the
results screen (`★ ACHIEVEMENT — NAME`) — the HUD is hidden on those screens,
so the results panel is the correct place to surface them.

### Stats screen (`ScreenManager` — "SURVIVOR RECORD")

Reachable from the main menu (**STATS**). Shows level/XP, missions completed,
total kills, attempts, shots fired/hit, accuracy, weapons unlocked, and the
achievement grid (locked ☆ / unlocked ★) with a counter.

### Save schema v2

`SaveData` gains `achievements: string[]`; `CURRENT_VERSION` 1 → 2 with a
migration that defaults the field for legacy payloads.

---

## Verification

- ✅ `npx tsc --noEmit` clean; `npm run build` succeeds
- ✅ **85/85 vitest tests** (76 → 85: zombies roster, balance curve, achievements,
  save v2 migration/roundtrip)
- ✅ 0 console errors (only the pre-existing `favicon.ico` 404)
- ✅ New types render with distinct colours; boss renders at 1.9× scale with a
  working health bar; summons fire on a 6 s cadence
- ✅ Mission 15 starts as "THE ABOMINATION" / "KILL THE ABOMINATION"
- ✅ Stats screen lists 8 achievements; completing mission 1 unlocks
  `first_blood` on the results screen and persists to the save
- ✅ Damage vignette confirmed live (HP 92 → vignette opacity 0.55)

### Screenshots

- `phase4-types.png` — new types before the atlas fix (all green)
- `phase4-types2.png` — after: crawler lime, armored steel, exploder orange, spitter purple
- `phase4-boss.png` — the Abomination + boss health bar
- `phase4-mission15.png` — mission 15 horde with mixed types
- `phase4-stats.png` — SURVIVOR RECORD stats + achievement grid
- `phase4-complete-ach.png` — mission results with `★ ACHIEVEMENT — FIRST BLOOD`
- `phase4-vignette.png` — damage vignette during a hit

## Known limitations (deferred)

- `fullscreen` setting still has no UI control
- No save slots (single save document)
- Boss has one attack pattern (melee + summons), no phase transitions
