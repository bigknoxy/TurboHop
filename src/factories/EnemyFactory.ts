import Phaser from 'phaser';

export type EnemyType = 'slime' | 'bird' | 'bat' | 'spike' | 'ghost';

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
    const key = type; // texture keys match enemy type names

    const inactive = this.group.getChildren().find(
      (child) => !(child as Phaser.GameObjects.Sprite).active,
    ) as Phaser.GameObjects.Sprite | undefined;

    let enemy: Phaser.GameObjects.Sprite;
    if (inactive) {
      enemy = inactive;
      enemy.setTexture(key);
      enemy.setPosition(x, y);
      enemy.setActive(true).setVisible(true).setAlpha(1);
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
    enemy.setData('nearMissTriggered', false);

    // Resize body to match texture dimensions
    const body = enemy.body as Phaser.Physics.Arcade.Body;
    const frame = enemy.frame;
    body.setSize(frame.width, frame.height);
    body.enable = true;

    // Spikes can't be stomped
    enemy.setData('stompable', type !== 'spike');

    // Ghost starts visible
    if (type === 'ghost') {
      enemy.setAlpha(0.5);
    }

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

      switch (type) {
        case 'slime':
          sprite.y = baseY + Math.sin(timer * 0.005) * 3;
          break;
        case 'bird':
          sprite.y = baseY + Math.sin(timer * 0.003) * 15;
          break;
        case 'bat':
          // Swoops down in large sine wave
          sprite.y = baseY + Math.sin(timer * 0.002) * 60;
          break;
        case 'spike':
          // Static — no movement
          break;
        case 'ghost': {
          // Phase in/out — disable collision when invisible
          sprite.y = baseY + Math.sin(timer * 0.004) * 5;
          const phase = (timer % 1500) / 1500;
          const visible = phase < 0.67;
          sprite.setAlpha(visible ? 0.5 : 0.08);
          const ghostBody = sprite.body as Phaser.Physics.Arcade.Body;
          ghostBody.enable = visible;
          break;
        }
      }
    });
  }
}
