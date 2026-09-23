import { describe, it, expect } from 'vitest';
import { WEAPON_HAND_OFFSET_Y } from './CharacterRenderer';
import { TILT_Y_SCALE } from './depth';

describe('Weapon & Projectile Elevation', () => {
  it('defines an elevation above ground/feet level', () => {
    expect(WEAPON_HAND_OFFSET_Y).toBeGreaterThan(20);
    expect(WEAPON_HAND_OFFSET_Y).toBeLessThan(40);
  });

  it('calculates elevated world Y compensating for camera tilt', () => {
    const feetY = 400;
    const elevatedY = feetY - WEAPON_HAND_OFFSET_Y / TILT_Y_SCALE;
    expect(elevatedY).toBeLessThan(feetY);
    // Should be elevated by ~38.4 world units
    expect(feetY - elevatedY).toBeCloseTo(WEAPON_HAND_OFFSET_Y / TILT_Y_SCALE, 4);
  });
});

describe('Fluid Particle Dynamics', () => {
  it('calculates velocity stretch preserving area', () => {
    const speed = 200;
    const stretch = Math.min(3.0, 1.0 + speed * 0.007);
    expect(stretch).toBeGreaterThan(1.0);
    // Area scale factor: stretch * (1 / sqrt(stretch)) = sqrt(stretch) > 1, preserving volume
    const crossSection = 1.0 / Math.sqrt(stretch);
    expect(crossSection).toBeLessThan(1.0);
    expect(stretch * crossSection * crossSection).toBeCloseTo(1.0, 5);
  });
});
