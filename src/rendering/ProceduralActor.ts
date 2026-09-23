import { Container, Graphics } from 'pixi.js';
import type { ZombieType } from '../config/zombies';

export type ActorKind = ZombieType | 'player';

/** Hand-drawn Pixi silhouettes. Every shape is generated at startup in JS. */
export class ProceduralActor extends Container {
  readonly glyphWidth = 64;
  readonly glyphHeight = 78;
  currentFrame = 0;
  private readonly art = new Graphics();
  private readonly leftLeg = new Graphics();
  private readonly rightLeg = new Graphics();
  private readonly leftArm = new Graphics();
  private readonly rightArm = new Graphics();
  private readonly flash = new Graphics();
  private readonly weapon = new Graphics();
  private readonly normalTint: number;

  constructor(kind: ActorKind, normalTint: number) {
    super();
    this.normalTint = normalTint;
    this.draw(kind);
    this.addChild(this.leftLeg, this.rightLeg, this.art, this.leftArm, this.rightArm, this.weapon, this.flash);
    if (kind !== 'player') this.weapon.visible = false;
    this.flash.visible = false;
  }

  showFrame(frame: number): void {
    this.currentFrame = frame;
    const phase = (frame % 8) * Math.PI / 4;
    const wave = Math.sin(phase);
    const counterWave = Math.sin(phase + Math.PI / 2);
    const step = wave * 2.4;
    this.leftLeg.y = step;
    this.rightLeg.y = -step;
    this.leftLeg.rotation = wave * 0.035;
    this.rightLeg.rotation = -wave * 0.035;
    this.leftArm.y = -step * 0.65;
    this.rightArm.y = step * 0.65;
    this.leftArm.rotation = counterWave * 0.07;
    this.rightArm.rotation = -counterWave * 0.07;
    // A small squash and bob makes the silhouettes feel alive while the
    // parent remains feet-anchored in world space.
    this.art.y = wave * 1.1;
    this.art.scale.set(1 + counterWave * 0.035, 1 - counterWave * 0.03);
    this.art.rotation = wave * 0.018;
  }

  setTint(tint: number): void {
    this.flash.visible = tint === 0xffffff;
    this.art.tint = tint === this.normalTint || tint === 0xffffff ? 0xffffff : tint;
  }

  setFacing(angle: number): void {
    this.weapon.rotation = angle;
  }

  private draw(kind: ActorKind): void {
    const fill = (g: Graphics, x: number, y: number, w: number, h: number, c: number) => {
      g.roundRect(x, y, w, h, Math.min(8, Math.min(w, h) * 0.42)).fill(c);
    };
    const eye = (x: number, y: number, c: number) => {
      this.art.rect(x, y, 6, 4).fill(c);
    };
    const legs = (c: number, spread = 0) => {
      fill(this.leftLeg, 20 - spread, 53, 10, 24, c);
      fill(this.rightLeg, 34 + spread, 53, 10, 24, c);
      fill(this.leftLeg, 17 - spread, 73, 14, 5, 0x242827);
      fill(this.rightLeg, 33 + spread, 73, 14, 5, 0x242827);
    };
    const arms = (c: number, width = 9) => {
      fill(this.leftArm, 9, 32, width, 29, c);
      fill(this.rightArm, 55 - width, 32, width, 29, c);
    };
    switch (kind) {
      case 'player':
        legs(0x354b55);
        fill(this.art, 17, 30, 30, 27, 0x2bced0);
        fill(this.art, 19, 32, 26, 6, 0xf6e8c8);
        fill(this.art, 23, 39, 18, 11, 0x176f87);
        arms(0xffc6a1);
        fill(this.art, 20, 12, 24, 20, 0xffb58f);
        fill(this.art, 16, 7, 32, 9, 0xffe7bf);
        fill(this.art, 18, 16, 28, 8, 0x5df6e4);
        fill(this.art, 21, 15, 22, 3, 0x173d62);
        fill(this.art, 25, 47, 14, 6, 0xff77bd);
        // Mount the weapon at the character's forward hand. The local origin
        // is the grip, so rotation keeps the grip in the hand while the
        // barrel follows the aim direction.
        fill(this.weapon, 0, -4, 18, 8, 0x303939);
        fill(this.weapon, 14, -3, 20, 6, 0x899897);
        fill(this.weapon, 34, -2, 8, 3, 0xeeb76c);
        fill(this.weapon, 7, 3, 6, 9, 0x303939);
        this.weapon.pivot.set(0, 0);
        this.weapon.position.set(49, 52);
        break;
      case 'walker':
        legs(0x55574a);
        fill(this.art, 16, 30, 32, 29, 0x304d59);
        fill(this.art, 13, 12, 34, 23, 0x6de0b5);
        fill(this.art, 11, 10, 31, 7, 0x256a69);
        arms(0x7ff0c4);
        this.rightArm.y = 8;
        eye(21, 23, 0xf5d475); eye(37, 23, 0xf5d475);
        fill(this.art, 26, 35, 13, 7, 0xa64943);
        break;
      case 'runner':
        legs(0x6b403b, 3);
        fill(this.art, 20, 31, 24, 26, 0x6e3157);
        fill(this.art, 18, 11, 29, 24, 0xff6f91);
        fill(this.art, 16, 8, 31, 7, 0xffb06f);
        arms(0xff9d8f, 7);
        eye(23, 22, 0xffdf74); eye(38, 22, 0xffdf74);
        fill(this.art, 27, 37, 11, 6, 0x9e463f);
        break;
      case 'brute':
        legs(0x5d4944, 4);
        fill(this.art, 8, 27, 48, 35, 0x7c2f78);
        fill(this.art, 20, 9, 24, 22, 0xff5c9d);
        fill(this.art, 5, 28, 16, 18, 0xff6e7e);
        fill(this.art, 43, 28, 16, 18, 0xff6e7e);
        arms(0xff799f, 13);
        fill(this.leftArm, 5, 55, 17, 16, 0x9f3b72);
        fill(this.rightArm, 42, 55, 17, 16, 0x9f3b72);
        eye(23, 20, 0xffd570); eye(37, 20, 0xffd570);
        break;
      case 'spitter':
        legs(0x385a54);
        fill(this.art, 13, 26, 38, 34, 0x315d7a);
        fill(this.art, 17, 8, 30, 23, 0x9cf04f);
        fill(this.art, 11, 31, 42, 14, 0xd9ff4f);
        fill(this.art, 18, 34, 28, 6, 0xf4ffad);
        arms(0x9eea69);
        eye(21, 19, 0xf5ef98); eye(37, 19, 0xf5ef98);
        fill(this.art, 26, 28, 12, 5, 0xd3f254);
        break;
      case 'crawler':
        fill(this.art, 11, 38, 42, 18, 0x453b80);
        fill(this.art, 19, 29, 31, 18, 0xd18cff);
        fill(this.art, 19, 49, 30, 9, 0xff5fa2);
        fill(this.leftArm, 1, 47, 20, 9, 0xd18cff);
        fill(this.rightArm, 44, 47, 19, 9, 0xd18cff);
        fill(this.leftLeg, 12, 56, 16, 10, 0x453b80);
        fill(this.rightLeg, 37, 56, 16, 10, 0x453b80);
        eye(26, 37, 0xffdc81); eye(41, 37, 0xffdc81);
        break;
      case 'armored':
        legs(0x33464d);
        fill(this.art, 13, 28, 38, 34, 0x24509a);
        fill(this.art, 17, 29, 30, 8, 0x65d9ff);
        fill(this.art, 13, 7, 38, 24, 0x3272bf);
        fill(this.art, 16, 6, 32, 7, 0xa3edff);
        fill(this.art, 19, 18, 26, 6, 0x6fffe0);
        arms(0x78dfff);
        fill(this.leftArm, 4, 32, 15, 33, 0x6fcfff);
        fill(this.leftArm, 7, 35, 9, 22, 0x203e88);
        break;
      case 'exploder':
        legs(0x57433d);
        fill(this.art, 9, 28, 46, 35, 0x9d3e38);
        this.art.circle(32, 43, 20).fill(0xff7045);
        this.art.circle(32, 43, 11).fill(0xffd45e);
        fill(this.art, 19, 8, 26, 25, 0xff8664);
        arms(0xff8c5a);
        eye(22, 19, 0xffda76); eye(38, 19, 0xffda76);
        break;
      case 'abomination':
        legs(0x524258, 5);
        fill(this.art, 8, 21, 48, 43, 0x542a9b);
        fill(this.art, 14, 15, 40, 18, 0xf05ad5);
        fill(this.art, 19, 2, 27, 28, 0x3f42a6);
        fill(this.art, 16, 6, 5, 16, 0xffd36b);
        fill(this.art, 45, 6, 5, 16, 0xffd36b);
        arms(0xff6dcf, 13);
        fill(this.leftArm, 0, 46, 19, 29, 0xe14cbb);
        fill(this.rightArm, 46, 49, 16, 25, 0xa640bd);
        eye(23, 16, 0xee86c4); eye(39, 16, 0xee86c4);
        break;
    }
    // A single broad white mask makes short hit flashes legible at any scale.
    fill(this.flash, 16, 10, 32, 48, 0xffffff);
    fill(this.flash, 9, 33, 10, 27, 0xffffff);
    fill(this.flash, 45, 33, 10, 27, 0xffffff);
  }
}
