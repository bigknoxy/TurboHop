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

// Self-host Press Start 2P via @fontsource so the PWA works offline and
// doesn't depend on a Google Fonts CDN round-trip (which can fail behind
// corporate proxies, captive portals, or plane-mode). Vite inlines the
// @font-face rule and bundles the .woff2 file into the build.
import '@fontsource/press-start-2p/latin-400.css';

// ---- Boot sequence --------------------------------------------------------
// 1. Compute canvas width from viewport aspect ratio.
// 2. Await the font file — Phaser burns text glyphs into bitmap the first
//    time a Text object is created, so the font must be ready *before* any
//    scene calls `this.add.text(...)`. If the font fails to load (network
//    error, offline without cache), we fall through after 3 s and let
//    Phaser render with the browser fallback — ugly but functional.
// 3. Construct the Phaser.Game.
// 4. Wire up resize & orientation handlers.

const size = initGameSize();

async function boot() {
  try {
    await Promise.race([
      document.fonts.load('10px "Press Start 2P"'),
      new Promise((r) => setTimeout(r, 3000)),
    ]);
  } catch {
    // Font preload failed; continue with fallback.
  }

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

  // Expose the game instance and EventBus for e2e tests to walk the scene
  // graph, assert on state, and trigger events deterministically.
  (window as unknown as { __TURBOHOP__?: { game: Phaser.Game; events: Phaser.Events.EventEmitter } }).__TURBOHOP__ = {
    game,
    events: EventBus,
  };

  // Rebuild the canvas when the viewport changes (PWA orientation change,
  // browser resize, split-screen on tablets).
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
}

boot();
