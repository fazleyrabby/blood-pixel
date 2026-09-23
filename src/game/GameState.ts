/**
 * GameState.ts
 * Shared mutable game state — owned by the simulation, read by rendering/UI.
 * Never mutated directly from rendering or UI; UI sends commands instead.
 *
 * Phase 2 — Vertical Slice
 */

export type GamePhase =
  | 'BOOT'
  | 'MAIN_MENU'
  | 'MISSION_SELECT'
  | 'MISSION_BRIEF'
  | 'COUNTDOWN'
  | 'PLAYING'
  | 'PAUSED'
  | 'MISSION_COMPLETE'
  | 'MISSION_FAILED'
  | 'UPGRADE_SELECT'
  | 'VICTORY';

export interface GameState {
  phase: GamePhase;

  /** Debug/cheat: player takes no damage. Runtime-only, never persisted. */
  godMode: boolean;
  /** Debug/cheat: auto-spawn and auto-kill enemies mode. */
  testSimulationMode: boolean;

  // ── Player runtime stats ──
  hp: number;
  maxHp: number;
  speed: number;         // world units/sec
  x: number;
  y: number;
  angle: number;         // radians, facing direction
  invulnerableTimer: number;

  // ── Weapon state ──
  activeWeapon: WeaponId;
  unlockedWeapons: WeaponId[];
  magazines: Record<WeaponId, number>;
  reserves: Record<WeaponId, number>;
  reloading: boolean;
  reloadTimer: number;
  fireCooldown: number;
  fireHeld: boolean;

  // ── Mission runtime ──
  missionId: number;
  missionTimer: number;  // seconds elapsed
  killCount: number;
  totalSpawned: number;
  activeEnemyCount: number;
  missionPhase: 'countdown' | 'active' | 'final_wave' | 'ended';
  countdownTimer: number;
  accuracy: { shots: number; hits: number };

  // ── Boss runtime (Phase 4) ──
  bossSpawned: boolean;
  bossActive: boolean;
  bossHp: number;
  bossMaxHp: number;
  bossName: string;

  // ── Progression (persistent) ──
  xp: number;
  level: number;
  upgradeRanks: Record<UpgradeId, number>;
  completedMissions: number[];
  highestUnlocked: number;
  pendingUpgradeMissionId: number | null;
  /** Cumulative +max HP from level milestones (persisted) */
  milestoneMaxHp: number;
  /** Cumulative reserve-ammo bonus fraction from milestones (persisted) */
  milestoneAmmoPct: number;

  // ── Settings ──
  settings: GameSettings;
}

export type WeaponId = 'pistol' | 'shotgun' | 'smg' | 'rifle' | 'grenade' | 'rocket';
export type UpgradeId = 'maxHp' | 'speed' | 'damage' | 'reloadSpeed' | 'fireRate' | 'maxAmmo';

export interface GameSettings {
  soundEnabled: boolean;
  masterVolume: number;
  crtEnabled: boolean;
  screenShake: boolean;
  dithering: boolean;
  damageNumbers: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  depthTilt: boolean;
  colorblindMode: boolean;
  fullscreen: boolean;
}

/** Settings keys that are simple on/off toggles (UI switchable). */
export type BoolSettingKey = {
  [K in keyof GameSettings]: GameSettings[K] extends boolean ? K : never;
}[keyof GameSettings];

export function defaultSettings(): GameSettings {
  return {
    soundEnabled: true,
    masterVolume: 70,
    crtEnabled: true,
    screenShake: true,
    dithering: true,
    damageNumbers: true,
    reducedMotion: false,
    highContrast: false,
    depthTilt: true,
    colorblindMode: false,
    fullscreen: false,
  };
}

export function createGameState(): GameState {
  return {
    phase: 'BOOT',
    godMode: false,
    testSimulationMode: false,
    hp: 100,
    maxHp: 100,
    speed: 150,
    x: 0,
    y: 0,
    angle: 0,
    invulnerableTimer: 0,

    activeWeapon: 'pistol',
    unlockedWeapons: ['pistol'],
    magazines: { pistol: 12, shotgun: 6, smg: 30, rifle: 10, grenade: 4, rocket: 2 },
    reserves: { pistol: 72, shotgun: 30, smg: 180, rifle: 60, grenade: 20, rocket: 10 },
    reloading: false,
    reloadTimer: 0,
    fireCooldown: 0,
    fireHeld: false,

    missionId: 1,
    missionTimer: 0,
    killCount: 0,
    totalSpawned: 0,
    activeEnemyCount: 0,
    missionPhase: 'countdown',
    countdownTimer: 3,
    accuracy: { shots: 0, hits: 0 },

    bossSpawned: false,
    bossActive: false,
    bossHp: 0,
    bossMaxHp: 0,
    bossName: '',

    xp: 0,
    level: 1,
    upgradeRanks: { maxHp: 0, speed: 0, damage: 0, reloadSpeed: 0, fireRate: 0, maxAmmo: 0 },
    completedMissions: [],
    highestUnlocked: 1,
    pendingUpgradeMissionId: null,
    milestoneMaxHp: 0,
    milestoneAmmoPct: 0,

    settings: defaultSettings(),
  };
}
