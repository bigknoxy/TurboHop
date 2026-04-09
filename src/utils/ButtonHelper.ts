import Phaser from 'phaser';

/**
 * Minimum tap-target padding in logical game pixels. With a typical 1.9x FIT
 * scale on a Pixel 9a, ~16 logical pixels ≈ 30 CSS px which lines up with
 * the 44×44 Apple HIG / 48×48 Material tap target guidance after the full
 * scale chain. This keeps tiny 5–7px pixel fonts tappable without changing
 * their visual size.
 */
const DEFAULT_PAD_X = 12;
const DEFAULT_PAD_Y = 10;

/**
 * Make an existing interactive display object easier to tap on mobile by
 * widening its hit area beyond the rendered bounds. Useful for Text objects
 * where the glyph box is only a few logical pixels tall.
 */
export function expandHitArea(
  target: Phaser.GameObjects.Text,
  padX: number = DEFAULT_PAD_X,
  padY: number = DEFAULT_PAD_Y,
): void {
  const hitArea = new Phaser.Geom.Rectangle(
    -padX,
    -padY,
    target.width + padX * 2,
    target.height + padY * 2,
  );
  target.setInteractive({
    hitArea,
    hitAreaCallback: Phaser.Geom.Rectangle.Contains,
    useHandCursor: true,
  });
}

export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  style: Phaser.Types.GameObjects.Text.TextStyle,
  onClick: () => void,
): Phaser.GameObjects.Text {
  const btn = scene.add.text(x, y, text, style).setOrigin(0.5);

  // Expand the hit area well beyond the rendered glyph bounds. Phaser hit
  // areas are in the text object's local (untransformed) coordinate space
  // with (0,0) at the top-left — origin 0.5 shifts the *render* but not the
  // hit geometry, so we extend from (-pad, -pad) to (width+pad, height+pad).
  const hitArea = new Phaser.Geom.Rectangle(
    -DEFAULT_PAD_X,
    -DEFAULT_PAD_Y,
    btn.width + DEFAULT_PAD_X * 2,
    btn.height + DEFAULT_PAD_Y * 2,
  );
  btn.setInteractive({
    hitArea,
    hitAreaCallback: Phaser.Geom.Rectangle.Contains,
    useHandCursor: true,
  });

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
