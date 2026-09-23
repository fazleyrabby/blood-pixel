/**
 * HUD.ts
 * HTML/CSS overlay for in-game HUD elements.
 * Renders HP, ammo, XP bar, mission info, kill counter.
 *
 * Phase 2 — Vertical Slice
 */

export interface HUDData {
  hp: number;
  maxHp: number;
  ammoMag: number;
  ammoReserve: number;
  weaponName: string;
  reloading: boolean;
  xp: number;
  level: number;
  xpPct: number;      // 0–1
  killCount: number;
  killTarget: number | null;
  missionId: number;
  missionTimer: number; // seconds
  missionTimerTarget: number | null;
  countdown: number | null; // null if not counting down
  objective: string;
  bossActive: boolean;
  bossHp: number;
  bossMaxHp: number;
  bossName: string;
  reducedMotion: boolean;
}

export class HUD {
  private root: HTMLElement;
  private visible = false;
  private damageFlashUntil = 0;
  private bannerTimer: number | null = null;

  constructor(uiLayer: HTMLElement) {
    this.root = document.createElement('div');
    this.root.id = 'hud';
    this.root.innerHTML = this._template();
    uiLayer.appendChild(this.root);
    this._applyStyles();
    this.hide();
  }

  show(): void {
    this.root.style.display = 'block';
    this.visible = true;
  }

  hide(): void {
    this.root.style.display = 'none';
    this.visible = false;
  }

  update(data: HUDData): void {
    if (!this.visible) return;

    // HP bar
    const hpPct = Math.max(0, data.hp / data.maxHp);
    const hpColor = hpPct > 0.5 ? '#b6bc98' : hpPct > 0.25 ? '#d5a36d' : '#c45f4e';
    this._set('hud-hp-bar', `width: ${Math.round(hpPct * 100)}%; background: ${hpColor}`);
    this._text('hud-hp-text', `${Math.ceil(data.hp)} / ${data.maxHp}`);

    // Ammo
    const ammoLabel = data.reloading
      ? 'RELOADING...'
      : `${data.weaponName}  ${data.ammoMag} / ${data.ammoReserve}`;
    this._text('hud-ammo', ammoLabel);
    const ammoEl = document.getElementById('hud-ammo');
    if (ammoEl) {
      const low = !data.reloading && data.ammoMag <= 2;
      ammoEl.style.color = data.reloading ? '#d5a36d' : low ? '#c45f4e' : '#e2ba87';
      ammoEl.style.textShadow = low ? '0 0 10px #c45f4e' : 'none';
    }
    const ammoPct = data.ammoMag / Math.max(1, data.ammoMag + (data.reloading ? 0 : 0));
    void ammoPct; // ammo bar updated separately

    // Ammo pip bar
    const totalAmmo = data.ammoMag + data.ammoReserve;
    const maxAmmo = data.ammoMag + data.ammoReserve; // rough max
    void maxAmmo;
    this._set('hud-ammo-bar', `width: ${Math.round((data.ammoMag / Math.max(1, data.ammoMag + data.ammoReserve)) * 100)}%; background: #d5a36d`);

    // XP bar
    this._set('hud-xp-bar', `width: ${Math.round(data.xpPct * 100)}%; background: #b99573`);
    this._text('hud-level', `LV ${data.level}`);

    // Mission info
    this._text('hud-mission', `MISSION ${String(data.missionId).padStart(2, '0')}`);
    this._text('hud-objective', data.objective);

    // Kill counter
    if (data.killTarget !== null) {
      this._text('hud-kills', `KILLS: ${data.killCount} / ${data.killTarget}`);
    } else {
      this._text('hud-kills', `KILLS: ${data.killCount}`);
    }

    // Timer
    if (data.missionTimerTarget !== null) {
      const remaining = Math.max(0, data.missionTimerTarget - data.missionTimer);
      this._text('hud-timer', this._formatTime(remaining));
    } else {
      this._text('hud-timer', this._formatTime(data.missionTimer));
    }

    // Countdown
    const cdEl = document.getElementById('hud-countdown');
    if (cdEl) {
      if (data.countdown !== null && data.countdown > 0) {
        cdEl.style.display = 'block';
        cdEl.textContent = Math.ceil(data.countdown).toString();
      } else {
        cdEl.style.display = 'none';
      }
    }

    // Boss bar
    const bossWrap = document.getElementById('hud-boss');
    if (bossWrap) {
      if (data.bossActive) {
        bossWrap.style.display = 'block';
        this._text('hud-boss-name', data.bossName || 'BOSS');
        const pct = Math.max(0, Math.min(1, data.bossHp / Math.max(1, data.bossMaxHp)));
        this._set('hud-boss-bar', `width: ${Math.round(pct * 100)}%`);
      } else {
        bossWrap.style.display = 'none';
      }
    }

    // Damage / low-HP vignette
    const vig = document.getElementById('hud-vignette');
    if (vig) {
      const now = performance.now();
      let opacity = 0;
      if (hpPct < 0.25) {
        // Static under reduced motion; gentle pulse otherwise
        opacity = data.reducedMotion ? 0.16 : 0.1 + 0.16 * (0.5 + 0.5 * Math.sin(now / 260));
      }
      if (!data.reducedMotion && now < this.damageFlashUntil) {
        opacity = Math.max(opacity, 0.55);
      }
      vig.style.opacity = opacity.toFixed(3);
    }
  }

  /** Red edge flash when the player takes a hit. */
  flashDamage(): void {
    this.damageFlashUntil = performance.now() + 260;
  }

  /** Transient center-screen message (level up, achievement, wave warning). */
  showBanner(text: string, color = '#e6d3af'): void {
    const el = document.getElementById('hud-banner');
    if (!el) return;
    el.textContent = text;
    el.style.color = color;
    el.style.textShadow = `0 0 18px ${color}`;
    el.classList.add('show');
    if (this.bannerTimer !== null) window.clearTimeout(this.bannerTimer);
    this.bannerTimer = window.setTimeout(() => el.classList.remove('show'), 1600);
  }

  private _formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  private _set(id: string, style: string): void {
    const el = document.getElementById(id);
    if (el) el.style.cssText += ';' + style;
  }

  private _text(id: string, text: string): void {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  private _template(): string {
    return `
    <!-- Top Left: HP -->
    <div id="hud-hp" class="hud-panel hud-tl">
      <div class="hud-label">❤ HP</div>
      <div class="hud-bar-track"><div id="hud-hp-bar" class="hud-bar"></div></div>
      <div id="hud-hp-text" class="hud-value">100 / 100</div>
    </div>

    <!-- Top Center: Mission + Objective -->
    <div id="hud-mission-panel" class="hud-panel hud-tc">
      <div id="hud-mission" class="hud-mission-title">MISSION 01</div>
      <div id="hud-objective" class="hud-obj-text">KILL 20</div>
    </div>

    <!-- Top Right: Timer + Kills -->
    <div class="hud-panel hud-tr">
      <div id="hud-timer" class="hud-timer">00:00</div>
      <div id="hud-kills" class="hud-kills">KILLS: 0</div>
    </div>

    <!-- Bottom Left: Weapon + Ammo -->
    <div class="hud-panel hud-bl">
      <div id="hud-ammo" class="hud-ammo-text">PISTOL  12 / 72</div>
      <div class="hud-bar-track"><div id="hud-ammo-bar" class="hud-bar" style="background:#d5a36d"></div></div>
    </div>

    <!-- Bottom Right: XP / Level -->
    <div class="hud-panel hud-br">
      <div id="hud-level" class="hud-level">LV 1</div>
      <div class="hud-bar-track"><div id="hud-xp-bar" class="hud-bar" style="background:#b99573; width:0%"></div></div>
      <div class="hud-label">XP</div>
    </div>

    <!-- Center: Countdown -->
    <div id="hud-countdown" class="hud-countdown" style="display:none">3</div>

    <!-- Top Center (below objective): Boss bar -->
    <div id="hud-boss" class="hud-boss" style="display:none">
      <div id="hud-boss-name" class="hud-boss-name">ABOMINATION</div>
      <div class="hud-boss-track"><div id="hud-boss-bar" class="hud-boss-bar"></div></div>
    </div>

    <!-- Crosshair -->
    <div id="hud-crosshair" class="hud-crosshair">+</div>

    <!-- Damage / low-HP vignette -->
    <div id="hud-vignette" class="hud-vignette" style="opacity:0"></div>

    <!-- Transient banner -->
    <div id="hud-banner" class="hud-banner"></div>
    `;
  }

  private _applyStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      #hud { position: absolute; inset: 0; pointer-events: none; font-family: 'Share Tech Mono', monospace; color: #39ff14; z-index: 10; }

      .hud-panel {
        position: absolute;
        background: rgba(0,0,0,0.6);
        border: 1px solid #1a3a1a;
        padding: 6px 10px;
        font-size: 12px;
        min-width: 140px;
      }

      .hud-tl { top: 12px; left: 12px; }
      .hud-tc { top: 12px; left: 50%; transform: translateX(-50%); text-align: center; min-width: 200px; }
      .hud-tr { top: 12px; right: 12px; text-align: right; }
      .hud-bl { bottom: 12px; left: 12px; }
      .hud-br { bottom: 12px; right: 12px; text-align: right; }

      .hud-label { font-size: 10px; color: #5a7a5a; letter-spacing: 2px; text-transform: uppercase; }
      .hud-value { font-size: 13px; margin-top: 2px; }
      .hud-bar-track { width: 130px; height: 6px; background: #1a2a1a; margin: 4px 0; border-radius: 3px; overflow: hidden; }
      .hud-bar { height: 100%; transition: width 0.1s; }
      .hud-mission-title { font-size: 14px; letter-spacing: 3px; color: #39ff14; }
      .hud-obj-text { font-size: 11px; color: #aaffaa; margin-top: 3px; }
      .hud-timer { font-size: 20px; color: #ffff66; letter-spacing: 2px; }
      .hud-kills { font-size: 12px; color: #ff8844; margin-top: 4px; }
      .hud-ammo-text { font-size: 13px; color: #ffaa00; }
      .hud-level { font-size: 14px; color: #4488ff; letter-spacing: 2px; }

      .hud-countdown {
        position: absolute;
        left: 50%; top: 50%;
        transform: translate(-50%, -50%);
        font-size: 96px;
        color: #39ff14;
        text-shadow: 0 0 40px #39ff14, 0 0 80px #39ff14;
        animation: hud-pulse 0.5s ease-in-out infinite alternate;
      }

      @keyframes hud-pulse {
        from { transform: translate(-50%, -50%) scale(1); }
        to { transform: translate(-50%, -50%) scale(1.08); }
      }

      .hud-boss {
        position: absolute;
        top: 104px; left: 50%;
        transform: translateX(-50%);
        width: 420px;
        text-align: center;
      }
      .hud-boss-name {
        font-size: 12px; letter-spacing: 4px; color: #ff4444;
        text-shadow: 0 0 10px #c45f4e;
      }
      .hud-boss-track {
        width: 100%; height: 12px; background: #2a0a0a;
        border: 1px solid #ff2222; margin-top: 4px; overflow: hidden;
      }
      .hud-boss-bar {
        height: 100%; width: 100%;
        background: linear-gradient(90deg, #ff2222, #ff6644);
        transition: width 0.15s;
      }

      .hud-vignette {
        position: absolute; inset: 0;
        pointer-events: none;
        background: radial-gradient(ellipse at center, rgba(255,0,0,0) 42%, rgba(255,20,20,0.9) 100%);
        transition: opacity 0.12s linear;
      }

      .hud-banner {
        position: absolute;
        top: 30%; left: 50%;
        transform: translateX(-50%);
        font-size: 30px;
        letter-spacing: 8px;
        opacity: 0;
        transition: opacity 0.25s;
        text-align: center;
        white-space: nowrap;
      }
      .hud-banner.show { opacity: 1; }

      .hud-crosshair {
        position: absolute;
        width: 16px; height: 16px;
        display: flex; align-items: center; justify-content: center;
        color: rgba(57, 255, 20, 0.7);
        font-size: 18px;
        pointer-events: none;
        transform: translate(-50%, -50%);
        /* Position updated via JS to follow mouse */
        left: 50%; top: 50%;
      }
    `;
    document.head.appendChild(style);
  }

  updateCrosshairPosition(mouseX: number, mouseY: number, visible: boolean): void {
    const el = document.getElementById('hud-crosshair');
    if (el) {
      el.style.display = visible ? 'flex' : 'none';
      el.style.left = `${mouseX}px`;
      el.style.top = `${mouseY}px`;
    }
  }

  destroy(): void {
    this.root.remove();
  }
}
