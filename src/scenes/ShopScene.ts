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
    const cx = GAME_WIDTH / 2;

    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x1a1a2e);

    // ---- Header ----
    this.add.text(cx, 16, 'SHOP', {
      fontFamily: '"Press Start 2P"', fontSize: '14px', color: '#ffdd00',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5);

    const totalCoins = parseInt(localStorage.getItem('turbohop_coins') || '0', 10);
    const ownedSkins: string[] = JSON.parse(localStorage.getItem('turbohop_skins') || '["BLUE"]');
    const equippedSkin = localStorage.getItem('turbohop_skin') || 'BLUE';

    this.add.text(cx, 32, `COINS: ${totalCoins}`, {
      fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#ffdd00',
    }).setOrigin(0.5);

    // Divider
    this.add.rectangle(cx, 42, GAME_WIDTH - 40, 1, 0xffffff, 0.1);

    // ---- Skin grid — 2 columns with proper spacing ----
    const cols = 2;
    const leftPad = 16;
    const colWidth = (GAME_WIDTH - leftPad * 2) / cols;
    const startY = 50;
    const rowH = 18; // taller rows for readability

    SKINS.forEach((skin, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = leftPad + col * colWidth;
      const y = startY + row * rowH;
      const owned = ownedSkins.includes(skin.name);
      const equipped = equippedSkin === skin.name;

      // Color swatch (larger, more visible)
      const swatch = this.add.rectangle(x + 6, y + 4, 10, 10, skin.color);
      swatch.setStrokeStyle(1, equipped ? 0x44ff44 : 0xffffff, equipped ? 1 : 0.4);

      // Name (bumped from 4px to 6px)
      this.add.text(x + 16, y, skin.name, {
        fontFamily: '"Press Start 2P"', fontSize: '6px',
        color: equipped ? '#44ff44' : (owned ? '#ffffff' : '#aaaaaa'),
      });

      // Status / Buy button
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
        btnColor = totalCoins >= skin.cost ? '#ffdd00' : '#555555';
      }

      const btn = this.add.text(x + colWidth - 6, y, btnText, {
        fontFamily: '"Press Start 2P"', fontSize: '5px', color: btnColor,
      }).setOrigin(1, 0);
      expandHitArea(btn, 8, 8);

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

    // ---- Back button ----
    makeButton(this, cx, GAME_HEIGHT - 20, 'BACK', {
      fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#aaaaaa',
    }, () => fadeOut(this, 200, () => this.scene.start(returnScene)));

    fadeIn(this, 200);
  }
}
