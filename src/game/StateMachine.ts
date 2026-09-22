/**
 * StateMachine.ts
 * Simple typed state machine for top-level game phase transitions.
 * Emits enter/exit callbacks for each state.
 *
 * Phase 2 — Vertical Slice
 */

import type { GamePhase } from './GameState';

type StateHandler = {
  onEnter?: () => void;
  onExit?: () => void;
};

export class StateMachine {
  private current: GamePhase = 'BOOT';
  private handlers: Partial<Record<GamePhase, StateHandler>> = {};

  register(phase: GamePhase, handler: StateHandler): void {
    this.handlers[phase] = handler;
  }

  transition(next: GamePhase): void {
    if (this.current === next) return;
    const prev = this.current;
    this.handlers[prev]?.onExit?.();
    this.current = next;
    this.handlers[next]?.onEnter?.();
  }

  get state(): GamePhase { return this.current; }
}
