/**
 * weapons.ts — Data-driven weapon definitions
 * All stat values live here, not in gameplay classes.
 *
 * Phase 2 — Vertical Slice
 */

import type { WeaponId } from '../game/GameState';

export interface WeaponDef {
  id: WeaponId;
  name: string;
  damage: number;          // per projectile/pellet
  fireIntervalMs: number;  // cooldown between shots
  rangeUnits: number;      // max projectile travel distance
  magazineSize: number;
  reserveAmmo: number;
  reloadMs: number;
  projectileSpeed: number; // world units/sec
  automatic: boolean;      // hold to fire
  pellets?: number;        // shotgun pellets per shot
  spreadDeg?: number;      // cone spread in degrees
  falloffStartUnits?: number;   // full damage until this distance
  recoilKick: number;      // backward impulse applied to the player per shot
  pierce?: number;         // extra enemies a projectile passes through
}

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  pistol: {
    id: 'pistol',
    name: 'PISTOL',
    damage: 25,
    fireIntervalMs: 300,
    rangeUnits: 700,
    magazineSize: 12,
    reserveAmmo: 72,
    reloadMs: 1100,
    projectileSpeed: 900,
    automatic: false,
    recoilKick: 45,
  },
  shotgun: {
    id: 'shotgun',
    name: 'SHOTGUN',
    damage: 15,
    fireIntervalMs: 850,
    rangeUnits: 340,
    magazineSize: 6,
    reserveAmmo: 30,
    reloadMs: 1800,
    projectileSpeed: 750,
    automatic: false,
    pellets: 7,
    spreadDeg: 22,
    falloffStartUnits: 120,  // full damage until 120 units, then linear to 50% at max range
    recoilKick: 140,
  },
  smg: {
    id: 'smg',
    name: 'SMG',
    damage: 10,
    fireIntervalMs: 90,
    rangeUnits: 520,
    magazineSize: 30,
    reserveAmmo: 180,
    reloadMs: 1500,
    projectileSpeed: 1000,
    automatic: true,
    recoilKick: 20,
  },
  rifle: {
    id: 'rifle',
    name: 'RIFLE',
    damage: 34,
    fireIntervalMs: 420,
    rangeUnits: 900,
    magazineSize: 10,
    reserveAmmo: 60,
    reloadMs: 1600,
    projectileSpeed: 1250,
    automatic: false,
    recoilKick: 70,
    pierce: 2,             // punches through up to 2 extra enemies
  },
};

/** Missions that unlock weapons on first completion */
export const WEAPON_UNLOCK_MISSIONS: Partial<Record<WeaponId, number>> = {
  shotgun: 4,
  smg: 7,
  rifle: 12,
};
