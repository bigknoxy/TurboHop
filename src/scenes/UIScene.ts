import Phaser from 'phaser';
import { GAME_WIDTH } from '../constants';
import { EventBus } from '../utils/EventBus';
import { Mission } from '../systems/MissionSystem';
import { expandHitArea } from '../utils/ButtonHelper';

export class UIScene extends Phaser.Scene {
  private scoreText!: Phaser.GameObjects.Text;
  private coinText!: Phaser.GameObjects.Text;
  private hearts: Phaser.GameObjects.Image[] = [];
  private muteBtn!: Phaser.GameObjects.Text;
  private muted = false;
  private missionTexts: Phaser.GameObjects.Text[] = [];
  private powerUpText: Phaser.GameObjects.Text | null = null;
  private displayScore = 0;
  private scoreTween: Phaser.Tweens.Tween | null = null;

  constructor() {
    super({ key: 'UIScene' });
  }

  create() {
    this.displayScore = 0;

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

    // Hearts (HP) — support up to 6 from upgrades
    this.hearts = [];
    for (let i = 0; i < 6; i++) {
      const heart = this.add.image(GAME_WIDTH - 20 - i * 14, 10, 'heart').setScale(0.6);
      heart.setVisible(false);
      this.hearts.push(heart);
    }

    // Mute button
    this.muteBtn = this.add
      .text(GAME_WIDTH - 10, 24, 'SND', {
        fontFamily: '"Press Start 2P"',
        fontSize: '5px',
        color: '#888888',
      })
      .setOrigin(1, 0);
    expandHitArea(this.muteBtn);

    this.muteBtn.on('pointerdown', () => {
      this.muted = !this.muted;
      EventBus.emit('audio:toggle');
      this.muteBtn.setColor(this.muted ? '#ff4444' : '#888888');
      this.muteBtn.setText(this.muted ? 'MUTE' : 'SND');
    });

    // Mission display (bottom-left, within ENVELOP-safe zone)
    this.missionTexts = [];
    for (let i = 0; i < 3; i++) {
      const mt = this.add.text(8, 180 - i * 9, '', {
        fontFamily: '"Press Start 2P"',
        fontSize: '4px',
        color: '#aaaaaa',
        stroke: '#000000',
        strokeThickness: 1,
      });
      this.missionTexts.push(mt);
    }

    // Power-up timer display (top center)
    this.powerUpText = this.add.text(GAME_WIDTH / 2, 4, '', {
      fontFamily: '"Press Start 2P"',
      fontSize: '6px',
      color: '#44ffff',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5, 0);

    // Listen to events
    EventBus.on('score:update', (data: { score: number; coins: number }) => {
      // Score roll-up animation
      const prevScore = this.displayScore;
      if (data.score !== prevScore) {
        if (this.scoreTween) this.scoreTween.stop();
        this.scoreTween = this.tweens.addCounter({
          from: prevScore,
          to: data.score,
          duration: 300,
          onUpdate: (tween) => {
            const val = Math.floor(tween.getValue() ?? 0);
            this.scoreText.setText(`SCORE: ${val}`);
            this.displayScore = val;
          },
        });
        // Scale punch on significant change
        if (data.score - prevScore >= 10) {
          this.tweens.add({
            targets: this.scoreText,
            scaleX: 1.2, scaleY: 1.2,
            duration: 80, yoyo: true, ease: 'Sine.easeOut',
          });
        }
      }
      this.coinText.setText(`${data.coins}`);
    });

    EventBus.on('player:hp', (data: { hp: number; maxHp: number }) => {
      this.hearts.forEach((heart, i) => {
        if (i < data.maxHp) {
          heart.setVisible(true);
          heart.setAlpha(i < data.hp ? 1 : 0.2);
        } else {
          heart.setVisible(false);
        }
      });
    });

    EventBus.on('missions:update', (missions: Mission[]) => {
      missions.forEach((m, i) => {
        if (this.missionTexts[i]) {
          const status = m.completed ? '[OK]' : `${m.progress}/${m.target}`;
          const color = m.completed ? '#44ff44' : '#aaaaaa';
          this.missionTexts[i].setText(`${m.description} ${status}`);
          this.missionTexts[i].setColor(color);
        }
      });
    });

    EventBus.on('powerup:active', (data: { name: string; timeLeft: number }) => {
      if (this.powerUpText) {
        if (data.timeLeft > 0) {
          this.powerUpText.setText(`${data.name} ${Math.ceil(data.timeLeft / 1000)}s`);
        } else {
          this.powerUpText.setText('');
        }
      }
    });
  }
}
