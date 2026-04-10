// Shared helpers for the TurboHop e2e scripts. These are vanilla Playwright
// helpers (no @playwright/test runner) because the globally-installed
// Playwright version has to match the pre-provisioned browser binaries in
// /opt/pw-browsers, which pins us to 1.56.1.

import { chromium } from 'playwright';

export const DEFAULT_URL = process.env.TURBOHOP_URL || 'http://localhost:3000/';

/** Pixel 9a landscape CSS viewport — primary target device. */
export const PIXEL_9A = { width: 915, height: 412, deviceScaleFactor: 2.625 };

/**
 * Launch Chromium and return { browser, context, page } ready to drive the
 * TurboHop canvas. Always mobile-emulating + touch so pointer events behave
 * the same way they do on the real device. The caller is responsible for
 * closing the browser.
 *
 * By default we pre-claim today's daily reward in localStorage so the menu
 * doesn't pop the blocking reward modal — individual tests that want to
 * exercise the reward flow can pass `seedDailyReward: false`.
 */
export async function openGame({
  url = DEFAULT_URL,
  viewport = PIXEL_9A,
  extraConsole = false,
  seedDailyReward = true,
} = {}) {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.deviceScaleFactor,
    hasTouch: true,
    isMobile: viewport.deviceScaleFactor > 1.5,
  });
  const page = await context.newPage();

  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const t = msg.text();
      // Ignore the 407 proxy noise from our sandboxed test environment —
      // it's Firebase trying to talk to analytics.google.com, which has no
      // bearing on the game's rendering or scene logic.
      if (t.includes('Proxy Authentication Required')) return;
      if (t.includes('ERR_PROXY')) return;
      errors.push(`console.error: ${t}`);
    }
    if (extraConsole) console.log(`[browser] ${msg.type()}: ${msg.text()}`);
  });

  // Prime localStorage BEFORE the first navigation so MenuScene.create()
  // sees the seeded values on its very first run.
  if (seedDailyReward) {
    await context.addInitScript((today) => {
      if (!localStorage.getItem('turbohop_daily_last')) {
        localStorage.setItem('turbohop_daily_last', today);
        localStorage.setItem('turbohop_daily_streak', '1');
      }
    }, new Date().toISOString().slice(0, 10));
  }

  await page.goto(url, { waitUntil: 'networkidle' });
  // Wait for BootScene to finish generating textures and MenuScene to
  // become the active scene. BootScene runs ~20 generators with 30ms
  // delays between them plus a 300ms fade, so ~1.5s is a safe minimum.
  await waitForScene(page, 'MenuScene', 10000);

  return { browser, context, page, errors };
}

/**
 * Resolve a logical Phaser coordinate (0..GAME_WIDTH, 0..GAME_HEIGHT) to
 * real CSS pixels on the canvas element, taking the FIT scale into account.
 */
export async function toCanvasCoords(page, logicalX, logicalY) {
  return page.evaluate(({ lx, ly }) => {
    const canvas = document.querySelector('#game canvas');
    const rect = canvas.getBoundingClientRect();
    const g = (window.__TURBOHOP__.game);
    const gw = g.scale.width;
    const gh = g.scale.height;
    return {
      x: rect.x + (lx / gw) * rect.width,
      y: rect.y + (ly / gh) * rect.height,
    };
  }, { lx: logicalX, ly: logicalY });
}

/** Click a logical game coordinate. */
export async function clickGame(page, x, y) {
  const pt = await toCanvasCoords(page, x, y);
  await page.mouse.click(pt.x, pt.y);
}

/** Tap a logical game coordinate (proper touch event). */
export async function tapGame(page, x, y) {
  const pt = await toCanvasCoords(page, x, y);
  await page.touchscreen.tap(pt.x, pt.y);
}

/** Resolve once the named scene is active (or throw on timeout). */
export async function waitForScene(page, key, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const active = await page.evaluate(() => {
      const g = window.__TURBOHOP__?.game;
      if (!g) return [];
      return g.scene.getScenes(true).map((s) => s.scene.key);
    });
    if (active.includes(key)) return;
    await page.waitForTimeout(100);
  }
  const finalActive = await page.evaluate(() =>
    (window.__TURBOHOP__?.game?.scene.getScenes(true) || []).map((s) => s.scene.key),
  );
  throw new Error(`Scene '${key}' did not become active within ${timeoutMs}ms. Active: [${finalActive.join(', ')}]`);
}

/** Read the text of every Phaser.GameObjects.Text in the given scene. */
export async function readSceneTexts(page, sceneKey) {
  return page.evaluate((key) => {
    const g = window.__TURBOHOP__.game;
    const scene = g?.scene.getScene(key);
    if (!scene) return null;
    const out = [];
    scene.children.list.forEach((child) => {
      // Walk into containers so Daily Challenge banner text is visible.
      const walk = (node) => {
        if (!node) return;
        if (node.type === 'Text' && typeof node.text === 'string') {
          out.push(node.text);
        }
        if (node.list && Array.isArray(node.list)) {
          node.list.forEach(walk);
        }
      };
      walk(child);
    });
    return out;
  }, sceneKey);
}

/** Grab the current game canvas dims and gaps inside the viewport. */
export async function measureCanvas(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('#game canvas');
    const r = canvas.getBoundingClientRect();
    return {
      vw: window.innerWidth,
      vh: window.innerHeight,
      canvas: { x: r.x, y: r.y, w: r.width, h: r.height },
      gaps: {
        left: r.x,
        right: window.innerWidth - (r.x + r.width),
        top: r.y,
        bottom: window.innerHeight - (r.y + r.height),
      },
      logical: {
        w: window.__TURBOHOP__.game.scale.width,
        h: window.__TURBOHOP__.game.scale.height,
      },
    };
  });
}

/** Dispatch a real DOM KeyboardEvent into the page to drive Phaser input. */
export async function pressKey(page, key, holdMs = 60) {
  await page.keyboard.down(key);
  await page.waitForTimeout(holdMs);
  await page.keyboard.up(key);
}

/** Force a Game Over by emitting the same EventBus event Player.die() uses. */
export async function killPlayer(page) {
  await page.evaluate(() => {
    const handle = window.__TURBOHOP__;
    if (!handle?.events) throw new Error('EventBus not exposed');
    handle.events.emit('player:dead');
  });
}

export function assert(cond, msg) {
  if (!cond) throw new Error(`assertion failed: ${msg}`);
}
