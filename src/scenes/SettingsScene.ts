import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { SettingsSystem } from '../systems/SettingsSystem';
import { makeButton } from '../utils/ButtonHelper';
import { fadeIn, fadeOut } from '../utils/TransitionHelper';

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SettingsScene' });
  }

  create() {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x1a1a2e);

    this.add.text(GAME_WIDTH / 2, 16, 'SETTINGS', {
      fontFamily: '"Press Start 2P"',
      fontSize: '12px',
      color: '#ffdd00',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    const toggles: Array<{ label: string; get: () => boolean; set: (v: boolean) => void }> = [
      { label: 'REDUCED MOTION', get: () => SettingsSystem.reducedMotion, set: (v) => { SettingsSystem.reducedMotion = v; } },
      { label: 'COLORBLIND MODE', get: () => SettingsSystem.colorblindMode, set: (v) => { SettingsSystem.colorblindMode = v; } },
      { label: 'SHOW FPS', get: () => SettingsSystem.showFps, set: (v) => { SettingsSystem.showFps = v; } },
    ];

    toggles.forEach((toggle, i) => {
      const y = 50 + i * 30;

      this.add.text(30, y, toggle.label, {
        fontFamily: '"Press Start 2P"',
        fontSize: '6px',
        color: '#ffffff',
      });

      const state = toggle.get();
      const btn = this.add.text(GAME_WIDTH - 30, y, state ? 'ON' : 'OFF', {
        fontFamily: '"Press Start 2P"',
        fontSize: '7px',
        color: state ? '#44ff44' : '#ff4444',
      }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

      btn.on('pointerover', () => btn.setScale(1.1));
      btn.on('pointerout', () => btn.setScale(1.0));
      btn.on('pointerdown', () => {
        const newState = !toggle.get();
        toggle.set(newState);
        btn.setText(newState ? 'ON' : 'OFF');
        btn.setColor(newState ? '#44ff44' : '#ff4444');
      });
    });

    // Back button
    makeButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 20, 'BACK', {
      fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#aaaaaa',
    }, () => {
      fadeOut(this, 200, () => this.scene.start('MenuScene'));
    });

    fadeIn(this, 200);
  }
}
