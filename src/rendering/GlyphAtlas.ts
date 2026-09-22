/**
 * GlyphAtlas.ts
 * Builds a canvas-based bitmap atlas of ASCII/block characters.
 * Compatible with PixiJS v8 (uses Texture.from(canvas) / getCanvasTexture).
 *
 * Phase 1 — Technical Spike
 */

import { Texture, Rectangle, getCanvasTexture } from 'pixi.js';

export interface GlyphInfo {
  char: string;
  texture: Texture;
  width: number;
  height: number;
}

export interface GlyphAtlasOptions {
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  cols?: number;
}

// The full character set needed for gameplay + UI
const GLYPH_CHARS =
  ' !"#$%&\'()*+,-./0123456789:;<=>?' +
  '@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_' +
  '`abcdefghijklmnopqrstuvwxyz{|}~' +
  '░▒▓█▄▀■□●○' +
  '─│┌┐└┘├┤┬┴┼╔╗╚╝║═' +
  '↑↓←→•≈❤★' +
  '/\\|_-+*=^~<>';

export class GlyphAtlas {
  private glyphs = new Map<string, GlyphInfo>();
  private baseCanvas!: HTMLCanvasElement;
  private atlasTexture!: Texture;
  readonly cellW: number;
  readonly cellH: number;

  constructor(opts: GlyphAtlasOptions = {}) {
    const {
      fontSize = 16,
      fontFamily = "'Share Tech Mono', 'Courier New', monospace",
      color = '#39ff14',
      cols = 32,
    } = opts;

    const chars = Array.from(new Set(GLYPH_CHARS.split('')));
    const rows = Math.ceil(chars.length / cols);

    // Measure a single cell
    const measure = document.createElement('canvas');
    const mctx = measure.getContext('2d')!;
    mctx.font = `${fontSize}px ${fontFamily}`;
    this.cellW = Math.ceil(mctx.measureText('W').width) + 2;
    this.cellH = Math.ceil(fontSize * 1.4);

    const atlasW = this.cellW * cols;
    const atlasH = this.cellH * rows;

    this.baseCanvas = document.createElement('canvas');
    this.baseCanvas.width = atlasW;
    this.baseCanvas.height = atlasH;
    const ctx = this.baseCanvas.getContext('2d')!;

    ctx.clearRect(0, 0, atlasW, atlasH);
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.textBaseline = 'top';
    ctx.fillStyle = color;

    chars.forEach((ch, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = col * this.cellW;
      const y = row * this.cellH;
      ctx.fillText(ch, x + 1, y);
    });

    // PixiJS v8: create atlas texture from canvas
    this.atlasTexture = getCanvasTexture(this.baseCanvas);

    // Create per-glyph sub-textures
    chars.forEach((ch, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const frame = new Rectangle(
        col * this.cellW,
        row * this.cellH,
        this.cellW,
        this.cellH,
      );
      const tex = new Texture({
        source: this.atlasTexture.source,
        frame,
      });
      this.glyphs.set(ch, { char: ch, texture: tex, width: this.cellW, height: this.cellH });
    });
  }

  get(char: string): GlyphInfo | undefined {
    return this.glyphs.get(char) ?? this.glyphs.get('?');
  }

  getAtlasTexture(): Texture {
    return this.atlasTexture;
  }

  destroy(): void {
    for (const g of this.glyphs.values()) {
      g.texture.destroy();
    }
    this.atlasTexture.destroy(true);
  }
}
