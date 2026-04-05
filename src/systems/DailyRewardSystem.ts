import { SaveSystem } from './SaveSystem';

const REWARDS = [5, 10, 15, 20, 25, 50, 100]; // 7-day streak rewards

export interface DailyRewardResult {
  claimed: boolean;
  reward: number;
  streak: number;
  maxStreak: number;
}

export class DailyRewardSystem {
  private saveSystem: SaveSystem;

  constructor(saveSystem: SaveSystem) {
    this.saveSystem = saveSystem;
  }

  check(): DailyRewardResult {
    const today = this.getDateString();
    const lastClaim = this.saveSystem.getDailyLast();
    const streak = this.saveSystem.getDailyStreak();

    if (lastClaim === today) {
      return { claimed: false, reward: 0, streak, maxStreak: REWARDS.length };
    }

    // Check if streak continues (yesterday) or resets
    const yesterday = this.getDateString(-1);
    let newStreak: number;
    if (lastClaim === yesterday) {
      newStreak = Math.min(streak + 1, REWARDS.length);
    } else {
      newStreak = 1; // Reset streak
    }

    const reward = REWARDS[newStreak - 1] || REWARDS[REWARDS.length - 1];

    return { claimed: true, reward, streak: newStreak, maxStreak: REWARDS.length };
  }

  claim(result: DailyRewardResult): void {
    if (!result.claimed) return;
    const today = this.getDateString();
    this.saveSystem.saveDailyStreak(result.streak, today);
    this.saveSystem.addCoins(result.reward);
  }

  private getDateString(offsetDays = 0): string {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
