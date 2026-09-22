/**
 * AISystem.ts
 * Zombie behavior: chase / kite / ranged attack, melee attacks, plus
 * per-type special moves (runner lunge, brute charge, spitter recoil).
 * Writes zombie.vx/vy (desired move + knockback) for MovementSystem to integrate.
 *
 * Phase 3 — Game Feel, Combat Depth & Depth Tilt
 */

import type { World } from '../game/World';
import { PLAYER_RADIUS, MUZZLE_OFFSET } from '../game/World';
import { createProjectile } from '../entities/Projectile';
import { createZombie, type ZombieEntity } from '../entities/Zombie';
import { ZOMBIES } from '../config/zombies';
import { damagePlayer, detonateZombie } from './CombatSystem';

// ── Runner lunge ──
export const RUNNER_LUNGE_MIN = 70;
export const RUNNER_LUNGE_MAX = 210;
export const RUNNER_LUNGE_TIME = 0.4;
export const RUNNER_LUNGE_COOLDOWN = 3.0;
export const RUNNER_LUNGE_SPEED_MULT = 3.0;

// ── Brute charge ──
export const BRUTE_CHARGE_MIN = 130;
export const BRUTE_CHARGE_MAX = 320;
export const BRUTE_WINDUP_TIME = 0.5;
export const BRUTE_CHARGE_TIME = 0.65;
export const BRUTE_RECOVER_TIME = 0.8;
export const BRUTE_CHARGE_SPEED_MULT = 6.5;
export const BRUTE_CHARGE_COOLDOWN = 4.5;

// ── Spitter ──
export const SPITTER_RECOIL_TIME = 0.35;
export const SPITTER_RECOIL_SPEED_MULT = 1.8;

export function updateAI(world: World, dt: number): void {
  const { player, zombies } = world;

  for (const z of zombies) {
    if (z.state !== 'active') continue;

    const dx = player.x - z.x;
    const dy = player.y - z.y;
    const dist = Math.hypot(dx, dy) || 0.0001;
    const dirX = dx / dist;
    const dirY = dy / dist;
    z.angle = Math.atan2(dy, dx);

    if (z.attackTimer > 0) z.attackTimer -= dt;
    if (z.specialCooldown > 0) z.specialCooldown -= dt;

    let moveX = 0;
    let moveY = 0;

    if (z.type === 'spitter') {
      ({ moveX, moveY } = updateSpitter(world, z, dist, dirX, dirY, dt));
    } else if (z.type === 'runner') {
      ({ moveX, moveY } = updateRunner(z, dist, dirX, dirY, dt));
    } else if (z.type === 'brute') {
      ({ moveX, moveY } = updateBrute(z, dist, dirX, dirY, dt));
    } else {
      moveX = dirX * z.speed;
      moveY = dirY * z.speed;
    }

    // Melee contact damage (all non-spitter types)
    if (z.type !== 'spitter') {
      const reach = z.attackRange + PLAYER_RADIUS;
      if (dist <= reach && z.attackTimer <= 0) {
        if (z.explodeRadius > 0) {
          // Exploders detonate on contact instead of swinging
          detonateZombie(world, z);
        } else {
          z.attackTimer = z.attackCooldown;
          damagePlayer(world, z, dirX, dirY, 'melee');
        }
      }
    }

    // Boss: periodically summons adds
    if (z.isBoss && z.summonType && z.summonCount > 0) {
      z.summonTimer -= dt;
      if (z.summonTimer <= 0) {
        z.summonTimer = z.summonInterval;
        summonAdds(world, z);
      }
    }

    // Bosses are immovable by bullet knockback
    const kbx = z.isBoss ? 0 : z.kbVx;
    const kby = z.isBoss ? 0 : z.kbVy;
    z.vx = moveX + kbx;
    z.vy = moveY + kby;
  }
}

/** Spawn a boss's summoned adds in a ring around it. */
function summonAdds(world: World, boss: ZombieEntity): void {
  const type = boss.summonType;
  if (!type) return;
  const def = ZOMBIES[type];
  for (let i = 0; i < boss.summonCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 70 + Math.random() * 50;
    const add = createZombie(
      world.nextId(),
      type,
      boss.x + Math.cos(angle) * radius,
      boss.y + Math.sin(angle) * radius,
      def,
      { hp: 1, speed: 1, damage: 1 },
    );
    world.zombies.push(add);
    world.state.totalSpawned += 1;
    world.events.onZombieSpawned(add);
  }
  world.events.onBossSummon(boss.x, boss.y);
}

/** Spitter: hold the preferred range band, spit acid, then recoil backwards. */
function updateSpitter(
  world: World,
  z: ZombieEntity,
  dist: number,
  dirX: number,
  dirY: number,
  dt: number,
): { moveX: number; moveY: number } {
  // Recoil after firing — hop back a little
  if (z.specialTimer > 0) {
    z.specialTimer -= dt;
    return {
      moveX: -dirX * z.speed * SPITTER_RECOIL_SPEED_MULT,
      moveY: -dirY * z.speed * SPITTER_RECOIL_SPEED_MULT,
    };
  }

  let moveX = 0;
  let moveY = 0;
  if (dist > z.preferredRangeMax) {
    moveX = dirX * z.speed;
    moveY = dirY * z.speed;
  } else if (dist < z.preferredRangeMin) {
    moveX = -dirX * z.speed;
    moveY = -dirY * z.speed;
  }

  if (dist <= z.attackRange && z.attackTimer <= 0) {
    z.attackTimer = z.attackCooldown;
    z.specialTimer = SPITTER_RECOIL_TIME;
    const speed = z.projectileSpeed;
    const p = createProjectile(
      world.nextId(),
      z.x + dirX * MUZZLE_OFFSET,
      z.y + dirY * MUZZLE_OFFSET,
      dirX * speed,
      dirY * speed,
      z.damage,
      z.projectileLife * speed,
      speed,
      'spitter',
    );
    p.originX = z.x;
    p.originY = z.y;
    world.projectiles.push(p);
    world.events.onProjectileSpawned(p);
  }

  return { moveX, moveY };
}

/** Runner: sprint, then burst-lunge to close the gap. */
function updateRunner(
  z: ZombieEntity,
  dist: number,
  dirX: number,
  dirY: number,
  dt: number,
): { moveX: number; moveY: number } {
  if (z.specialTimer > 0) {
    z.specialTimer -= dt;
    return {
      moveX: dirX * z.speed * RUNNER_LUNGE_SPEED_MULT,
      moveY: dirY * z.speed * RUNNER_LUNGE_SPEED_MULT,
    };
  }

  if (canRunnerLunge(dist, z.specialCooldown)) {
    z.specialTimer = RUNNER_LUNGE_TIME;
    z.specialCooldown = RUNNER_LUNGE_COOLDOWN;
    return {
      moveX: dirX * z.speed * RUNNER_LUNGE_SPEED_MULT,
      moveY: dirY * z.speed * RUNNER_LUNGE_SPEED_MULT,
    };
  }

  return { moveX: dirX * z.speed, moveY: dirY * z.speed };
}

/** Brute: slow walk → telegraphed windup → fast charge → exhausted recovery. */
function updateBrute(
  z: ZombieEntity,
  dist: number,
  dirX: number,
  dirY: number,
  dt: number,
): { moveX: number; moveY: number } {
  switch (z.chargePhase) {
    case 'windup': {
      z.chargeTimer -= dt;
      z.chargeDirX = dirX;
      z.chargeDirY = dirY;
      if (z.chargeTimer <= 0) {
        z.chargePhase = 'charge';
        z.chargeTimer = BRUTE_CHARGE_TIME;
      }
      return { moveX: 0, moveY: 0 };
    }
    case 'charge': {
      z.chargeTimer -= dt;
      const mx = z.chargeDirX * z.speed * BRUTE_CHARGE_SPEED_MULT;
      const my = z.chargeDirY * z.speed * BRUTE_CHARGE_SPEED_MULT;
      if (z.chargeTimer <= 0) {
        z.chargePhase = 'recover';
        z.chargeTimer = BRUTE_RECOVER_TIME;
        z.specialCooldown = BRUTE_CHARGE_COOLDOWN;
      }
      return { moveX: mx, moveY: my };
    }
    case 'recover': {
      z.chargeTimer -= dt;
      if (z.chargeTimer <= 0) z.chargePhase = 'none';
      return { moveX: dirX * z.speed * 0.25, moveY: dirY * z.speed * 0.25 };
    }
    case 'none':
    default: {
      if (canBruteCharge(dist, z.specialCooldown, z.chargePhase)) {
        z.chargePhase = 'windup';
        z.chargeTimer = BRUTE_WINDUP_TIME;
        z.chargeDirX = dirX;
        z.chargeDirY = dirY;
        return { moveX: 0, moveY: 0 };
      }
      return { moveX: dirX * z.speed, moveY: dirY * z.speed };
    }
  }
}

/** Runner may lunge when off cooldown and inside the lunge band. */
export function canRunnerLunge(distance: number, cooldown: number): boolean {
  return cooldown <= 0 && distance >= RUNNER_LUNGE_MIN && distance <= RUNNER_LUNGE_MAX;
}

/** Brute may start a charge when idle, off cooldown, inside the charge band. */
export function canBruteCharge(
  distance: number,
  cooldown: number,
  phase: ZombieEntity['chargePhase'],
): boolean {
  return (
    phase === 'none' &&
    cooldown <= 0 &&
    distance >= BRUTE_CHARGE_MIN &&
    distance <= BRUTE_CHARGE_MAX
  );
}

/** Exposed for tests/tools: the contact reach of a zombie's melee swing. */
export function meleeReach(z: Pick<ZombieEntity, 'attackRange'>): number {
  return z.attackRange + PLAYER_RADIUS;
}
