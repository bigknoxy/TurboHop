import { IComponent } from '../interfaces/IComponent';

export class ScrollComponent implements IComponent {
  private body: Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody;
  private speed: number;

  constructor(
    body: Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody,
    speed: number,
  ) {
    this.body = body;
    this.speed = speed;
  }

  setSpeed(speed: number): void {
    this.speed = speed;
    if ('setVelocityX' in this.body) {
      (this.body as Phaser.Physics.Arcade.Body).setVelocityX(-speed);
    }
  }

  getSpeed(): number {
    return this.speed;
  }

  update(_delta: number): void {
    // For static bodies, move position directly
    if (this.body instanceof Phaser.Physics.Arcade.StaticBody) {
      (this.body.gameObject as Phaser.GameObjects.Sprite).x -= this.speed * (_delta / 1000);
      this.body.updateFromGameObject();
    }
  }

  destroy(): void {}
}
