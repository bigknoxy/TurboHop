import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { EventBus } from '../utils/EventBus';

interface SkinData {
  name: string;
  color: number;
  cost: number;
}

const SKINS: SkinData[] = [
  { name: 'BLUE', color: 0x4488ff, cost: 0 },
  { name: 'RED', color: 0xff4444, cost: 10 },
  { name: 'GREEN', color: 0x44ff44, cost: 25 },
  { name: 'GOLD', color: 0xffdd00, cost: 50 },
  { name: 'PURPLE', color: 0xaa44ff, cost: 100 },
];

export class ShopScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ShopScene' });
  }

  create() {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x1a1a2e);

    this.add
      .text(GAME_WIDTH / 2, 20, 'SHOP', {
        fontFamily: '"Press Start 2P"',
        fontSize: '14px',
        color: '#ffdd00',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    const totalCoins = parseInt(localStorage.getItem('turbohop_coins') || '0');
    const ownedSkins: string[] = JSON.parse(localStorage.getItem('turbohop_skins') || '["BLUE"]');
    const equippedSkin = localStorage.getItem('turbohop_skin') || 'BLUE';

    const coinsText = this.add
      .text(GAME_WIDTH / 2, 40, `COINS: ${totalCoins}`, {
        fontFamily: '"Press Start 2P"',
        fontSize: '8px',
        color: '#ffdd00',
      })
      .setOrigin(0.5);

    SKINS.forEach((skin, i) => {
      const y = 65 + i * 28;
      const owned = ownedSkins.includes(skin.name);
      const equipped = equippedSkin === skin.name;

      // Color preview
      const preview = this.add.rectangle(40, y, 16, 16, skin.color);
      preview.setStrokeStyle(1, 0xffffff);

      // Name
      this.add.text(60, y - 6, skin.name, {
        fontFamily: '"Press Start 2P"',
        fontSize: '7px',
        color: '#ffffff',
      });

      // Button
      let btnText: string;
      let btnColor: string;
      if (equipped) {
        btnText = 'EQUIPPED';
        btnColor = '#44ff44';
      } else if (owned) {
        btnText = 'EQUIP';
        btnColor = '#44aaff';
      } else {
        btnText = `${skin.cost} C`;
        btnColor = totalCoins >= skin.cost ? '#ffdd00' : '#666666';
      }

      const btn = this.add
        .text(GAME_WIDTH - 40, y - 4, btnText, {
          fontFamily: '"Press Start 2P"',
          fontSize: '6px',
          color: btnColor,
        })
        .setOrigin(1, 0)
        .setInteractive({ useHandCursor: true });

      btn.on('pointerdown', () => {
        if (equipped) return;

        if (owned) {
          localStorage.setItem('turbohop_skin', skin.name);
          this.scene.restart();
          return;
        }

        const currentCoins = parseInt(localStorage.getItem('turbohop_coins') || '0');
        if (currentCoins >= skin.cost) {
          localStorage.setItem('turbohop_coins', String(currentCoins - skin.cost));
          const updated = JSON.parse(localStorage.getItem('turbohop_skins') || '["BLUE"]');
          updated.push(skin.name);
          localStorage.setItem('turbohop_skins', JSON.stringify(updated));
          localStorage.setItem('turbohop_skin', skin.name);
          this.scene.restart();
        }
      });
    });

    // Back button
    const backBtn = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 15, 'BACK', {
        fontFamily: '"Press Start 2P"',
        fontSize: '8px',
        color: '#aaaaaa',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    backBtn.on('pointerdown', () => {
      EventBus.removeAllListeners();
      this.scene.start('MenuScene');
    });
  }
}
