/**
 * Zombie roster invariants — Phase 4 content tests.
 */

import { describe, it, expect } from 'vitest';
import { ZOMBIES, type ZombieType } from './zombies';

const ALL_TYPES = Object.keys(ZOMBIES) as ZombieType[];

describe('zombie roster', () => {
  it('defines the full Phase 4 roster', () => {
    expect(ALL_TYPES).toEqual(
      expect.arrayContaining([
        'walker',
        'runner',
        'brute',
        'spitter',
        'crawler',
        'armored',
        'exploder',
        'abomination',
      ]),
    );
  });

  it('has sane core stats for every type', () => {
    for (const type of ALL_TYPES) {
      const z = ZOMBIES[type];
      expect(z.type).toBe(type);
      expect(z.hp).toBeGreaterThan(0);
      expect(z.speed).toBeGreaterThan(0);
      expect(z.collisionRadius).toBeGreaterThan(0);
      expect(z.xpReward).toBeGreaterThan(0);
      expect(z.attackCooldownSec).toBeGreaterThan(0);
    }
  });

  it('armored ignores a meaningful fraction of damage, but not everything', () => {
    expect(ZOMBIES.armored.armor).toBeGreaterThan(0.25);
    expect(ZOMBIES.armored.armor).toBeLessThan(0.75);
    expect(ZOMBIES.armored.hp).toBeGreaterThan(ZOMBIES.brute.hp * 0.5);
  });

  it('exploder has a blast but no melee damage', () => {
    expect(ZOMBIES.exploder.explodeRadius).toBeGreaterThan(0);
    expect(ZOMBIES.exploder.explodeDamage).toBeGreaterThan(0);
    expect(ZOMBIES.exploder.damage).toBe(0);
  });

  it('crawler is the fastest, weakest swarm unit', () => {
    for (const type of ALL_TYPES) {
      if (type === 'crawler') continue;
      expect(ZOMBIES.crawler.speed).toBeGreaterThan(ZOMBIES[type].speed);
      expect(ZOMBIES.crawler.hp).toBeLessThan(ZOMBIES[type].hp);
    }
  });

  it('the abomination is the only boss and is the toughest', () => {
    const bosses = ALL_TYPES.filter((t) => ZOMBIES[t].boss);
    expect(bosses).toEqual(['abomination']);
    for (const type of ALL_TYPES) {
      if (type === 'abomination') continue;
      expect(ZOMBIES.abomination.hp).toBeGreaterThan(ZOMBIES[type].hp * 5);
    }
    expect(ZOMBIES.abomination.summonIntervalSec).toBeGreaterThan(0);
    expect(ZOMBIES.abomination.summonType).toBe('crawler');
    expect(ZOMBIES.abomination.summonCount).toBeGreaterThan(0);
  });
});
