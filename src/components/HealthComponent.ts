import { IComponent } from '../interfaces/IComponent';

export class HealthComponent implements IComponent {
  private hp: number;
  private maxHp: number;

  constructor(maxHp: number = 3) {
    this.hp = maxHp;
    this.maxHp = maxHp;
  }

  get currentHp(): number {
    return this.hp;
  }

  get maximum(): number {
    return this.maxHp;
  }

  takeDamage(amount: number = 1): boolean {
    this.hp = Math.max(0, this.hp - amount);
    return this.hp <= 0;
  }

  heal(amount: number = 1): void {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  get isDead(): boolean {
    return this.hp <= 0;
  }

  update(_delta: number): void {}
  destroy(): void {}
}
