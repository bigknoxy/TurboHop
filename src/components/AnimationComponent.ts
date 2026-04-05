import { IComponent } from '../interfaces/IComponent';

export class AnimationComponent implements IComponent {
  private sprite: Phaser.GameObjects.Sprite;
  private bobAmount: number;
  private bobSpeed: number;
  private timer = 0;
  private baseY: number;

  constructor(sprite: Phaser.GameObjects.Sprite, bobAmount: number = 0, bobSpeed: number = 0) {
    this.sprite = sprite;
    this.bobAmount = bobAmount;
    this.bobSpeed = bobSpeed;
    this.baseY = sprite.y;
  }

  setBaseY(y: number): void {
    this.baseY = y;
  }

  update(delta: number): void {
    if (this.bobAmount > 0) {
      this.timer += delta;
      this.sprite.y = this.baseY + Math.sin(this.timer * this.bobSpeed * 0.001) * this.bobAmount;
    }
  }

  destroy(): void {}
}
