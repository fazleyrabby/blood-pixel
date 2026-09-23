/**
 * ArenaRenderer.ts
 * Renders the arena background, obstacles, and lighting halo.
 *
 * Phase 2 — Vertical Slice
 */

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { ArenaDef } from '../config/arenas';
import type { PlayerEntity } from '../entities/Player';
import { projectGround, projectHeight, type ProjectionView } from './projection';

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

    this.ground.rect(0, 0, W, H);
    this.ground.fill({ color: arena.id === 'forest' ? 0x46534a : 0x3b4743 });
    for (let i = 0; i < 115; i++) {
      const x = (Math.sin(i * 127.1) * 43758.5 % 1 + 1) % 1 * W;
      const y = (Math.sin(i * 91.7 + 18) * 43758.5 % 1 + 1) % 1 * H;
      const r = 12 + (i * 37 % 47);
      this.ground.poly([x-r,y-r*0.25,x+r*0.5,y-r*0.5,x+r,y+r*0.2,x-r*0.4,y+r*0.6]);
      this.ground.fill({ color: [0x536055, 0x5e5b4c, 0x303d3b, 0x697064][i % 4], alpha: 0.72 });
    }

    // ── Obstacles (drawn as blocks with apparent height) ──
    for (const obs of arena.obstacles) {
      const isTree = obs.label?.startsWith('tree');
      const isRock = obs.label?.startsWith('rock');
      const isPillar = obs.label?.startsWith('pillar');
      const isContainer = obs.label?.startsWith('container');

      if (isTree) {
        this._drawTree(obs.x + obs.width / 2, obs.y + obs.height / 2, arena.wallColor);
      } else if (isRock) {
        this._drawBlock(obs.x, obs.y, obs.width, obs.height, 0x77796e, 16);
      } else if (isPillar) {
        this._drawBlock(obs.x, obs.y, obs.width, obs.height, 0x626e69, 36);
      } else if (isContainer) {
        this._drawBlock(obs.x, obs.y, obs.width, obs.height, 0x64716b, 30);
      } else {
        this._drawBlock(obs.x, obs.y, obs.width, obs.height, 0x77837c, 28, obs.width > 80);
      }
    }
  }

  /** Screen-space perspective plane, ruined landscape, and raised obstacles. */
  drawPerspective(arena: ArenaDef, view: ProjectionView): void {
    this.ground.clear();
    this.walls.clear();
    const W = arena.worldWidth;
    const H = arena.worldHeight;
    const p = (x: number, y: number) => projectGround(x, y, view);
    const h = (x: number, y: number, height: number) => projectHeight(x, y, height, view);
    const noise = (n: number) => {
      const v = Math.sin(n * 127.1 + 83.7) * 43758.5453;
      return v - Math.floor(v);
    };
    const farLeft = p(0, 0), farRight = p(W, 0);
    const nearLeft = p(0, H), nearRight = p(W, H);

    // Ash-colored land, with a distant line of ruined structures moving slowly
    // behind the play field. All geometry is drawn in Pixi; no image assets.
    const horizonY = view.screenH * 0.20 + (view.cameraY - H / 2) * 0.025;
    this.ground.rect(0, 0, view.screenW, view.screenH);
    this.ground.fill({ color: 0x293630 });
    for (let i = -1; i < Math.ceil(view.screenW / 105) + 1; i++) {
      const x = i * 105 - ((view.cameraX * 0.08) % 105);
      const height = 28 + noise(i * 7 + 2) * 86;
      this.ground.rect(x, horizonY - height, 70 + noise(i * 11) * 40, height);
      this.ground.fill({ color: i % 3 === 0 ? 0x35423c : 0x303d39 });
    }
    this.ground.moveTo(farLeft.x, farLeft.y).lineTo(farRight.x, farRight.y)
      .lineTo(nearRight.x, nearRight.y).lineTo(nearLeft.x, nearLeft.y).closePath();
    this.ground.fill({ color: arena.id === 'forest' ? 0x46534a : 0x3b4743 });

    // Broken soil, road fragments, and loose stone replace the old grid.
    for (let i = 0; i < 115; i++) {
      const x = noise(i * 3 + 2) * W;
      const y = noise(i * 5 + 7) * H;
      const r = 9 + noise(i * 13 + 4) * 34;
      const a = p(x - r, y - r * 0.4), b = p(x + r * 0.7, y - r * 0.6);
      const c = p(x + r, y + r * 0.3), d = p(x - r * 0.5, y + r * 0.8);
      this.ground.moveTo(a.x, a.y).lineTo(b.x, b.y).lineTo(c.x, c.y).lineTo(d.x, d.y).closePath();
      this.ground.fill({ color: [0x536055, 0x5e5b4c, 0x303d3b, 0x697064][i % 4], alpha: 0.72 });
      if (i % 3 === 0) {
        const crackA = p(x - r * 0.4, y), crackB = p(x + r * 0.15, y + r * 0.25);
        this.ground.moveTo(crackA.x, crackA.y).lineTo(crackB.x, crackB.y);
        this.ground.stroke({ color: 0x263330, alpha: 0.55, width: 1 });
      }
    }

    // Two intermittent strips read as a buried road without making a tiled city.
    if (arena.id !== 'forest') for (let i = 0; i < 19; i++) {
      const x = i * 115 + noise(i * 4) * 28;
      const y = H * 0.58 + (noise(i * 9 + 5) - 0.5) * 68;
      const a = p(x, y), b = p(x + 60, y - 4), c = p(x + 74, y + 24), d = p(x - 7, y + 30);
      this.ground.moveTo(a.x, a.y).lineTo(b.x, b.y).lineTo(c.x, c.y).lineTo(d.x, d.y).closePath();
      this.ground.fill({ color: i % 3 === 0 ? 0x495451 : 0x35413e, alpha: 0.72 });
    }

    for (const obs of arena.obstacles) {
      const { x, y, width: w, height: d } = obs;
      const center = p(x + w / 2, y + d / 2);
      this.walls.ellipse(center.x, center.y, w * center.scale * 0.65, d * center.scale * 0.28);
      this.walls.fill({ color: 0x1a2523, alpha: 0.45 });
      if (obs.label?.startsWith('tree')) {
        const root = p(x + w / 2, y + d / 2);
        const trunk = h(x + w / 2 + 4, y + d / 2, 88);
        const forkL = h(x + w / 2 - 27, y + d / 2, 115);
        const forkR = h(x + w / 2 + 31, y + d / 2, 107);
        this.walls.moveTo(root.x, root.y).lineTo(trunk.x, trunk.y);
        this.walls.stroke({ color: 0x252d2b, width: 8 * root.scale });
        this.walls.moveTo(trunk.x, trunk.y + 22).lineTo(forkL.x, forkL.y)
          .moveTo(trunk.x, trunk.y + 18).lineTo(forkR.x, forkR.y);
        this.walls.stroke({ color: 0x303632, width: 4 * root.scale });
        continue;
      }
      if (obs.label?.startsWith('rock')) {
        const a = p(x, y + d), b = h(x + w * 0.2, y + d * 0.25, 18);
        const c = h(x + w * 0.75, y + d * 0.15, 23), e = p(x + w, y + d);
        this.walls.moveTo(a.x, a.y).lineTo(b.x, b.y).lineTo(c.x, c.y).lineTo(e.x, e.y).closePath();
        this.walls.fill({ color: 0x7b7c70 });
        continue;
      }
      const tall = obs.label?.startsWith('pillar') ? 64 : obs.label?.startsWith('container') ? 38 : 76;
      const frontY = y + d;
      const wall = (x0: number, x1: number, height: number, color: number) => {
        const a = p(x0, frontY), b = p(x1, frontY), c = h(x1, frontY, height * 0.82);
        const e = h(x0 + (x1 - x0) * 0.34, frontY, height);
        const f = h(x0, frontY, height * 0.91);
        this.walls.moveTo(a.x, a.y).lineTo(b.x, b.y).lineTo(c.x, c.y)
          .lineTo(e.x, e.y).lineTo(f.x, f.y).closePath();
        this.walls.fill({ color });
        this.walls.moveTo(f.x, f.y).lineTo(e.x, e.y).lineTo(c.x, c.y);
        this.walls.stroke({ color: 0xa5a795, width: 2 * center.scale, alpha: 0.7 });
      };
      const backL = h(x, y, tall * 0.67), backR = h(x + w, y, tall * 0.56);
      const floorL = p(x, y), floorR = p(x + w, y);
      this.walls.moveTo(floorL.x, floorL.y).lineTo(floorR.x, floorR.y)
        .lineTo(backR.x, backR.y).lineTo(backL.x, backL.y).closePath();
      this.walls.fill({ color: 0x4c5955, alpha: 0.85 });
      wall(x, x + w * 0.36, tall, 0x777f78);
      wall(x + w * 0.64, x + w, tall * 0.83, 0x626d69);
      const rubble = p(x + w * 0.52, frontY + 6);
      this.walls.poly([rubble.x - 10, rubble.y, rubble.x + 6, rubble.y - 12, rubble.x + 15, rubble.y + 2]);
      this.walls.fill({ color: 0x909188 });
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
        this.walls.fill({ color: 0x293633, alpha: 0.85 });
      }
    }
  }

  private _drawTree(cx: number, cy: number, _baseColor: number): void {
    this.walls.moveTo(cx, cy + 10).lineTo(cx + 3, cy - 30)
      .lineTo(cx - 18, cy - 47);
    this.walls.stroke({ color: 0x303632, width: 7 });
    this.walls.moveTo(cx + 2, cy - 23).lineTo(cx + 23, cy - 51);
    this.walls.stroke({ color: 0x303632, width: 4 });
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
