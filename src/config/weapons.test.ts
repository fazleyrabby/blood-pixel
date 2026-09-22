/**
 * Weapon recoil config — Phase 3 tests.
 */

import { describe, it, expect } from 'vitest';
import { WEAPONS } from './weapons';

describe('weapon recoil', () => {
  it('defines a positive recoil kick for every weapon', () => {
    for (const w of Object.values(WEAPONS)) {
      expect(w.recoilKick).toBeGreaterThan(0);
    }
  });

  it('orders kick by weapon weight (shotgun > pistol > smg)', () => {
    expect(WEAPONS.shotgun.recoilKick).toBeGreaterThan(WEAPONS.pistol.recoilKick);
    expect(WEAPONS.pistol.recoilKick).toBeGreaterThan(WEAPONS.smg.recoilKick);
  });
});
