/**
 * ScreenManager.ts
 * Manages all full-screen HTML overlays (menus, results, etc.).
 * Only one screen is visible at a time.
 *
 * Phase 2 — Vertical Slice
 */

import type { MissionDef } from '../config/missions';
import type { UpgradeId, GameSettings, BoolSettingKey } from '../game/GameState';

export type ScreenId =
  | 'main-menu'
  | 'mission-select'
  | 'mission-brief'
  | 'upgrade-select'
  | 'mission-complete'
  | 'mission-failed'
  | 'victory'
  | 'settings'
  | 'stats'
  | 'none';

export interface StatsScreenData {
  level: number;
  xp: number;
  missionsCompleted: number;
  totalKills: number;
  totalAttempts: number;
  shotsFired: number;
  shotsHit: number;
  accuracyPct: number;
  weaponsUnlocked: number;
  achievements: { name: string; desc: string; unlocked: boolean }[];
}

export interface MissionResultData {
  missionId: number;
  kills: number;
  accuracy: number;
  timeSec: number;
  xpEarned: number;
  firstCompletion: boolean;
  /** Achievement names unlocked by this mission. */
  achievements?: string[];
}

export interface UpgradeChoiceData {
  choices: UpgradeId[];
  ranks: Record<UpgradeId, number>;
  missionId: number;
}

const UPGRADE_LABELS: Record<UpgradeId, string> = {
  maxHp: '❤  +10% MAX HP',
  speed: '⚡ +10% MOVE SPEED',
  damage: '🔫 +10% WEAPON DAMAGE',
  reloadSpeed: '⟳  +10% RELOAD SPEED',
  fireRate: '◈  +10% FIRE RATE',
  maxAmmo: '▪  +10% MAX AMMO',
};

export class ScreenManager {
  private current: ScreenId = 'none';
  private screens = new Map<ScreenId, HTMLElement>();
  private container: HTMLElement;

  // Callbacks
  onPlay: (() => void) | null = null;
  onMissionSelect: (() => void) | null = null;
  onSettings: (() => void) | null = null;
  /** Selecting a mission from the grid → show its brief */
  onMissionBrief: ((id: number) => void) | null = null;
  /** Actually start countdown/gameplay */
  onMissionStart: ((id: number) => void) | null = null;
  onMissionRestart: (() => void) | null = null;
  onMissionSelectFromResult: (() => void) | null = null;
  onNextMission: ((id: number) => void) | null = null;
  onUpgradeChosen: ((id: UpgradeId) => void) | null = null;
  /** All upgrades maxed — fallback button grants bonus XP instead */
  onAllUpgradesMaxed: (() => void) | null = null;
  onContinue: (() => void) | null = null;
  onSettingsClose: (() => void) | null = null;
  onResetProgress: (() => void) | null = null;
  onToggleSetting: ((key: BoolSettingKey, value: boolean) => void) | null = null;
  onVolumeChange: ((value: number) => void) | null = null;
  onStats: (() => void) | null = null;

  constructor(uiLayer: HTMLElement) {
    this.container = uiLayer;
    this._buildStyles();
    this._buildMainMenu();
    this._buildMissionSelect();
    this._buildMissionBrief();
    this._buildMissionComplete();
    this._buildMissionFailed();
    this._buildUpgradeSelect();
    this._buildVictory();
    this._buildSettings();
    this._buildStats();
    // Escape backs out of informational screens (gameplay pause is handled by Game)
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (this.current === 'settings' || this.current === 'stats') {
        e.preventDefault();
        this.show('main-menu');
      }
    });
  }

  show(id: ScreenId): void {
    for (const [sid, el] of this.screens) {
      el.style.display = sid === id ? 'flex' : 'none';
    }
    this.current = id;
  }

  hide(): void {
    this.show('none');
  }

  populateMissionSelect(missions: MissionDef[], completedIds: number[], highestUnlocked: number): void {
    const grid = document.getElementById('mission-select-grid');
    if (!grid) return;
    grid.innerHTML = '';

    for (const m of missions) {
      const unlocked = m.id <= highestUnlocked;
      const completed = completedIds.includes(m.id);

      const btn = document.createElement('button');
      btn.className = `mission-btn ${unlocked ? 'unlocked' : 'locked'} ${completed ? 'completed' : ''}`;
      btn.disabled = !unlocked;
      btn.innerHTML = `
        <span class="mission-num">${String(m.id).padStart(2, '0')}</span>
        <span class="mission-name">${m.title}</span>
        <span class="mission-status">${completed ? '✓' : unlocked ? '▶' : '🔒'}</span>
        <span class="mission-threat">${'●'.repeat(m.threatRating)}${'○'.repeat(5 - m.threatRating)}</span>
      `;
      btn.onclick = () => this.onMissionBrief?.(m.id);
      grid.appendChild(btn);
    }
  }

  populateMissionBrief(mission: MissionDef): void {
    this._text('brief-title', mission.title);
    this._text('brief-subtitle', mission.subtitle);
    this._text('brief-mission-num', `MISSION ${String(mission.id).padStart(2, '0')}`);
    this._text('brief-map', mission.mapId.toUpperCase());

    const obj = mission.objective;
    let objText = '';
    if (obj.type === 'survive') objText = `SURVIVE ${obj.durationSeconds}s`;
    else if (obj.type === 'kill') objText = `KILL ${obj.target} ZOMBIES`;
    else if (obj.type === 'eliminate') objText = `ELIMINATE ALL WAVES`;
    else if (obj.type === 'boss') objText = `KILL THE ABOMINATION`;
    else if (obj.type === 'survive_then_eliminate') objText = `SURVIVE ${obj.durationSeconds}s + FINAL HORDE`;
    this._text('brief-objective', objText);

    this._text('brief-threat', '●'.repeat(mission.threatRating) + '○'.repeat(5 - mission.threatRating));

    const startBtn = document.getElementById('brief-start-btn');
    if (startBtn) startBtn.onclick = () => this.onMissionStart?.(mission.id);

    const backBtn = document.getElementById('brief-back-btn');
    if (backBtn) backBtn.onclick = () => { this.onMissionSelect?.(); this.show('mission-select'); };
  }

  populateMissionComplete(data: MissionResultData): void {
    this._text('complete-mission', `MISSION ${String(data.missionId).padStart(2, '0')} COMPLETE`);
    this._text('complete-kills', `Kills: ${data.kills}`);
    this._text('complete-accuracy', `Accuracy: ${Math.round(data.accuracy)}%`);
    this._text('complete-time', `Time: ${this._fmtTime(data.timeSec)}`);
    this._text('complete-xp', `+${data.xpEarned} XP`);

    const upgradeBtn = document.getElementById('complete-upgrade-btn');
    if (upgradeBtn) upgradeBtn.style.display = data.firstCompletion ? 'block' : 'none';

    const nextBtn = document.getElementById('complete-next-btn');
    if (nextBtn) {
      nextBtn.style.display = data.firstCompletion ? 'none' : 'block';
      nextBtn.onclick = () => this.onNextMission?.(data.missionId + 1);
    }

    this._renderAchievements('complete-achievements', data.achievements ?? []);
  }

  private _renderAchievements(containerId: string, names: string[]): void {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (names.length === 0) {
      el.style.display = 'none';
      el.innerHTML = '';
      return;
    }
    el.style.display = 'block';
    el.innerHTML = names
      .map((n) => `<div class="result-ach">★ ACHIEVEMENT — ${n}</div>`)
      .join('');
  }

  populateMissionFailed(data: { kills: number; timeSec: number; missionId: number; achievements?: string[] }): void {
    this._text('failed-kills', `Zombies Killed: ${data.kills}`);
    this._text('failed-time', `Time Survived: ${this._fmtTime(data.timeSec)}`);
    this._renderAchievements('failed-achievements', data.achievements ?? []);
  }

  populateUpgradeSelect(data: UpgradeChoiceData): void {
    const list = document.getElementById('upgrade-choices');
    if (!list) return;
    list.innerHTML = '';

    if (data.choices.length === 0) {
      // All upgrades maxed — fallback
      const item = document.createElement('button');
      item.className = 'upgrade-btn';
      item.innerHTML = '⚡ All upgrades maxed! +100 XP';
      item.onclick = () => this.onAllUpgradesMaxed?.();
      list.appendChild(item);
      return;
    }

    for (const id of data.choices) {
      const rank = data.ranks[id];
      const item = document.createElement('button');
      item.className = 'upgrade-btn';
      item.innerHTML = `${UPGRADE_LABELS[id]}<span class="upgrade-rank">RANK ${rank} → ${rank + 1}</span>`;
      item.onclick = () => this.onUpgradeChosen?.(id);
      list.appendChild(item);
    }
  }

  private _text(id: string, text: string): void {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  private _fmtTime(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  // ── Screen builders ──

  private _buildMainMenu(): void {
    const el = document.createElement('div');
    el.id = 'screen-main-menu';
    el.className = 'screen';
    el.innerHTML = `
      <div class="menu-bg-art" aria-hidden="true"></div>
      <div class="menu-box">
        <div class="menu-title glitch" data-text="BLOOD PIXEL">BLOOD PIXEL</div>
        <div class="menu-subtitle">AFTER THE FALL · 15 OPERATIONS</div>
        <div class="menu-sep">⸻⸻⸻⸻⸻</div>
        <button id="mm-play" class="menu-btn primary">DEPLOY</button>
        <button id="mm-missions" class="menu-btn">OPERATIONS</button>
        <button id="mm-stats" class="menu-btn">SURVIVOR RECORD</button>
        <button id="mm-settings" class="menu-btn">OPTIONS</button>
        <div class="menu-footer">WASD MOVE  ·  MOUSE AIM  ·  V VIEW  ·  ESC PAUSE</div>
        <div id="visitor-counter-mount" class="menu-counter"></div>
      </div>
    `;
    el.querySelector('#mm-play')!.addEventListener('click', () => this.onPlay?.());
    el.querySelector('#mm-missions')!.addEventListener('click', () => { this.onMissionSelect?.(); this.show('mission-select'); });
    el.querySelector('#mm-stats')!.addEventListener('click', () => { this.onStats?.(); this.show('stats'); });
    el.querySelector('#mm-settings')!.addEventListener('click', () => { this.onSettings?.(); this.show('settings'); });
    this.container.appendChild(el);
    this.screens.set('main-menu', el);
  }

  private _buildMissionSelect(): void {
    const el = document.createElement('div');
    el.id = 'screen-mission-select';
    el.className = 'screen';
    el.innerHTML = `
      <div class="screen-box">
        <div class="screen-title">OPERATIONS</div>
        <div id="mission-select-grid" class="mission-grid"></div>
        <button class="menu-btn" id="ms-back">BACK</button>
      </div>
    `;
    el.querySelector('#ms-back')!.addEventListener('click', () => this.show('main-menu'));
    this.container.appendChild(el);
    this.screens.set('mission-select', el);
  }

  private _buildMissionBrief(): void {
    const el = document.createElement('div');
    el.id = 'screen-mission-brief';
    el.className = 'screen';
    el.innerHTML = `
      <div class="screen-box brief-box">
        <div id="brief-mission-num" class="brief-num">MISSION 01</div>
        <div id="brief-title" class="screen-title">FIRST BLOOD</div>
        <div id="brief-subtitle" class="brief-sub">They've reached the town.</div>
        <div class="brief-row"><span class="brief-label">MAP</span><span id="brief-map">TOWN</span></div>
        <div class="brief-row"><span class="brief-label">OBJECTIVE</span><span id="brief-objective">KILL 20</span></div>
        <div class="brief-row"><span class="brief-label">THREAT</span><span id="brief-threat" class="threat-dots">●○○○○</span></div>
        <div class="brief-actions">
          <button id="brief-start-btn" class="menu-btn primary">ENTER THE RUINS</button>
          <button id="brief-back-btn" class="menu-btn">BACK</button>
        </div>
      </div>
    `;
    this.container.appendChild(el);
    this.screens.set('mission-brief', el);
  }

  private _buildMissionComplete(): void {
    const el = document.createElement('div');
    el.id = 'screen-mission-complete';
    el.className = 'screen';
    el.innerHTML = `
      <div class="screen-box result-box">
        <div class="result-banner complete-banner">MISSION COMPLETE</div>
        <div id="complete-mission" class="result-mission">MISSION 01 COMPLETE</div>
        <div class="result-stats">
          <div class="result-row"><span>Zombies Killed:</span><span id="complete-kills">0</span></div>
          <div class="result-row"><span>Accuracy:</span><span id="complete-accuracy">0%</span></div>
          <div class="result-row"><span>Time:</span><span id="complete-time">00:00</span></div>
          <div class="result-row xp-row"><span>XP Earned:</span><span id="complete-xp">+0</span></div>
        </div>
        <div id="complete-achievements" class="result-achievements" style="display:none"></div>
        <div class="result-actions">
          <button id="complete-upgrade-btn" class="menu-btn primary" style="display:none">CHOOSE UPGRADE</button>
          <button id="complete-next-btn" class="menu-btn primary" style="display:none">NEXT OPERATION</button>
          <button id="complete-missions-btn" class="menu-btn">[ OPERATIONS ]</button>
        </div>
      </div>
    `;
    el.querySelector('#complete-upgrade-btn')!.addEventListener('click', () => this.show('upgrade-select'));
    el.querySelector('#complete-missions-btn')!.addEventListener('click', () => { this.onMissionSelectFromResult?.(); this.show('mission-select'); });
    this.container.appendChild(el);
    this.screens.set('mission-complete', el);
  }

  private _buildMissionFailed(): void {
    const el = document.createElement('div');
    el.id = 'screen-mission-failed';
    el.className = 'screen';
    el.innerHTML = `
      <div class="screen-box result-box">
        <div class="result-banner failed-banner">MISSION FAILED</div>
        <div class="result-stats">
          <div class="result-row"><span>Zombies Killed:</span><span id="failed-kills">0</span></div>
          <div class="result-row"><span>Time Survived:</span><span id="failed-time">00:00</span></div>
        </div>
        <div id="failed-achievements" class="result-achievements" style="display:none"></div>
        <div class="result-actions">
          <button id="failed-retry" class="menu-btn primary">TRY AGAIN</button>
          <button id="failed-missions" class="menu-btn">[ OPERATIONS ]</button>
        </div>
      </div>
    `;
    el.querySelector('#failed-retry')!.addEventListener('click', () => this.onMissionRestart?.());
    el.querySelector('#failed-missions')!.addEventListener('click', () => { this.onMissionSelectFromResult?.(); this.show('mission-select'); });
    this.container.appendChild(el);
    this.screens.set('mission-failed', el);
  }

  private _buildUpgradeSelect(): void {
    const el = document.createElement('div');
    el.id = 'screen-upgrade-select';
    el.className = 'screen';
    el.innerHTML = `
      <div class="screen-box">
        <div class="screen-title">FIELD UPGRADE</div>
        <div id="upgrade-choices" class="upgrade-list"></div>
      </div>
    `;
    this.container.appendChild(el);
    this.screens.set('upgrade-select', el);
  }

  private _buildVictory(): void {
    const el = document.createElement('div');
    el.id = 'screen-victory';
    el.className = 'screen';
    el.innerHTML = `
      <div class="screen-box victory-box">
        <div class="victory-title">YOU SURVIVED</div>
        <div class="victory-sub">THE RUINS ARE QUIET. FOR NOW.</div>
        <div class="victory-note">You held the line through every operation. The wasteland remembers.</div>
        <button id="victory-menu" class="menu-btn primary">RETURN TO CAMP</button>
      </div>
    `;
    el.querySelector('#victory-menu')!.addEventListener('click', () => this.show('main-menu'));
    this.container.appendChild(el);
    this.screens.set('victory', el);
  }

  private _buildSettings(): void {
    const el = document.createElement('div');
    el.id = 'screen-settings';
    el.className = 'screen';
    el.innerHTML = `
      <div class="screen-box settings-box">
        <div class="screen-title">SETTINGS</div>
        <div class="settings-row">
          <label>Sound</label>
          <button id="setting-sound" class="toggle-btn" data-key="soundEnabled">ON</button>
        </div>
        <div class="settings-row">
          <label>Volume</label>
          <input id="setting-volume" class="volume-slider" type="range" min="0" max="100" step="5" value="70" />
        </div>
        <div class="settings-row">
          <label>Overhead Angle</label>
          <button id="setting-depth" class="toggle-btn" data-key="depthTilt">ON</button>
        </div>
        <div class="settings-row">
          <label>Atmosphere Filter</label>
          <button id="setting-crt" class="toggle-btn" data-key="crtEnabled">ON</button>
        </div>
        <div class="settings-row">
          <label>Screen Shake</label>
          <button id="setting-shake" class="toggle-btn" data-key="screenShake">ON</button>
        </div>
        <div class="settings-row">
          <label>Film Grain</label>
          <button id="setting-dither" class="toggle-btn" data-key="dithering">ON</button>
        </div>
        <div class="settings-row">
          <label>Damage Numbers</label>
          <button id="setting-dmg" class="toggle-btn" data-key="damageNumbers">ON</button>
        </div>
        <div class="settings-row">
          <label>Reduced Motion</label>
          <button id="setting-motion" class="toggle-btn" data-key="reducedMotion">OFF</button>
        </div>
        <div class="settings-row">
          <label>High Contrast</label>
          <button id="setting-contrast" class="toggle-btn" data-key="highContrast">OFF</button>
        </div>
        <div class="settings-row">
          <label>Colorblind Mode</label>
          <button id="setting-colorblind" class="toggle-btn" data-key="colorblindMode">OFF</button>
        </div>
        <div class="settings-row">
          <label>Fullscreen</label>
          <button id="setting-fullscreen" class="toggle-btn" data-key="fullscreen">OFF</button>
        </div>
        <div class="settings-sep"></div>
        <button id="setting-reset" class="menu-btn danger">RESET PROGRESS</button>
        <button id="settings-close" class="menu-btn">CLOSE</button>
      </div>
    `;
    el.querySelector('#settings-close')!.addEventListener('click', () => { this.onSettingsClose?.(); this.show('main-menu'); });
    const volume = el.querySelector<HTMLInputElement>('#setting-volume');
    if (volume) {
      volume.addEventListener('input', () => this.onVolumeChange?.(Number(volume.value)));
    }
    el.querySelector('#setting-reset')!.addEventListener('click', () => {
      if (confirm('Reset all progress? This cannot be undone.')) {
        this.onResetProgress?.();
      }
    });
    // Toggle buttons
    el.querySelectorAll<HTMLButtonElement>('.toggle-btn').forEach((btn) => {
      const key = btn.dataset.key as BoolSettingKey | undefined;
      if (!key) return;
      btn.addEventListener('click', () => {
        const cur = btn.textContent?.trim() === 'ON';
        const next = !cur;
        btn.textContent = next ? 'ON' : 'OFF';
        btn.classList.toggle('off', !next);
        this.onToggleSetting?.(key, next);
      });
    });
    this.container.appendChild(el);
    this.screens.set('settings', el);
  }

  populateStats(data: StatsScreenData): void {
    this._text('stats-level', `LV ${data.level}`);
    this._text('stats-xp', `${data.xp} XP`);
    this._text('stats-missions', `${data.missionsCompleted} / 15`);
    this._text('stats-kills', String(data.totalKills));
    this._text('stats-attempts', String(data.totalAttempts));
    this._text('stats-shots', `${data.shotsFired} fired / ${data.shotsHit} hit`);
    this._text('stats-accuracy', `${Math.round(data.accuracyPct)}%`);
    this._text('stats-weapons', `${data.weaponsUnlocked} / 4`);

    const list = document.getElementById('stats-achievements');
    if (!list) return;
    list.innerHTML = '';
    for (const a of data.achievements) {
      const row = document.createElement('div');
      row.className = `ach-row ${a.unlocked ? 'unlocked' : 'locked'}`;
      row.innerHTML =
        `<span class="ach-mark">${a.unlocked ? '★' : '☆'}</span>` +
        `<span class="ach-text"><span class="ach-name">${a.name}</span>` +
        `<span class="ach-desc">${a.desc}</span></span>`;
      list.appendChild(row);
    }
    const count = document.getElementById('stats-ach-count');
    if (count) {
      const got = data.achievements.filter((a) => a.unlocked).length;
      count.textContent = `${got} / ${data.achievements.length}`;
    }
  }

  /** Reflect current settings into the toggle buttons (call after load/reset). */
  syncSettings(settings: GameSettings): void {
    const map: Record<string, keyof GameSettings> = {
      'setting-sound': 'soundEnabled',
      'setting-crt': 'crtEnabled',
      'setting-shake': 'screenShake',
      'setting-dither': 'dithering',
      'setting-dmg': 'damageNumbers',
      'setting-motion': 'reducedMotion',
      'setting-contrast': 'highContrast',
      'setting-depth': 'depthTilt',
      'setting-colorblind': 'colorblindMode',
      'setting-fullscreen': 'fullscreen',
    };
    for (const [id, key] of Object.entries(map)) {
      const btn = document.getElementById(id);
      if (!btn) continue;
      const on = Boolean(settings[key]);
      btn.textContent = on ? 'ON' : 'OFF';
      btn.classList.toggle('off', !on);
    }
    const volume = document.getElementById('setting-volume') as HTMLInputElement | null;
    if (volume) volume.value = String(settings.masterVolume);
  }

  private _buildStats(): void {
    const el = document.createElement('div');
    el.id = 'screen-stats';
    el.className = 'screen';
    el.innerHTML = `
      <div class="screen-box stats-box">
        <div class="screen-title">SURVIVOR RECORD</div>
        <div class="stats-grid">
          <div class="stats-row"><span>LEVEL</span><span id="stats-level">LV 1</span></div>
          <div class="stats-row"><span>EXPERIENCE</span><span id="stats-xp">0 XP</span></div>
          <div class="stats-row"><span>MISSIONS</span><span id="stats-missions">0 / 15</span></div>
          <div class="stats-row"><span>TOTAL KILLS</span><span id="stats-kills">0</span></div>
          <div class="stats-row"><span>ATTEMPTS</span><span id="stats-attempts">0</span></div>
          <div class="stats-row"><span>SHOTS</span><span id="stats-shots">0 fired / 0 hit</span></div>
          <div class="stats-row"><span>ACCURACY</span><span id="stats-accuracy">0%</span></div>
          <div class="stats-row"><span>WEAPONS</span><span id="stats-weapons">1 / 4</span></div>
        </div>
        <div class="stats-sep">
          <span>ACHIEVEMENTS</span><span id="stats-ach-count">0 / 0</span>
        </div>
        <div id="stats-achievements" class="ach-list"></div>
        <button id="stats-close" class="menu-btn">BACK</button>
      </div>
    `;
    el.querySelector('#stats-close')!.addEventListener('click', () => this.show('main-menu'));
    this.container.appendChild(el);
    this.screens.set('stats', el);
  }

  private _buildStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .screen {
        position: absolute; inset: 0;
        display: none; /* shown via show() */
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: rgba(4, 8, 4, 0.94);
        font-family: 'Share Tech Mono', monospace;
        color: #39ff14;
        z-index: 100;
        pointer-events: auto;
      }

      .screen-box {
        border: 2px solid #1a3a1a;
        padding: 32px 40px;
        min-width: 380px;
        max-width: 560px;
        background: rgba(0,0,0,0.8);
        display: flex;
        flex-direction: column;
        gap: 14px;
        align-items: center;
      }

      .screen-title {
        font-size: 22px;
        letter-spacing: 4px;
        color: #39ff14;
        text-shadow: 0 0 12px #39ff14;
        text-align: center;
      }

      /* Main Menu */
      .menu-bg-art {
        position: absolute; inset: 0;
        background: radial-gradient(ellipse at center, #0a150a 0%, #030603 100%);
      }

      .menu-box {
        position: relative; z-index: 1;
        display: flex; flex-direction: column;
        align-items: center; gap: 18px;
        background: rgba(0,0,0,0.7);
        border: 2px solid #1a3a1a;
        padding: 48px 64px;
        min-width: 360px;
      }

      .menu-title {
        font-size: 48px;
        letter-spacing: 8px;
        color: #39ff14;
        text-shadow: 0 0 20px #39ff14, 0 0 60px #00aa00;
        animation: title-flicker 4s ease-in-out infinite;
      }

      @keyframes title-flicker {
        0%, 92%, 96%, 100% { opacity: 1; }
        94% { opacity: 0.85; }
        95% { opacity: 1; }
      }

      .glitch { position: relative; }

      .menu-subtitle {
        font-size: 14px; letter-spacing: 6px;
        color: #5a8a5a; margin-top: -10px;
      }

      .menu-sep { color: #1a3a1a; font-size: 13px; }
      .menu-footer { font-size: 11px; color: #2a4a2a; margin-top: 8px; }

      .menu-btn {
        font-family: 'Share Tech Mono', monospace;
        font-size: 15px;
        letter-spacing: 3px;
        color: #39ff14;
        background: transparent;
        border: 1px solid #1a3a1a;
        padding: 10px 28px;
        cursor: pointer;
        transition: all 0.15s;
        width: 100%;
        text-align: center;
      }

      .menu-btn:hover { background: #0d2a0d; border-color: #39ff14; text-shadow: 0 0 8px #39ff14; }
      .menu-btn.primary { border-color: #39ff14; color: #39ff14; }
      .menu-btn.danger { border-color: #ff2222; color: #ff2222; }
      .menu-btn.danger:hover { background: #2a0000; }

      /* Mission Select */
      .mission-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px;
        max-height: 420px;
        overflow-y: auto;
        width: 100%;
        padding: 4px;
      }

      .mission-btn {
        font-family: 'Share Tech Mono', monospace;
        font-size: 12px;
        background: rgba(0,0,0,0.6);
        border: 1px solid #1a3a1a;
        color: #5a7a5a;
        padding: 8px 10px;
        cursor: default;
        display: grid;
        grid-template-columns: 28px 1fr 20px;
        grid-template-rows: auto auto;
        gap: 2px 6px;
        text-align: left;
        pointer-events: none;
      }

      .mission-btn.unlocked { color: #39ff14; cursor: pointer; pointer-events: auto; }
      .mission-btn.unlocked:hover { background: #0d2a0d; border-color: #39ff14; }
      .mission-btn.completed { border-color: #39ff14; }
      .mission-btn.locked { opacity: 0.4; }

      .mission-num { font-size: 14px; color: #5a9a5a; }
      .mission-name { font-size: 11px; }
      .mission-status { text-align: right; color: #39ff14; }
      .mission-threat { grid-column: 1 / -1; font-size: 9px; color: #ff6600; letter-spacing: 1px; }

      /* Brief */
      .brief-box { min-width: 420px; }
      .brief-num { font-size: 11px; letter-spacing: 3px; color: #5a7a5a; }
      .brief-sub { font-size: 13px; color: #aaffaa; text-align: center; }
      .brief-row { display: flex; justify-content: space-between; width: 100%; font-size: 13px; }
      .brief-label { color: #5a7a5a; }
      .threat-dots { color: #ff6600; letter-spacing: 3px; }
      .brief-actions { display: flex; gap: 12px; width: 100%; }

      /* Results */
      .result-box { min-width: 380px; }
      .result-banner { font-size: 20px; letter-spacing: 4px; padding: 10px; text-align: center; width: 100%; }
      .complete-banner { color: #39ff14; background: #0d2a0d; border: 1px solid #39ff14; }
      .failed-banner { color: #ff2222; background: #2a0000; border: 1px solid #ff2222; }
      .result-mission { font-size: 13px; color: #5a8a5a; }
      .result-stats { display: flex; flex-direction: column; gap: 8px; width: 100%; }
      .result-row { display: flex; justify-content: space-between; font-size: 14px; }
      .xp-row span:last-child { color: #ffff44; }
      .result-actions { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; width: 100%; }
      .result-achievements { width: 100%; text-align: center; }
      .result-ach { font-size: 12px; color: #66ddff; letter-spacing: 1px; margin-top: 4px; }

      /* Upgrade */
      .upgrade-list { display: flex; flex-direction: column; gap: 12px; width: 100%; }
      .upgrade-btn {
        font-family: 'Share Tech Mono', monospace;
        font-size: 14px;
        color: #39ff14;
        background: rgba(0,0,0,0.7);
        border: 1px solid #1a3a1a;
        padding: 14px 20px;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        transition: all 0.15s;
      }
      .upgrade-btn:hover { background: #0d2a0d; border-color: #39ff14; }
      .upgrade-rank { font-size: 11px; color: #5a7a5a; }

      /* Victory */
      .victory-box { align-items: center; text-align: center; }
      .victory-title { font-size: 40px; letter-spacing: 6px; color: #39ff14; text-shadow: 0 0 30px #39ff14; }
      .victory-sub { font-size: 14px; color: #aaffaa; letter-spacing: 3px; }
      .victory-ascii { font-size: 13px; color: #5a9a5a; line-height: 1.6; font-family: monospace; }

      /* Settings */
      .settings-box { min-width: 360px; }
      .settings-row { display: flex; justify-content: space-between; align-items: center; width: 100%; font-size: 14px; }
      .settings-sep { width: 100%; height: 1px; background: #1a3a1a; margin: 6px 0; }
      .toggle-btn {
        font-family: 'Share Tech Mono', monospace;
        font-size: 12px;
        color: #39ff14;
        background: #0d2a0d;
        border: 1px solid #1a3a1a;
        padding: 4px 14px;
        cursor: pointer;
        min-width: 50px;
      }
      .toggle-btn.off { color: #ff2222; background: #200000; }
      .volume-slider { width: 130px; accent-color: #39ff14; cursor: pointer; }

      /* Keyboard accessibility */
      .menu-btn:focus-visible,
      .toggle-btn:focus-visible,
      .upgrade-btn:focus-visible,
      .mission-btn:focus-visible,
      .volume-slider:focus-visible {
        outline: 2px solid #39ff14;
        outline-offset: 2px;
      }
      @media (prefers-reduced-motion: reduce) {
        .menu-title { animation: none; }
        .menu-btn, .upgrade-btn, .toggle-btn { transition: none; }
      }

      /* Stats */
      .stats-box { min-width: 460px; }
      .stats-grid { display: flex; flex-direction: column; gap: 6px; width: 100%; }
      .stats-row { display: flex; justify-content: space-between; font-size: 13px; }
      .stats-row span:first-child { color: #5a7a5a; letter-spacing: 2px; }
      .stats-sep {
        display: flex; justify-content: space-between; width: 100%;
        font-size: 11px; letter-spacing: 3px; color: #5a7a5a;
        border-top: 1px solid #1a3a1a; padding-top: 10px; margin-top: 4px;
      }
      .ach-list {
        display: grid; grid-template-columns: 1fr 1fr; gap: 4px 10px;
        width: 100%; max-height: 200px; overflow-y: auto;
      }
      .ach-row { display: flex; gap: 6px; align-items: flex-start; font-size: 11px; }
      .ach-row.locked { opacity: 0.45; }
      .ach-row.unlocked .ach-mark { color: #ffff44; }
      .ach-mark { font-size: 13px; line-height: 1.2; }
      .ach-text { display: flex; flex-direction: column; }
      .ach-name { letter-spacing: 1px; }
      .ach-desc { color: #5a7a5a; font-size: 10px; }
    `;
    document.head.appendChild(style);
  }
}
