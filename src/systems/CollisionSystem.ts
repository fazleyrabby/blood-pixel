/**
 * CollisionSystem.ts
 * Broad-phase via SpatialHash: zombie separation, projectile hits,
 * pickup collection, obstacle (circle-vs-rect) resolution.
 *
 * Phase 2 — Vertical Slice
 */

import type { World, } from '../game/World';
import { PLAYER_RADIUS, PICKUP_COLLECT_RADIUS } from '../game/World';
import type { ObstacleRect } from '../config/arenas';
import { projectileHitsZombie, damagePlayer, collectPickup } from './CombatSystem';

export function updateCollision(world: World): void {
  const { player, zombies, projectiles, pickups, arena, hash, events } = world;

  // ── Rebuild broad-phase ──
  hash.clear();
  for (const z of zombies) {
    if (z.state !== 'dead') hash.insert(z);
  }

  // ── Zombie ↔ zombie separation ──
  for (const z of zombies) {
    if (z.state !== 'active') continue;
    const near = hash.query(z.x, z.y, z.collisionRadius + 30);
    for (const other of near) {
      if (other.id === z.id || other.state !== 'active') continue;
      const dx = z.x - other.x;
      const dy = z.y - other.y;
      const dist = Math.hypot(dx, dy) || 0.0001;
      const minDist = z.collisionRadius + other.collisionRadius;
      if (dist < minDist) {
        const push = (minDist - dist) * 0.5;
        const nx = dx / dist;
        const ny = dy / dist;
        z.x += nx * push;
        z.y += ny * push;
        other.x -= nx * push;
        other.y -= ny * push;
      }
    }
  }

  // ── Obstacle resolution: player + zombies ──
  resolveObstacles(player, PLAYER_RADIUS, arena.obstacles);
  for (const z of zombies) {
    if (z.state !== 'active') continue;
    resolveObstacles(z, z.collisionRadius, arena.obstacles);
  }

  // ── Projectiles ──
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];

    // Wall collision — bullets stop at buildings
    if (pointInObstacle(p.x, p.y, arena.obstacles)) {
      if (p.owner === 'spitter') events.onAcidSplash(p.x, p.y);
      p.alive = false;
      p.active = false;
      events.onProjectileRemoved(p.id);
      projectiles.splice(i, 1);
      continue;
    }

    if (p.owner === 'player') {
      const near = hash.query(p.x, p.y, p.radius + 30);
      let consumed = false;
      for (const z of near) {
        if (z.state === 'dead') continue;
        if (p.hitIds.includes(z.id)) continue;
        const dist = Math.hypot(p.x - z.x, p.y - z.y);
        if (dist <= p.radius + z.collisionRadius) {
          const hitDist = Math.hypot(p.x - p.originX, p.y - p.originY);
          projectileHitsZombie(world, p, z, hitDist);
          p.hitIds.push(z.id);
          if (p.pierce > 0) {
            p.pierce -= 1;      // rifle rounds punch through
          } else {
            consumed = true;
            break;
          }
        }
      }
      if (consumed) {
        p.alive = false;
        p.active = false;
        events.onProjectileRemoved(p.id);
        projectiles.splice(i, 1);
      }
    } else {
      // Spitter acid → player
      const dist = Math.hypot(p.x - player.x, p.y - player.y);
      if (dist <= p.radius + PLAYER_RADIUS) {
        const len = Math.hypot(p.vx, p.vy) || 1;
        damagePlayer(world, null, p.vx / len, p.vy / len, 'acid', p.damage);
        events.onAcidSplash(p.x, p.y);
        p.alive = false;
        p.active = false;
        events.onProjectileRemoved(p.id);
        projectiles.splice(i, 1);
      }
    }
  }

  // ── Pickups → player ──
  for (let i = pickups.length - 1; i >= 0; i--) {
    const pk = pickups[i];
    if (!pk.active || pk.collected) {
      events.onPickupRemoved(pk.id);
      pickups.splice(i, 1);
      continue;
    }
    const dist = Math.hypot(pk.x - player.x, pk.y - player.y);
    if (dist <= PICKUP_COLLECT_RADIUS) {
      collectPickup(world, pk);
      events.onPickupRemoved(pk.id);
      pickups.splice(i, 1);
    }
  }
}

interface CircleBody {
  x: number;
  y: number;
}

/** Push a circle out of any overlapping obstacle rects. */
export function resolveObstacles(
  body: CircleBody,
  radius: number,
  obstacles: ObstacleRect[],
): void {
  for (const rect of obstacles) {
    const closestX = clamp(body.x, rect.x, rect.x + rect.width);
    const closestY = clamp(body.y, rect.y, rect.y + rect.height);
    let dx = body.x - closestX;
    let dy = body.y - closestY;
    let dist = Math.hypot(dx, dy);

    if (dist > radius) continue;

    if (dist === 0) {
      // Center inside the rect — push out along smallest penetration axis
      const left = body.x - rect.x;
      const right = rect.x + rect.width - body.x;
      const top = body.y - rect.y;
      const bottom = rect.y + rect.height - body.y;
      const min = Math.min(left, right, top, bottom);
      if (min === left) body.x = rect.x - radius;
      else if (min === right) body.x = rect.x + rect.width + radius;
      else if (min === top) body.y = rect.y - radius;
      else body.y = rect.y + rect.height + radius;
    } else {
      const overlap = radius - dist;
      dx /= dist;
      dy /= dist;
      body.x += dx * overlap;
      body.y += dy * overlap;
    }
  }
}

export function pointInObstacle(x: number, y: number, obstacles: ObstacleRect[]): boolean {
  for (const rect of obstacles) {
    if (x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height) {
      return true;
    }
  }
  return false;
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}
