/**
 * progression.ts — XP thresholds, level milestones, upgrade math
 *
 * Phase 2 — Vertical Slice
 */

import type { UpgradeId } from '../game/GameState';

// ── XP Thresholds ──
const XP_THRESHOLDS = [0, 100, 250, 450, 700];
// Levels 6–10: each adds 300 to previous
function buildThresholds(): number[] {
  const t = [...XP_THRESHOLDS];
  for (let lvl = 6; lvl <= 10; lvl++) {
    t.push(t[t.length - 1] + 300);
  }
  return t; // index = level-1
}
export const XP_TABLE = buildThresholds();
export const MAX_LEVEL = 10;
export const MAX_UPGRADE_RANK = 5;

export function levelForXp(xp: number): number {
  let level = 1;
  for (let i = 0; i < XP_TABLE.length; i++) {
    if (xp >= XP_TABLE[i]) level = i + 1;
    else break;
  }
  return Math.min(level, MAX_LEVEL);
}

export function xpToNextLevel(xp: number): { current: number; needed: number; pct: number } {
  const lvl = levelForXp(xp);
  if (lvl >= MAX_LEVEL) return { current: xp, needed: 0, pct: 1 };
  const base = XP_TABLE[lvl - 1];
  const next = XP_TABLE[lvl];
  const current = xp - base;
  const needed = next - base;
  return { current, needed, pct: Math.min(1, current / needed) };
}

// ── Level Milestone Rewards ──
export type MilestoneReward =
  | { type: 'ammo_bonus'; pct: number }
  | { type: 'max_hp'; amount: number }
  | { type: 'pickup_duration'; pct: number }
  | { type: 'cosmetic'; label: string };

export const LEVEL_MILESTONES: Record<number, MilestoneReward> = {
  2: { type: 'ammo_bonus', pct: 0.10 },
  4: { type: 'max_hp', amount: 5 },
  6: { type: 'pickup_duration', pct: 0.10 },
  8: { type: 'max_hp', amount: 5 },
  10: { type: 'cosmetic', label: 'Bright Mode' },
};

/**
 * Apply milestone rewards for every level strictly after `fromLevel`
 * up to and including `toLevel`. XP is monotonic, so each level is
 * crossed (and claimed) exactly once across grantXp + mission reward.
 */
export function applyMilestones(
  state: { milestoneMaxHp: number; milestoneAmmoPct: number },
  fromLevel: number,
  toLevel: number,
): void {
  for (let lvl = fromLevel + 1; lvl <= toLevel; lvl++) {
    const milestone = LEVEL_MILESTONES[lvl];
    if (!milestone) continue;
    if (milestone.type === 'max_hp') state.milestoneMaxHp += milestone.amount;
    if (milestone.type === 'ammo_bonus') state.milestoneAmmoPct += milestone.pct;
    // pickup_duration / cosmetic — wired in later phases
  }
}

// ── Upgrade Math (per spec §76) ──
export function calcUpgradedMaxHp(baseHp: number, rank: number): number {
  return Math.round(baseHp * Math.pow(1.10, rank));
}

export function calcUpgradedSpeed(baseSpeed: number, rank: number): number {
  const upgraded = baseSpeed * Math.pow(1.10, rank);
  return Math.min(upgraded, baseSpeed * 1.5); // cap at 150%
}

export function calcUpgradedDamage(baseDmg: number, rank: number): number {
  return baseDmg * Math.pow(1.10, rank);
}

export function calcUpgradedReloadMs(baseMs: number, rank: number): number {
  return baseMs / Math.pow(1.10, rank);
}

export function calcUpgradedFireIntervalMs(baseMs: number, rank: number): number {
  return baseMs / Math.pow(1.10, rank);
}

export function calcUpgradedAmmo(baseAmount: number, rank: number): number {
  return Math.ceil(baseAmount * Math.pow(1.10, rank));
}

// ── Upgrade pool (for random choice generation) ──
export const ALL_UPGRADES: UpgradeId[] = ['maxHp', 'speed', 'damage', 'reloadSpeed', 'fireRate', 'maxAmmo'];

export function availableUpgrades(ranks: Record<UpgradeId, number>): UpgradeId[] {
  return ALL_UPGRADES.filter(id => ranks[id] < MAX_UPGRADE_RANK);
}

/** Pick 3 random unique upgrades from the available pool */
export function pickUpgradeChoices(ranks: Record<UpgradeId, number>): UpgradeId[] {
  const pool = availableUpgrades(ranks);
  if (pool.length === 0) return [];
  const shuffled = pool.slice().sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(3, shuffled.length));
}

// ── Mission replay XP rule ──
export function missionReplayXp(configuredRewardXp: number): number {
  return Math.round(configuredRewardXp * 0.25);
}
