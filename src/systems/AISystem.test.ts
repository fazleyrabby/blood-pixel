/**
 * Zombie special-move gating — Phase 3 tests.
 */

import { describe, it, expect } from 'vitest';
import {
  canRunnerLunge,
  canBruteCharge,
  meleeReach,
  RUNNER_LUNGE_MIN,
  RUNNER_LUNGE_MAX,
  BRUTE_CHARGE_MIN,
  BRUTE_CHARGE_MAX,
} from './AISystem';

describe('runner lunge gating', () => {
  it('triggers only inside the lunge band and off cooldown', () => {
    expect(canRunnerLunge(RUNNER_LUNGE_MIN, 0)).toBe(true);
    expect(canRunnerLunge(RUNNER_LUNGE_MAX, 0)).toBe(true);
    expect(canRunnerLunge(RUNNER_LUNGE_MIN - 1, 0)).toBe(false);
    expect(canRunnerLunge(RUNNER_LUNGE_MAX + 1, 0)).toBe(false);
    expect(canRunnerLunge(150, 1.2)).toBe(false);
  });
});

describe('brute charge gating', () => {
  it('requires the idle phase, no cooldown, and the charge band', () => {
    expect(canBruteCharge(BRUTE_CHARGE_MIN, 0, 'none')).toBe(true);
    expect(canBruteCharge(BRUTE_CHARGE_MAX, 0, 'none')).toBe(true);
    expect(canBruteCharge(50, 0, 'none')).toBe(false);
    expect(canBruteCharge(400, 0, 'none')).toBe(false);
    expect(canBruteCharge(200, 2, 'none')).toBe(false);
    expect(canBruteCharge(200, 0, 'windup')).toBe(false);
    expect(canBruteCharge(200, 0, 'charge')).toBe(false);
    expect(canBruteCharge(200, 0, 'recover')).toBe(false);
  });
});

describe('meleeReach', () => {
  it('adds the player radius to the attack range', () => {
    expect(meleeReach({ attackRange: 24 })).toBe(36);
  });
});
