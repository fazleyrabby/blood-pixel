/**
 * MissionSystem.ts
 * Objective evaluation: kill / survive / eliminate / survive_then_eliminate.
 * Returns 'complete' | 'failed' | null each step.
 *
 * Phase 2 — Vertical Slice
 */

import type { World } from '../game/World';
import { activeZombieCount } from '../game/World';

export type MissionOutcome = 'complete' | 'failed' | null;

export function updateMission(world: World): MissionOutcome {
  const { state, mission, waveRuntime } = world;

  // Player death → fail (also signalled via events; double-guarded here)
  if (world.player.hp <= 0) return 'failed';

  const obj = mission.objective;

  switch (obj.type) {
    case 'kill': {
      state.missionPhase = 'active';
      if (state.killCount >= obj.target) return 'complete';
      return null;
    }

    case 'boss': {
      state.missionPhase = 'active';
      // Complete once the boss has spawned and no boss remains alive.
      if (state.bossSpawned && !state.bossActive) return 'complete';
      return null;
    }

    case 'survive': {
      state.missionPhase = 'active';
      if (state.missionTimer >= obj.durationSeconds) return 'complete';
      return null;
    }

    case 'eliminate': {
      state.missionPhase = 'active';
      const allDone = waveRuntime.done.every(Boolean);
      const fieldClear = activeZombieCount(world.zombies) === 0;
      if (allDone && fieldClear) return 'complete';
      return null;
    }

    case 'survive_then_eliminate': {
      const finalStage = state.missionTimer >= obj.durationSeconds;
      if (!finalStage) {
        state.missionPhase = 'active';
        return null;
      }
      state.missionPhase = 'final_wave';
      if (waveRuntime.finalDone && activeZombieCount(world.zombies) === 0) {
        return 'complete';
      }
      return null;
    }
  }
}
