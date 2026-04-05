import Phaser from 'phaser';

export class PlatformFactory {
  private scene: Phaser.Scene;
  private group: Phaser.Physics.Arcade.Group;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.group = scene.physics.add.group({
      allowGravity: false,
      immovable: true,
    });
  }

  create(x: number, y: number, wide = false): Phaser.GameObjects.Sprite {
    const key = wide ? 'platform-wide' : 'platform';
    const platform = this.group.create(x, y, key) as Phaser.GameObjects.Sprite;
    const body = platform.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);
    return platform;
  }

  setAllVelocity(speed: number): void {
    this.group.setVelocityX(-speed);
  }

  getGroup(): Phaser.Physics.Arcade.Group {
    return this.group;
  }

  recycleOffscreen(): Phaser.GameObjects.Sprite[] {
    const recycled: Phaser.GameObjects.Sprite[] = [];
    this.group.getChildren().forEach((child) => {
      const sprite = child as Phaser.GameObjects.Sprite;
      if (sprite.active && sprite.x < -100) {
        sprite.setActive(false).setVisible(false);
        (sprite.body as Phaser.Physics.Arcade.Body).stop();
        recycled.push(sprite);
      }
    });
    return recycled;
  }

  reuse(x: number, y: number, wide = false): Phaser.GameObjects.Sprite {
    const key = wide ? 'platform-wide' : 'platform';

    // Try to find an inactive platform
    const inactive = this.group.getChildren().find(
      (child) => !(child as Phaser.GameObjects.Sprite).active,
    ) as Phaser.GameObjects.Sprite | undefined;

    if (inactive) {
      inactive.setTexture(key);
      inactive.setPosition(x, y);
      inactive.setActive(true).setVisible(true);
      const body = inactive.body as Phaser.Physics.Arcade.Body;
      body.reset(x, y);
      body.setAllowGravity(false);
      body.setImmovable(true);
      // Update body size to match texture
      body.setSize(inactive.width, inactive.height);
      return inactive;
    }

    return this.create(x, y, wide);
  }
}
