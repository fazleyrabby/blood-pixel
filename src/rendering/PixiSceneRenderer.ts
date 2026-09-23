import { Container, Filter, type Application } from 'pixi.js';
import type { ArenaDef } from '../config/arenas';
import type { PlayerEntity } from '../entities/Player';
import type { ZombieEntity } from '../entities/Zombie';
import type { ProjectileEntity } from '../entities/Projectile';
import type { PickupEntity } from '../entities/Pickup';
import type { Camera } from '../game/Camera';
import type { World } from '../game/World';
import type { SceneRenderer } from './SceneRenderer';
import { ArenaRenderer } from './ArenaRenderer';
import { CharacterRenderer } from './CharacterRenderer';
import { EffectsRenderer } from './EffectsRenderer';
import { CRTFilter } from './CRTFilter';
import type { ProjectionView } from './projection';

/** Existing Pixi scene, gathered behind one boundary without changing draw order. */
export class PixiSceneRenderer implements SceneRenderer {
  private readonly app: Application;
  private readonly container = new Container();
  private readonly arena = new ArenaRenderer();
  private readonly effects = new EffectsRenderer();
  private readonly characters = new CharacterRenderer();
  private readonly crt = new CRTFilter({
    scanlineIntensity: 0.2,
    noiseIntensity: 0.12,
    vignette: 0.22,
    chromatic: 0.12,
  });
  private activeArena: ArenaDef | null = null;
  private projection: ProjectionView | null = null;
  private wasPerspective = false;

  constructor(app: Application) {
    this.app = app;
    this.container.addChild(this.arena.container, this.effects.container, this.characters.container);
    app.stage.addChild(this.container);
  }

  setViewMode(_mode: 'overhead' | 'first-person'): void { /* Managed by HybridSceneRenderer. */ }
  setActorStyle(_style: 'voxel' | 'billboard'): void { /* Pixi actors are always billboards. */ }

  buildArena(arena: ArenaDef, player: PlayerEntity): void {
    this.activeArena = arena;
    this.arena.buildArena(arena);
    this.wasPerspective = false;
    this.effects.clear();
    this.characters.clear();
    this.characters.setArenaSize(arena.worldWidth, arena.worldHeight);
    this.characters.initPlayer(player);
  }
  clear(): void { this.effects.clear(); this.characters.clear(); }
  setTilt(tilt: number): void { this.characters.setTilt(tilt); }
  setColorblind(enabled: boolean): void { this.characters.setColorblind(enabled); }
  setCrt(enabled: boolean, dithering: boolean): void {
    this.crt.noiseIntensity = dithering ? 0.12 : 0;
    this.app.stage.filters = enabled ? [this.crt as Filter] : [];
  }
  addZombie(z: ZombieEntity): void { this.characters.addZombie(z); }
  removeZombie(id: number): void { this.characters.removeZombie(id); }
  addProjectile(p: ProjectileEntity): void { this.characters.addProjectile(p); }
  removeProjectile(id: number): void { this.characters.removeProjectile(id); }
  addPickup(p: PickupEntity): void { this.characters.addPickup(p); }
  removePickup(id: number): void { this.characters.removePickup(id); }
  showDamageNumber(x: number, y: number, amount: number, isPlayer: boolean): void {
    this.characters.showDamageNumber(x, y, amount, isPlayer);
  }
  showMuzzleFlash(x: number, y: number, angle: number): void { this.characters.showMuzzleFlash(x, y, angle); }
  spawnBlood(x: number, y: number, count: number, spread?: number, speed?: number): void {
    this.effects.spawnBlood(x, y, count, spread, speed);
  }
  spawnAcid(x: number, y: number, count: number): void { this.effects.spawnAcid(x, y, count); }
  spawnExplosion(x: number, y: number, count: number): void { this.effects.spawnExplosion(x, y, count); }
  applyCamera(camera: Camera): void {
    this.projection = camera.focalLength === null ? null : camera.projectionView();
    if (this.projection) {
      this.wasPerspective = true;
      this.container.position.set(0, 0);
      this.container.scale.set(1);
      if (this.activeArena) this.arena.drawPerspective(this.activeArena, this.projection);
    } else {
      if (this.wasPerspective && this.activeArena) this.arena.buildArena(this.activeArena);
      this.wasPerspective = false;
      camera.applyToContainer(this.container);
    }
    this.characters.setProjection(this.projection);
    this.effects.setProjection(this.projection);
  }
  resize(_width: number, _height: number): void { /* Pixi Application owns the canvas size. */ }
  update(dt: number, world: World | null): void {
    if (world) {
      this.characters.update(dt, world.player, world.zombies, world.state.activeWeapon);
      for (const p of world.projectiles) this.characters.updateProjectilePosition(p);
      for (const p of world.pickups) this.characters.updatePickupPosition(p);
      this.effects.update(dt);
    }
    this.crt.update(dt);
  }
  dispose(): void {
    this.app.stage.filters = [];
    this.container.destroy({ children: true });
    this.crt.destroy();
  }
}

export function createSceneRenderer(app: Application): SceneRenderer {
  return new PixiSceneRenderer(app);
}
