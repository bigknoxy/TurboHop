import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { SettingsSystem } from '../systems/SettingsSystem';
import { expandHitArea, makeButton } from '../utils/ButtonHelper';
import { fadeIn, fadeOut } from '../utils/TransitionHelper';
import { InstallManager } from '../systems/InstallManager';

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
      const y = 46 + i * 24;

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
      }).setOrigin(1, 0);
      expandHitArea(btn);

      btn.on('pointerover', () => btn.setScale(1.1));
      btn.on('pointerout', () => btn.setScale(1.0));
      btn.on('pointerdown', () => {
        const newState = !toggle.get();
        toggle.set(newState);
        btn.setText(newState ? 'ON' : 'OFF');
        btn.setColor(newState ? '#44ff44' : '#ff4444');
      });
    });

    // Install app option
    const installY = 46 + toggles.length * 24;
    if (InstallManager.isInstalled) {
      this.add.text(30, installY, 'APP INSTALLED', {
        fontFamily: '"Press Start 2P"',
        fontSize: '6px',
        color: '#44ff44',
      });
    } else if (InstallManager.canInstall) {
      this.add.text(30, installY, 'INSTALL APP', {
        fontFamily: '"Press Start 2P"',
        fontSize: '6px',
        color: '#ffffff',
      });
      const installBtn = makeButton(this, GAME_WIDTH - 40, installY + 4, 'INSTALL', {
        fontFamily: '"Press Start 2P"', fontSize: '6px', color: '#44ff44',
      }, () => {
        InstallManager.promptInstall().catch(() => {});
      });
      installBtn.setOrigin(0.5);
    }

    // Back button
    makeButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 20, 'BACK', {
      fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#aaaaaa',
    }, () => {
      fadeOut(this, 200, () => this.scene.start('MenuScene'));
    });

    fadeIn(this, 200);
  }
}
