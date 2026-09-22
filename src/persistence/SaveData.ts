/**
 * persistence/SaveData.ts
 * Single versioned JSON document in localStorage.
 * Handles defaults, migration, corruption recovery.
 *
 * Phase 2 — Vertical Slice
 */

import type { WeaponId, UpgradeId, GameSettings } from '../game/GameState';
import { defaultSettings } from '../game/GameState';

const SAVE_KEY = 'blood-pixel-save';
const RECOVERY_KEY = 'blood-pixel-save-recovery';
const CURRENT_VERSION = 2;

export interface SaveData {
  version: number;
  xp: number;
  level: number;
  claimedMilestones: number[];          // level numbers whose milestone was granted
  completedMissions: number[];
  highestUnlocked: number;
  unlockedWeapons: WeaponId[];
  upgradeRanks: Record<UpgradeId, number>;
  pendingUpgradeMissionId: number | null;
  milestoneMaxHp: number;
  milestoneAmmoPct: number;
  /** Unlocked achievement ids (Phase 4). */
  achievements: string[];
  settings: GameSettings;
  stats: {
    totalKills: number;
    totalMissionAttempts: number;
    totalShotsFired: number;
    totalShotsHit: number;
  };
}

function defaultSave(): SaveData {
  return {
    version: CURRENT_VERSION,
    xp: 0,
    level: 1,
    claimedMilestones: [],
    completedMissions: [],
    highestUnlocked: 1,
    unlockedWeapons: ['pistol'],
    upgradeRanks: { maxHp: 0, speed: 0, damage: 0, reloadSpeed: 0, fireRate: 0, maxAmmo: 0 },
    pendingUpgradeMissionId: null,
    milestoneMaxHp: 0,
    milestoneAmmoPct: 0,
    achievements: [],
    settings: defaultSettings(),
    stats: { totalKills: 0, totalMissionAttempts: 0, totalShotsFired: 0, totalShotsHit: 0 },
  };
}

function migrate(raw: Record<string, unknown>): SaveData {
  // v1 — initial schema; v2 adds `achievements`; future migrations go here
  const save = defaultSave();
  // Copy over known fields safely
  if (typeof raw.xp === 'number') save.xp = raw.xp;
  if (typeof raw.level === 'number') save.level = raw.level;
  if (Array.isArray(raw.completedMissions)) save.completedMissions = raw.completedMissions;
  if (typeof raw.highestUnlocked === 'number') save.highestUnlocked = raw.highestUnlocked;
  if (Array.isArray(raw.unlockedWeapons)) save.unlockedWeapons = raw.unlockedWeapons as WeaponId[];
  if (raw.upgradeRanks && typeof raw.upgradeRanks === 'object') {
    Object.assign(save.upgradeRanks, raw.upgradeRanks);
  }
  if (raw.pendingUpgradeMissionId !== undefined) {
    save.pendingUpgradeMissionId = raw.pendingUpgradeMissionId as number | null;
  }
  if (typeof raw.milestoneMaxHp === 'number') save.milestoneMaxHp = raw.milestoneMaxHp;
  if (typeof raw.milestoneAmmoPct === 'number') save.milestoneAmmoPct = raw.milestoneAmmoPct;
  if (raw.settings && typeof raw.settings === 'object') {
    Object.assign(save.settings, raw.settings);
  }
  if (raw.stats && typeof raw.stats === 'object') {
    Object.assign(save.stats, raw.stats);
  }
  if (Array.isArray(raw.claimedMilestones)) save.claimedMilestones = raw.claimedMilestones;
  if (Array.isArray(raw.achievements)) save.achievements = raw.achievements as string[];
  save.version = CURRENT_VERSION;
  return save;
}

export class SaveSystem {
  private data: SaveData;
  private available: boolean;

  constructor() {
    this.available = this._checkStorage();
    this.data = this._load();
  }

  get save(): SaveData { return this.data; }
  get storageAvailable(): boolean { return this.available; }

  commit(): void {
    if (!this.available) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch {
      console.warn('[Save] Failed to write save data');
    }
  }

  reset(keepSettings = true): void {
    const settings = this.data.settings;
    this.data = defaultSave();
    if (keepSettings) this.data.settings = settings;
    this.commit();
  }

  private _load(): SaveData {
    if (!this.available) return defaultSave();
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return defaultSave();
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      return migrate(parsed);
    } catch (e) {
      // Corrupt — back up and start fresh
      try {
        const corrupt = localStorage.getItem(SAVE_KEY) ?? '';
        localStorage.setItem(RECOVERY_KEY, corrupt);
      } catch { /* ignore */ }
      console.warn('[Save] Corrupt save data found; starting fresh. Recovery key:', RECOVERY_KEY);
      return defaultSave();
    }
  }

  private _checkStorage(): boolean {
    try {
      localStorage.setItem('__bp_test__', '1');
      localStorage.removeItem('__bp_test__');
      return true;
    } catch {
      return false;
    }
  }
}
