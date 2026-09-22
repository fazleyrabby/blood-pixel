/**
 * missions.ts — All 15 mission definitions (data-driven per spec §52–73)
 *
 * Phase 2 — Vertical Slice (Mission 1 only; rest added in Phase 6)
 */

import type { ZombieType } from './zombies';

export type MissionObjective =
  | { type: 'survive'; durationSeconds: number }
  | { type: 'kill'; target: number }
  | { type: 'eliminate' }
  | { type: 'boss' }
  | { type: 'survive_then_eliminate'; durationSeconds: number; finalWave: MissionWave };

export interface ZombieSpawnDef {
  type: ZombieType;
  weight: number;
}

export interface MissionWave {
  startSeconds: number;
  durationSeconds?: number;
  totalSpawns?: number;
  spawnIntervalMs: number;
  burstSize: number;
  maxActive: number;
  spawnZones: string[];
  warning?: boolean;
  healthMultiplier?: number;
  speedMultiplier?: number;
  damageMultiplier?: number;
  elite?: boolean;
  zombieTypes: ZombieSpawnDef[];
}

export interface MissionDef {
  id: number;
  title: string;
  subtitle: string;
  mapId: 'town' | 'forest' | 'industrial';
  objective: MissionObjective;
  waves: MissionWave[];
  healthMultiplier: number;
  speedMultiplier: number;
  damageMultiplier: number;
  rewardXP: number;
  unlocksMissionId?: number;
  unlocksWeapon?: 'shotgun' | 'smg' | 'rifle';
  threatRating: number; // 1–5 display dots
}

export const MISSIONS: MissionDef[] = [
  {
    id: 1,
    title: 'FIRST BLOOD',
    subtitle: 'They\'ve reached the town.',
    mapId: 'town',
    objective: { type: 'kill', target: 20 },
    waves: [
      {
        startSeconds: 0,
        totalSpawns: 20,
        spawnIntervalMs: 1200,
        burstSize: 1,
        maxActive: 20,
        spawnZones: ['north', 'south', 'east', 'west'],
        zombieTypes: [{ type: 'walker', weight: 1.0 }],
      },
    ],
    healthMultiplier: 1.0,
    speedMultiplier: 1.0,
    damageMultiplier: 1.0,
    rewardXP: 100,
    unlocksMissionId: 2,
    threatRating: 1,
  },
  {
    id: 2,
    title: 'CRAWLING DEAD',
    subtitle: 'More of them. Finish it.',
    mapId: 'town',
    objective: { type: 'eliminate' },
    waves: [
      {
        startSeconds: 0,
        totalSpawns: 12,
        spawnIntervalMs: 1500,
        burstSize: 2,
        maxActive: 12,
        spawnZones: ['north', 'south'],
        zombieTypes: [{ type: 'walker', weight: 1.0 }],
      },
      {
        startSeconds: 30,
        totalSpawns: 12,
        spawnIntervalMs: 1200,
        burstSize: 2,
        maxActive: 20,
        spawnZones: ['east', 'west'],
        zombieTypes: [{ type: 'walker', weight: 1.0 }],
      },
      {
        startSeconds: 70,
        totalSpawns: 11,
        spawnIntervalMs: 1000,
        burstSize: 2,
        maxActive: 25,
        spawnZones: ['north', 'east', 'south', 'west'],
        warning: true,
        zombieTypes: [{ type: 'walker', weight: 1.0 }],
      },
    ],
    healthMultiplier: 1.05,
    speedMultiplier: 1.0,
    damageMultiplier: 1.0,
    rewardXP: 150,
    unlocksMissionId: 3,
    threatRating: 1,
  },
  {
    id: 3,
    title: 'THROUGH THE TREES',
    subtitle: 'Survive the forest swarm.',
    mapId: 'forest',
    objective: { type: 'survive', durationSeconds: 90 },
    waves: [
      {
        startSeconds: 0,
        durationSeconds: 90,
        spawnIntervalMs: 1400,
        burstSize: 1,
        maxActive: 35,
        spawnZones: ['north', 'south', 'east', 'west'],
        zombieTypes: [{ type: 'walker', weight: 1.0 }],
      },
    ],
    healthMultiplier: 1.05,
    speedMultiplier: 1.05,
    damageMultiplier: 1.0,
    rewardXP: 175,
    unlocksMissionId: 4,
    threatRating: 1,
  },
  {
    id: 4,
    title: 'DEAD SPRINT',
    subtitle: 'They move faster now.',
    mapId: 'forest',
    objective: { type: 'kill', target: 55 },
    waves: [
      {
        startSeconds: 0,
        totalSpawns: 35,
        spawnIntervalMs: 1000,
        burstSize: 1,
        maxActive: 30,
        spawnZones: ['north', 'east', 'south', 'west'],
        zombieTypes: [{ type: 'walker', weight: 0.8 }, { type: 'runner', weight: 0.2 }],
      },
      {
        startSeconds: 45,
        totalSpawns: 20,
        spawnIntervalMs: 800,
        burstSize: 2,
        maxActive: 40,
        spawnZones: ['north', 'east', 'south', 'west'],
        warning: true,
        zombieTypes: [{ type: 'walker', weight: 0.5 }, { type: 'runner', weight: 0.5 }],
      },
    ],
    healthMultiplier: 1.1,
    speedMultiplier: 1.05,
    damageMultiplier: 1.0,
    rewardXP: 200,
    unlocksMissionId: 5,
    unlocksWeapon: 'shotgun',
    threatRating: 2,
  },
  {
    id: 5,
    title: 'BROKEN PERIMETER',
    subtitle: 'Two waves. Hold the line.',
    mapId: 'town',
    objective: { type: 'survive', durationSeconds: 120 },
    waves: [
      {
        startSeconds: 0,
        durationSeconds: 60,
        spawnIntervalMs: 800,
        burstSize: 1,
        maxActive: 45,
        spawnZones: ['north', 'east', 'south', 'west'],
        zombieTypes: [{ type: 'walker', weight: 0.8 }, { type: 'runner', weight: 0.2 }],
      },
      {
        startSeconds: 60,
        durationSeconds: 60,
        spawnIntervalMs: 600,
        burstSize: 2,
        maxActive: 70,
        spawnZones: ['north', 'east', 'south', 'west'],
        warning: true,
        zombieTypes: [{ type: 'walker', weight: 0.65 }, { type: 'runner', weight: 0.35 }],
      },
    ],
    healthMultiplier: 1.15,
    speedMultiplier: 1.1,
    damageMultiplier: 1.05,
    rewardXP: 250,
    unlocksMissionId: 6,
    threatRating: 2,
  },
  {
    id: 6,
    title: 'IRON CURTAIN',
    subtitle: 'Something big is moving.',
    mapId: 'industrial',
    objective: { type: 'eliminate' },
    waves: [
      { startSeconds: 0, totalSpawns: 20, spawnIntervalMs: 1200, burstSize: 2, maxActive: 30, spawnZones: ['north', 'east'], zombieTypes: [{ type: 'walker', weight: 0.9 }, { type: 'runner', weight: 0.1 }] },
      { startSeconds: 30, totalSpawns: 20, spawnIntervalMs: 1000, burstSize: 2, maxActive: 40, spawnZones: ['south', 'west'], zombieTypes: [{ type: 'walker', weight: 0.7 }, { type: 'runner', weight: 0.3 }] },
      { startSeconds: 70, totalSpawns: 20, spawnIntervalMs: 900, burstSize: 2, maxActive: 50, spawnZones: ['north', 'east', 'south', 'west'], warning: true, zombieTypes: [{ type: 'walker', weight: 0.5 }, { type: 'runner', weight: 0.3 }, { type: 'brute', weight: 0.2 }] },
      { startSeconds: 120, totalSpawns: 15, spawnIntervalMs: 800, burstSize: 1, maxActive: 55, spawnZones: ['north', 'south'], zombieTypes: [{ type: 'walker', weight: 0.3 }, { type: 'brute', weight: 0.7 }] },
    ],
    healthMultiplier: 1.15,
    speedMultiplier: 1.1,
    damageMultiplier: 1.1,
    rewardXP: 300,
    unlocksMissionId: 7,
    threatRating: 3,
  },
  {
    id: 7,
    title: 'KILL ZONE',
    subtitle: 'Clear them all. No mercy.',
    mapId: 'industrial',
    objective: { type: 'kill', target: 90 },
    waves: [
      { startSeconds: 0, totalSpawns: 50, spawnIntervalMs: 700, burstSize: 2, maxActive: 50, spawnZones: ['north', 'east', 'south', 'west'], zombieTypes: [{ type: 'walker', weight: 0.6 }, { type: 'runner', weight: 0.3 }, { type: 'brute', weight: 0.1 }] },
      { startSeconds: 60, totalSpawns: 40, spawnIntervalMs: 600, burstSize: 2, maxActive: 65, spawnZones: ['north', 'east', 'south', 'west'], warning: true, zombieTypes: [{ type: 'walker', weight: 0.4 }, { type: 'runner', weight: 0.4 }, { type: 'brute', weight: 0.2 }] },
    ],
    healthMultiplier: 1.2,
    speedMultiplier: 1.1,
    damageMultiplier: 1.1,
    rewardXP: 350,
    unlocksMissionId: 8,
    unlocksWeapon: 'smg',
    threatRating: 3,
  },
  {
    id: 8,
    title: 'ACID RAIN',
    subtitle: 'They spit. Stay mobile.',
    mapId: 'forest',
    objective: { type: 'survive', durationSeconds: 150 },
    waves: [
      { startSeconds: 0, durationSeconds: 150, spawnIntervalMs: 650, burstSize: 2, maxActive: 100, spawnZones: ['north', 'east', 'south', 'west'], zombieTypes: [{ type: 'walker', weight: 0.4 }, { type: 'runner', weight: 0.25 }, { type: 'brute', weight: 0.1 }, { type: 'spitter', weight: 0.1 }, { type: 'crawler', weight: 0.1 }, { type: 'exploder', weight: 0.05 }] },
    ],
    healthMultiplier: 1.25,
    speedMultiplier: 1.15,
    damageMultiplier: 1.15,
    rewardXP: 400,
    unlocksMissionId: 9,
    threatRating: 3,
  },
  {
    id: 9,
    title: 'CROSSFIRE',
    subtitle: 'Runners and Spitters. Watch your flanks.',
    mapId: 'town',
    objective: { type: 'eliminate' },
    waves: [
      { startSeconds: 0, totalSpawns: 25, spawnIntervalMs: 900, burstSize: 2, maxActive: 40, spawnZones: ['north', 'east'], zombieTypes: [{ type: 'runner', weight: 0.5 }, { type: 'spitter', weight: 0.3 }, { type: 'crawler', weight: 0.2 }] },
      { startSeconds: 40, totalSpawns: 25, spawnIntervalMs: 800, burstSize: 2, maxActive: 55, spawnZones: ['south', 'west'], zombieTypes: [{ type: 'runner', weight: 0.45 }, { type: 'spitter', weight: 0.35 }, { type: 'crawler', weight: 0.2 }] },
      { startSeconds: 90, totalSpawns: 25, spawnIntervalMs: 700, burstSize: 2, maxActive: 65, spawnZones: ['north', 'east', 'south', 'west'], warning: true, zombieTypes: [{ type: 'walker', weight: 0.2 }, { type: 'runner', weight: 0.35 }, { type: 'spitter', weight: 0.3 }, { type: 'exploder', weight: 0.15 }] },
      { startSeconds: 150, totalSpawns: 25, spawnIntervalMs: 600, burstSize: 2, maxActive: 80, spawnZones: ['north', 'south'], zombieTypes: [{ type: 'runner', weight: 0.4 }, { type: 'spitter', weight: 0.25 }, { type: 'brute', weight: 0.15 }, { type: 'armored', weight: 0.2 }] },
      { startSeconds: 210, totalSpawns: 20, spawnIntervalMs: 500, burstSize: 2, maxActive: 80, spawnZones: ['north', 'east', 'south', 'west'], warning: true, zombieTypes: [{ type: 'walker', weight: 0.15 }, { type: 'runner', weight: 0.35 }, { type: 'spitter', weight: 0.25 }, { type: 'exploder', weight: 0.25 }] },
    ],
    healthMultiplier: 1.3,
    speedMultiplier: 1.2,
    damageMultiplier: 1.2,
    rewardXP: 450,
    unlocksMissionId: 10,
    threatRating: 3,
  },
  {
    id: 10,
    title: 'ALL FALL DOWN',
    subtitle: 'Every type. All at once.',
    mapId: 'industrial',
    objective: { type: 'kill', target: 150 },
    waves: [
      { startSeconds: 0, totalSpawns: 75, spawnIntervalMs: 600, burstSize: 2, maxActive: 80, spawnZones: ['north', 'east', 'south', 'west'], zombieTypes: [{ type: 'walker', weight: 0.3 }, { type: 'runner', weight: 0.25 }, { type: 'brute', weight: 0.12 }, { type: 'spitter', weight: 0.12 }, { type: 'crawler', weight: 0.11 }, { type: 'exploder', weight: 0.1 }] },
      { startSeconds: 60, totalSpawns: 75, spawnIntervalMs: 500, burstSize: 3, maxActive: 100, spawnZones: ['north', 'east', 'south', 'west'], warning: true, zombieTypes: [{ type: 'walker', weight: 0.25 }, { type: 'runner', weight: 0.3 }, { type: 'brute', weight: 0.12 }, { type: 'spitter', weight: 0.13 }, { type: 'armored', weight: 0.1 }, { type: 'exploder', weight: 0.1 }] },
    ],
    healthMultiplier: 1.35,
    speedMultiplier: 1.2,
    damageMultiplier: 1.2,
    rewardXP: 500,
    unlocksMissionId: 11,
    threatRating: 4,
  },
  {
    id: 11,
    title: 'IRON GIANTS',
    subtitle: 'Heavy brutes. Bring the shotgun.',
    mapId: 'industrial',
    objective: { type: 'eliminate' },
    waves: [
      { startSeconds: 0, totalSpawns: 20, spawnIntervalMs: 1000, burstSize: 2, maxActive: 50, spawnZones: ['north', 'east'], zombieTypes: [{ type: 'brute', weight: 0.4 }, { type: 'walker', weight: 0.4 }, { type: 'armored', weight: 0.2 }] },
      { startSeconds: 50, totalSpawns: 20, spawnIntervalMs: 900, burstSize: 2, maxActive: 65, spawnZones: ['south', 'west'], zombieTypes: [{ type: 'brute', weight: 0.45 }, { type: 'runner', weight: 0.3 }, { type: 'armored', weight: 0.25 }] },
      { startSeconds: 110, totalSpawns: 20, spawnIntervalMs: 800, burstSize: 2, maxActive: 80, spawnZones: ['north', 'east', 'south', 'west'], warning: true, zombieTypes: [{ type: 'brute', weight: 0.5 }, { type: 'spitter', weight: 0.2 }, { type: 'armored', weight: 0.3 }] },
      { startSeconds: 170, totalSpawns: 20, spawnIntervalMs: 700, burstSize: 2, maxActive: 90, spawnZones: ['north', 'east', 'south', 'west'], zombieTypes: [{ type: 'brute', weight: 0.4 }, { type: 'runner', weight: 0.2 }, { type: 'spitter', weight: 0.15 }, { type: 'armored', weight: 0.25 }] },
      { startSeconds: 240, totalSpawns: 15, spawnIntervalMs: 600, burstSize: 2, maxActive: 90, spawnZones: ['north', 'east', 'south', 'west'], warning: true, zombieTypes: [{ type: 'brute', weight: 0.55 }, { type: 'spitter', weight: 0.15 }, { type: 'armored', weight: 0.3 }] },
    ],
    healthMultiplier: 1.4,
    speedMultiplier: 1.2,
    damageMultiplier: 1.25,
    rewardXP: 550,
    unlocksMissionId: 12,
    threatRating: 4,
  },
  {
    id: 12,
    title: 'THE FLOOD',
    subtitle: 'Survive the forest. They never stop.',
    mapId: 'forest',
    objective: { type: 'survive', durationSeconds: 180 },
    waves: [
      { startSeconds: 0, durationSeconds: 180, spawnIntervalMs: 500, burstSize: 3, maxActive: 130, spawnZones: ['north', 'east', 'south', 'west'], zombieTypes: [{ type: 'walker', weight: 0.3 }, { type: 'runner', weight: 0.3 }, { type: 'brute', weight: 0.1 }, { type: 'spitter', weight: 0.1 }, { type: 'crawler', weight: 0.12 }, { type: 'exploder', weight: 0.08 }] },
    ],
    healthMultiplier: 1.45,
    speedMultiplier: 1.25,
    damageMultiplier: 1.25,
    rewardXP: 600,
    unlocksMissionId: 13,
    unlocksWeapon: 'rifle',
    threatRating: 4,
  },
  {
    id: 13,
    title: 'ENDLESS NIGHT',
    subtitle: 'They keep coming. Keep shooting.',
    mapId: 'town',
    objective: { type: 'kill', target: 220 },
    waves: [
      { startSeconds: 0, totalSpawns: 110, spawnIntervalMs: 400, burstSize: 3, maxActive: 120, spawnZones: ['north', 'east', 'south', 'west'], zombieTypes: [{ type: 'walker', weight: 0.3 }, { type: 'runner', weight: 0.3 }, { type: 'brute', weight: 0.1 }, { type: 'spitter', weight: 0.1 }, { type: 'crawler', weight: 0.12 }, { type: 'exploder', weight: 0.08 }] },
      { startSeconds: 60, totalSpawns: 110, spawnIntervalMs: 350, burstSize: 4, maxActive: 160, spawnZones: ['north', 'east', 'south', 'west'], warning: true, zombieTypes: [{ type: 'walker', weight: 0.22 }, { type: 'runner', weight: 0.3 }, { type: 'brute', weight: 0.13 }, { type: 'spitter', weight: 0.13 }, { type: 'armored', weight: 0.12 }, { type: 'exploder', weight: 0.1 }] },
    ],
    healthMultiplier: 1.5,
    speedMultiplier: 1.3,
    damageMultiplier: 1.3,
    rewardXP: 650,
    unlocksMissionId: 14,
    threatRating: 4,
  },
  {
    id: 14,
    title: 'ELITE PURGE',
    subtitle: 'Elite class. They are faster and stronger.',
    mapId: 'industrial',
    objective: { type: 'eliminate' },
    waves: [
      { startSeconds: 0, totalSpawns: 40, spawnIntervalMs: 700, burstSize: 3, maxActive: 100, spawnZones: ['north', 'east'], healthMultiplier: 1.5, speedMultiplier: 1.3, damageMultiplier: 1.4, zombieTypes: [{ type: 'walker', weight: 0.3 }, { type: 'runner', weight: 0.25 }, { type: 'brute', weight: 0.15 }, { type: 'spitter', weight: 0.12 }, { type: 'armored', weight: 0.18 }] },
      { startSeconds: 60, totalSpawns: 40, spawnIntervalMs: 600, burstSize: 3, maxActive: 130, spawnZones: ['south', 'west'], healthMultiplier: 1.6, speedMultiplier: 1.35, damageMultiplier: 1.4, zombieTypes: [{ type: 'walker', weight: 0.25 }, { type: 'runner', weight: 0.25 }, { type: 'brute', weight: 0.18 }, { type: 'spitter', weight: 0.17 }, { type: 'exploder', weight: 0.15 }] },
      { startSeconds: 130, totalSpawns: 40, spawnIntervalMs: 500, burstSize: 3, maxActive: 150, spawnZones: ['north', 'east', 'south', 'west'], warning: true, healthMultiplier: 1.7, speedMultiplier: 1.4, damageMultiplier: 1.5, elite: true, zombieTypes: [{ type: 'walker', weight: 0.25 }, { type: 'runner', weight: 0.25 }, { type: 'brute', weight: 0.2 }, { type: 'spitter', weight: 0.15 }, { type: 'armored', weight: 0.15 }] },
      { startSeconds: 210, totalSpawns: 40, spawnIntervalMs: 450, burstSize: 4, maxActive: 170, spawnZones: ['north', 'east', 'south', 'west'], healthMultiplier: 1.8, speedMultiplier: 1.45, damageMultiplier: 1.6, elite: true, zombieTypes: [{ type: 'runner', weight: 0.35 }, { type: 'brute', weight: 0.25 }, { type: 'spitter', weight: 0.2 }, { type: 'exploder', weight: 0.2 }] },
      { startSeconds: 300, totalSpawns: 40, spawnIntervalMs: 400, burstSize: 4, maxActive: 180, spawnZones: ['north', 'east', 'south', 'west'], warning: true, healthMultiplier: 2.0, speedMultiplier: 1.5, damageMultiplier: 1.7, elite: true, zombieTypes: [{ type: 'runner', weight: 0.25 }, { type: 'brute', weight: 0.3 }, { type: 'spitter', weight: 0.2 }, { type: 'armored', weight: 0.25 }] },
      { startSeconds: 400, totalSpawns: 40, spawnIntervalMs: 350, burstSize: 4, maxActive: 180, spawnZones: ['north', 'east', 'south', 'west'], healthMultiplier: 2.2, speedMultiplier: 1.55, damageMultiplier: 1.8, elite: true, zombieTypes: [{ type: 'runner', weight: 0.2 }, { type: 'brute', weight: 0.35 }, { type: 'spitter', weight: 0.2 }, { type: 'armored', weight: 0.25 }] },
    ],
    healthMultiplier: 1.6,
    speedMultiplier: 1.35,
    damageMultiplier: 1.4,
    rewardXP: 750,
    unlocksMissionId: 15,
    threatRating: 5,
  },
  {
    id: 15,
    title: 'THE ABOMINATION',
    subtitle: 'Survive the horde. Then kill the thing behind it.',
    mapId: 'forest',
    objective: { type: 'boss' },
    waves: [
      { startSeconds: 0, durationSeconds: 60, spawnIntervalMs: 600, burstSize: 3, maxActive: 150, spawnZones: ['north', 'east', 'south', 'west'], zombieTypes: [{ type: 'walker', weight: 0.3 }, { type: 'runner', weight: 0.3 }, { type: 'brute', weight: 0.15 }, { type: 'spitter', weight: 0.15 }, { type: 'crawler', weight: 0.1 }] },
      { startSeconds: 60, durationSeconds: 60, spawnIntervalMs: 500, burstSize: 3, maxActive: 170, spawnZones: ['north', 'east', 'south', 'west'], warning: true, healthMultiplier: 1.5, zombieTypes: [{ type: 'walker', weight: 0.25 }, { type: 'runner', weight: 0.35 }, { type: 'brute', weight: 0.15 }, { type: 'spitter', weight: 0.15 }, { type: 'exploder', weight: 0.1 }] },
      { startSeconds: 120, durationSeconds: 60, spawnIntervalMs: 450, burstSize: 4, maxActive: 190, spawnZones: ['north', 'east', 'south', 'west'], healthMultiplier: 1.8, zombieTypes: [{ type: 'walker', weight: 0.2 }, { type: 'runner', weight: 0.35 }, { type: 'brute', weight: 0.2 }, { type: 'spitter', weight: 0.15 }, { type: 'armored', weight: 0.1 }] },
      { startSeconds: 180, durationSeconds: 60, spawnIntervalMs: 400, burstSize: 4, maxActive: 200, spawnZones: ['north', 'east', 'south', 'west'], warning: true, healthMultiplier: 2.0, zombieTypes: [{ type: 'walker', weight: 0.15 }, { type: 'runner', weight: 0.35 }, { type: 'brute', weight: 0.2 }, { type: 'spitter', weight: 0.15 }, { type: 'exploder', weight: 0.15 }] },
      // The Abomination
      { startSeconds: 240, totalSpawns: 1, spawnIntervalMs: 1000, burstSize: 1, maxActive: 300, spawnZones: ['north'], warning: true, zombieTypes: [{ type: 'abomination', weight: 1 }] },
      // Boss escort adds
      { startSeconds: 250, durationSeconds: 900, spawnIntervalMs: 1600, burstSize: 2, maxActive: 300, spawnZones: ['north', 'east', 'south', 'west'], zombieTypes: [{ type: 'crawler', weight: 0.6 }, { type: 'exploder', weight: 0.4 }] },
    ],
    healthMultiplier: 1.8,
    speedMultiplier: 1.4,
    damageMultiplier: 1.6,
    rewardXP: 0, // Victory — no campaign upgrade per spec §28
    threatRating: 5,
  },
];

export function getMission(id: number): MissionDef | undefined {
  return MISSIONS.find(m => m.id === id);
}
