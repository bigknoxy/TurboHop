import { ISystem } from '../interfaces/ISystem';
import { EventBus } from '../utils/EventBus';
import { SaveSystem } from './SaveSystem';

export interface Mission {
  type: 'distance' | 'coins' | 'stomps' | 'survive' | 'nodamage';
  target: number;
  progress: number;
  reward: number;
  description: string;
  completed: boolean;
}

const MISSION_TEMPLATES: Array<{ type: Mission['type']; targets: number[]; rewards: number[]; desc: (t: number) => string }> = [
  { type: 'distance', targets: [300, 500, 800, 1200], rewards: [10, 20, 30, 50], desc: (t) => `Score ${t} points` },
  { type: 'coins', targets: [5, 10, 20, 30], rewards: [10, 15, 25, 40], desc: (t) => `Collect ${t} coins` },
  { type: 'stomps', targets: [2, 5, 8, 12], rewards: [15, 25, 35, 50], desc: (t) => `Stomp ${t} enemies` },
  { type: 'survive', targets: [30, 45, 60, 90], rewards: [15, 20, 30, 50], desc: (t) => `Survive ${t}s` },
  { type: 'nodamage', targets: [150, 250, 400, 600], rewards: [20, 30, 40, 50], desc: (t) => `Score ${t} without damage` },
];

export class MissionSystem implements ISystem {
  private missions: Mission[] = [];
  private saveSystem: SaveSystem;
  private score = 0;
  private coins = 0;
  private stomps = 0;
  private elapsed = 0;
  private damageTaken = false;
  private nodamageScore = 0;
  private bonusCoins = 0;

  private onScore = (data: { score: number; coins: number }) => {
    this.score = data.score;
    this.coins = data.coins;
    this.checkProgress();
  };
  private onStomp = () => {
    this.stomps++;
    this.checkProgress();
  };
  private onHit = () => {
    this.damageTaken = true;
    this.nodamageScore = 0;
  };

  constructor(saveSystem: SaveSystem) {
    this.saveSystem = saveSystem;
    this.loadMissions();

    EventBus.on('score:update', this.onScore);
    EventBus.on('enemy:stomp', this.onStomp);
    EventBus.on('player:hit', this.onHit);
  }

  private loadMissions(): void {
    const saved = this.saveSystem.getMissions();
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Mission[];
        // Check if all completed — if so, generate new set
        if (parsed.length === 3 && parsed.every((m) => m.completed)) {
          this.generateMissions();
        } else {
          this.missions = parsed;
          // Reset progress for new run
          this.missions.forEach((m) => {
            if (!m.completed) m.progress = 0;
          });
        }
      } catch {
        this.generateMissions();
      }
    } else {
      this.generateMissions();
    }
    this.emitMissions();
  }

  private generateMissions(): void {
    const used = new Set<string>();
    this.missions = [];

    while (this.missions.length < 3) {
      const templateIdx = Math.floor(Math.random() * MISSION_TEMPLATES.length);
      const template = MISSION_TEMPLATES[templateIdx];
      if (used.has(template.type)) continue;
      used.add(template.type);

      const diffIdx = Math.floor(Math.random() * template.targets.length);
      const target = template.targets[diffIdx];
      const reward = template.rewards[diffIdx];

      this.missions.push({
        type: template.type,
        target,
        progress: 0,
        reward,
        description: template.desc(target),
        completed: false,
      });
    }
    this.saveMissions();
  }

  private checkProgress(): void {
    let anyCompleted = false;
    for (const mission of this.missions) {
      if (mission.completed) continue;

      switch (mission.type) {
        case 'distance':
          mission.progress = this.score;
          break;
        case 'coins':
          mission.progress = this.coins;
          break;
        case 'stomps':
          mission.progress = this.stomps;
          break;
        case 'survive':
          mission.progress = Math.floor(this.elapsed / 1000);
          break;
        case 'nodamage':
          mission.progress = this.nodamageScore;
          break;
      }

      if (mission.progress >= mission.target && !mission.completed) {
        mission.completed = true;
        this.bonusCoins += mission.reward;
        anyCompleted = true;
        EventBus.emit('mission:complete', { mission, reward: mission.reward });
      }
    }

    if (anyCompleted) {
      this.emitMissions();
      // If all 3 completed, generate new set
      if (this.missions.every((m) => m.completed)) {
        this.generateMissions();
        this.emitMissions();
      }
    }
  }

  private emitMissions(): void {
    EventBus.emit('missions:update', this.missions);
  }

  private saveMissions(): void {
    this.saveSystem.saveMissions(JSON.stringify(this.missions));
  }

  getMissions(): Mission[] {
    return this.missions;
  }

  getBonusCoins(): number {
    return this.bonusCoins;
  }

  update(delta: number): void {
    this.elapsed += delta;
    if (!this.damageTaken) {
      this.nodamageScore = this.score;
    }
    // Check survive missions periodically
    for (const m of this.missions) {
      if (m.type === 'survive' && !m.completed) {
        m.progress = Math.floor(this.elapsed / 1000);
        if (m.progress >= m.target) {
          m.completed = true;
          this.bonusCoins += m.reward;
          EventBus.emit('mission:complete', { mission: m, reward: m.reward });
          this.emitMissions();
        }
      }
    }
  }

  finalize(): void {
    this.saveMissions();
    if (this.bonusCoins > 0) {
      this.saveSystem.addCoins(this.bonusCoins);
    }
  }

  destroy(): void {
    this.finalize();
    EventBus.off('score:update', this.onScore);
    EventBus.off('enemy:stomp', this.onStomp);
    EventBus.off('player:hit', this.onHit);
  }
}
