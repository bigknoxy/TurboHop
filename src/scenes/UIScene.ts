import Phaser from 'phaser';
import { GAME_WIDTH } from '../constants';
import { EventBus } from '../utils/EventBus';

export class UIScene extends Phaser.Scene {
  private scoreText!: Phaser.GameObjects.Text;
  private coinText!: Phaser.GameObjects.Text;
  private hearts: Phaser.GameObjects.Image[] = [];
  private muteBtn!: Phaser.GameObjects.Text;
  private muted = false;

  constructor() {
    super({ key: 'UIScene' });
  }

  create() {
    // Score
    this.scoreText = this.add.text(8, 4, 'SCORE: 0', {
      fontFamily: '"Press Start 2P"',
      fontSize: '7px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
    });

    // Coins
    this.add.image(8, 20, 'coin').setScale(0.8).setOrigin(0, 0.5);
    this.coinText = this.add.text(22, 16, '0', {
      fontFamily: '"Press Start 2P"',
      fontSize: '7px',
      color: '#ffdd00',
      stroke: '#000000',
      strokeThickness: 2,
    });

    // Hearts (HP)
    this.hearts = [];
    for (let i = 0; i < 3; i++) {
      const heart = this.add.image(GAME_WIDTH - 20 - i * 16, 10, 'heart').setScale(0.7);
      this.hearts.push(heart);
    }

    // Mute button
    this.muteBtn = this.add
      .text(GAME_WIDTH - 10, 24, 'SND', {
        fontFamily: '"Press Start 2P"',
        fontSize: '5px',
        color: '#888888',
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });

    this.muteBtn.on('pointerdown', () => {
      this.muted = !this.muted;
      EventBus.emit('audio:toggle');
      this.muteBtn.setColor(this.muted ? '#ff4444' : '#888888');
      this.muteBtn.setText(this.muted ? 'MUTE' : 'SND');
    });

    // Listen to events
    EventBus.on('score:update', (data: { score: number; coins: number }) => {
      this.scoreText.setText(`SCORE: ${data.score}`);
      this.coinText.setText(`${data.coins}`);
    });

    EventBus.on('player:hp', (data: { hp: number; maxHp: number }) => {
      this.hearts.forEach((heart, i) => {
        heart.setAlpha(i < data.hp ? 1 : 0.2);
      });
    });
  }
}
