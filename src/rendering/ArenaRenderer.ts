/**
 * ArenaRenderer.ts
 * Renders the arena background, obstacles, and lighting halo.
 *
 * Phase 2 — Vertical Slice
 */

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { ArenaDef } from '../config/arenas';
import type { PlayerEntity } from '../entities/Player';

export class ArenaRenderer {
  readonly container: Container;
  private ground: Graphics;
  private walls: Graphics;
  private lightingOverlay: Graphics;

  constructor() {
    this.container = new Container();
    this.ground = new Graphics();
    this.walls = new Graphics();
    this.lightingOverlay = new Graphics();
    this.container.addChild(this.ground, this.walls, this.lightingOverlay);
  }

  buildArena(arena: ArenaDef): void {
    this.ground.clear();
    this.walls.clear();

    const W = arena.worldWidth;
    const H = arena.worldHeight;

    // ── Ground (slightly lifted from the near-black base so the plane reads) ──
    this.ground.rect(0, 0, W, H);
    this.ground.fill({ color: shade(arena.groundColor, 1.7) });

    // Grid lines for the terminal feel
    for (let x = 0; x <= W; x += 64) {
      this.ground.moveTo(x, 0).lineTo(x, H);
    }
    for (let y = 0; y <= H; y += 64) {
      this.ground.moveTo(0, y).lineTo(W, y);
    }
    this.ground.stroke({ color: shade(arena.groundColor, 3.2), width: 1, alpha: 0.5 });

    // Depth fog: the far edge of the field (north) fades to black.
    // This is the strongest cue that the plane is receding away from the camera.
    const bands = 18;
    for (let i = 0; i < bands; i++) {
      const t = i / bands;                 // 0 = far, 1 = near
      const alpha = 0.42 * (1 - t) * (1 - t);
      if (alpha < 0.004) continue;
      this.ground.rect(0, (H / bands) * i, W, H / bands + 1);
      this.ground.fill({ color: 0x000000, alpha });
    }

    // Arena border
    this.ground.rect(0, 0, W, H);
    this.ground.stroke({ color: 0x1a3a1a, width: 3 });

    // ── Obstacles (drawn as blocks with apparent height) ──
    for (const obs of arena.obstacles) {
      const isTree = obs.label?.startsWith('tree');
      const isRock = obs.label?.startsWith('rock');
      const isPillar = obs.label?.startsWith('pillar');
      const isContainer = obs.label?.startsWith('container');

      if (isTree) {
        this._drawTree(obs.x + obs.width / 2, obs.y + obs.height / 2, arena.wallColor);
      } else if (isRock) {
        this._drawBlock(obs.x, obs.y, obs.width, obs.height, shade(arena.wallColor, 1.6), 16);
      } else if (isPillar) {
        this._drawBlock(obs.x, obs.y, obs.width, obs.height, 0x4a4a4a, 36);
      } else if (isContainer) {
        this._drawBlock(obs.x, obs.y, obs.width, obs.height, shade(arena.wallColor, 1.9), 30);
      } else {
        // Building / factory — taller block with windows on the front face
        this._drawBlock(obs.x, obs.y, obs.width, obs.height, shade(arena.wallColor, 1.5), 28, obs.width > 80);
      }
    }
  }

  /**
   * Draw a box with apparent height: a lit top face shifted "up" from the
   * footprint, plus a dark front face filling the gap. Under the camera tilt
   * this reads as a solid object standing on the ground.
   */
  private _drawBlock(
    x: number,
    y: number,
    w: number,
    h: number,
    color: number,
    height: number,
    windows = false,
  ): void {
    const topY = y - height;
    const topColor = shade(color, 1.25);
    const frontColor = shade(color, 0.45);

    // Front (camera-facing) wall
    this.walls.rect(x, topY + h, w, height);
    this.walls.fill({ color: frontColor });

    // Top face
    this.walls.rect(x, topY, w, h);
    this.walls.fill({ color: topColor });
    this.walls.rect(x, topY, w, h);
    this.walls.stroke({ color: shade(color, 1.7), width: 2 });

    if (windows) {
      const winW = 20;
      const winH = 14;
      const cols = Math.floor((w - 30) / 35);
      for (let c = 0; c < cols; c++) {
        this.walls.rect(x + 15 + c * 35, topY + h + 6, winW, winH);
        this.walls.fill({ color: 0x1a2a00, alpha: 0.85 });
      }
    }
  }

  private _drawTree(cx: number, cy: number, baseColor: number): void {
    // Trunk (ground contact)
    this.walls.rect(cx - 5, cy - 6, 10, 26);
    this.walls.fill({ color: 0x301800 });

    // Crown, lifted to give the tree height
    this.walls.circle(cx, cy - 26, 20);
    this.walls.fill({ color: shade(baseColor, 2.2) });
    this.walls.circle(cx - 6, cy - 30, 12);
    this.walls.fill({ color: shade(baseColor, 3.0) });
  }

  updateLighting(player: PlayerEntity): void {
    this.lightingOverlay.clear();
    // Dark overlay with radial "hole" around player
    // We use a simple solid dark overlay — later we'll add proper radial gradient
    // For Phase 2: just a subtle vignette from arena edges
    void player;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}

/** Multiply a 0xRRGGBB color's channels (clamped) for quick shading. */
function shade(color: number, factor: number): number {
  const r = Math.min(255, Math.round(((color >> 16) & 0xff) * factor));
  const g = Math.min(255, Math.round(((color >> 8) & 0xff) * factor));
  const b = Math.min(255, Math.round((color & 0xff) * factor));
  return (r << 16) | (g << 8) | b;
}
