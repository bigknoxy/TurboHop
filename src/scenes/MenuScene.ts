import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';

export class MenuScene extends Phaser.Scene {
  private titleText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;
  private blinkTimer = 0;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg-sky');

    this.titleText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 3, 'TURBOHOP', {
        fontFamily: '"Press Start 2P"',
        fontSize: '24px',
        color: '#ffdd00',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    this.promptText = this.add
      .text(GAME_WIDTH / 2, (GAME_HEIGHT * 2) / 3, 'TAP TO START', {
        fontFamily: '"Press Start 2P"',
        fontSize: '10px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    // High score display
    const highScore = parseInt(localStorage.getItem('turbohop_highscore') || '0');
    if (highScore > 0) {
      this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT - 30, `HI: ${highScore}`, {
          fontFamily: '"Press Start 2P"',
          fontSize: '8px',
          color: '#aaaaaa',
        })
        .setOrigin(0.5);
    }

    this.input.once('pointerdown', () => this.startGame());
    this.input.keyboard?.once('keydown-SPACE', () => this.startGame());

    this.blinkTimer = 0;
  }

  update(_time: number, delta: number) {
    this.blinkTimer += delta;
    this.promptText.setAlpha(Math.sin(this.blinkTimer * 0.005) > 0 ? 1 : 0.3);
  }

  private startGame() {
    this.scene.start('GameScene');
    this.scene.launch('UIScene');
  }
}
