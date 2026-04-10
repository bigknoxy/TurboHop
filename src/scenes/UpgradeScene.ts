import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { SaveSystem } from '../systems/SaveSystem';
import { UpgradeSystem, UPGRADES } from '../systems/UpgradeSystem';
import { expandHitArea, makeButton } from '../utils/ButtonHelper';
import { fadeIn, fadeOut } from '../utils/TransitionHelper';

export class UpgradeScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UpgradeScene' });
  }

  create(data?: { from?: string }) {
    const returnScene = data?.from || 'MenuScene';
    const cx = GAME_WIDTH / 2;

    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x1a1a2e);

    // ---- Header ----
    this.add.text(cx, 16, 'UPGRADES', {
      fontFamily: '"Press Start 2P"', fontSize: '12px', color: '#ffaa44',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5);

    const saveSystem = new SaveSystem();
    const upgradeSystem = new UpgradeSystem(saveSystem);
    const totalCoins = saveSystem.getCoins();

    this.add.text(cx, 32, `COINS: ${totalCoins}`, {
      fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#ffdd00',
    }).setOrigin(0.5);

    // Thin divider under header
    this.add.rectangle(cx, 42, GAME_WIDTH - 40, 1, 0xffffff, 0.1);

    // ---- Upgrade rows ----
    const startY = 50;
    const rowH = 28;
    const leftPad = 14;

    UPGRADES.forEach((def, i) => {
      const y = startY + i * rowH;
      const level = upgradeSystem.getLevel(def.id);
      const maxed = level >= def.maxLevel;

      // Upgrade name (larger, readable)
      this.add.text(leftPad, y, def.name, {
        fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#ffffff',
      });

      // Description (bumped from 4px to 5px for readability)
      this.add.text(leftPad, y + 11, def.description, {
        fontFamily: '"Press Start 2P"', fontSize: '5px', color: '#777777',
      });

      // Level pips — graphical boxes instead of text brackets
      const pipX = GAME_WIDTH - 100;
      for (let l = 0; l < def.maxLevel; l++) {
        const filled = l < level;
        const pipColor = filled ? 0x44ff44 : 0x333333;
        this.add.rectangle(pipX + l * 12, y + 4, 8, 8, pipColor)
          .setStrokeStyle(1, filled ? 0x66ff66 : 0x555555);
      }

      // Buy / MAX button
      let btnText: string;
      let btnColor: string;
      if (maxed) {
        btnText = 'MAX';
        btnColor = '#44ff44';
      } else {
        const cost = def.costs[level];
        btnText = `${cost}C`;
        btnColor = totalCoins >= cost ? '#ffdd00' : '#555555';
      }

      const btn = this.add.text(GAME_WIDTH - leftPad, y + 3, btnText, {
        fontFamily: '"Press Start 2P"', fontSize: '7px', color: btnColor,
      }).setOrigin(1, 0);
      expandHitArea(btn);

      btn.on('pointerdown', () => {
        if (maxed) return;
        if (upgradeSystem.purchase(def.id)) {
          this.scene.restart({ from: returnScene });
        }
      });
    });

    // ---- Back button ----
    makeButton(this, cx, GAME_HEIGHT - 20, 'BACK', {
      fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#aaaaaa',
    }, () => fadeOut(this, 200, () => this.scene.start(returnScene)));

    fadeIn(this, 200);
  }
}
