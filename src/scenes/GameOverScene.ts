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

// Shared text style helper — DRY the fontFamily boilerplate.
const F = (size: number, color: string, stroke = false) => ({
  fontFamily: '"Press Start 2P"',
  fontSize: `${size}px`,
  color,
  ...(stroke ? { stroke: '#000000', strokeThickness: 3 } : {}),
});

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  create(data: GameOverData) {
    // Store data in registry so it survives Shop/Upgrade round-trips
    if (data?.score !== undefined) {
      this.registry.set('lastGameOver', data);
    } else {
      data = this.registry.get('lastGameOver') as GameOverData;
      if (!data) {
        this.scene.start('MenuScene');
        return;
      }
    }

    this.scene.stop('UIScene');
    InstallManager.incrementGamesPlayed();

    const cx = GAME_WIDTH / 2;

    // Dark overlay
    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.75);

    // ---- Title region ----
    this.add.text(cx, 28, 'GAME OVER', F(16, '#ff4444', true)).setOrigin(0.5);

    // ---- Score block — vertically centered in the upper-middle ----
    this.add.text(cx, 58, `SCORE: ${data.score}`, F(12, '#ffffff')).setOrigin(0.5);
    this.add.text(cx, 78, `BEST: ${data.highScore}`, F(7, '#ffdd00')).setOrigin(0.5);

    // Thin separator
    const sepW = 120;
    this.add.rectangle(cx, 90, sepW, 1, 0xffffff, 0.15);

    this.add.text(cx, 100, `COINS: ${data.coins}`, F(6, '#ffdd00')).setOrigin(0.5);
    this.add.text(cx, 112, `STOMPS: ${data.stomps}`, F(6, '#ffdd00')).setOrigin(0.5);

    // ---- Mission results ----
    let nextY = 124;
    if (data.missions && data.missions.length > 0) {
      const completed = data.missions.filter((m) => m.completed);
      if (completed.length > 0) {
        this.add.text(cx, nextY, 'MISSIONS:', F(5, '#44ff44')).setOrigin(0.5);
        nextY += 10;
        completed.forEach((m) => {
          this.add.text(cx, nextY, `${m.description} +${m.reward}C`, F(5, '#44ff44')).setOrigin(0.5);
          nextY += 9;
        });
      }
      if (data.bonusCoins > 0) {
        this.add.text(cx, nextY + 2, `BONUS: +${data.bonusCoins} COINS`, F(6, '#ffdd00')).setOrigin(0.5);
      }
    }

    // ---- Primary action ----
    makeButton(this, cx, 160, 'TAP TO RETRY', F(10, '#44ff44'), () => this.retry());

    // ---- Bottom nav — evenly spaced across the width ----
    const navY = 190;
    const cols = 4;
    const pad = GAME_WIDTH * 0.08; // 8% margin on each side
    const step = (GAME_WIDTH - pad * 2) / (cols - 1);
    const navStyle = { fontFamily: '"Press Start 2P"', fontSize: '7px' };

    makeButton(this, pad, navY, 'HOME', { ...navStyle, color: '#aaaaaa' }, () => {
      this.scene.stop('GameScene');
      this.scene.start('MenuScene');
    });

    const shareBtn = makeButton(this, pad + step, navY, 'SHARE', { ...navStyle, color: '#ff88ff' }, () => {
      const msg = `I scored ${data.score} on TurboHop! Can you beat me? https://bigknoxy.github.io/TurboHop/`;
      if (navigator.share) {
        navigator.share({ title: 'TurboHop', text: msg }).catch(() => {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(msg).then(() => {
          shareBtn.setText('COPIED!');
          this.time.delayedCall(1500, () => shareBtn.setText('SHARE'));
        }).catch(() => {});
      }
    });

    makeButton(this, pad + step * 2, navY, 'SHOP', { ...navStyle, color: '#44aaff' }, () =>
      this.scene.start('ShopScene', { from: 'GameOverScene' }),
    );

    makeButton(this, pad + step * 3, navY, 'UPGRADES', { ...navStyle, color: '#ffaa44' }, () =>
      this.scene.start('UpgradeScene', { from: 'GameOverScene' }),
    );

    this.input.keyboard?.once('keydown-SPACE', () => this.retry());
  }

  private retry() {
    this.scene.start('GameScene');
    this.scene.launch('UIScene');
  }
}
