import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { DailyChallengeSystem } from '../systems/DailyChallengeSystem';
import { IDailyChallenge } from '../interfaces/IBackendService';

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
    this.container = this.scene.add.container(GAME_WIDTH / 2, 70);

    const panel = this.scene.add.rectangle(0, 0, 280, 50, 0x000000, 0.85);
    panel.setStrokeStyle(2, 0xffdd00);

    const title = this.scene.add.text(-130, -18, 'DAILY CHALLENGE', {
      fontFamily: '"Press Start 2P"',
      fontSize: '6px',
      color: '#ffdd00',
    });

    const date = this.scene.add.text(-130, -8, `Date: ${this.challenge?.date}`, {
      fontFamily: '"Press Start 2P"',
      fontSize: '4px',
      color: '#aaaaaa',
    });

    const seed = this.scene.add.text(-130, 2, `Seed: ${this.challenge?.seed}`, {
      fontFamily: '"Press Start 2P"',
      fontSize: '4px',
      color: '#aaaaaa',
    });

    const playBtn = this.scene.add.text(130, 0, 'PLAY', {
      fontFamily: '"Press Start 2P"',
      fontSize: '7px',
      color: '#44ff44',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

    playBtn.on('pointerdown', () => {
      this.dismiss();
      this.scene.scene.start('GameScene');
      this.scene.scene.launch('UIScene');
    });

    const closeBtn = this.scene.add.text(130, -20, 'X', {
      fontFamily: '"Press Start 2P"',
      fontSize: '6px',
      color: '#666666',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

    closeBtn.on('pointerdown', () => {
      this.dismiss();
    });

    this.container.add([panel, title, date, seed, playBtn, closeBtn]);
    this.container.setDepth(100);
  }

  private showCompletedBanner(): void {
    this.container = this.scene.add.container(GAME_WIDTH / 2, 70);

    const panel = this.scene.add.rectangle(0, 0, 280, 50, 0x000000, 0.85);
    panel.setStrokeStyle(2, 0x44ff44);

    const title = this.scene.add.text(0, -18, 'CHALLENGE COMPLETE!', {
      fontFamily: '"Press Start 2P"',
      fontSize: '6px',
      color: '#44ff44',
    }).setOrigin(0.5);

    const pb = this.dailyChallengeSystem.check().personalBest;
    const subtitle = this.scene.add.text(0, -8, `Best: ${pb ?? 0}`, {
      fontFamily: '"Press Start 2P"',
      fontSize: '4px',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    const message = this.scene.add.text(0, 8, 'Come back tomorrow!', {
      fontFamily: '"Press Start 2P"',
      fontSize: '5px',
      color: '#ffdd00',
    }).setOrigin(0.5);

    const closeBtn = this.scene.add.text(130, -20, 'X', {
      fontFamily: '"Press Start 2P"',
      fontSize: '6px',
      color: '#666666',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

    closeBtn.on('pointerdown', () => {
      this.dismiss();
    });

    this.container.add([panel, title, subtitle, message, closeBtn]);
    this.container.setDepth(100);
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
