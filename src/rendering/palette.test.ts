/**
 * Enemy tint palettes — Phase 5 accessibility tests.
 */

import { describe, it, expect } from 'vitest';
import { enemyTint, type EnemyPalette } from './palette';
import { ZOMBIES, type ZombieType } from '../config/zombies';

const TYPES = Object.keys(ZOMBIES) as ZombieType[];
const PALETTES: EnemyPalette[] = ['default', 'colorblind'];

describe('enemy palettes', () => {
  it('assigns a distinct tint per type in every palette', () => {
    for (const palette of PALETTES) {
      const tints = TYPES.map((t) => enemyTint(t, false, palette));
      expect(new Set(tints).size).toBe(tints.length);
    }
  });

  it('elite variants are distinguishable from their base tint', () => {
    for (const palette of PALETTES) {
      for (const t of TYPES) {
        expect(enemyTint(t, true, palette)).not.toBe(enemyTint(t, false, palette));
      }
    }
  });

  it('the colorblind palette differs from the default for every type', () => {
    for (const t of TYPES) {
      expect(enemyTint(t, false, 'colorblind')).not.toBe(enemyTint(t, false, 'default'));
    }
  });

  it('colorblind tints lean on lightness rather than the red-green axis', () => {
    // Relative luminance should be spread out enough to separate silhouettes
    const lum = (c: number) => {
      const r = ((c >> 16) & 0xff) / 255;
      const g = ((c >> 8) & 0xff) / 255;
      const b = (c & 0xff) / 255;
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const values = TYPES.map((t) => lum(enemyTint(t, false, 'colorblind')));
    const spread = Math.max(...values) - Math.min(...values);
    expect(spread).toBeGreaterThan(0.25);
    // The two most common enemies must not rely on hue alone
    expect(Math.abs(lum(enemyTint('walker', false, 'colorblind')) - lum(enemyTint('runner', false, 'colorblind')))).toBeGreaterThan(0.15);
  });

  it('falls back safely for unknown types', () => {
    for (const palette of PALETTES) {
      const t = enemyTint('unknown-type', false, palette);
      expect(Number.isInteger(t)).toBe(true);
      expect(t).toBeGreaterThan(0);
    }
  });
});
