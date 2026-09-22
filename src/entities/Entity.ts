/**
 * Entity.ts — Base entity interface
 * All simulation entities (player, zombie, projectile, pickup) share this contract.
 *
 * Phase 2 — Vertical Slice
 */

export interface Entity {
  id: number;
  x: number;
  y: number;
  active: boolean;
}

let _nextId = 1;
export function nextEntityId(): number { return _nextId++; }
