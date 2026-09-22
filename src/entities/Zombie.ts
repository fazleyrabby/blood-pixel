/**
 * Zombie.ts — Zombie simulation entity
 *
 * Phase 2 — Vertical Slice
 */

import type { Entity } from './Entity';
import type { ZombieType } from '../config/zombies';

export type ZombieState = 'spawning' | 'active' | 'dead';

/** Brute charge telegraph → dash → exhaustion. */
export type ChargePhase = 'none' | 'windup' | 'charge' | 'recover';

export interface ZombieEntity extends Entity {
  type: ZombieType;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  attackRange: number;
  attackCooldown: number;
  attackTimer: number;
  collisionRadius: number;
  xpReward: number;
  knockbackForce: number;
  vx: number;
  vy: number;
  /** Knockback impulse (decays exponentially; added to AI velocity) */
  kbVx: number;
  kbVy: number;
  angle: number;

  state: ZombieState;
  spawnTimer: number;        // 300ms activation delay
  deathTimer: number;        // death animation countdown
  hitFlashTimer: number;     // brief white flash on hit

  // Multipliers applied from mission/wave config
  healthMult: number;
  speedMult: number;
  damageMult: number;
  elite: boolean;

  // Type traits (Phase 4)
  armor: number;            // fraction of incoming damage ignored
  isBoss: boolean;
  explodeRadius: number;    // exploder detonation radius (0 = none)
  explodeDamage: number;
  detonated: boolean;       // exploder already blew up
  summonTimer: number;      // boss add-summon countdown
  summonInterval: number;
  summonType: ZombieType | null;
  summonCount: number;

  // AI state
  wanderTimer: number;
  lastKnownPlayerX: number;
  lastKnownPlayerY: number;

  // Special movement (runner lunge / brute charge / spitter recoil)
  specialTimer: number;      // >0 while the special move is active
  specialCooldown: number;   // seconds until the special may trigger again
  chargePhase: ChargePhase;
  chargeTimer: number;
  chargeDirX: number;
  chargeDirY: number;

  // For spitter
  preferredRangeMin: number;
  preferredRangeMax: number;
  projectileSpeed: number;
  projectileLife: number;
}

export function createZombie(
  id: number,
  type: ZombieType,
  x: number,
  y: number,
  def: {
    hp: number; speed: number; damage: number; attackRangeUnits: number;
    attackCooldownSec: number; collisionRadius: number; xpReward: number;
    knockbackForce: number;
    preferredRangeMin?: number; preferredRangeMax?: number;
    projectileSpeedUnits?: number; projectileLifeSec?: number;
    armor?: number;
    explodeRadius?: number; explodeDamage?: number;
    boss?: boolean;
    summonIntervalSec?: number; summonType?: ZombieType; summonCount?: number;
  },
  mults: { hp: number; speed: number; damage: number },
  elite = false,
): ZombieEntity {
  return {
    id, type, active: true,
    x, y,
    hp: def.hp * mults.hp,
    maxHp: def.hp * mults.hp,
    speed: def.speed * mults.speed,
    damage: def.damage * mults.damage,
    attackRange: def.attackRangeUnits,
    attackCooldown: def.attackCooldownSec,
    attackTimer: 0,
    collisionRadius: def.collisionRadius,
    xpReward: def.xpReward,
    knockbackForce: def.knockbackForce,
    vx: 0, vy: 0,
    kbVx: 0, kbVy: 0,
    angle: 0,

    state: 'spawning',
    spawnTimer: 0.3,
    deathTimer: 0,
    hitFlashTimer: 0,

    healthMult: mults.hp,
    speedMult: mults.speed,
    damageMult: mults.damage,
    elite,

    armor: def.armor ?? 0,
    isBoss: def.boss ?? false,
    explodeRadius: def.explodeRadius ?? 0,
    explodeDamage: def.explodeDamage ?? 0,
    detonated: false,
    summonTimer: def.summonIntervalSec ?? 0,
    summonInterval: def.summonIntervalSec ?? 0,
    summonType: def.summonType ?? null,
    summonCount: def.summonCount ?? 0,

    wanderTimer: 0,
    lastKnownPlayerX: x,
    lastKnownPlayerY: y,

    specialTimer: 0,
    specialCooldown: 0,
    chargePhase: 'none',
    chargeTimer: 0,
    chargeDirX: 0,
    chargeDirY: 0,

    preferredRangeMin: def.preferredRangeMin ?? 130,
    preferredRangeMax: def.preferredRangeMax ?? 210,
    projectileSpeed: def.projectileSpeedUnits ?? 190,
    projectileLife: def.projectileLifeSec ?? 2.0,
  };
}
