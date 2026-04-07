/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../utils/EventBus', () => ({
  EventBus: {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    removeAllListeners: vi.fn(),
  },
}));

import { DailyChallengeSystem } from '../DailyChallengeSystem';

class MockRemoteConfigSystem {
  private config: Map<string, any> = new Map();

  getBoolean(key: string, defaultValue = false): boolean {
    return this.config.has(key) ? this.config.get(key) : defaultValue;
  }

  setOverride(key: string, value: any): void {
    this.config.set(key, value);
  }

  clearOverrides(): void {
    this.config.clear();
  }
}

describe('DailyChallengeSystem', () => {
  let system: DailyChallengeSystem;
  let remoteConfig: MockRemoteConfigSystem;

  beforeEach(() => {
    localStorage.clear();
    remoteConfig = new MockRemoteConfigSystem();
    system = new DailyChallengeSystem(remoteConfig as any);
  });

  it('generates deterministic seed from date', () => {
    const date = new Date('2026-04-07');
    const seed1 = system.generate(date);
    const seed2 = system.generate(date);
    expect(seed1).toBe(seed2);
  });

  it('returns same seed for same date string', () => {
    const date1 = new Date('2026-04-07T10:00:00Z');
    const date2 = new Date('2026-04-07T20:00:00Z');
    const seed1 = system.generate(date1);
    const seed2 = system.generate(date2);
    expect(seed1).toBe(seed2);
  });

  it('returns different seed for different date', () => {
    const date1 = new Date('2026-04-07');
    const date2 = new Date('2026-04-08');
    const seed1 = system.generate(date1);
    const seed2 = system.generate(date2);
    expect(seed1).not.toBe(seed2);
  });

  it('generates challenge params from seed', () => {
    const seed = 12345;
    const params = system.generateChallenge(seed);
    expect(params.platformCount).toBeGreaterThanOrEqual(20);
    expect(params.platformCount).toBeLessThanOrEqual(29);
    expect(params.enemyCount).toBeGreaterThanOrEqual(5);
    expect(params.enemyCount).toBeLessThanOrEqual(14);
    expect(params.coinMultiplier).toBeGreaterThanOrEqual(1.0);
    expect(params.coinMultiplier).toBeLessThanOrEqual(1.5);
  });

  it('generates consistent params for same seed', () => {
    const seed = 99999;
    const params1 = system.generateChallenge(seed);
    const params2 = system.generateChallenge(seed);
    expect(params1.platformCount).toBe(params2.platformCount);
    expect(params1.enemyCount).toBe(params2.enemyCount);
    expect(params1.coinMultiplier).toBe(params2.coinMultiplier);
  });

  it('returns not available when disabled', () => {
    remoteConfig.setOverride('daily_challenge_enabled', false);
    const result = system.check();
    expect(result.available).toBe(false);
    expect(result.completed).toBe(false);
    expect(result.challenge).toBeNull();
  });

  it('returns not available when no challenge loaded', () => {
    system.clearStorage();
    const result = system.check();
    expect(result.available).toBe(false);
  });

  it('isChallengeAvailable returns false when disabled', () => {
    remoteConfig.setOverride('daily_challenge_enabled', false);
    expect(system.isChallengeAvailable()).toBe(false);
  });

  it('isCompletedToday returns false when no submission', () => {
    system.clearStorage();
    expect(system.isCompletedToday()).toBe(false);
  });

  it('getCurrentChallenge returns null when not loaded', () => {
    system.clearStorage();
    expect(system.getCurrentChallenge()).toBeNull();
  });

  it('stores and loads challenge from storage', () => {
    const mockChallenge = {
      id: 'test_123',
      date: '2026-04-07',
      seed: 54321,
      active: true,
    };
    system.setChallenge(mockChallenge);
    const loaded = system.getCurrentChallenge();
    expect(loaded).toEqual(mockChallenge);
  });

  it('clearStorage resets all state', () => {
    const mockChallenge = {
      id: 'test_123',
      date: '2026-04-07',
      seed: 54321,
      active: true,
    };
    system.setChallenge(mockChallenge);
    system.clearStorage();
    expect(system.getCurrentChallenge()).toBeNull();
    expect(system.isCompletedToday()).toBe(false);
  });

  it('submit queues when backend unavailable', async () => {
    const today = new Date().toISOString().split('T')[0];
    const mockChallenge = {
      id: 'test_123',
      date: today,
      seed: 54321,
      active: true,
    };
    system.setChallenge(mockChallenge);
    await system.submit(100, 10, 5, '[]');
    const result = system.check();
    expect(result.completed).toBe(true);
    expect(result.personalBest).toBe(100);
  });

  it('getLeaderboard returns empty array when backend unavailable', async () => {
    const mockChallenge = {
      id: 'test_123',
      date: '2026-04-07',
      seed: 54321,
      active: true,
    };
    system.setChallenge(mockChallenge);
    const leaderboard = await system.getLeaderboard(100);
    expect(leaderboard).toEqual([]);
  });

  it('getPersonalBest returns null when backend unavailable', async () => {
    const mockChallenge = {
      id: 'test_123',
      date: '2026-04-07',
      seed: 54321,
      active: true,
    };
    system.setChallenge(mockChallenge);
    const pb = await system.getPersonalBest();
    expect(pb).toBeNull();
  });

  it('isEnabled respects remote config', () => {
    remoteConfig.setOverride('daily_challenge_enabled', true);
    expect(system.isEnabled()).toBe(true);

    remoteConfig.setOverride('daily_challenge_enabled', false);
    expect(system.isEnabled()).toBe(false);
  });

  it('destroy clears references', () => {
    system.destroy();
    expect((system as any).backend).toBeNull();
    expect((system as any).remoteConfig).toBeNull();
  });
});
