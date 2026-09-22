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
  const colors = {
    player: { skin: 0xc7a486, coat: 0x766e59, shirt: 0xc1b299, pants: 0x4c514c, boot: 0x353631, hair: 0x433a31, eye: 0x242e2d, wound: 0x974f3d },
    walker: { skin: 0xa5aa85, coat: 0x716a58, shirt: 0xc0b59a, pants: 0x525548, boot: 0x414139, hair: 0x5e5548, eye: 0xd4ad69, wound: 0x8f4037 },
    runner: { skin: 0xb99a79, coat: 0x8b5948, shirt: 0x9c8066, pants: 0x4d493e, boot: 0x3b3632, hair: 0x45392e, eye: 0xf0c783, wound: 0x9e4738 },
    brute: { skin: 0x996c65, coat: 0x634847, shirt: 0x88635a, pants: 0x483d3b, boot: 0x302b2a, hair: 0x413231, eye: 0xefb983, wound: 0xa3433c },
    spitter: { skin: 0xaaa47d, coat: 0x6c625e, shirt: 0x857e65, pants: 0x4d4d43, boot: 0x383932, hair: 0x514b42, eye: 0xd4dd8b, wound: 0xa8ba68 },
    crawler: { skin: 0xa0a684, coat: 0x665b4b, shirt: 0xb5a384, pants: 0x4c4b40, boot: 0x34342d, hair: 0x4d453c, eye: 0xe0c17b, wound: 0x8d4937 },
    armored: { skin: 0xa1a38c, coat: 0x636c6c, shirt: 0x87918c, pants: 0x484e4e, boot: 0x303637, hair: 0x5d6260, eye: 0xd9bf7d, wound: 0x8a4940 },
    exploder: { skin: 0xb58d72, coat: 0x7d5a47, shirt: 0x99705b, pants: 0x51443b, boot: 0x35312b, hair: 0x5a3c32, eye: 0xf1c277, wound: 0xba5c3c },
    abomination: { skin: 0x8b6261, coat: 0x674244, shirt: 0x82484a, pants: 0x44383a, boot: 0x2f292b, hair: 0x483235, eye: 0xf1ad87, wound: 0xb94b46 },
  }[type];
  const { skin, coat, shirt, pants, boot, hair, eye, wound } = colors;

  // Wide head, compact layered body, joined arms and legs.
  box(-3, -1, 0, 5, -2, 2, pants);
  box(1, 3, 0, 5, -2, 2, pants);
  box(-4, -1, 0, 1, 1, 4, boot);
  box(1, 4, 0, 1, 1, 4, boot);
  box(-4, 4, 5, 11, -3, 3, coat);
  box(-2, 2, 6, 10, 4, 4, shirt);
  box(-6, -4, 6, 11, -2, 2, type === 'player' ? coat : skin);
  box(4, 6, 6, 11, -2, 2, type === 'player' ? coat : skin);
  box(-6, -4, 5, 6, 2, 3, skin);
  box(4, 6, 5, 6, 2, 3, skin);
  box(-5, 5, 12, 19, -3, 3, skin);
  box(-5, 5, 19, 20, -3, 3, hair);
  box(-5, 5, 14, 18, -4, -3, hair);
  box(-5, -4, 17, 19, -2, 3, hair);
  box(4, 5, 17, 19, -2, 3, hair);
  box(-3, -2, 16, 17, 4, 4, eye);
  box(2, 3, 16, 17, 4, 4, eye);
  box(-1, 1, 14, 14, 4, 4, type === 'player' ? 0x8a6c5a : wound);
  box(-2, 2, 12, 12, 4, 4, type === 'player' ? 0x6e5747 : 0x3f302a);

  if (type === 'player') {
    // Cap, scarf, pack, two hands around a centered rifle.
    box(-5, 5, 20, 21, -3, 3, 0x51594c);
    box(-5, 5, 19, 19, 3, 5, 0x51594c);
    box(-4, 4, 11, 12, -3, 4, 0xa79a78);
    box(-3, 3, 6, 11, -5, -4, 0x585548);
    box(-5, -4, 8, 10, 3, 6, coat);
    box(4, 5, 8, 10, 3, 6, coat);
    box(-4, -3, 8, 9, 6, 7, skin);
    box(3, 4, 8, 9, 6, 7, skin);
    box(-1, 1, 9, 10, 5, 12, 0x353a39);
    box(-1, 1, 10, 10, 8, 9, 0x7b6650);
    box(0, 0, 9, 9, 13, 14, 0xaca89b);
    box(-1, 0, 6, 8, 5, 6, 0x6b493b);
  } else {
    // Damage and asymmetry prevent a toy-like uniform silhouette.
    box(-3, -1, 7, 9, 4, 4, wound);
    box(-4, -4, 6, 8, 3, 4, skin);
    box(4, 5, 8, 9, 2, 3, coat);
    put(0, 18, 4, hair);
    put(3, 13, 4, wound);
  }

  if (type === 'runner') {
    box(-4, 4, 19, 21, -3, 2, 0x654637);
    box(-5, 5, 18, 18, 3, 5, 0x654637);
    box(-6, -6, 10, 12, 0, 2, coat);
  } else if (type === 'brute' || type === 'abomination') {
    box(-8, -5, 8, 14, -3, 3, skin);
    box(5, 8, 8, 14, -3, 3, skin);
    box(-7, 7, 7, 13, -4, 3, coat);
    box(-6, 6, 12, 19, -4, 4, skin);
    box(-2, -1, 16, 17, 5, 5, eye);
    box(2, 3, 16, 17, 5, 5, eye);
    box(-3, -2, 20, 23, -1, 0, 0xd0bd98);
    box(2, 3, 20, 23, -1, 0, 0xd0bd98);
    if (type === 'abomination') {
      box(-9, -7, 5, 11, -3, 3, skin);
      box(7, 9, 5, 11, -3, 3, skin);
      box(-4, 4, 7, 11, 4, 5, wound);
    }
  } else if (type === 'spitter') {
    box(-4, 4, 7, 12, -6, -4, 0x9faf69);
    box(-2, 2, 14, 14, 5, 6, 0xced993);
    box(-1, 1, 11, 12, 4, 5, 0x9faf69);
  } else if (type === 'armored') {
    box(-5, 5, 18, 21, -4, 3, 0x747f7e);
    box(-5, 5, 17, 17, 3, 5, 0x747f7e);
    box(-5, 5, 8, 12, 4, 5, 0x87928e);
    box(-7, -6, 8, 13, -3, 3, 0x7e8988);
    box(6, 7, 8, 13, -3, 3, 0x7e8988);
    box(-2, 2, 13, 14, 5, 5, 0x323938);
  } else if (type === 'exploder') {
    box(-5, 5, 6, 12, 4, 7, 0xb46f4d);
    box(-3, 3, 8, 10, 8, 8, 0xe0a66e);
    box(-1, 1, 9, 11, 9, 9, 0x9b4439);
  } else if (type === 'crawler') {
    box(-5, 5, 5, 8, -4, 5, coat);
    box(-7, -5, 3, 5, 2, 6, skin);
    box(5, 7, 3, 5, 2, 6, skin);
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
