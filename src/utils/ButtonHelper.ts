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
