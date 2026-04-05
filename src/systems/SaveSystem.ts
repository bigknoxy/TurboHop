import { ISystem } from '../interfaces/ISystem';

const KEYS = {
  HIGH_SCORE: 'turbohop_highscore',
  COINS: 'turbohop_coins',
  SKINS: 'turbohop_skins',
  SKIN: 'turbohop_skin',
  TUTORIAL_DONE: 'turbohop_tutorial',
  MISSIONS: 'turbohop_missions',
  DAILY_STREAK: 'turbohop_daily_streak',
  DAILY_LAST: 'turbohop_daily_last',
  UPGRADES: 'turbohop_upgrades',
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

  spendCoins(amount: number): boolean {
    const current = this.getCoins();
    if (current < amount) return false;
    localStorage.setItem(KEYS.COINS, String(current - amount));
    return true;
  }

  // Tutorial
  isTutorialDone(): boolean {
    return localStorage.getItem(KEYS.TUTORIAL_DONE) === '1';
  }

  setTutorialDone(): void {
    localStorage.setItem(KEYS.TUTORIAL_DONE, '1');
  }

  // Missions
  getMissions(): string | null {
    return localStorage.getItem(KEYS.MISSIONS);
  }

  saveMissions(data: string): void {
    localStorage.setItem(KEYS.MISSIONS, data);
  }

  // Daily rewards
  getDailyStreak(): number {
    return parseInt(localStorage.getItem(KEYS.DAILY_STREAK) || '0', 10);
  }

  getDailyLast(): string | null {
    return localStorage.getItem(KEYS.DAILY_LAST);
  }

  saveDailyStreak(streak: number, date: string): void {
    localStorage.setItem(KEYS.DAILY_STREAK, String(streak));
    localStorage.setItem(KEYS.DAILY_LAST, date);
  }

  // Upgrades
  getUpgrades(): Record<string, number> {
    try {
      return JSON.parse(localStorage.getItem(KEYS.UPGRADES) || '{}');
    } catch {
      return {};
    }
  }

  saveUpgrades(upgrades: Record<string, number>): void {
    localStorage.setItem(KEYS.UPGRADES, JSON.stringify(upgrades));
  }

  update(_delta: number): void {}
  destroy(): void {}
}
