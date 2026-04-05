import { SaveSystem } from './SaveSystem';

export interface UpgradeDefinition {
  id: string;
  name: string;
  description: string;
  maxLevel: number;
  costs: number[];
  values: number[];
}

export const UPGRADES: UpgradeDefinition[] = [
  {
    id: 'extra_hp',
    name: 'EXTRA HP',
    description: 'Start with more HP',
    maxLevel: 3,
    costs: [50, 150, 400],
    values: [4, 5, 6],
  },
  {
    id: 'coin_magnet',
    name: 'COIN MAGNET',
    description: 'Passive coin pull range',
    maxLevel: 3,
    costs: [30, 100, 250],
    values: [15, 30, 50],
  },
  {
    id: 'slow_start',
    name: 'SLOW START',
    description: 'Delay first speed-up',
    maxLevel: 3,
    costs: [40, 120, 300],
    values: [5000, 10000, 15000],
  },
  {
    id: 'jump_boost',
    name: 'JUMP BOOST',
    description: 'Higher double jump',
    maxLevel: 3,
    costs: [60, 180, 450],
    values: [10, 20, 30],
  },
  {
    id: 'starting_shield',
    name: 'START SHIELD',
    description: 'Begin with a shield',
    maxLevel: 1,
    costs: [200],
    values: [1],
  },
];

export class UpgradeSystem {
  private saveSystem: SaveSystem;
  private levels: Record<string, number>;

  constructor(saveSystem: SaveSystem) {
    this.saveSystem = saveSystem;
    this.levels = saveSystem.getUpgrades();
  }

  getLevel(id: string): number {
    return this.levels[id] || 0;
  }

  getUpgradeValue(id: string): number {
    const def = UPGRADES.find((u) => u.id === id);
    if (!def) return 0;
    const level = this.getLevel(id);
    if (level === 0) return 0;
    return def.values[level - 1];
  }

  canPurchase(id: string): boolean {
    const def = UPGRADES.find((u) => u.id === id);
    if (!def) return false;
    const level = this.getLevel(id);
    if (level >= def.maxLevel) return false;
    const cost = def.costs[level];
    return this.saveSystem.getCoins() >= cost;
  }

  purchase(id: string): boolean {
    const def = UPGRADES.find((u) => u.id === id);
    if (!def || !this.canPurchase(id)) return false;
    const level = this.getLevel(id);
    const cost = def.costs[level];
    if (!this.saveSystem.spendCoins(cost)) return false;
    this.levels[id] = level + 1;
    this.saveSystem.saveUpgrades(this.levels);
    return true;
  }
}
