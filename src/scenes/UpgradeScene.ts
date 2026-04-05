import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { SaveSystem } from '../systems/SaveSystem';
import { UpgradeSystem, UPGRADES } from '../systems/UpgradeSystem';

export class UpgradeScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UpgradeScene' });
  }

  create() {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x1a1a2e);

    this.add
      .text(GAME_WIDTH / 2, 14, 'UPGRADES', {
        fontFamily: '"Press Start 2P"',
        fontSize: '12px',
        color: '#ffaa44',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    const saveSystem = new SaveSystem();
    const upgradeSystem = new UpgradeSystem(saveSystem);
    const totalCoins = saveSystem.getCoins();

    this.add
      .text(GAME_WIDTH / 2, 30, `COINS: ${totalCoins}`, {
        fontFamily: '"Press Start 2P"',
        fontSize: '7px',
        color: '#ffdd00',
      })
      .setOrigin(0.5);

    UPGRADES.forEach((def, i) => {
      const y = 48 + i * 30;
      const level = upgradeSystem.getLevel(def.id);
      const maxed = level >= def.maxLevel;

      // Name
      this.add.text(10, y, def.name, {
        fontFamily: '"Press Start 2P"',
        fontSize: '6px',
        color: '#ffffff',
      });

      // Description
      this.add.text(10, y + 9, def.description, {
        fontFamily: '"Press Start 2P"',
        fontSize: '4px',
        color: '#888888',
      });

      // Level indicator
      let levelStr = '';
      for (let l = 0; l < def.maxLevel; l++) {
        levelStr += l < level ? '[X]' : '[ ]';
      }
      this.add.text(GAME_WIDTH - 120, y, levelStr, {
        fontFamily: '"Press Start 2P"',
        fontSize: '5px',
        color: level > 0 ? '#44ff44' : '#666666',
      });

      // Buy button
      let btnText: string;
      let btnColor: string;
      if (maxed) {
        btnText = 'MAX';
        btnColor = '#44ff44';
      } else {
        const cost = def.costs[level];
        const canAfford = totalCoins >= cost;
        btnText = `${cost}C`;
        btnColor = canAfford ? '#ffdd00' : '#666666';
      }

      const btn = this.add
        .text(GAME_WIDTH - 20, y + 4, btnText, {
          fontFamily: '"Press Start 2P"',
          fontSize: '6px',
          color: btnColor,
        })
        .setOrigin(1, 0)
        .setInteractive({ useHandCursor: true });

      btn.on('pointerdown', () => {
        if (maxed) return;
        if (upgradeSystem.purchase(def.id)) {
          this.scene.restart();
        }
      });
    });

    // Back button
    const backBtn = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 12, 'BACK', {
        fontFamily: '"Press Start 2P"',
        fontSize: '8px',
        color: '#aaaaaa',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    backBtn.on('pointerdown', () => {
      this.scene.start('MenuScene');
    });
  }
}
