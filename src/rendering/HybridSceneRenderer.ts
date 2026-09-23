import type { Application } from 'pixi.js';
import type { ArenaDef } from '../config/arenas';
import type { PlayerEntity } from '../entities/Player';
import type { ZombieEntity } from '../entities/Zombie';
import type { ProjectileEntity } from '../entities/Projectile';
import type { PickupEntity } from '../entities/Pickup';
import type { Camera } from '../game/Camera';
import type { World } from '../game/World';
import type { SceneRenderer } from './SceneRenderer';
import { PixiSceneRenderer } from './PixiSceneRenderer';
import { ThreeSceneRenderer } from './ThreeSceneRenderer';

/** Perspective 2.5D overhead scene with the current first-person view on V. */
export class HybridSceneRenderer implements SceneRenderer {
  private readonly pixi: PixiSceneRenderer;
  private three: ThreeSceneRenderer | null = null;
  private mode: 'overhead' | 'first-person' = 'overhead';
  private actorStyle: 'voxel' | 'billboard' = 'voxel';
  private arena: ArenaDef | null = null;
  private player: PlayerEntity | null = null;
  private lastWorld: World | null = null;
  private tilt = 1;
  private colorblind = false;
  private crt = true;
  private dithering = true;
  private readonly app: Application;

  constructor(app: Application) {
    this.app = app;
    this.pixi = new PixiSceneRenderer(app);
  }

  setViewMode(mode: 'overhead' | 'first-person'): void {
    if (mode === this.mode) return;
    this.mode = mode;
    if (mode === 'first-person') {
      if (!this.three) {
        this.three = new ThreeSceneRenderer(this.app);
        this.three.setTilt(this.tilt);
        this.three.setColorblind(this.colorblind);
        this.three.setCrt(this.crt, this.dithering);
        this.three.setActorStyle(this.actorStyle);
        if (this.arena && this.player) this.three.buildArena(this.arena, this.player);
        if (this.lastWorld) {
          for (const p of this.lastWorld.projectiles) this.three.addProjectile(p);
          for (const p of this.lastWorld.pickups) this.three.addPickup(p);
        }
      }
      this.three.setViewMode('first-person');
      this.threeCanvas()?.style.setProperty('display', 'block');
      this.app.canvas.style.visibility = 'hidden';
      this.app.ticker.stop();
    } else {
      this.threeCanvas()?.style.setProperty('display', 'none');
      this.app.canvas.style.visibility = 'visible';
      this.app.ticker.start();
    }
  }

  private threeCanvas(): HTMLElement | null { return document.getElementById('three-canvas'); }
  setActorStyle(style: 'voxel' | 'billboard'): void {
    this.actorStyle = style;
    this.three?.setActorStyle(style);
  }
  buildArena(arena: ArenaDef, player: PlayerEntity): void {
    this.arena = arena;
    this.player = player;
    this.lastWorld = null;
    this.pixi.buildArena(arena, player);
    this.three?.buildArena(arena, player);
  }
  clear(): void { this.pixi.clear(); this.three?.clear(); this.lastWorld = null; }
  setTilt(tilt: number): void { this.tilt = tilt; this.pixi.setTilt(tilt); this.three?.setTilt(tilt); }
  setColorblind(enabled: boolean): void {
    this.colorblind = enabled; this.pixi.setColorblind(enabled); this.three?.setColorblind(enabled);
  }
  setCrt(enabled: boolean, dithering: boolean): void {
    this.crt = enabled; this.dithering = dithering;
    this.pixi.setCrt(enabled, dithering); this.three?.setCrt(enabled, dithering);
  }
  addZombie(z: ZombieEntity): void { this.pixi.addZombie(z); this.three?.addZombie(z); }
  removeZombie(id: number): void { this.pixi.removeZombie(id); this.three?.removeZombie(id); }
  addProjectile(p: ProjectileEntity): void { this.pixi.addProjectile(p); this.three?.addProjectile(p); }
  removeProjectile(id: number): void { this.pixi.removeProjectile(id); this.three?.removeProjectile(id); }
  addPickup(p: PickupEntity): void { this.pixi.addPickup(p); this.three?.addPickup(p); }
  removePickup(id: number): void { this.pixi.removePickup(id); this.three?.removePickup(id); }
  showDamageNumber(x: number, y: number, amount: number, isPlayer: boolean): void {
    this.active().showDamageNumber(x, y, amount, isPlayer);
  }
  showMuzzleFlash(x: number, y: number, angle: number): void { this.active().showMuzzleFlash(x, y, angle); }
  spawnBlood(x: number, y: number, count: number, spread?: number, speed?: number): void {
    this.active().spawnBlood(x, y, count, spread, speed);
  }
  spawnAcid(x: number, y: number, count: number): void { this.active().spawnAcid(x, y, count); }
  spawnExplosion(x: number, y: number, count: number): void { this.active().spawnExplosion(x, y, count); }
  applyCamera(camera: Camera): void {
    if (this.mode === 'overhead') camera.setMapping(null, null);
    this.active().applyCamera(camera);
  }
  resize(width: number, height: number): void { this.active().resize(width, height); }
  update(dt: number, world: World | null): void {
    this.lastWorld = world;
    this.active().update(dt, world);
  }
  dispose(): void { this.pixi.dispose(); this.three?.dispose(); }
  private active(): SceneRenderer { return this.mode === 'first-person' ? this.three! : this.pixi; }
}

export function createSceneRenderer(app: Application): SceneRenderer { return new HybridSceneRenderer(app); }
