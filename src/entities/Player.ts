/**
 * Player.ts — Player simulation entity
 *
 * Phase 2 — Vertical Slice
 */

import type { Entity } from './Entity';
import type { WeaponId } from '../game/GameState';

export interface PlayerEntity extends Entity {
  hp: number;
  maxHp: number;
  speed: number;
  vx: number;
  vy: number;
  angle: number;           // facing direction in radians
  invulnerableTimer: number;     // contact invuln
  spitterInvulnTimer: number;    // spitter projectile invuln
  knockbackVx: number;
  knockbackVy: number;

  activeWeapon: WeaponId;
  magazines: Record<WeaponId, number>;
  reserves: Record<WeaponId, number>;
  reloading: boolean;
  reloadTimer: number;
  fireCooldown: number;
  fireHeld: boolean;

  // Upgrade rank values applied to this session
  damageMultiplier: number;

  // Light radius for rendering
  lightRadius: number;
}

export function createPlayer(x: number, y: number): PlayerEntity {
  return {
    id: 0, // player always id 0
    active: true,
    x, y,
    hp: 100,
    maxHp: 100,
    speed: 150,
    vx: 0, vy: 0,
    angle: 0,
    invulnerableTimer: 0,
    spitterInvulnTimer: 0,
    knockbackVx: 0,
    knockbackVy: 0,

    activeWeapon: 'pistol',
    magazines: { pistol: 12, shotgun: 6, smg: 30, rifle: 10, grenade: 4, rocket: 2 },
    reserves: { pistol: 72, shotgun: 30, smg: 180, rifle: 60, grenade: 20, rocket: 10 },
    reloading: false,
    reloadTimer: 0,
    fireCooldown: 0,
    fireHeld: false,

    damageMultiplier: 1.0,
    lightRadius: 200,
  };
}
