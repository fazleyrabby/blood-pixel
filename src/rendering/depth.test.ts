/**
 * Pseudo-3D depth helpers — Phase 3 tests.
 */

import { describe, it, expect } from 'vitest';
import {
  depthScale,
  depthSortKey,
  projectScreenY,
  unprojectWorldY,
  DEPTH_SCALE_MIN,
  DEPTH_SCALE_MAX,
  TILT_Y_SCALE,
} from './depth';

describe('depth projection', () => {
  it('round-trips screen↔world through the tilt', () => {
    const screenY = projectScreenY(640, 300, 800, TILT_Y_SCALE);
    expect(unprojectWorldY(screenY, 300, 800, TILT_Y_SCALE)).toBeCloseTo(640, 6);
  });

  it('compresses the vertical axis by the tilt factor', () => {
    const a = projectScreenY(0, 0, 800, 0.5);
    const b = projectScreenY(100, 0, 800, 0.5);
    expect(b - a).toBeCloseTo(50, 6);
  });

  it('guards a degenerate tilt', () => {
    // unproject should not divide by zero
    expect(Number.isFinite(unprojectWorldY(100, 0, 800, 0))).toBe(true);
  });
});

describe('depthScale', () => {
  it('is smallest at the far edge and largest at the near edge', () => {
    expect(depthScale(0, 1000)).toBeCloseTo(DEPTH_SCALE_MIN, 6);
    expect(depthScale(1000, 1000)).toBeCloseTo(DEPTH_SCALE_MAX, 6);
    expect(depthScale(500, 1000)).toBeCloseTo(1, 6);
  });

  it('increases monotonically with depth', () => {
    let prev = -Infinity;
    for (let y = 0; y <= 1000; y += 50) {
      const s = depthScale(y, 1000);
      expect(s).toBeGreaterThanOrEqual(prev);
      prev = s;
    }
  });

  it('clamps outside the arena', () => {
    expect(depthScale(-500, 1000)).toBeCloseTo(DEPTH_SCALE_MIN, 6);
    expect(depthScale(5000, 1000)).toBeCloseTo(DEPTH_SCALE_MAX, 6);
  });

  it('guards a zero-height arena', () => {
    expect(depthScale(10, 0)).toBe(1);
  });
});

describe('depthSortKey', () => {
  it('sorts by world Y (lower on the field draws in front)', () => {
    expect(depthSortKey(120)).toBe(120);
    expect(depthSortKey(400)).toBeGreaterThan(depthSortKey(200));
  });
});
