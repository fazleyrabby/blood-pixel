# Renderer experiments — September 2026

The live `main` branch remains the ASCII game. `backup/ascii-phase-5` preserves the Phase 5 build and renderer boundary. The experiments are separate branches.

| | Pixi perspective sprite (`spike/2.5d-sprite`) | Voxel world (`spike/voxel-3d`) |
|---|---|---|
| Look | Familiar sharp glyph sprites on a perspective grid, with feet anchored to the ground | Warm, dusty ruined land with broken structures, leafless trees, debris, and individual voxel survivor/zombie models |
| Work involved | Small projection and sprite changes, with the existing Pixi pipeline | Three.js scene, meshes, camera mapping, post effect, character geometry, and a wider UI change |
| Rendering cost | Expected to be lower because it reuses Pixi batches; a 200-enemy raw frame sample has not been recorded | 319 enemies in a survive mission: 16.7 ms median, 17.3 ms p95, 17.8 ms worst over the in-game 180-frame raw delta window (Chrome, 1425×790, local dev build); 60 fps |
| Risk | Low technical risk, but retains the older arcade feel | More code and a larger JS bundle (~924 kB main chunk, ~245 kB gzip); close enemies can fill the first-person camera during extreme stress loads |

## Recommendation

Continue with the voxel branch. It matches the chosen ruined-world direction, and the latest browser stress sample stayed under the 20 ms target. Keep `main` as the untouched ASCII backup until the voxel build is approved for a later integration. The voxel branch is playable; it is not a finished art-production pass.

## What is in the voxel branch

- `V` switches between overhead and first person. The key is latched and debounced. First person has a held weapon and centered reticle.
- Cohesive voxel survivor and all eight zombie types are generated once as visible-face geometry and drawn as instanced meshes.
- The natural environment uses ground patches, rubble, dead trees, broken building shells, and abandoned vehicles. The cyber grid and scanline movement are gone. Overlapping ground pieces have distinct depth to stop flicker.
- Menus, operations, briefing, results, options, and HUD use an ash/rust visual language. The start action was tested with a real mouse click after a fresh navigation.
- The legacy simulation, save data, missions, and tests remain intact.

## Evidence

- [Pixi perspective gameplay](2.5d-sprite.png) and [Pixi stress scene](2.5d-sprite-stress.png)
- [Voxel main menu](voxel-menu.png), [operations](voxel-operations.png), [options](voxel-options.png)
- [Voxel overhead](voxel-overhead.png), [first person](voxel-first-person.png), [319-enemy stress](voxel-3d-stress.png)

Browser check: no console errors during the final voxel run. `npx tsc --noEmit`, `npm test` (100 tests), `npm run build`, and `npm run package` passed. The package build reports a large-chunk warning; it does not fail.
