/**
 * AsciiRenderer.ts
 * ASCII/glyph sprite system for PixiJS v8.
 * Each AsciiSprite is a Container of Sprite cells backed by the shared GlyphAtlas.
 *
 * Phase 1 — Technical Spike
 */

import { Container, Sprite } from 'pixi.js';
import { GlyphAtlas } from './GlyphAtlas';

export interface AsciiEntityDef {
  /** Multi-line ASCII art. Each entry is an array of lines (rows). */
  frames: string[][];
  /** tint color as 0xRRGGBB */
  tint?: number;
}

/** A renderable ASCII entity backed by the shared glyph atlas. */
export class AsciiSprite extends Container {
  private atlas: GlyphAtlas;
  private frames: string[][];
  private cells: Sprite[][] = [];
  private _frameIndex = 0;
  private _tint: number;

  constructor(atlas: GlyphAtlas, def: AsciiEntityDef) {
    super();
    this.atlas = atlas;
    this.frames = def.frames;
    this._tint = def.tint ?? 0x39ff14;
    this._buildCells();
    this.showFrame(0);
  }

  private _buildCells(): void {
    const maxRows = Math.max(...this.frames.map(f => f.length));
    const maxCols = Math.max(
      ...this.frames.map(f => Math.max(...f.map(r => r.length), 0)),
      0
    );

    for (let r = 0; r < maxRows; r++) {
      const row: Sprite[] = [];
      for (let c = 0; c < maxCols; c++) {
        const glyphInfo = this.atlas.get(' ')!;
        const spr = new Sprite(glyphInfo.texture);
        spr.tint = this._tint;
        spr.x = c * this.atlas.cellW;
        spr.y = r * this.atlas.cellH;
        spr.visible = false;
        this.addChild(spr);
        row.push(spr);
      }
      this.cells.push(row);
    }
  }

  showFrame(frameIndex: number): void {
    this._frameIndex = frameIndex % this.frames.length;
    const lines = this.frames[this._frameIndex];

    // Hide all cells
    for (const row of this.cells) {
      for (const cell of row) cell.visible = false;
    }

    // Show active glyphs
    lines.forEach((line, r) => {
      Array.from(line).forEach((ch, c) => {
        if (ch === ' ') return;
        const glyphInfo = this.atlas.get(ch);
        if (!glyphInfo) return;
        const cell = this.cells[r]?.[c];
        if (!cell) return;
        cell.texture = glyphInfo.texture;
        cell.visible = true;
      });
    });
  }

  get currentFrame(): number { return this._frameIndex; }

  get glyphWidth(): number {
    const lines = this.frames[this._frameIndex];
    return Math.max(...lines.map(l => l.length)) * this.atlas.cellW;
  }

  get glyphHeight(): number {
    return this.frames[this._frameIndex].length * this.atlas.cellH;
  }

  setTint(tint: number): void {
    this._tint = tint;
    for (const row of this.cells) {
      for (const cell of row) cell.tint = tint;
    }
  }
}

/** Pool of AsciiSprites for reuse — avoids GC pressure on high-frequency entities */
export class AsciiSpritePool {
  private pool: AsciiSprite[] = [];
  private atlas: GlyphAtlas;
  private def: AsciiEntityDef;

  constructor(atlas: GlyphAtlas, def: AsciiEntityDef, prewarm = 0) {
    this.atlas = atlas;
    this.def = def;
    for (let i = 0; i < prewarm; i++) {
      const s = new AsciiSprite(atlas, def);
      s.visible = false;
      this.pool.push(s);
    }
  }

  acquire(): AsciiSprite {
    const s = this.pool.pop() ?? new AsciiSprite(this.atlas, this.def);
    s.visible = true;
    s.showFrame(0);
    return s;
  }

  release(s: AsciiSprite): void {
    s.visible = false;
    this.pool.push(s);
  }

  get size(): number { return this.pool.length; }
}
