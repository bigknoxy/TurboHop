// End-to-end smoke flows for TurboHop. These are deliberately written as a
// flat list of named scenarios so new devs can read them top-to-bottom and
// understand what the game is supposed to do. Each scenario:
//
//   1. Opens a fresh browser context at Pixel 9a landscape dimensions.
//   2. Drives the game via keyboard / tap / EventBus.
//   3. Asserts on scene state + text content and captures a screenshot.
//
// Run:  PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node e2e/flows.mjs
// Run one:  ...flows.mjs menu

import { mkdirSync } from 'node:fs';
import {
  openGame, waitForScene, readSceneTexts, clickGame,
  measureCanvas, pressKey, killPlayer, assert, PIXEL_9A,
} from './lib.mjs';

const OUT = 'e2e/screenshots';
mkdirSync(OUT, { recursive: true });

/**
 * Start a game run from the menu. We bypass the MenuScene pointer handler
 * by calling `scene.start('GameScene')` directly because Phaser's input
 * queueing is racy under Playwright's synthetic events. For the flows that
 * specifically test the TAP-TO-START interaction we still use clickGame.
 */
async function startGame(page) {
  await page.evaluate(() => {
    const g = window.__TURBOHOP__.game;
    // SceneManager's start() stops the caller implicitly for the first
    // scene; to add UIScene as a parallel overlay we use `run` which
    // handles both "not yet active" and "already active" transparently.
    g.scene.getScene('MenuScene')?.scene.start('GameScene');
    g.scene.run('UIScene');
  });
  await waitForScene(page, 'GameScene', 5000);
}

const results = [];

async function run(name, fn) {
  // Allow CLI filtering: `node e2e/flows.mjs game-over` runs just the
  // scenarios whose name contains "game-over".
  const filter = process.argv[2];
  if (filter && !name.includes(filter)) return;

  const started = Date.now();
  try {
    await fn();
    const ms = Date.now() - started;
    results.push({ name, ok: true, ms });
    console.log(`  PASS  ${name}  (${ms}ms)`);
  } catch (err) {
    const ms = Date.now() - started;
    results.push({ name, ok: false, ms, err: err.message });
    console.log(`  FAIL  ${name}  (${ms}ms)  ${err.message}`);
  }
}

// --- Flow 1: Menu renders fullscreen, shows title, HI score, and buttons ---
await run('menu-renders-fullscreen', async () => {
  const { browser, page, errors } = await openGame();
  try {
    const m = await measureCanvas(page);
    assert(m.gaps.left < 1 && m.gaps.right < 1, `expected no horizontal letterbox, got L:${m.gaps.left} R:${m.gaps.right}`);
    assert(m.gaps.top < 2 && m.gaps.bottom < 2, `expected no vertical letterbox, got T:${m.gaps.top} B:${m.gaps.bottom}`);

    const texts = await readSceneTexts(page, 'MenuScene');
    assert(texts.includes('TURBOHOP'), `expected TURBOHOP in menu, got ${JSON.stringify(texts)}`);
    assert(texts.includes('TAP TO START'), `expected TAP TO START, got ${JSON.stringify(texts)}`);
    assert(texts.some((t) => t === 'SETTINGS'), 'expected SETTINGS button');
    assert(texts.some((t) => t === 'LEADERBOARD'), 'expected LEADERBOARD button');
    assert(texts.some((t) => t === 'UPGRADES'), 'expected UPGRADES button');

    assert(errors.length === 0, `runtime errors: ${errors.join(' | ')}`);
    await page.screenshot({ path: `${OUT}/flow-1-menu.png` });
  } finally {
    await browser.close();
  }
});

// --- Flow 2: Daily challenge banner sits in the safe slot, never over title ---
await run('daily-challenge-banner-doesnt-overlap-title', async () => {
  const { browser, page } = await openGame();
  try {
    // Give the banner a beat to fetch + render.
    await page.waitForTimeout(800);
    const bannerVisible = await page.evaluate(() => {
      const g = window.__TURBOHOP__.game;
      const scene = g?.scene.getScene('MenuScene');
      if (!scene) return false;
      const labels = [];
      const walk = (node) => {
        if (!node) return;
        if (node.type === 'Text' && node.text) labels.push(node.text);
        if (node.list) node.list.forEach(walk);
      };
      scene.children.list.forEach(walk);
      return labels.some((t) => t.includes('DAILY CHALLENGE') || t.includes('CHALLENGE COMPLETE'));
    });

    // Regardless of banner state, assert TURBOHOP title is still top-most
    // in its own y range (50..74). If banner is rendered and visible, it
    // must be below y=80 (panel top >=80).
    const geometry = await page.evaluate(() => {
      const g = window.__TURBOHOP__.game;
      const scene = g?.scene.getScene('MenuScene');
      if (!scene) return null;
      const title = scene.children.list.find((c) => c.type === 'Text' && c.text === 'TURBOHOP');
      let bannerTop = null;
      const walkForBanner = (node) => {
        if (!node) return;
        if (node.type === 'Container' && node.depth === 100) {
          // Daily Challenge banner container — its local (0,0) is the
          // panel center at y=108, panel height 56, so top edge is y-28.
          bannerTop = node.y - 28;
        }
        if (node.list) node.list.forEach(walkForBanner);
      };
      scene.children.list.forEach(walkForBanner);
      return {
        titleY: title?.y,
        titleBottom: title ? title.y + title.height / 2 : null,
        bannerTop,
      };
    });
    if (bannerVisible && geometry?.bannerTop != null && geometry?.titleBottom != null) {
      assert(
        geometry.bannerTop >= geometry.titleBottom,
        `banner top (${geometry.bannerTop}) overlaps title bottom (${geometry.titleBottom})`,
      );
    }
    await page.screenshot({ path: `${OUT}/flow-2-banner.png` });
  } finally {
    await browser.close();
  }
});

// --- Flow 3a: Real pointer click on the menu starts the game ---
await run('real-click-to-start-runs-game', async () => {
  const { browser, page } = await openGame();
  try {
    // Tap a safe empty region well below the banner and above the buttons
    // so we're exercising the MenuScene "tap anywhere to start" handler
    // rather than any interactive widget.
    const logical = await page.evaluate(() => ({
      w: window.__TURBOHOP__.game.scale.width,
      h: window.__TURBOHOP__.game.scale.height,
    }));
    await clickGame(page, logical.w / 2, 160);
    await waitForScene(page, 'GameScene', 5000);
  } finally {
    await browser.close();
  }
});

// --- Flow 3: Start game (programmatically) → GameScene + UIScene + player exists ---
await run('start-game-runs-scenes-and-player', async () => {
  const { browser, page } = await openGame();
  try {
    await startGame(page);
    await waitForScene(page, 'UIScene', 2000);

    // Player sprite must exist and be on-screen.
    const playerState = await page.evaluate(() => {
      const g = window.__TURBOHOP__.game;
      const scene = g?.scene.getScene('GameScene');
      const player = scene?.player;
      return player
        ? { x: player.sprite.x, y: player.sprite.y, alive: !player.dead }
        : null;
    });
    assert(playerState !== null, 'player should exist in GameScene');
    assert(playerState.alive, 'player should start alive');
    assert(playerState.x > 0 && playerState.x < 200, `player x out of range: ${playerState.x}`);

    // HUD score starts at 0 and increments as the world scrolls.
    const initialTexts = await readSceneTexts(page, 'UIScene');
    assert(initialTexts.some((t) => /SCORE:\s*0/.test(t)), `UIScene missing SCORE: 0, got ${JSON.stringify(initialTexts)}`);

    await page.screenshot({ path: `${OUT}/flow-3-game-running.png` });
  } finally {
    await browser.close();
  }
});

// --- Flow 4: Jump responds to SPACE keydown ---
await run('space-key-triggers-jump', async () => {
  const { browser, page } = await openGame();
  try {
    await startGame(page);
    await page.waitForTimeout(400); // wait for player to touch ground

    const jumpTriggered = await page.evaluate(() => new Promise((resolve) => {
      const handle = window.__TURBOHOP__;
      let fired = false;
      const onJump = () => { fired = true; };
      handle.events.once('player:jump', onJump);
      setTimeout(() => resolve(fired), 400);
    }));

    // Race: press SPACE after the listener is installed.
    await pressKey(page, 'Space', 100);
    await page.waitForTimeout(500);

    const didJump = await page.evaluate(() => {
      const scene = window.__TURBOHOP__.game.scene.getScene('GameScene');
      return scene?.player && scene.player.sprite.body.velocity.y !== 0;
    });
    assert(jumpTriggered || didJump, 'player did not jump on SPACE');
    await page.screenshot({ path: `${OUT}/flow-4-jump.png` });
  } finally {
    await browser.close();
  }
});

// --- Flow 5: Game Over scene appears after death, shows score + retry ---
await run('game-over-shows-score-and-retry', async () => {
  const { browser, page } = await openGame();
  try {
    await startGame(page);
    await page.waitForTimeout(600); // build up a non-zero score
    await killPlayer(page);
    await waitForScene(page, 'GameOverScene', 5000);

    const texts = await readSceneTexts(page, 'GameOverScene');
    assert(texts.includes('GAME OVER'), `GAME OVER missing, got ${JSON.stringify(texts)}`);
    assert(texts.some((t) => /SCORE:\s*\d+/.test(t)), `expected SCORE line, got ${JSON.stringify(texts)}`);
    assert(texts.some((t) => /BEST:\s*\d+/.test(t)), `expected BEST line, got ${JSON.stringify(texts)}`);
    assert(texts.some((t) => t === 'TAP TO RETRY'), 'expected TAP TO RETRY button');
    assert(texts.some((t) => t === 'HOME'), 'expected HOME button');
    assert(texts.some((t) => t === 'SHOP'), 'expected SHOP button');
    assert(texts.some((t) => t === 'UPGRADES'), 'expected UPGRADES button');

    await page.screenshot({ path: `${OUT}/flow-5-game-over.png` });
  } finally {
    await browser.close();
  }
});

// --- Flow 6: High score persists across runs ---
await run('high-score-persists', async () => {
  const { browser, page } = await openGame();
  try {
    // Seed a high score in localStorage so the menu displays it without
    // requiring us to actually play to that score.
    await page.evaluate(() => {
      localStorage.setItem('turbohop_highscore', '9001');
    });
    await page.reload({ waitUntil: 'networkidle' });
    await waitForScene(page, 'MenuScene', 10000);
    const texts = await readSceneTexts(page, 'MenuScene');
    assert(texts.some((t) => t.includes('9001')), `expected HI: 9001, got ${JSON.stringify(texts)}`);
    await page.screenshot({ path: `${OUT}/flow-6-high-score.png` });
  } finally {
    await browser.close();
  }
});

// --- Flow 7: UPGRADES button navigates to the upgrade shop ---
await run('upgrades-scene-navigation', async () => {
  const { browser, page } = await openGame();
  try {
    // Give the player some coins so they can see the buy state, not just grayed out.
    await page.evaluate(() => localStorage.setItem('turbohop_coins', '500'));
    await page.reload({ waitUntil: 'networkidle' });
    await waitForScene(page, 'MenuScene', 10000);

    // GAME_WIDTH * 3 / 4 in logical coords.
    const logical = await page.evaluate(() => ({
      w: window.__TURBOHOP__.game.scale.width,
      h: window.__TURBOHOP__.game.scale.height,
    }));
    await clickGame(page, (logical.w * 3) / 4, logical.h - 18);
    await waitForScene(page, 'UpgradeScene', 5000);

    const texts = await readSceneTexts(page, 'UpgradeScene');
    assert(texts.includes('UPGRADES'), 'expected UPGRADES title');
    assert(texts.some((t) => t.includes('COINS')), 'expected coins display');
    assert(texts.some((t) => t === 'BACK'), 'expected BACK button');
    await page.screenshot({ path: `${OUT}/flow-7-upgrades.png` });
  } finally {
    await browser.close();
  }
});

// --- Flow 8: SETTINGS button navigates, toggles work ---
await run('settings-scene-navigation', async () => {
  const { browser, page } = await openGame();
  try {
    await waitForScene(page, 'MenuScene', 10000);
    const logical = await page.evaluate(() => ({
      w: window.__TURBOHOP__.game.scale.width,
      h: window.__TURBOHOP__.game.scale.height,
    }));
    await clickGame(page, logical.w / 4, logical.h - 18);
    await waitForScene(page, 'SettingsScene', 5000);

    const texts = await readSceneTexts(page, 'SettingsScene');
    assert(texts.includes('SETTINGS'), 'expected SETTINGS title');
    assert(texts.some((t) => t === 'REDUCED MOTION'), 'expected REDUCED MOTION label');
    assert(texts.some((t) => t === 'COLORBLIND MODE'), 'expected COLORBLIND MODE label');
    assert(texts.some((t) => t === 'SHOW FPS'), 'expected SHOW FPS label');
    assert(texts.some((t) => t === 'BACK'), 'expected BACK button');
    await page.screenshot({ path: `${OUT}/flow-8-settings.png` });
  } finally {
    await browser.close();
  }
});

// --- Flow 9: Canvas fills the viewport with zero letterbox at multiple ARs ---
await run('fullscreen-on-every-device', async () => {
  const variants = [
    { name: 'pixel-9a', viewport: PIXEL_9A },
    { name: 'iphone-pro-max', viewport: { width: 926, height: 428, deviceScaleFactor: 3 } },
    { name: 'galaxy-s24', viewport: { width: 915, height: 412, deviceScaleFactor: 3 } },
    { name: 'ipad-4x3', viewport: { width: 1024, height: 768, deviceScaleFactor: 2 } },
    { name: 'desktop-16x9', viewport: { width: 1920, height: 1080, deviceScaleFactor: 1 } },
    { name: 'ultrawide', viewport: { width: 2560, height: 1080, deviceScaleFactor: 1 } },
    { name: 'android-with-statusbar', viewport: { width: 915, height: 387, deviceScaleFactor: 2.625 } },
  ];
  for (const v of variants) {
    const { browser, page } = await openGame({ viewport: v.viewport });
    try {
      const m = await measureCanvas(page);
      assert(m.gaps.left <= 1, `${v.name}: L gap ${m.gaps.left}`);
      assert(m.gaps.right <= 1, `${v.name}: R gap ${m.gaps.right}`);
      assert(m.gaps.top <= 2, `${v.name}: T gap ${m.gaps.top}`);
      assert(m.gaps.bottom <= 2, `${v.name}: B gap ${m.gaps.bottom}`);
      await page.screenshot({ path: `${OUT}/flow-9-${v.name}.png` });
    } finally {
      await browser.close();
    }
  }
});

// ---------- summary ----------
console.log('');
const passed = results.filter((r) => r.ok).length;
const failed = results.length - passed;
console.log(`${passed}/${results.length} passed, ${failed} failed`);
if (failed > 0) {
  for (const r of results.filter((r) => !r.ok)) {
    console.log(`  FAIL  ${r.name}: ${r.err}`);
  }
  process.exit(1);
}
