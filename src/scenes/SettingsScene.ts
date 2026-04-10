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
    const cx = GAME_WIDTH / 2;

    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x1a1a2e);

    // ---- Header ----
    this.add.text(cx, 16, 'SETTINGS', {
      fontFamily: '"Press Start 2P"', fontSize: '12px', color: '#ffdd00',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5);

    // Divider
    this.add.rectangle(cx, 32, GAME_WIDTH - 40, 1, 0xffffff, 0.1);

    // ---- Toggle rows ----
    const toggles: Array<{
      label: string;
      desc: string;
      get: () => boolean;
      set: (v: boolean) => void;
    }> = [
      {
        label: 'REDUCED MOTION',
        desc: 'Fewer screen effects',
        get: () => SettingsSystem.reducedMotion,
        set: (v) => { SettingsSystem.reducedMotion = v; },
      },
      {
        label: 'COLORBLIND MODE',
        desc: 'Improved contrast',
        get: () => SettingsSystem.colorblindMode,
        set: (v) => { SettingsSystem.colorblindMode = v; },
      },
      {
        label: 'SHOW FPS',
        desc: 'Frame counter overlay',
        get: () => SettingsSystem.showFps,
        set: (v) => { SettingsSystem.showFps = v; },
      },
    ];

    const leftPad = 20;
    const startY = 44;
    const rowH = 30;

    toggles.forEach((toggle, i) => {
      const y = startY + i * rowH;

      this.add.text(leftPad, y, toggle.label, {
        fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#ffffff',
      });

      this.add.text(leftPad, y + 12, toggle.desc, {
        fontFamily: '"Press Start 2P"', fontSize: '5px', color: '#666666',
      });

      const state = toggle.get();
      const btn = this.add.text(GAME_WIDTH - leftPad, y + 3, state ? 'ON' : 'OFF', {
        fontFamily: '"Press Start 2P"', fontSize: '8px',
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

    // ---- Install app row ----
    const installY = startY + toggles.length * rowH + 4;
    this.add.rectangle(cx, installY - 4, GAME_WIDTH - 40, 1, 0xffffff, 0.1);

    if (InstallManager.isInstalled) {
      this.add.text(leftPad, installY, 'APP INSTALLED', {
        fontFamily: '"Press Start 2P"', fontSize: '6px', color: '#44ff44',
      });
    } else if (InstallManager.canInstall) {
      this.add.text(leftPad, installY, 'INSTALL APP', {
        fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#ffffff',
      });
      this.add.text(leftPad, installY + 12, 'Fullscreen, no browser', {
        fontFamily: '"Press Start 2P"', fontSize: '5px', color: '#666666',
      });
      makeButton(this, GAME_WIDTH - leftPad - 20, installY + 4, 'INSTALL', {
        fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#44ff44',
      }, () => {
        InstallManager.promptInstall().catch(() => {});
      });
    }

    // ---- Back button ----
    makeButton(this, cx, GAME_HEIGHT - 20, 'BACK', {
      fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#aaaaaa',
    }, () => fadeOut(this, 200, () => this.scene.start('MenuScene')));

    fadeIn(this, 200);
  }
}
