/**
 * Game.ts
 * Root game object: boot, phase transitions, fixed-step simulation,
 * rendering orchestration, screens/HUD wiring, persistence.
 *
 * Phase 2 — Vertical Slice (playable Mission 1 end-to-end)
 */

import type { Application } from 'pixi.js';
import { Camera } from './Camera';
import { GameLoop } from './GameLoop';
import { StateMachine } from './StateMachine';
import {
  createGameState,
  type GameState,
  type GamePhase,
  type UpgradeId,
  type WeaponId,
} from './GameState';
import type { World } from './World';
import { SpatialHash } from '../systems/SpatialHash';
import { InputSystem } from '../systems/InputSystem';
import { updateMovement } from '../systems/MovementSystem';
import { updateAI } from '../systems/AISystem';
import { updateCollision } from '../systems/CollisionSystem';
import { updateProjectiles } from '../systems/ProjectileSystem';
import { updateSpawning, createWaveRuntime } from '../systems/SpawnSystem';
import { updateMission } from '../systems/MissionSystem';
import { damageZombie, damagePlayer } from '../systems/CombatSystem';
import {
  tryFire,
  tickWeapon,
  startReload,
  switchWeapon,
  cycleWeapon,
} from '../weapons/Weapon';
import { createPlayer, type PlayerEntity } from '../entities/Player';
import { createZombie, type ZombieEntity } from '../entities/Zombie';
import { ZOMBIES, type ZombieType } from '../config/zombies';
import { createSceneRenderer } from '../rendering/PixiSceneRenderer';
import type { SceneRenderer } from '../rendering/SceneRenderer';
import { TILT_Y_SCALE } from '../rendering/depth';
import { AudioSystem } from '../audio/AudioSystem';
import { evaluateAchievements, achievementById, ACHIEVEMENTS } from '../config/achievements';
import { HUD, type HUDData } from '../ui/HUD';
import { ScreenManager, type MissionResultData } from '../ui/ScreenManager';
import { SaveSystem } from '../persistence/SaveData';
import { MISSIONS, getMission, type MissionDef } from '../config/missions';
import { ARENAS } from '../config/arenas';
import { WEAPONS } from '../config/weapons';
import {
  levelForXp,
  xpToNextLevel,
  pickUpgradeChoices,
  missionReplayXp,
  calcUpgradedMaxHp,
  calcUpgradedSpeed,
  calcUpgradedAmmo,
  applyMilestones,
} from '../config/progression';

const COUNTDOWN_SEC = 3;
const FIRE_REQUEST_WINDOW = 0.3;
/** Max zombie sprites torn down per simulation step (spreads mass-death cost). */
const MAX_REMOVALS_PER_STEP = 24;

export class Game {
  private app: Application;
  private state: GameState;
  private sm = new StateMachine();
  private input = new InputSystem();
  private save = new SaveSystem();
  private camera = new Camera();
  private loop: GameLoop | null = null;

  private scene: SceneRenderer;
  private audio = new AudioSystem();
  private hud: HUD;
  private screens: ScreenManager;
  private pauseOverlay: HTMLElement | null = null;
  private devOverlay: HTMLElement | null = null;
  private cheatPanel: HTMLElement | null = null;
  private cheatGodBtn: HTMLButtonElement | null = null;
  private cheatTestSimBtn: HTMLButtonElement | null = null;

  private world: World | null = null;
  private player: PlayerEntity | null = null;

  private briefMissionId = 1;
  private fireRequest = 0;
  private prevShootHeld = false;
  private upgradeChoices: UpgradeId[] = [];

  // Game feel
  private hitStop = 0;
  private lastCountdownBeep = -1;
  private fpsEma = 60;
  private overlayClock = 0;
  private frameDeltas: number[] = [];
  private actorStyle: 'voxel' | 'billboard' = 'voxel';

  constructor(app: Application) {
    this.app = app;
    this.state = createGameState();
    this.scene = createSceneRenderer(app);

    const uiLayer = document.getElementById('ui-layer')!;
    this.hud = new HUD(uiLayer);
    this.screens = new ScreenManager(uiLayer);
  }

  // ──────────────────────────────────────────────
  // Boot
  // ──────────────────────────────────────────────

  async boot(): Promise<void> {
    this.applyCrtSetting();

    this.loadSaveIntoState();
    this.registerPhases();
    this.wireScreens();
    this.createPauseOverlay();
    this.createDevOverlay();
    this.createCheatPanel();

    window.addEventListener('blur', this.onWindowBlur);
    document.addEventListener('fullscreenchange', this.onFullscreenChange);

    this.exposeDebugApi();

    // A quiet view of the ruined town stays behind the main menu.
    const previewArena = ARENAS.town;
    const previewPlayer = createPlayer(previewArena.playerStartX, previewArena.playerStartY);
    this.scene.buildArena(previewArena, previewPlayer);
    this.camera.x = previewPlayer.x;
    this.camera.y = previewPlayer.y;

    this.loop = new GameLoop(this.fixedUpdate, this.render);
    this.loop.start();

    this.setPhase('MAIN_MENU');
  }

  private loadSaveIntoState(): void {
    const s = this.save.save;
    const st = this.state;
    st.xp = s.xp;
    st.level = s.level;
    st.upgradeRanks = { ...s.upgradeRanks };
    st.completedMissions = [...s.completedMissions];
    st.highestUnlocked = s.highestUnlocked;
    st.unlockedWeapons = [...s.unlockedWeapons];
    st.settings = { ...s.settings };
    st.milestoneMaxHp = s.milestoneMaxHp;
    st.milestoneAmmoPct = s.milestoneAmmoPct;
    st.activeWeapon = st.unlockedWeapons[0] ?? 'pistol';
    this.screens.syncSettings(st.settings);
    this.applyCrtSetting();
    this.applyVisualSettings();
  }

  /** Apply settings that affect rendering/camera immediately. */
  private applyVisualSettings(): void {
    const s = this.state.settings;
    this.camera.setSmoothing(s.reducedMotion ? 0 : 8);
    this.camera.setShakeEnabled(s.screenShake && !s.reducedMotion);
    const tilt = 1;
    this.camera.setYScale(tilt);
    this.camera.setPerspectiveFocal(tilt === 1 ? null : 1800);
    // This perspective camera faces world north; its screen axes match world X/Y.
    this.input.state.isometric = false;
    this.scene.setTilt(tilt);
    this.scene.setColorblind(s.colorblindMode);
    this.applyCrtSetting();
    document.body.classList.toggle('high-contrast', s.highContrast);
    this.audio.setEnabled(s.soundEnabled);
    this.audio.setVolume(s.masterVolume);
  }

  private persistRuntimeToSave(): void {
    const s = this.save.save;
    const st = this.state;
    s.xp = st.xp;
    s.level = levelForXp(st.xp);
    s.completedMissions = [...st.completedMissions];
    s.highestUnlocked = st.highestUnlocked;
    s.unlockedWeapons = [...st.unlockedWeapons];
    s.upgradeRanks = { ...st.upgradeRanks };
    s.milestoneMaxHp = st.milestoneMaxHp;
    s.milestoneAmmoPct = st.milestoneAmmoPct;
    s.settings = { ...st.settings };
    s.claimedMilestones = s.claimedMilestones; // claimed tracking kept on save
  }

  private commit(): void {
    this.persistRuntimeToSave();
    this.save.commit();
  }

  // ──────────────────────────────────────────────
  // Phase machine
  // ──────────────────────────────────────────────

  private setPhase(phase: GamePhase): void {
    this.sm.transition(phase);
    this.state.phase = phase;
    const inGame = phase === 'COUNTDOWN' || phase === 'PLAYING' || phase === 'PAUSED';
    if (inGame) this.audio.startAmbient();
    else this.audio.stopAmbient();
  }

  private registerPhases(): void {
    const gameplayPhases: GamePhase[] = ['COUNTDOWN', 'PLAYING', 'PAUSED'];

    this.sm.register('BOOT', {});
    this.sm.register('MAIN_MENU', {
      onEnter: () => {
        this.input.setGameActive(false);
        this.hud.hide();
        this.setCanvasCursor(true);
        this.screens.show('main-menu');
      },
    });
    this.sm.register('MISSION_SELECT', {
      onEnter: () => {
        this.input.setGameActive(false);
        this.hud.hide();
        this.setCanvasCursor(true);
        this.refreshMissionSelect();
        this.screens.show('mission-select');
      },
    });
    this.sm.register('MISSION_BRIEF', {
      onEnter: () => {
        this.input.setGameActive(false);
        this.hud.hide();
        this.setCanvasCursor(true);
        const m = getMission(this.briefMissionId);
        if (m) this.screens.populateMissionBrief(m);
        this.screens.show('mission-brief');
      },
    });
    this.sm.register('COUNTDOWN', {
      onEnter: () => {
        this.state.countdownTimer = COUNTDOWN_SEC;
        this.state.missionPhase = 'countdown';
        this.screens.hide();
        this.hud.show();
        this.input.setGameActive(true);
        this.setCanvasCursor(false);
      },
      onExit: () => this.input.setGameActive(false),
    });
    this.sm.register('PLAYING', {
      onEnter: () => {
        this.screens.hide();
        this.hud.show();
        this.input.setGameActive(true);
        this.setCanvasCursor(false);
      },
      onExit: () => this.input.setGameActive(false),
    });
    this.sm.register('PAUSED', {
      onEnter: () => {
        this.input.setGameActive(false);
        this.setCanvasCursor(true);
        this.showPause(true);
      },
      onExit: () => this.showPause(false),
    });
    this.sm.register('MISSION_COMPLETE', {
      onEnter: () => {
        this.input.setGameActive(false);
        this.hud.hide();
        this.setCanvasCursor(true);
      },
    });
    this.sm.register('MISSION_FAILED', {
      onEnter: () => {
        this.input.setGameActive(false);
        this.hud.hide();
        this.setCanvasCursor(true);
      },
    });
    this.sm.register('UPGRADE_SELECT', {
      onEnter: () => {
        this.input.setGameActive(false);
        this.hud.hide();
        this.setCanvasCursor(true);
      },
    });
    this.sm.register('VICTORY', {
      onEnter: () => {
        this.input.setGameActive(false);
        this.hud.hide();
        this.setCanvasCursor(true);
        this.screens.show('victory');
      },
    });

    void gameplayPhases;
  }

  private setCanvasCursor(show: boolean): void {
    const visible = show || this.cheatPanel?.style.display === 'flex';
    if (visible && document.pointerLockElement) void document.exitPointerLock();
    document.getElementById('app')?.classList.toggle('hide-system-cursor', !visible);
    this.app.canvas.style.cursor = visible ? 'auto' : 'none';
  }

  // ──────────────────────────────────────────────
  // Screens wiring
  // ──────────────────────────────────────────────

  private wireScreens(): void {
    const sc = this.screens;

    sc.onPlay = () => {
      // Next uncompleted unlocked mission (or highest unlocked on replay)
      let target = this.state.highestUnlocked;
      for (const m of MISSIONS) {
        if (m.id <= this.state.highestUnlocked && !this.state.completedMissions.includes(m.id)) {
          target = m.id;
          break;
        }
      }
      this.briefMissionId = target;
      this.setPhase('MISSION_BRIEF');
    };

    sc.onMissionSelect = () => this.setPhase('MISSION_SELECT');

    sc.onMissionBrief = (id: number) => {
      this.briefMissionId = id;
      this.setPhase('MISSION_BRIEF');
    };

    sc.onMissionStart = (id: number) => this.startMission(id);
    sc.onMissionRestart = () => this.startMission(this.state.missionId);

    sc.onMissionSelectFromResult = () => this.setPhase('MISSION_SELECT');

    sc.onNextMission = (id: number) => {
      if (id > MISSIONS.length || id > this.state.highestUnlocked) {
        this.setPhase('MISSION_SELECT');
        return;
      }
      this.briefMissionId = id;
      this.setPhase('MISSION_BRIEF');
    };

    sc.onUpgradeChosen = (id: UpgradeId) => {
      const ranks = this.state.upgradeRanks;
      ranks[id] = Math.min(ranks[id] + 1, 5);
      this.state.pendingUpgradeMissionId = null;
      this.commit();
      this.setPhase('MISSION_SELECT');
    };

    sc.onAllUpgradesMaxed = () => {
      this.state.xp += 100;
      this.commit();
      this.setPhase('MISSION_SELECT');
    };

    sc.onSettings = () => sc.syncSettings(this.state.settings);
    sc.onSettingsClose = () => this.commit();

    sc.onToggleSetting = (key, value) => {
      this.state.settings[key] = value;
      this.commit();
      if (key === 'crtEnabled') this.applyCrtSetting();
      if (key === 'fullscreen') this.applyFullscreen();
      this.applyVisualSettings();
    };

    sc.onVolumeChange = (value) => {
      this.state.settings.masterVolume = Math.max(0, Math.min(100, Math.round(value)));
      this.audio.setVolume(this.state.settings.masterVolume);
      this.audio.play('ui');
      this.commit();
    };

    sc.onStats = () => this.refreshStatsScreen();

    sc.onResetProgress = () => {
      this.save.reset(true);
      this.loadSaveIntoState();
      this.refreshMissionSelect();
      this.setPhase('MAIN_MENU');
    };
  }

  private refreshMissionSelect(): void {
    this.screens.populateMissionSelect(
      MISSIONS,
      this.state.completedMissions,
      this.state.highestUnlocked,
    );
  }

  /** Push current save stats + achievement states into the stats screen. */
  private refreshStatsScreen(): void {
    const s = this.save.save;
    const unlocked = new Set(s.achievements);
    this.screens.populateStats({
      level: s.level,
      xp: s.xp,
      missionsCompleted: s.completedMissions.length,
      totalKills: s.stats.totalKills,
      totalAttempts: s.stats.totalMissionAttempts,
      shotsFired: s.stats.totalShotsFired,
      shotsHit: s.stats.totalShotsHit,
      accuracyPct:
        s.stats.totalShotsFired > 0
          ? (s.stats.totalShotsHit / s.stats.totalShotsFired) * 100
          : 0,
      weaponsUnlocked: s.unlockedWeapons.length,
      achievements: ACHIEVEMENTS.map((a) => ({
        name: a.name,
        desc: a.desc,
        unlocked: unlocked.has(a.id),
      })),
    });
  }

  /** Unlock + announce any achievements newly satisfied by the save. Returns their names. */
  private checkAchievements(): string[] {
    const fresh = evaluateAchievements(this.save.save);
    if (fresh.length === 0) return [];
    this.save.save.achievements.push(...fresh);
    this.commit();
    this.refreshStatsScreen();
    const names: string[] = [];
    for (const id of fresh) {
      const a = achievementById(id);
      if (!a) continue;
      names.push(a.name);
      this.audio.play('achievement');
    }
    return names;
  }

  private applyCrtSetting(): void {
    this.scene.setCrt(this.state.settings.crtEnabled, this.state.settings.dithering);
  }

  // ──────────────────────────────────────────────
  // Pause
  // ──────────────────────────────────────────────

  private createPauseOverlay(): void {
    const el = document.createElement('div');
    el.id = 'pause-overlay';
    el.style.cssText =
      'position:absolute;inset:0;display:none;flex-direction:column;align-items:center;' +
      'justify-content:center;gap:16px;background:rgba(4,8,4,0.85);z-index:150;' +
      'pointer-events:auto;' +
      "font-family:'Share Tech Mono',monospace;color:#39ff14;";
    el.innerHTML =
      '<div style="font-size:28px;letter-spacing:6px">PAUSED</div>' +
      '<button id="pause-resume" class="menu-btn primary" style="width:220px">[ RESUME ]</button>' +
      '<button id="pause-quit" class="menu-btn" style="width:220px">[ QUIT TO MENU ]</button>';
    document.getElementById('ui-layer')!.appendChild(el);
    el.querySelector('#pause-resume')!.addEventListener('click', () => this.resume());
    el.querySelector('#pause-quit')!.addEventListener('click', () => {
      this.commit();
      this.pauseOverlay!.style.display = 'none';
      this.setPhase('MISSION_SELECT');
    });
    this.pauseOverlay = el;
  }

  private showPause(show: boolean): void {
    if (this.pauseOverlay) this.pauseOverlay.style.display = show ? 'flex' : 'none';
  }

  private pause(): void {
    if (this.state.phase === 'PLAYING') {
      this.setPhase('PAUSED');
      this.audio.play('ui');
    }
  }

  private resume(): void {
    if (this.state.phase === 'PAUSED') {
      this.setPhase('PLAYING');
      this.audio.play('ui');
    }
  }

  private onWindowBlur = (): void => {
    if (this.state.phase === 'PLAYING') this.pause();
  };

  /** Enter/exit browser fullscreen to match the setting. */
  private applyFullscreen(): void {
    const want = this.state.settings.fullscreen;
    const isFs = document.fullscreenElement !== null;
    if (want && !isFs) {
      void document.documentElement.requestFullscreen?.().catch(() => {
        // Denied (not a user gesture / unsupported) — revert the setting
        this.state.settings.fullscreen = false;
        this.commit();
        this.screens.syncSettings(this.state.settings);
      });
    } else if (!want && isFs) {
      void document.exitFullscreen?.().catch(() => { /* ignore */ });
    }
  }

  /** Keep the setting in sync when the user leaves fullscreen (Esc / F11). */
  private onFullscreenChange = (): void => {
    const isFs = document.fullscreenElement !== null;
    if (this.state.settings.fullscreen !== isFs) {
      this.state.settings.fullscreen = isFs;
      this.commit();
      this.screens.syncSettings(this.state.settings);
    }
  };

  // ──────────────────────────────────────────────
  // Mission lifecycle
  // ──────────────────────────────────────────────

  private startMission(id: number): void {
    const mission = getMission(id);
    if (!mission) return;
    const arena = ARENAS[mission.mapId];
    const ranks = this.state.upgradeRanks;
    const st = this.state;

    // Player with upgrades + milestones applied
    const player = createPlayer(arena.playerStartX, arena.playerStartY);
    player.maxHp = calcUpgradedMaxHp(100, ranks.maxHp) + st.milestoneMaxHp;
    player.hp = player.maxHp;
    player.speed = calcUpgradedSpeed(150, ranks.speed);
    player.damageMultiplier = Math.pow(1.1, ranks.damage);
    player.activeWeapon = st.unlockedWeapons.includes(st.activeWeapon)
      ? st.activeWeapon
      : st.unlockedWeapons[0];

    // Ammo refill with upgrades + milestone ammo bonus
    for (const w of st.unlockedWeapons) {
      const def = WEAPONS[w];
      st.magazines[w] = calcUpgradedAmmo(def.magazineSize, ranks.maxAmmo);
      st.reserves[w] = Math.ceil(calcUpgradedAmmo(def.reserveAmmo, ranks.maxAmmo) * (1 + st.milestoneAmmoPct));
    }
    st.activeWeapon = player.activeWeapon;

    // Runtime state reset
    st.hp = player.hp;
    st.maxHp = player.maxHp;
    st.speed = player.speed;
    st.x = player.x;
    st.y = player.y;
    st.angle = 0;
    st.invulnerableTimer = 0;
    st.reloading = false;
    st.reloadTimer = 0;
    st.fireCooldown = 0;
    st.missionId = id;
    st.missionTimer = 0;
    st.killCount = 0;
    st.totalSpawned = 0;
    st.activeEnemyCount = 0;
    st.missionPhase = 'countdown';
    st.countdownTimer = COUNTDOWN_SEC;
    st.accuracy = { shots: 0, hits: 0 };
    st.bossSpawned = false;
    st.bossActive = false;
    st.bossHp = 0;
    st.bossMaxHp = 0;
    st.bossName = '';

    // World
    this.player = player;
    this.world = {
      state: st,
      arena,
      mission,
      player,
      zombies: [],
      projectiles: [],
      pickups: [],
      hash: new SpatialHash(96),
      waveRuntime: createWaveRuntime(mission),
      nextId: (() => { let n = 1000; return () => ++n; })(),
      events: this.makeEvents(),
    };

    // Rendering reset
    this.scene.buildArena(arena, player);
    this.camera.setBounds({ x: 0, y: 0, width: arena.worldWidth, height: arena.worldHeight });
    this.camera.x = player.x;
    this.camera.y = player.y;
    this.camera.follow(player.x, player.y);

    this.fireRequest = 0;
    this.prevShootHeld = false;
    this.hitStop = 0;
    this.lastCountdownBeep = -1;

    this.screens.hide();
    this.setPhase('COUNTDOWN');
  }

  private makeEvents(): World['events'] {
    return {
      onZombieSpawned: (z) => this.scene.addZombie(z),
      onZombieRemoved: (id) => this.scene.removeZombie(id),
      onProjectileSpawned: (p) => this.scene.addProjectile(p),
      onProjectileRemoved: (id) => this.scene.removeProjectile(id),
      onPickupSpawned: (pk) => this.scene.addPickup(pk),
      onPickupRemoved: (id) => this.scene.removePickup(id),
      onFired: (angle, weaponId) => {
        const p = this.player;
        if (!p) return;
        this.scene.showMuzzleFlash(p.x, p.y, angle);
        this.audio.play(
          weaponId === 'shotgun' ? 'shot_shotgun' : weaponId === 'smg' ? 'shot_smg' : 'shot_pistol',
        );
        this.addShake(weaponId === 'shotgun' ? 3.2 : weaponId === 'smg' ? 1.0 : 1.6, 0.12);
      },
      onDamageNumber: (x, y, amount, isPlayer) => {
        if (this.state.settings.damageNumbers) {
          this.scene.showDamageNumber(x, y, amount, isPlayer);
        }
      },
      onZombieHit: (x, y) => {
        this.scene.spawnBlood(x, y - 24 / TILT_Y_SCALE, 6);
        this.audio.play('hit');
      },
      onPlayerHurt: () => {
        this.addShake(9, 0.3);
        this.audio.play('hurt');
        this.hud.flashDamage();
        if (this.player) this.scene.spawnBlood(this.player.x, this.player.y - 24 / TILT_Y_SCALE, 9);
        this.requestHitStop(0.06);
      },
      onZombieKilled: (z) => {
        this.scene.spawnBlood(z.x, z.y - 20 / TILT_Y_SCALE, 14, 130, 190);
        this.audio.play('kill');
        this.addShake(1.4, 0.1);
        this.requestHitStop(0.03);
      },
      onPickupCollected: () => this.audio.play('pickup'),
      onPlayerDied: () => {
        this.addShake(14, 0.5);
        this.audio.play('death');
      },
      onAcidSplash: (x, y) => {
        this.scene.spawnAcid(x, y, 7);
        this.audio.play('acid');
      },
      onReloadStarted: () => this.audio.play('reload_start'),
      onReloadFinished: () => this.audio.play('reload_end'),
      onDryFire: () => this.audio.play('dry'),
      onLevelUp: (level) => {
        this.audio.play('levelup');
        this.hud.showBanner(`LEVEL ${level}`, '#ffff44');
      },
      onExplosion: (x, y) => {
        this.scene.spawnExplosion(x, y, 24);
        this.audio.play('explode');
        this.addShake(8, 0.28);
      },
      onBossSummon: (x, y) => {
        this.scene.spawnExplosion(x, y, 14);
        this.audio.play('boss_summon');
        this.addShake(5, 0.3);
      },
    };
  }

  /** Screen shake helper — respects the Screen Shake + Reduced Motion settings. */
  private addShake(intensity: number, duration: number): void {
    const s = this.state.settings;
    if (!s.screenShake || s.reducedMotion) return;
    this.camera.addShake(intensity, duration);
  }

  /** Freeze the simulation for a few frames on impactful events. */
  private requestHitStop(seconds: number): void {
    if (this.state.settings.reducedMotion) return;
    this.hitStop = Math.max(this.hitStop, seconds);
  }

  private failMission(): void {
    if (!this.world) return;
    const st = this.state;

    // Persist earned XP + attempt stats
    this.save.save.stats.totalKills += st.killCount;
    this.save.save.stats.totalMissionAttempts += 1;
    this.save.save.stats.totalShotsFired += st.accuracy.shots;
    this.save.save.stats.totalShotsHit += st.accuracy.hits;
    this.commit();
    const unlocked = this.checkAchievements();

    this.screens.populateMissionFailed({
      kills: st.killCount,
      timeSec: st.missionTimer,
      missionId: st.missionId,
      achievements: unlocked,
    });
    this.setPhase('MISSION_FAILED');
    this.screens.show('mission-failed');
    this.audio.play('failed');
  }

  private completeMission(): void {
    if (!this.world) return;
    const st = this.state;
    const mission = this.world.mission;
    const id = mission.id;
    const first = !st.completedMissions.includes(id);

    const accPct = st.accuracy.shots > 0
      ? (st.accuracy.hits / st.accuracy.shots) * 100
      : 100;
    const xpEarned = first ? mission.rewardXP : missionReplayXp(mission.rewardXP);

    // XP + milestones (levels crossed by kill XP already applied in grantXp)
    const oldLevel = levelForXp(st.xp);
    st.xp += xpEarned;
    const newLevel = levelForXp(st.xp);
    st.level = newLevel;
    applyMilestones(st, oldLevel, newLevel);
    if (newLevel > oldLevel) this.audio.play('levelup');

    // Unlocks (first completion only)
    if (first) {
      st.completedMissions.push(id);
      if (mission.unlocksMissionId) {
        st.highestUnlocked = Math.max(st.highestUnlocked, mission.unlocksMissionId);
      }
      if (mission.unlocksWeapon && !st.unlockedWeapons.includes(mission.unlocksWeapon as WeaponId)) {
        st.unlockedWeapons.push(mission.unlocksWeapon as WeaponId);
      }
    }

    // Stats
    this.save.save.stats.totalKills += st.killCount;
    this.save.save.stats.totalMissionAttempts += 1;
    this.save.save.stats.totalShotsFired += st.accuracy.shots;
    this.save.save.stats.totalShotsHit += st.accuracy.hits;
    this.commit();
    const unlocked = this.checkAchievements();

    // Mission 15 → Victory
    if (id === MISSIONS.length) {
      this.audio.play('complete');
      this.setPhase('VICTORY');
      return;
    }

    const result: MissionResultData = {
      missionId: id,
      kills: st.killCount,
      accuracy: accPct,
      timeSec: st.missionTimer,
      xpEarned,
      firstCompletion: first,
      achievements: unlocked,
    };
    this.screens.populateMissionComplete(result);
    if (first) {
      this.upgradeChoices = pickUpgradeChoices(st.upgradeRanks);
      this.screens.populateUpgradeSelect({
        choices: this.upgradeChoices,
        ranks: st.upgradeRanks,
        missionId: id,
      });
    }
    this.setPhase('MISSION_COMPLETE');
    this.screens.show('mission-complete');
    this.audio.play('complete');
  }

  // ──────────────────────────────────────────────
  // Simulation (fixed 60 Hz)
  // ──────────────────────────────────────────────

  private fixedUpdate = (dt: number): void => {
    const phase = this.state.phase;

    // ── Global toggles (work in any phase) ──
    if (this.input.state.mutePressed) this.audio.toggleMute();
    if (this.input.state.debugToggle) this.toggleDevOverlay();
    if (this.input.state.cheatPanelPressed) this.toggleCheatPanel();
    if (this.input.state.hybridPressed) {
      this.actorStyle = this.actorStyle === 'voxel' ? 'billboard' : 'voxel';
      this.scene.setActorStyle(this.actorStyle);
      this.hud.showBanner(this.actorStyle === 'billboard' ? 'BILLBOARD ACTORS · H TO SWITCH' : 'VOXEL ACTORS · H TO SWITCH', '#e6d3af');
    }

    // Pause toggle via Escape (also handled by window keydown; consume flag)
    if (this.input.state.pausePressed) {
      if (phase === 'PLAYING') this.pause();
      else if (phase === 'PAUSED') this.resume();
    }

    if (phase === 'COUNTDOWN') {
      this.updateAim();
      this.state.countdownTimer -= dt;
      const c = Math.ceil(Math.max(0, this.state.countdownTimer));
      if (c !== this.lastCountdownBeep) {
        this.lastCountdownBeep = c;
        this.audio.play(c > 0 ? 'countdown' : 'go');
      }
      if (this.state.countdownTimer <= 0) {
        this.state.countdownTimer = 0;
        this.setPhase('PLAYING');
        this.state.missionPhase = 'active';
      }
    } else if (phase === 'PLAYING') {
      // Hit-stop: brief freeze on impactful hits (skipped for reduced motion)
      if (this.hitStop > 0) {
        this.hitStop -= dt;
        this.input.consume();
        return;
      }
      this.runSim(dt);
    }

    this.input.consume();
  };

  private updateAim(): void {
    if (!this.player) return;
    if (this.cheatPanel?.style.display === 'flex') return;
    const w = this.camera.screenToWorld(this.input.state.mouseX, this.input.state.mouseY);
    this.player.angle = Math.atan2(w.y - this.player.y, w.x - this.player.x);
    this.state.angle = this.player.angle;
  }

  private runSim(dt: number): void {
    const world = this.world;
    if (!world) return;
    const { player, state } = world;
    const s = this.input.state;

    state.missionTimer += dt;

    // Invulnerability timers
    if (state.invulnerableTimer > 0) state.invulnerableTimer -= dt;
    if (player.invulnerableTimer > 0) player.invulnerableTimer -= dt;
    if (player.spitterInvulnTimer > 0) player.spitterInvulnTimer -= dt;

    this.updateAim();
    if (state.testSimulationMode && world.zombies.length > 0) {
      let nearest = null;
      let minDist = Infinity;
      for (const z of world.zombies) {
        if (z.state !== 'active' && z.state !== 'spawning') continue;
        const dist = Math.hypot(z.x - player.x, z.y - player.y);
        if (dist < minDist) {
          minDist = dist;
          nearest = z;
        }
      }
      if (nearest) {
        player.angle = Math.atan2(nearest.y - player.y, nearest.x - player.x);
        state.angle = player.angle;
      }
    }

    // ── Weapon switching ──
    if (s.weapon1) switchWeapon(world, 0);
    if (s.weapon2) switchWeapon(world, 1);
    if (s.weapon3) switchWeapon(world, 2);
    if (s.wheelUp) cycleWeapon(world, 1);
    if (s.wheelDown) cycleWeapon(world, -1);
    if (s.reloadPressed) startReload(world);

    // ── Firing ──
    if (state.testSimulationMode) {
      s.shootHeld = true;
      this.fireRequest = FIRE_REQUEST_WINDOW;
    }
    const def = WEAPONS[player.activeWeapon];
    const edge = s.shootHeld && !this.prevShootHeld;
    this.prevShootHeld = s.shootHeld;
    if (edge) this.fireRequest = FIRE_REQUEST_WINDOW;
    else this.fireRequest = Math.max(0, this.fireRequest - dt);

    const wantFire = def.automatic ? s.shootHeld : this.fireRequest > 0;
    if (wantFire && tryFire(world)) {
      if (!def.automatic) this.fireRequest = 0;
    }
    tickWeapon(world, dt);

    // ── Systems ──
    updateAI(world, dt);
    updateMovement(world, this.input, dt);
    updateProjectiles(world, dt);
    updateCollision(world);
    updateSpawning(world, dt);

    // ── Zombie lifecycle timers ──
    const z = world.zombies;
    for (let i = 0; i < z.length; i++) {
      const zb = z[i];
      if (zb.state === 'spawning') {
        zb.spawnTimer -= dt;
        if (zb.spawnTimer <= 0) {
          zb.spawnTimer = 0;
          zb.state = 'active';
        }
      }
      if (zb.hitFlashTimer > 0) zb.hitFlashTimer -= dt;
      if (zb.state === 'dead' && zb.deathTimer > 0) zb.deathTimer -= dt;
    }

    // Sweep fully-dead zombies. Bounded per step so a mass death (exploder
    // chain, dev kill-all) can't stall a single frame — dead entities are
    // already invisible and excluded from targeting/objectives.
    let removed = 0;
    for (let i = z.length - 1; i >= 0 && removed < MAX_REMOVALS_PER_STEP; i--) {
      if (z[i].state === 'dead' && z[i].deathTimer <= 0) {
        world.events.onZombieRemoved(z[i].id);
        z.splice(i, 1);
        removed++;
      }
    }

    // ── Pickups lifetime ──
    const pk = world.pickups;
    for (let i = pk.length - 1; i >= 0; i--) {
      const p = pk[i];
      p.lifetime -= dt;
      p.blinking = p.lifetime <= 3;
      if (p.lifetime <= 0 || !p.active) {
        world.events.onPickupRemoved(p.id);
        pk.splice(i, 1);
      }
    }

    // ── Objective check ──
    state.activeEnemyCount = 0;
    let boss: ZombieEntity | null = null;
    for (const zb of z) {
      if (zb.state !== 'dead') {
        state.activeEnemyCount++;
        if (zb.isBoss) boss = zb;
      }
    }
    state.bossActive = boss !== null;
    if (boss) {
      state.bossHp = boss.hp;
      state.bossMaxHp = boss.maxHp;
    }

    const outcome = updateMission(world);
    if (outcome === 'failed') {
      this.failMission();
      return;
    }
    if (outcome === 'complete') {
      this.completeMission();
    }
  }

  // ──────────────────────────────────────────────
  // Render (display rate)
  // ──────────────────────────────────────────────

  private render = (_alpha: number, dt: number): void => {
    // Keep camera screen size in sync (logical pixels — handles resize)
    this.camera.setScreenSize(this.app.screen.width, this.app.screen.height);
    this.scene.resize(this.app.screen.width, this.app.screen.height);

    // FPS estimate for the dev overlay
    if (dt > 0) this.fpsEma += ((1 / dt) - this.fpsEma) * 0.08;
    if (this.state.phase === 'PLAYING' && dt > 0) {
      this.frameDeltas.push(dt * 1000);
      if (this.frameDeltas.length > 180) this.frameDeltas.shift();
    }

    const world = this.world;
    if (world) {
      const phase = this.state.phase;
      if (phase === 'COUNTDOWN' || phase === 'PLAYING' || phase === 'PAUSED') {
        this.camera.follow(world.player.x, world.player.y);
        this.camera.update(dt);
        this.scene.applyCamera(this.camera);
        this.scene.update(dt, world);

        if (this.hudVisible()) {
          this.hud.update(this.buildHudData());
          this.hud.updateCrosshairPosition(
            this.input.state.mouseX,
            this.input.state.mouseY,
            this.cheatPanel?.style.display !== 'flex' && phase !== 'PAUSED',
          );
        }
      }
    }

    this.updateDevOverlay(dt);
    if (!world) this.scene.applyCamera(this.camera);
    if (!world || !this.hudVisible()) this.scene.update(dt, null);
  };

  private hudVisible(): boolean {
    const p = this.state.phase;
    return p === 'COUNTDOWN' || p === 'PLAYING' || p === 'PAUSED';
  }

  private buildHudData(): HUDData {
    const st = this.state;
    const world = this.world!;
    const mission = world.mission;
    const def = WEAPONS[st.activeWeapon];
    const xp = xpToNextLevel(st.xp);

    let objective = '';
    let killTarget: number | null = null;
    let timerTarget: number | null = null;
    const obj = mission.objective;
    switch (obj.type) {
      case 'kill':
        objective = `ELIMINATE ${obj.target} HOSTILES`;
        killTarget = obj.target;
        break;
      case 'boss':
        objective = 'DESTROY THE ABOMINATION';
        break;
      case 'survive':
        objective = `SURVIVE ${obj.durationSeconds} SECONDS`;
        timerTarget = obj.durationSeconds;
        break;
      case 'eliminate':
        objective = 'CLEAR ALL WAVES';
        break;
      case 'survive_then_eliminate':
        if (st.missionPhase === 'final_wave') {
          objective = 'FINAL HORDE — CLEAR THEM ALL';
        } else {
          objective = `SURVIVE ${obj.durationSeconds}s → FINAL HORDE`;
          timerTarget = obj.durationSeconds;
        }
        break;
    }

    return {
      hp: st.hp,
      maxHp: st.maxHp,
      ammoMag: st.magazines[st.activeWeapon],
      ammoReserve: st.reserves[st.activeWeapon],
      weaponName: def.name,
      reloading: st.reloading,
      xp: st.xp,
      level: st.level,
      xpPct: xp.pct,
      killCount: st.killCount,
      killTarget,
      missionId: st.missionId,
      missionTimer: st.missionTimer,
      missionTimerTarget: timerTarget,
      countdown: st.phase === 'COUNTDOWN' ? st.countdownTimer : null,
      objective,
      bossActive: st.bossActive,
      bossHp: st.bossHp,
      bossMaxHp: st.bossMaxHp,
      bossName: st.bossName,
      reducedMotion: st.settings.reducedMotion,
    };
  }

  // ──────────────────────────────────────────────
  // Debug / cheat tooling (backtick = overlay, F2 = cheat panel)
  // ──────────────────────────────────────────────

  private createDevOverlay(): void {
    const el = document.createElement('div');
    el.id = 'dev-overlay';
    el.style.cssText =
      'position:absolute;left:12px;top:120px;display:none;white-space:pre;z-index:200;' +
      "font-family:'Share Tech Mono',monospace;font-size:11px;line-height:1.5;" +
      'color:#7dff7d;background:rgba(0,0,0,0.6);border:1px solid #1a3a1a;padding:6px 10px;' +
      'pointer-events:none;';
    document.getElementById('ui-layer')!.appendChild(el);
    this.devOverlay = el;
  }

  private toggleDevOverlay(): void {
    if (!this.devOverlay) return;
    const show = this.devOverlay.style.display === 'none';
    this.devOverlay.style.display = show ? 'block' : 'none';
    this.overlayClock = 1;
  }

  private updateDevOverlay(dt: number): void {
    const el = this.devOverlay;
    if (!el || el.style.display === 'none') return;
    this.overlayClock += dt;
    if (this.overlayClock < 0.2) return;
    this.overlayClock = 0;

    const st = this.state;
    const w = this.world;
    const sorted = [...this.frameDeltas].sort((a, b) => a - b);
    const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
    const p95 = sorted.length ? sorted[Math.floor(sorted.length * 0.95)] : 0;
    const worst = sorted.at(-1) ?? 0;
    el.textContent =
      `BLOOD PIXEL // DEV\n` +
      `fps     ${this.fpsEma.toFixed(0)}\n` +
      `rAF ms  ${median.toFixed(1)} med  ${p95.toFixed(1)} p95  ${worst.toFixed(1)} max\n` +
      `phase   ${st.phase}\n` +
      `pos     ${st.x.toFixed(0)}, ${st.y.toFixed(0)}\n` +
      `hp      ${st.hp.toFixed(0)} / ${st.maxHp}\n` +
      `enemies ${st.activeEnemyCount}  (spawned ${st.totalSpawned})\n` +
      `kills   ${st.killCount}\n` +
      `proj    ${w ? w.projectiles.length : 0}   pickups ${w ? w.pickups.length : 0}\n` +
      `weapon  ${st.activeWeapon}\n` +
      `level   ${st.level}   xp ${st.xp}\n` +
      `tilt    ${this.camera.tilt.toFixed(2)}\n` +
      `god     ${st.godMode ? 'ON' : 'off'}   muted ${this.audio.isMuted ? 'ON' : 'off'}`;
  }

  private createCheatPanel(): void {
    const el = document.createElement('div');
    el.id = 'cheat-panel';
    el.style.cssText =
      'position:absolute;right:12px;top:120px;display:none;flex-direction:column;gap:4px;' +
      'z-index:200;pointer-events:auto;font-family:\'Share Tech Mono\',monospace;' +
      'background:rgba(0,0,0,0.85);border:1px solid #39ff14;padding:10px;min-width:190px;';
    el.innerHTML =
      '<div style="color:#39ff14;letter-spacing:2px;font-size:12px;margin-bottom:4px">CHEATS [F2]</div>' +
      '<button class="cheat-btn" id="cheat-testsim">TEST SIM: OFF</button>' +
      '<button class="cheat-btn" id="cheat-god">GOD MODE: OFF</button>' +
      '<button class="cheat-btn" id="cheat-heal">HEAL</button>' +
      '<button class="cheat-btn" id="cheat-ammo">FULL AMMO</button>' +
      '<button class="cheat-btn" id="cheat-xp">+500 XP</button>' +
      '<button class="cheat-btn" id="cheat-upg">MAX UPGRADES</button>' +
      '<button class="cheat-btn" id="cheat-weapons">UNLOCK WEAPONS</button>' +
      '<button class="cheat-btn" id="cheat-missions">UNLOCK MISSIONS</button>' +
      '<button class="cheat-btn" id="cheat-killall">KILL ALL</button>' +
      '<button class="cheat-btn" id="cheat-spawnboss">SPAWN BOSS</button>' +
      '<button class="cheat-btn" id="cheat-spawnmascots">SPAWN MASCOTS</button>' +
      '<button class="cheat-btn" id="cheat-spawnwave">SPAWN MIXED WAVE</button>' +
      '<button class="cheat-btn" id="cheat-stress">STRESS +100</button>' +
      '<button class="cheat-btn" id="cheat-clear">CLEAR ENEMIES</button>' +
      '<button class="cheat-btn" id="cheat-skip">SKIP MISSION</button>' +
      '<button class="cheat-btn" id="cheat-die">KILL PLAYER</button>';

    const style = document.createElement('style');
    style.textContent =
      '.cheat-btn{font-family:inherit;font-size:11px;color:#39ff14;background:#0d2a0d;' +
      'border:1px solid #1a3a1a;padding:5px 8px;cursor:pointer;text-align:left;letter-spacing:1px;}' +
      '.cheat-btn:hover{background:#154015;border-color:#39ff14;}' +
      '.cheat-btn:focus-visible{outline:2px solid #39ff14;outline-offset:2px;}';
    document.head.appendChild(style);

    document.getElementById('ui-layer')!.appendChild(el);
    this.cheatPanel = el;
    this.cheatGodBtn = el.querySelector<HTMLButtonElement>('#cheat-god');
    this.cheatTestSimBtn = el.querySelector<HTMLButtonElement>('#cheat-testsim');

    el.querySelector('#cheat-testsim')!.addEventListener('click', () => {
      this.state.testSimulationMode = !this.state.testSimulationMode;
      if (this.state.testSimulationMode) {
        this.state.godMode = true;
        const types = Object.keys(ZOMBIES) as ZombieType[];
        for (const t of types) this.cheatSpawn(t, 1);
      }
      this.syncCheatButtons();
    });
    el.querySelector('#cheat-god')!.addEventListener('click', () => {
      this.state.godMode = !this.state.godMode;
      this.syncCheatButtons();
    });
    el.querySelector('#cheat-heal')!.addEventListener('click', () => this.cheatHeal());
    el.querySelector('#cheat-ammo')!.addEventListener('click', () => this.cheatFullAmmo());
    el.querySelector('#cheat-xp')!.addEventListener('click', () => this.cheatXp(500));
    el.querySelector('#cheat-upg')!.addEventListener('click', () => this.cheatMaxUpgrades());
    el.querySelector('#cheat-weapons')!.addEventListener('click', () => this.cheatUnlockWeapons());
    el.querySelector('#cheat-missions')!.addEventListener('click', () => this.cheatUnlockMissions());
    el.querySelector('#cheat-killall')!.addEventListener('click', () => this.killAll());
    el.querySelector('#cheat-spawnboss')!.addEventListener('click', () => this.cheatSpawn('abomination', 1));
    el.querySelector('#cheat-spawnmascots')!.addEventListener('click', () => {
      this.cheatSpawn('grok', 1);
      this.cheatSpawn('claude', 1);
      this.cheatSpawn('codex', 1);
      this.cheatSpawn('muse', 1);
    });
    el.querySelector('#cheat-spawnwave')!.addEventListener('click', () => {
      this.cheatSpawn('crawler', 4);
      this.cheatSpawn('armored', 2);
      this.cheatSpawn('exploder', 2);
      this.cheatSpawn('spitter', 1);
    });
    el.querySelector('#cheat-stress')!.addEventListener('click', () => this.cheatSpawn('walker', 100));
    el.querySelector('#cheat-clear')!.addEventListener('click', () => this.clearEnemies());
    el.querySelector('#cheat-skip')!.addEventListener('click', () => this.cheatSkipMission());
    el.querySelector('#cheat-die')!.addEventListener('click', () => this.killPlayer());
  }

  private toggleCheatPanel(): void {
    if (!this.cheatPanel) return;
    const show = this.cheatPanel.style.display === 'none';
    this.cheatPanel.style.display = show ? 'flex' : 'none';
    this.input.state.lookDeltaX = 0;
    this.setCanvasCursor(this.state.phase !== 'COUNTDOWN' && this.state.phase !== 'PLAYING');
    if (show) this.syncCheatButtons();
  }

  private syncCheatButtons(): void {
    if (this.cheatGodBtn) {
      this.cheatGodBtn.textContent = `GOD MODE: ${this.state.godMode ? 'ON' : 'OFF'}`;
    }
    if (this.cheatTestSimBtn) {
      this.cheatTestSimBtn.textContent = `TEST SIM: ${this.state.testSimulationMode ? 'ON' : 'OFF'}`;
    }
  }

  // ── Cheat actions ──

  private cheatHeal(): void {
    const w = this.world;
    if (!w) return;
    w.player.hp = w.player.maxHp;
    this.state.hp = w.player.hp;
  }

  private cheatFullAmmo(): void {
    for (const w of this.state.unlockedWeapons) {
      this.state.magazines[w] = WEAPONS[w].magazineSize;
      this.state.reserves[w] = WEAPONS[w].reserveAmmo;
    }
  }

  private cheatXp(amount: number): void {
    const before = levelForXp(this.state.xp);
    this.state.xp += amount;
    const after = levelForXp(this.state.xp);
    this.state.level = after;
    applyMilestones(this.state, before, after);
    this.commit();
  }

  private cheatMaxUpgrades(): void {
    const ranks = this.state.upgradeRanks;
    for (const k of Object.keys(ranks) as UpgradeId[]) ranks[k] = 5;
    this.commit();
  }

  private cheatUnlockWeapons(): void {
    for (const w of ['pistol', 'shotgun', 'smg', 'rifle'] as WeaponId[]) {
      if (!this.state.unlockedWeapons.includes(w)) this.state.unlockedWeapons.push(w);
    }
    this.commit();
  }

  private cheatUnlockMissions(): void {
    this.state.highestUnlocked = MISSIONS.length;
    this.refreshMissionSelect();
    this.commit();
  }

  private cheatSkipMission(): void {
    if (this.state.phase === 'PLAYING' || this.state.phase === 'COUNTDOWN') {
      this.completeMission();
    }
  }

  private killAll(): void {
    const w = this.world;
    if (!w) return;
    for (const z of [...w.zombies]) {
      if (z.state !== 'dead') damageZombie(w, z, 99999);
    }
  }

  /** Dev tool: spawn N of a zombie type in a ring around the player. */
  private cheatSpawn(type: ZombieType, count = 1): void {
    const w = this.world;
    if (!w) return;
    const def = ZOMBIES[type];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 220 + Math.random() * 120;
      const x = Math.max(40, Math.min(w.arena.worldWidth - 40, w.player.x + Math.cos(angle) * radius));
      const y = Math.max(40, Math.min(w.arena.worldHeight - 40, w.player.y + Math.sin(angle) * radius));
      const z = createZombie(w.nextId(), type, x, y, def, { hp: 1, speed: 1, damage: 1 });
      w.zombies.push(z);
      w.state.totalSpawned += 1;
      if (z.isBoss) {
        w.state.bossSpawned = true;
        w.state.bossName = def.name;
      }
      w.events.onZombieSpawned(z);
    }
  }

  /** Dev tool: remove every enemy from the field (perf teardown). */
  private clearEnemies(): void {
    const w = this.world;
    if (!w) return;
    for (const z of [...w.zombies]) {
      z.state = 'dead';
      z.deathTimer = 0;
      w.events.onZombieRemoved(z.id);
    }
    w.zombies.length = 0;
  }

  private killPlayer(): void {
    const w = this.world;
    if (!w) return;
    w.player.invulnerableTimer = 0;
    w.player.spitterInvulnTimer = 0;
    w.state.invulnerableTimer = 0;
    damagePlayer(w, null, 0, 0, 'acid', 99999);
  }

  private exposeDebugApi(): void {
    const self = this;
    (window as unknown as { __bp?: unknown }).__bp = {
      phase: () => self.state.phase,
      snapshot: () => ({
        phase: self.state.phase,
        hp: self.state.hp,
        kills: self.state.killCount,
        missionId: self.state.missionId,
        xp: self.state.xp,
        level: self.state.level,
        unlocked: self.state.highestUnlocked,
        completed: [...self.state.completedMissions],
        enemies: self.world?.zombies.length ?? 0,
        spawned: self.state.totalSpawned,
        fps: Math.round(self.fpsEma),
        god: self.state.godMode,
        tilt: self.camera.tilt,
        muted: self.audio.isMuted,
      }),
      god: (on?: boolean) => {
        self.state.godMode = on ?? !self.state.godMode;
        self.syncCheatButtons();
        return self.state.godMode;
      },
      heal: () => self.cheatHeal(),
      fullAmmo: () => self.cheatFullAmmo(),
      giveXp: (n = 500) => self.cheatXp(n),
      maxUpgrades: () => self.cheatMaxUpgrades(),
      unlockWeapons: () => self.cheatUnlockWeapons(),
      unlockAllMissions: () => self.cheatUnlockMissions(),
      killAll: () => self.killAll(),
      spawn: (type: ZombieType, count = 1) => self.cheatSpawn(type, count),
      spawnBoss: () => self.cheatSpawn('abomination', 1),
      stress: (n = 100) => self.cheatSpawn('walker', n),
      clearEnemies: () => self.clearEnemies(),
      killPlayer: () => self.killPlayer(),
      skipMission: () => self.cheatSkipMission(),
      overlay: () => self.toggleDevOverlay(),
      cheats: () => self.toggleCheatPanel(),
      mute: () => self.audio.toggleMute(),
    };
  }
}
