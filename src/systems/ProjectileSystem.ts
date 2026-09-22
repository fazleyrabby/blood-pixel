/**
 * ProjectileSystem.ts
 * Moves projectiles, expires them by range, removes them from the world.
 * Hit detection lives in CollisionSystem (runs after this).
 *
 * Phase 2 — Vertical Slice
 */

import type { World } from '../game/World';

export function updateProjectiles(world: World, dt: number): void {
  const { projectiles, arena, events } = world;

  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    if (!p.active || !p.alive) {
      events.onProjectileRemoved(p.id);
      projectiles.splice(i, 1);
      continue;
    }

    const stepX = p.vx * dt;
    const stepY = p.vy * dt;
    p.x += stepX;
    p.y += stepY;
    p.traveledUnits += Math.hypot(stepX, stepY);

    // Out of range or out of bounds → expire
    const outOfBounds =
      p.x < -40 || p.y < -40 || p.x > arena.worldWidth + 40 || p.y > arena.worldHeight + 40;
    if (p.traveledUnits >= p.range || outOfBounds) {
      p.alive = false;
      p.active = false;
      events.onProjectileRemoved(p.id);
      projectiles.splice(i, 1);
    }
  }
}
