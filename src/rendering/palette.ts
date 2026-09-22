/**
 * palette.ts — Enemy tint palettes.
 *
 * The default palette is hue-coded (green walkers, orange runners, red brutes,
 * purple spitters…). For deuteranopia/protanopia those hues collapse into each
 * other, so `colorblindMode` swaps in a palette separated by *lightness and
 * blue-yellow axis* instead. Silhouettes differ per type anyway, so colour is
 * a secondary channel.
 *
 * Phase 5 — Ship Prep (accessibility)
 */

export type EnemyPalette = 'default' | 'colorblind';

const DEFAULT_TINTS: Record<string, number> = {
  walker: 0x39ff14,
  runner: 0xff8844,
  brute: 0xdd2222,
  spitter: 0xcc44ff,
  crawler: 0x99ff33,
  armored: 0x8899aa,
  exploder: 0xff5522,
  abomination: 0xcc0022,
};

const DEFAULT_ELITE: Record<string, number> = {
  walker: 0xff4444,
  runner: 0xff8800,
  brute: 0xff2266,
  spitter: 0xff88ff,
  crawler: 0xffee44,
  armored: 0xffddaa,
  exploder: 0xffaa22,
  abomination: 0xff2266,
};

/** Blue/yellow-axis palette: distinguishable without red-green discrimination.
 *  Cyan is reserved for the player, so crawlers use a light blue instead. */
const COLORBLIND_TINTS: Record<string, number> = {
  walker: 0xffffff,   // white
  runner: 0x4da6ff,   // sky blue
  brute: 0xffd000,    // yellow
  spitter: 0xff66ff,  // magenta
  crawler: 0xbfe6ff,  // pale blue (distinct from the player's cyan)
  armored: 0xb0b0b0,  // grey
  exploder: 0xff8800, // orange
  abomination: 0xff3355,
};

const COLORBLIND_ELITE: Record<string, number> = {
  walker: 0xffe9b0,
  runner: 0x9fd4ff,
  brute: 0xfff28a,
  spitter: 0xffb3ff,
  crawler: 0xe6f5ff,
  armored: 0xffffff,
  exploder: 0xffc266,
  abomination: 0xff88a0,
};

const FALLBACK = 0x39ff14;

/** Tint for a zombie type under the active palette. */
export function enemyTint(
  type: string,
  elite: boolean,
  palette: EnemyPalette = 'default',
): number {
  const map = palette === 'colorblind' ? COLORBLIND_TINTS : DEFAULT_TINTS;
  const eliteMap = palette === 'colorblind' ? COLORBLIND_ELITE : DEFAULT_ELITE;
  const source = elite ? eliteMap : map;
  return source[type] ?? (elite ? 0xff4444 : FALLBACK);
}
