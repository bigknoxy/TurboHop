import { ISystem } from '../interfaces/ISystem';

const KEYS = {
  HIGH_SCORE: 'turbohop_highscore',
  COINS: 'turbohop_coins',
  SKINS: 'turbohop_skins',
  SKIN: 'turbohop_skin',
};

export class SaveSystem implements ISystem {
  getHighScore(): number {
    return parseInt(localStorage.getItem(KEYS.HIGH_SCORE) || '0', 10);
  }

  saveHighScore(score: number): number {
    const current = this.getHighScore();
    const best = Math.max(current, score);
    localStorage.setItem(KEYS.HIGH_SCORE, String(best));
    return best;
  }

  getCoins(): number {
    return parseInt(localStorage.getItem(KEYS.COINS) || '0', 10);
  }

  addCoins(amount: number): void {
    const current = this.getCoins();
    localStorage.setItem(KEYS.COINS, String(current + amount));
  }

  update(_delta: number): void {}
  destroy(): void {}
}
