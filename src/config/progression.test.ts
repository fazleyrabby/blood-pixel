/**
 * XP thresholds, milestone application, upgrade math — Phase 2 tests.
 */

import { describe, it, expect } from 'vitest';
import {
  levelForXp,
  xpToNextLevel,
  missionReplayXp,
  calcUpgradedMaxHp,
  calcUpgradedSpeed,
  calcUpgradedDamage,
  calcUpgradedReloadMs,
  calcUpgradedFireIntervalMs,
  calcUpgradedAmmo,
  applyMilestones,
  pickUpgradeChoices,
  availableUpgrades,
  XP_TABLE,
  MAX_LEVEL,
  MAX_UPGRADE_RANK,
} from './progression';
import type { UpgradeId } from '../game/GameState';

describe('XP thresholds', () => {
  it('maps xp to levels at table boundaries', () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(99)).toBe(1);
    expect(levelForXp(100)).toBe(2);
    expect(levelForXp(249)).toBe(2);
    expect(levelForXp(250)).toBe(3);
    expect(levelForXp(450)).toBe(4);
    expect(levelForXp(700)).toBe(5);
  });

  it('caps at MAX_LEVEL', () => {
    expect(levelForXp(999_999)).toBe(MAX_LEVEL);
    expect(MAX_LEVEL).toBe(10);
  });

  it('xpToNextLevel reports progress within the current band', () => {
    const mid = xpToNextLevel(150); // level 2, band 100→250
    expect(mid.current).toBe(50);
    expect(mid.needed).toBe(150);
    expect(mid.pct).toBeCloseTo(50 / 150, 5);
  });

  it('xpToNextLevel at max level is complete', () => {
    const max = xpToNextLevel(XP_TABLE[MAX_LEVEL - 1] + 9999);
    expect(max.pct).toBe(1);
    expect(max.needed).toBe(0);
  });

  it('replay XP is 25% rounded', () => {
    expect(missionReplayXp(100)).toBe(25);
    expect(missionReplayXp(175)).toBe(44); // 43.75 → 44
    expect(missionReplayXp(0)).toBe(0);
  });
});

describe('applyMilestones', () => {
  it('grants level-2 ammo bonus when crossing into level 2', () => {
    const state = { milestoneMaxHp: 0, milestoneAmmoPct: 0 };
    applyMilestones(state, 1, 2);
    expect(state.milestoneAmmoPct).toBeCloseTo(0.1, 5);
    expect(state.milestoneMaxHp).toBe(0);
  });

  it('applies every crossed level exactly once (1 → 3 skips nothing, claims only 2)', () => {
    const state = { milestoneMaxHp: 0, milestoneAmmoPct: 0 };
    applyMilestones(state, 1, 3); // only level 2 has a milestone here
    expect(state.milestoneAmmoPct).toBeCloseTo(0.1, 5);
    expect(state.milestoneMaxHp).toBe(0);
  });

  it('does not re-apply levels at or below fromLevel', () => {
    const state = { milestoneMaxHp: 0, milestoneAmmoPct: 0.1 };
    applyMilestones(state, 2, 3); // level 2 already claimed by caller
    expect(state.milestoneAmmoPct).toBeCloseTo(0.1, 5);
  });

  it('grants max HP at levels 4 and 8', () => {
    const state = { milestoneMaxHp: 0, milestoneAmmoPct: 0 };
    applyMilestones(state, 3, 4);
    expect(state.milestoneMaxHp).toBe(5);
    applyMilestones(state, 7, 8);
    expect(state.milestoneMaxHp).toBe(10);
  });
});

describe('upgrade math', () => {
  it('max HP: +10% per rank, rounded', () => {
    expect(calcUpgradedMaxHp(100, 0)).toBe(100);
    expect(calcUpgradedMaxHp(100, 1)).toBe(110);
    expect(calcUpgradedMaxHp(100, 5)).toBe(161); // 100 * 1.1^5 = 161.051
  });

  it('speed: +10% per rank, capped at 150%', () => {
    expect(calcUpgradedSpeed(150, 0)).toBe(150);
    expect(calcUpgradedSpeed(150, 1)).toBeCloseTo(165, 5);
    expect(calcUpgradedSpeed(150, 5)).toBeCloseTo(150 * 1.5, 5); // 246.5 > cap 225
    expect(calcUpgradedSpeed(150, 9)).toBeCloseTo(225, 5);
  });

  it('damage scales +10% per rank with no cap', () => {
    expect(calcUpgradedDamage(20, 0)).toBe(20);
    expect(calcUpgradedDamage(20, 5)).toBeCloseTo(20 * Math.pow(1.1, 5), 5);
  });

  it('reload and fire interval shrink with rank', () => {
    expect(calcUpgradedReloadMs(1500, 1)).toBeCloseTo(1500 / 1.1, 5);
    expect(calcUpgradedFireIntervalMs(300, 2)).toBeCloseTo(300 / 1.21, 5);
    expect(calcUpgradedReloadMs(1500, 3)).toBeLessThan(1500);
  });

  it('ammo rounds up', () => {
    expect(calcUpgradedAmmo(12, 1)).toBe(Math.ceil(13.2));
    expect(calcUpgradedAmmo(72, 1)).toBe(Math.ceil(79.2));
  });
});

describe('upgrade choices', () => {
  const fullRanks = (): Record<UpgradeId, number> => ({
    maxHp: 0, speed: 0, damage: 0, reloadSpeed: 0, fireRate: 0, maxAmmo: 0,
  });

  it('returns up to 3 unique upgrades from available pool', () => {
    const choices = pickUpgradeChoices(fullRanks());
    expect(choices.length).toBe(3);
    expect(new Set(choices).size).toBe(3);
  });

  it('excludes maxed upgrades', () => {
    const ranks = fullRanks();
    ranks.fireRate = MAX_UPGRADE_RANK;
    const choices = pickUpgradeChoices(ranks);
    expect(choices).not.toContain('fireRate');
    expect(availableUpgrades(ranks)).toHaveLength(5);
  });

  it('returns empty when all upgrades maxed', () => {
    const ranks: Record<UpgradeId, number> = {
      maxHp: 5, speed: 5, damage: 5, reloadSpeed: 5, fireRate: 5, maxAmmo: 5,
    };
    expect(pickUpgradeChoices(ranks)).toEqual([]);
    expect(availableUpgrades(ranks)).toEqual([]);
  });
});
