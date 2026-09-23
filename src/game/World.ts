/**
 * World.ts
 * Shared simulation context passed to every system.
 * Rendering/UI never mutate this directly — they read GameState via Game.
 *
 * Phase 2 — Vertical Slice
 */

import type { PlayerEntity } from '../entities/Player';
import type { ZombieEntity } from '../entities/Zombie';
import type { ProjectileEntity } from '../entities/Projectile';
import type { PickupEntity } from '../entities/Pickup';
import type { ArenaDef } from '../config/arenas';
import type { MissionDef } from '../config/missions';
import type { GameState } from './GameState';
import type { WeaponId } from './GameState';
import type { SpatialHash } from '../systems/SpatialHash';

/** Runtime spawn bookkeeping for the current mission's waves. */
export interface WaveRuntime {
  /** zombies spawned so far, per wave index */
  spawned: number[];
  /** accumulator toward next spawn tick, per wave index */
  timers: number[];
  /** wave finished spawning */
  done: boolean[];
  /** survive_then_eliminate final wave */
  finalSpawned: number;
  finalTimer: number;
  finalDone: boolean;
}

/** Callbacks from simulation → rendering / Game orchestration. */
export interface GameEvents {
  onZombieSpawned(z: ZombieEntity): void;
  onZombieRemoved(id: number): void;
  onProjectileSpawned(p: ProjectileEntity): void;
  onProjectileRemoved(id: number): void;
  onPickupSpawned(pk: PickupEntity): void;
  onPickupRemoved(id: number): void;
  onFired(angle: number, weaponId: WeaponId): void;
  onDamageNumber(x: number, y: number, amount: number, isPlayer: boolean): void;
  onZombieHit(x: number, y: number): void;
  onPlayerHurt(): void;
  onZombieKilled(z: ZombieEntity): void;
  onPickupCollected(pk: PickupEntity): void;
  onPlayerDied(): void;
  /** Spitter acid projectile impacted (wall or player). */
  onAcidSplash(x: number, y: number): void;
  onReloadStarted(): void;
  onReloadFinished(): void;
  onDryFire(): void;
  onLevelUp(level: number): void;
  /** Exploder detonation / AoE blast. */
  onExplosion(x: number, y: number, radius: number): void;
  /** Boss summoned adds. */
  onBossSummon(x: number, y: number): void;
  /** Special weapon unlocked via gameplay / kill count */
  onWeaponUnlocked(id: WeaponId, message: string): void;
}

export interface World {
  state: GameState;
  arena: ArenaDef;
  mission: MissionDef;
  player: PlayerEntity;
  zombies: ZombieEntity[];
  projectiles: ProjectileEntity[];
  pickups: PickupEntity[];
  hash: SpatialHash<ZombieEntity>;
  waveRuntime: WaveRuntime;
  nextId(): number;
  events: GameEvents;
}

/** Gameplay tuning constants shared across systems. */
export const PLAYER_RADIUS = 12;
export const PICKUP_COLLECT_RADIUS = 22;
export const MELEE_INVULN_SEC = 0.5;
export const ACID_INVULN_SEC = 0.7;
export const ZOMBIE_DEATH_SEC = 0.35;
export const ZOMBIE_SPAWN_SEC = 0.3;
export const MUZZLE_OFFSET = 16;

/** Count zombies that still occupy the field (spawning or active). */
export function activeZombieCount(zombies: ZombieEntity[]): number {
  let n = 0;
  for (const z of zombies) if (z.state !== 'dead') n++;
  return n;
}
