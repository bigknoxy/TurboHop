import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { Mission } from '../systems/MissionSystem';

interface GameOverData {
  score: number;
  coins: number;
  highScore: number;
  stomps: number;
  bonusCoins: number;
  missions: Mission[];
}

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  create(data: GameOverData) {
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
      .text(GAME_WIDTH / 2, 20, 'GAME OVER', {
        fontFamily: '"Press Start 2P"',
        fontSize: '16px',
        color: '#ff4444',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 50, `SCORE: ${data.score}`, {
        fontFamily: '"Press Start 2P"',
        fontSize: '10px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 66, `BEST: ${data.highScore}`, {
        fontFamily: '"Press Start 2P"',
        fontSize: '7px',
        color: '#ffdd00',
      })
      .setOrigin(0.5);

    // Stats row
    this.add
      .text(GAME_WIDTH / 2, 80, `COINS: ${data.coins}  STOMPS: ${data.stomps}`, {
        fontFamily: '"Press Start 2P"',
        fontSize: '6px',
        color: '#ffdd00',
      })
      .setOrigin(0.5);

    // Mission results
    if (data.missions && data.missions.length > 0) {
      let missionY = 94;
      const completedMissions = data.missions.filter((m) => m.completed);
      if (completedMissions.length > 0) {
        this.add.text(GAME_WIDTH / 2, missionY, 'MISSIONS COMPLETED:', {
          fontFamily: '"Press Start 2P"',
          fontSize: '5px',
          color: '#44ff44',
        }).setOrigin(0.5);
        missionY += 10;
        completedMissions.forEach((m) => {
          this.add.text(GAME_WIDTH / 2, missionY, `${m.description} +${m.reward}C`, {
            fontFamily: '"Press Start 2P"',
            fontSize: '4px',
            color: '#44ff44',
          }).setOrigin(0.5);
          missionY += 8;
        });
      }

      if (data.bonusCoins > 0) {
        this.add.text(GAME_WIDTH / 2, missionY + 2, `BONUS: +${data.bonusCoins} COINS`, {
          fontFamily: '"Press Start 2P"',
          fontSize: '6px',
          color: '#ffdd00',
        }).setOrigin(0.5);
      }
    }

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

    // Share button
    const shareText = this.add
      .text(GAME_WIDTH / 4, 172, 'SHARE', {
        fontFamily: '"Press Start 2P"',
        fontSize: '7px',
        color: '#ff88ff',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    shareText.on('pointerdown', () => {
      const shareMsg = `I scored ${data.score} on TurboHop! Stomped ${data.stomps} enemies and collected ${data.coins} coins. Can you beat me? https://bigknoxy.github.io/TurboHop/`;
      if (navigator.share) {
        navigator.share({ title: 'TurboHop', text: shareMsg }).catch(() => {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(shareMsg).then(() => {
          shareText.setText('COPIED!');
          this.time.delayedCall(1500, () => shareText.setText('SHARE'));
        }).catch(() => {});
      }
    });

    // Shop button
    const shopText = this.add
      .text(GAME_WIDTH / 2, 172, 'SHOP', {
        fontFamily: '"Press Start 2P"',
        fontSize: '7px',
        color: '#44aaff',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    shopText.on('pointerdown', () => {
      this.scene.start('ShopScene');
    });

    // Upgrades button
    const upgradeText = this.add
      .text((GAME_WIDTH * 3) / 4, 172, 'UPGRADES', {
        fontFamily: '"Press Start 2P"',
        fontSize: '7px',
        color: '#ffaa44',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    upgradeText.on('pointerdown', () => {
      this.scene.start('UpgradeScene');
    });

    // Keyboard retry
    this.input.keyboard?.once('keydown-SPACE', () => this.retry());
  }

  private retry() {
    this.scene.start('GameScene');
    this.scene.launch('UIScene');
  }
}
