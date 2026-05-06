import { SaveSystem } from './SaveSystem';

// Expanded 30-day cycle for better long-term retention
const REWARDS_30_DAY = [
  // Week 1: Low rewards to hook player
  10, 15, 20, 25, 30, 40, 50,
  // Week 2: Increasing rewards
  60, 70, 80, 90, 100, 120, 150,
  // Week 3: Higher rewards
  175, 200, 225, 250, 300, 350, 400,
  // Week 4: Premium rewards
  500, 600, 700, 800, 1000, 1200, 1500,
  // Days 29-30: Completion bonus
  2000, 3000,
];

export interface DailyRewardResult {
  claimed: boolean;
  reward: number;
  streak: number;
  maxStreak: number;
  isSpecial: boolean; // True for day 7, 14, 21, 28, 30
}

export class DailyRewardSystem {
  private saveSystem: SaveSystem;
  private static readonly MILESTONE_DAYS = [7, 14, 21, 28, 30];

  constructor(saveSystem: SaveSystem) {
    this.saveSystem = saveSystem;
  }

  check(): DailyRewardResult {
    const today = this.getDateString();
    const lastClaim = this.saveSystem.getDailyLast();
    const streak = this.saveSystem.getDailyStreak();

    if (lastClaim === today) {
      return {
        claimed: false,
        reward: 0,
        streak,
        maxStreak: REWARDS_30_DAY.length,
        isSpecial: false,
      };
    }

    // Check if streak continues (yesterday) or resets
    const yesterday = this.getDateString(-1);
    let newStreak: number;
    if (lastClaim === yesterday) {
      newStreak = Math.min(streak + 1, REWARDS_30_DAY.length);
    } else {
      newStreak = 1; // Reset streak
    }

    const reward = REWARDS_30_DAY[newStreak - 1] || REWARDS_30_DAY[REWARDS_30_DAY.length - 1];
    const isSpecial = DailyRewardSystem.MILESTONE_DAYS.includes(newStreak);

    return {
      claimed: true,
      reward,
      streak: newStreak,
      maxStreak: REWARDS_30_DAY.length,
      isSpecial,
    };
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
