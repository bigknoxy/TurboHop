import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';

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
