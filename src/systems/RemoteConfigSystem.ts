import { ISystem } from '../interfaces/ISystem';
import { IBackendService, IRemoteConfigValue } from '../interfaces/IBackendService';

const CONFIG_STORAGE_KEY = 'turbohop_remote_config';
const CONFIG_DEFAULTS: Record<string, unknown> = {
  daily_challenge_enabled: true,
  ghost_racing_enabled: true,
  leaderboard_enabled: true,
  analytics_enabled: true,
  max_daily_streak_bonus: 7,
  coin_multiplier: 1.0,
  score_multiplier: 1.0,
  enemy_speed_multiplier: 1.0,
  platform_spawn_rate: 1.0,
  powerup_spawn_rate: 0.3,
  tutorial_enabled: true,
  shop_enabled: true,
  upgrade_enabled: true,
  mission_enabled: true,
};

interface CachedConfig {
  values: Record<string, unknown>;
  fetchedAt: number;
}

export class RemoteConfigSystem implements ISystem {
  private backend: IBackendService | null = null;
  private configCache: Map<string, IRemoteConfigValue> = new Map();
  private fetchPromise: Promise<void> | null = null;
  private isFetching = false;

  constructor() {
    this.loadDefaults();
    this.loadFromStorage();
  }

  setBackend(backend: IBackendService): void {
    this.backend = backend;
  }

  private loadDefaults(): void {
    Object.entries(CONFIG_DEFAULTS).forEach(([key, defaultValue]) => {
      this.configCache.set(key, {
        value: defaultValue,
        source: 'default',
      });
    });
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (stored) {
        const cached: CachedConfig = JSON.parse(stored);
        const now = Date.now();
        const age = now - cached.fetchedAt;
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours

        if (age < maxAge) {
          Object.entries(cached.values).forEach(([key, value]) => {
            this.configCache.set(key, {
              value,
              source: 'remote',
              fetchedAt: cached.fetchedAt,
            });
          });
        } else {
          localStorage.removeItem(CONFIG_STORAGE_KEY);
        }
      }
    } catch {
      localStorage.removeItem(CONFIG_STORAGE_KEY);
    }
  }

  private saveToStorage(): void {
    try {
      const values: Record<string, unknown> = {};
      this.configCache.forEach((entry, key) => {
        if (entry.source === 'remote') {
          values[key] = entry.value;
        }
      });

      const cached: CachedConfig = {
        values,
        fetchedAt: Date.now(),
      };

      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(cached));
    } catch {
      // Storage unavailable, continue without caching
    }
  }

  async fetch(): Promise<void> {
    if (this.isFetching || !this.backend || !this.backend.isReady()) return;

    if (this.fetchPromise) return this.fetchPromise;

    this.isFetching = true;
    const backend = this.backend;
    this.fetchPromise = (async () => {
      try {
        await backend.fetchRemoteConfig();
        this.saveToStorage();
      } catch (_error) {
        // Use cached defaults on error
      } finally {
        this.isFetching = false;
        this.fetchPromise = null;
      }
    })();

    return this.fetchPromise;
  }

  getBoolean(key: string, defaultValue = false): boolean {
    const entry = this.configCache.get(key);
    if (entry === undefined) return defaultValue;
    return Boolean(entry.value);
  }

  getNumber(key: string, defaultValue = 0): number {
    const entry = this.configCache.get(key);
    if (entry === undefined) return defaultValue;
    const num = Number(entry.value);
    return isNaN(num) ? defaultValue : num;
  }

  getString(key: string, defaultValue = ''): string {
    const entry = this.configCache.get(key);
    if (entry === undefined) return defaultValue;
    return String(entry.value);
  }

  getValue(key: string, defaultValue: unknown): IRemoteConfigValue {
    const entry = this.configCache.get(key);
    if (entry === undefined) {
      return {
        value: defaultValue,
        source: 'default',
      };
    }
    return entry;
  }

  isEnabled(feature: string): boolean {
    return this.getBoolean(`${feature}_enabled`, true);
  }

  update(_delta: number): void {
    // No per-frame updates needed
  }

  destroy(): void {
    this.backend = null;
    this.configCache.clear();
  }

  // Test helpers
  setOverride(key: string, value: unknown): void {
    this.configCache.set(key, {
      value,
      source: 'remote',
      fetchedAt: Date.now(),
    });
  }

  clearOverrides(): void {
    this.loadDefaults();
    localStorage.removeItem(CONFIG_STORAGE_KEY);
  }

  getAllConfig(): Record<string, IRemoteConfigValue> {
    const result: Record<string, IRemoteConfigValue> = {};
    this.configCache.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
}
