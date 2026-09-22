/**
 * SpawnSystem.ts
 * Wave-based spawning: intervals, bursts, active caps, weighted type pick,
 * edge spawn zones with obstacle/player avoidance.
 *
 * Phase 2 — Vertical Slice
 */

import type { World, WaveRuntime } from '../game/World';
import { activeZombieCount } from '../game/World';
import { ZOMBIES, type ZombieType } from '../config/zombies';
import { createZombie } from '../entities/Zombie';
import type { MissionDef, MissionWave } from '../config/missions';
import type { SpawnZone, ObstacleRect } from '../config/arenas';
import { pointInObstacle } from './CollisionSystem';
import { PLAYER_RADIUS } from '../game/World';

export function createWaveRuntime(mission: MissionDef): WaveRuntime {
  return {
    spawned: mission.waves.map(() => 0),
    timers: mission.waves.map(() => 0),
    done: mission.waves.map(() => false),
    finalSpawned: 0,
    finalTimer: 0,
    finalDone: mission.objective.type !== 'survive_then_eliminate',
  };
}

export function updateSpawning(world: World, dt: number): void {
  const { mission, waveRuntime, state } = world;

  for (let i = 0; i < mission.waves.length; i++) {
    if (waveRuntime.done[i]) continue;
    tickWave(world, mission.waves[i], i, dt);
  }

  // Final wave for survive_then_eliminate
  if (mission.objective.type === 'survive_then_eliminate' && !waveRuntime.finalDone) {
    const obj = mission.objective;
    if (state.missionTimer >= obj.durationSeconds) {
      state.missionPhase = 'final_wave';
      tickWave(world, obj.finalWave, -1, dt);
    }
  }
}

function tickWave(world: World, wave: MissionWave, index: number, dt: number): void {
  const rt = world.waveRuntime;
  const t = world.state.missionTimer;

  if (t < wave.startSeconds) return;

  const isFinal = index === -1;
  let spawned = isFinal ? rt.finalSpawned : rt.spawned[index];
  let timer = isFinal ? rt.finalTimer : rt.timers[index];

  // Duration-limited waves stop spawning after their window
  if (wave.durationSeconds !== undefined && t > wave.startSeconds + wave.durationSeconds) {
    if (!isFinal) rt.done[index] = true;
    else rt.finalDone = true;
    return;
  }

  // Budget exhausted
  if (wave.totalSpawns !== undefined && spawned >= wave.totalSpawns) {
    if (!isFinal) rt.done[index] = true;
    else rt.finalDone = true;
    return;
  }

  timer += dt;
  const interval = wave.spawnIntervalMs / 1000;
  const active = activeZombieCount(world.zombies);

  while (timer >= interval) {
    timer -= interval;
    for (let b = 0; b < wave.burstSize; b++) {
      if (wave.totalSpawns !== undefined && spawned >= wave.totalSpawns) {
        if (!isFinal) rt.done[index] = true;
        else rt.finalDone = true;
        break;
      }
      if (activeZombieCount(world.zombies) >= wave.maxActive) break;

      const type = pickType(wave);
      const zone = pickZone(world, wave.spawnZones);
      const point = pickPoint(world, zone);
      spawnZombieAt(world, type, point.x, point.y, wave);
      spawned++;
    }
    if ((isFinal && rt.finalDone) || (!isFinal && rt.done[index])) break;
  }

  void active;
  if (isFinal) {
    rt.finalSpawned = spawned;
    rt.finalTimer = timer;
  } else {
    rt.spawned[index] = spawned;
    rt.timers[index] = timer;
  }
}

function spawnZombieAt(
  world: World,
  type: ZombieType,
  x: number,
  y: number,
  wave: MissionWave,
): void {
  const def = ZOMBIES[type];
  const mission = world.mission;
  const mults = {
    hp: mission.healthMultiplier * (wave.healthMultiplier ?? 1),
    speed: mission.speedMultiplier * (wave.speedMultiplier ?? 1),
    damage: mission.damageMultiplier * (wave.damageMultiplier ?? 1),
  };
  const z = createZombie(world.nextId(), type, x, y, def, mults, wave.elite ?? false);
  world.zombies.push(z);
  world.state.totalSpawned += 1;
  if (z.isBoss) {
    world.state.bossSpawned = true;
    world.state.bossName = def.name;
  }
  world.events.onZombieSpawned(z);
}

function pickType(wave: MissionWave): ZombieType {
  const total = wave.zombieTypes.reduce((s, t) => s + t.weight, 0);
  let roll = Math.random() * total;
  for (const t of wave.zombieTypes) {
    roll -= t.weight;
    if (roll <= 0) return t.type;
  }
  return wave.zombieTypes[wave.zombieTypes.length - 1].type;
}

function pickZone(world: World, zoneIds: string[]): SpawnZone | null {
  const zones = world.arena.spawnZones.filter((z) => zoneIds.includes(z.id));
  if (zones.length === 0) return null;
  return zones[Math.floor(Math.random() * zones.length)];
}

function pickPoint(
  world: World,
  zone: SpawnZone | null,
): { x: number; y: number } {
  const { arena, player } = world;
  if (!zone) {
    // Fallback: arena edge midpoint
    return { x: arena.worldWidth / 2, y: 60 };
  }

  for (let attempt = 0; attempt < 16; attempt++) {
    const x = zone.x + Math.random() * zone.width;
    const y = zone.y + Math.random() * zone.height;
    if (pointInObstacle(x, y, arena.obstacles)) continue;
    // Keep a safety gap from the player
    if (Math.hypot(x - player.x, y - player.y) < 180 + PLAYER_RADIUS) continue;
    return { x, y };
  }

  // Last resort: clamp toward zone center, nudged out of obstacles
  let x = zone.x + zone.width / 2;
  let y = zone.y + zone.height / 2;
  for (let step = 0; step < 10 && pointInObstacle(x, y, arena.obstacles); step++) {
    x += (arena.worldWidth / 2 - x) * 0.15;
    y += (arena.worldHeight / 2 - y) * 0.15;
  }
  return { x, y };
}
