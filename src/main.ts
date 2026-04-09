import Phaser from 'phaser';
import { GAME_HEIGHT, GRAVITY, initGameSize } from './constants';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';
import { GameOverScene } from './scenes/GameOverScene';
import { ShopScene } from './scenes/ShopScene';
import { UpgradeScene } from './scenes/UpgradeScene';
import { SettingsScene } from './scenes/SettingsScene';
import { LeaderboardScene } from './scenes/LeaderboardScene';
import { EventBus } from './utils/EventBus';
import './systems/InstallManager'; // Initialize early to capture beforeinstallprompt

// Compute the canvas width from the device aspect ratio BEFORE Phaser reads
// the config, so the playfield exactly fits the viewport and FIT mode has no
// letterbox to draw.
const size = initGameSize();

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: size.width,
  height: size.height,
  parent: 'game',
  pixelArt: true,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: GRAVITY },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, MenuScene, GameScene, UIScene, GameOverScene, ShopScene, UpgradeScene, SettingsScene, LeaderboardScene],
  input: { gamepad: true },
  backgroundColor: '#1a1a2e',
};

const game = new Phaser.Game(config);

// Rebuild the canvas when the viewport changes (PWA orientation change,
// browser resize, split-screen on tablets). We recompute the canvas width to
// keep the aspect-ratio-perfect fill, then broadcast a 'game:resize' event so
// any scene that cares can relayout. For scenes without a handler the worst
// case is harmless — FIT still fills correctly, UI stays at its original
// positions relative to the old canvas until the scene is re-entered.
let resizePending = false;
function handleViewportChange() {
  if (resizePending) return;
  resizePending = true;
  window.requestAnimationFrame(() => {
    resizePending = false;
    const next = initGameSize();
    game.scale.resize(next.width, GAME_HEIGHT);
    EventBus.emit('game:resize', next);
  });
}
window.addEventListener('resize', handleViewportChange);
window.addEventListener('orientationchange', handleViewportChange);
