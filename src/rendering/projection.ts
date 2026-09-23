/** Ground-plane perspective. World +Y is nearer the camera. */
export interface ProjectionView {
  cameraX: number;
  cameraY: number;
  screenW: number;
  screenH: number;
  tilt: number;
  focalLength: number;
  zoom?: number;
  shakeX?: number;
  shakeY?: number;
}

export function perspectiveScale(worldY: number, view: ProjectionView): number {
  return view.focalLength / (view.focalLength - (worldY - view.cameraY));
}

export function projectGround(worldX: number, worldY: number, view: ProjectionView): { x: number; y: number; scale: number } {
  const scale = perspectiveScale(worldY, view) * (view.zoom ?? 1);
  return {
    x: view.screenW / 2 + (view.shakeX ?? 0) + (worldX - view.cameraX) * scale,
    y: view.screenH / 2 + (view.shakeY ?? 0) + (worldY - view.cameraY) * view.tilt * scale,
    scale,
  };
}

/** Exact inverse at ground height; used for mouse aiming. */
export function unprojectGround(screenX: number, screenY: number, view: ProjectionView): { x: number; y: number } {
  const sx = screenX - view.screenW / 2 - (view.shakeX ?? 0);
  const sy = screenY - view.screenH / 2 - (view.shakeY ?? 0);
  const zoom = view.zoom ?? 1;
  const dy = sy * view.focalLength / (view.tilt * zoom * view.focalLength + sy);
  const scale = view.focalLength / (view.focalLength - dy) * zoom;
  return { x: view.cameraX + sx / scale, y: view.cameraY + dy };
}

export function projectHeight(worldX: number, worldY: number, height: number, view: ProjectionView): { x: number; y: number; scale: number } {
  const ground = projectGround(worldX, worldY, view);
  return { ...ground, y: ground.y - height * ground.scale };
}
