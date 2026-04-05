import { ISystem } from '../interfaces/ISystem';
import { EventBus } from '../utils/EventBus';
import { SaveSystem } from './SaveSystem';

export class ScoreSystem implements ISystem {
  private score = 0;
  private coins = 0;
  private stomps = 0;
  private elapsed = 0;
  private saveSystem: SaveSystem;

  private onCoinCollect = () => {
    this.coins++;
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

  private emitUpdate(): void {
    EventBus.emit('score:update', { score: this.score, coins: this.coins });
  }

  destroy(): void {
    EventBus.off('coin:collect', this.onCoinCollect);
    EventBus.off('enemy:stomp', this.onStomp);
  }
}
