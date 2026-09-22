/**
 * SpikeScene.ts
 * Phase 1 Technical Spike — validates:
 *   ✓ PixiJS v8 startup
 *   ✓ GlyphAtlas / AsciiSprite system
 *   ✓ 200 animated ASCII entities at target FPS
 *   ✓ CRT filter pipeline
 *   ✓ Camera follow + arena clamp
 *   ✓ Fixed-step game loop
 */

import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GlyphAtlas } from '../rendering/GlyphAtlas';
import { AsciiSprite } from '../rendering/AsciiRenderer';
import { CRTFilter } from '../rendering/CRTFilter';
import { Camera } from '../game/Camera';
import { GameLoop } from '../game/GameLoop';

const ENTITY_COUNT = 200;
const WORLD_W = 2200;
const WORLD_H = 1600;

// Zombie ASCII frames (2 animation frames)
const ZOMBIE_FRAMES: string[][] = [
  [' ███ ', '█x x█', ' █▀█ ', '▄███▄'],
  [' ███ ', '█• •█', ' █▄█ ', '▄▄█▄▄'],
];

// Player ASCII frames
const PLAYER_FRAMES: string[][] = [
  ['  @  ', ' /|\\ ', ' / \\ '],
  ['  @  ', ' \\|/ ', ' / \\ '],
];

// Runner zombie (fast, thin)
const RUNNER_FRAMES: string[][] = [
  [' ▄█▄ ', '█• •█', ' ▄█▄ ', '  /  '],
  [' ▄█▄ ', '█• •█', ' ▄█▄ ', '  \\  '],
];

interface SpikeEntity {
  sprite: AsciiSprite;
  wx: number;
  wy: number;
  vx: number;
  vy: number;
  frameTimer: number;
  frameDuration: number;
  frameIndex: number;
}

export async function runSpike(app: Application): Promise<void> {
  // Logical screen size (NOT renderer.width — that is physical pixels under HiDPI)
  const W = app.screen.width;
  const H = app.screen.height;

  // ── Atlas ──
  const atlas = new GlyphAtlas({ fontSize: 14, color: '#39ff14' });

  // ── World container (camera-transformed) ──
  const worldContainer = new Container();
  app.stage.addChild(worldContainer);

  // ── Camera ──
  const camera = new Camera();
  camera.setScreenSize(W, H);
  camera.setBounds({ x: 0, y: 0, width: WORLD_W, height: WORLD_H });
  camera.x = WORLD_W / 2;
  camera.y = WORLD_H / 2;
  camera.follow(WORLD_W / 2, WORLD_H / 2);

  // ── Ground grid ──
  const ground = new Graphics();
  for (let gx = 0; gx <= WORLD_W; gx += 80) {
    ground.moveTo(gx, 0).lineTo(gx, WORLD_H);
  }
  for (let gy = 0; gy <= WORLD_H; gy += 80) {
    ground.moveTo(0, gy).lineTo(WORLD_W, gy);
  }
  ground.stroke({ color: 0x0a1a0a, alpha: 0.6, width: 1 });
  ground.rect(0, 0, WORLD_W, WORLD_H);
  ground.stroke({ color: 0x0d2b0d, alpha: 1, width: 2 });
  worldContainer.addChild(ground);

  // ── Spawn entities ──
  const entities: SpikeEntity[] = [];

  for (let i = 0; i < ENTITY_COUNT; i++) {
    const isPlayer = i === 0;
    const entityType = i % 5;
    let frames: string[][];
    let tint: number;

    if (isPlayer) {
      frames = PLAYER_FRAMES;
      tint = 0x00ffff;
    } else if (entityType === 0) {
      frames = RUNNER_FRAMES;
      tint = 0xff6600;
    } else {
      frames = ZOMBIE_FRAMES;
      tint = i % 3 === 0 ? 0xff2222 : 0x39ff14;
    }

    const sprite = new AsciiSprite(atlas, { frames, tint });
    const wx = isPlayer ? WORLD_W / 2 : Math.random() * WORLD_W;
    const wy = isPlayer ? WORLD_H / 2 : Math.random() * WORLD_H;
    sprite.x = wx;
    sprite.y = wy;
    worldContainer.addChild(sprite);

    const speed = isPlayer ? 0 : 30 + Math.random() * 80;
    const angle = Math.random() * Math.PI * 2;

    entities.push({
      sprite, wx, wy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      frameTimer: Math.random() * 0.3,
      frameDuration: 0.15 + Math.random() * 0.25,
      frameIndex: 0,
    });
  }

  // ── CRT filter ──
  const crt = new CRTFilter({ scanlineIntensity: 0.5, noiseIntensity: 0.4, vignette: 0.6, chromatic: 0.7 });
  app.stage.filters = [crt];

  // ── Stats text (screen-space, above filter's rendertarget) ──
  const statsStyle = new TextStyle({
    fontFamily: "'Share Tech Mono', 'Courier New', monospace",
    fontSize: 13,
    fill: 0x39ff14,
  });
  const statsText = new Text({ text: '', style: statsStyle });
  statsText.x = 12;
  statsText.y = 12;
  app.stage.addChild(statsText);

  // Subtitle bar at bottom
  const subStyle = new TextStyle({ fontFamily: "'Share Tech Mono', monospace", fontSize: 16, fill: 0x39ff14 });
  const subtitle = new Text({ text: '[ BLOOD PIXEL — PHASE 1 SPIKE — 200 ASCII ENTITIES ]', style: subStyle });
  subtitle.x = W / 2 - subtitle.width / 2;
  subtitle.y = H - 30;
  app.stage.addChild(subtitle);

  let frameCount = 0;
  let fpsAccum = 0;
  let fpsDisplay = 60;

  // ── Game loop ──
  const loop = new GameLoop(
    // Fixed simulation step
    (step: number) => {
      for (let i = 0; i < entities.length; i++) {
        const e = entities[i];

        // Move and bounce
        e.wx += e.vx * step;
        e.wy += e.vy * step;
        if (e.wx < 0)       { e.wx = 0;       e.vx = Math.abs(e.vx); }
        if (e.wx > WORLD_W) { e.wx = WORLD_W; e.vx = -Math.abs(e.vx); }
        if (e.wy < 0)       { e.wy = 0;       e.vy = Math.abs(e.vy); }
        if (e.wy > WORLD_H) { e.wy = WORLD_H; e.vy = -Math.abs(e.vy); }

        // Frame animation
        e.frameTimer += step;
        if (e.frameTimer >= e.frameDuration) {
          e.frameTimer -= e.frameDuration;
          e.frameIndex = (e.frameIndex + 1) % 2; // 2 frames per entity type
          e.sprite.showFrame(e.frameIndex);
        }
      }

      // Camera follows player (entity 0)
      camera.follow(entities[0].wx, entities[0].wy);
      camera.update(step);
    },
    // Render interpolation
    (_alpha: number, dt: number) => {
      // Apply camera to world container
      camera.applyToContainer(worldContainer);

      // Update sprite positions
      for (const e of entities) {
        e.sprite.x = e.wx - e.sprite.glyphWidth / 2;
        e.sprite.y = e.wy - e.sprite.glyphHeight / 2;
      }

      // Tick CRT
      crt.update(dt);

      // FPS
      frameCount++;
      fpsAccum += dt;
      if (fpsAccum >= 0.5) {
        fpsDisplay = Math.round(frameCount / fpsAccum);
        frameCount = 0;
        fpsAccum = 0;
      }
      statsText.text =
        `FPS: ${fpsDisplay}  |  Entities: ${ENTITY_COUNT}\n` +
        `Camera: (${Math.round(camera.x)}, ${Math.round(camera.y)})  |  PixiJS v8 + Atlas`;
    },
  );

  loop.start();
}
