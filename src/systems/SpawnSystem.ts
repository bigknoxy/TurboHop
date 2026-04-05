import { ISystem } from '../interfaces/ISystem';
import { PlatformFactory } from '../factories/PlatformFactory';
import { EnemyFactory, EnemyType } from '../factories/EnemyFactory';
import { GAME_WIDTH, GAME_HEIGHT, INITIAL_SCROLL_SPEED } from '../constants';

export class SpawnSystem implements ISystem {
  private platformFactory: PlatformFactory;
  private enemyFactory: EnemyFactory;
  private coinGroup: Phaser.Physics.Arcade.Group;
  private scene: Phaser.Scene;
  private scrollSpeed: number = INITIAL_SCROLL_SPEED;
  private lastPlatformX: number = 0;
  private lastPlatformY: number = GAME_HEIGHT - 40;
  private platformTimer = 0;
  private enemyTimer = 0;
  private coinTimer = 0;
  private difficulty = 0;

  constructor(
    scene: Phaser.Scene,
    platformFactory: PlatformFactory,
    enemyFactory: EnemyFactory,
    coinGroup: Phaser.Physics.Arcade.Group,
  ) {
    this.scene = scene;
    this.platformFactory = platformFactory;
    this.enemyFactory = enemyFactory;
    this.coinGroup = coinGroup;
    this.spawnInitialPlatforms();
  }

  private spawnInitialPlatforms(): void {
    // Ground-level starting platforms
    for (let i = 0; i < 10; i++) {
      const x = i * 55;
      const y = GAME_HEIGHT - 40;
      const wide = i < 3; // First few are wide for easy start
      this.platformFactory.create(x, y, wide);
      this.lastPlatformX = x + (wide ? 80 : 48);
      this.lastPlatformY = y;
    }
  }

  setScrollSpeed(speed: number): void {
    this.scrollSpeed = speed;
    this.platformFactory.setAllVelocity(speed);
    this.enemyFactory.setAllVelocity(speed);
    this.coinGroup.setVelocityX(-speed);
  }

  setDifficulty(level: number): void {
    this.difficulty = level;
  }

  update(delta: number): void {
    // Recycle offscreen objects
    this.platformFactory.recycleOffscreen();
    this.enemyFactory.recycleOffscreen();
    this.recycleCoinOffscreen();

    // Spawn platforms
    this.platformTimer += delta;
    const spawnInterval = Math.max(300, 800 - this.difficulty * 30);
    if (this.platformTimer >= spawnInterval) {
      this.platformTimer = 0;
      this.spawnPlatform();
    }

    // Spawn enemies
    this.enemyTimer += delta;
    const enemyInterval = Math.max(2000, 5000 - this.difficulty * 200);
    if (this.enemyTimer >= enemyInterval) {
      this.enemyTimer = 0;
      this.spawnEnemy();
    }

    // Spawn coins
    this.coinTimer += delta;
    const coinInterval = Math.max(1000, 2500 - this.difficulty * 100);
    if (this.coinTimer >= coinInterval) {
      this.coinTimer = 0;
      this.spawnCoins();
    }

    // Update enemy movement
    this.enemyFactory.updateMovement(delta);
  }

  private spawnPlatform(): void {
    // Scale gaps inversely with speed so jumps remain possible at high difficulty
    const speedFactor = INITIAL_SCROLL_SPEED / this.scrollSpeed;
    const gapX = (60 + Math.random() * 60) * speedFactor;
    const gapY = (Math.random() - 0.5) * 80 * speedFactor;
    const x = GAME_WIDTH + 50;
    let y = this.lastPlatformY + gapY;

    // Clamp platform Y
    y = Math.max(60, Math.min(GAME_HEIGHT - 30, y));

    const wide = Math.random() < 0.3;
    const platform = this.platformFactory.reuse(x, y, wide);
    const body = platform.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(-this.scrollSpeed);

    this.lastPlatformX = x;
    this.lastPlatformY = y;
  }

  private spawnEnemy(): void {
    const type = this.pickEnemyType();
    const x = GAME_WIDTH + 20;
    let y: number;

    switch (type) {
      case 'slime':
        y = this.lastPlatformY - 16;
        break;
      case 'bird':
        y = 40 + Math.random() * (GAME_HEIGHT * 0.4);
        break;
      case 'bat':
        y = 30 + Math.random() * 20; // starts near top
        break;
      case 'spike':
        y = this.lastPlatformY - 8; // sits on platform
        break;
      case 'ghost':
        y = 50 + Math.random() * (GAME_HEIGHT * 0.5);
        break;
      default:
        y = this.lastPlatformY - 16;
    }

    const enemy = this.enemyFactory.create(x, y, type);
    const body = enemy.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(-this.scrollSpeed);
  }

  private pickEnemyType(): EnemyType {
    const roll = Math.random();
    // Difficulty-gated enemy types
    if (this.difficulty >= 5 && roll < 0.12) return 'ghost';
    if (this.difficulty >= 3 && roll < 0.25) return 'bat';
    if (this.difficulty >= 1 && roll < 0.35) return 'spike';
    return roll < 0.6 ? 'slime' : 'bird';
  }

  private spawnCoins(): void {
    const count = Math.random() < 0.3 ? 3 + Math.floor(Math.random() * 3) : 1;
    const baseX = GAME_WIDTH + 20;
    const baseY = 40 + Math.random() * (GAME_HEIGHT - 80);

    for (let i = 0; i < count; i++) {
      const x = baseX + i * 18;
      const y = baseY + Math.sin(i * 0.8) * 15;
      this.spawnCoin(x, y);
    }
  }

  private spawnCoin(x: number, y: number): void {
    // Reuse inactive coin
    const inactive = this.coinGroup.getChildren().find(
      (child) => !(child as Phaser.GameObjects.Sprite).active,
    ) as Phaser.GameObjects.Sprite | undefined;

    if (inactive) {
      inactive.setPosition(x, y);
      inactive.setActive(true).setVisible(true);
      const body = inactive.body as Phaser.Physics.Arcade.Body;
      body.reset(x, y);
      body.setVelocityX(-this.scrollSpeed);
      body.setAllowGravity(false);
    } else {
      const coin = this.coinGroup.create(x, y, 'coin') as Phaser.GameObjects.Sprite;
      const body = coin.body as Phaser.Physics.Arcade.Body;
      body.setVelocityX(-this.scrollSpeed);
      body.setAllowGravity(false);
    }
  }

  private recycleCoinOffscreen(): void {
    this.coinGroup.getChildren().forEach((child) => {
      const sprite = child as Phaser.GameObjects.Sprite;
      if (sprite.active && sprite.x < -20) {
        sprite.setActive(false).setVisible(false);
        (sprite.body as Phaser.Physics.Arcade.Body).stop();
      }
    });
  }

  destroy(): void {}
}
