/**
 * Shotgun falloff damage math — Phase 2 tests.
 */

import { describe, it, expect } from 'vitest';
import { falloffDamage } from './CombatSystem';

describe('falloffDamage', () => {
  it('returns full damage at or before falloffStart', () => {
    expect(falloffDamage(100, 0, 80, 240)).toBe(100);
    expect(falloffDamage(100, 80, 80, 240)).toBe(100);
  });

  it('returns 50% damage at or beyond maxRange', () => {
    expect(falloffDamage(100, 240, 80, 240)).toBe(50);
    expect(falloffDamage(100, 9999, 80, 240)).toBe(50);
  });

  it('decreases linearly between falloffStart and maxRange', () => {
    // midpoint: 160 of 80→240 → t = 0.5 → 100 * (1 - 0.25) = 75
    expect(falloffDamage(100, 160, 80, 240)).toBeCloseTo(75, 5);
    // quarter: 120 → t = 0.25 → 100 * 0.875 = 87.5
    expect(falloffDamage(100, 120, 80, 240)).toBeCloseTo(87.5, 5);
  });

  it('is monotonically non-increasing with distance', () => {
    let prev = Infinity;
    for (let d = 0; d <= 400; d += 10) {
      const dmg = falloffDamage(80, d, 50, 200);
      expect(dmg).toBeLessThanOrEqual(prev + 1e-9);
      prev = dmg;
    }
  });

  it('guards degenerate range (maxRange <= falloffStart)', () => {
    // Math.max(1, ...) prevents divide-by-zero; result stays within [50%, 100%]
    const dmg = falloffDamage(100, 90, 100, 50);
    expect(dmg).toBeGreaterThanOrEqual(50);
    expect(dmg).toBeLessThanOrEqual(100);
  });
});
