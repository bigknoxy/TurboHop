import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { expandHitArea, makeButton } from '../utils/ButtonHelper';
import { fadeIn, fadeOut } from '../utils/TransitionHelper';

interface SkinData {
  name: string;
  color: number;
  cost: number;
}

const SKINS: SkinData[] = [
  { name: 'BLUE', color: 0x4488ff, cost: 0 },
  { name: 'RED', color: 0xff4444, cost: 10 },
  { name: 'NINJA', color: 0x222222, cost: 20 },
  { name: 'GREEN', color: 0x44ff44, cost: 25 },
  { name: 'CAT', color: 0xff9944, cost: 25 },
  { name: 'ROBOT', color: 0x888888, cost: 30 },
  { name: 'WIZARD', color: 0x5522aa, cost: 40 },
  { name: 'GOLD', color: 0xffdd00, cost: 50 },
  { name: 'ASTRO', color: 0xeeeeee, cost: 50 },
  { name: 'SKELLY', color: 0x111111, cost: 75 },
  { name: 'PURPLE', color: 0xaa44ff, cost: 100 },
  { name: 'DRAGON', color: 0x22aa44, cost: 100 },
  { name: 'RAINBOW', color: 0xff0000, cost: 150 },
];

export class ShopScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ShopScene' });
  }

  create(data?: { from?: string }) {
    const returnScene = data?.from || 'MenuScene';

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

    const totalCoins = parseInt(localStorage.getItem('turbohop_coins') || '0', 10);
    const ownedSkins: string[] = JSON.parse(localStorage.getItem('turbohop_skins') || '["BLUE"]');
    const equippedSkin = localStorage.getItem('turbohop_skin') || 'BLUE';

    this.add
      .text(GAME_WIDTH / 2, 36, `COINS: ${totalCoins}`, {
        fontFamily: '"Press Start 2P"',
        fontSize: '7px',
        color: '#ffdd00',
      })
      .setOrigin(0.5);

    // Use two columns to fit all skins within the ENVELOP-safe zone
    const cols = 2;
    const colWidth = (GAME_WIDTH - 40) / cols;
    const startY = 50;
    const rowSpacing = 11;

    SKINS.forEach((skin, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = 20 + col * colWidth;
      const y = startY + row * rowSpacing;
      const owned = ownedSkins.includes(skin.name);
      const equipped = equippedSkin === skin.name;

      // Color preview
      const preview = this.add.rectangle(x + 4, y, 6, 6, skin.color);
      preview.setStrokeStyle(1, 0xffffff);

      // Name
      this.add.text(x + 12, y - 3, skin.name, {
        fontFamily: '"Press Start 2P"',
        fontSize: '4px',
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
        btnText = `${skin.cost}C`;
        btnColor = totalCoins >= skin.cost ? '#ffdd00' : '#666666';
      }

      const btn = this.add
        .text(x + colWidth - 10, y - 3, btnText, {
          fontFamily: '"Press Start 2P"',
          fontSize: '4px',
          color: btnColor,
        })
        .setOrigin(1, 0);
      expandHitArea(btn, 8, 6);

      btn.on('pointerdown', () => {
        if (equipped) return;

        if (owned) {
          localStorage.setItem('turbohop_skin', skin.name);
          this.scene.restart({ from: returnScene });
          return;
        }

        const currentCoins = parseInt(localStorage.getItem('turbohop_coins') || '0', 10);
        if (currentCoins >= skin.cost) {
          localStorage.setItem('turbohop_coins', String(currentCoins - skin.cost));
          const updated = JSON.parse(localStorage.getItem('turbohop_skins') || '["BLUE"]');
          updated.push(skin.name);
          localStorage.setItem('turbohop_skins', JSON.stringify(updated));
          localStorage.setItem('turbohop_skin', skin.name);
          this.scene.restart({ from: returnScene });
        }
      });
    });

    // Back button — positioned in ENVELOP-safe zone
    makeButton(this, GAME_WIDTH / 2, 140, 'BACK', {
      fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#ffffff',
    }, () => {
      fadeOut(this, 200, () => this.scene.start(returnScene));
    });

    fadeIn(this, 200);
  }
}
