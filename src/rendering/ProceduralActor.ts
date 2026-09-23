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
  private readonly normalTint: number;

  constructor(kind: ActorKind, normalTint: number) {
    super();
    this.normalTint = normalTint;
    this.draw(kind);
    this.addChild(this.leftLeg, this.rightLeg, this.art, this.leftArm, this.rightArm, this.flash);
    this.flash.visible = false;
  }

  showFrame(frame: number): void {
    this.currentFrame = frame;
    const step = frame % 2 === 0 ? -2 : 2;
    this.leftLeg.y = step;
    this.rightLeg.y = -step;
    this.leftArm.y = -step * 0.6;
    this.rightArm.y = step * 0.6;
  }

  setTint(tint: number): void {
    this.flash.visible = tint === 0xffffff;
    this.art.tint = tint === this.normalTint || tint === 0xffffff ? 0xffffff : tint;
  }

  private draw(kind: ActorKind): void {
    const fill = (g: Graphics, x: number, y: number, w: number, h: number, c: number) => {
      g.roundRect(x, y, w, h, 2).fill(c);
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
        fill(this.art, 17, 30, 30, 27, 0x648f91);
        fill(this.art, 19, 32, 26, 6, 0xe5d6b4);
        fill(this.art, 23, 39, 18, 11, 0x3e686d);
        arms(0xd9c9aa);
        fill(this.art, 20, 12, 24, 20, 0xd0ae8a);
        fill(this.art, 16, 7, 32, 9, 0xe6dbc4);
        fill(this.art, 18, 16, 28, 8, 0x58d5df);
        fill(this.art, 21, 15, 22, 3, 0x2b4246);
        fill(this.art, 25, 47, 14, 6, 0xda9455);
        // Rifle crosses both hands and projects in front of the body.
        fill(this.art, 27, 43, 10, 24, 0x303939);
        fill(this.art, 29, 54, 6, 20, 0x899897);
        fill(this.art, 31, 70, 2, 6, 0xeeb76c);
        break;
      case 'walker':
        legs(0x55574a);
        fill(this.art, 16, 30, 32, 29, 0x685b50);
        fill(this.art, 13, 12, 34, 23, 0x91a67e);
        fill(this.art, 11, 10, 31, 7, 0x45493e);
        arms(0x839a76);
        this.rightArm.y = 8;
        eye(21, 23, 0xf5d475); eye(37, 23, 0xf5d475);
        fill(this.art, 26, 35, 13, 7, 0xa64943);
        break;
      case 'runner':
        legs(0x6b403b, 3);
        fill(this.art, 20, 31, 24, 26, 0x77453f);
        fill(this.art, 18, 11, 29, 24, 0xc68460);
        fill(this.art, 16, 8, 31, 7, 0xe6a26b);
        arms(0xc58460, 7);
        eye(23, 22, 0xffdf74); eye(38, 22, 0xffdf74);
        fill(this.art, 27, 37, 11, 6, 0x9e463f);
        break;
      case 'brute':
        legs(0x5d4944, 4);
        fill(this.art, 8, 27, 48, 35, 0x744f4b);
        fill(this.art, 20, 9, 24, 22, 0xb9655b);
        fill(this.art, 5, 28, 16, 18, 0xbd6c61);
        fill(this.art, 43, 28, 16, 18, 0xbd6c61);
        arms(0xb25b56, 13);
        fill(this.leftArm, 5, 55, 17, 16, 0x743d3c);
        fill(this.rightArm, 42, 55, 17, 16, 0x743d3c);
        eye(23, 20, 0xffd570); eye(37, 20, 0xffd570);
        break;
      case 'spitter':
        legs(0x385a54);
        fill(this.art, 13, 26, 38, 34, 0x3b625e);
        fill(this.art, 17, 8, 30, 23, 0x8eac85);
        fill(this.art, 11, 31, 42, 14, 0xb7ee4c);
        fill(this.art, 18, 34, 28, 6, 0xe8f4a0);
        arms(0x78a178);
        eye(21, 19, 0xf5ef98); eye(37, 19, 0xf5ef98);
        fill(this.art, 26, 28, 12, 5, 0xd3f254);
        break;
      case 'crawler':
        fill(this.art, 11, 38, 42, 18, 0x625162);
        fill(this.art, 19, 29, 31, 18, 0xb6a4aa);
        fill(this.art, 19, 49, 30, 9, 0xa44756);
        fill(this.leftArm, 1, 47, 20, 9, 0xb6a4aa);
        fill(this.rightArm, 44, 47, 19, 9, 0xb6a4aa);
        fill(this.leftLeg, 12, 56, 16, 10, 0x625162);
        fill(this.rightLeg, 37, 56, 16, 10, 0x625162);
        eye(26, 37, 0xffdc81); eye(41, 37, 0xffdc81);
        break;
      case 'armored':
        legs(0x33464d);
        fill(this.art, 13, 28, 38, 34, 0x3f5863);
        fill(this.art, 17, 29, 30, 8, 0x86aab4);
        fill(this.art, 13, 7, 38, 24, 0x40535b);
        fill(this.art, 16, 6, 32, 7, 0x95b5be);
        fill(this.art, 19, 18, 26, 6, 0x77d7e4);
        arms(0x7198a3);
        fill(this.leftArm, 4, 32, 15, 33, 0x8faeb7);
        fill(this.leftArm, 7, 35, 9, 22, 0x344d56);
        break;
      case 'exploder':
        legs(0x57433d);
        fill(this.art, 9, 28, 46, 35, 0xa3523f);
        this.art.circle(32, 43, 20).fill(0xe9913f);
        this.art.circle(32, 43, 11).fill(0xffbf59);
        fill(this.art, 19, 8, 26, 25, 0x96604d);
        arms(0x965643);
        eye(22, 19, 0xffda76); eye(38, 19, 0xffda76);
        break;
      case 'abomination':
        legs(0x524258, 5);
        fill(this.art, 8, 21, 48, 43, 0x634764);
        fill(this.art, 14, 15, 40, 18, 0xb25a81);
        fill(this.art, 19, 2, 27, 28, 0x533f5c);
        fill(this.art, 16, 6, 5, 16, 0xd2c49c);
        fill(this.art, 45, 6, 5, 16, 0xd2c49c);
        arms(0xa64d73, 13);
        fill(this.leftArm, 0, 46, 19, 29, 0xb85b7d);
        fill(this.rightArm, 46, 49, 16, 25, 0x854667);
        eye(23, 16, 0xee86c4); eye(39, 16, 0xee86c4);
        break;
    }
    // A single broad white mask makes short hit flashes legible at any scale.
    fill(this.flash, 16, 10, 32, 48, 0xffffff);
    fill(this.flash, 9, 33, 10, 27, 0xffffff);
    fill(this.flash, 45, 33, 10, 27, 0xffffff);
  }
}
