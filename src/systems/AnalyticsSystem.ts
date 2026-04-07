import { ISystem } from '../interfaces/ISystem';
import { EventBus } from '../utils/EventBus';
import { IBackendService, IAnalyticsEvent } from '../interfaces/IBackendService';

const ANALYTICS_STORAGE_KEY = 'turbohop_analytics_queue';
const MAX_QUEUE_SIZE = 50;
const FLUSH_INTERVAL_MS = 30000;
const MAX_RETRIES = 3;

export class AnalyticsSystem implements ISystem {
  private eventQueue: IAnalyticsEvent[] = [];
  private backend: IBackendService | null = null;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private isFlushing = false;
  private retryCount = 0;
  private enabled = true;

  constructor() {
    this.loadQueuedEvents();
    this.setupEventListeners();
  }

  setBackend(backend: IBackendService): void {
    this.backend = backend;
    this.startFlushTimer();
  }

  private setupEventListeners(): void {
    EventBus.on('game:start', this.onGameStart);
    EventBus.on('game:end', this.onGameEnd);
    EventBus.on('score:update', this.onScoreUpdate);
    EventBus.on('coin:collect', this.onCoinCollect);
    EventBus.on('enemy:stomp', this.onEnemyStomp);
    EventBus.on('player:die', this.onPlayerDie);
    EventBus.on('daily:claim', this.onDailyClaim);
    EventBus.on('shop:purchase', this.onShopPurchase);
    EventBus.on('upgrade:buy', this.onUpgradeBuy);
  }

  private onGameStart = (data?: { seed?: number }) => {
    this.logEvent('game_start', { seed: data?.seed });
  };

  private onGameEnd = (data?: { score?: number; coins?: number; stomps?: number }) => {
    this.logEvent('game_end', {
      score: data?.score,
      coins: data?.coins,
      stomps: data?.stomps,
    });
  };

  private onScoreUpdate = (data?: { score?: number; coins?: number }) => {
    this.logEvent('score_update', { score: data?.score, coins: data?.coins });
  };

  private onCoinCollect = (data?: { value?: number }) => {
    this.logEvent('coin_collect', { value: data?.value ?? 1 });
  };

  private onEnemyStomp = () => {
    this.logEvent('enemy_stomp');
  };

  private onPlayerDie = () => {
    this.logEvent('player_die');
  };

  private onDailyClaim = (data?: { day?: number; reward?: number }) => {
    this.logEvent('daily_claim', { day: data?.day, reward: data?.reward });
  };

  private onShopPurchase = (data?: { item?: string; cost?: number }) => {
    this.logEvent('shop_purchase', { item: data?.item, cost: data?.cost });
  };

  private onUpgradeBuy = (data?: { upgrade?: string; level?: number; cost?: number }) => {
    this.logEvent('upgrade_buy', { upgrade: data?.upgrade, level: data?.level, cost: data?.cost });
  };

  logEvent(name: string, params: Record<string, unknown> = {}): void {
    if (!this.enabled) return;

    const event: IAnalyticsEvent = {
      name,
      params,
      timestamp: Date.now(),
    };

    this.eventQueue.push(event);

    if (this.eventQueue.length >= MAX_QUEUE_SIZE) {
      this.flush();
    } else {
      this.saveQueue();
    }
  }

  async flush(): Promise<void> {
    if (this.isFlushing || this.eventQueue.length === 0) return;

    this.isFlushing = true;

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];
    this.saveQueue();

    try {
      if (this.backend && this.backend.isReady() && this.backend.isHealthy()) {
        await this.backend.logEvents(eventsToSend);
        this.retryCount = 0;
      } else {
        this.eventQueue = [...eventsToSend, ...this.eventQueue];
        this.saveQueue();
      }
    } catch (error) {
      this.retryCount++;
      this.eventQueue = [...eventsToSend, ...this.eventQueue];
      this.saveQueue();

      if (this.retryCount >= MAX_RETRIES) {
        this.enabled = false;
      }
    } finally {
      this.isFlushing = false;
    }
  }

  private startFlushTimer(): void {
    if (this.flushTimer) return;
    this.flushTimer = setInterval(() => this.flush(), FLUSH_INTERVAL_MS);
  }

  private stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  private saveQueue(): void {
    try {
      localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(this.eventQueue));
    } catch {
      // Storage full or unavailable, silently drop oldest events
      if (this.eventQueue.length > 10) {
        this.eventQueue = this.eventQueue.slice(-10);
      }
    }
  }

  private loadQueuedEvents(): void {
    try {
      const stored = localStorage.getItem(ANALYTICS_STORAGE_KEY);
      if (stored) {
        this.eventQueue = JSON.parse(stored);
      }
    } catch {
      this.eventQueue = [];
    }
  }

  update(_delta: number): void {
    // No per-frame updates needed
  }

  destroy(): void {
    this.stopFlushTimer();
    EventBus.off('game:start', this.onGameStart);
    EventBus.off('game:end', this.onGameEnd);
    EventBus.off('score:update', this.onScoreUpdate);
    EventBus.off('coin:collect', this.onCoinCollect);
    EventBus.off('enemy:stomp', this.onEnemyStomp);
    EventBus.off('player:die', this.onPlayerDie);
    EventBus.off('daily:claim', this.onDailyClaim);
    EventBus.off('shop:purchase', this.onShopPurchase);
    EventBus.off('upgrade:buy', this.onUpgradeBuy);
  }

  // Test helpers
  getQueuedEvents(): IAnalyticsEvent[] {
    return [...this.eventQueue];
  }

  clearQueue(): void {
    this.eventQueue = [];
    localStorage.removeItem(ANALYTICS_STORAGE_KEY);
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}
