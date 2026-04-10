import Phaser from 'phaser';
import { GAME_WIDTH } from '../constants';
import { DailyChallengeSystem } from '../systems/DailyChallengeSystem';
import { IDailyChallenge } from '../interfaces/IBackendService';

// Vertical center of the banner inside MenuScene. Placed in the gap between
// the TURBOHOP title (y ~62, ends ~74) and the TAP TO START prompt
// (y ~144, starts ~138) so the banner never obscures the title — that
// overlap was the "dark muddy title" bug visible in the Pixel 9a install
// screenshot.
const BANNER_Y = 108;
const BANNER_MAX_WIDTH = 280;
const BANNER_HEIGHT = 56;
/** Side margin kept clear of the viewport edges on narrow (e.g. 4:3 iPad) canvases. */
const BANNER_EDGE_MARGIN = 8;

function resolveBannerWidth(): number {
  // Clamp the banner so it always fits inside the current game width with
  // a small margin on each side. On a 480-wide Pixel 9a canvas this is
  // just `BANNER_MAX_WIDTH`; on a 288-wide iPad canvas it shrinks to 272.
  return Math.min(BANNER_MAX_WIDTH, GAME_WIDTH - BANNER_EDGE_MARGIN * 2);
}

export class DailyChallengeBanner {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container | null = null;
  private dailyChallengeSystem: DailyChallengeSystem;
  private challenge: IDailyChallenge | null = null;

  constructor(scene: Phaser.Scene, dailyChallengeSystem: DailyChallengeSystem) {
    this.scene = scene;
    this.dailyChallengeSystem = dailyChallengeSystem;
  }

  async show(): Promise<void> {
    if (!this.dailyChallengeSystem.isEnabled()) {
      return;
    }

    this.challenge = await this.dailyChallengeSystem.fetch();
    if (!this.challenge) {
      return;
    }

    const result = this.dailyChallengeSystem.check();
    if (result.completed) {
      this.showCompletedBanner();
    } else {
      this.showActiveBanner();
    }
  }

  private showActiveBanner(): void {
    const width = resolveBannerWidth();
    this.container = this.scene.add.container(GAME_WIDTH / 2, BANNER_Y);

    const panel = this.scene.add.rectangle(0, 0, width, BANNER_HEIGHT, 0x000000, 0.9);
    panel.setStrokeStyle(2, 0xffdd00);

    // Left-aligned info column. Padded 14px from the left edge of the panel.
    const leftX = -width / 2 + 14;

    const title = this.scene.add.text(leftX, -18, 'DAILY CHALLENGE', {
      fontFamily: '"Press Start 2P"',
      fontSize: '7px',
      color: '#ffdd00',
    });

    const date = this.scene.add.text(leftX, -4, `Date: ${this.challenge?.date}`, {
      fontFamily: '"Press Start 2P"',
      fontSize: '5px',
      color: '#ffffff',
    });

    const seed = this.scene.add.text(leftX, 8, `Seed: ${this.challenge?.seed}`, {
      fontFamily: '"Press Start 2P"',
      fontSize: '5px',
      color: '#ffffff',
    });

    // Right-side PLAY button with generous hit area for mobile taps.
    const playX = width / 2 - 14;
    const playBtn = this.scene.add.text(playX, 0, 'PLAY', {
      fontFamily: '"Press Start 2P"',
      fontSize: '10px',
      color: '#44ff44',
    }).setOrigin(1, 0.5);
    this.attachHitArea(playBtn, 14, 12);

    playBtn.on('pointerdown', () => {
      this.dismiss();
      this.scene.scene.start('GameScene');
      this.scene.scene.launch('UIScene');
    });

    const closeBtn = this.scene.add.text(playX, -BANNER_HEIGHT / 2 + 6, 'X', {
      fontFamily: '"Press Start 2P"',
      fontSize: '8px',
      color: '#888888',
    }).setOrigin(1, 0);
    this.attachHitArea(closeBtn, 10, 10);

    closeBtn.on('pointerdown', () => {
      this.dismiss();
    });

    this.container.add([panel, title, date, seed, playBtn, closeBtn]);
    this.container.setDepth(100);
  }

  private showCompletedBanner(): void {
    const width = resolveBannerWidth();
    this.container = this.scene.add.container(GAME_WIDTH / 2, BANNER_Y);

    const panel = this.scene.add.rectangle(0, 0, width, BANNER_HEIGHT, 0x000000, 0.9);
    panel.setStrokeStyle(2, 0x44ff44);

    const title = this.scene.add.text(0, -18, 'CHALLENGE COMPLETE!', {
      fontFamily: '"Press Start 2P"',
      fontSize: '7px',
      color: '#44ff44',
    }).setOrigin(0.5);

    const pb = this.dailyChallengeSystem.check().personalBest;
    const subtitle = this.scene.add.text(0, -4, `Best: ${pb ?? 0}`, {
      fontFamily: '"Press Start 2P"',
      fontSize: '5px',
      color: '#ffffff',
    }).setOrigin(0.5);

    const message = this.scene.add.text(0, 10, 'Come back tomorrow!', {
      fontFamily: '"Press Start 2P"',
      fontSize: '6px',
      color: '#ffdd00',
    }).setOrigin(0.5);

    const closeBtn = this.scene.add.text(width / 2 - 14, -BANNER_HEIGHT / 2 + 6, 'X', {
      fontFamily: '"Press Start 2P"',
      fontSize: '8px',
      color: '#888888',
    }).setOrigin(1, 0);
    this.attachHitArea(closeBtn, 10, 10);

    closeBtn.on('pointerdown', () => {
      this.dismiss();
    });

    this.container.add([panel, title, subtitle, message, closeBtn]);
    this.container.setDepth(100);
  }

  /** Expand a text object's tap target so small pixel fonts stay usable on mobile. */
  private attachHitArea(target: Phaser.GameObjects.Text, padX: number, padY: number): void {
    const hitArea = new Phaser.Geom.Rectangle(
      -padX,
      -padY,
      target.width + padX * 2,
      target.height + padY * 2,
    );
    target.setInteractive({
      hitArea,
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });
  }

  dismiss(): void {
    if (this.container) {
      this.container.destroy();
      this.container = null;
    }
  }

  destroy(): void {
    this.dismiss();
  }
}
