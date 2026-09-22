/**
 * Projectile.ts — Projectile simulation entity (bullets, shotgun pellets, spitter acid)
 *
 * Phase 2 — Vertical Slice
 */

import type { Entity } from './Entity';

export type ProjectileOwner = 'player' | 'spitter';

export interface ProjectileEntity extends Entity {
  vx: number;
  vy: number;
  speed: number;
  damage: number;
  range: number;          // max travel distance
  traveledUnits: number;  // how far this projectile has gone
  owner: ProjectileOwner;
  weaponId?: string;      // for shotgun falloff etc.
  originX: number;
  originY: number;
  radius: number;         // collision radius
  // Shotgun falloff
  falloffStart?: number;
  maxRange?: number;
  /** Remaining enemies this projectile can pass through (rifle). */
  pierce: number;
  /** Ids already damaged — prevents multi-hitting the same enemy while piercing. */
  hitIds: number[];
  alive: boolean;
}

export function createProjectile(
  id: number,
  x: number, y: number,
  vx: number, vy: number,
  damage: number,
  range: number,
  speed: number,
  owner: ProjectileOwner,
  opts?: {
    weaponId?: string;
    falloffStart?: number;
    maxRange?: number;
    radius?: number;
    pierce?: number;
  },
): ProjectileEntity {
  return {
    id, active: true, alive: true,
    x, y,
    vx, vy, speed, damage, range,
    traveledUnits: 0,
    owner,
    weaponId: opts?.weaponId,
    originX: x,
    originY: y,
    radius: opts?.radius ?? 4,
    falloffStart: opts?.falloffStart,
    maxRange: opts?.maxRange,
    pierce: opts?.pierce ?? 0,
    hitIds: [],
  };
}
