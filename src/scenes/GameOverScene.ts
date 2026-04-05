import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { EventBus } from '../utils/EventBus';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  create(data: { score: number; coins: number; highScore: number }) {
    this.scene.stop('UIScene');

    const overlay = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      0x000000,
      0.7,
    );
    overlay.setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 30, 'GAME OVER', {
        fontFamily: '"Press Start 2P"',
        fontSize: '16px',
        color: '#ff4444',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 70, `SCORE: ${data.score}`, {
        fontFamily: '"Press Start 2P"',
        fontSize: '10px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 90, `BEST: ${data.highScore}`, {
        fontFamily: '"Press Start 2P"',
        fontSize: '8px',
        color: '#ffdd00',
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 110, `COINS: ${data.coins}`, {
        fontFamily: '"Press Start 2P"',
        fontSize: '8px',
        color: '#ffdd00',
      })
      .setOrigin(0.5);

    // Retry button
    const retryText = this.add
      .text(GAME_WIDTH / 2, 150, 'TAP TO RETRY', {
        fontFamily: '"Press Start 2P"',
        fontSize: '10px',
        color: '#44ff44',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    retryText.on('pointerdown', () => this.retry());

    // Shop button
    const shopText = this.add
      .text(GAME_WIDTH / 2, 180, 'SHOP', {
        fontFamily: '"Press Start 2P"',
        fontSize: '8px',
        color: '#44aaff',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    shopText.on('pointerdown', () => {
      this.scene.start('ShopScene');
    });

    // Keyboard retry
    this.input.keyboard?.once('keydown-SPACE', () => this.retry());

    // Also allow tap anywhere after a short delay
    this.time.delayedCall(500, () => {
      this.input.once('pointerdown', () => this.retry());
    });
  }

  private retry() {
    EventBus.removeAllListeners();
    this.scene.start('GameScene');
    this.scene.launch('UIScene');
  }
}
