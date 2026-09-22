/**
 * depth.ts — Pseudo-3D ("2.5D") projection helpers.
 *
 * The world is simulated in flat top-down 2D coordinates. Rendering tilts the
 * camera by compressing the Y axis (an orthographic rotation around the X axis)
 * and drawing entities sorted by depth. That reads as an angled, slightly
 * isometric point of view — objects keep height and overlap correctly — while
 * every sprite stays plain 2D pixel art.
 *
 * Phase 3 — Game Feel, Combat Depth & Depth Tilt
 */

/** Vertical compression applied to the world when the tilt is enabled. */
export const TILT_Y_SCALE = 0.78;

/** Size falloff across the depth axis (entities nearer the camera draw larger). */
export const DEPTH_SCALE_RANGE = 0.16;

/** Smallest/largest depth multiplier, for reference in tests + docs. */
export const DEPTH_SCALE_MIN = 1 - DEPTH_SCALE_RANGE / 2;
export const DEPTH_SCALE_MAX = 1 + DEPTH_SCALE_RANGE / 2;

/** Screen Y for a world Y, given the camera and the tilt factor. */
export function projectScreenY(
  worldY: number,
  cameraY: number,
  screenH: number,
  yScale: number,
): number {
  return (worldY - cameraY) * yScale + screenH / 2;
}

/** Inverse of {@link projectScreenY}. */
export function unprojectWorldY(
  screenY: number,
  cameraY: number,
  screenH: number,
  yScale: number,
): number {
  const k = yScale <= 0 ? 1 : yScale;
  return (screenY - screenH / 2) / k + cameraY;
}

/**
 * Depth-based size multiplier. Entities nearer the bottom of the arena
 * (closer to the camera) draw slightly larger than those at the top.
 * Range: [DEPTH_SCALE_MIN, DEPTH_SCALE_MAX].
 */
export function depthScale(worldY: number, worldH: number): number {
  if (worldH <= 0) return 1;
  const t = clamp01(worldY / worldH) - 0.5;
  return 1 + t * DEPTH_SCALE_RANGE;
}

/**
 * Painter's-algorithm sort key for an entity at a given world Y.
 * Lower on the field → drawn later (in front).
 */
export function depthSortKey(worldY: number): number {
  return worldY;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
