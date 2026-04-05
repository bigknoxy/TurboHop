import { ISystem } from '../interfaces/ISystem';
import { EventBus } from '../utils/EventBus';
import { SaveSystem } from './SaveSystem';

export class ScoreSystem implements ISystem {
  private score = 0;
  private coins = 0;
  private elapsed = 0;
  private saveSystem: SaveSystem;

  private onCoinCollect = () => {
    this.coins++;
    this.emitUpdate();
  };

  constructor(saveSystem: SaveSystem) {
    this.saveSystem = saveSystem;
    EventBus.on('coin:collect', this.onCoinCollect);
  }

  get currentScore(): number {
    return this.score;
  }

  get currentCoins(): number {
    return this.coins;
  }

  update(delta: number): void {
    this.elapsed += delta;
    const newScore = Math.floor(this.elapsed / 50);
    if (newScore !== this.score) {
      this.score = newScore;
      this.emitUpdate();
    }
  }

  finalize(): { score: number; coins: number; highScore: number } {
    const highScore = this.saveSystem.saveHighScore(this.score);
    this.saveSystem.addCoins(this.coins);
    return { score: this.score, coins: this.coins, highScore };
  }

  private emitUpdate(): void {
    EventBus.emit('score:update', { score: this.score, coins: this.coins });
  }

  destroy(): void {
    EventBus.off('coin:collect', this.onCoinCollect);
  }
}
