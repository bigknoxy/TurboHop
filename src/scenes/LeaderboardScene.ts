import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { makeButton } from '../utils/ButtonHelper';
import { fadeIn, fadeOut } from '../utils/TransitionHelper';
import { DailyChallengeSystem } from '../systems/DailyChallengeSystem';
import { FirebaseService } from '../services/FirebaseService';
import { ILeaderboardEntry } from '../interfaces/IBackendService';

export class LeaderboardScene extends Phaser.Scene {
  private dailyChallengeSystem: DailyChallengeSystem | null = null;
  private firebaseService: FirebaseService | null = null;
  private currentTab: 'global' | 'daily' = 'daily';
  private leaderboardData: ILeaderboardEntry[] = [];
  private isLoading = false;
  private error: string | null = null;
  private rankTexts: Phaser.GameObjects.Text[] = [];
  private scoreTexts: Phaser.GameObjects.Text[] = [];
  private nameTexts: Phaser.GameObjects.Text[] = [];

  constructor() {
    super({ key: 'LeaderboardScene' });
  }

  async create() {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x1a1a2e);

    this.add
      .text(GAME_WIDTH / 2, 20, 'LEADERBOARD', {
        fontFamily: '"Press Start 2P"',
        fontSize: '12px',
        color: '#ffdd00',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    const tabY = 38;
    const dailyTab = this.createTab(GAME_WIDTH / 2 - 40, tabY, 'DAILY', this.currentTab === 'daily');
    const globalTab = this.createTab(GAME_WIDTH / 2 + 40, tabY, 'GLOBAL', this.currentTab === 'global');

    dailyTab.on('pointerdown', () => {
      if (this.currentTab !== 'daily') {
        this.currentTab = 'daily';
        this.scene.restart();
      }
    });

    globalTab.on('pointerdown', () => {
      if (this.currentTab !== 'global') {
        this.currentTab = 'global';
        this.scene.restart();
      }
    });

    this.add.text(GAME_WIDTH / 2, 52, '(Coming back tomorrow)', {
      fontFamily: '"Press Start 2P"',
      fontSize: '4px',
      color: '#666666',
    }).setOrigin(0.5);

    this.isLoading = true;
    this.renderLoadingState();

    try {
      await this.fetchLeaderboard();
      this.isLoading = false;
      this.renderLeaderboard();
    } catch (_error) {
      this.isLoading = false;
      this.error = 'Failed to load';
      this.renderErrorState();
    }

    makeButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 18, 'BACK', {
      fontFamily: '"Press Start 2P"',
      fontSize: '10px',
      color: '#ffffff',
    }, () => {
      fadeOut(this, 200, () => this.scene.start('MenuScene'));
    });

    fadeIn(this, 200);
  }

  private createTab(x: number, y: number, label: string, active: boolean): Phaser.GameObjects.Text {
    const panel = this.add.rectangle(x, y + 4, 70, 12, active ? 0x44aaff : 0x333333, 0.8);
    panel.setStrokeStyle(1, active ? 0x44aaff : 0x666666);

    const text = this.add.text(x, y, label, {
      fontFamily: '"Press Start 2P"',
      fontSize: '5px',
      color: active ? '#44aaff' : '#aaaaaa',
    }).setOrigin(0.5);

    const container = this.add.container(x, y, [panel, text]);
    container.setSize(70, 12);
    container.setInteractive(new Phaser.Geom.Rectangle(-35, -6, 70, 12), Phaser.Geom.Rectangle.Contains);

    return text;
  }

  private async fetchLeaderboard(): Promise<void> {
    if (this.currentTab === 'daily') {
      if (!this.dailyChallengeSystem) {
        throw new Error('DailyChallengeSystem not available');
      }
      this.leaderboardData = await this.dailyChallengeSystem.getLeaderboard(100);
    } else {
      if (!this.firebaseService) {
        throw new Error('FirebaseService not available');
      }
      this.leaderboardData = await this.firebaseService.getLeaderboard(undefined, 100);
    }
  }

  private renderLoadingState(): void {
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'LOADING...', {
      fontFamily: '"Press Start 2P"',
      fontSize: '8px',
      color: '#aaaaaa',
    }).setOrigin(0.5);
  }

  private renderErrorState(): void {
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 10, 'ERROR', {
      fontFamily: '"Press Start 2P"',
      fontSize: '10px',
      color: '#ff4444',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 10, this.error ?? 'Unknown error', {
      fontFamily: '"Press Start 2P"',
      fontSize: '6px',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    const retryBtn = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 30, 'RETRY', {
      fontFamily: '"Press Start 2P"',
      fontSize: '7px',
      color: '#44aaff',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    retryBtn.on('pointerdown', () => {
      this.scene.restart();
    });
  }

  private renderLeaderboard(): void {
    if (this.leaderboardData.length === 0) {
      this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'NO SCORES YET', {
        fontFamily: '"Press Start 2P"',
        fontSize: '8px',
        color: '#aaaaaa',
      }).setOrigin(0.5);

      this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 15, 'Be the first!', {
        fontFamily: '"Press Start 2P"',
        fontSize: '5px',
        color: '#666666',
      }).setOrigin(0.5);
      return;
    }

    const headerY = 65;
    this.add.text(20, headerY, '#', {
      fontFamily: '"Press Start 2P"',
      fontSize: '5px',
      color: '#ffdd00',
    });

    this.add.text(40, headerY, 'PLAYER', {
      fontFamily: '"Press Start 2P"',
      fontSize: '5px',
      color: '#ffdd00',
    });

    this.add.text(GAME_WIDTH - 20, headerY, 'SCORE', {
      fontFamily: '"Press Start 2P"',
      fontSize: '5px',
      color: '#ffdd00',
    }).setOrigin(1, 0);

    const startY = 80;
    const rowHeight = 10;
    const maxRows = 12;

    const visibleData = this.leaderboardData.slice(0, maxRows);

    visibleData.forEach((entry, index) => {
      const y = startY + index * rowHeight;
      const isTop3 = index < 3;
      const rankColor = isTop3 ? ['#ffdd00', '#c0c0c0', '#cd7f32'][index] : '#aaaaaa';

      const rankText = this.add.text(20, y, `#${entry.rank ?? index + 1}`, {
        fontFamily: '"Press Start 2P"',
        fontSize: '5px',
        color: rankColor,
      });

      const shortId = entry.userId.substring(0, 8);
      const nameText = this.add.text(40, y, shortId, {
        fontFamily: '"Press Start 2P"',
        fontSize: '5px',
        color: '#ffffff',
      });

      const scoreText = this.add.text(GAME_WIDTH - 20, y, String(entry.score), {
        fontFamily: '"Press Start 2P"',
        fontSize: '5px',
        color: isTop3 ? '#ffdd00' : '#aaaaaa',
      }).setOrigin(1, 0);

      this.rankTexts.push(rankText);
      this.scoreTexts.push(scoreText);
      this.nameTexts.push(nameText);
    });

    if (this.leaderboardData.length > maxRows) {
      this.add.text(GAME_WIDTH / 2, startY + maxRows * rowHeight + 5, `+${this.leaderboardData.length - maxRows} more`, {
        fontFamily: '"Press Start 2P"',
        fontSize: '4px',
        color: '#666666',
      }).setOrigin(0.5);
    }
  }

  update(_delta: number): void {
    // No per-frame updates
  }

  destroy(): void {
    this.dailyChallengeSystem = null;
    this.firebaseService = null;
    this.leaderboardData = [];
    this.rankTexts = [];
    this.scoreTexts = [];
    this.nameTexts = [];
  }

  setDailyChallengeSystem(system: DailyChallengeSystem): void {
    this.dailyChallengeSystem = system;
  }

  setFirebaseService(service: FirebaseService): void {
    this.firebaseService = service;
  }
}
