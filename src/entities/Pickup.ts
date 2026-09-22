/**
 * Pickup.ts — Pickup / drop entity (health, ammo, bonus XP)
 *
 * Phase 2 — Vertical Slice
 */

import type { Entity } from './Entity';
import { PICKUP_DURATION_SEC, PICKUP_BLINK_START_SEC } from '../config/zombies';

export type PickupType = 'health' | 'ammo' | 'bonusXp';

export interface PickupEntity extends Entity {
  pickupType: PickupType;
  lifetime: number;       // seconds remaining
  blinking: boolean;
  collected: boolean;
}

export function createPickup(
  id: number,
  x: number,
  y: number,
  type: PickupType,
): PickupEntity {
  return {
    id, active: true, collected: false,
    x, y,
    pickupType: type,
    lifetime: PICKUP_DURATION_SEC,
    blinking: false,
  };
}

export function tickPickup(p: PickupEntity, dt: number): void {
  p.lifetime -= dt;
  p.blinking = p.lifetime <= (PICKUP_DURATION_SEC - PICKUP_BLINK_START_SEC);
  if (p.lifetime <= 0) p.active = false;
}
