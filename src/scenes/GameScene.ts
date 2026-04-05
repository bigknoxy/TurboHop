import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { Player } from '../entities/Player';
import { PlatformFactory } from '../factories/PlatformFactory';
import { EnemyFactory } from '../factories/EnemyFactory';
import { SpawnSystem } from '../systems/SpawnSystem';
import { DifficultySystem } from '../systems/DifficultySystem';
import { ScoreSystem } from '../systems/ScoreSystem';
import { SaveSystem } from '../systems/SaveSystem';
import { AudioSystem } from '../systems/AudioSystem';
import { EventBus } from '../utils/EventBus';

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private platformFactory!: PlatformFactory;
  private enemyFactory!: EnemyFactory;
  private coinGroup!: Phaser.Physics.Arcade.Group;
  private spawnSystem!: SpawnSystem;
  private difficultySystem!: DifficultySystem;
  private scoreSystem!: ScoreSystem;
  private saveSystem!: SaveSystem;
  private audioSystem!: AudioSystem;
  private bgLayers: Phaser.GameObjects.TileSprite[] = [];
  private scanlineGfx!: Phaser.GameObjects.Graphics;
  private gameOver = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    this.gameOver = false;
    EventBus.removeAllListeners();

    // Parallax backgrounds
    this.bgLayers = [];
    const sky = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'bg-sky').setOrigin(0, 0).setScrollFactor(0);
    const mountains = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'bg-mountains').setOrigin(0, 0).setScrollFactor(0);
    const hills = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'bg-hills').setOrigin(0, 0).setScrollFactor(0);
    this.bgLayers.push(sky, mountains, hills);

    // Systems
    this.saveSystem = new SaveSystem();
    this.platformFactory = new PlatformFactory(this);
    this.enemyFactory = new EnemyFactory(this);
    this.coinGroup = this.physics.add.group({ allowGravity: false });
    this.spawnSystem = new SpawnSystem(this, this.platformFactory, this.enemyFactory, this.coinGroup);
    this.difficultySystem = new DifficultySystem();
    this.scoreSystem = new ScoreSystem(this.saveSystem);
    this.audioSystem = new AudioSystem(this);

    // Player
    this.player = new Player(this);

    // Collisions
    this.physics.add.collider(this.player.sprite, this.platformFactory.getGroup());

    // Enemy overlap
    this.physics.add.overlap(
      this.player.sprite,
      this.enemyFactory.getGroup(),
      this.handleEnemyCollision,
      undefined,
      this,
    );

    // Coin overlap
    this.physics.add.overlap(
      this.player.sprite,
      this.coinGroup,
      this.handleCoinCollect,
      undefined,
      this,
    );

    // Difficulty change event
    EventBus.on('difficulty:change', (data: { speed: number; level: number }) => {
      this.spawnSystem.setScrollSpeed(data.speed);
      this.spawnSystem.setDifficulty(data.level);
    });

    // Player death
    EventBus.on('player:dead', () => {
      if (this.gameOver) return;
      this.gameOver = true;
      const results = this.scoreSystem.finalize();
      this.time.delayedCall(800, () => {
        this.scene.stop('UIScene');
        this.scene.start('GameOverScene', results);
      });
    });

    // Player hit — screen shake
    EventBus.on('player:hit', () => {
      this.cameras.main.shake(100, 0.01);
    });

    // CRT scanline overlay
    this.scanlineGfx = this.add.graphics();
    this.scanlineGfx.setScrollFactor(0);
    this.scanlineGfx.setDepth(1000);
    this.scanlineGfx.lineStyle(1, 0x000000, 0.12);
    for (let y = 0; y < GAME_HEIGHT; y += 2) {
      this.scanlineGfx.moveTo(0, y);
      this.scanlineGfx.lineTo(GAME_WIDTH, y);
    }
    this.scanlineGfx.strokePath();

    // Clean up systems when scene shuts down
    this.events.on('shutdown', () => this.shutdown());

    // Set initial scroll speed
    this.spawnSystem.setScrollSpeed(this.difficultySystem.speed);
  }

  update(time: number, delta: number) {
    if (this.gameOver) return;

    this.player.update(delta);
    this.difficultySystem.update(delta);
    this.scoreSystem.update(delta);
    this.spawnSystem.update(delta);

    // Parallax scroll
    const speed = this.difficultySystem.speed;
    const dt = delta / 1000;
    this.bgLayers[0].tilePositionX += speed * 0.05 * dt;
    this.bgLayers[1].tilePositionX += speed * 0.2 * dt;
    this.bgLayers[2].tilePositionX += speed * 0.4 * dt;

    // Coin spin animation (using Phaser time, not Date.now())
    this.coinGroup.getChildren().forEach((child) => {
      const sprite = child as Phaser.GameObjects.Sprite;
      if (sprite.active) {
        sprite.setScale(0.8 + Math.sin(time * 0.008 + sprite.x) * 0.2, 1);
      }
    });
  }

  shutdown() {
    this.scoreSystem.destroy();
    this.audioSystem.destroy();
    this.spawnSystem.destroy();
    this.difficultySystem.destroy();
    this.player.destroy();
  }

  private handleEnemyCollision(
    playerObj: any,
    enemyObj: any,
  ) {
    if (this.gameOver) return;
    const enemy = enemyObj as Phaser.GameObjects.Sprite;
    if (!enemy.active) return;

    const playerBody = this.player.body;
    const enemyBody = enemy.body as Phaser.Physics.Arcade.Body;

    // Stomp check: player is falling and above the enemy
    if (playerBody.velocity.y > 0 && playerBody.bottom < enemyBody.center.y) {
      // Stomp!
      enemy.setActive(false).setVisible(false);
      enemyBody.stop();
      this.player.bounce();
      EventBus.emit('enemy:stomp');

      // Sparkle effect
      this.createParticles(enemy.x, enemy.y, 0xffaa00, 5);
    } else {
      // Take damage
      this.player.takeDamage();
    }
  }

  private handleCoinCollect(
    _playerObj: any,
    coinObj: any,
  ) {
    const coin = coinObj as Phaser.GameObjects.Sprite;
    if (!coin.active) return;

    coin.setActive(false).setVisible(false);
    (coin.body as Phaser.Physics.Arcade.Body).stop();
    EventBus.emit('coin:collect');

    // Sparkle effect
    this.createParticles(coin.x, coin.y, 0xffdd00, 6);
  }

  private createParticles(x: number, y: number, color: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const particle = this.add.circle(x, y, 2, color);
      const angle = (Math.PI * 2 * i) / count;
      const speed = 40 + Math.random() * 30;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      this.tweens.add({
        targets: particle,
        x: particle.x + vx,
        y: particle.y + vy,
        alpha: 0,
        scale: 0.1,
        duration: 300,
        onComplete: () => particle.destroy(),
      });
    }
  }
}
