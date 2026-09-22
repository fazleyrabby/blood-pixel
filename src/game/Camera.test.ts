/**
 * Camera tilt + shake — Phase 3 tests.
 */

import { describe, it, expect } from 'vitest';
import { Camera } from './Camera';

describe('Camera tilt', () => {
  it('round-trips world↔screen with a tilted view', () => {
    const cam = new Camera();
    cam.setScreenSize(1280, 800);
    cam.setYScale(0.86);
    cam.x = 500;
    cam.y = 400;
    const s = cam.worldToScreen(600, 500);
    const w = cam.screenToWorld(s.x, s.y);
    expect(w.x).toBeCloseTo(600, 5);
    expect(w.y).toBeCloseTo(500, 5);
  });

  it('compresses vertical distance by the tilt factor', () => {
    const cam = new Camera();
    cam.setScreenSize(1280, 800);
    cam.setYScale(0.5);
    cam.x = 0;
    cam.y = 0;
    const a = cam.worldToScreen(0, 0);
    const b = cam.worldToScreen(0, 100);
    expect(b.y - a.y).toBeCloseTo(50, 5);
    expect(b.x - a.x).toBeCloseTo(0, 5);
  });

  it('clamps vertical bounds using the tilt (more world fits on screen)', () => {
    const cam = new Camera();
    cam.setScreenSize(1000, 1000);
    cam.setYScale(0.5);
    cam.setBounds({ x: 0, y: 0, width: 2000, height: 2000 });
    cam.follow(0, 0);
    cam.update(1);
    // halfH = 1000 / (2 * 0.5) = 1000
    expect(cam.y).toBeCloseTo(1000, 3);
  });

  it('clamps tilt into a sane range', () => {
    const cam = new Camera();
    cam.setYScale(0.001);
    expect(cam.tilt).toBeGreaterThanOrEqual(0.2);
    cam.setYScale(99);
    expect(cam.tilt).toBeLessThanOrEqual(1.5);
  });
});

describe('Camera shake', () => {
  it('produces an offset that decays back to zero', () => {
    const cam = new Camera();
    cam.setScreenSize(800, 600);
    cam.setYScale(1);
    cam.x = 0;
    cam.y = 0;
    cam.addShake(10, 0.2);
    cam.update(1 / 60);
    expect(Math.abs(cam.offsetX) + Math.abs(cam.offsetY)).toBeGreaterThan(0);

    const s = cam.worldToScreen(0, 0);
    expect(s.x).toBeCloseTo(400 + cam.offsetX, 5);
    expect(s.y).toBeCloseTo(300 + cam.offsetY, 5);

    for (let i = 0; i < 30; i++) cam.update(1 / 60);
    expect(cam.offsetX).toBe(0);
    expect(cam.offsetY).toBe(0);
  });

  it('does not shake when disabled', () => {
    const cam = new Camera();
    cam.setScreenSize(800, 600);
    cam.setShakeEnabled(false);
    cam.addShake(20, 0.5);
    cam.update(1 / 60);
    expect(cam.offsetX).toBe(0);
    expect(cam.offsetY).toBe(0);
  });

  it('keeps the strongest request instead of stacking', () => {
    const cam = new Camera();
    cam.setScreenSize(800, 600);
    cam.addShake(4, 0.2);
    cam.addShake(12, 0.2);
    cam.update(1 / 60);
    expect(Math.abs(cam.offsetY)).toBeLessThanOrEqual(12 * 1.4 + 1e-6);
  });
});
