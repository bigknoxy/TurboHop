import { ISystem } from '../interfaces/ISystem';
import { EventBus } from '../utils/EventBus';
import { SaveSystem } from './SaveSystem';
import { IBackendService } from '../interfaces/IBackendService';

export class ScoreSystem implements ISystem {
  private score = 0;
  private coins = 0;
  private stomps = 0;
  private elapsed = 0;
  private saveSystem: SaveSystem;
  private backend: IBackendService | null = null;
  private replayInput: string = '[]';

  private onCoinCollect = (data?: { value?: number }) => {
    this.coins += data?.value ?? 1;
    this.emitUpdate();
  };

  private onStomp = () => {
    this.stomps++;
  };

  constructor(saveSystem: SaveSystem) {
    this.saveSystem = saveSystem;
    EventBus.on('coin:collect', this.onCoinCollect);
    EventBus.on('enemy:stomp', this.onStomp);
  }

  setBackend(backend: IBackendService): void {
    this.backend = backend;
  }

  setReplayInput(inputs: Array<{ t: number; action: string }>): void {
    this.replayInput = JSON.stringify(inputs);
  }

  get currentScore(): number {
    return this.score;
  }

  get currentCoins(): number {
    return this.coins;
  }

  get currentStomps(): number {
    return this.stomps;
  }

  update(delta: number): void {
    this.elapsed += delta;
    const newScore = Math.floor(this.elapsed / 50);
    if (newScore !== this.score) {
      this.score = newScore;
      this.emitUpdate();
    }
  }

  finalize(): { score: number; coins: number; highScore: number; stomps: number } {
    const highScore = this.saveSystem.saveHighScore(this.score);
    this.saveSystem.addCoins(this.coins);
    return { score: this.score, coins: this.coins, highScore, stomps: this.stomps };
  }

  async submitToBackend(seed?: number, dailyChallenge?: boolean, challengeId?: string): Promise<void> {
    if (!this.backend || !this.backend.isReady()) {
      return;
    }

    try {
      await this.backend.submitScore({
        score: this.score,
        coins: this.coins,
        stomps: this.stomps,
        seed: seed ?? 0,
        replayInput: this.replayInput,
        timestamp: Date.now(),
        dailyChallenge,
        challengeId,
      });
    } catch (_error) {
      // Silently fail - score saved locally already
    }
  }

  private emitUpdate(): void {
    EventBus.emit('score:update', { score: this.score, coins: this.coins });
  }

  destroy(): void {
    EventBus.off('coin:collect', this.onCoinCollect);
    EventBus.off('enemy:stomp', this.onStomp);
    this.backend = null;
  }
}
