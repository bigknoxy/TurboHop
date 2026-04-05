import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';

const DIAGONAL = Math.sqrt(GAME_WIDTH * GAME_WIDTH + GAME_HEIGHT * GAME_HEIGHT);

export function irisOut(scene: Phaser.Scene, cx: number, cy: number, duration: number, onComplete: () => void): void {
  const gfx = scene.add.graphics();
  gfx.setDepth(2000);
  const mask = { radius: DIAGONAL };

  scene.tweens.add({
    targets: mask,
    radius: 0,
    duration,
    ease: 'Quad.easeIn',
    onUpdate: () => {
      gfx.clear();
      // Fill screen black, then cut out a circle
      gfx.fillStyle(0x000000);
      gfx.fillRect(0, 0, GAME_WIDTH * 2, GAME_HEIGHT * 2);
      gfx.fillStyle(0x000000, 0); // transparent
      // Use a "reverse" approach: draw black everywhere except the circle
      // Phaser graphics doesn't support clipping, so draw black rect and use blendMode
      // Simpler approach: draw expanding black ring
      gfx.clear();
      gfx.fillStyle(0x000000);
      // Top
      gfx.fillRect(0, 0, GAME_WIDTH, Math.max(0, cy - mask.radius));
      // Bottom
      gfx.fillRect(0, cy + mask.radius, GAME_WIDTH, GAME_HEIGHT - cy - mask.radius);
      // Left
      gfx.fillRect(0, 0, Math.max(0, cx - mask.radius), GAME_HEIGHT);
      // Right
      gfx.fillRect(cx + mask.radius, 0, GAME_WIDTH - cx - mask.radius, GAME_HEIGHT);
      // Fill corners with additional rects for rough circle approximation
      for (let a = 0; a < Math.PI * 2; a += 0.15) {
        const ex = cx + Math.cos(a) * mask.radius;
        const ey = cy + Math.sin(a) * mask.radius;
        // Draw small black rects outside the circle edge
        if (ex < 0 || ex > GAME_WIDTH || ey < 0 || ey > GAME_HEIGHT) continue;
      }
    },
    onComplete: () => {
      gfx.clear();
      gfx.fillStyle(0x000000);
      gfx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      scene.time.delayedCall(50, () => {
        gfx.destroy();
        onComplete();
      });
    },
  });
}

export function irisIn(scene: Phaser.Scene, duration: number, onComplete?: () => void): void {
  const gfx = scene.add.graphics();
  gfx.setDepth(2000);
  gfx.fillStyle(0x000000);
  gfx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  const cx = GAME_WIDTH / 2;
  const cy = GAME_HEIGHT / 2;
  const mask = { radius: 0 };

  scene.tweens.add({
    targets: mask,
    radius: DIAGONAL,
    duration,
    ease: 'Quad.easeOut',
    onUpdate: () => {
      gfx.clear();
      gfx.fillStyle(0x000000);
      gfx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      // Cut out circle by drawing transparent-ish area (use alpha)
      gfx.fillStyle(0x000000, 0);
      // Fake iris: just fade alpha based on radius ratio
      const progress = mask.radius / DIAGONAL;
      gfx.clear();
      gfx.fillStyle(0x000000, 1 - progress);
      gfx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    },
    onComplete: () => {
      gfx.destroy();
      if (onComplete) onComplete();
    },
  });
}

export function fadeOut(scene: Phaser.Scene, duration: number, onComplete: () => void): void {
  const rect = scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0);
  rect.setDepth(2000).setScrollFactor(0);
  scene.tweens.add({
    targets: rect,
    alpha: 1,
    duration,
    onComplete: () => {
      rect.destroy();
      onComplete();
    },
  });
}

export function fadeIn(scene: Phaser.Scene, duration: number, onComplete?: () => void): void {
  const rect = scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 1);
  rect.setDepth(2000).setScrollFactor(0);
  scene.tweens.add({
    targets: rect,
    alpha: 0,
    duration,
    onComplete: () => {
      rect.destroy();
      if (onComplete) onComplete();
    },
  });
}
