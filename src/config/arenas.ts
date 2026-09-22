/**
 * arenas.ts — Arena layout definitions (3 maps reused across 15 missions)
 * Each arena has world bounds, player start, spawn zones, static obstacles.
 *
 * Phase 2 — Vertical Slice
 */

export type MapId = 'town' | 'forest' | 'industrial';

export interface SpawnZone {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ObstacleRect {
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
}

export interface ArenaDef {
  id: MapId;
  name: string;
  worldWidth: number;
  worldHeight: number;
  playerStartX: number;
  playerStartY: number;
  /** Minimum safe radius around player start at mission start */
  clearRadiusUnits: number;
  spawnZones: SpawnZone[];
  obstacles: ObstacleRect[];
  /** Background tint color */
  groundColor: number;
  /** Obstacle tint color */
  wallColor: number;
}

const ARENA_W = 2200;
const ARENA_H = 1600;
const CX = ARENA_W / 2;
const CY = ARENA_H / 2;

// Helper to create edge spawn zones
function edgeZones(margin = 60, depth = 120): SpawnZone[] {
  return [
    { id: 'north', x: margin, y: 0, width: ARENA_W - margin * 2, height: depth },
    { id: 'south', x: margin, y: ARENA_H - depth, width: ARENA_W - margin * 2, height: depth },
    { id: 'east', x: ARENA_W - depth, y: margin, width: depth, height: ARENA_H - margin * 2 },
    { id: 'west', x: 0, y: margin, width: depth, height: ARENA_H - margin * 2 },
  ];
}

export const ARENAS: Record<MapId, ArenaDef> = {
  town: {
    id: 'town',
    name: 'ABANDONED TOWN',
    worldWidth: ARENA_W,
    worldHeight: ARENA_H,
    playerStartX: CX,
    playerStartY: CY,
    clearRadiusUnits: 300,
    spawnZones: edgeZones(),
    groundColor: 0x0a0e0a,
    wallColor: 0x1a2a1a,
    obstacles: [
      // Buildings scattered around
      { x: 200, y: 150, width: 180, height: 120, label: 'shop' },
      { x: 600, y: 100, width: 200, height: 150, label: 'house-a' },
      { x: 1200, y: 80, width: 160, height: 130, label: 'house-b' },
      { x: 1700, y: 120, width: 200, height: 160, label: 'warehouse' },
      { x: 1900, y: 400, width: 150, height: 120, label: 'garage' },
      { x: 100, y: 700, width: 160, height: 140, label: 'house-c' },
      { x: 450, y: 1200, width: 180, height: 150, label: 'house-d' },
      { x: 1400, y: 1300, width: 200, height: 120, label: 'factory' },
      { x: 1800, y: 1200, width: 160, height: 140, label: 'shed' },
      // Cars as obstacles
      { x: 700, y: 750, width: 60, height: 30, label: 'car-a' },
      { x: 1000, y: 400, width: 60, height: 30, label: 'car-b' },
      { x: 1300, y: 900, width: 60, height: 30, label: 'car-c' },
    ],
  },

  forest: {
    id: 'forest',
    name: 'DARK FOREST',
    worldWidth: ARENA_W,
    worldHeight: ARENA_H,
    playerStartX: CX,
    playerStartY: CY,
    clearRadiusUnits: 300,
    spawnZones: edgeZones(),
    groundColor: 0x050d05,
    wallColor: 0x0d2008,
    obstacles: [
      // Trees as clusters
      { x: 180, y: 200, width: 40, height: 40, label: 'tree' },
      { x: 240, y: 180, width: 40, height: 40, label: 'tree' },
      { x: 300, y: 220, width: 40, height: 40, label: 'tree' },
      { x: 500, y: 350, width: 40, height: 40, label: 'tree' },
      { x: 560, y: 320, width: 40, height: 40, label: 'tree' },
      { x: 800, y: 150, width: 40, height: 40, label: 'tree' },
      { x: 1100, y: 200, width: 40, height: 40, label: 'tree' },
      { x: 1400, y: 300, width: 40, height: 40, label: 'tree' },
      { x: 1600, y: 180, width: 40, height: 40, label: 'tree' },
      { x: 1800, y: 250, width: 40, height: 40, label: 'tree' },
      { x: 200, y: 1000, width: 40, height: 40, label: 'tree' },
      { x: 260, y: 1020, width: 40, height: 40, label: 'tree' },
      { x: 700, y: 1100, width: 40, height: 40, label: 'tree' },
      { x: 1000, y: 1300, width: 40, height: 40, label: 'tree' },
      { x: 1500, y: 1200, width: 40, height: 40, label: 'tree' },
      { x: 1900, y: 1100, width: 40, height: 40, label: 'tree' },
      // Rock formation
      { x: 900, y: 700, width: 80, height: 50, label: 'rock' },
      { x: 1300, y: 750, width: 60, height: 60, label: 'rock' },
    ],
  },

  industrial: {
    id: 'industrial',
    name: 'INDUSTRIAL COMPOUND',
    worldWidth: ARENA_W,
    worldHeight: ARENA_H,
    playerStartX: CX,
    playerStartY: CY,
    clearRadiusUnits: 300,
    spawnZones: edgeZones(),
    groundColor: 0x080808,
    wallColor: 0x1a1a1a,
    obstacles: [
      // Large structures
      { x: 150, y: 100, width: 300, height: 200, label: 'factory-a' },
      { x: 1700, y: 80, width: 350, height: 220, label: 'factory-b' },
      { x: 100, y: 1300, width: 280, height: 200, label: 'storage-a' },
      { x: 1800, y: 1280, width: 300, height: 220, label: 'storage-b' },
      // Machinery / containers
      { x: 700, y: 200, width: 80, height: 80, label: 'container' },
      { x: 800, y: 200, width: 80, height: 80, label: 'container' },
      { x: 700, y: 1300, width: 80, height: 80, label: 'container' },
      { x: 1400, y: 1300, width: 80, height: 80, label: 'container' },
      // Pillars / machinery in middle area
      { x: 700, y: 650, width: 40, height: 40, label: 'pillar' },
      { x: 1460, y: 650, width: 40, height: 40, label: 'pillar' },
      { x: 700, y: 900, width: 40, height: 40, label: 'pillar' },
      { x: 1460, y: 900, width: 40, height: 40, label: 'pillar' },
    ],
  },
};
