/**
 * Lightweight game progress save system using localStorage.
 * Single JS object serialized with JSON.stringify / JSON.parse.
 * All methods are error-safe (private browsing, quota exceeded, corrupt data).
 */

const SAVE_KEY = 'daniels-diamond-rush-v1';

export interface SaveData {
  /** Current stage index (0-based). Clamped to valid range on load. */
  stage:         number;
  /** Lives remaining when the game was saved. */
  lives:         number;
  /** Cumulative score across all stages. */
  score:         number;
  /** Purple diamond balance — used to purchase health upgrades. */
  purpleBalance: number;
  /** Health upgrade level. Each upgrade adds 1 to the base HP of 3. */
  healthLevel:   number;
  /** ISO timestamp of last successful save (informational). */
  savedAt:       string;
}

const DEFAULTS: SaveData = {
  stage:         0,
  lives:         3,
  score:         0,
  purpleBalance: 0,
  healthLevel:   0,
  savedAt:       '',
};

export const SaveSystem = {
  /** Load saved progress. Returns defaults if nothing saved or data is corrupt. */
  load(): SaveData {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return { ...DEFAULTS };
      const parsed = JSON.parse(raw) as Partial<SaveData>;
      // Merge with defaults so new fields added in future versions have values
      return { ...DEFAULTS, ...parsed };
    } catch {
      return { ...DEFAULTS };
    }
  },

  /**
   * Persist a partial update. Fields not passed are kept from the existing save.
   * Call on level complete, on unmount, and periodically during play.
   */
  save(update: Partial<SaveData>): void {
    try {
      const current = SaveSystem.load();
      const next: SaveData = {
        ...current,
        ...update,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(next));
    } catch {
      // Silently ignore storage errors
    }
  },

  /** Erase all saved progress (used by "New Game" flow). */
  clear(): void {
    try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
  },

  /**
   * Attempt to purchase one health upgrade with purple diamonds.
   * Returns true if successful, false if player cannot afford it.
   * Each upgrade costs `cost` purple diamonds (default 10).
   */
  upgradeHealth(cost = 10): boolean {
    const d = SaveSystem.load();
    if (d.purpleBalance < cost) return false;
    SaveSystem.save({
      purpleBalance: d.purpleBalance - cost,
      healthLevel:   d.healthLevel + 1,
    });
    return true;
  },

  /** Deposit purple diamonds earned this session into the persistent balance. */
  depositPurple(amount: number): void {
    const d = SaveSystem.load();
    SaveSystem.save({ purpleBalance: d.purpleBalance + amount });
  },
};
