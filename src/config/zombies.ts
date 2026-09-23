/**
 * zombies.ts — Data-driven zombie type definitions
 *
 * Phase 4 — Content Expansion: crawler, armored, exploder, abomination (boss)
 */

export type ZombieType =
  | 'walker'
  | 'runner'
  | 'brute'
  | 'spitter'
  | 'crawler'
  | 'armored'
  | 'exploder'
  | 'abomination'
  | 'grok'
  | 'claude'
  | 'codex'
  | 'muse';

export interface ZombieDef {
  type: ZombieType;
  name: string;
  hp: number;
  speed: number;       // world units/sec
  damage: number;      // contact damage (or projectile damage for spitter)
  attackRangeUnits: number;
  attackCooldownSec: number;
  xpReward: number;
  collisionRadius: number;
  knockbackForce: number;
  /** Spitter-only: preferred distance range */
  preferredRangeMin?: number;
  preferredRangeMax?: number;
  projectileSpeedUnits?: number;
  projectileLifeSec?: number;
  /** Fraction of incoming damage ignored (0–0.9) */
  armor?: number;
  /** Exploder-only: self-detonation on contact */
  explodeRadius?: number;
  explodeDamage?: number;
  /** Boss flags */
  boss?: boolean;
  /** Boss summoning */
  summonIntervalSec?: number;
  summonType?: ZombieType;
  summonCount?: number;
}

export const ZOMBIES: Record<ZombieType, ZombieDef> = {
  walker: {
    type: 'walker',
    name: 'WALKER',
    hp: 50,
    speed: 35,
    damage: 10,
    attackRangeUnits: 24,
    attackCooldownSec: 1.0,
    xpReward: 10,
    collisionRadius: 14,
    knockbackForce: 80,
  },
  runner: {
    type: 'runner',
    name: 'RUNNER',
    hp: 30,
    speed: 80,
    damage: 8,
    attackRangeUnits: 20,
    attackCooldownSec: 0.7,
    xpReward: 15,
    collisionRadius: 11,
    knockbackForce: 60,
  },
  brute: {
    type: 'brute',
    name: 'BRUTE',
    hp: 250,
    speed: 20,
    damage: 30,
    attackRangeUnits: 34,
    attackCooldownSec: 1.5,
    xpReward: 40,
    collisionRadius: 22,
    knockbackForce: 240,
  },
  spitter: {
    type: 'spitter',
    name: 'SPITTER',
    hp: 70,
    speed: 30,
    damage: 20,
    attackRangeUnits: 180,
    attackCooldownSec: 2.2,
    xpReward: 30,
    collisionRadius: 13,
    knockbackForce: 40,
    preferredRangeMin: 130,
    preferredRangeMax: 210,
    projectileSpeedUnits: 190,
    projectileLifeSec: 2.0,
  },
  crawler: {
    type: 'crawler',
    name: 'CRAWLER',
    hp: 16,
    speed: 125,
    damage: 6,
    attackRangeUnits: 16,
    attackCooldownSec: 0.5,
    xpReward: 12,
    collisionRadius: 8,
    knockbackForce: 40,
  },
  armored: {
    type: 'armored',
    name: 'ARMORED',
    hp: 220,
    speed: 28,
    damage: 22,
    attackRangeUnits: 28,
    attackCooldownSec: 1.2,
    xpReward: 35,
    collisionRadius: 18,
    knockbackForce: 110,
    armor: 0.45,          // ignores 45% of incoming damage
  },
  exploder: {
    type: 'exploder',
    name: 'EXPLODER',
    hp: 40,
    speed: 72,
    damage: 0,            // damage comes from the detonation
    attackRangeUnits: 26,
    attackCooldownSec: 99,
    xpReward: 20,
    collisionRadius: 12,
    knockbackForce: 60,
    explodeRadius: 95,
    explodeDamage: 30,
  },
  abomination: {
    type: 'abomination',
    name: 'ABOMINATION',
    hp: 2600,
    speed: 24,
    damage: 40,
    attackRangeUnits: 48,
    attackCooldownSec: 1.6,
    xpReward: 500,
    collisionRadius: 40,
    knockbackForce: 260,
    armor: 0.25,
    boss: true,
    summonIntervalSec: 6,
    summonType: 'crawler',
    summonCount: 3,
  },
  grok: {
    type: 'grok',
    name: 'GROK',
    hp: 800,
    speed: 40,
    damage: 25,
    attackRangeUnits: 24,
    attackCooldownSec: 1.0,
    xpReward: 150,
    collisionRadius: 18,
    knockbackForce: 100,
  },
  claude: {
    type: 'claude',
    name: 'CLAUDEBEAN',
    hp: 700,
    speed: 45,
    damage: 20,
    attackRangeUnits: 24,
    attackCooldownSec: 1.0,
    xpReward: 150,
    collisionRadius: 16,
    knockbackForce: 80,
  },
  codex: {
    type: 'codex',
    name: 'CODEX',
    hp: 900,
    speed: 35,
    damage: 30,
    attackRangeUnits: 26,
    attackCooldownSec: 1.2,
    xpReward: 150,
    collisionRadius: 20,
    knockbackForce: 120,
  },
  muse: {
    type: 'muse',
    name: 'MUSE',
    hp: 1200,
    speed: 60,
    damage: 15,
    attackRangeUnits: 30,
    attackCooldownSec: 0.5,
    xpReward: 300,
    collisionRadius: 16,
    knockbackForce: 50,
  },
};

/** Default drop chances per zombie kill */
export const DROP_CHANCES = {
  health: 0.02,   // 2% → restores 20 HP
  ammo: 0.04,     // 4% → restores 25% of reserve
  bonusXp: 0.01,  // 1% → +25 XP
} as const;

/** Pickup rules */
export const PICKUP_DURATION_SEC = 12;
export const PICKUP_BLINK_START_SEC = 9; // starts blinking at 9s (3s before expiry)
