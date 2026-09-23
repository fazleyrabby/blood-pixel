/**
 * Weapon.ts
 * Firing + reload logic for the active weapon.
 * Data lives in config/weapons.ts; upgrade math in config/progression.ts.
 *
 * Phase 2 — Vertical Slice
 */

import type { World } from '../game/World';
import type { WeaponId } from '../game/GameState';
import { MUZZLE_OFFSET } from '../game/World';
import { WEAPONS, type WeaponDef } from '../config/weapons';
import {
  calcUpgradedFireIntervalMs,
  calcUpgradedReloadMs,
} from '../config/progression';
import { createProjectile } from '../entities/Projectile';

/** Effective fire interval after fireRate upgrade rank. */
export function fireIntervalMs(world: World, def: WeaponDef): number {
  const rank = world.state.upgradeRanks.fireRate;
  return calcUpgradedFireIntervalMs(def.fireIntervalMs, rank);
}

/** Effective reload time after reloadSpeed upgrade rank. */
export function reloadMs(world: World, def: WeaponDef): number {
  const rank = world.state.upgradeRanks.reloadSpeed;
  return calcUpgradedReloadMs(def.reloadMs, rank);
}

/** Tick cooldowns + reload progress. */
export function tickWeapon(world: World, dt: number): void {
  const { player, state } = world;

  if (player.fireCooldown > 0) player.fireCooldown -= dt;

  if (player.reloading) {
    player.reloadTimer -= dt;
    state.reloadTimer = Math.max(0, player.reloadTimer);
    if (player.reloadTimer <= 0) {
      finishReload(world);
    }
  }
}

/** Attempt to fire. Returns true if a shot went off. */
export function tryFire(world: World): boolean {
  const { player, state } = world;
  const def = WEAPONS[player.activeWeapon];

  if (player.reloading) return false;
  if (player.fireCooldown > 0) return false;
  if (state.magazines[player.activeWeapon] <= 0) {
    world.events.onDryFire();
    player.fireCooldown = 0.25;
    startReload(world);
    return false;
  }

  const pellets = def.pellets ?? 1;
  const spreadRad = ((def.spreadDeg ?? 0) * Math.PI) / 180;
  const damage = def.damage * player.damageMultiplier;
  const muzzleX = player.x + Math.cos(player.angle) * MUZZLE_OFFSET;
  const muzzleY = player.y + Math.sin(player.angle) * MUZZLE_OFFSET;

  for (let i = 0; i < pellets; i++) {
    const spread = pellets > 1
      ? (Math.random() - 0.5) * spreadRad
      : (Math.random() - 0.5) * spreadRad * (spreadRad > 0 ? 1 : 0);
    const angle = player.angle + spread;
    const p = createProjectile(
      world.nextId(),
      muzzleX,
      muzzleY,
      Math.cos(angle) * def.projectileSpeed,
      Math.sin(angle) * def.projectileSpeed,
      damage,
      def.rangeUnits,
      def.projectileSpeed,
      'player',
      {
        weaponId: def.id,
        falloffStart: def.falloffStartUnits,
        maxRange: def.rangeUnits,
        pierce: def.pierce,
      },
    );
    world.projectiles.push(p);
    world.events.onProjectileSpawned(p);
    state.accuracy.shots += 1;
  }

  state.magazines[player.activeWeapon] -= 1;
  player.fireCooldown = fireIntervalMs(world, def) / 1000;
  state.fireCooldown = player.fireCooldown;

  // Recoil: kick the player back along the aim axis (decays via knockback).
  const kick = def.recoilKick ?? 40;
  player.knockbackVx -= Math.cos(player.angle) * kick;
  player.knockbackVy -= Math.sin(player.angle) * kick;

  world.events.onFired(player.angle, def.id);

  if (state.magazines[player.activeWeapon] <= 0) {
    startReload(world);
  }
  return true;
}

export function startReload(world: World): void {
  const { player, state } = world;
  const def = WEAPONS[player.activeWeapon];
  const magSize = state.magazines[player.activeWeapon] + state.reserves[player.activeWeapon];
  void magSize;

  if (player.reloading) return;
  if (state.magazines[player.activeWeapon] >= def.magazineSize) return;
  if (state.reserves[player.activeWeapon] <= 0) return;

  player.reloading = true;
  state.reloading = true;
  player.reloadTimer = reloadMs(world, def) / 1000;
  state.reloadTimer = player.reloadTimer;
  world.events.onReloadStarted();
}

function finishReload(world: World): void {
  const { player, state } = world;
  const def = WEAPONS[player.activeWeapon];
  const w = player.activeWeapon;
  const need = def.magazineSize - state.magazines[w];
  const take = Math.min(need, state.reserves[w]);
  state.magazines[w] += take;
  state.reserves[w] -= take;
  player.reloading = false;
  state.reloading = false;
  player.reloadTimer = 0;
  state.reloadTimer = 0;
  world.events.onReloadFinished();
}

export const WEAPON_SLOTS: WeaponId[] = ['pistol', 'shotgun', 'smg', 'rifle', 'grenade', 'rocket'];

/** Switch to a weapon by weapon slot index (0 = pistol, 1 = shotgun, etc). Returns true if changed. */
export function switchWeaponBySlot(world: World, slotIndex: number): boolean {
  const targetId = WEAPON_SLOTS[slotIndex];
  if (!targetId || !world.state.unlockedWeapons.includes(targetId)) return false;
  const { state, player } = world;
  if (targetId === state.activeWeapon) return false;
  state.activeWeapon = targetId;
  player.activeWeapon = targetId;
  player.reloading = false;
  state.reloading = false;
  player.reloadTimer = 0;
  return true;
}

/** Switch to a weapon by unlocked-index (0-based). Returns true if changed. */
export function switchWeapon(world: World, index: number): boolean {
  const { state, player } = world;
  if (index < 0 || index >= state.unlockedWeapons.length) return false;
  const next = state.unlockedWeapons[index];
  if (next === state.activeWeapon) return false;
  state.activeWeapon = next;
  player.activeWeapon = next;
  player.reloading = false;
  state.reloading = false;
  player.reloadTimer = 0;
  return true;
}

/** Cycle unlocked weapons by delta (+1 / -1). */
export function cycleWeapon(world: World, delta: number): boolean {
  const { state } = world;
  const idx = state.unlockedWeapons.indexOf(state.activeWeapon);
  const next = (idx + delta + state.unlockedWeapons.length) % state.unlockedWeapons.length;
  return switchWeapon(world, next);
}
