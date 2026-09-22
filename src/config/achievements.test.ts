/**
 * Achievement evaluation — Phase 4 meta-progression tests.
 */

import { describe, it, expect } from 'vitest';
import { ACHIEVEMENTS, evaluateAchievements, achievementById } from './achievements';
import type { SaveData } from '../persistence/SaveData';
import { defaultSettings } from '../game/GameState';

function makeSave(overrides: Partial<SaveData> = {}): SaveData {
  return {
    version: 2,
    xp: 0,
    level: 1,
    claimedMilestones: [],
    completedMissions: [],
    highestUnlocked: 1,
    unlockedWeapons: ['pistol'],
    upgradeRanks: { maxHp: 0, speed: 0, damage: 0, reloadSpeed: 0, fireRate: 0, maxAmmo: 0 },
    pendingUpgradeMissionId: null,
    milestoneMaxHp: 0,
    milestoneAmmoPct: 0,
    achievements: [],
    settings: defaultSettings(),
    stats: { totalKills: 0, totalMissionAttempts: 0, totalShotsFired: 0, totalShotsHit: 0 },
    ...overrides,
  };
}

describe('achievements', () => {
  it('has unique ids and non-empty copy', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const a of ACHIEVEMENTS) {
      expect(a.name.length).toBeGreaterThan(0);
      expect(a.desc.length).toBeGreaterThan(0);
    }
  });

  it('unlocks nothing on a fresh save', () => {
    expect(evaluateAchievements(makeSave())).toEqual([]);
  });

  it('unlocks FIRST BLOOD after completing mission 1', () => {
    const fresh = evaluateAchievements(makeSave({ completedMissions: [1] }));
    expect(fresh).toContain('first_blood');
  });

  it('does not re-report already-recorded achievements', () => {
    const save = makeSave({ completedMissions: [1], achievements: ['first_blood'] });
    expect(evaluateAchievements(save)).not.toContain('first_blood');
  });

  it('reports multiple simultaneous unlocks', () => {
    const save = makeSave({
      completedMissions: [1, 3, 4],
      level: 10,
      unlockedWeapons: ['pistol', 'shotgun', 'smg', 'rifle'],
      stats: { totalKills: 150, totalMissionAttempts: 3, totalShotsFired: 300, totalShotsHit: 200 },
    });
    const fresh = evaluateAchievements(save);
    expect(fresh).toEqual(
      expect.arrayContaining([
        'first_blood',
        'centurion',
        'survivor',
        'arsenal',
        'peak_performance',
        'sharpshooter',
      ]),
    );
    expect(fresh).not.toContain('exterminator');
    expect(fresh).not.toContain('dead_world_cleared');
  });

  it('requires 200+ shots before awarding sharpshooter', () => {
    const save = makeSave({
      stats: { totalKills: 0, totalMissionAttempts: 1, totalShotsFired: 50, totalShotsHit: 50 },
    });
    expect(evaluateAchievements(save)).not.toContain('sharpshooter');
  });

  it('awards DEAD WORLD CLEARED only for all 15 missions', () => {
    const fourteen = makeSave({ completedMissions: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] });
    expect(evaluateAchievements(fourteen)).not.toContain('dead_world_cleared');
    const fifteen = makeSave({
      completedMissions: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    });
    expect(evaluateAchievements(fifteen)).toContain('dead_world_cleared');
  });

  it('achievementById resolves known ids', () => {
    expect(achievementById('first_blood')?.name).toBe('FIRST BLOOD');
    expect(achievementById('nope')).toBeUndefined();
  });
});
