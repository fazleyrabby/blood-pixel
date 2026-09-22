/**
 * CombatSystem.ts
 * Damage resolution: hurting zombies/player, kill side-effects (XP, drops,
 * counters), pickup collection.
 *
 * Phase 2 — Vertical Slice
 */

import type { World } from '../game/World';
import {
  MELEE_INVULN_SEC,
  ACID_INVULN_SEC,
  ZOMBIE_DEATH_SEC,
  PLAYER_RADIUS,
} from '../game/World';
import type { ZombieEntity } from '../entities/Zombie';
import type { ProjectileEntity } from '../entities/Projectile';
import type { PickupEntity } from '../entities/Pickup';
import { ZOMBIES, DROP_CHANCES } from '../config/zombies';
import { createPickup, type PickupType } from '../entities/Pickup';
import { levelForXp, applyMilestones } from '../config/progression';

/** Apply projectile/weapon damage to a zombie (armor reduces it). */
export function damageZombie(world: World, z: ZombieEntity, amount: number): void {
  if (z.state === 'dead') return;

  const dealt = z.armor > 0 ? amount * (1 - z.armor) : amount;
  z.hp -= dealt;
  z.hitFlashTimer = 0.08;
  world.state.accuracy.hits += 1;
  world.events.onDamageNumber(z.x, z.y - 16, dealt, false);
  world.events.onZombieHit(z.x, z.y);

  if (z.hp <= 0) {
    z.hp = 0;
    killZombie(world, z);
  }
}

/** Mark a zombie dead and grant kill rewards (XP, drops, counters). */
export function killZombie(world: World, z: ZombieEntity): void {
  if (z.state === 'dead') return;
  z.state = 'dead';
  z.deathTimer = ZOMBIE_DEATH_SEC;

  const { state, events } = world;
  state.killCount += 1;

  grantXp(world, z.xpReward);
  rollDrops(world, z);

  events.onZombieKilled(z);

  // Exploders detonate on death too (dangerous at close range)
  if (z.explodeRadius > 0 && !z.detonated) detonateZombie(world, z);
}

/** Exploder self-detonation: AoE damage to the player, then death. */
export function detonateZombie(world: World, z: ZombieEntity): void {
  if (z.detonated) return;
  z.detonated = true;

  const { player, events } = world;
  const blast = z.explodeRadius + PLAYER_RADIUS;
  const dist = Math.hypot(player.x - z.x, player.y - z.y);

  if (dist <= blast) {
    const falloff = Math.max(0.35, 1 - dist / blast);
    const nx = (player.x - z.x) / (dist || 1);
    const ny = (player.y - z.y) / (dist || 1);
    damagePlayer(world, null, nx, ny, 'melee', z.explodeDamage * falloff);
  }

  events.onExplosion(z.x, z.y, z.explodeRadius);

  if (z.state !== 'dead') killZombie(world, z);
}

/** Add XP and process any level-ups / milestones. */
export function grantXp(world: World, amount: number): void {
  const { state, events } = world;
  const before = levelForXp(state.xp);
  state.xp += amount;
  const after = levelForXp(state.xp);
  if (after > before) {
    state.level = after;
    applyMilestones(state, before, after);
    events.onLevelUp(after);
  } else {
    state.level = after;
  }
}

/** Hurt the player. `source` supplies melee stats/damage; acid passes `amount`. */
export function damagePlayer(
  world: World,
  source: ZombieEntity | null,
  dirX: number,
  dirY: number,
  kind: 'melee' | 'acid',
  amount?: number,
): void {
  const { player, state, events } = world;
  if (player.hp <= 0) return;
  if (state.godMode) return;

  if (kind === 'melee' && state.invulnerableTimer > 0) return;
  if (kind === 'acid' && player.spitterInvulnTimer > 0) return;
  if (kind === 'acid' && state.invulnerableTimer > 0) return;

  const dmg = amount ?? (source ? source.damage : 10);
  const kb = source ? source.knockbackForce : 80;

  if (kind === 'melee') {
    state.invulnerableTimer = MELEE_INVULN_SEC;
    player.invulnerableTimer = MELEE_INVULN_SEC;
  } else {
    player.spitterInvulnTimer = ACID_INVULN_SEC;
  }

  player.hp -= dmg;
  player.knockbackVx += dirX * kb;
  player.knockbackVy += dirY * kb;
  state.hp = player.hp;

  events.onDamageNumber(player.x, player.y - 18, dmg, true);
  events.onPlayerHurt();

  if (player.hp <= 0) {
    player.hp = 0;
    state.hp = 0;
    events.onPlayerDied();
  }
}

/** Light knockback applied to zombies by bullet impacts (bosses shrug it off). */
const BULLET_KNOCKBACK = 34;

/** Resolve a projectile hit on a zombie (applies falloff for player shots). */
export function projectileHitsZombie(
  world: World,
  p: ProjectileEntity,
  z: ZombieEntity,
  hitDist: number,
): void {
  let dmg = p.damage;
  if (p.owner === 'player' && p.falloffStart !== undefined && p.maxRange !== undefined) {
    dmg = falloffDamage(p.damage, hitDist, p.falloffStart, p.maxRange);
  }
  damageZombie(world, z, dmg);

  if (!z.isBoss && z.state !== 'dead') {
    const len = Math.hypot(p.vx, p.vy) || 1;
    const kb = BULLET_KNOCKBACK * (1 - z.armor);
    z.kbVx += (p.vx / len) * kb;
    z.kbVy += (p.vy / len) * kb;
  }
}

/**
 * Shotgun-style falloff: full damage until `falloffStart`,
 * linearly down to 50% at `maxRange`.
 */
export function falloffDamage(
  base: number,
  distance: number,
  falloffStart: number,
  maxRange: number,
): number {
  if (distance <= falloffStart) return base;
  if (distance >= maxRange) return base * 0.5;
  const t = (distance - falloffStart) / Math.max(1, maxRange - falloffStart);
  return base * (1 - 0.5 * t);
}

/** Collect a pickup the player touched. */
export function collectPickup(world: World, pk: PickupEntity): void {
  if (pk.collected) return;
  pk.collected = true;
  pk.active = false;

  const { state, player, events } = world;

  switch (pk.pickupType) {
    case 'health':
      player.hp = Math.min(player.maxHp, player.hp + 20);
      state.hp = player.hp;
      break;
    case 'ammo':
      // Restore 25% of each unlocked weapon's base reserve per spec
      for (const w of state.unlockedWeapons) {
        state.reserves[w] += Math.ceil(BASE_RESERVE[w] * 0.25);
      }
      break;
    case 'bonusXp':
      grantXp(world, 25);
      break;
  }

  events.onPickupCollected(pk);
}

const BASE_RESERVE: Record<string, number> = { pistol: 72, shotgun: 30, smg: 180, rifle: 60 };

function rollDrops(world: World, z: ZombieEntity): void {
  const roll = Math.random();
  let type: PickupType | null = null;
  if (roll < DROP_CHANCES.health) type = 'health';
  else if (roll < DROP_CHANCES.health + DROP_CHANCES.ammo) type = 'ammo';
  else if (roll < DROP_CHANCES.health + DROP_CHANCES.ammo + DROP_CHANCES.bonusXp) type = 'bonusXp';

  if (!type) return;
  // Suppress unused warning — ZOMBIES kept for future per-type drop tables
  void ZOMBIES;

  const pk = createPickup(world.nextId(), z.x, z.y, type);
  world.pickups.push(pk);
  world.events.onPickupSpawned(pk);
}
