/**
 * EffectsRenderer.ts
 * Pooled particle effects: blood sprays, acid splashes.
 * Rendered as small pixel chunks on the ground plane (the world container's
 * tilt squashes them, which reads as splatter lying on the ground).
 *
 * Phase 3 — Game Feel, Combat Depth & Depth Tilt
 */

import { Container, Graphics } from 'pixi.js';

interface Particle {
  g: Graphics;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  gravity: number;
  drag: number;
}

const BLOOD_COLORS = [0xff2b2b, 0xd41717, 0x8f0f0f, 0xff5555];
const ACID_COLORS = [0x66ff33, 0x2fbf1f, 0xaaff44];
const EXPLOSION_COLORS = [0xffdd44, 0xff8822, 0xff4411, 0xffffff];

const MAX_ACTIVE = 420;

export class EffectsRenderer {
  readonly container: Container;
  private pool: Graphics[] = [];
  private active: Particle[] = [];

  constructor() {
    this.container = new Container();
  }

  /** Burst of blood at a world position. */
  spawnBlood(x: number, y: number, count = 6, spread = 70, speed = 150): void {
    this._burst(x, y, count, BLOOD_COLORS, spread, speed, 2, 4, 260);
  }

  /** Acid splash (spitter projectile impact). */
  spawnAcid(x: number, y: number, count = 8): void {
    this._burst(x, y, count, ACID_COLORS, Math.PI * 2, 130, 2, 3, 420);
  }

  /** Explosion burst (exploder detonation / boss summon). */
  spawnExplosion(x: number, y: number, count = 22): void {
    this._burst(x, y, count, EXPLOSION_COLORS, Math.PI * 2, 320, 3, 6, 120);
  }

  update(dt: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      p.life -= dt;
      if (p.life <= 0) {
        this._release(p);
        this.active.splice(i, 1);
        continue;
      }
      const damp = Math.exp(-p.drag * dt);
      p.vx *= damp;
      p.vy *= damp;
      p.vy += p.gravity * dt;
      p.g.x += p.vx * dt;
      p.g.y += p.vy * dt;
      p.g.alpha = Math.max(0, p.life / p.maxLife);
    }
  }

  /** Drop every active particle (mission restart). */
  clear(): void {
    for (const p of this.active) this._release(p);
    this.active.length = 0;
  }

  destroy(): void {
    this.container.destroy({ children: true });
    this.pool.length = 0;
    this.active.length = 0;
  }

  // ── Internals ──

  private _burst(
    x: number,
    y: number,
    count: number,
    colors: number[],
    spread: number,
    speed: number,
    minSize: number,
    maxSize: number,
    gravity: number,
  ): void {
    // Graceful degradation: when many bursts land in the same frame (e.g. a
    // chain of exploder detonations) thin the spawn out instead of doing a
    // large amount of graphics work in one tick.
    const headroom = MAX_ACTIVE - this.active.length;
    if (headroom <= 0) return;
    const spawn = Math.min(count, headroom);

    for (let i = 0; i < spawn; i++) {
      const angle = spread >= Math.PI * 2
        ? Math.random() * Math.PI * 2
        : -Math.PI / 2 + (Math.random() - 0.5) * spread;
      const spd = speed * (0.35 + Math.random() * 0.65);
      const size = minSize + Math.random() * (maxSize - minSize);
      const color = colors[Math.floor(Math.random() * colors.length)];

      const g = this._acquire();
      g.clear();
      g.rect(-size / 2, -size / 2, size, size);
      g.fill({ color });
      g.x = x + (Math.random() - 0.5) * 6;
      g.y = y + (Math.random() - 0.5) * 6;
      g.alpha = 1;

      const life = 0.35 + Math.random() * 0.45;
      this.active.push({
        g,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - speed * 0.25,
        life,
        maxLife: life,
        size,
        gravity,
        drag: 4,
      });
    }
  }

  private _acquire(): Graphics {
    const g = this.pool.pop();
    if (g) {
      g.visible = true;
      return g;
    }
    const created = new Graphics();
    this.container.addChild(created);
    return created;
  }

  private _release(p: Particle): void {
    p.g.clear();
    p.g.visible = false;
    this.pool.push(p.g);
  }
}
