/**
 * AudioSystem.ts
 * Procedural Web Audio SFX — no audio assets, everything is synthesized.
 *
 * The AudioContext is created lazily on the first user gesture so browser
 * autoplay policies are satisfied. `soundEnabled` / `masterVolume` come from
 * settings; `M` toggles a temporary runtime mute.
 *
 * Phase 3 — Game Feel, Combat Depth & Depth Tilt
 */

/** Minimum seconds between repeats of a cue (undefined = unthrottled). */
const CUE_COOLDOWN: Partial<Record<SfxName, number>> = {
  hit: 0.03,
  kill: 0.045,
  acid: 0.06,
  explode: 0.08,
  boss_summon: 0.2,
  dry: 0.1,
  ui: 0.03,
};

export type SfxName =
  | 'shot_pistol'
  | 'shot_shotgun'
  | 'shot_smg'
  | 'dry'
  | 'hit'
  | 'kill'
  | 'hurt'
  | 'acid'
  | 'pickup'
  | 'reload_start'
  | 'reload_end'
  | 'ui'
  | 'levelup'
  | 'countdown'
  | 'go'
  | 'complete'
  | 'failed'
  | 'death'
  | 'explode'
  | 'boss_summon'
  | 'achievement'
  | 'toggle';

type ToneOpts = {
  type?: OscillatorType;
  gain?: number;
  slideTo?: number;
  delay?: number;
};

type NoiseOpts = {
  gain?: number;
  filter?: number;
  filterType?: BiquadFilterType;
  slideTo?: number;
  delay?: number;
};

export class AudioSystem {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private enabled = true;
  private volume = 0.7;
  private muted = false;

  /** Per-cue throttle so a mass event can't create hundreds of nodes in one frame. */
  private lastPlayed = new Map<SfxName, number>();

  private ambient: { o1: OscillatorNode; o2: OscillatorNode; lfo: OscillatorNode; gain: GainNode } | null = null;

  constructor() {
    window.addEventListener('pointerdown', this.unlock, { passive: true });
    window.addEventListener('keydown', this.unlock);
    // Menu/HUD buttons get a UI tick for free.
    window.addEventListener('click', this._onClick);
  }

  get isMuted(): boolean {
    return this.muted;
  }

  get isReady(): boolean {
    return this.ctx !== null;
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (!on) this.stopAmbient();
  }

  /** Volume in 0–100 (matches the settings slider). */
  setVolume(v0to100: number): void {
    this.volume = Math.max(0, Math.min(1, v0to100 / 100));
    this._applyGain();
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    this._applyGain();
    if (!this.muted) this.play('toggle');
    return this.muted;
  }

  /** Create/resume the AudioContext. Safe to call repeatedly. */
  unlock = (): void => {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this._applyGain();
      this.master.connect(this.ctx.destination);
      this.noiseBuffer = this._makeNoise(this.ctx);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  };

  /** Low, slowly-breathing drone under gameplay. Safe to call repeatedly. */
  startAmbient(): void {
    if (this.ambient || !this.ctx || !this.master) return;
    const ctx = this.ctx;

    const gain = ctx.createGain();
    gain.gain.value = 0.0001;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 240;

    const o1 = ctx.createOscillator();
    o1.type = 'sawtooth';
    o1.frequency.value = 55;

    const o2 = ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = 82.5;
    o2.detune.value = 9;

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.06;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.015;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);

    o1.connect(filter);
    o2.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);

    o1.start();
    o2.start();
    lfo.start();
    gain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 2.5);

    this.ambient = { o1, o2, lfo, gain };
  }

  stopAmbient(): void {
    const a = this.ambient;
    if (!a || !this.ctx) return;
    const t = this.ctx.currentTime;
    try {
      a.gain.gain.cancelScheduledValues(t);
      a.gain.gain.setValueAtTime(Math.max(0.0001, a.gain.gain.value), t);
      a.gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
      const nodes = [a.o1, a.o2, a.lfo];
      setTimeout(() => {
        for (const n of nodes) {
          try { n.stop(); } catch { /* already stopped */ }
        }
      }, 800);
    } catch { /* context closed */ }
    this.ambient = null;
  }

  play(name: SfxName): void {
    if (!this.enabled || this.muted) return;
    if (!this.ctx || !this.master) return;

    // Throttle high-frequency cues (kills/hits/explosions) — a single frame can
    // otherwise trigger hundreds of simultaneous oscillator+noise voices.
    const cooldown = CUE_COOLDOWN[name];
    if (cooldown !== undefined) {
      const now = this.ctx.currentTime;
      const last = this.lastPlayed.get(name);
      if (last !== undefined && now - last < cooldown) return;
      this.lastPlayed.set(name, now);
    }

    switch (name) {
      case 'shot_pistol':
        this._noise(0.07, { gain: 0.22, filter: 3200, filterType: 'highpass' });
        this._tone(320, 0.08, { type: 'square', gain: 0.16, slideTo: 90 });
        break;
      case 'shot_shotgun':
        this._noise(0.16, { gain: 0.38, filter: 1800, slideTo: 200 });
        this._tone(150, 0.16, { type: 'sawtooth', gain: 0.24, slideTo: 45 });
        break;
      case 'shot_smg':
        this._noise(0.045, { gain: 0.16, filter: 4200, filterType: 'highpass' });
        this._tone(420, 0.05, { type: 'square', gain: 0.1, slideTo: 160 });
        break;
      case 'dry':
        this._tone(1400, 0.03, { gain: 0.14, slideTo: 600 });
        break;
      case 'hit':
        this._noise(0.05, { gain: 0.2, filter: 2400, filterType: 'bandpass' });
        break;
      case 'kill':
        this._noise(0.14, { gain: 0.28, filter: 900, slideTo: 120 });
        this._tone(220, 0.14, { type: 'sawtooth', gain: 0.14, slideTo: 60 });
        break;
      case 'hurt':
        this._tone(180, 0.22, { type: 'sawtooth', gain: 0.28, slideTo: 70 });
        this._noise(0.12, { gain: 0.18, filter: 600 });
        break;
      case 'acid':
        this._noise(0.12, { gain: 0.18, filter: 700, slideTo: 200 });
        break;
      case 'pickup':
        this._tone(660, 0.08, { type: 'square', gain: 0.18 });
        this._tone(990, 0.1, { type: 'square', gain: 0.18, delay: 0.07 });
        break;
      case 'reload_start':
        this._noise(0.03, { gain: 0.18, filter: 1500, filterType: 'bandpass' });
        this._tone(300, 0.04, { gain: 0.1, slideTo: 180 });
        break;
      case 'reload_end':
        this._tone(500, 0.05, { gain: 0.14, slideTo: 900 });
        break;
      case 'ui':
        this._tone(800, 0.03, { gain: 0.1 });
        break;
      case 'levelup':
        this._tone(523, 0.12, { type: 'sine', gain: 0.18 });
        this._tone(659, 0.12, { type: 'sine', gain: 0.18, delay: 0.09 });
        this._tone(880, 0.2, { type: 'sine', gain: 0.2, delay: 0.18 });
        break;
      case 'countdown':
        this._tone(440, 0.12, { type: 'square', gain: 0.2 });
        break;
      case 'go':
        this._tone(880, 0.25, { type: 'square', gain: 0.22, slideTo: 1200 });
        break;
      case 'complete':
        this._tone(523, 0.14, { type: 'square', gain: 0.18 });
        this._tone(659, 0.14, { type: 'square', gain: 0.18, delay: 0.12 });
        this._tone(784, 0.14, { type: 'square', gain: 0.18, delay: 0.24 });
        this._tone(1046, 0.3, { type: 'square', gain: 0.2, delay: 0.36 });
        break;
      case 'failed':
        this._tone(400, 0.18, { type: 'sawtooth', gain: 0.18, slideTo: 320 });
        this._tone(300, 0.18, { type: 'sawtooth', gain: 0.18, slideTo: 240, delay: 0.16 });
        this._tone(200, 0.4, { type: 'sawtooth', gain: 0.2, slideTo: 120, delay: 0.32 });
        break;
      case 'death':
        this._tone(200, 0.6, { type: 'sawtooth', gain: 0.26, slideTo: 40 });
        this._noise(0.5, { gain: 0.2, filter: 500, slideTo: 100 });
        break;
      case 'explode':
        this._noise(0.4, { gain: 0.42, filter: 1400, slideTo: 90 });
        this._tone(120, 0.35, { type: 'sawtooth', gain: 0.3, slideTo: 30 });
        break;
      case 'boss_summon':
        this._tone(90, 0.5, { type: 'sawtooth', gain: 0.28, slideTo: 55 });
        this._tone(135, 0.5, { type: 'square', gain: 0.16, slideTo: 80, delay: 0.05 });
        break;
      case 'achievement':
        this._tone(784, 0.12, { type: 'triangle', gain: 0.2 });
        this._tone(1046, 0.14, { type: 'triangle', gain: 0.2, delay: 0.1 });
        this._tone(1318, 0.3, { type: 'triangle', gain: 0.22, delay: 0.2 });
        break;
      case 'toggle':
        this._tone(600, 0.05, { type: 'square', gain: 0.12 });
        break;
    }
  }

  // ── Internals ──

  private _applyGain(): void {
    if (this.master && this.ctx) {
      this.master.gain.value = this.muted ? 0 : this.volume;
    }
  }

  private _tone(freq: number, dur: number, opts: ToneOpts = {}): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const t0 = ctx.currentTime + (opts.delay ?? 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = opts.type ?? 'square';
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.slideTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.slideTo), t0 + dur);
    }
    const peak = Math.max(0.0001, opts.gain ?? 0.25);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  private _noise(dur: number, opts: NoiseOpts = {}): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.noiseBuffer) return;
    const t0 = ctx.currentTime + (opts.delay ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = opts.filterType ?? 'lowpass';
    filter.frequency.setValueAtTime(opts.filter ?? 1200, t0);
    if (opts.slideTo !== undefined) {
      filter.frequency.exponentialRampToValueAtTime(Math.max(40, opts.slideTo), t0 + dur);
    }
    const g = ctx.createGain();
    const peak = Math.max(0.0001, opts.gain ?? 0.25);
    g.gain.setValueAtTime(peak, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  private _makeNoise(ctx: AudioContext): AudioBuffer {
    const len = Math.floor(ctx.sampleRate * 0.5);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  private _onClick = (e: MouseEvent): void => {
    const target = e.target as HTMLElement | null;
    if (target && target.closest('button')) this.play('ui');
  };
}
