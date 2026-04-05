import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { version } from '../../package.json';
import { SaveSystem } from '../systems/SaveSystem';
import { DailyRewardSystem, DailyRewardResult } from '../systems/DailyRewardSystem';
import { fadeIn, fadeOut } from '../utils/TransitionHelper';
import { makeButton, addFullscreenButton } from '../utils/ButtonHelper';

export class MenuScene extends Phaser.Scene {
  private titleText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;
  private blinkTimer = 0;
  private canStart = true;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    this.canStart = true;
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg-sky');

    this.titleText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 3 - 10, 'TURBOHOP', {
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
    const highScore = parseInt(localStorage.getItem('turbohop_highscore') || '0', 10);
    if (highScore > 0) {
      this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT - 40, `HI: ${highScore}`, {
          fontFamily: '"Press Start 2P"',
          fontSize: '8px',
          color: '#aaaaaa',
        })
        .setOrigin(0.5);
    }

    // Fullscreen button (top-right)
    addFullscreenButton(this, GAME_WIDTH - 8, 8);

    // Settings button
    makeButton(this, GAME_WIDTH / 4, GAME_HEIGHT - 18, 'SETTINGS', {
      fontFamily: '"Press Start 2P"', fontSize: '6px', color: '#888888',
    }, () => {
      fadeOut(this, 200, () => this.scene.start('SettingsScene'));
    });

    // Upgrades button with hover feedback
    makeButton(this, (GAME_WIDTH * 3) / 4, GAME_HEIGHT - 18, 'UPGRADES', {
      fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#ffaa44',
    }, () => {
      fadeOut(this, 200, () => this.scene.start('UpgradeScene'));
    });

    // Version
    this.add.text(GAME_WIDTH - 4, GAME_HEIGHT - 4, `v${version}`, {
      fontFamily: '"Press Start 2P"',
      fontSize: '4px',
      color: '#444444',
    }).setOrigin(1, 1);

    // Fade in
    fadeIn(this, 300);

    // Check daily reward
    const saveSystem = new SaveSystem();
    const dailySystem = new DailyRewardSystem(saveSystem);
    const result = dailySystem.check();

    if (result.claimed) {
      this.canStart = false;
      this.showDailyReward(result, dailySystem);
    }

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Don't start if a button was tapped (check if pointer hit any interactive object)
      const hitObjects = this.input.hitTestPointer(pointer);
      if (hitObjects.length > 0) return;
      if (this.canStart) this.startGame();
    });
    this.input.keyboard?.on('keydown-SPACE', () => {
      if (this.canStart) this.startGame();
    });

    this.blinkTimer = 0;
  }

  update(_time: number, delta: number) {
    this.blinkTimer += delta;
    this.promptText.setAlpha(Math.sin(this.blinkTimer * 0.005) > 0 ? 1 : 0.3);
  }

  private showDailyReward(result: DailyRewardResult, dailySystem: DailyRewardSystem): void {
    const panel = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 200, 100, 0x000000, 0.85);
    panel.setStrokeStyle(2, 0xffdd00);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30, 'DAILY REWARD!', {
      fontFamily: '"Press Start 2P"',
      fontSize: '8px',
      color: '#ffdd00',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 10, `DAY ${result.streak}/${result.maxStreak}`, {
      fontFamily: '"Press Start 2P"',
      fontSize: '7px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 8, `+${result.reward} COINS`, {
      fontFamily: '"Press Start 2P"',
      fontSize: '10px',
      color: '#ffdd00',
    }).setOrigin(0.5);

    const claimBtn = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 32, 'CLAIM', {
      fontFamily: '"Press Start 2P"',
      fontSize: '8px',
      color: '#44ff44',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    claimBtn.on('pointerdown', () => {
      dailySystem.claim(result);
      panel.destroy();
      claimBtn.destroy();
      this.canStart = true;
      // Destroy all daily reward text (refresh scene simply)
      this.scene.restart();
    });
  }

  private startGame() {
    fadeOut(this, 200, () => {
      this.scene.start('GameScene');
      this.scene.launch('UIScene');
    });
  }
}
