import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create() {
    this.generateTextures();
    this.scene.start('MenuScene');
  }

  private generateTextures() {
    // Player: 16x24 blue character with eyes
    const player = this.make.graphics({ x: 0, y: 0 }, false);
    player.fillStyle(0x4488ff);
    player.fillRect(0, 0, 16, 24);
    player.fillStyle(0xffffff);
    player.fillRect(4, 6, 4, 4);
    player.fillRect(10, 6, 4, 4);
    player.fillStyle(0x000000);
    player.fillRect(6, 7, 2, 3);
    player.fillRect(12, 7, 2, 3);
    player.fillStyle(0xffaa44);
    player.fillRect(5, 14, 6, 2);
    player.generateTexture('player', 16, 24);
    player.destroy();

    // Platform: 48x16 green block
    const platform = this.make.graphics({ x: 0, y: 0 }, false);
    platform.fillStyle(0x44aa44);
    platform.fillRect(0, 0, 48, 16);
    platform.fillStyle(0x338833);
    platform.fillRect(0, 0, 48, 3);
    platform.fillStyle(0x55cc55);
    platform.fillRect(1, 1, 46, 1);
    platform.generateTexture('platform', 48, 16);
    platform.destroy();

    // Wide platform
    const widePlatform = this.make.graphics({ x: 0, y: 0 }, false);
    widePlatform.fillStyle(0x44aa44);
    widePlatform.fillRect(0, 0, 80, 16);
    widePlatform.fillStyle(0x338833);
    widePlatform.fillRect(0, 0, 80, 3);
    widePlatform.fillStyle(0x55cc55);
    widePlatform.fillRect(1, 1, 78, 1);
    widePlatform.generateTexture('platform-wide', 80, 16);
    widePlatform.destroy();

    // Slime: 16x16 red blob
    const slime = this.make.graphics({ x: 0, y: 0 }, false);
    slime.fillStyle(0xdd3333);
    slime.fillRoundedRect(0, 4, 16, 12, 4);
    slime.fillStyle(0xffffff);
    slime.fillRect(3, 6, 4, 4);
    slime.fillRect(9, 6, 4, 4);
    slime.fillStyle(0x000000);
    slime.fillRect(4, 7, 2, 3);
    slime.fillRect(10, 7, 2, 3);
    slime.generateTexture('slime', 16, 16);
    slime.destroy();

    // Bird: 16x16 orange bird
    const bird = this.make.graphics({ x: 0, y: 0 }, false);
    bird.fillStyle(0xff8844);
    bird.fillRect(4, 4, 10, 8);
    bird.fillStyle(0xffaa66);
    bird.fillTriangle(0, 8, 4, 4, 4, 8);
    bird.fillTriangle(14, 4, 16, 2, 14, 8);
    bird.fillStyle(0xffffff);
    bird.fillRect(9, 5, 3, 3);
    bird.fillStyle(0x000000);
    bird.fillRect(10, 6, 2, 2);
    bird.fillStyle(0xffcc00);
    bird.fillRect(13, 7, 3, 2);
    bird.generateTexture('bird', 16, 16);
    bird.destroy();

    // Coin: 12x12 yellow circle
    const coin = this.make.graphics({ x: 0, y: 0 }, false);
    coin.fillStyle(0xffdd00);
    coin.fillCircle(6, 6, 6);
    coin.fillStyle(0xffaa00);
    coin.fillCircle(6, 6, 3);
    coin.fillStyle(0xffee44);
    coin.fillRect(4, 3, 2, 2);
    coin.generateTexture('coin', 12, 12);
    coin.destroy();

    // Background layers
    this.generateBackground('bg-sky', 0x1a1a2e, 0x16213e, 0x0f3460);
    this.generateBackground('bg-mountains', -1, -1, -1, true);
    this.generateBackground('bg-hills', -1, -1, -1, false, true);

    // Power-up icons (12x12 each)
    this.generatePowerUpTexture('powerup-magnet', 0x44ffff, 'M');
    this.generatePowerUpTexture('powerup-shield', 0x44ff44, 'S');
    this.generatePowerUpTexture('powerup-double', 0xffdd00, '2');
    this.generatePowerUpTexture('powerup-boost', 0xff4444, 'B');

    // Heart icon for HP
    const heart = this.make.graphics({ x: 0, y: 0 }, false);
    heart.fillStyle(0xff4444);
    heart.fillCircle(4, 4, 4);
    heart.fillCircle(10, 4, 4);
    heart.fillTriangle(0, 5, 14, 5, 7, 13);
    heart.generateTexture('heart', 14, 14);
    heart.destroy();
  }

  private generateBackground(
    key: string,
    topColor: number,
    midColor: number,
    botColor: number,
    mountains = false,
    hills = false,
  ) {
    const gfx = this.make.graphics({ x: 0, y: 0 }, false);

    if (mountains) {
      gfx.fillStyle(0x0f3460, 0);
      gfx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      gfx.fillStyle(0x1a3a5c, 0.6);
      // Mountain silhouettes
      for (let i = 0; i < 6; i++) {
        const x = i * 70 - 10;
        const h = 60 + Math.sin(i * 1.5) * 30;
        gfx.fillTriangle(x, GAME_HEIGHT, x + 40, GAME_HEIGHT - h, x + 80, GAME_HEIGHT);
      }
    } else if (hills) {
      gfx.fillStyle(0x0f3460, 0);
      gfx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      gfx.fillStyle(0x1e5631, 0.5);
      // Rolling hills
      for (let i = 0; i < 8; i++) {
        const x = i * 55 - 20;
        gfx.fillCircle(x + 25, GAME_HEIGHT + 10, 40);
      }
    } else {
      // Sky gradient (draw horizontal bands)
      const steps = 20;
      for (let i = 0; i < steps; i++) {
        const t = i / steps;
        let color: number;
        if (t < 0.5) {
          color = this.lerpColor(topColor, midColor, t * 2);
        } else {
          color = this.lerpColor(midColor, botColor, (t - 0.5) * 2);
        }
        gfx.fillStyle(color);
        const bandHeight = Math.ceil(GAME_HEIGHT / steps);
        gfx.fillRect(0, i * bandHeight, GAME_WIDTH, bandHeight + 1);
      }

      // Stars
      gfx.fillStyle(0xffffff, 0.7);
      for (let i = 0; i < 30; i++) {
        const sx = Math.floor(Math.random() * GAME_WIDTH);
        const sy = Math.floor(Math.random() * (GAME_HEIGHT * 0.6));
        gfx.fillRect(sx, sy, 1, 1);
      }
    }

    gfx.generateTexture(key, GAME_WIDTH, GAME_HEIGHT);
    gfx.destroy();
  }

  private generatePowerUpTexture(key: string, color: number, _letter: string): void {
    const gfx = this.make.graphics({ x: 0, y: 0 }, false);
    // Glowing box
    gfx.fillStyle(color, 0.3);
    gfx.fillRect(0, 0, 14, 14);
    gfx.fillStyle(color);
    gfx.fillRect(1, 1, 12, 12);
    gfx.fillStyle(0xffffff, 0.6);
    gfx.fillRect(2, 2, 4, 2);
    gfx.generateTexture(key, 14, 14);
    gfx.destroy();
  }

  private lerpColor(a: number, b: number, t: number): number {
    const ar = (a >> 16) & 0xff;
    const ag = (a >> 8) & 0xff;
    const ab = a & 0xff;
    const br = (b >> 16) & 0xff;
    const bg = (b >> 8) & 0xff;
    const bb = b & 0xff;
    const r = Math.round(ar + (br - ar) * t);
    const g = Math.round(ag + (bg - ag) * t);
    const blue = Math.round(ab + (bb - ab) * t);
    return (r << 16) | (g << 8) | blue;
  }
}
