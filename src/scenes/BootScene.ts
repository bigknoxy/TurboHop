import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';

export class BootScene extends Phaser.Scene {
  private progressBar!: Phaser.GameObjects.Graphics;
  private progressText!: Phaser.GameObjects.Text;
  private loadStep = 0;
  private totalSteps = 20;

  constructor() {
    super({ key: 'BootScene' });
  }

  create() {
    // Loading screen
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x1a1a2e);
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 3, 'TURBOHOP', {
      fontFamily: '"Press Start 2P"',
      fontSize: '20px',
      color: '#ffdd00',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.progressText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 10, 'Loading...', {
      fontFamily: '"Press Start 2P"',
      fontSize: '6px',
      color: '#888888',
    }).setOrigin(0.5);

    this.progressBar = this.add.graphics();
    this.drawProgressBar(0);

    // Generate textures one per frame for visual progress
    this.time.delayedCall(100, () => this.generateStep());
  }

  private drawProgressBar(progress: number): void {
    const barW = 160;
    const barH = 8;
    const x = (GAME_WIDTH - barW) / 2;
    const y = GAME_HEIGHT / 2 + 25;
    this.progressBar.clear();
    this.progressBar.fillStyle(0x333333);
    this.progressBar.fillRect(x, y, barW, barH);
    this.progressBar.fillStyle(0xffdd00);
    this.progressBar.fillRect(x, y, barW * progress, barH);
    this.progressBar.lineStyle(1, 0x666666);
    this.progressBar.strokeRect(x, y, barW, barH);
  }

  private generateStep(): void {
    this.loadStep++;
    const generators = [
      () => this.genPlayer(),
      () => this.genPlatform(),
      () => this.genWidePlatform(),
      () => this.genSlime(),
      () => this.genBird(),
      () => this.genBat(),
      () => this.genSpike(),
      () => this.genGhost(),
      () => this.genCoin(),
      () => this.generateBackground('bg-sky', 0x1a1a2e, 0x16213e, 0x0f3460),
      () => this.generateBackground('bg-mountains', -1, -1, -1, true),
      () => this.generateBackground('bg-hills', -1, -1, -1, false, true),
      () => this.genPowerUp('powerup-magnet', 0x44ffff),
      () => this.genPowerUp('powerup-shield', 0x44ff44),
      () => this.genPowerUp('powerup-double', 0xffdd00),
      () => this.genPowerUp('powerup-boost', 0xff4444),
      () => this.genHeart(),
      () => this.genVignette(),
      () => this.genCharacterSkins(),
      () => {}, // final step
    ];

    this.totalSteps = generators.length;
    if (this.loadStep <= generators.length) {
      generators[this.loadStep - 1]();
    }

    this.drawProgressBar(this.loadStep / this.totalSteps);
    this.progressText.setText(`Loading... ${Math.floor((this.loadStep / this.totalSteps) * 100)}%`);

    if (this.loadStep < this.totalSteps) {
      this.time.delayedCall(30, () => this.generateStep());
    } else {
      this.time.delayedCall(300, () => this.scene.start('MenuScene'));
    }
  }

  // --- Texture generators ---

  private genPlayer(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x4488ff); g.fillRect(0, 0, 16, 24);
    g.fillStyle(0xffffff); g.fillRect(4, 6, 4, 4); g.fillRect(10, 6, 4, 4);
    g.fillStyle(0x000000); g.fillRect(6, 7, 2, 3); g.fillRect(12, 7, 2, 3);
    g.fillStyle(0xffaa44); g.fillRect(5, 14, 6, 2);
    g.generateTexture('player', 16, 24); g.destroy();
  }

  private genPlatform(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x44aa44); g.fillRect(0, 0, 48, 16);
    g.fillStyle(0x338833); g.fillRect(0, 0, 48, 3);
    g.fillStyle(0x55cc55); g.fillRect(1, 1, 46, 1);
    g.generateTexture('platform', 48, 16); g.destroy();
  }

  private genWidePlatform(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x44aa44); g.fillRect(0, 0, 80, 16);
    g.fillStyle(0x338833); g.fillRect(0, 0, 80, 3);
    g.fillStyle(0x55cc55); g.fillRect(1, 1, 78, 1);
    g.generateTexture('platform-wide', 80, 16); g.destroy();
  }

  private genSlime(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xdd3333); g.fillRoundedRect(0, 4, 16, 12, 4);
    g.fillStyle(0xffffff); g.fillRect(3, 6, 4, 4); g.fillRect(9, 6, 4, 4);
    g.fillStyle(0x000000); g.fillRect(4, 7, 2, 3); g.fillRect(10, 7, 2, 3);
    g.generateTexture('slime', 16, 16); g.destroy();
  }

  private genBird(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xff8844); g.fillRect(4, 4, 10, 8);
    g.fillStyle(0xffaa66); g.fillTriangle(0, 8, 4, 4, 4, 8); g.fillTriangle(14, 4, 16, 2, 14, 8);
    g.fillStyle(0xffffff); g.fillRect(9, 5, 3, 3);
    g.fillStyle(0x000000); g.fillRect(10, 6, 2, 2);
    g.fillStyle(0xffcc00); g.fillRect(13, 7, 3, 2);
    g.generateTexture('bird', 16, 16); g.destroy();
  }

  private genBat(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x6633aa); g.fillRect(5, 4, 6, 8);
    // Wings
    g.fillTriangle(0, 4, 5, 2, 5, 8);
    g.fillTriangle(11, 2, 16, 4, 11, 8);
    // Eyes
    g.fillStyle(0xff0000); g.fillRect(6, 5, 2, 2); g.fillRect(9, 5, 2, 2);
    g.generateTexture('bat', 16, 14); g.destroy();
  }

  private genSpike(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x888888);
    g.fillTriangle(0, 8, 4, 0, 8, 8);
    g.fillTriangle(8, 8, 12, 0, 16, 8);
    g.fillStyle(0xaaaaaa);
    g.fillTriangle(2, 8, 4, 2, 6, 8);
    g.fillTriangle(10, 8, 12, 2, 14, 8);
    g.generateTexture('spike', 16, 8); g.destroy();
  }

  private genGhost(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffffff, 0.6);
    g.fillRoundedRect(2, 0, 12, 12, 6);
    // Wavy bottom
    g.fillCircle(4, 14, 2); g.fillCircle(8, 14, 2); g.fillCircle(12, 14, 2);
    // Eyes
    g.fillStyle(0x000000); g.fillCircle(5, 5, 2); g.fillCircle(11, 5, 2);
    g.generateTexture('ghost', 16, 16); g.destroy();
  }

  private genCoin(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffdd00); g.fillCircle(6, 6, 6);
    g.fillStyle(0xffaa00); g.fillCircle(6, 6, 3);
    g.fillStyle(0xffee44); g.fillRect(4, 3, 2, 2);
    g.generateTexture('coin', 12, 12); g.destroy();
  }

  private genPowerUp(key: string, color: number): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(color, 0.3); g.fillRect(0, 0, 14, 14);
    g.fillStyle(color); g.fillRect(1, 1, 12, 12);
    g.fillStyle(0xffffff, 0.6); g.fillRect(2, 2, 4, 2);
    g.generateTexture(key, 14, 14); g.destroy();
  }

  private genHeart(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xff4444);
    g.fillCircle(4, 4, 4); g.fillCircle(10, 4, 4);
    g.fillTriangle(0, 5, 14, 5, 7, 13);
    g.generateTexture('heart', 14, 14); g.destroy();
  }

  private genVignette(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    // Radial vignette approximation using concentric rectangles
    const steps = 10;
    for (let i = steps; i >= 0; i--) {
      const t = i / steps;
      const alpha = (1 - t) * 0.4;
      g.fillStyle(0x000000, alpha);
      const margin = t * Math.min(GAME_WIDTH, GAME_HEIGHT) * 0.5;
      g.fillRect(0, 0, GAME_WIDTH, margin); // top
      g.fillRect(0, GAME_HEIGHT - margin, GAME_WIDTH, margin); // bottom
      g.fillRect(0, 0, margin, GAME_HEIGHT); // left
      g.fillRect(GAME_WIDTH - margin, 0, margin, GAME_HEIGHT); // right
    }
    g.generateTexture('vignette', GAME_WIDTH, GAME_HEIGHT); g.destroy();
  }

  private genCharacterSkins(): void {
    const skins: Array<{ name: string; draw: (g: Phaser.GameObjects.Graphics) => void }> = [
      { name: 'NINJA', draw: (g) => {
        g.fillStyle(0x222222); g.fillRect(0, 0, 16, 24);
        g.fillStyle(0xff2222); g.fillRect(2, 2, 12, 3); // headband
        g.fillStyle(0xffffff); g.fillRect(4, 6, 4, 4); g.fillRect(10, 6, 4, 4);
        g.fillStyle(0x000000); g.fillRect(6, 7, 2, 3); g.fillRect(12, 7, 2, 3);
      }},
      { name: 'ROBOT', draw: (g) => {
        g.fillStyle(0x888888); g.fillRect(0, 4, 16, 20);
        g.fillStyle(0xaaaaaa); g.fillRect(2, 4, 12, 8); // head
        g.fillStyle(0xcccccc); g.fillRect(6, 0, 4, 4); // antenna
        g.fillStyle(0x44ffff); g.fillRect(4, 6, 3, 3); g.fillRect(9, 6, 3, 3); // eyes
        g.fillStyle(0x666666); g.fillRect(5, 16, 6, 2); // mouth
      }},
      { name: 'CAT', draw: (g) => {
        g.fillStyle(0xff9944); g.fillRect(0, 4, 16, 20);
        // Ears
        g.fillTriangle(1, 4, 4, 0, 7, 4);
        g.fillTriangle(9, 4, 12, 0, 15, 4);
        g.fillStyle(0xffffff); g.fillRect(4, 7, 3, 3); g.fillRect(9, 7, 3, 3);
        g.fillStyle(0x000000); g.fillRect(5, 8, 2, 2); g.fillRect(10, 8, 2, 2);
        g.fillStyle(0xff7722); g.fillRect(6, 12, 4, 2); // nose
      }},
      { name: 'WIZARD', draw: (g) => {
        g.fillStyle(0x5522aa); g.fillRect(0, 8, 16, 16);
        // Pointed hat
        g.fillTriangle(2, 8, 8, -2, 14, 8);
        g.fillStyle(0xffdd00); g.fillRect(2, 7, 12, 2); // hat brim
        g.fillStyle(0xffffff); g.fillRect(4, 10, 3, 3); g.fillRect(9, 10, 3, 3);
        g.fillStyle(0x000000); g.fillRect(5, 11, 2, 2); g.fillRect(10, 11, 2, 2);
        g.fillStyle(0xffdd00); g.fillCircle(8, 2, 2); // star on hat
      }},
      { name: 'ASTRO', draw: (g) => {
        g.fillStyle(0xeeeeee); g.fillRect(0, 0, 16, 24);
        // Helmet bubble
        g.fillStyle(0x88ccff, 0.5); g.fillCircle(8, 6, 6);
        g.fillStyle(0xffffff); g.fillRect(4, 4, 3, 3); g.fillRect(9, 4, 3, 3);
        g.fillStyle(0x000000); g.fillRect(5, 5, 2, 2); g.fillRect(10, 5, 2, 2);
        g.fillStyle(0xff4444); g.fillRect(0, 14, 4, 3); // patch
      }},
      { name: 'SKELLY', draw: (g) => {
        g.fillStyle(0x111111); g.fillRect(0, 0, 16, 24);
        // Skull
        g.fillStyle(0xffffff); g.fillRoundedRect(2, 2, 12, 10, 3);
        g.fillStyle(0x000000); g.fillRect(4, 5, 3, 4); g.fillRect(9, 5, 3, 4);
        g.fillRect(6, 10, 4, 2);
        // Ribs
        g.fillStyle(0xffffff);
        g.fillRect(4, 14, 8, 1); g.fillRect(4, 16, 8, 1); g.fillRect(4, 18, 8, 1);
      }},
      { name: 'DRAGON', draw: (g) => {
        g.fillStyle(0x22aa44); g.fillRect(0, 2, 16, 22);
        // Wings
        g.fillStyle(0x44cc66);
        g.fillTriangle(-2, 8, 2, 2, 2, 14);
        g.fillTriangle(14, 2, 18, 8, 14, 14);
        // Eyes
        g.fillStyle(0xffdd00); g.fillRect(4, 5, 3, 3); g.fillRect(9, 5, 3, 3);
        g.fillStyle(0x000000); g.fillRect(5, 6, 2, 2); g.fillRect(10, 6, 2, 2);
        // Belly
        g.fillStyle(0xffcc44); g.fillRect(5, 14, 6, 6);
      }},
      { name: 'RAINBOW', draw: (g) => {
        const colors = [0xff0000, 0xff8800, 0xffff00, 0x00ff00, 0x0088ff, 0x8800ff];
        colors.forEach((c, i) => {
          g.fillStyle(c);
          g.fillRect(0, i * 4, 16, 4);
        });
        g.fillStyle(0xffffff); g.fillRect(4, 6, 4, 4); g.fillRect(10, 6, 4, 4);
        g.fillStyle(0x000000); g.fillRect(6, 7, 2, 3); g.fillRect(12, 7, 2, 3);
      }},
    ];

    skins.forEach((skin) => {
      const key = `player-${skin.name}`;
      if (!this.textures.exists(key)) {
        const g = this.make.graphics({ x: 0, y: 0 }, false);
        skin.draw(g);
        g.generateTexture(key, 16, 24);
        g.destroy();
      }
    });
  }

  private generateBackground(
    key: string, topColor: number, midColor: number, botColor: number,
    mountains = false, hills = false,
  ) {
    const gfx = this.make.graphics({ x: 0, y: 0 }, false);
    if (mountains) {
      gfx.fillStyle(0x0f3460, 0); gfx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      gfx.fillStyle(0x1a3a5c, 0.6);
      for (let i = 0; i < 6; i++) {
        const x = i * 70 - 10;
        const h = 60 + Math.sin(i * 1.5) * 30;
        gfx.fillTriangle(x, GAME_HEIGHT, x + 40, GAME_HEIGHT - h, x + 80, GAME_HEIGHT);
      }
    } else if (hills) {
      gfx.fillStyle(0x0f3460, 0); gfx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      gfx.fillStyle(0x1e5631, 0.5);
      for (let i = 0; i < 8; i++) {
        gfx.fillCircle(i * 55 + 5, GAME_HEIGHT + 10, 40);
      }
    } else {
      const steps = 20;
      for (let i = 0; i < steps; i++) {
        const t = i / steps;
        const color = t < 0.5 ? this.lerpColor(topColor, midColor, t * 2) : this.lerpColor(midColor, botColor, (t - 0.5) * 2);
        gfx.fillStyle(color);
        const bh = Math.ceil(GAME_HEIGHT / steps);
        gfx.fillRect(0, i * bh, GAME_WIDTH, bh + 1);
      }
      gfx.fillStyle(0xffffff, 0.7);
      for (let i = 0; i < 30; i++) {
        gfx.fillRect(Math.floor(Math.random() * GAME_WIDTH), Math.floor(Math.random() * GAME_HEIGHT * 0.6), 1, 1);
      }
    }
    gfx.generateTexture(key, GAME_WIDTH, GAME_HEIGHT); gfx.destroy();
  }

  private lerpColor(a: number, b: number, t: number): number {
    const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
    const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
    return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
  }
}
