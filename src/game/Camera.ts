/**
 * Camera.ts
 * Smooth follow camera constrained to arena bounds.
 * Converts world ↔ screen coordinates for input aiming.
 *
 * Phase 3 adds an orthographic Y-axis tilt (pseudo-3D "2.5D" view) and
 * screen shake. Both are reflected in the world↔screen conversion so aiming
 * stays pixel-accurate while the view is tilted or shaking.
 */

export interface CameraBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class Camera {
  /** World-space position of the camera center */
  x = 0;
  y = 0;

  /** Target position to smoothly follow */
  private targetX = 0;
  private targetY = 0;

  /** Screen dimensions */
  private screenW = 0;
  private screenH = 0;

  /** Arena bounds in world space */
  private bounds: CameraBounds | null = null;

  /** Smoothing factor (higher = snappier; 0 = snap instantly, for reduced-motion) */
  private smoothing = 8;

  /** Vertical compression for the tilted view. 1 = flat top-down. */
  private yScale = 1;
  private worldToScreenOverride: ((x: number, y: number) => { x: number; y: number }) | null = null;
  private screenToWorldOverride: ((x: number, y: number) => { x: number; y: number }) | null = null;

  setMapping(
    toScreen: ((x: number, y: number) => { x: number; y: number }) | null,
    toWorld: ((x: number, y: number) => { x: number; y: number }) | null,
  ): void {
    this.worldToScreenOverride = toScreen;
    this.screenToWorldOverride = toWorld;
  }

  // ── Screen shake ──
  private shakeEnabled = true;
  private shakeAmp = 0;
  private shakeDuration = 0;
  private shakeTime = 0;
  private shakeClock = 0;
  private shakeX = 0;
  private shakeY = 0;

  setSmoothing(value: number): void {
    this.smoothing = Math.max(0, value);
  }

  /** Set the orthographic tilt factor (1 = flat, < 1 = tilted/compressed). */
  setYScale(value: number): void {
    this.yScale = Math.max(0.2, Math.min(1.5, value));
  }

  get tilt(): number {
    return this.yScale;
  }

  setShakeEnabled(value: boolean): void {
    this.shakeEnabled = value;
    if (!value) this._clearShake();
  }

  /**
   * Request a screen shake. The strongest active shake wins (it does not
   * stack), which keeps rapid-fire weapons from becoming nauseating.
   */
  addShake(intensity: number, duration = 0.25): void {
    if (!this.shakeEnabled || intensity <= 0 || duration <= 0) return;
    this.shakeAmp = Math.max(this.shakeAmp, intensity);
    this.shakeDuration = Math.max(this.shakeDuration, duration);
    this.shakeTime = this.shakeDuration;
  }

  get offsetX(): number {
    return this.shakeX;
  }

  get offsetY(): number {
    return this.shakeY;
  }

  setScreenSize(w: number, h: number): void {
    this.screenW = w;
    this.screenH = h;
  }
  get width(): number { return this.screenW; }
  get height(): number { return this.screenH; }

  setBounds(bounds: CameraBounds | null): void {
    this.bounds = bounds;
  }

  follow(worldX: number, worldY: number): void {
    this.targetX = worldX;
    this.targetY = worldY;
  }

  update(dt: number): void {
    if (this.smoothing <= 0) {
      this.x = this.targetX;
      this.y = this.targetY;
    } else {
      const alpha = 1 - Math.exp(-this.smoothing * dt);
      this.x += (this.targetX - this.x) * alpha;
      this.y += (this.targetY - this.y) * alpha;
    }
    this._clampToBounds();
    this._updateShake(dt);
  }

  private _updateShake(dt: number): void {
    if (this.shakeTime <= 0) {
      this.shakeX = 0;
      this.shakeY = 0;
      return;
    }
    this.shakeTime -= dt;
    this.shakeClock += dt;
    const t = Math.max(0, this.shakeTime / Math.max(0.0001, this.shakeDuration));
    const amp = this.shakeAmp * t * t; // ease out
    this.shakeX = Math.sin(this.shakeClock * 90) * amp + (Math.random() - 0.5) * amp * 0.8;
    this.shakeY = Math.cos(this.shakeClock * 74) * amp + (Math.random() - 0.5) * amp * 0.8;
    if (this.shakeTime <= 0) this._clearShake();
  }

  private _clearShake(): void {
    this.shakeAmp = 0;
    this.shakeDuration = 0;
    this.shakeTime = 0;
    this.shakeX = 0;
    this.shakeY = 0;
  }

  private _clampToBounds(): void {
    if (!this.bounds) return;
    const halfW = this.screenW / 2;
    // With the tilted view, more world fits vertically: divide by the tilt.
    const halfH = this.screenH / (2 * this.yScale);
    this.x = Math.max(this.bounds.x + halfW, Math.min(this.bounds.x + this.bounds.width - halfW, this.x));
    this.y = Math.max(this.bounds.y + halfH, Math.min(this.bounds.y + this.bounds.height - halfH, this.y));
  }

  /** Convert world position to screen position */
  worldToScreen(wx: number, wy: number): { x: number; y: number } {
    if (this.worldToScreenOverride) return this.worldToScreenOverride(wx, wy);
    return {
      x: wx - this.x + this.screenW / 2 + this.shakeX,
      y: (wy - this.y) * this.yScale + this.screenH / 2 + this.shakeY,
    };
  }

  /** Convert screen position to world position */
  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    if (this.screenToWorldOverride) return this.screenToWorldOverride(sx, sy);
    return {
      x: sx - this.screenW / 2 + this.x - this.shakeX,
      y: (sy - this.screenH / 2 - this.shakeY) / this.yScale + this.y,
    };
  }

  /** Apply camera transform to a PixiJS container */
  applyToContainer(container: { x: number; y: number; scale: { y: number } }): void {
    container.x = this.screenW / 2 - this.x + this.shakeX;
    container.y = this.screenH / 2 - this.y * this.yScale + this.shakeY;
    container.scale.y = this.yScale;
  }
}
