/**
 * Mission config validation — Phase 2 exit-gate tests.
 */

import { describe, it, expect } from 'vitest';
import { MISSIONS, getMission } from './missions';
import { ARENAS } from './arenas';
import { ZOMBIES } from './zombies';

describe('missions config', () => {
  it('has exactly 15 missions with sequential ids', () => {
    expect(MISSIONS).toHaveLength(15);
    MISSIONS.forEach((m, i) => expect(m.id).toBe(i + 1));
  });

  it('chains unlocks: mission n unlocks n+1 (except final)', () => {
    for (const m of MISSIONS.slice(0, -1)) {
      expect(m.unlocksMissionId).toBe(m.id + 1);
    }
    expect(MISSIONS[14].unlocksMissionId).toBeUndefined();
  });

  it('unlocks shotgun (4), smg (7) and rifle (12) only', () => {
    const weaponUnlocks = MISSIONS.filter((m) => m.unlocksWeapon).map((m) => ({
      id: m.id,
      weapon: m.unlocksWeapon,
    }));
    expect(weaponUnlocks).toEqual([
      { id: 4, weapon: 'shotgun' },
      { id: 7, weapon: 'smg' },
      { id: 12, weapon: 'rifle' },
    ]);
  });

  it('every mission references a known arena and valid threat rating', () => {
    for (const m of MISSIONS) {
      expect(ARENAS[m.mapId]).toBeDefined();
      expect(m.threatRating).toBeGreaterThanOrEqual(1);
      expect(m.threatRating).toBeLessThanOrEqual(5);
      expect(m.rewardXP).toBeGreaterThanOrEqual(0);
      expect(m.waves.length).toBeGreaterThan(0);
    }
  });

  it('kill objectives are achievable: total spawns >= target', () => {
    for (const m of MISSIONS) {
      if (m.objective.type !== 'kill') continue;
      const total = m.waves.reduce((sum, w) => sum + (w.totalSpawns ?? 0), 0);
      expect(total).toBeGreaterThanOrEqual(m.objective.target);
    }
  });

  it('waves only reference known zombie types with positive weights', () => {
    for (const m of MISSIONS) {
      for (const w of m.waves) {
        expect(w.spawnZones.length).toBeGreaterThan(0);
        expect(w.spawnIntervalMs).toBeGreaterThan(0);
        expect(w.maxActive).toBeGreaterThan(0);
        for (const def of w.zombieTypes) {
          expect(ZOMBIES[def.type]).toBeDefined();
          expect(def.weight).toBeGreaterThan(0);
        }
      }
    }
  });

  it('survive objectives have positive durations and wave coverage', () => {
    for (const m of MISSIONS) {
      const obj = m.objective;
      if (obj.type === 'survive') {
        expect(obj.durationSeconds).toBeGreaterThan(0);
        const covered = m.waves.reduce((s, w) => s + (w.durationSeconds ?? 0), 0);
        expect(covered).toBeGreaterThanOrEqual(obj.durationSeconds);
      }
      if (obj.type === 'survive_then_eliminate') {
        expect(obj.durationSeconds).toBeGreaterThan(0);
        expect(obj.finalWave.totalSpawns).toBeGreaterThan(0);
      }
    }
  });

  it('getMission returns by id and undefined for unknown', () => {
    expect(getMission(1)?.title).toBe('FIRST BLOOD');
    expect(getMission(15)?.title).toBe('THE ABOMINATION');
    expect(getMission(99)).toBeUndefined();
  });

  it('the boss mission spawns exactly one boss and has a generous active cap', () => {
    const bossMissions = MISSIONS.filter((m) => m.objective.type === 'boss');
    expect(bossMissions.length).toBeGreaterThan(0);
    for (const m of bossMissions) {
      const bossWaves = m.waves.filter((w) =>
        w.zombieTypes.some((t) => ZOMBIES[t.type].boss),
      );
      expect(bossWaves.length).toBe(1);
      const totalBosses = bossWaves.reduce((sum, w) => sum + (w.totalSpawns ?? 0), 0);
      expect(totalBosses).toBe(1);
      // The boss wave's cap must not be blocked by leftover horde enemies
      expect(bossWaves[0].maxActive).toBeGreaterThanOrEqual(200);
    }
  });

  it('new enemy types appear in the campaign', () => {
    const seen = new Set<string>();
    for (const m of MISSIONS) {
      for (const w of m.waves) for (const t of w.zombieTypes) seen.add(t.type);
    }
    for (const type of ['crawler', 'armored', 'exploder', 'abomination']) {
      expect(seen.has(type)).toBe(true);
    }
  });
});
