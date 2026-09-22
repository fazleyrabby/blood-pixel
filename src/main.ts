/**
 * main.ts — Blood Pixel entry point
 * Boots PixiJS v8, waits for fonts (glyph atlas quality), then starts the game.
 * Any fatal error is surfaced on-screen instead of failing to a black screen.
 */

import { Application } from 'pixi.js';
import { Game } from './game/Game';
import { initVisitorCounter } from './ui/VisitorCounter';
import './style.css';
import './ui/wasteland.css';

function showFatal(err: unknown): void {
  console.error('[BloodPixel] Fatal:', err);
  let el = document.getElementById('fatal-error');
  if (!el) {
    el = document.createElement('div');
    el.id = 'fatal-error';
    el.style.cssText =
      'position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;' +
      'justify-content:center;gap:12px;background:#060a06;color:#ff4444;' +
      'font-family:monospace;font-size:14px;z-index:99999;padding:24px;text-align:center;';
    document.body.appendChild(el);
  }
  el.innerHTML =
    '<div style="font-size:20px;letter-spacing:4px">BLOOD PIXEL — BOOT ERROR</div>' +
    '<pre style="max-width:80vw;white-space:pre-wrap;color:#ffaa00">' +
    String(err instanceof Error ? err.stack ?? err.message : err) +
    '</pre>';
}

(async () => {
  try {
    document.body.classList.add('wasteland');
    const app = new Application();

    // Device pixel ratio capped at 2 per spec §71
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    await app.init({
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0x060a06,
      antialias: false,
      resolution: dpr,
      autoDensity: true,
    });

    // Mount canvas (Pixi creates its own canvas)
    const container = document.getElementById('app')!;
    app.canvas.id = 'game-canvas';
    app.canvas.style.position = 'absolute';
    app.canvas.style.top = '0';
    app.canvas.style.left = '0';
    container.prepend(app.canvas);

    // Resize handler (logical sizes — renderer.resize expects CSS pixels)
    window.addEventListener('resize', () => {
      app.renderer.resize(window.innerWidth, window.innerHeight);
    });

    // Wait for the monospace font so the glyph atlas bakes the intended face.
    // Falls back silently after a short timeout if offline.
    try {
      await Promise.race([
        document.fonts.ready,
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ]);
    } catch { /* offline / unsupported — fallback font is fine */ }

    // Small viewport warning
    if (!document.getElementById('viewport-warning')) {
      const el = document.createElement('div');
      el.id = 'viewport-warning';
      el.innerHTML =
        '<div>⚠ BLOOD PIXEL</div>' +
        '<div>Minimum viewport: 1024 × 640</div>' +
        '<div>Please resize your browser window.</div>';
      document.body.appendChild(el);
    }

    const game = new Game(app);
    await game.boot();

    // Live visit counter in the main-menu footer (no-op in dev / for bots).
    void initVisitorCounter();
  } catch (err) {
    showFatal(err);
  }
})();
