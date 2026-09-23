import { Container, Graphics } from 'pixi.js';
import type { ZombieType } from '../config/zombies';

export type ActorKind = ZombieType | 'player';

// Global styling constants matching the reference chibi art style
const OUTLINE_COLOR = 0x16152a; // Deep dark navy ink outline
const OUTLINE_WIDTH = 2;

/** Helper: draw a rounded pill/box with a dark ink outline */
function pill(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fillColor: number,
  strokeColor: number = OUTLINE_COLOR,
  strokeWidth: number = OUTLINE_WIDTH,
): void {
  g.roundRect(x, y, w, h, Math.min(r, Math.min(w, h) * 0.5));
  g.fill({ color: fillColor });
  if (strokeWidth > 0 && strokeColor >= 0) {
    g.stroke({ color: strokeColor, width: strokeWidth });
  }
}

/** Helper: draw a circle with dark ink outline */
function orb(
  g: Graphics,
  cx: number,
  cy: number,
  r: number,
  fillColor: number,
  strokeColor: number = OUTLINE_COLOR,
  strokeWidth: number = OUTLINE_WIDTH,
): void {
  g.circle(cx, cy, r);
  g.fill({ color: fillColor });
  if (strokeWidth > 0 && strokeColor >= 0) {
    g.stroke({ color: strokeColor, width: strokeWidth });
  }
}

/** Procedural Chibi Actor with bold ink outlines, 3-tone shading, and jelly spring physics */
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

  // Jelly Spring Reaction System
  private squishX = 1;
  private squishY = 1;
  private squishVx = 0;
  private squishVy = 0;

  private _facingDir: 'front' | 'back' | 'left' | 'right' = 'front';
  private _weaponType: string = 'pistol';
  private _kind: ActorKind;

  constructor(kind: ActorKind, normalTint: number) {
    super();
    this.normalTint = normalTint;
    this._kind = kind;
    this.draw(kind);

    this.addChild(
      this.leftLeg,
      this.rightLeg,
      this.art,
      this.leftArm,
      this.rightArm,
      this.weapon,
      this.flash,
    );

    if (kind !== 'player') {
      this.weapon.visible = false;
    }
    this.flash.visible = false;
  }

  /** Apply a gelatinous squash & stretch impulse when hit by a projectile or explosion */
  applyHitImpulse(angle: number, intensity = 0.38): void {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const impulse = intensity * 24;

    // Compress along hit axis, bulge outward perpendicularly
    this.squishVx -= Math.abs(cos) * impulse;
    this.squishVy += Math.abs(cos) * impulse * 0.75;
    this.squishVy -= Math.abs(sin) * impulse;
    this.squishVx += Math.abs(sin) * impulse * 0.75;
  }

  /** Update damped harmonic oscillator for fluid jelly recovery */
  update(dt: number): void {
    const stiffness = 320;
    const damping = 22;

    const fx = -stiffness * (this.squishX - 1) - damping * this.squishVx;
    const fy = -stiffness * (this.squishY - 1) - damping * this.squishVy;

    this.squishVx += fx * dt;
    this.squishVy += fy * dt;
    this.squishX += this.squishVx * dt;
    this.squishY += this.squishVy * dt;

    // Clamp extremes
    this.squishX = Math.max(0.5, Math.min(1.6, this.squishX));
    this.squishY = Math.max(0.5, Math.min(1.6, this.squishY));

    // Apply squish to the body
    this.art.scale.set(this.squishX, this.squishY);
  }

  showFrame(frame: number): void {
    this.currentFrame = frame;
    const phase = ((frame % 8) * Math.PI) / 4;
    const wave = Math.sin(phase);
    const counterWave = Math.sin(phase + Math.PI / 2);

    // Natural stepping stride with rounded feet
    const step = wave * 3.2;
    this.leftLeg.y = step;
    this.rightLeg.y = -step;
    this.leftLeg.rotation = wave * 0.05;
    this.rightLeg.rotation = -wave * 0.05;

    // Arm counter-swing
    this.leftArm.y = -step * 0.7;
    this.rightArm.y = step * 0.7;
    this.leftArm.rotation = counterWave * 0.09;
    this.rightArm.rotation = -counterWave * 0.09;

    // Fluid squash & stretch: stretch on the rise, squash on the step plant
    const hop = -Math.abs(wave) * 3.5;
    this.art.y = hop;
    this.art.rotation = wave * 0.025;
  }

  setTint(tint: number): void {
    const isHitFlash = tint === 0xffffff;
    this.flash.visible = isHitFlash;
    this.art.tint = tint === this.normalTint || isHitFlash ? 0xffffff : tint;
  }

  setFacing(angle: number): void {
    this.weapon.rotation = angle;
  }

  setFacingDirection(dir: 'front' | 'back' | 'left' | 'right'): void {
    if (this._facingDir === dir) return;
    this._facingDir = dir;
    this.draw(this._kind);
  }

  setWeaponType(type: string): void {
    if (this._weaponType === type) return;
    this._weaponType = type;
    this.draw(this._kind);
  }

  /** Draw crisp, bold-outlined chibi character art */
  private draw(kind: ActorKind): void {
    this.art.clear();
    this.leftLeg.clear();
    this.rightLeg.clear();
    this.leftArm.clear();
    this.rightArm.clear();
    this.weapon.clear();
    this.flash.clear();

    // Shared eye drawing with dark outline and bright catchlight
    const drawEye = (
      g: Graphics,
      cx: number,
      cy: number,
      r: number,
      pupilColor: number = 0x16152a,
      pupilOffsetX = 0,
      pupilOffsetY = 0,
    ) => {
      orb(g, cx, cy, r, 0xffffff, OUTLINE_COLOR, 1.8);
      orb(g, cx + pupilOffsetX, cy + pupilOffsetY, r * 0.55, pupilColor, -1, 0);
      // Catchlight
      g.circle(cx + pupilOffsetX - r * 0.22, cy + pupilOffsetY - r * 0.22, r * 0.22);
      g.fill({ color: 0xffffff });
    };

    // Sturdy rounded chibi legs with shoes
    const drawLegs = (pantsColor: number, shoeColor = 0x222438, spread = 0) => {
      // Pants
      pill(this.leftLeg, 20 - spread, 50, 10, 24, 5, pantsColor);
      pill(this.rightLeg, 34 + spread, 50, 10, 24, 5, pantsColor);
      // Shoes / Boots with dark tread
      pill(this.leftLeg, 18 - spread, 69, 13, 7, 4, shoeColor);
      pill(this.rightLeg, 33 + spread, 69, 13, 7, 4, shoeColor);
      // Boot highlights
      this.leftLeg.roundRect(19 - spread, 70, 10, 2, 1).fill({ color: 0xffffff, alpha: 0.2 });
      this.rightLeg.roundRect(34 + spread, 70, 10, 2, 1).fill({ color: 0xffffff, alpha: 0.2 });
    };

    // Rounded chibi arms
    const drawArms = (skinColor: number, sleeveColor = 0x2ec4b6, width = 10) => {
      // Sleeves
      pill(this.leftArm, 8, 30, width, 14, 5, sleeveColor);
      pill(this.rightArm, 56 - width, 30, width, 14, 5, sleeveColor);
      // Hands / Forearms
      pill(this.leftArm, 8, 42, width, 16, 5, skinColor);
      pill(this.rightArm, 56 - width, 42, width, 16, 5, skinColor);
    };

    switch (kind) {
      case 'player': {
        const dir = this._facingDir;
        const lookX = dir === 'left' ? -8 : dir === 'right' ? 8 : 0;
        const isBack = dir === 'back';

        // --- Legs ---
        // Thigh joints (Dark grey)
        pill(this.leftLeg, 21, 46, 8, 14, 4, 0x3a404d);
        pill(this.rightLeg, 35, 46, 8, 14, 4, 0x3a404d);
        // Shin Armor (Orange)
        pill(this.leftLeg, 19, 54, 12, 14, 3, 0xf27d42);
        pill(this.rightLeg, 33, 54, 12, 14, 3, 0xf27d42);
        // Feet (White/Grey)
        pill(this.leftLeg, 17 + lookX * 0.25, 66, 15, 8, 3, 0xf2efeb);
        pill(this.rightLeg, 32 + lookX * 0.25, 66, 15, 8, 3, 0xf2efeb);
        // Foot accents
        if (!isBack) {
          pill(this.leftLeg, 19 + lookX * 0.25, 68, 6, 4, 1, 0x1f2b38, -1, 0);
          pill(this.rightLeg, 34 + lookX * 0.25, 68, 6, 4, 1, 0x1f2b38, -1, 0);
        }

        // --- Arms ---
        // Shoulder joints
        orb(this.leftArm, 14, 30, 6, 0x3a404d);
        orb(this.rightArm, 50, 30, 6, 0x3a404d);
        // Upper arm armor (White)
        pill(this.leftArm, 9, 28, 10, 10, 3, 0xf2efeb);
        pill(this.rightArm, 45, 28, 10, 10, 3, 0xf2efeb);
        // Forearm armor (Orange)
        pill(this.leftArm, 8, 38, 12, 14, 3, 0xf27d42);
        pill(this.rightArm, 44, 38, 12, 14, 3, 0xf27d42);
        // Hands/Claws (Dark grey)
        pill(this.leftArm, 9, 50, 10, 8, 3, 0x3a404d);
        pill(this.rightArm, 45, 50, 10, 8, 3, 0x3a404d);

        // --- Torso ---
        // Core/Waist (Dark grey)
        pill(this.art, 22, 42, 20, 12, 4, 0x3a404d);
        // Chest Armor (Orange with white belly)
        pill(this.art, 17, 26, 30, 20, 6, 0xf27d42); // orange chest
        if (!isBack) {
          pill(this.art, 19 + lookX * 0.5, 28, 26, 8, 3, 0xf2efeb); // white upper chest
          // Chest detail (glowing cyan circle)
          orb(this.art, 32 + lookX * 0.5, 36, 3.5, 0x88f5f0);
        }

        // --- Head ---
        // Neck (Dark grey)
        pill(this.art, 28, 20, 8, 8, 2, 0x3a404d);
        // Main Head Box (Cream/White)
        pill(this.art, 10, 2, 44, 28, 6, 0xf2efeb);
        // Side dials / ears (Orange)
        if (dir !== 'left') pill(this.art, 6, 12, 6, 12, 2, 0xf27d42);
        if (dir !== 'right') pill(this.art, 52, 12, 6, 12, 2, 0xf27d42);
        
        if (!isBack) {
          // Inner Screen / Visor (Dark Blue/Grey)
          pill(this.art, 14 + lookX, 6, 36, 20, 4, 0x1f2b38);
          // Screen highlight/glare
          pill(this.art, 16 + lookX, 8, 18, 4, 2, 0x2a3d4f, -1, 0);
          // Glowing vertical oval eyes
          pill(this.art, 22 + lookX, 10, 6, 10, 3, 0x88f5f0, -1, 0); // left eye
          pill(this.art, 36 + lookX, 10, 6, 10, 3, 0x88f5f0, -1, 0); // right eye
        }

        // --- Weapon ---
        if (this._weaponType === 'shotgun') {
          pill(this.weapon, -2, -3, 12, 8, 2, 0x5a483a); // wood stock
          pill(this.weapon, 10, -4, 26, 10, 2, 0x4a4e58); // dark metal barrel
          pill(this.weapon, 10, -1, 10, 6, 2, 0x1f2b38, -1, 0); // grip pump
          this.weapon.pivot.set(6, 4);
        } else if (this._weaponType === 'smg') {
          pill(this.weapon, -2, -4, 20, 12, 2, 0x1f2b38); // blocky body
          pill(this.weapon, 8, 6, 6, 8, 2, 0x1f2b38); // magazine
          pill(this.weapon, 18, -2, 8, 6, 2, 0x8a9ba8); // short barrel
          this.weapon.pivot.set(4, 4);
        } else if (this._weaponType === 'rifle') {
          pill(this.weapon, -6, -3, 12, 8, 2, 0x1f2b38); // stock
          pill(this.weapon, 6, -4, 20, 8, 2, 0x3a404d); // body
          pill(this.weapon, 26, -3, 16, 6, 2, 0x8a9ba8); // long barrel
          pill(this.weapon, 12, -8, 10, 4, 1, 0x1f2b38); // scope
          this.weapon.pivot.set(8, 4);
        } else {
          // Pistol (default)
          pill(this.weapon, -2, -3, 16, 8, 2, 0x3a404d); // slide
          pill(this.weapon, 2, 2, 6, 8, 2, 0x1f2b38); // grip
          this.weapon.pivot.set(4, 4);
        }
        
        // Position firmly in the hand
        const wpx = dir === 'left' ? 12 : dir === 'right' ? 52 : 46;
        const wpy = dir === 'back' ? 44 : 50;
        this.weapon.position.set(wpx, wpy);
        break;
      }

      case 'walker': {
        // Classic green cartoon zombie with blue shirt and exposed brain
        drawLegs(0x5a483a, 0x1f2420); // brown pants
        // Blue torn shirt
        pill(this.art, 15, 28, 34, 25, 7, 0x325f82);
        pill(this.art, 20, 32, 24, 5, 2, 0x4a82a8, -1, 0); // shirt highlight
        // Green arms
        pill(this.leftArm, 7, 30, 9, 24, 5, 0x789c56);
        pill(this.rightArm, 48, 30, 9, 24, 5, 0x789c56);
        // Big green head
        orb(this.art, 32, 18, 16, 0x789c56);
        // Exposed yellow/orange brain
        pill(this.art, 28, 2, 14, 10, 4, 0xdda64f);
        this.art.circle(28, 7, 3).fill(0xdda64f);
        this.art.circle(38, 7, 3).fill(0xdda64f);
        this.art.stroke({ color: OUTLINE_COLOR, width: OUTLINE_WIDTH });
        // Mismatched eyes
        drawEye(this.art, 24, 20, 4.5, 0xffffff, 0, 0); // big eye
        this.art.circle(24, 20, 1.5).fill(0x16152a); // pupil
        drawEye(this.art, 38, 21, 3, 0xffffff, 0, 0); // small eye
        this.art.circle(38, 21, 1).fill(0x16152a); // pupil
        // Open dark mouth
        pill(this.art, 27, 28, 12, 6, 3, 0x16152a);
        // Tooth
        pill(this.art, 28, 28, 3, 3, 1, 0xffffff, -1, 0);
        break;
      }

      case 'runner': {
        // Purple skin, orange dress, purple hair
        drawLegs(0x8357a5, 0x8357a5, 3); // bare purple legs
        // Orange dress
        pill(this.art, 18, 28, 28, 24, 7, 0xdb773c);
        pill(this.art, 21, 30, 22, 5, 2, 0xf29b68, -1, 0);
        // Purple arms
        pill(this.leftArm, 8, 28, 8, 25, 4, 0x8357a5);
        pill(this.rightArm, 48, 28, 8, 25, 4, 0x8357a5);
        // Purple head
        orb(this.art, 32, 17, 15, 0x8357a5);
        // Hair (darker purple, swooped)
        pill(this.art, 14, 0, 36, 12, 6, 0x544084);
        pill(this.art, 12, 6, 10, 16, 4, 0x544084); // side hair
        pill(this.art, 42, 6, 10, 16, 4, 0x544084);
        // Mismatched yellow eyes
        orb(this.art, 23, 18, 5, 0xffe680);
        this.art.circle(23, 18, 1.5).fill(0x16152a);
        orb(this.art, 39, 18, 3, 0xffe680);
        this.art.circle(39, 18, 1).fill(0x16152a);
        // Small fanged mouth
        this.art.moveTo(28, 26).lineTo(34, 26).stroke({ color: 0x16152a, width: 2 });
        this.art.moveTo(29, 26).lineTo(30, 28).lineTo(31, 26).fill(0xffffff); // fang
        break;
      }

      case 'brute': {
        // Blocky Frankenstein Golem
        drawLegs(0x282c34, 0x282c34, 5); // dark grey pants
        // Large blocky boots
        pill(this.leftLeg, 14, 62, 18, 14, 2, 0x3a3f48);
        pill(this.rightLeg, 32, 62, 18, 14, 2, 0x3a3f48);
        // Torso: Grey-green skin & black tunic
        pill(this.art, 7, 22, 50, 36, 4, 0x829079); // skin block
        pill(this.art, 12, 24, 40, 14, 2, 0x9ba992, -1, 0); // skin highlight
        pill(this.art, 10, 38, 44, 20, 2, 0x282c34); // tunic
        // Blocky Arms
        pill(this.leftArm, 2, 26, 12, 34, 2, 0x829079);
        pill(this.rightArm, 50, 26, 12, 34, 2, 0x829079);
        // Massive metal bracers
        pill(this.leftArm, 0, 44, 16, 16, 2, 0x4a4e58);
        pill(this.rightArm, 48, 44, 16, 16, 2, 0x4a4e58);
        // Bracer spikes
        this.leftArm.moveTo(16, 52).lineTo(20, 50).lineTo(16, 48).fill(0x4a4e58);
        this.rightArm.moveTo(48, 52).lineTo(44, 50).lineTo(48, 48).fill(0x4a4e58);
        // Flat Square Head
        pill(this.art, 22, 6, 20, 16, 2, 0x829079);
        // Flat head top (black hair/cap)
        pill(this.art, 22, 4, 20, 6, 1, 0x16152a);
        // Neck bolts
        pill(this.art, 18, 16, 6, 4, 1, 0x768593);
        pill(this.art, 40, 16, 6, 4, 1, 0x768593);
        // Glowing yellow eyes
        pill(this.art, 24, 12, 5, 4, 1, 0xffd166, -1, 0);
        pill(this.art, 35, 12, 5, 4, 1, 0xffd166, -1, 0);
        // Straight mouth line
        this.art.moveTo(28, 18).lineTo(36, 18).stroke({ color: 0x16152a, width: 2 });
        break;
      }

      case 'spitter': {
        // Cartoon Cyan Zombie with pink brain
        drawLegs(0x2a3e6a, 0x1a2640); // dark blue pants
        // Cyan arms
        pill(this.leftArm, 6, 32, 9, 20, 5, 0x4896a8);
        pill(this.rightArm, 49, 32, 9, 20, 5, 0x4896a8);
        // Cyan Body
        pill(this.art, 11, 26, 42, 30, 8, 0x4896a8);
        // Pink exposed brain
        pill(this.art, 24, 2, 16, 10, 4, 0xd88a82);
        // Square cyan head
        pill(this.art, 20, 10, 24, 18, 4, 0x4896a8);
        // Glowing pale eyes
        orb(this.art, 25, 16, 3, 0xe0f7fa);
        this.art.circle(25, 16, 1).fill(0x16152a);
        orb(this.art, 39, 16, 3, 0xe0f7fa);
        this.art.circle(39, 16, 1).fill(0x16152a);
        // Big toothy mouth
        pill(this.art, 22, 22, 20, 8, 3, 0x16152a);
        pill(this.art, 23, 22, 4, 4, 1, 0xffffff, -1, 0);
        pill(this.art, 28, 22, 4, 4, 1, 0xffffff, -1, 0);
        pill(this.art, 33, 22, 4, 4, 1, 0xffffff, -1, 0);
        break;
      }

      case 'crawler': {
        // Pale half-zombie crawling
        // No legs!
        pill(this.art, 15, 42, 34, 16, 6, 0x5a5255); // ragged shirt bottom
        pill(this.art, 18, 30, 28, 20, 6, 0xa5a5a5); // pale grey body
        // Arms reaching forward
        pill(this.leftArm, 4, 40, 12, 20, 5, 0xa5a5a5);
        this.leftArm.rotation = -0.5;
        pill(this.rightArm, 48, 40, 12, 20, 5, 0xa5a5a5);
        this.rightArm.rotation = 0.5;
        // Head
        orb(this.art, 32, 20, 14, 0xa5a5a5);
        // Dark sunken eyes
        orb(this.art, 25, 20, 4, 0x16152a);
        orb(this.art, 39, 20, 4, 0x16152a);
        this.art.circle(26, 20, 1).fill(0xffffff);
        this.art.circle(38, 20, 1).fill(0xffffff);
        // Sad mouth
        this.art.moveTo(28, 28).lineTo(36, 28).stroke({ color: 0x16152a, width: 2 });
        break;
      }

      case 'armored': {
        // Police Zombie
        drawLegs(0x1a2640, 0x111b24); // navy pants, black shoes
        // Navy blue uniform
        pill(this.art, 14, 26, 36, 26, 6, 0x2a3e6a);
        pill(this.art, 17, 28, 30, 6, 2, 0x3d548a, -1, 0); // highlight
        // Gold badge
        pill(this.art, 20, 32, 6, 8, 2, 0xffd166);
        // Arms
        pill(this.leftArm, 6, 28, 10, 24, 4, 0x2a3e6a);
        pill(this.rightArm, 48, 28, 10, 24, 4, 0x2a3e6a);
        // Pale green head
        orb(this.art, 32, 18, 15, 0x8aab82);
        // Police Hat
        pill(this.art, 16, 6, 32, 10, 4, 0x2a3e6a);
        pill(this.art, 12, 14, 40, 4, 2, 0x111b24); // visor
        // Hat badge
        orb(this.art, 32, 10, 3, 0xffd166);
        // Eyes
        drawEye(this.art, 25, 22, 3.5, 0xffffff, 0, 0);
        this.art.circle(25, 22, 1.5).fill(0x16152a);
        drawEye(this.art, 39, 22, 3.5, 0xffffff, 0, 0);
        this.art.circle(39, 22, 1.5).fill(0x16152a);
        // Tongue hanging out
        pill(this.art, 27, 28, 8, 12, 4, 0x16152a); // mouth
        pill(this.art, 29, 32, 6, 10, 3, 0xc74a4a, -1, 0); // tongue
        break;
      }

      case 'exploder': {
        // Construction worker zombie with swollen belly
        drawLegs(0x3a4f66, 0x1f2130, 4); // blue jeans
        // Swollen belly (dirty white shirt)
        orb(this.art, 32, 36, 24, 0xdcd6d0);
        // Orange safety vest
        pill(this.art, 8, 26, 10, 26, 3, 0xe86a17);
        pill(this.art, 46, 26, 10, 26, 3, 0xe86a17);
        // Arms
        pill(this.leftArm, 2, 32, 10, 20, 5, 0x9b7a66); // dirty skin
        pill(this.rightArm, 52, 32, 10, 20, 5, 0x9b7a66);
        // Head
        orb(this.art, 32, 16, 15, 0x9b7a66);
        // Yellow Hardhat
        pill(this.art, 14, 2, 36, 14, 7, 0xffd166);
        pill(this.art, 12, 12, 40, 4, 2, 0xffd166); // brim
        // Red cross on hat
        pill(this.art, 30, 6, 4, 6, 1, 0xc74a4a, -1, 0);
        pill(this.art, 29, 7, 6, 4, 1, 0xc74a4a, -1, 0);
        // Eyes (one red, one missing)
        orb(this.art, 24, 20, 4, 0xc74a4a); // red eye
        orb(this.art, 40, 20, 4, 0x16152a); // missing eye
        // Mouth with one tooth
        pill(this.art, 28, 26, 10, 6, 3, 0x16152a);
        pill(this.art, 29, 26, 3, 4, 1, 0xffffff, -1, 0);
        break;
      }

      case 'abomination': {
        // Colossal Spiked Golem Boss
        drawLegs(0x404838, 0x404838, 6); // thick green-grey legs
        pill(this.leftLeg, 12, 60, 20, 16, 2, 0x849580); // bare feet
        pill(this.rightLeg, 32, 60, 20, 16, 2, 0x849580);
        
        // Massive torso
        pill(this.art, 3, 16, 58, 40, 8, 0x849580); // muscular chest
        // Tattered brown belt/loincloth
        pill(this.art, 8, 44, 48, 12, 2, 0x6e4e37);
        pill(this.art, 24, 46, 16, 10, 2, 0x3d2b1f); // buckle
        pill(this.art, 18, 56, 14, 16, 2, 0x6e4e37); // hanging cloth
        pill(this.art, 32, 56, 12, 12, 2, 0x6e4e37); // hanging cloth

        // Huge Spiked Shoulder Pad (Left Side only)
        pill(this.art, -4, 8, 24, 24, 4, 0x3a3f48);
        // Spikes on shoulder
        this.art.moveTo(4, 8).lineTo(10, -6).lineTo(16, 8).fill(0x768593);
        this.art.moveTo(-4, 16).lineTo(-16, 10).lineTo(-4, 24).fill(0x768593);

        // Colossal arms
        pill(this.leftArm, -4, 32, 16, 38, 4, 0x849580);
        pill(this.rightArm, 52, 32, 16, 38, 4, 0x849580);
        
        // Metal spiked bracers
        pill(this.leftArm, -6, 52, 20, 18, 2, 0x3a3f48);
        pill(this.rightArm, 50, 52, 20, 18, 2, 0x3a3f48);
        // Spikes on bracers
        this.leftArm.moveTo(-6, 60).lineTo(-14, 60).lineTo(-6, 66).fill(0x768593);
        this.rightArm.moveTo(70, 60).lineTo(78, 60).lineTo(70, 66).fill(0x768593);

        // Golem Head nestled in chest
        pill(this.art, 22, 6, 20, 18, 3, 0x849580);
        // Glowing intense yellow eyes
        orb(this.art, 26, 12, 4, 0xffd166);
        orb(this.art, 38, 12, 4, 0xffd166);
        // Sharp toothy grin
        this.art.moveTo(24, 20).lineTo(40, 20).stroke({ color: 0x16152a, width: 2 });
        this.art.moveTo(26, 20).lineTo(28, 24).lineTo(30, 20).fill(0xffffff); // teeth
        this.art.moveTo(34, 20).lineTo(36, 24).lineTo(38, 20).fill(0xffffff);
        break;
      }
      
      case 'grok': {
        // Grok Bot: Sleek black sphere with two slanted white pill eyes
        orb(this.art, 32, 40, 30, 0x16152a);
        
        // Slanted white pill eyes
        this.art.moveTo(22, 28).lineTo(26, 40).lineTo(20, 42).lineTo(16, 30).fill(0xffffff);
        this.art.moveTo(38, 24).lineTo(44, 34).lineTo(38, 38).lineTo(32, 28).fill(0xffffff);
        break;
      }

      case 'claude': {
        // Claudebean: Red-orange bean with little tentacles and square black eyes
        // Body (bean shape)
        pill(this.art, 12, 20, 40, 32, 12, 0xd84c3c);
        pill(this.art, 16, 22, 32, 8, 4, 0xf06858, -1, 0); // highlight
        
        // Tentacle legs
        pill(this.leftLeg, 16, 46, 6, 20, 3, 0xd84c3c);
        pill(this.leftLeg, 26, 46, 6, 20, 3, 0xd84c3c);
        pill(this.rightLeg, 34, 46, 6, 20, 3, 0xd84c3c);
        pill(this.rightLeg, 44, 46, 6, 20, 3, 0xd84c3c);
        
        // Tentacle arms (reaching out)
        pill(this.leftArm, 2, 30, 14, 6, 3, 0xd84c3c);
        pill(this.rightArm, 48, 30, 14, 6, 3, 0xd84c3c);
        
        // Square black eyes
        pill(this.art, 22, 26, 6, 10, 1, 0x16152a);
        pill(this.art, 36, 26, 6, 10, 1, 0x16152a);
        
        // White glint
        pill(this.art, 23, 27, 3, 3, 1, 0xffffff, -1, 0);
        pill(this.art, 37, 27, 3, 3, 1, 0xffffff, -1, 0);
        break;
      }

      case 'codex': {
        // Codex: Blue fluffy cloud body with dark screen visor and cyan characters
        drawLegs(0x3a60d0, 0x1f3480);
        // Fluffy blue body
        orb(this.art, 32, 36, 18, 0x3a60d0);
        pill(this.leftArm, 8, 32, 10, 16, 5, 0x3a60d0);
        pill(this.rightArm, 46, 32, 10, 16, 5, 0x3a60d0);
        
        // Cloud head
        orb(this.art, 32, 16, 20, 0x3a60d0);
        orb(this.art, 20, 10, 12, 0x3a60d0);
        orb(this.art, 44, 10, 12, 0x3a60d0);
        orb(this.art, 22, 24, 12, 0x3a60d0);
        orb(this.art, 42, 24, 12, 0x3a60d0);
        
        // Head highlight
        orb(this.art, 32, 8, 8, 0x5a8aff, -1, 0);
        
        // Dark screen visor
        pill(this.art, 18, 12, 28, 14, 4, 0x16152a);
        
        // Cyan '>_' characters on visor
        // '>' symbol
        this.art.moveTo(22, 14).lineTo(26, 18).lineTo(22, 22).stroke({ color: 0x88f5f0, width: 2 });
        // '_' symbol
        this.art.moveTo(28, 22).lineTo(34, 22).stroke({ color: 0x88f5f0, width: 2 });
        
        // Blinking indicator?
        if (Math.floor(Date.now() / 500) % 2 === 0) {
           this.art.moveTo(38, 14).lineTo(38, 22).stroke({ color: 0x88f5f0, width: 2 });
        }
        break;
      }

      case 'muse': {
        // Muse: Ethereal glowing purple star-like entity
        // No solid legs, just a trailing tail
        pill(this.art, 26, 50, 12, 24, 4, 0x7b2cbf);
        pill(this.art, 28, 52, 8, 18, 2, 0x9d4edd, -1, 0);

        // Torso/Main body (diamond/star shaped)
        this.art.moveTo(32, 16).lineTo(48, 36).lineTo(32, 56).lineTo(16, 36).fill(0x9d4edd);
        this.art.moveTo(32, 20).lineTo(42, 36).lineTo(32, 52).lineTo(22, 36).fill(0xc77dff);

        // Ethereal wing-like arms
        this.leftArm.moveTo(16, 30).lineTo(-4, 20).lineTo(12, 40).fill(0x7b2cbf);
        this.rightArm.moveTo(48, 30).lineTo(68, 20).lineTo(52, 40).fill(0x7b2cbf);
        
        // Halo / floating crown
        orb(this.art, 32, 8, 6, 0xe0aaff);
        this.art.ellipse(32, 8, 14, 4).stroke({ color: 0xc77dff, width: 2 });
        
        // Inner glowing core
        orb(this.art, 32, 36, 6, 0xffffff);
        break;
      }

    }

    // Hit flash mask covering the full character volume
    pill(this.flash, 12, 8, 40, 56, 12, 0xffffff, -1, 0);
    pill(this.flash, 6, 28, 12, 28, 6, 0xffffff, -1, 0);
    pill(this.flash, 46, 28, 12, 28, 6, 0xffffff, -1, 0);
  }
}
