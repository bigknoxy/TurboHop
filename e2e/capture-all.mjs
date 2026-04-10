// Capture screenshots of EVERY scene for design review.
// Run: PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node e2e/capture-all.mjs

import { openGame, waitForScene, clickGame } from './lib.mjs';
import { mkdirSync } from 'node:fs';

const OUT = 'e2e/screenshots';
mkdirSync(OUT, { recursive: true });

const PIXEL_9A = { width: 915, height: 412, deviceScaleFactor: 2.625 };

async function startGame(page) {
  await page.evaluate(() => {
    const g = window.__TURBOHOP__.game;
    g.scene.getScene('MenuScene')?.scene.start('GameScene');
    g.scene.run('UIScene');
  });
  await waitForScene(page, 'GameScene', 5000);
}

async function killPlayer(page) {
  await page.evaluate(() => {
    window.__TURBOHOP__.events.emit('player:dead');
  });
}

// 1. Menu
console.log('Capturing MenuScene...');
let { browser, page } = await openGame();
await page.screenshot({ path: `${OUT}/review-menu.png` });
await browser.close();

// 2. Menu with high score
console.log('Capturing MenuScene with HI score...');
({ browser, page } = await openGame());
await page.evaluate(() => localStorage.setItem('turbohop_highscore', '1337'));
await page.reload({ waitUntil: 'networkidle' });
await waitForScene(page, 'MenuScene', 10000);
await page.screenshot({ path: `${OUT}/review-menu-hiscore.png` });
await browser.close();

// 3. GameScene (gameplay)
console.log('Capturing GameScene...');
({ browser, page } = await openGame());
await startGame(page);
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/review-gameplay.png` });
await browser.close();

// 4. GameOverScene
console.log('Capturing GameOverScene...');
({ browser, page } = await openGame());
await startGame(page);
await page.waitForTimeout(1000);
await killPlayer(page);
await waitForScene(page, 'GameOverScene', 5000);
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/review-gameover.png` });
await browser.close();

// 5. UpgradeScene
console.log('Capturing UpgradeScene...');
({ browser, page } = await openGame());
await page.evaluate(() => localStorage.setItem('turbohop_coins', '500'));
await page.reload({ waitUntil: 'networkidle' });
await waitForScene(page, 'MenuScene', 10000);
const logical = await page.evaluate(() => ({
  w: window.__TURBOHOP__.game.scale.width,
  h: window.__TURBOHOP__.game.scale.height,
}));
await clickGame(page, (logical.w * 3) / 4, logical.h - 18);
await waitForScene(page, 'UpgradeScene', 5000);
await page.screenshot({ path: `${OUT}/review-upgrades.png` });
await browser.close();

// 6. ShopScene (directly via scene manager)
console.log('Capturing ShopScene...');
({ browser, page } = await openGame());
await page.evaluate(() => localStorage.setItem('turbohop_coins', '500'));
await page.reload({ waitUntil: 'networkidle' });
await waitForScene(page, 'MenuScene', 10000);
await page.evaluate(() => {
  window.__TURBOHOP__.game.scene.getScene('MenuScene')?.scene.start('ShopScene');
});
await waitForScene(page, 'ShopScene', 5000);
await page.screenshot({ path: `${OUT}/review-shop.png` });
await browser.close();

// 7. SettingsScene
console.log('Capturing SettingsScene...');
({ browser, page } = await openGame());
const logical3 = await page.evaluate(() => ({
  w: window.__TURBOHOP__.game.scale.width,
  h: window.__TURBOHOP__.game.scale.height,
}));
await clickGame(page, logical3.w / 4, logical3.h - 18);
await waitForScene(page, 'SettingsScene', 5000);
await page.screenshot({ path: `${OUT}/review-settings.png` });
await browser.close();

// 8. LeaderboardScene
console.log('Capturing LeaderboardScene...');
({ browser, page } = await openGame());
const logical4 = await page.evaluate(() => ({
  w: window.__TURBOHOP__.game.scale.width,
  h: window.__TURBOHOP__.game.scale.height,
}));
await clickGame(page, logical4.w / 2, logical4.h - 18);
await waitForScene(page, 'LeaderboardScene', 5000);
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/review-leaderboard.png` });
await browser.close();

console.log('All screenshots captured in', OUT);
