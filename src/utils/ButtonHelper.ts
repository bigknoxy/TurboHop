import Phaser from 'phaser';

export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  style: Phaser.Types.GameObjects.Text.TextStyle,
  onClick: () => void,
): Phaser.GameObjects.Text {
  const btn = scene.add
    .text(x, y, text, style)
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });

  btn.on('pointerover', () => {
    btn.setScale(1.1);
  });
  btn.on('pointerout', () => {
    btn.setScale(1.0);
  });
  btn.on('pointerdown', () => {
    btn.setScale(0.95);
    onClick();
  });
  btn.on('pointerup', () => {
    btn.setScale(1.1);
  });

  return btn;
}

/**
 * Adds a fullscreen toggle button. Returns null if fullscreen is not supported.
 * Sets a frame-long flag on the game registry to signal other scenes to ignore
 * the pointer event (prevents fullscreen tap from also triggering jump/start).
 */
export function addFullscreenButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
): Phaser.GameObjects.Text | null {
  if (!scene.sys.game.device.fullscreen.available) return null;

  const btn = scene.add
    .text(x, y, '[ ]', {
      fontFamily: '"Press Start 2P"',
      fontSize: '5px',
      color: '#666666',
    })
    .setOrigin(1, 0)
    .setInteractive({ useHandCursor: true });

  btn.on('pointerover', () => btn.setScale(1.1));
  btn.on('pointerout', () => btn.setScale(1.0));
  btn.on('pointerdown', () => {
    // Flag to prevent other scenes from processing this tap
    scene.game.registry.set('__fsButtonPressed', true);
    scene.time.delayedCall(50, () => {
      scene.game.registry.set('__fsButtonPressed', false);
    });

    if (scene.scale.isFullscreen) {
      scene.scale.stopFullscreen();
    } else {
      scene.scale.startFullscreen();
    }
  });

  return btn;
}
