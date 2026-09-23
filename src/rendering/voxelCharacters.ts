import * as THREE from 'three';
import type { ZombieType } from '../config/zombies';

export type VoxelCharacterType = ZombieType | 'player';
type CellMap = Map<string, number>;
const CELL = 3.35;

/** Small hand-authored voxel sculptures. Visible faces only are emitted. */
export function buildVoxelCharacterGeometry(type: VoxelCharacterType): THREE.BufferGeometry {
  const cells: CellMap = new Map();
  const put = (x: number, y: number, z: number, c: number) => cells.set(`${x},${y},${z}`, c);
  const box = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, c: number) => {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) put(x, y, z, c);
  };
  const bone = 0xd9c9a3;
  const eye = 0xffd46f;
  const dark = 0x242b2d;
  const blood = 0x9f3e39;
  const acid = 0xb8ed45;
  const edge = 0xe5c99b;

  // Each enemy is built from a different outline. Bright identifying marks
  // also reach the top planes, where the isometric camera can read them.
  switch (type) {
    case 'player': {
      const armor = 0xe2d6bb, coat = 0x69898b, leather = 0x9a6547, visor = 0x79e7ee;
      box(-3, -1, 0, 6, -2, 2, 0x303a41);
      box(1, 3, 0, 6, -2, 2, 0x303a41);
      box(-4, -1, 0, 1, 1, 4, dark); box(1, 4, 0, 1, 1, 4, dark);
      box(-5, 5, 6, 13, -3, 3, coat);
      box(-5, 5, 12, 13, -3, 3, armor);
      box(-3, 3, 8, 12, 4, 4, armor);
      box(-4, 4, 7, 12, -6, -4, leather); // pack
      box(-3, 3, 11, 13, -7, -6, 0xd99a59);
      box(-7, -5, 8, 12, -3, 3, armor); box(5, 7, 8, 12, -3, 3, armor);
      box(-7, -5, 11, 13, -3, 3, 0xf0e5ce); box(5, 7, 11, 13, -3, 3, 0xf0e5ce);
      box(-6, 6, 14, 21, -4, 4, 0xc59d80); // helmet + face
      box(-7, 7, 20, 22, -4, 4, armor);
      box(-7, 7, 19, 19, 3, 6, armor); // helmet brim
      box(-5, 5, 16, 18, 5, 5, visor);
      box(-4, 4, 21, 22, -4, -3, 0xd69052);
      // Both forearms join at the receiver instead of a floating side gun.
      box(-6, -4, 8, 10, 3, 8, coat); box(4, 6, 8, 10, 3, 8, coat);
      box(-5, -3, 8, 9, 8, 10, 0xc59d80); box(3, 5, 8, 9, 8, 10, 0xc59d80);
      box(-2, 2, 9, 11, 5, 15, dark);
      box(-2, 2, 11, 11, 7, 12, 0xb9c4bb);
      box(-1, 1, 10, 10, 16, 19, 0x343b3a);
      box(0, 0, 11, 11, 19, 20, 0xebba73);
      break;
    }
    case 'walker': {
      const skin = 0x8daa82, coat = 0x66584e;
      box(-3, -1, 0, 5, -2, 2, 0x474b3e); box(1, 3, 0, 6, -2, 2, 0x474b3e);
      box(-4, 4, 5, 11, -3, 3, coat);
      box(-5, 5, 10, 13, -3, 3, skin);
      box(-6, 3, 13, 19, -3, 4, skin); // lopsided head
      box(-6, 3, 18, 20, -3, 1, 0x505043);
      box(-4, -3, 16, 17, 5, 5, eye); box(0, 1, 16, 17, 5, 5, eye);
      box(-8, -6, 5, 13, -1, 2, skin); box(5, 7, 2, 11, 0, 3, skin);
      box(-8, -6, 2, 4, 2, 5, blood); box(-2, 1, 10, 11, 4, 5, blood);
      break;
    }
    case 'runner': {
      const flesh = 0xc88658, cloth = 0x713f3a;
      box(-5, -4, 0, 7, -2, 3, dark); box(4, 5, 0, 7, -4, 1, dark);
      box(-5, -3, 0, 2, 2, 5, 0xd6a16a); box(3, 5, 0, 2, -5, -2, 0xd6a16a);
      box(-3, 3, 7, 14, -3, 2, cloth);
      box(-4, 4, 11, 14, -2, 3, flesh);
      box(-4, 4, 15, 20, 0, 5, flesh); // head thrust ahead
      box(-5, 5, 19, 21, -1, 4, 0xe5a163);
      box(-3, 3, 17, 18, 6, 6, eye);
      box(-6, -5, 5, 13, 1, 7, flesh); box(5, 6, 4, 12, 0, 6, flesh);
      box(-6, -4, 4, 5, 7, 9, bone); box(4, 6, 3, 4, 6, 8, bone);
      box(-2, 2, 12, 14, -4, -3, 0xe5a163);
      break;
    }
    case 'brute': {
      const flesh = 0xb65a54, armor = 0x694b49;
      box(-6, -2, 0, 7, -3, 3, 0x55433e); box(2, 6, 0, 7, -3, 3, 0x55433e);
      box(-9, 9, 7, 16, -5, 5, armor);
      box(-12, -7, 13, 19, -5, 5, flesh); box(7, 12, 13, 19, -5, 5, flesh);
      box(-14, -10, 3, 13, -3, 5, flesh); box(10, 14, 3, 13, -3, 5, flesh);
      box(-15, -9, 2, 5, 2, 7, 0x7d3838); box(9, 15, 2, 5, 2, 7, 0x7d3838);
      box(-4, 4, 17, 22, -2, 3, flesh); // small recessed head
      box(-2, -1, 19, 20, 4, 4, eye); box(1, 2, 19, 20, 4, 4, eye);
      box(-10, 10, 15, 17, -5, -3, 0xd17964);
      box(-7, 7, 9, 12, 6, 6, blood);
      break;
    }
    case 'spitter': {
      const skin = 0x7c9b7d, shell = 0x385d58;
      box(-3, -1, 0, 6, -2, 2, dark); box(1, 3, 0, 6, -2, 2, dark);
      box(-6, 6, 6, 13, -5, 3, shell);
      box(-8, 8, 10, 17, -9, -3, acid); // glowing dorsal sacs
      box(-7, 7, 15, 17, -8, -2, 0xe5f59a);
      box(-4, 4, 13, 20, 1, 5, skin);
      box(-3, 3, 16, 17, 6, 7, acid); // toxic mouth
      box(-2, 2, 18, 19, 6, 6, dark);
      box(-8, -6, 5, 12, -2, 3, skin); box(6, 8, 5, 12, -2, 3, skin);
      break;
    }
    case 'crawler': {
      const skin = 0xa097a0, spine = 0x51414e;
      box(-5, 5, 3, 8, -6, 6, spine);
      box(-6, 6, 8, 10, -5, 3, skin);
      box(-4, 4, 7, 11, 6, 11, skin);
      box(-3, -2, 9, 10, 12, 12, eye); box(2, 3, 9, 10, 12, 12, eye);
      box(-10, -6, 1, 5, 4, 12, skin); box(6, 10, 1, 5, 4, 12, skin);
      box(-12, -10, 0, 2, 10, 14, bone); box(10, 12, 0, 2, 10, 14, bone);
      box(-8, -5, 1, 4, -10, -5, skin); box(5, 8, 1, 4, -10, -5, skin);
      box(-3, 3, 10, 11, -5, 5, blood);
      break;
    }
    case 'armored': {
      const steel = 0x7599a5, plate = 0x364a53;
      box(-4, -1, 0, 7, -2, 2, dark); box(1, 4, 0, 7, -2, 2, dark);
      box(-6, 6, 6, 16, -4, 4, plate);
      box(-7, 7, 15, 17, -4, 4, steel);
      box(-5, 5, 9, 14, 5, 6, steel);
      box(-8, 8, 17, 23, -4, 4, plate); // visor helmet
      box(-7, 7, 22, 24, -4, 3, steel);
      box(-5, 5, 19, 20, 5, 5, 0x85e1e8);
      box(-13, -7, 6, 16, -4, 5, steel); // shield shoulder
      box(-14, -10, 3, 11, 2, 8, plate);
      box(7, 10, 7, 15, -2, 3, steel);
      box(-6, 6, 11, 13, -5, -4, 0xb7c6bd);
      break;
    }
    case 'exploder': {
      const hide = 0x8f5445, glow = 0xf5a744;
      box(-3, -1, 0, 5, -2, 2, dark); box(1, 3, 0, 5, -2, 2, dark);
      box(-6, 6, 5, 13, -5, 4, hide);
      box(-10, 10, 7, 16, 0, 9, 0xb65d3e); // swollen abdomen
      box(-8, 8, 15, 18, 2, 8, glow);
      box(-5, 5, 9, 13, 10, 11, glow);
      box(-4, 4, 17, 22, -4, 2, hide);
      box(-3, 3, 20, 21, 3, 3, eye);
      box(-9, -7, 4, 12, -2, 2, hide); box(7, 9, 4, 12, -2, 2, hide);
      box(-5, 5, 12, 15, -6, -6, 0xf0bb60);
      break;
    }
    case 'abomination': {
      const hide = 0x59425b, muscle = 0x9f4969, glow = 0xd56bb0;
      box(-7, -2, 0, 9, -4, 4, hide); box(2, 7, 0, 9, -4, 4, hide);
      box(-10, 10, 8, 19, -6, 6, hide);
      box(-14, 11, 17, 23, -5, 5, muscle);
      box(-17, -10, 11, 24, -5, 4, muscle); // giant left arm
      box(-19, -14, 1, 11, -3, 7, muscle);
      box(9, 13, 10, 19, -4, 5, hide);
      box(11, 16, 6, 12, 3, 9, muscle);
      box(-7, 7, 22, 30, -3, 5, hide);
      box(-5, 5, 25, 27, 6, 7, glow);
      box(-9, -6, 28, 33, -2, 1, bone); box(6, 9, 28, 33, -2, 1, bone);
      box(-9, 9, 19, 21, -7, -6, glow);
      box(-7, 7, 10, 14, 7, 8, blood);
      break;
    }
  }

  const positions: number[] = [], normals: number[] = [], vertexColors: number[] = [], indices: number[] = [];
  const faces = [
    { d: [1, 0, 0], n: [1, 0, 0], v: [[1,0,0],[1,1,0],[1,1,1],[1,0,1]], shade: 0.83 },
    { d: [-1, 0, 0], n: [-1, 0, 0], v: [[0,0,1],[0,1,1],[0,1,0],[0,0,0]], shade: 0.74 },
    { d: [0, 1, 0], n: [0, 1, 0], v: [[0,1,1],[1,1,1],[1,1,0],[0,1,0]], shade: 1.08 },
    { d: [0, -1, 0], n: [0, -1, 0], v: [[0,0,0],[1,0,0],[1,0,1],[0,0,1]], shade: 0.59 },
    { d: [0, 0, 1], n: [0, 0, 1], v: [[1,0,1],[1,1,1],[0,1,1],[0,0,1]], shade: 0.98 },
    { d: [0, 0, -1], n: [0, 0, -1], v: [[0,0,0],[0,1,0],[1,1,0],[1,0,0]], shade: 0.68 },
  ];
  for (const [key, hex] of cells) {
    const [x,y,z] = key.split(',').map(Number);
    const base = new THREE.Color(hex);
    for (const face of faces) {
      if (cells.has(`${x+face.d[0]},${y+face.d[1]},${z+face.d[2]}`)) continue;
      const start = positions.length / 3;
      for (const p of face.v) {
        positions.push((x + p[0]) * CELL, (y + p[1]) * CELL, (z + p[2]) * CELL);
        normals.push(...face.n);
        vertexColors.push(base.r * face.shade, base.g * face.shade, base.b * face.shade);
      }
      indices.push(start, start+1, start+2, start, start+2, start+3);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(vertexColors, 3));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}
