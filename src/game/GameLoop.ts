/**
 * GameLoop.ts
 * Fixed 60 Hz simulation step with render interpolation.
 * Clamps accumulated time to avoid unbounded catch-up.
 *
 * Phase 1 — Technical Spike
 */

export type UpdateFn = (stepSeconds: number) => void;
export type RenderFn = (alpha: number, dt: number) => void;

const FIXED_STEP = 1 / 60;          // 60 Hz simulation
const MAX_ACCUMULATOR = 0.25;       // clamp: max 250ms of catch-up

export class GameLoop {
  private accumulator = 0;
  private lastTime = 0;
  private rafId = -1;
  private _running = false;
  private updateFn: UpdateFn;
  private renderFn: RenderFn;

  constructor(update: UpdateFn, render: RenderFn) {
    this.updateFn = update;
    this.renderFn = render;
  }

  start(): void {
    if (this._running) return;
    this._running = true;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this._tick);
  }

  stop(): void {
    this._running = false;
    cancelAnimationFrame(this.rafId);
  }

  get running(): boolean { return this._running; }

  private _tick = (now: number): void => {
    if (!this._running) return;
    this.rafId = requestAnimationFrame(this._tick);

    const rawDt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    // Clamp to prevent spiral-of-death after tab restore
    const dt = Math.min(rawDt, MAX_ACCUMULATOR);
    this.accumulator += dt;

    while (this.accumulator >= FIXED_STEP) {
      this.updateFn(FIXED_STEP);
      this.accumulator -= FIXED_STEP;
    }

    const alpha = this.accumulator / FIXED_STEP;
    this.renderFn(alpha, dt);
  };
}
