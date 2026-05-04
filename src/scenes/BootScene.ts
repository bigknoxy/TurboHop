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
    // Body
    g.fillStyle(0x4488ff); g.fillRect(0, 0, 16, 24);
    // Shading for 3D effect
    g.fillStyle(0x3366cc); g.fillRect(0, 0, 2, 24); g.fillRect(0, 0, 16, 2);
    g.fillStyle(0x55aaff); g.fillRect(14, 0, 2, 24); g.fillRect(0, 22, 16, 2);
    // Eyes with white sclera and black pupils
    g.fillStyle(0xffffff); g.fillRect(3, 6, 5, 5); g.fillRect(9, 6, 5, 5);
    g.fillStyle(0x000000); g.fillRect(5, 7, 2, 3); g.fillRect(11, 7, 2, 3);
    // Eye shine (pixel highlight)
    g.fillStyle(0xffffff); g.fillRect(5, 7, 1, 1); g.fillRect(11, 7, 1, 1);
    // Smile/mouth
    g.fillStyle(0xffaa44); g.fillRect(5, 14, 6, 2);
    g.fillStyle(0xffcc66); g.fillRect(6, 14, 4, 1); // shine on mouth
    g.generateTexture('player', 16, 24); g.destroy();
  }

  private genPlatform(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    // Base green platform
    g.fillStyle(0x44aa44); g.fillRect(0, 0, 48, 16);
    // Top highlight (grass)
    g.fillStyle(0x55cc55); g.fillRect(0, 0, 48, 3);
    // Grass tufts
    g.fillStyle(0x33dd33); g.fillRect(4, 0, 2, 2); g.fillRect(12, 0, 3, 2); g.fillRect(20, 0, 2, 2); g.fillRect(30, 0, 3, 2); g.fillRect(40, 0, 2, 2);
    // Dark edge at bottom
    g.fillStyle(0x338833); g.fillRect(0, 14, 48, 2);
    // Wood grain lines
    g.fillStyle(0x3a993a); g.fillRect(0, 5, 48, 1); g.fillRect(0, 9, 48, 1);
    // Edge highlights for 3D effect
    g.fillStyle(0x66ee66); g.fillRect(1, 1, 46, 1);
    g.fillStyle(0x226622); g.fillRect(0, 15, 48, 1);
    g.generateTexture('platform', 48, 16); g.destroy();
  }

  private genWidePlatform(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    // Base green platform
    g.fillStyle(0x44aa44); g.fillRect(0, 0, 80, 16);
    // Top highlight (grass)
    g.fillStyle(0x55cc55); g.fillRect(0, 0, 80, 3);
    // Grass tufts
    g.fillStyle(0x33dd33); g.fillRect(4, 0, 2, 2); g.fillRect(15, 0, 3, 2); g.fillRect(25, 0, 2, 2); g.fillRect(35, 0, 3, 2); g.fillRect(45, 0, 2, 2); g.fillRect(55, 0, 3, 2); g.fillRect(65, 0, 2, 2); g.fillRect(75, 0, 3, 2);
    // Dark edge at bottom
    g.fillStyle(0x338833); g.fillRect(0, 14, 80, 2);
    // Wood grain lines
    g.fillStyle(0x3a993a); g.fillRect(0, 5, 80, 1); g.fillRect(0, 9, 80, 1);
    // Edge highlights for 3D effect
    g.fillStyle(0x66ee66); g.fillRect(1, 1, 78, 1);
    g.fillStyle(0x226622); g.fillRect(0, 15, 80, 1);
    g.generateTexture('platform-wide', 80, 16); g.destroy();
  }

  private genSlime(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    // Body (rounded bottom)
    g.fillStyle(0xdd3333); g.fillRoundedRect(0, 4, 16, 12, 4);
    // Highlight/shading for 3D effect
    g.fillStyle(0xee5555); g.fillRect(2, 4, 3, 8);
    g.fillStyle(0xcc2222); g.fillRect(11, 4, 3, 8);
    // Googly eyes (white with black pupils that look to the side)
    g.fillStyle(0xffffff); g.fillCircle(5, 7, 3); g.fillCircle(11, 7, 3);
    g.fillStyle(0x000000); g.fillCircle(6, 7, 2); g.fillCircle(12, 7, 2);
    // Eye shine
    g.fillStyle(0xffffff); g.fillCircle(5, 6, 1); g.fillCircle(11, 6, 1);
    // Mouth
    g.fillStyle(0xaa2222); g.fillRect(5, 12, 6, 1);
    g.generateTexture('slime', 16, 16); g.destroy();
  }

  private genBird(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    // Body
    g.fillStyle(0xff8844); g.fillRect(4, 4, 10, 8);
    // Wing details (feather lines)
    g.fillStyle(0xee7733); g.fillRect(5, 5, 1, 6); g.fillRect(7, 5, 1, 6); g.fillRect(9, 5, 1, 6);
    // Wing tips
    g.fillStyle(0xffaa66); g.fillTriangle(0, 8, 4, 4, 4, 8); g.fillTriangle(14, 4, 16, 2, 14, 8);
    // Beak (orange/yellow triangle)
    g.fillStyle(0xffcc00); g.fillTriangle(14, 6, 16, 8, 14, 10);
    // Eye with white and pupil
    g.fillStyle(0xffffff); g.fillCircle(9, 6, 2);
    g.fillStyle(0x000000); g.fillCircle(10, 6, 1);
    // Eye shine
    g.fillStyle(0xffffff); g.fillRect(10, 5, 1, 1);
    // Feet
    g.fillStyle(0xffcc00); g.fillRect(6, 12, 2, 1); g.fillRect(10, 12, 2, 1);
    g.generateTexture('bird', 16, 16); g.destroy();
  }

  private genBat(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    // Body
    g.fillStyle(0x6633aa); g.fillRect(5, 4, 6, 8);
    // Body shading
    g.fillStyle(0x7744bb); g.fillRect(5, 4, 1, 8);
    g.fillStyle(0x552299); g.fillRect(10, 4, 1, 8);
    // Wings (more detailed)
    g.fillStyle(0x552299); g.fillTriangle(0, 4, 5, 2, 5, 8);
    g.fillStyle(0x441188); g.fillTriangle(11, 2, 16, 4, 11, 8);
    // Wing veins
    g.fillStyle(0x6633aa); g.fillTriangle(1, 4, 5, 3, 5, 7);
    g.fillTriangle(11, 3, 15, 4, 11, 7);
    // Eyes (red and glowing)
    g.fillStyle(0xff0000); g.fillCircle(6, 5, 2); g.fillCircle(9, 5, 2);
    g.fillStyle(0xff4444); g.fillCircle(6, 5, 1); g.fillCircle(9, 5, 1);
    // Fangs
    g.fillStyle(0xffffff); g.fillTriangle(6, 10, 7, 12, 8, 10);
    g.fillTriangle(9, 10, 10, 12, 11, 10);
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
    // Body (semi-transparent)
    g.fillStyle(0xffffff, 0.6);
    g.fillRoundedRect(2, 0, 12, 12, 6);
    // Wavy bottom
    g.fillCircle(4, 14, 2); g.fillCircle(8, 14, 2); g.fillCircle(12, 14, 2);
    // Spooky eyes (large, oval-shaped)
    g.fillStyle(0x000000); g.fillEllipse(5, 5, 3, 4); g.fillEllipse(11, 5, 3, 4);
    // Eye glow (small white dots)
    g.fillStyle(0x888888, 0.5); g.fillCircle(4, 4, 1); g.fillCircle(10, 4, 1);
    // Mouth (small spooky line)
    g.fillStyle(0x000000); g.fillRect(6, 9, 4, 1);
    g.generateTexture('ghost', 16, 16); g.destroy();
  }

  private genCoin(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    // Outer ring
    g.fillStyle(0xffaa00); g.fillCircle(6, 6, 6);
    // Inner circle (darker)
    g.fillStyle(0xffdd00); g.fillCircle(6, 6, 5);
    // Shine/gradient effect (top-left highlight)
    g.fillStyle(0xffee44); g.fillCircle(4, 4, 3);
    // Bright spot (specular highlight)
    g.fillStyle(0xffff88); g.fillCircle(3, 3, 1);
    // Dollar sign / star shape in center
    g.fillStyle(0xffaa00); g.fillRect(5, 3, 2, 6); g.fillRect(3, 5, 6, 2);
    g.generateTexture('coin', 12, 12); g.destroy();
  }

  private genPowerUp(key: string, color: number): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    // Background with border
    g.fillStyle(color, 0.3); g.fillRect(0, 0, 14, 14);
    g.fillStyle(color); g.fillRect(1, 1, 12, 12);
    g.fillStyle(0xffffff, 0.6); g.fillRect(2, 2, 4, 2);

    // Draw distinct icons based on power-up type
    if (key === 'powerup-magnet') {
      // Magnet icon - U shape
      g.fillStyle(0xffffff); g.fillRect(3, 4, 2, 6); g.fillRect(9, 4, 2, 6);
      g.fillStyle(color); g.fillRect(5, 4, 4, 2);
    } else if (key === 'powerup-shield') {
      // Shield icon - circle with border
      g.fillStyle(0xffffff); g.fillCircle(7, 7, 4);
      g.fillStyle(color); g.fillCircle(7, 7, 2);
    } else if (key === 'powerup-double') {
      // 2X text
      g.fillStyle(0x000000);
      g.fillRect(3, 4, 2, 6); g.fillRect(3, 4, 4, 2); g.fillRect(3, 8, 4, 2); // 2
      g.fillRect(8, 4, 2, 6); g.fillRect(8, 4, 4, 2); g.fillRect(8, 8, 4, 2); // 2
    } else if (key === 'powerup-boost') {
      // Speed boost - lightning bolt
      g.fillStyle(0xffff00);
      g.fillTriangle(7, 3, 10, 7, 7, 7);
      g.fillTriangle(7, 7, 10, 7, 7, 11);
    }

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
        // Shading
        g.fillStyle(0x111111); g.fillRect(0, 0, 2, 24); g.fillRect(0, 0, 16, 2);
        g.fillStyle(0x333333); g.fillRect(14, 0, 2, 24); g.fillRect(0, 22, 16, 2);
        // Headband
        g.fillStyle(0xff2222); g.fillRect(2, 2, 12, 3);
        g.fillStyle(0xff4444); g.fillRect(2, 2, 12, 1); // shine
        // Headband tails
        g.fillStyle(0xff2222); g.fillRect(0, 2, 2, 6); g.fillRect(14, 2, 2, 6);
        // Eyes (narrow)
        g.fillStyle(0xffffff); g.fillRect(4, 6, 3, 3); g.fillRect(10, 6, 3, 3);
        g.fillStyle(0x000000); g.fillRect(5, 7, 2, 2); g.fillRect(11, 7, 2, 2);
        // Eye shine
        g.fillStyle(0xffffff); g.fillRect(5, 7, 1, 1); g.fillRect(11, 7, 1, 1);
      }},
      { name: 'ROBOT', draw: (g) => {
        g.fillStyle(0x888888); g.fillRect(0, 4, 16, 20);
        // Metal shading
        g.fillStyle(0x999999); g.fillRect(1, 4, 14, 1); g.fillRect(0, 4, 1, 20);
        g.fillStyle(0x666666); g.fillRect(15, 4, 1, 20); g.fillRect(0, 23, 16, 1);
        // Head
        g.fillStyle(0xaaaaaa); g.fillRect(2, 4, 12, 8);
        // Antenna
        g.fillStyle(0xcccccc); g.fillRect(6, 0, 4, 4);
        g.fillStyle(0xff0000); g.fillCircle(8, 1, 1); // light on antenna
        // Eyes (glowing blue)
        g.fillStyle(0x44ffff); g.fillRect(4, 6, 3, 3); g.fillRect(9, 6, 3, 3);
        g.fillStyle(0x88ffff); g.fillRect(4, 6, 1, 1); g.fillRect(9, 6, 1, 1); // shine
        // Mouth (grill)
        g.fillStyle(0x666666); g.fillRect(5, 16, 6, 2);
        g.fillStyle(0x555555); g.fillRect(5, 16, 6, 1);
      }},
      { name: 'CAT', draw: (g) => {
        g.fillStyle(0xff9944); g.fillRect(0, 4, 16, 20);
        // Shading
        g.fillStyle(0xee8833); g.fillRect(1, 4, 14, 1); g.fillRect(0, 4, 1, 20);
        g.fillStyle(0xdd7733); g.fillRect(15, 4, 1, 20); g.fillRect(0, 23, 16, 1);
        // Ears (pointed, with inner ear)
        g.fillStyle(0xff9944); g.fillTriangle(1, 4, 4, 0, 7, 4);
        g.fillTriangle(9, 4, 12, 0, 15, 4);
        g.fillStyle(0xffaa66); g.fillTriangle(2, 4, 4, 1, 6, 4);
        g.fillTriangle(10, 4, 12, 1, 14, 4);
        // Eyes (cat-like vertical pupils)
        g.fillStyle(0xffffff); g.fillRect(4, 7, 3, 3); g.fillRect(9, 7, 3, 3);
        g.fillStyle(0x000000); g.fillRect(5, 7, 1, 3); g.fillRect(10, 7, 1, 3);
        // Nose (pink)
        g.fillStyle(0xff7722); g.fillRect(6, 12, 4, 2);
        g.fillStyle(0xff8844); g.fillRect(7, 12, 2, 1); // shine
        // Whiskers
        g.fillStyle(0xdd7733); g.fillRect(1, 11, 3, 1); g.fillRect(1, 13, 3, 1);
        g.fillRect(12, 11, 3, 1); g.fillRect(12, 13, 3, 1);
      }},
      { name: 'WIZARD', draw: (g) => {
        g.fillStyle(0x5522aa); g.fillRect(0, 8, 16, 16);
        // Shading
        g.fillStyle(0x4411aa); g.fillRect(0, 8, 2, 16); g.fillRect(0, 8, 16, 2);
        g.fillStyle(0x6633bb); g.fillRect(14, 8, 2, 16); g.fillRect(0, 22, 16, 2);
        // Pointed hat
        g.fillTriangle(2, 8, 8, -2, 14, 8);
        g.fillStyle(0x4411aa); g.fillTriangle(3, 8, 8, 0, 13, 8); // hat shading
        g.fillStyle(0xffdd00); g.fillRect(2, 7, 12, 2); // hat brim
        g.fillStyle(0xffee44); g.fillRect(2, 7, 12, 1); // shine
        // Eyes
        g.fillStyle(0xffffff); g.fillRect(4, 10, 3, 3); g.fillRect(9, 10, 3, 3);
        g.fillStyle(0x000000); g.fillRect(5, 11, 2, 2); g.fillRect(10, 11, 2, 2);
        // Eye shine
        g.fillStyle(0xffffff); g.fillRect(5, 11, 1, 1); g.fillRect(10, 11, 1, 1);
        // Star on hat
        g.fillStyle(0xffdd00); g.fillCircle(8, 2, 2);
        g.fillStyle(0xffee44); g.fillCircle(8, 2, 1);
        // Beard
        g.fillStyle(0xaaaaaa); g.fillRect(4, 14, 8, 6);
        g.fillStyle(0xcccccc); g.fillRect(5, 14, 6, 1);
      }},
      { name: 'ASTRO', draw: (g) => {
        g.fillStyle(0xeeeeee); g.fillRect(0, 0, 16, 24);
        // Shading
        g.fillStyle(0xdddddd); g.fillRect(0, 0, 2, 24); g.fillRect(0, 0, 16, 2);
        g.fillStyle(0xffffff); g.fillRect(14, 0, 2, 24); g.fillRect(0, 22, 16, 2);
        // Helmet bubble
        g.fillStyle(0x88ccff, 0.5); g.fillCircle(8, 6, 6);
        g.fillStyle(0x88ccff, 0.8); g.fillCircle(8, 6, 5); // stronger center
        // Eyes (visible through helmet)
        g.fillStyle(0xffffff); g.fillRect(4, 4, 3, 3); g.fillRect(9, 4, 3, 3);
        g.fillStyle(0x000000); g.fillRect(5, 5, 2, 2); g.fillRect(10, 5, 2, 2);
        // Eye shine
        g.fillStyle(0xffffff); g.fillRect(5, 5, 1, 1); g.fillRect(10, 5, 1, 1);
        // Patch (red)
        g.fillStyle(0xff4444); g.fillRect(0, 14, 4, 3);
        g.fillStyle(0xff6666); g.fillRect(0, 14, 4, 1); // shine
        // NASA-style logo
        g.fillStyle(0x4444ff); g.fillRect(6, 16, 4, 4);
        g.fillStyle(0x6666ff); g.fillRect(7, 17, 2, 2);
      }},
      { name: 'SKELLY', draw: (g) => {
        g.fillStyle(0x111111); g.fillRect(0, 0, 16, 24);
        // Skull
        g.fillStyle(0xffffff); g.fillRoundedRect(2, 2, 12, 10, 3);
        g.fillStyle(0xeeeeee); g.fillRoundedRect(3, 3, 10, 8, 2); // inner
        // Eyes (empty sockets)
        g.fillStyle(0x000000); g.fillRect(4, 5, 3, 4); g.fillRect(9, 5, 3, 4);
        // Mouth (teeth)
        g.fillStyle(0x000000); g.fillRect(6, 10, 4, 2);
        g.fillStyle(0xffffff); g.fillRect(6, 10, 1, 1); g.fillRect(8, 10, 1, 1); g.fillRect(10, 10, 1, 1);
        // Ribs
        g.fillStyle(0xffffff);
        g.fillRect(4, 14, 8, 1); g.fillRect(5, 15, 6, 1);
        g.fillRect(4, 16, 8, 1); g.fillRect(5, 17, 6, 1);
        g.fillRect(4, 18, 8, 1); g.fillRect(5, 19, 6, 1);
        // Spine
        g.fillStyle(0xdddddd); g.fillRect(7, 14, 2, 6);
      }},
      { name: 'DRAGON', draw: (g) => {
        g.fillStyle(0x22aa44); g.fillRect(0, 2, 16, 22);
        // Shading
        g.fillStyle(0x119933); g.fillRect(0, 2, 2, 22); g.fillRect(0, 2, 16, 2);
        g.fillStyle(0x33bb55); g.fillRect(14, 2, 2, 22); g.fillRect(0, 22, 16, 2);
        // Wings
        g.fillStyle(0x44cc66);
        g.fillTriangle(-2, 8, 2, 2, 2, 14);
        g.fillTriangle(14, 2, 18, 8, 14, 14);
        // Wing veins
        g.fillStyle(0x22aa44);
        g.fillTriangle(0, 8, 2, 3, 2, 13);
        g.fillTriangle(14, 3, 16, 8, 14, 13);
        // Eyes (fiery)
        g.fillStyle(0xffdd00); g.fillRect(4, 5, 3, 3); g.fillRect(9, 5, 3, 3);
        g.fillStyle(0xff4400); g.fillRect(5, 6, 2, 2); g.fillRect(10, 6, 2, 2);
        // Eye shine
        g.fillStyle(0xffff00); g.fillRect(5, 6, 1, 1); g.fillRect(10, 6, 1, 1);
        // Belly (lighter)
        g.fillStyle(0xffcc44); g.fillRect(5, 14, 6, 6);
        g.fillStyle(0xffdd55); g.fillRect(6, 15, 4, 1); // shine
        // Horns
        g.fillStyle(0x44dd66); g.fillTriangle(3, 2, 5, -2, 7, 2);
        g.fillTriangle(9, 2, 11, -2, 13, 2);
      }},
      { name: 'RAINBOW', draw: (g) => {
        const colors = [0xff0000, 0xff8800, 0xffff00, 0x00ff00, 0x0088ff, 0x8800ff];
        colors.forEach((c, i) => {
          g.fillStyle(c);
          g.fillRect(0, i * 4, 16, 4);
        });
        // Shading on each band
        g.fillStyle(0x000000, 0.2);
        colors.forEach((_, i) => { g.fillRect(0, i * 4, 16, 1); });
        // Eyes
        g.fillStyle(0xffffff); g.fillRect(4, 6, 4, 4); g.fillRect(10, 6, 4, 4);
        g.fillStyle(0x000000); g.fillRect(6, 7, 2, 3); g.fillRect(12, 7, 2, 3);
        // Eye shine
        g.fillStyle(0xffffff); g.fillRect(6, 7, 1, 1); g.fillRect(12, 7, 1, 1);
        // Smile
        g.fillStyle(0xffffff); g.fillRect(6, 14, 4, 2);
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
