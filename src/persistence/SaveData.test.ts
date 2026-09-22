/**
 * Save serialization: defaults, roundtrip, migration, corruption recovery.
 * Runs in node — provides a minimal localStorage stub.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Minimal localStorage stub for node environment
const store = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, String(v)),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: (i: number) => [...store.keys()][i] ?? null,
  get length() { return store.size; },
});

const SAVE_KEY = 'blood-pixel-save';
const RECOVERY_KEY = 'blood-pixel-save-recovery';

async function freshSaveSystem() {
  vi.resetModules();
  const mod = await import('./SaveData');
  return new mod.SaveSystem();
}

beforeEach(() => {
  store.clear();
});

describe('SaveSystem', () => {
  it('returns defaults when storage is empty', async () => {
    const sys = await freshSaveSystem();
    expect(sys.save.version).toBe(2);
    expect(sys.save.xp).toBe(0);
    expect(sys.save.level).toBe(1);
    expect(sys.save.completedMissions).toEqual([]);
    expect(sys.save.highestUnlocked).toBe(1);
    expect(sys.save.unlockedWeapons).toEqual(['pistol']);
    expect(sys.save.milestoneAmmoPct).toBe(0);
    expect(sys.save.achievements).toEqual([]);
    expect(sys.storageAvailable).toBe(true);
  });

  it('commit → reload roundtrips runtime changes', async () => {
    const sys = await freshSaveSystem();
    sys.save.xp = 300;
    sys.save.level = 3;
    sys.save.completedMissions.push(1, 2);
    sys.save.highestUnlocked = 3;
    sys.save.unlockedWeapons.push('shotgun');
    sys.save.upgradeRanks.fireRate = 2;
    sys.save.milestoneAmmoPct = 0.1;
    sys.save.settings.crtEnabled = false;
    sys.save.stats.totalKills = 42;
    sys.commit();

    const reloaded = await freshSaveSystem();
    expect(reloaded.save.xp).toBe(300);
    expect(reloaded.save.level).toBe(3);
    expect(reloaded.save.completedMissions).toEqual([1, 2]);
    expect(reloaded.save.highestUnlocked).toBe(3);
    expect(reloaded.save.unlockedWeapons).toEqual(['pistol', 'shotgun']);
    expect(reloaded.save.upgradeRanks.fireRate).toBe(2);
    expect(reloaded.save.milestoneAmmoPct).toBeCloseTo(0.1, 5);
    expect(reloaded.save.settings.crtEnabled).toBe(false);
    expect(reloaded.save.stats.totalKills).toBe(42);
  });

  it('migrates partial/legacy payloads, filling missing fields with defaults', async () => {
    store.set(SAVE_KEY, JSON.stringify({
      xp: 120,
      completedMissions: [1],
      upgradeRanks: { damage: 3 },
      // no settings, no stats, no milestones
    }));
    const sys = await freshSaveSystem();
    expect(sys.save.xp).toBe(120);
    expect(sys.save.completedMissions).toEqual([1]);
    expect(sys.save.upgradeRanks.damage).toBe(3);
    expect(sys.save.upgradeRanks.fireRate).toBe(0); // default preserved
    expect(sys.save.settings.crtEnabled).toBe(true); // default filled
    expect(sys.save.stats.totalKills).toBe(0);
    expect(sys.save.achievements).toEqual([]); // v2 field defaulted on migration
    expect(sys.save.version).toBe(2);
  });

  it('roundtrips unlocked achievements', async () => {
    const sys = await freshSaveSystem();
    sys.save.achievements.push('first_blood', 'centurion');
    sys.commit();
    const reloaded = await freshSaveSystem();
    expect(reloaded.save.achievements).toEqual(['first_blood', 'centurion']);
  });

  it('recovers from corrupt JSON: fresh save + recovery key', async () => {
    store.set(SAVE_KEY, '{not valid json!!');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const sys = await freshSaveSystem();
    expect(sys.save.xp).toBe(0);
    expect(store.get(RECOVERY_KEY)).toBe('{not valid json!!');
    warn.mockRestore();
  });

  it('reset(true) clears progress but keeps settings', async () => {
    const sys = await freshSaveSystem();
    sys.save.xp = 999;
    sys.save.completedMissions.push(1);
    sys.save.settings.masterVolume = 30;
    sys.commit();

    sys.reset(true);
    expect(sys.save.xp).toBe(0);
    expect(sys.save.completedMissions).toEqual([]);
    expect(sys.save.settings.masterVolume).toBe(30);
    expect(sys.save.highestUnlocked).toBe(1);
  });

  it('reset(false) restores default settings too', async () => {
    const sys = await freshSaveSystem();
    sys.save.settings.masterVolume = 30;
    sys.reset(false);
    expect(sys.save.settings.masterVolume).toBe(70);
  });
});
