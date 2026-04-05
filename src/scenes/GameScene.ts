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
import { MissionSystem } from '../systems/MissionSystem';
import { PowerUpSystem, PowerUpType } from '../systems/PowerUpSystem';
import { UpgradeSystem } from '../systems/UpgradeSystem';
import { EventBus } from '../utils/EventBus';
import { fadeIn, fadeOut } from '../utils/TransitionHelper';
import { SettingsSystem } from '../systems/SettingsSystem';

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
  private missionSystem!: MissionSystem;
  private powerUpSystem!: PowerUpSystem;
  private powerUpGroup!: Phaser.Physics.Arcade.Group;
  private powerUpTimer = 0;
  private nextPowerUpAt = 20000 + Math.random() * 10000;
  private shieldSprite: Phaser.GameObjects.Arc | null = null;
  private passiveMagnetRange = 0;
  private bgLayers: Phaser.GameObjects.TileSprite[] = [];
  private scanlineGfx!: Phaser.GameObjects.Graphics;
  private speedLineGfx!: Phaser.GameObjects.Graphics;
  private gameOver = false;
  private tutorialStep = -1; // -1 = no tutorial
  private tutorialText: Phaser.GameObjects.Text | null = null;
  private tutorialJumped = false;

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

    // Speed lines graphics (behind gameplay, above backgrounds)
    this.speedLineGfx = this.add.graphics();
    this.speedLineGfx.setScrollFactor(0);
    this.speedLineGfx.setDepth(1);

    // Systems
    this.saveSystem = new SaveSystem();
    this.platformFactory = new PlatformFactory(this);
    this.enemyFactory = new EnemyFactory(this);
    this.coinGroup = this.physics.add.group({ allowGravity: false });
    this.spawnSystem = new SpawnSystem(this, this.platformFactory, this.enemyFactory, this.coinGroup);
    this.difficultySystem = new DifficultySystem();
    this.scoreSystem = new ScoreSystem(this.saveSystem);
    this.audioSystem = new AudioSystem(this);
    this.missionSystem = new MissionSystem(this.saveSystem);
    this.powerUpSystem = new PowerUpSystem();
    this.powerUpGroup = this.physics.add.group({ allowGravity: false });

    // Apply persistent upgrades
    const upgradeSystem = new UpgradeSystem(this.saveSystem);
    this.passiveMagnetRange = upgradeSystem.getUpgradeValue('coin_magnet');
    const slowStart = upgradeSystem.getUpgradeValue('slow_start');
    if (slowStart > 0) {
      this.difficultySystem.setInitialDelay(slowStart);
    }
    if (upgradeSystem.getUpgradeValue('starting_shield') > 0) {
      this.powerUpSystem.activate('shield');
    }

    // Player (inject upgrade values)
    const extraHp = upgradeSystem.getUpgradeValue('extra_hp');
    const jumpBoost = upgradeSystem.getUpgradeValue('jump_boost');
    this.player = new Player(this, {
      extraHp: extraHp || undefined,
      jumpBoost: jumpBoost || undefined,
    });

    // Camera lerp + lookahead
    this.cameras.main.startFollow(this.player.sprite, true, 0.08, 0.1, -40, 0);
    this.cameras.main.setBounds(0, 0, GAME_WIDTH + 80, GAME_HEIGHT);

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

    // Power-up overlap
    this.physics.add.overlap(
      this.player.sprite,
      this.powerUpGroup,
      this.handlePowerUpCollect,
      undefined,
      this,
    );

    // Difficulty change event
    EventBus.on('difficulty:change', (data: { speed: number; level: number }) => {
      this.spawnSystem.setScrollSpeed(data.speed);
      this.spawnSystem.setDifficulty(data.level);
      // Update active power-up velocities to match new speed
      this.powerUpGroup.setVelocityX(-data.speed);
    });

    // Player death
    EventBus.on('player:dead', () => {
      if (this.gameOver) return;
      this.gameOver = true;
      const scoreResults = this.scoreSystem.finalize();
      const results = {
        ...scoreResults,
        bonusCoins: this.missionSystem.getBonusCoins(),
        missions: this.missionSystem.getMissions(),
      };
      this.time.delayedCall(800, () => {
        fadeOut(this, 300, () => {
          this.scene.stop('UIScene');
          this.scene.start('GameOverScene', results);
        });
      });
    });

    // Player hit — screen shake (respects reduced motion)
    EventBus.on('player:hit', () => {
      if (!SettingsSystem.reducedMotion) {
        this.cameras.main.shake(100, 0.01);
      }
    });

    // Mission complete notification
    EventBus.on('mission:complete', (data: { mission: { description: string }; reward: number }) => {
      this.showFloatingText(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20, `MISSION: ${data.mission.description}`, '#44ff44');
      this.showFloatingText(GAME_WIDTH / 2, GAME_HEIGHT / 2, `+${data.reward} BONUS COINS`, '#ffdd00');
    });

    // Landing dust particles
    EventBus.on('player:land', (data: { x: number; y: number }) => {
      this.createDustPuff(data.x, data.y);
    });

    // CRT scanline overlay (disabled in reduced motion)
    this.scanlineGfx = this.add.graphics();
    if (!SettingsSystem.reducedMotion) {
      this.scanlineGfx.setScrollFactor(0);
      this.scanlineGfx.setDepth(1000);
      this.scanlineGfx.lineStyle(1, 0x000000, 0.12);
      for (let y = 0; y < GAME_HEIGHT; y += 2) {
        this.scanlineGfx.moveTo(0, y);
        this.scanlineGfx.lineTo(GAME_WIDTH, y);
      }
      this.scanlineGfx.strokePath();
    }

    // Vignette overlay
    if (this.textures.exists('vignette')) {
      this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'vignette').setDepth(999).setScrollFactor(0).setAlpha(0.25);
    }

    // Fade in from black
    fadeIn(this, 400);

    // Clean up systems when scene shuts down
    this.events.on('shutdown', () => this.shutdown());

    // Set initial scroll speed
    this.spawnSystem.setScrollSpeed(this.difficultySystem.speed);

    // Tutorial for first-time players
    if (!this.saveSystem.isTutorialDone()) {
      this.tutorialStep = 0;
      this.tutorialJumped = false;
      this.showTutorialStep();

      EventBus.on('player:jump', () => {
        if (this.tutorialStep === 0) {
          this.tutorialJumped = true;
          this.tutorialStep = 1;
          this.showTutorialStep();
        } else if (this.tutorialStep === 2) {
          // Double jump done
          this.tutorialStep = 3;
          this.showTutorialStep();
          this.time.delayedCall(2500, () => {
            if (this.tutorialStep === 3) {
              this.finishTutorial();
            }
          });
        }
      });

      EventBus.on('player:land', () => {
        if (this.tutorialStep === 1 && this.tutorialJumped) {
          this.tutorialStep = 2;
          this.showTutorialStep();
        }
      });
    }
  }

  update(time: number, rawDelta: number) {
    if (this.gameOver) return;
    const delta = Math.min(rawDelta, 33.33); // cap at ~30fps to prevent teleporting on tab resume

    this.player.update(delta);
    this.difficultySystem.update(delta);
    this.scoreSystem.update(delta);
    this.spawnSystem.update(delta);
    this.missionSystem.update(delta);
    this.powerUpSystem.update(delta);

    // Power-up spawning
    this.powerUpTimer += delta;
    if (this.powerUpTimer >= this.nextPowerUpAt) {
      this.powerUpTimer = 0;
      this.nextPowerUpAt = 20000 + Math.random() * 10000;
      this.spawnPowerUp();
    }

    // Magnet effect — attract coins (power-up range 60, passive range from upgrades)
    const magnetRange = this.powerUpSystem.isActive('magnet') ? 60 : this.passiveMagnetRange;
    if (magnetRange > 0) {
      const px = this.player.sprite.x;
      const py = this.player.sprite.y;
      this.coinGroup.getChildren().forEach((child) => {
        const coin = child as Phaser.GameObjects.Sprite;
        if (!coin.active) return;
        const dist = Phaser.Math.Distance.Between(px, py, coin.x, coin.y);
        if (dist < magnetRange) {
          const angle = Phaser.Math.Angle.Between(coin.x, coin.y, px, py);
          const magnetSpeed = 3 * (delta / 16.67);
          coin.x += Math.cos(angle) * magnetSpeed;
          coin.y += Math.sin(angle) * magnetSpeed;
        }
      });
    }

    // Shield visual
    if (this.powerUpSystem.isActive('shield')) {
      if (!this.shieldSprite) {
        this.shieldSprite = this.add.circle(0, 0, 16, 0x44ff44, 0.2);
        this.shieldSprite.setStrokeStyle(1, 0x44ff44, 0.6);
        this.shieldSprite.setDepth(100);
      }
      this.shieldSprite.setPosition(this.player.sprite.x, this.player.sprite.y);
    } else if (this.shieldSprite) {
      this.shieldSprite.destroy();
      this.shieldSprite = null;
    }

    // Recycle offscreen power-ups
    this.powerUpGroup.getChildren().forEach((child) => {
      const sprite = child as Phaser.GameObjects.Sprite;
      if (sprite.active && sprite.x < -20) {
        this.tweens.killTweensOf(sprite);
        sprite.setActive(false).setVisible(false);
        (sprite.body as Phaser.Physics.Arcade.Body).stop();
      }
    });

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

    if (!SettingsSystem.reducedMotion) {
      this.drawSpeedLines(speed, time);
      this.checkNearMiss();
    }
  }

  shutdown() {
    this.scoreSystem.destroy();
    this.audioSystem.destroy();
    this.spawnSystem.destroy();
    this.difficultySystem.destroy();
    this.missionSystem.destroy();
    this.powerUpSystem.destroy();
    if (this.shieldSprite) {
      this.shieldSprite.destroy();
      this.shieldSprite = null;
    }
    this.player.destroy();
  }

  private drawSpeedLines(speed: number, time: number): void {
    this.speedLineGfx.clear();
    if (speed < 400) return;

    const intensity = (speed - 400) / 200; // 0 to 1
    const alpha = intensity * 0.15;
    this.speedLineGfx.lineStyle(1, 0xffffff, alpha);

    for (let i = 0; i < 8; i++) {
      const y = ((time * 0.1 + i * 31) % GAME_HEIGHT);
      const len = 20 + intensity * 40;
      const x = ((time * 0.5 + i * 47) % (GAME_WIDTH + len)) - len;
      this.speedLineGfx.moveTo(x, y);
      this.speedLineGfx.lineTo(x + len, y);
    }
    this.speedLineGfx.strokePath();
  }

  private checkNearMiss(): void {
    if (this.player.isDead || this.player.isInvincible) return;
    const px = this.player.sprite.x;
    const py = this.player.sprite.y;

    this.enemyFactory.getGroup().getChildren().forEach((child) => {
      const enemy = child as Phaser.GameObjects.Sprite;
      if (!enemy.active) return;
      if (enemy.getData('nearMissTriggered')) return;

      const dist = Phaser.Math.Distance.Between(px, py, enemy.x, enemy.y);
      if (dist < 20 && dist > 10) {
        enemy.setData('nearMissTriggered', true);
        this.cameras.main.flash(80, 255, 255, 255);
        this.showFloatingText(px, py - 20, 'CLOSE!', '#ff44ff');
      }
    });
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

    const stompable = enemy.getData('stompable') !== false;
    // Stomp check: player is falling and above the enemy (and enemy is stompable)
    if (stompable && playerBody.velocity.y > 0 && playerBody.bottom < enemyBody.center.y) {
      // Stomp!
      enemy.setActive(false).setVisible(false);
      enemyBody.stop();
      this.player.bounce();
      EventBus.emit('enemy:stomp');

      // Hitstop — camera zoom punch for impact feel
      this.cameras.main.zoomTo(1.05, 40, 'Sine.easeOut', false, (_cam: Phaser.Cameras.Scene2D.Camera, progress: number) => {
        if (progress >= 1) this.cameras.main.zoomTo(1, 40);
      });

      // Sparkle effect
      this.createParticles(enemy.x, enemy.y, 0xffaa00, 8);

      // Score popup
      this.showFloatingText(enemy.x, enemy.y - 10, '+10', '#ffaa00');
    } else {
      // Check shield first
      if (this.powerUpSystem.consumeShield()) {
        this.createParticles(this.player.sprite.x, this.player.sprite.y, 0x44ff44, 8);
        this.showFloatingText(this.player.sprite.x, this.player.sprite.y - 15, 'SHIELD!', '#44ff44');
      } else {
        this.player.takeDamage();
      }
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

    const isDouble = this.powerUpSystem.isActive('double_coins');
    const coinValue = isDouble ? 2 : 1;
    EventBus.emit('coin:collect', { value: coinValue });

    // Sparkle effect
    this.createParticles(coin.x, coin.y, 0xffdd00, 6);

    // Coin fly-to-HUD
    const flyCircle = this.add.circle(coin.x, coin.y, 4, 0xffdd00);
    flyCircle.setDepth(600);
    this.tweens.add({
      targets: flyCircle,
      x: 16, y: 20,
      scale: 0.3,
      duration: 400,
      ease: 'Quad.easeIn',
      onComplete: () => flyCircle.destroy(),
    });

    // Score popup
    this.showFloatingText(coin.x, coin.y - 8, isDouble ? '+2' : '+1', '#ffdd00');
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

  private spawnPowerUp(): void {
    const types: PowerUpType[] = ['magnet', 'shield', 'double_coins', 'speed_boost'];
    const type = types[Math.floor(Math.random() * types.length)];
    const textureMap: Record<PowerUpType, string> = {
      magnet: 'powerup-magnet',
      shield: 'powerup-shield',
      double_coins: 'powerup-double',
      speed_boost: 'powerup-boost',
    };

    const x = GAME_WIDTH + 20;
    const y = 40 + Math.random() * (GAME_HEIGHT - 80);

    const sprite = this.powerUpGroup.create(x, y, textureMap[type]) as Phaser.GameObjects.Sprite;
    sprite.setData('powerUpType', type);
    const body = sprite.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(-this.difficultySystem.speed);
    body.setAllowGravity(false);

    // Pulsing glow
    this.tweens.add({
      targets: sprite,
      alpha: 0.5,
      duration: 400,
      yoyo: true,
      repeat: -1,
    });
  }

  private handlePowerUpCollect(_playerObj: any, powerUpObj: any): void {
    const sprite = powerUpObj as Phaser.GameObjects.Sprite;
    if (!sprite.active) return;

    const type = sprite.getData('powerUpType') as PowerUpType;
    this.tweens.killTweensOf(sprite);
    sprite.setActive(false).setVisible(false);
    (sprite.body as Phaser.Physics.Arcade.Body).stop();

    this.powerUpSystem.activate(type);
    this.createParticles(sprite.x, sprite.y, 0x44ffff, 8);

    const names: Record<PowerUpType, string> = {
      magnet: 'MAGNET',
      shield: 'SHIELD',
      double_coins: '2X COINS',
      speed_boost: 'BOOST',
    };
    this.showFloatingText(sprite.x, sprite.y - 10, names[type], '#44ffff');
  }

  private createDustPuff(x: number, y: number): void {
    for (let i = 0; i < 4; i++) {
      const dx = (Math.random() - 0.5) * 16;
      const particle = this.add.circle(x + dx, y, 1.5, 0xcccccc, 0.6);
      this.tweens.add({
        targets: particle,
        y: particle.y - 6 - Math.random() * 4,
        x: particle.x + dx * 0.5,
        alpha: 0,
        scale: 0.2,
        duration: 200 + Math.random() * 100,
        onComplete: () => particle.destroy(),
      });
    }
  }

  private showFloatingText(x: number, y: number, text: string, color: string): void {
    const floater = this.add.text(x, y, text, {
      fontFamily: '"Press Start 2P"',
      fontSize: '6px',
      color,
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(500);

    this.tweens.add({
      targets: floater,
      y: y - 20,
      alpha: 0,
      duration: 600,
      ease: 'Quad.easeOut',
      onComplete: () => floater.destroy(),
    });
  }

  // --- Tutorial ---

  private showTutorialStep(): void {
    if (this.tutorialText) {
      this.tutorialText.destroy();
      this.tutorialText = null;
    }

    const messages = [
      'TAP / SPACE TO JUMP',
      'HOLD FOR HIGHER JUMP',
      'TAP AGAIN FOR DOUBLE JUMP',
      'STOMP ENEMIES FROM ABOVE!',
    ];

    if (this.tutorialStep < 0 || this.tutorialStep >= messages.length) return;

    this.tutorialText = this.add.text(
      GAME_WIDTH / 2, 30,
      messages[this.tutorialStep],
      {
        fontFamily: '"Press Start 2P"',
        fontSize: '7px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
        backgroundColor: '#00000088',
        padding: { x: 6, y: 4 },
      },
    ).setOrigin(0.5).setDepth(900);

    // Pulse animation
    this.tweens.add({
      targets: this.tutorialText,
      alpha: 0.5,
      duration: 600,
      yoyo: true,
      repeat: -1,
    });
  }

  private finishTutorial(): void {
    this.tutorialStep = -1;
    if (this.tutorialText) {
      this.tutorialText.destroy();
      this.tutorialText = null;
    }
    this.saveSystem.setTutorialDone();
  }
}
