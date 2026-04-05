import Phaser from 'phaser';

export type EnemyType = 'slime' | 'bird';

export class EnemyFactory {
  private scene: Phaser.Scene;
  private group: Phaser.Physics.Arcade.Group;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.group = scene.physics.add.group({
      allowGravity: false,
      immovable: false,
    });
  }

  create(x: number, y: number, type: EnemyType): Phaser.GameObjects.Sprite {
    const key = type === 'slime' ? 'slime' : 'bird';

    // Try to reuse inactive
    const inactive = this.group.getChildren().find(
      (child) => !(child as Phaser.GameObjects.Sprite).active,
    ) as Phaser.GameObjects.Sprite | undefined;

    let enemy: Phaser.GameObjects.Sprite;
    if (inactive) {
      enemy = inactive;
      enemy.setTexture(key);
      enemy.setPosition(x, y);
      enemy.setActive(true).setVisible(true);
      const body = enemy.body as Phaser.Physics.Arcade.Body;
      body.reset(x, y);
      body.setAllowGravity(false);
    } else {
      enemy = this.group.create(x, y, key) as Phaser.GameObjects.Sprite;
      const body = enemy.body as Phaser.Physics.Arcade.Body;
      body.setAllowGravity(false);
    }

    enemy.setData('type', type);
    enemy.setData('baseY', y);
    enemy.setData('timer', 0);

    return enemy;
  }

  getGroup(): Phaser.Physics.Arcade.Group {
    return this.group;
  }

  setAllVelocity(speed: number): void {
    this.group.setVelocityX(-speed);
  }

  recycleOffscreen(): void {
    this.group.getChildren().forEach((child) => {
      const sprite = child as Phaser.GameObjects.Sprite;
      if (sprite.active && sprite.x < -30) {
        sprite.setActive(false).setVisible(false);
        (sprite.body as Phaser.Physics.Arcade.Body).stop();
      }
    });
  }

  updateMovement(delta: number): void {
    this.group.getChildren().forEach((child) => {
      const sprite = child as Phaser.GameObjects.Sprite;
      if (!sprite.active) return;

      const type = sprite.getData('type') as EnemyType;
      const timer = (sprite.getData('timer') as number) + delta;
      sprite.setData('timer', timer);
      const baseY = sprite.getData('baseY') as number;

      if (type === 'slime') {
        sprite.y = baseY + Math.sin(timer * 0.005) * 3;
      } else if (type === 'bird') {
        sprite.y = baseY + Math.sin(timer * 0.003) * 15;
      }
    });
  }
}
