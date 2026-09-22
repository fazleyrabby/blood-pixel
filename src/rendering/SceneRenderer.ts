import type { ArenaDef } from '../config/arenas';
import type { PlayerEntity } from '../entities/Player';
import type { ZombieEntity } from '../entities/Zombie';
import type { ProjectileEntity } from '../entities/Projectile';
import type { PickupEntity } from '../entities/Pickup';
import type { Camera } from '../game/Camera';
import type { World } from '../game/World';

/** The simulation-facing render contract shared by visual experiments. */
export interface SceneRenderer {
  setViewMode(mode: 'overhead' | 'first-person'): void;
  setActorStyle(style: 'voxel' | 'billboard'): void;
  buildArena(arena: ArenaDef, player: PlayerEntity): void;
  clear(): void;
  setTilt(tilt: number): void;
  setColorblind(enabled: boolean): void;
  setCrt(enabled: boolean, dithering: boolean): void;
  addZombie(zombie: ZombieEntity): void;
  removeZombie(id: number): void;
  addProjectile(projectile: ProjectileEntity): void;
  removeProjectile(id: number): void;
  addPickup(pickup: PickupEntity): void;
  removePickup(id: number): void;
  showDamageNumber(x: number, y: number, amount: number, isPlayer: boolean): void;
  showMuzzleFlash(x: number, y: number, angle: number): void;
  spawnBlood(x: number, y: number, count: number, spread?: number, speed?: number): void;
  spawnAcid(x: number, y: number, count: number): void;
  spawnExplosion(x: number, y: number, count: number): void;
  applyCamera(camera: Camera): void;
  resize(width: number, height: number): void;
  update(dt: number, world: World | null): void;
  dispose(): void;
}
