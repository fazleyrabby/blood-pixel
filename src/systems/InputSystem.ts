/**
 * InputSystem.ts
 * Tracks keyboard and mouse state. Pure input — no simulation logic.
 * Simulation reads this each fixed step.
 *
 * Phase 2 — Vertical Slice
 */

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  mouseX: number;      // screen coordinates
  mouseY: number;
  shootHeld: boolean;
  reloadPressed: boolean;
  pausePressed: boolean;
  weapon1: boolean;
  weapon2: boolean;
  weapon3: boolean;
  wheelUp: boolean;
  wheelDown: boolean;
  mutePressed: boolean;
  debugToggle: boolean;
  cheatPanelPressed: boolean;
}

export class InputSystem {
  readonly state: InputState = {
    up: false, down: false, left: false, right: false,
    mouseX: 0, mouseY: 0,
    shootHeld: false,
    reloadPressed: false,
    pausePressed: false,
    weapon1: false, weapon2: false, weapon3: false,
    wheelUp: false, wheelDown: false,
    mutePressed: false,
    debugToggle: false,
    cheatPanelPressed: false,
  };

  private _gameActive = false;

  constructor() {
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);
    window.addEventListener('wheel', this._onWheel, { passive: true });
    window.addEventListener('blur', this._onBlur);
  }

  /** Call to allow/disallow gameplay input */
  setGameActive(active: boolean): void {
    this._gameActive = active;
    if (!active) this._clearGameInput();
  }

  /** Consume single-press keys — call after reading them in fixedUpdate */
  consume(): void {
    this.state.reloadPressed = false;
    this.state.pausePressed = false;
    this.state.weapon1 = false;
    this.state.weapon2 = false;
    this.state.weapon3 = false;
    this.state.wheelUp = false;
    this.state.wheelDown = false;
    this.state.mutePressed = false;
    this.state.debugToggle = false;
    this.state.cheatPanelPressed = false;
  }

  destroy(): void {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('mousedown', this._onMouseDown);
    window.removeEventListener('mouseup', this._onMouseUp);
    window.removeEventListener('wheel', this._onWheel);
    window.removeEventListener('blur', this._onBlur);
  }

  private _clearGameInput(): void {
    this.state.up = this.state.down = this.state.left = this.state.right = false;
    this.state.shootHeld = false;
    this.state.wheelUp = false;
    this.state.wheelDown = false;
  }

  private _onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') { this.state.pausePressed = true; return; }
    if (e.key === '`') { this.state.debugToggle = true; return; }
    if (e.key === 'F2') { e.preventDefault(); this.state.cheatPanelPressed = true; return; }
    if (e.key === 'm' || e.key === 'M') { this.state.mutePressed = true; }
    if (!this._gameActive) return;
    switch (e.key.toLowerCase()) {
      case 'w': case 'arrowup': this.state.up = true; break;
      case 's': case 'arrowdown': this.state.down = true; break;
      case 'a': case 'arrowleft': this.state.left = true; break;
      case 'd': case 'arrowright': this.state.right = true; break;
      case 'r': this.state.reloadPressed = true; break;
      case '1': this.state.weapon1 = true; break;
      case '2': this.state.weapon2 = true; break;
      case '3': this.state.weapon3 = true; break;
    }
  };

  private _onKeyUp = (e: KeyboardEvent): void => {
    switch (e.key.toLowerCase()) {
      case 'w': case 'arrowup': this.state.up = false; break;
      case 's': case 'arrowdown': this.state.down = false; break;
      case 'a': case 'arrowleft': this.state.left = false; break;
      case 'd': case 'arrowright': this.state.right = false; break;
    }
  };

  private _onMouseMove = (e: MouseEvent): void => {
    this.state.mouseX = e.clientX;
    this.state.mouseY = e.clientY;
  };

  private _onMouseDown = (e: MouseEvent): void => {
    // Ignore clicks on HTML UI (cheat panel, HUD buttons) so they don't fire.
    const target = e.target as HTMLElement | null;
    if (target && target.closest('button, input, select, textarea')) return;
    if (e.button === 0 && this._gameActive) this.state.shootHeld = true;
  };

  private _onMouseUp = (e: MouseEvent): void => {
    if (e.button === 0) this.state.shootHeld = false;
  };

  private _onWheel = (e: WheelEvent): void => {
    if (!this._gameActive) return;
    if (e.deltaY < 0) this.state.wheelUp = true;
    if (e.deltaY > 0) this.state.wheelDown = true;
  };

  private _onBlur = (): void => {
    this._clearGameInput();
  };
}
