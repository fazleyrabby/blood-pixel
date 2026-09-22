/**
 * Balance validation — Phase 4.
 *
 * Mechanically checks the campaign's difficulty curve:
 *  - authored threat rating + reward XP escalate
 *  - must-clear missions (kill / eliminate) require steadily more HP
 *  - survive missions escalate their threat *rate*
 *  - the finale is the boss and the heaviest mission overall
 */

import { describe, it, expect } from 'vitest';
import { MISSIONS, type MissionDef, type MissionWave } from './missions';
import { ZOMBIES } from './zombies';
import { WEAPONS } from './weapons';
import { XP_TABLE, MAX_LEVEL } from './progression';

type WeaponId = keyof typeof WEAPONS;

/** Estimated enemies a wave produces. */
function waveSpawns(w: MissionWave): number {
  if (w.totalSpawns !== undefined) return w.totalSpawns;
  if (w.durationSeconds !== undefined) {
    return Math.ceil((w.durationSeconds * 1000) / w.spawnIntervalMs) * w.burstSize;
  }
  return 0;
}

/** Weighted average HP of a wave's zombie mix. */
function waveAvgHp(w: MissionWave): number {
  const total = w.zombieTypes.reduce((s, t) => s + t.weight, 0) || 1;
  return w.zombieTypes.reduce((s, t) => s + (t.weight / total) * ZOMBIES[t.type].hp, 0);
}

/** Total HP spawned across the mission (all waves). */
export function totalPressure(m: MissionDef): number {
  let hp = 0;
  for (const w of m.waves) {
    hp += waveSpawns(w) * waveAvgHp(w) * m.healthMultiplier * (w.healthMultiplier ?? 1);
  }
  return Math.round(hp);
}

/** HP the player is *required* to destroy (kill / eliminate / boss). */
export function requiredHp(m: MissionDef): number {
  const obj = m.objective;
  if (obj.type === 'kill') {
    // average HP across the whole mission, times the required kill count
    let hp = 0;
    let weight = 0;
    for (const w of m.waves) {
      const spawns = waveSpawns(w);
      hp += spawns * waveAvgHp(w) * m.healthMultiplier * (w.healthMultiplier ?? 1);
      weight += spawns;
    }
    const avg = weight > 0 ? hp / weight : 0;
    return Math.round(obj.target * avg);
  }
  if (obj.type === 'eliminate') return totalPressure(m);
  if (obj.type === 'boss') {
    const bossWave = m.waves.find((w) => w.zombieTypes.some((t) => ZOMBIES[t.type].boss));
    if (!bossWave) return 0;
    const bossHp = bossWave.zombieTypes.reduce((s, t) => s + ZOMBIES[t.type].hp * t.weight, 0);
    return Math.round(bossHp * m.healthMultiplier * (bossWave.healthMultiplier ?? 1));
  }
  return 0;
}

/** HP spawned per second — how hard a survive mission pushes. */
export function threatRate(m: MissionDef): number {
  let rate = 0;
  for (const w of m.waves) {
    const spawns = waveSpawns(w);
    const dur = w.durationSeconds
      ?? (w.totalSpawns !== undefined
        ? Math.max(1, (w.totalSpawns / w.burstSize) * (w.spawnIntervalMs / 1000))
        : 1);
    rate += (spawns * waveAvgHp(w) * m.healthMultiplier * (w.healthMultiplier ?? 1)) / dur;
  }
  return Math.round(rate);
}

function dps(id: WeaponId): number {
  const w = WEAPONS[id];
  return (w.damage * (w.pellets ?? 1)) / (w.fireIntervalMs / 1000);
}

describe('authored difficulty curve', () => {
  it('threat rating never decreases across the campaign', () => {
    for (let i = 1; i < MISSIONS.length; i++) {
      expect(
        MISSIONS[i].threatRating,
        `mission ${MISSIONS[i].id} threat ${MISSIONS[i].threatRating} < mission ${MISSIONS[i - 1].id} ${MISSIONS[i - 1].threatRating}`,
      ).toBeGreaterThanOrEqual(MISSIONS[i - 1].threatRating);
    }
  });

  it('reward XP escalates (the finale awards none — it ends the campaign)', () => {
    for (let i = 1; i < MISSIONS.length - 1; i++) {
      expect(MISSIONS[i].rewardXP).toBeGreaterThanOrEqual(MISSIONS[i - 1].rewardXP);
    }
    expect(MISSIONS[MISSIONS.length - 1].rewardXP).toBe(0);
  });
});

describe('must-clear missions (kill / eliminate)', () => {
  const clear = MISSIONS.filter(
    (m) => m.objective.type === 'kill' || m.objective.type === 'eliminate',
  );

  it('required HP rises monotonically', () => {
    for (let i = 1; i < clear.length; i++) {
      const prev = requiredHp(clear[i - 1]);
      const cur = requiredHp(clear[i]);
      expect(
        cur,
        `mission ${clear[i].id} (${cur}) < mission ${clear[i - 1].id} (${prev})`,
      ).toBeGreaterThanOrEqual(prev);
    }
  });

  it('is clearable with a mid-tier weapon inside a generous budget', () => {
    const smg = dps('smg');
    for (const m of clear) {
      expect(requiredHp(m) / smg).toBeLessThan(1800);
    }
  });
});

describe('survive missions', () => {
  const survive = MISSIONS.filter((m) => m.objective.type === 'survive');

  it('threat rate rises monotonically', () => {
    for (let i = 1; i < survive.length; i++) {
      const prev = threatRate(survive[i - 1]);
      const cur = threatRate(survive[i]);
      expect(
        cur,
        `mission ${survive[i].id} rate ${cur} < mission ${survive[i - 1].id} rate ${prev}`,
      ).toBeGreaterThanOrEqual(prev);
    }
  });
});

describe('finale', () => {
  it('is the only boss mission and the heaviest overall', () => {
    const finale = MISSIONS[MISSIONS.length - 1];
    expect(finale.objective.type).toBe('boss');
    const bosses = MISSIONS.flatMap((m) =>
      m.waves.flatMap((w) => w.zombieTypes.filter((t) => ZOMBIES[t.type].boss).map(() => m.id)),
    );
    expect(new Set(bosses)).toEqual(new Set([finale.id]));

    const pressures = MISSIONS.map(totalPressure);
    expect(pressures[pressures.length - 1]).toBe(Math.max(...pressures));
  });
});

describe('weapon balance', () => {
  it('shotgun owns the highest burst but pays for it with range', () => {
    const burst = (id: WeaponId) => WEAPONS[id].damage * (WEAPONS[id].pellets ?? 1);
    const others: WeaponId[] = ['pistol', 'smg', 'rifle'];
    for (const id of others) expect(burst('shotgun')).toBeGreaterThan(burst(id));
    // At max range the shotgun has fallen off to 50% damage
    const shotgunAtRange = (burst('shotgun') * 0.5) / (WEAPONS.shotgun.fireIntervalMs / 1000);
    expect(dps('smg')).toBeGreaterThan(shotgunAtRange);
  });

  it('smg owns sustained automatic damage', () => {
    expect(WEAPONS.smg.automatic).toBe(true);
    expect(dps('smg')).toBeGreaterThan(dps('pistol'));
    expect(dps('smg')).toBeGreaterThan(dps('rifle'));
  });

  it('rifle owns range and piercing', () => {
    expect(WEAPONS.rifle.pierce ?? 0).toBeGreaterThan(0);
    for (const id of ['pistol', 'smg', 'shotgun'] as WeaponId[]) {
      expect(WEAPONS.rifle.rangeUnits).toBeGreaterThanOrEqual(WEAPONS[id].rangeUnits);
    }
    expect(WEAPONS.rifle.damage).toBeGreaterThan(WEAPONS.smg.damage);
  });

  it('every weapon kicks and has a finite magazine', () => {
    for (const w of Object.values(WEAPONS)) {
      expect(w.recoilKick).toBeGreaterThan(0);
      expect(w.magazineSize).toBeGreaterThan(0);
      expect(w.reserveAmmo).toBeGreaterThanOrEqual(w.magazineSize);
    }
  });
});

describe('progression pacing', () => {
  it('reaches max level across a full campaign of first-time rewards', () => {
    const total = MISSIONS.reduce((s, m) => s + m.rewardXP, 0);
    expect(total).toBeGreaterThanOrEqual(XP_TABLE[MAX_LEVEL - 1]);
  });

  it('does not max out in the first third of the campaign', () => {
    const third = MISSIONS.slice(0, 5).reduce((s, m) => s + m.rewardXP, 0);
    expect(third).toBeLessThan(XP_TABLE[MAX_LEVEL - 1]);
  });
});
