import { describe, expect, it } from 'vitest';
import { updateMovement } from './MovementSystem';
import type { World } from '../game/World';
import type { InputSystem } from './InputSystem';

function move(keys: Partial<InputSystem['state']>): { x: number; y: number } {
  const world = {
    player: {
      x: 500, y: 500, vx: 0, vy: 0, speed: 100,
      knockbackVx: 0, knockbackVy: 0, angle: 0,
    },
    zombies: [],
    arena: { worldWidth: 1000, worldHeight: 1000 },
  } as unknown as World;
  const input = { state: { up: false, down: false, left: false, right: false,
    firstPerson: false, isometric: false, ...keys } } as InputSystem;
  updateMovement(world, input, 1);
  return { x: world.player.x - 500, y: world.player.y - 500 };
}

describe('screen-aligned movement', () => {
  it('rotates overhead WASD to match the isometric camera', () => {
    const right = move({ right: true, isometric: true });
    const up = move({ up: true, isometric: true });
    expect(right.x).toBeCloseTo(100 * Math.SQRT1_2);
    expect(right.y).toBeCloseTo(-100 * Math.SQRT1_2);
    expect(up.x).toBeCloseTo(-100 * Math.SQRT1_2);
    expect(up.y).toBeCloseTo(-100 * Math.SQRT1_2);
  });

  it('preserves flat overhead controls', () => {
    expect(move({ right: true })).toEqual({ x: 100, y: 0 });
    expect(move({ up: true })).toEqual({ x: 0, y: -100 });
  });
});
