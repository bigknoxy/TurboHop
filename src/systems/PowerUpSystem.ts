import { ISystem } from '../interfaces/ISystem';
import { EventBus } from '../utils/EventBus';

export type PowerUpType = 'magnet' | 'shield' | 'double_coins' | 'speed_boost';

interface ActivePowerUp {
  type: PowerUpType;
  timeLeft: number;
  duration: number;
}

const POWER_UP_CONFIG: Record<PowerUpType, { duration: number; name: string }> = {
  magnet: { duration: 8000, name: 'MAGNET' },
  shield: { duration: Infinity, name: 'SHIELD' },
  double_coins: { duration: 10000, name: '2X COINS' },
  speed_boost: { duration: 5000, name: 'BOOST' },
};

export class PowerUpSystem implements ISystem {
  private activePowerUps: ActivePowerUp[] = [];
  private lastEmittedName = '';
  private lastEmittedSeconds = 0;

  activate(type: PowerUpType): void {
    this.activePowerUps = this.activePowerUps.filter((p) => p.type !== type);

    const config = POWER_UP_CONFIG[type];
    this.activePowerUps.push({
      type,
      timeLeft: config.duration,
      duration: config.duration,
    });

    EventBus.emit('powerup:activate', { type, name: config.name });
    this.emitStatus(true);
  }

  isActive(type: PowerUpType): boolean {
    return this.activePowerUps.some((p) => p.type === type);
  }

  consumeShield(): boolean {
    const idx = this.activePowerUps.findIndex((p) => p.type === 'shield');
    if (idx !== -1) {
      this.activePowerUps.splice(idx, 1);
      EventBus.emit('powerup:expire', { type: 'shield' });
      this.emitStatus(true);
      return true;
    }
    return false;
  }

  update(delta: number): void {
    const expired: PowerUpType[] = [];

    this.activePowerUps = this.activePowerUps.filter((p) => {
      if (p.duration === Infinity) return true;
      p.timeLeft -= delta;
      if (p.timeLeft <= 0) {
        expired.push(p.type);
        return false;
      }
      return true;
    });

    for (const type of expired) {
      EventBus.emit('powerup:expire', { type });
    }

    this.emitStatus(expired.length > 0);
  }

  private emitStatus(force = false): void {
    let name = '';
    let seconds = 0;

    if (this.activePowerUps.length > 0) {
      const primary = this.activePowerUps[0];
      const config = POWER_UP_CONFIG[primary.type];
      name = config.name;
      seconds = primary.duration === Infinity ? -1 : Math.ceil(primary.timeLeft / 1000);
    }

    if (!force && name === this.lastEmittedName && seconds === this.lastEmittedSeconds) return;

    this.lastEmittedName = name;
    this.lastEmittedSeconds = seconds;
    EventBus.emit('powerup:active', {
      name,
      timeLeft: this.activePowerUps.length > 0
        ? (this.activePowerUps[0].duration === Infinity ? -1 : this.activePowerUps[0].timeLeft)
        : 0,
    });
  }

  getActivePowerUps(): PowerUpType[] {
    return this.activePowerUps.map((p) => p.type);
  }

  destroy(): void {
    this.activePowerUps = [];
  }
}
