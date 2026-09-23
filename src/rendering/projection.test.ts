import { describe, expect, it } from 'vitest';
import { projectGround, projectHeight, unprojectGround, type ProjectionView } from './projection';

const view: ProjectionView = { cameraX: 1100, cameraY: 800, screenW: 1280, screenH: 800, tilt: 0.78, focalLength: 2800, shakeX: 3, shakeY: -2 };

describe('perspective ground projection', () => {
  it('round trips aim coordinates across the arena', () => {
    for (const x of [0, 500, 1100, 1800, 2200]) for (const y of [0, 300, 800, 1300, 1600]) {
      const screen = projectGround(x, y, view);
      const back = unprojectGround(screen.x, screen.y, view);
      expect(back.x).toBeCloseTo(x, 8);
      expect(back.y).toBeCloseTo(y, 8);
    }
  });
  it('makes near points larger and lifts actor height from the ground', () => {
    expect(projectGround(1100, 1200, view).scale).toBeGreaterThan(projectGround(1100, 400, view).scale);
    const ground = projectGround(1100, 800, view);
    const head = projectHeight(1100, 800, 48, view);
    expect(head.y).toBeCloseTo(ground.y - 48);
  });
  it('keeps aiming exact with the closer 2.5D camera', () => {
    const closer = { ...view, focalLength: 1800, zoom: 1.2 };
    for (const x of [100, 1100, 2100]) for (const y of [100, 800, 1500]) {
      const screen = projectGround(x, y, closer);
      const back = unprojectGround(screen.x, screen.y, closer);
      expect(back.x).toBeCloseTo(x, 8);
      expect(back.y).toBeCloseTo(y, 8);
    }
  });
});
