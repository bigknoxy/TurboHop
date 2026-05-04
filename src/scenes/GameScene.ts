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

      // Death particles (player-colored fragments with gravity)
      const playerColor = 0x4488ff; // default player color
      this.createDeathParticles(this.player.sprite.x, this.player.sprite.y, playerColor, 12);

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
      // Mission complete slides in from left with bounce
      const missionText = this.add.text(-200, GAME_HEIGHT / 2 - 20, `MISSION: ${data.mission.description}`, {
        fontFamily: '"Press Start 2P"',
        fontSize: '8px',
        color: '#44ff44',
        stroke: '#000000',
        strokeThickness: 2,
        backgroundColor: '#00000088',
        padding: { x: 8, y: 4 },
      }).setOrigin(0, 0.5).setDepth(600);

      this.tweens.add({
        targets: missionText,
        x: 10,
        duration: 400,
        ease: 'Bounce.easeOut',
        onComplete: () => {
          this.time.delayedCall(2000, () => {
            this.tweens.add({
              targets: missionText,
              alpha: 0,
              x: -200,
              duration: 300,
              ease: 'Power2',
              onComplete: () => missionText.destroy(),
            });
          });
        },
      });

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
      this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'vignette').setName('vignette-overlay').setDepth(999).setScrollFactor(0).setAlpha(0.25);
    }

    // Fade in from black
    fadeIn(this, 400);

    // CRT power-on effect
    this.doCRTPowerOn();

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

    const intensity = (speed - 400) / 200; //0 to 1

    // Chromatic aberration effect - draw speed lines with RGB offset
    const aberrationOffset = Math.floor(intensity * 3);

    // Red channel (offset left)
    this.speedLineGfx.lineStyle(1, 0xff0000, intensity * 0.1);
    for (let i = 0; i < 8; i++) {
      const y = ((time * 0.1 + i * 31) % GAME_HEIGHT);
      const len = 20 + intensity * 40;
      const x = ((time * 0.5 + i * 47) % (GAME_WIDTH + len)) - len - aberrationOffset;
      this.speedLineGfx.moveTo(x, y);
      this.speedLineGfx.lineTo(x + len, y);
    }

    // Green channel (center)
    this.speedLineGfx.lineStyle(1, 0x00ff00, intensity * 0.08);
    for (let i = 0; i < 8; i++) {
      const y = ((time * 0.1 + i * 31 + 10) % GAME_HEIGHT);
      const len = 20 + intensity * 40;
      const x = ((time * 0.5 + i * 47 + 20) % (GAME_WIDTH + len)) - len;
      this.speedLineGfx.moveTo(x, y);
      this.speedLineGfx.lineTo(x + len, y);
    }

    // Blue channel (offset right)
    this.speedLineGfx.lineStyle(1, 0x0000ff, intensity * 0.1);
    for (let i = 0; i < 8; i++) {
      const y = ((time * 0.1 + i * 31 + 20) % GAME_HEIGHT);
      const len = 20 + intensity * 40;
      const x = ((time * 0.5 + i * 47 + 40) % (GAME_WIDTH + len)) - len + aberrationOffset;
      this.speedLineGfx.moveTo(x, y);
      this.speedLineGfx.lineTo(x + len, y);
    }

    // White core lines
    this.speedLineGfx.lineStyle(1, 0xffffff, intensity * 0.15);
    for (let i = 0; i < 8; i++) {
      const y = ((time * 0.1 + i * 31) % GAME_HEIGHT);
      const len = 20 + intensity * 40;
      const x = ((time * 0.5 + i * 47) % (GAME_WIDTH + len)) - len;
      this.speedLineGfx.moveTo(x, y);
      this.speedLineGfx.lineTo(x + len, y);
    }

    this.speedLineGfx.strokePath();

    // Update scanline intensity based on speed
    this.updateScanlineIntensity(intensity);

    // Update vignette/curvature effect based on speed
    this.updateVignetteIntensity(intensity, time);
  }

  private updateScanlineIntensity(intensity: number): void {
    // Increase scanline visibility with speed
    const scanlineAlpha = 0.12 + intensity * 0.18; // 0.12 to 0.30
    this.scanlineGfx.clear();
    if (!SettingsSystem.reducedMotion) {
      this.scanlineGfx.setScrollFactor(0);
      this.scanlineGfx.setDepth(1000);
      this.scanlineGfx.lineStyle(1, 0x000000, scanlineAlpha);
      for (let y = 0; y < GAME_HEIGHT; y += 2) {
        this.scanlineGfx.moveTo(0, y);
        this.scanlineGfx.lineTo(GAME_WIDTH, y);
      }
      this.scanlineGfx.strokePath();
    }
  }

  private updateVignetteIntensity(intensity: number, _time: number): void {
    // Screen curvature effect - vignette that increases with speed
    // This is handled by the vignette overlay that's already created
    // We just adjust its alpha based on speed
    const vignetteSprite = this.children.getByName('vignette-overlay') as Phaser.GameObjects.Image;
    if (vignetteSprite) {
      vignetteSprite.setAlpha(0.25 + intensity * 0.35); // 0.25 to 0.60
    }
  }

  private doCRTPowerOn(): void {
    // CRT power-on effect: scanlines fade in, slight flicker
    if (SettingsSystem.reducedMotion) return;

    // Start with scanlines invisible
    this.scanlineGfx.setAlpha(0);

    // Flicker effect (rapid on-off-on)
    const flickerTween = this.tweens.add({
      targets: this.scanlineGfx,
      alpha: 1,
      duration: 100,
      yoyo: true,
      repeat: 3,
      onComplete: () => {
        // Final fade in
        this.tweens.add({
          targets: this.scanlineGfx,
          alpha: 1,
          duration: 200,
        });
      },
    });

    // Add a slight "warm-up" delay to the vignette
    const vignetteSprite = this.children.getByName('vignette-overlay') as Phaser.GameObjects.Image;
    if (vignetteSprite) {
      vignetteSprite.setAlpha(0);
      this.tweens.add({
        targets: vignetteSprite,
        alpha: 0.25,
        duration: 600,
        delay: 200,
        ease: 'Power2',
      });
    }
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
        this.createNearMissSparkle(px, py - 10);
        EventBus.emit('near-miss');
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

      // Pixel burst effect (enemy-colored)
      const enemyColor = this.getEnemyColor(enemy);
      this.createPixelBurst(enemy.x, enemy.y, enemyColor, 10);

      // Score popup
      this.showFloatingText(enemy.x, enemy.y - 10, '+10', '#ffaa00');
    } else {
      // Check shield first
      if (this.powerUpSystem.consumeShield()) {
        this.createPixelBurst(this.player.sprite.x, this.player.sprite.y, 0x44ff44, 8);
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

    // Sparkle effect (star-shaped particles)
    this.createStarParticles(coin.x, coin.y, 0xffdd00, 8);

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
    // Generic particle burst - small squares flying outward
    for (let i = 0; i < count; i++) {
      const particle = this.add.rectangle(x, y, 2, 2, color);
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

  private createStarParticles(x: number, y: number, color: number, count: number): void {
    // Star-shaped particles for coin collect
    for (let i = 0; i < count; i++) {
      const g = this.add.graphics({ x: x, y: y });
      // Draw a small star
      const size = 2 + Math.random() * 2;
      g.fillStyle(color, 1);
      // 4-point star
      g.fillRect(-size/2, -size, size, size * 2); // vertical
      g.fillRect(-size, -size/2, size * 2, size); // horizontal
      g.fillStyle(0xffffff, 0.6);
      g.fillRect(-size/4, -size/2, size/2, size); // inner vertical
      g.fillRect(-size/2, -size/4, size, size/2); // inner horizontal

      const angle = (Math.PI * 2 * i) / count;
      const speed = 30 + Math.random() * 40;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed - 20; // slight upward bias

      this.tweens.add({
        targets: g,
        x: g.x + vx,
        y: g.y + vy,
        alpha: 0,
        scale: 0.1,
        duration: 400 + Math.random() * 200,
        onComplete: () => g.destroy(),
      });
    }
  }

  private createPixelBurst(x: number, y: number, color: number, count: number): void {
    // Enemy-colored pixel burst (small squares)
    for (let i = 0; i < count; i++) {
      const size = 1 + Math.floor(Math.random() * 3);
      const pixel = this.add.rectangle(x, y, size, size, color);

      // Random direction with slight upward bias
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 50 + Math.random() * 60;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed - 30;

      this.tweens.add({
        targets: pixel,
        x: pixel.x + vx,
        y: pixel.y + vy,
        alpha: 0,
        duration: 350 + Math.random() * 150,
        onComplete: () => pixel.destroy(),
      });
    }
  }

  private createDeathParticles(x: number, y: number, color: number, count: number): void {
    // Player-colored fragments with gravity fall
    for (let i = 0; i < count; i++) {
      const width = 2 + Math.floor(Math.random() * 4);
      const height = 2 + Math.floor(Math.random() * 4);
      const fragment = this.add.rectangle(x, y, width, height, color);

      // Random horizontal velocity, downward gravity
      const vx = (Math.random() - 0.5) * 100;
      const startY = y;

      this.tweens.add({
        targets: fragment,
        x: fragment.x + vx,
        y: startY + 60 + Math.random() * 40, // fall down
        alpha: 0,
        angle: (Math.random() - 0.5) * 180, // spin
        duration: 600 + Math.random() * 400,
        ease: 'Power2',
        onComplete: () => fragment.destroy(),
      });
    }
  }

  private createDustPuff(x: number, y: number): void {
    // Landing dust puffs (2-3 tiny circles at player feet)
    const puffCount = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < puffCount; i++) {
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

  private createNearMissSparkle(x: number, y: number): void {
    // Tense particle sparkle for near misses
    for (let i =0; i < 4; i++) {
      const sparkle = this.add.star(x, y, 4, 1, 3, 0xff44ff, 0.8);
      const angle = (Math.PI * 2 * i) / 4 + Math.random() * 0.5;
      const speed = 20 + Math.random() * 20;

      this.tweens.add({
        targets: sparkle,
        x: sparkle.x + Math.cos(angle) * speed,
        y: sparkle.y + Math.sin(angle) * speed,
        alpha: 0,
        scale: 0.5,
        duration: 300,
        onComplete: () => sparkle.destroy(),
      });
    }
  }

  private getEnemyColor(enemy: Phaser.GameObjects.Sprite): number {
    // Return color based on enemy texture
    const textureKey = enemy.texture.key;
    if (textureKey === 'slime') return 0xdd3333;
    if (textureKey === 'bird') return 0xff8844;
    if (textureKey === 'bat') return 0x6633aa;
    if (textureKey === 'ghost') return 0xffffff;
    return 0xffffff; // default white
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
