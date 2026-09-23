/**
 * EffectsRenderer.ts
 * Pooled particle effects: fluid blood sprays, acid splashes, explosion bursts,
 * and lingering ground splat puddles.
 *
 * Upgraded with velocity-aligned teardrop droplets and visceral cartoon puddle splatters.
 */

import { Container, Graphics } from 'pixi.js';
import { projectGround, type ProjectionView } from './projection';

interface Particle {
  g: Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  gravity: number;
  drag: number;
  isFluid: boolean;
}

interface SplatPuddle {
  g: Graphics;
  x: number;
  y: number;
  life: number;
  maxLife: number;
  scale: number;
}

// Stylized saturated palette matching the chibi cartoon reference
const BLOOD_COLORS = [0xff2a4b, 0xd91438, 0xa80c28, 0xff5376];
const ACID_COLORS = [0x9ef01a, 0x70e000, 0x38b000, 0xd4ff33];
const EXPLOSION_COLORS = [0xffea00, 0xff9e00, 0xff5400, 0xff0054, 0xffffff];

const OUTLINE_COLOR = 0x16152a; // Deep dark navy ink outline

const MAX_ACTIVE = 450;
const MAX_PUDDLES = 64;

export class EffectsRenderer {
  readonly container: Container;
  private readonly puddleLayer: Container;
  private readonly particleLayer: Container;

  private pool: Graphics[] = [];
  private puddlePool: Graphics[] = [];
  private active: Particle[] = [];
  private activePuddles: SplatPuddle[] = [];
  private projection: ProjectionView | null = null;

  setProjection(view: ProjectionView | null): void {
    this.projection = view;
  }

  constructor() {
    this.container = new Container();
    this.puddleLayer = new Container();
    this.particleLayer = new Container();

    this.container.addChild(this.puddleLayer, this.particleLayer);
  }

  /** Burst of fluid blood at a world position (e.g. enemy torso impact). */
  spawnBlood(x: number, y: number, count = 7, spread = 70, speed = 160): void {
    this._burst(x, y, count, BLOOD_COLORS, spread, speed, 2.5, 5, 280, true);
    // Leave a fluid splat puddle on the ground
    if (Math.random() < 0.65) {
      this._spawnPuddle(x + (Math.random() - 0.5) * 12, y + (Math.random() - 0.5) * 8, BLOOD_COLORS[0]);
    }
  }

  /** Acid splash (spitter projectile impact). */
  spawnAcid(x: number, y: number, count = 9): void {
    this._burst(x, y, count, ACID_COLORS, Math.PI * 2, 140, 2.5, 4.5, 400, true);
    this._spawnPuddle(x, y, ACID_COLORS[0]);
  }

  /** Explosion burst (exploder detonation / boss summon). */
  spawnExplosion(x: number, y: number, count = 26): void {
    this._burst(x, y, count, EXPLOSION_COLORS, Math.PI * 2, 340, 3.5, 7, 140, false);
    for (let i = 0; i < 3; i++) {
      this._spawnPuddle(
        x + (Math.random() - 0.5) * 36,
        y + (Math.random() - 0.5) * 24,
        BLOOD_COLORS[1],
      );
    }
  }

  update(dt: number): void {
    // ── Update Flying Particles ──
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
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      const point = this.projection ? projectGround(p.x, p.y, this.projection) : null;
      p.g.x = point?.x ?? p.x;
      p.g.y = point?.y ?? p.y;

      const baseScale = point?.scale ?? 1;
      const progress = p.life / p.maxLife;

      if (p.isFluid) {
        // Fluid droplet stretches along velocity vector
        const speed = Math.hypot(p.vx, p.vy);
        const stretch = Math.min(3.0, 1.0 + speed * 0.007);
        p.g.rotation = Math.atan2(p.vy, p.vx);
        p.g.scale.set(stretch * baseScale * progress, (1.0 / Math.sqrt(stretch)) * baseScale * progress);
      } else {
        p.g.scale.set(baseScale * Math.min(1, progress * 1.2));
      }

      p.g.alpha = Math.max(0, Math.min(1, progress * 1.4));
    }

    // ── Update Ground Splat Puddles ──
    for (let i = this.activePuddles.length - 1; i >= 0; i--) {
      const pd = this.activePuddles[i];
      pd.life -= dt;
      if (pd.life <= 0) {
        this._releasePuddle(pd);
        this.activePuddles.splice(i, 1);
        continue;
      }

      const point = this.projection ? projectGround(pd.x, pd.y, this.projection) : null;
      pd.g.x = point?.x ?? pd.x;
      pd.g.y = point?.y ?? pd.y;

      // Puddle expands slightly when first splatting, then fades
      const lifeRatio = pd.life / pd.maxLife;
      const growth = 1.0 - Math.exp((lifeRatio - 1.0) * 12);
      const curScale = pd.scale * (point?.scale ?? 1) * (0.8 + 0.2 * growth);

      // Squashed slightly vertically for 2.5D perspective
      pd.g.scale.set(curScale, curScale * 0.65);
      pd.g.alpha = Math.max(0, Math.min(0.85, lifeRatio * 1.5));
    }
  }

  /** Drop every active particle and puddle (mission restart). */
  clear(): void {
    for (const p of this.active) this._release(p);
    this.active.length = 0;

    for (const pd of this.activePuddles) this._releasePuddle(pd);
    this.activePuddles.length = 0;
  }

  destroy(): void {
    this.container.destroy({ children: true });
    this.pool.length = 0;
    this.puddlePool.length = 0;
    this.active.length = 0;
    this.activePuddles.length = 0;
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
    isFluid: boolean,
  ): void {
    const headroom = MAX_ACTIVE - this.active.length;
    if (headroom <= 0) return;
    const spawn = Math.min(count, headroom);

    for (let i = 0; i < spawn; i++) {
      const angle = spread >= Math.PI * 2
        ? Math.random() * Math.PI * 2
        : -Math.PI / 2 + (Math.random() - 0.5) * spread;
      const spd = speed * (0.4 + Math.random() * 0.7);
      const size = minSize + Math.random() * (maxSize - minSize);
      const color = colors[Math.floor(Math.random() * colors.length)];

      const g = this._acquire();
      g.clear();

      if (isFluid) {
        // Teardrop droplet with dark ink outline and bright catchlight
        g.roundRect(-size * 0.8, -size * 0.45, size * 1.6, size * 0.9, size * 0.45);
        g.fill({ color });
        g.stroke({ color: OUTLINE_COLOR, width: 1.5 });
        // Glossy catchlight
        g.circle(-size * 0.25, -size * 0.15, Math.max(1, size * 0.22));
        g.fill({ color: 0xffffff, alpha: 0.75 });
      } else {
        // Stylized cartoon explosion spark
        g.roundRect(-size / 2, -size / 2, size, size, 2);
        g.fill({ color });
        g.stroke({ color: OUTLINE_COLOR, width: 1.2 });
      }

      const px = x + (Math.random() - 0.5) * 8;
      const py = y + (Math.random() - 0.5) * 8;
      const point = this.projection ? projectGround(px, py, this.projection) : null;
      g.x = point?.x ?? px;
      g.y = point?.y ?? py;
      g.alpha = 1;

      const life = 0.35 + Math.random() * 0.4;
      this.active.push({
        g,
        x: px,
        y: py,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - speed * 0.22,
        life,
        maxLife: life,
        size,
        gravity,
        drag: 3.5,
        isFluid,
      });
    }
  }

  /** Spawn an organic, cartoon ground splat puddle that lingers on the terrain */
  private _spawnPuddle(x: number, y: number, color: number): void {
    if (this.activePuddles.length >= MAX_PUDDLES) {
      const oldest = this.activePuddles.shift();
      if (oldest) this._releasePuddle(oldest);
    }

    const g = this._acquirePuddle();
    g.clear();

    // Main blob
    const baseR = 7 + Math.random() * 6;
    g.circle(0, 0, baseR);
    // 2-3 satellite connected droplets
    const numBlobs = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < numBlobs; i++) {
      const a = (i * Math.PI * 2) / numBlobs + (Math.random() - 0.5) * 0.8;
      const dist = baseR * (0.6 + Math.random() * 0.4);
      g.circle(Math.cos(a) * dist, Math.sin(a) * dist, baseR * (0.4 + Math.random() * 0.3));
    }
    g.fill({ color });
    g.stroke({ color: OUTLINE_COLOR, width: 1.8 });

    // Specular shine catchlight on the puddle surface
    g.ellipse(-baseR * 0.25, -baseR * 0.25, baseR * 0.35, baseR * 0.18);
    g.fill({ color: 0xffffff, alpha: 0.45 });

    const maxLife = 1.6 + Math.random() * 0.8;
    this.activePuddles.push({
      g,
      x,
      y,
      life: maxLife,
      maxLife,
      scale: 0.9 + Math.random() * 0.4,
    });
  }

  private _acquire(): Graphics {
    const g = this.pool.pop();
    if (g) {
      g.visible = true;
      return g;
    }
    const created = new Graphics();
    this.particleLayer.addChild(created);
    return created;
  }

  private _release(p: Particle): void {
    p.g.clear();
    p.g.visible = false;
    this.pool.push(p.g);
  }

  private _acquirePuddle(): Graphics {
    const g = this.puddlePool.pop();
    if (g) {
      g.visible = true;
      return g;
    }
    const created = new Graphics();
    this.puddleLayer.addChild(created);
    return created;
  }

  private _releasePuddle(pd: SplatPuddle): void {
    pd.g.clear();
    pd.g.visible = false;
    this.puddlePool.push(pd.g);
  }
}
