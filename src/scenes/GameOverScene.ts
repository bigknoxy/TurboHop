import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import type { Mission } from '../systems/MissionSystem';
import { makeButton } from '../utils/ButtonHelper';
import { InstallManager } from '../systems/InstallManager';

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

    // Track games played for install prompt
    InstallManager.incrementGamesPlayed();

    this.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2,
      GAME_WIDTH, GAME_HEIGHT,
      0x000000, 0.7,
    ).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 20, 'GAME OVER', {
      fontFamily: '"Press Start 2P"',
      fontSize: '16px',
      color: '#ff4444',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 50, `SCORE: ${data.score}`, {
      fontFamily: '"Press Start 2P"',
      fontSize: '10px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 66, `BEST: ${data.highScore}`, {
      fontFamily: '"Press Start 2P"',
      fontSize: '7px',
      color: '#ffdd00',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 80, `COINS: ${data.coins}  STOMPS: ${data.stomps}`, {
      fontFamily: '"Press Start 2P"',
      fontSize: '6px',
      color: '#ffdd00',
    }).setOrigin(0.5);

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

    // Retry button (primary)
    makeButton(this, GAME_WIDTH / 2, 150, 'TAP TO RETRY', {
      fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#44ff44',
    }, () => this.retry());

    // Bottom row: HOME, SHARE, SHOP, UPGRADES
    const btnStyle = { fontFamily: '"Press Start 2P"', fontSize: '6px' };
    const btnY = 175;

    makeButton(this, GAME_WIDTH * 1 / 5, btnY, 'HOME', {
      ...btnStyle, color: '#aaaaaa',
    }, () => {
      this.scene.stop('GameScene');
      this.scene.start('MenuScene');
    });

    const shareBtn = makeButton(this, GAME_WIDTH * 2 / 5, btnY, 'SHARE', {
      ...btnStyle, color: '#ff88ff',
    }, () => {
      const shareMsg = `I scored ${data.score} on TurboHop! Stomped ${data.stomps} enemies and collected ${data.coins} coins. Can you beat me? https://bigknoxy.github.io/TurboHop/`;
      if (navigator.share) {
        navigator.share({ title: 'TurboHop', text: shareMsg }).catch(() => {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(shareMsg).then(() => {
          shareBtn.setText('COPIED!');
          this.time.delayedCall(1500, () => shareBtn.setText('SHARE'));
        }).catch(() => {});
      }
    });

    makeButton(this, GAME_WIDTH * 3 / 5, btnY, 'SHOP', {
      ...btnStyle, color: '#44aaff',
    }, () => this.scene.start('ShopScene'));

    makeButton(this, GAME_WIDTH * 4 / 5, btnY, 'UPGRADES', {
      ...btnStyle, color: '#ffaa44',
    }, () => this.scene.start('UpgradeScene'));

    // Keyboard retry
    this.input.keyboard?.once('keydown-SPACE', () => this.retry());
  }

  private retry() {
    this.scene.start('GameScene');
    this.scene.launch('UIScene');
  }
}
