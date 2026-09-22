import * as THREE from 'three';
import type { Application } from 'pixi.js';
import type { ArenaDef } from '../config/arenas';
import type { PlayerEntity } from '../entities/Player';
import type { ZombieEntity } from '../entities/Zombie';
import type { ProjectileEntity } from '../entities/Projectile';
import type { PickupEntity } from '../entities/Pickup';
import type { Camera } from '../game/Camera';
import type { World } from '../game/World';
import type { SceneRenderer } from './SceneRenderer';
import { enemyTint } from './palette';
import { buildVoxelCharacterGeometry, type VoxelCharacterType } from './voxelCharacters';

// The silhouettes come from CharacterRenderer's ASCII frames. Each occupied
// glyph cell becomes one shaded voxel column in a camera-facing 3D cluster.
const FRAMES: Record<string, string[]> = {
  player: ['  @  ', ' /|\\ ', ' / \\ '],
  walker: [' ███ ', '█x x█', ' █▀█ ', '▄███▄'],
  runner: [' ▄█▄ ', '█• •█', ' ▄█▄ ', '  /  '],
  brute: ['  █████  ', '███● ●███', '███████▀█', '  ███████'],
  spitter: [' ███ ', '█~ ~█', ' ▀█▀ ', ' ▄█▄ '],
  crawler: [' ▄ ', '▄█▄', ' ▀ '],
  armored: [' █████ ', '██■ ■██', '███████', ' █████ '],
  exploder: [' ▄█▄ ', '█● ●█', '█▀▀▀█', ' ▀█▀ '],
  abomination: ['   ███████   ', ' ███▀▀▀▀▀███ ', '███ ●   ● ███', '█████████████', ' ███████████ ', '  ███   ███  '],
};
const CHARACTER_TYPES: VoxelCharacterType[] = ['player', 'walker', 'runner', 'brute', 'spitter', 'crawler', 'armored', 'exploder', 'abomination'];
const MAX_ACTORS_PER_TYPE = 512;
const color = (hex: number) => new THREE.Color(hex);
const WASTELAND_TINTS: Record<string, number> = {
  walker: 0x9fac82, runner: 0xbb8b68, brute: 0x9e5354, spitter: 0x989273,
  crawler: 0x9eae77, armored: 0x89979c, exploder: 0xb9785d, abomination: 0x793f46,
};

interface Particle { mesh: THREE.Mesh; vx: number; vy: number; vz: number; life: number; }
interface DamageText { sprite: THREE.Sprite; life: number; texture: THREE.Texture; }

export class ThreeSceneRenderer implements SceneRenderer {
  private readonly app: Application;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera3d = new THREE.PerspectiveCamera(58, 1, 1, 3600);
  private readonly firstPersonWeapon = new THREE.Group();
  private readonly worldGroup = new THREE.Group();
  private readonly characterMeshes = new Map<VoxelCharacterType, THREE.InstancedMesh>();
  private readonly dummy = new THREE.Object3D();
  private readonly projectiles = new Map<number, THREE.Mesh>();
  private readonly pickups = new Map<number, THREE.Mesh>();
  private readonly actorSprites = new Map<number, THREE.Sprite>();
  private readonly actorTextures = new Map<string, THREE.Texture>();
  private readonly particles: Particle[] = [];
  private readonly damageTexts: DamageText[] = [];
  private readonly ray = new THREE.Raycaster();
  private readonly groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private readonly rt = new THREE.WebGLRenderTarget(1, 1);
  private readonly postScene = new THREE.Scene();
  private readonly postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly postMaterial: THREE.ShaderMaterial;
  private readonly bulletGeometry = new THREE.SphereGeometry(3, 6, 4);
  private readonly bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xffdb78 });
  private readonly acidMaterial = new THREE.MeshBasicMaterial({ color: 0x7dff55 });
  private readonly pickupGeometry = new THREE.OctahedronGeometry(8);
  private readonly pickupMaterial = new THREE.MeshStandardMaterial({ color: 0xffe861, emissive: 0x665000 });
  private readonly particleGeometry = new THREE.BoxGeometry(3, 3, 3);
  private readonly particleMaterials = [0xff4433, 0xb51926, 0xffaa33, 0x7dff55].map(c => new THREE.MeshBasicMaterial({ color: c }));
  private readonly flash = new THREE.PointLight(0xffba54, 0, 110, 2);
  private flashLife = 0;
  private player: PlayerEntity | null = null;
  private arena: ArenaDef | null = null;
  private mode: 'overhead' | 'first-person' = 'overhead';
  private actorStyle: 'voxel' | 'billboard' = 'voxel';
  private tilt = 0.78;
  private crt = true;
  private grain = true;
  private colorblind = false;
  private lastWidth = 0;
  private lastHeight = 0;
  private clock = 0;

  constructor(app: Application) {
    this.app = app;
    this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.id = 'three-canvas';
    this.renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
    document.getElementById('app')!.insertBefore(this.renderer.domElement, document.getElementById('ui-layer'));
    app.canvas.style.visibility = 'hidden';

    this.scene.background = color(0x8b8c7d);
    this.scene.fog = new THREE.FogExp2(0x8b8c7d, 0.00031);
    this.scene.add(this.worldGroup);
    this.scene.add(this.camera3d);
    this.buildFirstPersonWeapon();
    this.scene.add(new THREE.HemisphereLight(0xd9d7c5, 0x626455, 2.5));
    const sun = new THREE.DirectionalLight(0xffe7c6, 2.8);
    sun.position.set(-280, 580, 360);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -650;
    sun.shadow.camera.right = 650;
    sun.shadow.camera.top = 650;
    sun.shadow.camera.bottom = -650;
    sun.shadow.bias = -0.0003;
    this.scene.add(sun);
    this.scene.add(this.flash);

    for (const type of CHARACTER_TYPES) {
      const mesh = new THREE.InstancedMesh(
        buildVoxelCharacterGeometry(type),
        new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 }),
        MAX_ACTORS_PER_TYPE,
      );
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.count = 0;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      this.scene.add(mesh);
      this.characterMeshes.set(type, mesh);
    }

    this.postMaterial = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: this.rt.texture }, uSize: { value: new THREE.Vector2(1, 1) }, uGrain: { value: 0.018 } },
      vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position,1.0);}',
      fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 uSize; uniform float uGrain; varying vec2 vUv;
        void main(){ vec2 uv=vUv; vec3 col=texture2D(tDiffuse,uv).rgb;
        float vign=1.0-0.17*dot((uv-0.5)*1.38,(uv-0.5)*1.38);
        float noise=(fract(sin(dot(uv*uSize,vec2(12.9898,78.233)))*43758.5453)-0.5)*uGrain;
        col=pow(max(col,vec3(0.0)),vec3(1.0/2.2));
        gl_FragColor=vec4(col*vign+noise,1.0); }`,
      depthTest: false,
      depthWrite: false,
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.postMaterial);
    this.postScene.add(quad);
  }

  setViewMode(mode: 'overhead' | 'first-person'): void {
    this.mode = mode;
    this.firstPersonWeapon.visible = mode === 'first-person';
  }

  private buildFirstPersonWeapon(): void {
    const metal = new THREE.MeshBasicMaterial({ color: 0x3c413e, depthTest: false });
    const steel = new THREE.MeshBasicMaterial({ color: 0xaaa99d, depthTest: false });
    const leather = new THREE.MeshBasicMaterial({ color: 0x775b49, depthTest: false });
    const skin = new THREE.MeshBasicMaterial({ color: 0xc5a082, depthTest: false });
    const part = (w: number, h: number, d: number, x: number, y: number, z: number, material: THREE.Material) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
      mesh.position.set(x, y, z);
      mesh.renderOrder = 100;
      this.firstPersonWeapon.add(mesh);
    };
    part(3.5, 2.4, 12, 0, 0, -6, metal);
    part(3.8, 1, 8, 0, 1.5, -7, steel);
    part(2.4, 2.1, 3, 0, -1.7, -3, leather);
    part(2.7, 2.6, 3.4, -1.1, -3.2, -1.7, skin);
    part(2.5, 2.3, 3, 1.7, -1.5, -7.5, skin);
    part(3.2, 0.7, 1.2, 0, 2.3, -4.2, steel);
    this.firstPersonWeapon.position.set(4.5, -8, -19);
    this.firstPersonWeapon.visible = false;
    this.camera3d.add(this.firstPersonWeapon);
  }
  setActorStyle(style: 'voxel' | 'billboard'): void {
    this.actorStyle = style;
    for (const mesh of this.characterMeshes.values()) mesh.visible = style === 'voxel';
    for (const sprite of this.actorSprites.values()) sprite.visible = style === 'billboard';
  }
  setTilt(tilt: number): void { this.tilt = tilt; }
  setColorblind(enabled: boolean): void { this.colorblind = enabled; }
  setCrt(enabled: boolean, dithering: boolean): void {
    this.crt = enabled;
    this.grain = dithering;
    this.postMaterial.uniforms.uGrain.value = this.grain ? 0.018 : 0;
  }

  private actorTint(type: string, elite: boolean): number {
    if (this.colorblind) return enemyTint(type, elite, 'colorblind');
    return elite ? 0xd3a979 : WASTELAND_TINTS[type] ?? 0x9fac82;
  }

  buildArena(arena: ArenaDef, player: PlayerEntity): void {
    this.clear();
    this.player = player;
    this.arena = arena;
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(arena.worldWidth, arena.worldHeight),
      new THREE.MeshStandardMaterial({ color: arena.id === 'forest' ? 0x55594b : arena.id === 'industrial' ? 0x6a695f : 0x676b5c, roughness: 1, metalness: 0 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(arena.worldWidth / 2, -1, arena.worldHeight / 2);
    ground.receiveShadow = true;
    this.worldGroup.add(ground);
    this.addGroundDetails(arena);
    for (const obs of arena.obstacles) {
      if (obs.label?.startsWith('tree')) {
        this.addDeadTree(obs.x + obs.width / 2, obs.y + obs.height / 2, 1);
        continue;
      }
      if (obs.width > 80 && !obs.label?.startsWith('rock') && !obs.label?.startsWith('container')) {
        this.addRuin(obs.x, obs.y, obs.width, obs.height);
        continue;
      }
      const h = obs.label?.startsWith('tree') ? 92 : obs.label?.startsWith('pillar') ? 76 :
        obs.label?.startsWith('rock') ? 24 : obs.label?.startsWith('car') ? 22 : obs.label?.startsWith('container') ? 55 : 70;
      const mat = new THREE.MeshStandardMaterial({ color: obs.label?.startsWith('rock') ? 0x7b796a : obs.label?.startsWith('car') ? 0x765a4f : 0x746e60,
        roughness: 0.92, metalness: obs.label?.startsWith('container') ? 0.55 : 0.15 });
      const box = new THREE.Mesh(new THREE.BoxGeometry(obs.width, h, obs.height), mat);
      box.position.set(obs.x + obs.width / 2, h / 2, obs.y + obs.height / 2);
      box.castShadow = true;
      box.receiveShadow = true;
      this.worldGroup.add(box);
      if (obs.label?.startsWith('car')) {
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(obs.width * 0.55, 12, obs.height * 0.7), new THREE.MeshStandardMaterial({ color: 0x625c50, metalness: 0.3, roughness: 0.85 }));
        cabin.position.set(0, h / 2 + 6, 0); box.add(cabin);
        for (const side of [-1, 1]) {
          const light = new THREE.Mesh(new THREE.BoxGeometry(3, 5, 7), new THREE.MeshBasicMaterial({ color: side < 0 ? 0x72362c : 0xae9c70 }));
          light.position.set(side * (obs.width / 2 - 1), -2, 0); box.add(light);
        }
      } else if (!obs.label?.startsWith('rock') && !obs.label?.startsWith('pillar')) {
        const roof = new THREE.Mesh(new THREE.BoxGeometry(obs.width + 5, 3, obs.height + 5), new THREE.MeshStandardMaterial({ color: 0x514c43, metalness: 0.18, roughness: 0.8 }));
        roof.position.set(0, h / 2 + 1.5, 0); box.add(roof);
        const winMat = new THREE.MeshBasicMaterial({ color: 0x202927 });
        for (let cx = -obs.width / 2 + 22; cx < obs.width / 2 - 10; cx += 34) {
          const windowPane = new THREE.Mesh(new THREE.BoxGeometry(15, 13, 1), winMat);
          windowPane.position.set(cx, 8, obs.height / 2 + 0.6); box.add(windowPane);
          const sill = new THREE.Mesh(new THREE.BoxGeometry(20, 2, 3), new THREE.MeshStandardMaterial({ color: 0x4b453c }));
          sill.position.set(cx, 0, obs.height / 2 + 1.5); box.add(sill);
        }
      }
    }
  }

  private addGroundDetails(arena: ArenaDef): void {
    const rand = (n: number) => {
      const v = Math.sin(n * 127.1 + 83.7) * 43758.5453;
      return v - Math.floor(v);
    };
    const patch = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(1, 1, 1, 7),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }), 240,
    );
    const dummy = new THREE.Object3D();
    const colors = [0x555747, 0x727261, 0x4a4c43, 0x777565, 0x5e5a4c];
    for (let i = 0; i < 240; i++) {
      const x = rand(i * 3 + 2) * arena.worldWidth;
      const z = rand(i * 3 + 3) * arena.worldHeight;
      const radius = 13 + rand(i * 5 + 9) * 52;
      // A stable per-instance height prevents overlapping patches from z-fighting.
      dummy.position.set(x, -0.45 + i * 0.0015, z);
      dummy.rotation.set(0, rand(i * 7 + 1) * Math.PI, 0);
      dummy.scale.set(radius, 0.6, radius * (0.35 + rand(i * 2 + 12) * 0.5));
      dummy.updateMatrix(); patch.setMatrixAt(i, dummy.matrix);
      patch.setColorAt(i, color(colors[Math.floor(rand(i * 11 + 4) * colors.length)]));
    }
    patch.receiveShadow = true; patch.frustumCulled = false; this.worldGroup.add(patch);

    const debris = new THREE.InstancedMesh(
      new THREE.DodecahedronGeometry(1, 0),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }), 260,
    );
    for (let i = 0; i < 260; i++) {
      const x = rand(i * 5 + 312) * arena.worldWidth;
      const z = rand(i * 7 + 813) * arena.worldHeight;
      const r = 2 + rand(i * 13 + 26) * 10;
      dummy.position.set(x, r * 0.28, z);
      dummy.rotation.set(rand(i * 17 + 8), rand(i * 19 + 1) * Math.PI, rand(i * 23 + 2));
      dummy.scale.set(r, r * 0.55, r * 0.7);
      dummy.updateMatrix(); debris.setMatrixAt(i, dummy.matrix);
      debris.setColorAt(i, color([0x777365, 0x4d4b42, 0x8b8170][i % 3]));
    }
    debris.castShadow = true; debris.frustumCulled = false; this.worldGroup.add(debris);

    if (arena.id === 'town' || arena.id === 'industrial') {
      // Remnants of two roads: slabs have gaps, misaligned edges, and no lane grid.
      const slabs = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }), 26);
      for (let i = 0; i < 26; i++) {
        const horizontal = i < 16;
        const lane = horizontal ? i : i - 16;
        const x = horizontal ? lane * 138 + rand(i * 3) * 19 : arena.worldWidth / 2 + (rand(i * 9) - 0.5) * 82;
        const z = horizontal ? arena.worldHeight / 2 + (rand(i * 5) - 0.5) * 76 : lane * 158 + rand(i * 2) * 20;
        dummy.position.set(x, 0.20 + i * 0.0015, z);
        dummy.rotation.set(0, (rand(i * 7) - 0.5) * 0.13, 0);
        dummy.scale.set(horizontal ? 64 + rand(i * 11) * 42 : 55 + rand(i * 11) * 30,
          0.45, horizontal ? 33 + rand(i * 13) * 25 : 60 + rand(i * 13) * 40);
        dummy.updateMatrix(); slabs.setMatrixAt(i, dummy.matrix);
        slabs.setColorAt(i, color([0x52564f, 0x77796d, 0x62665b, 0x494e49][i % 4]));
      }
      slabs.receiveShadow = true; slabs.frustumCulled = false; this.worldGroup.add(slabs);
    }

    // Scattered dead trees keep the silhouette of the destroyed landscape.
    if (arena.id !== 'forest') for (let i = 0; i < 8; i++) {
      const x = 130 + rand(i * 17 + 4) * (arena.worldWidth - 260);
      const z = 100 + rand(i * 19 + 7) * (arena.worldHeight - 200);
      if (Math.hypot(x - arena.playerStartX, z - arena.playerStartY) < 300) continue;
      this.addDeadTree(x, z, 0.7 + rand(i * 23 + 1) * 0.5);
    }
  }

  private addDeadTree(x: number, z: number, scale: number): void {
    const bark = new THREE.MeshStandardMaterial({ color: 0x493e35, roughness: 1 });
    const limb = (x1: number, y1: number, z1: number, x2: number, y2: number, z2: number, r: number) => {
      const a = new THREE.Vector3(x1, y1, z1), b = new THREE.Vector3(x2, y2, z2);
      const delta = b.clone().sub(a);
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r, delta.length(), 5), bark);
      mesh.position.copy(a.add(b).multiplyScalar(0.5));
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
      mesh.castShadow = true; this.worldGroup.add(mesh);
    };
    const h = 86 * scale;
    limb(x, 0, z, x + 4 * scale, h, z - 3 * scale, 8 * scale);
    limb(x + 2 * scale, h * 0.55, z, x - 28 * scale, h * 0.92, z + 9 * scale, 4 * scale);
    limb(x + 3 * scale, h * 0.68, z, x + 26 * scale, h * 1.04, z - 8 * scale, 3.5 * scale);
    limb(x - 16 * scale, h * 0.78, z + 5 * scale, x - 27 * scale, h * 1.07, z + 13 * scale, 2 * scale);
    limb(x + 18 * scale, h * 0.9, z - 5 * scale, x + 34 * scale, h * 1.08, z - 12 * scale, 1.7 * scale);
  }

  private addRuin(x: number, z: number, w: number, d: number): void {
    const concrete = new THREE.MeshStandardMaterial({ color: 0x8b897b, roughness: 1 });
    const scorched = new THREE.MeshStandardMaterial({ color: 0x5e5d54, roughness: 1 });
    const wall = (cx: number, cy: number, cz: number, sx: number, sy: number, sz: number, dark = false) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), dark ? scorched : concrete);
      mesh.position.set(cx, cy, cz); mesh.castShadow = true; mesh.receiveShadow = true;
      this.worldGroup.add(mesh);
    };
    wall(x + w / 2, 1.5, z + d / 2, w, 3, d, true);
    const frontZ = z + d - 5, backZ = z + 5;
    wall(x + w * 0.2, 38, frontZ, w * 0.4, 76, 10);
    wall(x + w * 0.77, 29, frontZ, w * 0.32, 58, 10, true);
    wall(x + w * 0.42, 46, backZ, w * 0.7, 92, 10, true);
    wall(x + 5, 32, z + d * 0.36, 10, 64, d * 0.72);
    wall(x + w - 5, 42, z + d * 0.7, 10, 84, d * 0.48, true);
    // Exposed fractured caps and rubble piles break the clean box silhouettes.
    for (let i = 0; i < 7; i++) {
      const px = x + 12 + (i * 47) % Math.max(20, w - 20);
      const pz = z + 8 + (i * 31) % Math.max(20, d - 16);
      wall(px, 5 + (i % 3) * 2, pz, 13 + (i % 3) * 6, 9, 10 + (i % 2) * 7, i % 2 === 0);
    }
    const beamMat = new THREE.MeshStandardMaterial({ color: 0x5c443a, metalness: 0.6, roughness: 0.7 });
    for (const [bx, bz] of [[x + w * 0.18, frontZ], [x + w * 0.74, backZ]]) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(3, 27, 3), beamMat);
      beam.position.set(bx, 88, bz); beam.rotation.z = 0.2;
      this.worldGroup.add(beam);
    }
  }

  clear(): void {
    for (const child of [...this.worldGroup.children]) {
      this.worldGroup.remove(child);
      if (child instanceof THREE.Mesh) { child.geometry.dispose(); (child.material as THREE.Material).dispose(); }
    }
    for (const m of this.projectiles.values()) this.scene.remove(m);
    for (const m of this.pickups.values()) this.scene.remove(m);
    this.projectiles.clear(); this.pickups.clear();
    for (const sprite of this.actorSprites.values()) {
      this.scene.remove(sprite);
      (sprite.material as THREE.Material).dispose();
    }
    this.actorSprites.clear();
    for (const p of this.particles) this.scene.remove(p.mesh);
    this.particles.length = 0;
    for (const d of this.damageTexts) { this.scene.remove(d.sprite); d.texture.dispose(); }
    this.damageTexts.length = 0;
    for (const mesh of this.characterMeshes.values()) mesh.count = 0;
  }

  addZombie(_z: ZombieEntity): void { /* One instanced batch is rebuilt from World each frame. */ }
  removeZombie(id: number): void {
    const sprite = this.actorSprites.get(id);
    if (sprite) { this.scene.remove(sprite); (sprite.material as THREE.Material).dispose(); this.actorSprites.delete(id); }
  }
  addProjectile(p: ProjectileEntity): void {
    const m = new THREE.Mesh(this.bulletGeometry, p.owner === 'spitter' ? this.acidMaterial : this.bulletMaterial);
    this.projectiles.set(p.id, m); this.scene.add(m);
  }
  removeProjectile(id: number): void { const m = this.projectiles.get(id); if (m) this.scene.remove(m); this.projectiles.delete(id); }
  addPickup(p: PickupEntity): void { const m = new THREE.Mesh(this.pickupGeometry, this.pickupMaterial); this.pickups.set(p.id, m); this.scene.add(m); }
  removePickup(id: number): void { const m = this.pickups.get(id); if (m) this.scene.remove(m); this.pickups.delete(id); }

  showDamageNumber(x: number, y: number, amount: number, isPlayer: boolean): void {
    if (this.damageTexts.length >= 48) {
      const old = this.damageTexts.shift()!; this.scene.remove(old.sprite); old.texture.dispose();
    }
    const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 64;
    const ctx = canvas.getContext('2d')!; ctx.font = 'bold 32px monospace'; ctx.textAlign = 'center';
    ctx.fillStyle = isPlayer ? '#ff6655' : '#ffe866'; ctx.fillText(`-${Math.round(amount)}`, 64, 42);
    const texture = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
    sprite.position.set(x, 42, y); sprite.scale.set(46, 23, 1);
    this.scene.add(sprite); this.damageTexts.push({ sprite, texture, life: 0.7 });
  }
  showMuzzleFlash(x: number, y: number, _angle: number): void {
    this.flash.position.set(x, 25, y); this.flash.intensity = 12; this.flashLife = 0.08;
  }
  spawnBlood(x: number, y: number, count: number): void { this.burst(x, y, count, 0); }
  spawnAcid(x: number, y: number, count: number): void { this.burst(x, y, count, 3); }
  spawnExplosion(x: number, y: number, count: number): void { this.burst(x, y, count, 2); }
  private burst(x: number, y: number, count: number, material: number): void {
    const n = Math.min(count, 240 - this.particles.length);
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(this.particleGeometry, this.particleMaterials[material]);
      m.position.set(x, 18, y); this.scene.add(m);
      this.particles.push({ mesh: m, vx: (Math.random()-.5)*150, vy: Math.random()*150, vz: (Math.random()-.5)*150, life: 0.5+Math.random()*0.35 });
    }
  }

  applyCamera(camera: Camera): void {
    if (!this.player) return;
    const p = this.player;
    if (this.mode === 'first-person') {
      this.camera3d.position.set(p.x, 29, p.y);
      this.camera3d.lookAt(p.x + Math.cos(p.angle) * 100, 27, p.y + Math.sin(p.angle) * 100);
      camera.setMapping(null, (sx) => {
        const angle = -Math.PI / 2 + (sx / Math.max(1, camera.width) - 0.5) * Math.PI * 2;
        return { x: p.x + Math.cos(angle) * 250, y: p.y + Math.sin(angle) * 250 };
      });
    } else {
      const distance = this.tilt === 1 ? 690 : 510;
      this.camera3d.position.set(camera.x + camera.offsetX, distance, camera.y + (this.tilt === 1 ? 0 : 370) + camera.offsetY);
      this.camera3d.lookAt(camera.x, 0, camera.y);
      camera.setMapping(
        (x, y) => { const v = new THREE.Vector3(x, 0, y).project(this.camera3d); return { x: (v.x+1)*camera.width/2, y: (1-v.y)*camera.height/2 }; },
        (sx, sy) => {
          this.ray.setFromCamera(new THREE.Vector2(sx / camera.width * 2 - 1, 1 - sy / camera.height * 2), this.camera3d);
          const target = new THREE.Vector3();
          if (this.ray.ray.intersectPlane(this.groundPlane, target)) return { x: target.x, y: target.z };
          return { x: p.x, y: p.y - 500 };
        },
      );
    }
    this.camera3d.aspect = Math.max(1, camera.width) / Math.max(1, camera.height);
    this.camera3d.updateProjectionMatrix();
  }

  resize(width: number, height: number): void {
    if (width === this.lastWidth && height === this.lastHeight) return;
    this.lastWidth = width; this.lastHeight = height;
    this.renderer.setSize(width, height);
    this.rt.setSize(Math.round(width * this.renderer.getPixelRatio()), Math.round(height * this.renderer.getPixelRatio()));
    this.postMaterial.uniforms.uSize.value.set(width, height);
  }

  update(dt: number, world: World | null): void {
    this.clock += dt;
    if (world) {
      this.player = world.player;
      if (this.actorStyle === 'voxel') this.updateVoxels(world);
      else this.updateBillboards(world);
      for (const p of world.projectiles) {
        const m = this.projectiles.get(p.id); if (m) m.position.set(p.x, 17, p.y);
      }
      for (const p of world.pickups) {
        const m = this.pickups.get(p.id); if (m) { m.position.set(p.x, 12 + Math.sin(this.clock*4+p.id)*3, p.y); m.rotation.y += dt; m.visible = !p.blinking || Math.floor(this.clock*5)%2===0; }
      }
    }
    this.flashLife -= dt; if (this.flashLife <= 0) this.flash.intensity = 0;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]; p.life -= dt;
      if (p.life <= 0) { this.scene.remove(p.mesh); this.particles.splice(i, 1); continue; }
      p.mesh.position.x += p.vx*dt; p.mesh.position.y = Math.max(2,p.mesh.position.y+p.vy*dt); p.mesh.position.z += p.vz*dt;
      p.vy -= 330*dt; p.mesh.scale.setScalar(Math.min(1,p.life*2));
    }
    for (let i = this.damageTexts.length - 1; i >= 0; i--) {
      const d = this.damageTexts[i]; d.life -= dt; d.sprite.position.y += 32*dt;
      (d.sprite.material as THREE.SpriteMaterial).opacity = Math.max(0,d.life/0.7);
      if (d.life <= 0) { this.scene.remove(d.sprite); d.texture.dispose(); (d.sprite.material as THREE.Material).dispose(); this.damageTexts.splice(i,1); }
    }
    if (this.crt) {
      this.renderer.setRenderTarget(this.rt); this.renderer.render(this.scene, this.camera3d);
      this.renderer.setRenderTarget(null); this.renderer.render(this.postScene, this.postCamera);
    } else this.renderer.render(this.scene, this.camera3d);
  }

  private updateVoxels(world: World): void {
    const counts = new Map<VoxelCharacterType, number>();
    const place = (type: VoxelCharacterType, x: number, z: number, angle: number, speed: number, id: number) => {
      const mesh = this.characterMeshes.get(type)!;
      const index = counts.get(type) ?? 0;
      if (index >= MAX_ACTORS_PER_TYPE) return;
      const size = type === 'abomination' ? 2.05 : type === 'brute' ? 1.5 : type === 'armored' ? 1.17 : type === 'crawler' ? 0.82 : 1;
      const moving = Math.min(1, speed / 60);
      const bob = moving * Math.max(0, Math.sin(this.clock * (type === 'runner' ? 13 : 9) + id)) * 1.3;
      this.dummy.position.set(x, bob, z);
      this.dummy.rotation.set(0, Math.PI / 2 - angle, 0);
      this.dummy.scale.set(size, type === 'crawler' ? size * 0.66 : size, size);
      this.dummy.updateMatrix();
      mesh.setMatrixAt(index, this.dummy.matrix);
      counts.set(type, index + 1);
    };
    if (this.mode === 'overhead') place('player', world.player.x, world.player.y, world.player.angle,
      Math.hypot(world.player.vx, world.player.vy), -1);
    for (const z of world.zombies) {
      if (z.state === 'dead' && z.deathTimer <= 0) continue;
      place(z.type, z.x, z.y, z.angle, Math.hypot(z.vx, z.vy), z.id);
    }
    for (const [type, mesh] of this.characterMeshes) {
      mesh.count = counts.get(type) ?? 0;
      if (mesh.count > 0) mesh.instanceMatrix.needsUpdate = true;
    }
  }

  private textureFor(type: string): THREE.Texture {
    const cached = this.actorTextures.get(type);
    if (cached) return cached;
    const frame = FRAMES[type] ?? FRAMES.walker;
    const cols = Math.max(...frame.map(row => row.length));
    const canvas = document.createElement('canvas');
    canvas.width = cols * 12; canvas.height = frame.length * 12;
    const ctx = canvas.getContext('2d')!;
    for (let y = 0; y < frame.length; y++) for (let x = 0; x < frame[y].length; x++) {
      const glyph = frame[y][x];
      if (glyph === ' ') continue;
      ctx.fillStyle = 'white';
      ctx.fillRect(x * 12 + 1, y * 12 + 1, 10, 10);
      if ('x•●o'.includes(glyph)) { ctx.fillStyle = '#14221d'; ctx.fillRect(x * 12 + 3, y * 12 + 3, 6, 6); }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    this.actorTextures.set(type, texture);
    return texture;
  }

  private updateBillboards(world: World): void {
    const place = (id: number, type: string, x: number, z: number, tint: number, size: number, visible: boolean) => {
      let sprite = this.actorSprites.get(id);
      if (!sprite) {
        sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.textureFor(type), transparent: true, depthWrite: false }));
        sprite.center.set(0.5, 0);
        this.actorSprites.set(id, sprite);
        this.scene.add(sprite);
      }
      sprite.visible = visible;
      sprite.position.set(x, 1, z);
      sprite.scale.set((FRAMES[type]?.[0].length ?? 5) * 12 * size, (FRAMES[type]?.length ?? 4) * 12 * size, 1);
      (sprite.material as THREE.SpriteMaterial).color.setHex(tint);
    };
    place(-1, 'player', world.player.x, world.player.y, 0x44e9ff, 1.1, this.mode === 'overhead');
    for (const z of world.zombies) {
      const tint = z.hitFlashTimer > 0 ? 0xffffff : this.actorTint(z.type, z.elite);
      const size = z.type === 'abomination' ? 1.7 : z.type === 'brute' ? 1.3 : z.type === 'crawler' ? 0.8 : 1;
      place(z.id, z.type, z.x, z.y, tint, size, z.state !== 'dead' || z.deathTimer > 0);
    }
  }

  dispose(): void {
    this.clear(); this.renderer.domElement.remove(); this.renderer.dispose(); this.rt.dispose();
    for (const mesh of this.characterMeshes.values()) { mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose(); }
    const weaponMaterials = new Set<THREE.Material>();
    for (const child of this.firstPersonWeapon.children) if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      weaponMaterials.add(child.material as THREE.Material);
    }
    for (const material of weaponMaterials) material.dispose();
    this.bulletGeometry.dispose();
    this.bulletMaterial.dispose(); this.acidMaterial.dispose(); this.pickupGeometry.dispose(); this.pickupMaterial.dispose();
    this.particleGeometry.dispose(); for (const m of this.particleMaterials) m.dispose();
    for (const texture of this.actorTextures.values()) texture.dispose();
    this.postMaterial.dispose(); this.app.canvas.style.visibility = '';
  }
}

export function createSceneRenderer(app: Application): SceneRenderer { return new ThreeSceneRenderer(app); }
