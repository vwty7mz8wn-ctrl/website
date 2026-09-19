const SAVE_KEY = 'snake.save.v1';

const safeNumber = value => {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) && number >= 0 ? number : 0;
};

const defaults = () => ({
  version: 1,
  profile: { discoveredSkins: ['default'], ownedSkins: ['default'], selectedSkinId: 'default', discoveries: [], achievements: [] },
  stats: { normalBestScore: 0, assistedBestScore: 0, cheatBestScore: 0, totalRuns: 0, totalScore: 0 },
  world: { discoveredMaps: ['normal'], discoveries: [] },
  settings: { difficulty: 'normal', soundEnabled: true }
});

export class SaveService {
  constructor(adapter) { this.adapter = adapter; this.save = null; }

  load() {
    const stored = this.adapter.get(SAVE_KEY);
    this.save = stored?.version === 1 ? this.normalise(stored) : this.migrateLegacy();
    this.persist();
    return this.save;
  }

  normalise(value) {
    const base = defaults();
    return {
      ...base,
      ...value,
      profile: { ...base.profile, ...(value.profile ?? {}) },
      stats: { ...base.stats, ...(value.stats ?? {}) },
      world: { ...base.world, ...(value.world ?? {}) },
      settings: { ...base.settings, ...(value.settings ?? {}) }
    };
  }

  migrateLegacy() {
    const base = defaults();
    const number = key => safeNumber(this.adapter.raw(key));
    const skins = this.adapter.get('snake.unlockedSkins', this.adapter.get('unlockedSkins', ['default']));
    const selected = this.adapter.get('snake.selectedSkin', this.adapter.get('selectedSkin', 'default'));
    const hasOutside = this.adapter.raw('snake.outsideDiscovered') === 'true' || this.adapter.raw('outsideDiscovered') === 'true';
    const owned = Array.isArray(skins) ? [...new Set(['default', ...skins.filter(id => typeof id === 'string')])] : ['default'];
    return this.normalise({
      profile: { discoveredSkins: owned, ownedSkins: owned, selectedSkinId: owned.includes(selected) ? selected : 'default', discoveries: hasOutside ? ['outside-discovered'] : [] },
      stats: { normalBestScore: Math.max(number('snake.normalBestScore'), number('normalBestScore'), number('eluney-snake-best'), number('bestScore')), cheatBestScore: Math.max(number('snake.cheatBestScore'), number('cheatBestScore')) },
      world: { discoveredMaps: hasOutside ? ['normal', 'outside'] : ['normal'], discoveries: hasOutside ? ['outside-discovered'] : [] }
    });
  }

  persist() { return this.adapter.set(SAVE_KEY, this.save); }
  update(callback) { callback(this.save); this.persist(); return this.save; }
  snapshot() { return structuredClone(this.save); }
}
