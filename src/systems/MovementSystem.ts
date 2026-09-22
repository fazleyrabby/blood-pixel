/**
 * MovementSystem.ts
 * Integrates positions for player and zombies, applies knockback decay,
 * keeps everything inside arena bounds.
 *
 * Phase 2 — Vertical Slice
 */

import type { World } from '../game/World';
import { PLAYER_RADIUS } from '../game/World';
import type { InputSystem } from './InputSystem';

const KNOCKBACK_DECAY = 8; // exponential decay rate (1/s)

export function updateMovement(world: World, input: InputSystem, dt: number): void {
  const { player, zombies, arena } = world;
  const s = input.state;

  // ── Player desired velocity from WASD ──
  let dirX = 0;
  let dirY = 0;
  if (s.left) dirX -= 1;
  if (s.right) dirX += 1;
  if (s.up) dirY -= 1;
  if (s.down) dirY += 1;
  if (dirX !== 0 && dirY !== 0) {
    const inv = 1 / Math.SQRT2;
    dirX *= inv;
    dirY *= inv;
  }

  // Knockback decays exponentially
  const kbDecay = Math.exp(-KNOCKBACK_DECAY * dt);
  player.knockbackVx *= kbDecay;
  player.knockbackVy *= kbDecay;
  if (Math.abs(player.knockbackVx) < 1) player.knockbackVx = 0;
  if (Math.abs(player.knockbackVy) < 1) player.knockbackVy = 0;

  player.vx = dirX * player.speed + player.knockbackVx;
  player.vy = dirY * player.speed + player.knockbackVy;
  player.x += player.vx * dt;
  player.y += player.vy * dt;

  // Arena bounds
  player.x = clamp(player.x, PLAYER_RADIUS, arena.worldWidth - PLAYER_RADIUS);
  player.y = clamp(player.y, PLAYER_RADIUS, arena.worldHeight - PLAYER_RADIUS);

  // ── Zombies (AI writes vx/vy including their knockback term) ──
  for (const z of zombies) {
    if (z.state !== 'active') continue;

    // Decay zombie knockback
    z.kbVx *= kbDecay;
    z.kbVy *= kbDecay;
    if (Math.abs(z.kbVx) < 1) z.kbVx = 0;
    if (Math.abs(z.kbVy) < 1) z.kbVy = 0;

    z.x += z.vx * dt;
    z.y += z.vy * dt;

    const r = z.collisionRadius;
    z.x = clamp(z.x, r, arena.worldWidth - r);
    z.y = clamp(z.y, r, arena.worldHeight - r);
  }
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}
