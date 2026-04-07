import { ISystem } from '../interfaces/ISystem';
import { EventBus } from '../utils/EventBus';
import { IBackendService, IDailyChallenge } from '../interfaces/IBackendService';
import { RemoteConfigSystem } from './RemoteConfigSystem';

const DAILY_CHALLENGE_STORAGE_KEY = 'turbohop_daily_challenge';
const SUBMISSION_STORAGE_KEY = 'turbohop_daily_submission';

export interface DailyChallengeResult {
  available: boolean;
  completed: boolean;
  challenge: IDailyChallenge | null;
  personalBest: number | null;
  rank: number | null;
}

export interface ChallengeParams {
  platformCount: number;
  enemyCount: number;
  coinMultiplier: number;
}

export class DailyChallengeSystem implements ISystem {
  private backend: IBackendService | null = null;
  private remoteConfig: RemoteConfigSystem | null = null;
  private currentChallenge: IDailyChallenge | null = null;
  private isCompleted = false;
  private submissionQueued = false;

  constructor(remoteConfig: RemoteConfigSystem) {
    this.remoteConfig = remoteConfig;
    this.loadFromStorage();
  }

  setBackend(backend: IBackendService): void {
    this.backend = backend;
  }

  isEnabled(): boolean {
    return this.remoteConfig?.getBoolean('daily_challenge_enabled', true) ?? true;
  }

  generate(date: Date): number {
    const dateStr = date.toISOString().split('T')[0];
    let hash = 0;
    for (let i = 0; i < dateStr.length; i++) {
      const char = dateStr.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  generateChallenge(seed: number): ChallengeParams {
    const rng = this.seededRandom(seed);
    return {
      platformCount: 20 + Math.floor(rng() * 10),
      enemyCount: 5 + Math.floor(rng() * 10),
      coinMultiplier: 1.0 + rng() * 0.5,
    };
  }

  private seededRandom(seed: number): () => number {
    return () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }

  async fetch(): Promise<IDailyChallenge | null> {
    if (!this.isEnabled()) {
      return null;
    }

    try {
      if (this.backend && this.backend.isReady() && this.backend.isHealthy()) {
        const challenge = await this.backend.getDailyChallenge();
        if (challenge) {
          this.currentChallenge = challenge;
          this.saveToStorage();
          return challenge;
        }
      }

      const cached = this.loadFromStorage();
      if (cached) {
        return cached;
      }

      const fallback = this.generateFallbackChallenge();
      this.currentChallenge = fallback;
      this.saveToStorage();
      return fallback;
    } catch (_error) {
      const cached = this.loadFromStorage();
      if (cached) {
        return cached;
      }
      const fallback = this.generateFallbackChallenge();
      this.currentChallenge = fallback;
      this.saveToStorage();
      return fallback;
    }
  }

  private generateFallbackChallenge(): IDailyChallenge {
    const today = new Date();
    const seed = this.generate(today);
    return {
      id: 'fallback_' + today.toISOString().split('T')[0],
      date: today.toISOString().split('T')[0],
      seed,
      active: true,
    };
  }

  check(): DailyChallengeResult {
    if (!this.isEnabled()) {
      return {
        available: false,
        completed: false,
        challenge: null,
        personalBest: null,
        rank: null,
      };
    }

    const today = this.getDateString();
    const challengeDate = this.currentChallenge?.date;

    if (!this.currentChallenge || challengeDate !== today) {
      return {
        available: false,
        completed: false,
        challenge: null,
        personalBest: null,
        rank: null,
      };
    }

    const submission = this.loadSubmission();
    if (submission) {
      return {
        available: true,
        completed: true,
        challenge: this.currentChallenge,
        personalBest: submission.score,
        rank: submission.rank ?? null,
      };
    }

    return {
      available: true,
      completed: false,
      challenge: this.currentChallenge,
      personalBest: null,
      rank: null,
    };
  }

  async submit(score: number, coins: number, stomps: number, replayInput: string): Promise<void> {
    if (!this.currentChallenge) {
      return;
    }

    this.saveSubmission({ score, rank: null });

    if (!this.backend) {
      this.isCompleted = true;
      EventBus.emit('daily:submitted', {
        score,
        challengeId: this.currentChallenge.id,
      });
      return;
    }

    try {
      await this.backend.submitScore({
        score,
        coins,
        stomps,
        seed: this.currentChallenge.seed,
        replayInput,
        timestamp: Date.now(),
        dailyChallenge: true,
        challengeId: this.currentChallenge.id,
      });

      this.isCompleted = true;
      EventBus.emit('daily:submitted', {
        score,
        challengeId: this.currentChallenge.id,
      });
    } catch (_error) {
      this.submissionQueued = true;
    }
  }

  async getPersonalBest(): Promise<{ score: number; rank: number } | null> {
    if (!this.currentChallenge || !this.backend) {
      return null;
    }

    try {
      const pb = await this.backend.getPersonalBest(this.currentChallenge.id);
      if (pb) {
        return {
          score: pb.score,
          rank: pb.rank ?? 0,
        };
      }
      return null;
    } catch (_error) {
      return null;
    }
  }

  async getLeaderboard(limit = 100) {
    if (!this.currentChallenge || !this.backend) {
      return [];
    }

    try {
      return await this.backend.getLeaderboard(this.currentChallenge.id, limit);
    } catch (_error) {
      return [];
    }
  }

  isChallengeAvailable(): boolean {
    if (!this.isEnabled() || !this.currentChallenge) {
      return false;
    }
    const today = this.getDateString();
    return this.currentChallenge.date === today && this.currentChallenge.active;
  }

  isCompletedToday(): boolean {
    if (!this.currentChallenge) {
      return false;
    }
    const submission = this.loadSubmission();
    return !!submission;
  }

  getCurrentChallenge(): IDailyChallenge | null {
    return this.currentChallenge;
  }

  private getDateString(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private saveToStorage(): void {
    if (!this.currentChallenge) return;
    try {
      localStorage.setItem(DAILY_CHALLENGE_STORAGE_KEY, JSON.stringify(this.currentChallenge));
    } catch {
      // Storage unavailable
    }
  }

  private loadFromStorage(): IDailyChallenge | null {
    try {
      const stored = localStorage.getItem(DAILY_CHALLENGE_STORAGE_KEY);
      if (stored) {
        const cached = JSON.parse(stored) as IDailyChallenge;
        const cachedDate = cached.date;
        const today = this.getDateString();
        if (cachedDate === today) {
          this.currentChallenge = cached;
          return cached;
        }
      }
    } catch {
      // Invalid data
    }
    return null;
  }

  private saveSubmission(data: { score: number; rank: number | null }): void {
    try {
      localStorage.setItem(SUBMISSION_STORAGE_KEY, JSON.stringify({
        ...data,
        date: this.getDateString(),
      }));
    } catch {
      // Storage unavailable
    }
  }

  private loadSubmission(): { score: number; rank: number | null } | null {
    try {
      const stored = localStorage.getItem(SUBMISSION_STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        const today = this.getDateString();
        if (data.date === today) {
          return { score: data.score, rank: data.rank };
        }
      }
    } catch {
      // Invalid data
    }
    return null;
  }

  update(_delta: number): void {
    // No per-frame updates
  }

  destroy(): void {
    this.backend = null;
    this.remoteConfig = null;
  }

  // Test helpers
  clearStorage(): void {
    localStorage.removeItem(DAILY_CHALLENGE_STORAGE_KEY);
    localStorage.removeItem(SUBMISSION_STORAGE_KEY);
    this.currentChallenge = null;
    this.isCompleted = false;
  }

  setChallenge(challenge: IDailyChallenge): void {
    this.currentChallenge = challenge;
    this.saveToStorage();
  }
}
