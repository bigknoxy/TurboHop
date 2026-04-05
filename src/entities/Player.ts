import Phaser from 'phaser';
import { Entity } from './Entity';
import { JumpComponent } from '../components/JumpComponent';
import { PLAYER_START_X, PLAYER_START_Y, GAME_HEIGHT } from '../constants';
import { EventBus } from '../utils/EventBus';

export class Player extends Entity {
  public body!: Phaser.Physics.Arcade.Body;
  private scene: Phaser.Scene;
  private jumpComp!: JumpComponent;
  private isDown = false;
  private invincible = false;
  private invincibleTimer = 0;
  private hp = 3;
  private maxHp = 3;
  private dead = false;

  constructor(scene: Phaser.Scene) {
    super();
    this.scene = scene;

    // Apply skin color
    const skinName = localStorage.getItem('turbohop_skin') || 'BLUE';
    const skinColors: Record<string, number> = {
      BLUE: 0x4488ff,
      RED: 0xff4444,
      GREEN: 0x44ff44,
      GOLD: 0xffdd00,
      PURPLE: 0xaa44ff,
    };
    const color = skinColors[skinName] ?? 0x4488ff;

    // Generate skin-specific texture if needed
    if (skinName !== 'BLUE' && !scene.textures.exists(`player-${skinName}`)) {
      const gfx = scene.make.graphics({ x: 0, y: 0 }, false);
      gfx.fillStyle(color);
      gfx.fillRect(0, 0, 16, 24);
      gfx.fillStyle(0xffffff);
      gfx.fillRect(4, 6, 4, 4);
      gfx.fillRect(10, 6, 4, 4);
      gfx.fillStyle(0x000000);
      gfx.fillRect(6, 7, 2, 3);
      gfx.fillRect(12, 7, 2, 3);
      gfx.fillStyle(0xffaa44);
      gfx.fillRect(5, 14, 6, 2);
      gfx.generateTexture(`player-${skinName}`, 16, 24);
      gfx.destroy();
    }

    const textureKey = skinName === 'BLUE' ? 'player' : `player-${skinName}`;
    this.sprite = scene.add.sprite(PLAYER_START_X, PLAYER_START_Y, textureKey);
    scene.physics.add.existing(this.sprite);

    this.body = this.sprite.body as Phaser.Physics.Arcade.Body;
    this.body.setSize(14, 22);
    this.body.setOffset(1, 1);
    this.body.setCollideWorldBounds(false);

    this.jumpComp = this.addComponent('jump', new JumpComponent(this.body));

    // Input
    scene.input.on('pointerdown', () => this.onInputDown());
    scene.input.on('pointerup', () => this.onInputUp());

    const keyboard = scene.input.keyboard;
    if (keyboard) {
      keyboard.on('keydown-SPACE', () => this.onInputDown());
      keyboard.on('keyup-SPACE', () => this.onInputUp());
      keyboard.on('keydown-UP', () => this.onInputDown());
      keyboard.on('keyup-UP', () => this.onInputUp());
    }

    EventBus.emit('player:hp', { hp: this.hp, maxHp: this.maxHp });
  }

  private onInputDown() {
    if (this.dead) return;
    this.isDown = true;
    if (this.jumpComp.tryJump()) {
      EventBus.emit('player:jump');
    }
  }

  private onInputUp() {
    this.isDown = false;
    this.jumpComp.releaseJump();
  }

  takeDamage(): void {
    if (this.invincible || this.dead) return;
    this.hp--;
    EventBus.emit('player:hp', { hp: this.hp, maxHp: this.maxHp });
    EventBus.emit('player:hit');

    if (this.hp <= 0) {
      this.dead = true;
      EventBus.emit('player:dead');
      return;
    }

    this.invincible = true;
    this.invincibleTimer = 1500;
  }

  bounce(): void {
    this.body.setVelocityY(-250);
  }

  get isDead(): boolean {
    return this.dead;
  }

  get isInvincible(): boolean {
    return this.invincible;
  }

  update(delta: number): void {
    super.update(delta);

    if (this.dead) return;

    // Variable jump hold
    if (this.isDown) {
      this.jumpComp.holdJump(delta);
    }

    // Invincibility timer + blink
    if (this.invincible) {
      this.invincibleTimer -= delta;
      this.sprite.setAlpha(Math.sin(this.invincibleTimer * 0.02) > 0 ? 1 : 0.3);
      if (this.invincibleTimer <= 0) {
        this.invincible = false;
        this.sprite.setAlpha(1);
      }
    }

    // Death by falling off screen
    if (this.sprite.y > GAME_HEIGHT + 50) {
      this.dead = true;
      EventBus.emit('player:dead');
    }
  }

  destroy(): void {
    super.destroy();
    this.sprite.destroy();
  }
}
