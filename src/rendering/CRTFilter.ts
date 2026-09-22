/**
 * CRTFilter.ts
 * CRT / scanline / noise post-process filter.
 * PixiJS v8 Filter API: uses GlProgram + resources (UniformGroup).
 *
 * Shader compatibility notes:
 * - Fragment MUST declare the output as the exact string `out vec4 finalColor;`
 *   — Pixi's WebGL1 preprocessor strips that literal and `#define finalColor gl_FragColor`.
 *   Any other output name (e.g. `fragColor`) fails to compile on WebGL1 → black screen.
 * - Uses Pixi's default filter vertex shader (vTextureCoord) for correct output-frame math.
 *
 * Phase 1 — Technical Spike (fixed 2026-09-22)
 */

import { Filter, GlProgram, UniformGroup } from 'pixi.js';

/** PixiJS v8 default filter vertex shader (same as built-in filters). */
const VERT_SRC = `
in vec2 aPosition;
out vec2 vTextureCoord;

uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

vec4 filterVertexPosition(void)
{
    vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;

    position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0*uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;

    return vec4(position, 0.0, 1.0);
}

vec2 filterTextureCoord(void)
{
    return aPosition * (uOutputFrame.zw * uInputSize.zw);
}

void main(void)
{
    gl_Position = filterVertexPosition();
    vTextureCoord = filterTextureCoord();
}
`;

const FRAG_SRC = `
in vec2 vTextureCoord;

out vec4 finalColor;

uniform sampler2D uTexture;
uniform float uTime;
uniform float uScanlineIntensity;
uniform float uNoiseIntensity;
uniform float uVignette;
uniform float uChromatic;
uniform float uEnabled;

float rand(vec2 co) {
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

void main(void)
{
    vec4 color = texture(uTexture, vTextureCoord);

    if (uEnabled < 0.5) {
        finalColor = color;
        return;
    }

    vec2 uv = vTextureCoord;

    // Chromatic aberration
    float ca = uChromatic * 0.0015;
    color.r = texture(uTexture, uv + vec2(ca, 0.0)).r;
    color.b = texture(uTexture, uv - vec2(ca, 0.0)).b;

    // Scanlines based on fragment coord
    float scanline = sin(gl_FragCoord.y * 3.14159 * 0.5) * 0.5 + 0.5;
    color.rgb *= mix(1.0, scanline * 0.85 + 0.15, uScanlineIntensity * 0.5);

    // CRT noise
    float noise = rand(uv + vec2(fract(uTime * 0.01), fract(uTime * 0.007)));
    color.rgb += (noise - 0.5) * uNoiseIntensity * 0.05;

    // Vignette
    vec2 dist = uv - 0.5;
    float vig = 1.0 - dot(dist, dist) * uVignette * 2.5;
    color.rgb *= clamp(vig, 0.0, 1.0);

    finalColor = color;
}
`;

export interface CRTFilterOptions {
  scanlineIntensity?: number;
  noiseIntensity?: number;
  vignette?: number;
  chromatic?: number;
  enabled?: boolean;
}

export class CRTFilter extends Filter {
  private uniforms: UniformGroup;
  private _time = 0;

  constructor(opts: CRTFilterOptions = {}) {
    const uniforms = new UniformGroup({
      uTime: { value: 0, type: 'f32' },
      uScanlineIntensity: { value: opts.scanlineIntensity ?? 0.6, type: 'f32' },
      uNoiseIntensity: { value: opts.noiseIntensity ?? 0.5, type: 'f32' },
      uVignette: { value: opts.vignette ?? 0.7, type: 'f32' },
      uChromatic: { value: opts.chromatic ?? 0.8, type: 'f32' },
      uEnabled: { value: (opts.enabled ?? true) ? 1 : 0, type: 'f32' },
    });

    const glProgram = GlProgram.from({
      vertex: VERT_SRC,
      fragment: FRAG_SRC,
      name: 'crt-filter',
    });

    super({
      glProgram,
      resources: { crtUniforms: uniforms },
    });

    this.uniforms = uniforms;
  }

  update(dt: number): void {
    this._time += dt;
    this.uniforms.uniforms.uTime = this._time;
  }

  set crtEnabled(v: boolean) {
    this.uniforms.uniforms.uEnabled = v ? 1 : 0;
  }

  get crtEnabled(): boolean {
    return this.uniforms.uniforms.uEnabled === 1;
  }

  set noiseIntensity(v: number) {
    this.uniforms.uniforms.uNoiseIntensity = v;
  }

  get noiseIntensity(): number {
    return this.uniforms.uniforms.uNoiseIntensity as number;
  }
}
