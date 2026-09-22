/**
 * achievements.ts — Meta-progression achievements.
 *
 * Each achievement is a pure predicate over the persisted save, so unlocking
 * is deterministic and idempotent: evaluate after every mission ends and
 * append anything newly satisfied.
 *
 * Phase 4 — Meta-Progression
 */

import type { SaveData } from '../persistence/SaveData';

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  check(save: SaveData): boolean;
}

const SURVIVE_MISSIONS = [3, 5, 8, 12];

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_blood',
    name: 'FIRST BLOOD',
    desc: 'Complete Mission 01',
    check: (s) => s.completedMissions.includes(1),
  },
  {
    id: 'centurion',
    name: 'CENTURION',
    desc: 'Reach 100 total kills',
    check: (s) => s.stats.totalKills >= 100,
  },
  {
    id: 'exterminator',
    name: 'EXTERMINATOR',
    desc: 'Reach 1,000 total kills',
    check: (s) => s.stats.totalKills >= 1000,
  },
  {
    id: 'survivor',
    name: 'SURVIVOR',
    desc: 'Complete a survive mission',
    check: (s) => SURVIVE_MISSIONS.some((id) => s.completedMissions.includes(id)),
  },
  {
    id: 'arsenal',
    name: 'ARSENAL',
    desc: 'Unlock all four weapons',
    check: (s) => s.unlockedWeapons.length >= 4,
  },
  {
    id: 'peak_performance',
    name: 'PEAK PERFORMANCE',
    desc: 'Reach level 10',
    check: (s) => s.level >= 10,
  },
  {
    id: 'sharpshooter',
    name: 'SHARPSHOOTER',
    desc: '60%+ accuracy over 200+ shots',
    check: (s) =>
      s.stats.totalShotsFired >= 200 &&
      s.stats.totalShotsHit / Math.max(1, s.stats.totalShotsFired) >= 0.6,
  },
  {
    id: 'dead_world_cleared',
    name: 'DEAD WORLD CLEARED',
    desc: 'Complete all 15 missions',
    check: (s) => s.completedMissions.length >= 15,
  },
];

/** Achievement ids satisfied by the save but not yet recorded. */
export function evaluateAchievements(save: SaveData): string[] {
  const have = new Set(save.achievements);
  const fresh: string[] = [];
  for (const a of ACHIEVEMENTS) {
    if (!have.has(a.id) && a.check(save)) fresh.push(a.id);
  }
  return fresh;
}

export function achievementById(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
