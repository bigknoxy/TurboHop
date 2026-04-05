import { ISystem } from '../interfaces/ISystem';
import { INITIAL_SCROLL_SPEED, MAX_SCROLL_SPEED } from '../constants';
import { EventBus } from '../utils/EventBus';

export class DifficultySystem implements ISystem {
  private elapsed = 0;
  private level = 0;
  private rampInterval = 15000; // 15 seconds
  private speedIncrement = 25;
  private currentSpeed: number = INITIAL_SCROLL_SPEED;

  get speed(): number {
    return this.currentSpeed;
  }

  get difficultyLevel(): number {
    return this.level;
  }

  update(delta: number): void {
    this.elapsed += delta;
    const newLevel = Math.floor(this.elapsed / this.rampInterval);

    if (newLevel > this.level) {
      this.level = newLevel;
      this.currentSpeed = Math.min(
        MAX_SCROLL_SPEED,
        INITIAL_SCROLL_SPEED + this.level * this.speedIncrement,
      );
      EventBus.emit('difficulty:change', {
        level: this.level,
        speed: this.currentSpeed,
      });
    }
  }

  destroy(): void {}
}
