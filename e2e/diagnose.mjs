// Manual diagnostic: open the game at Pixel 9a landscape dimensions and
// report exactly where the canvas lives relative to the viewport. Used to
// reproduce the "asymmetric letterbox" bug from the post-PR Pixel 9a
// screenshot before writing a proper e2e test suite.
//
// Run with: PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node e2e/diagnose.mjs

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const URL = process.env.TURBOHOP_URL || 'http://localhost:3000/';
const OUT = 'e2e/screenshots';
mkdirSync(OUT, { recursive: true });

// Reference device viewports (CSS pixels). Pixel 9a landscape is our
// primary target since that's the device in the user's install screenshot.
// The "-statusbar" variants subtract a ~24px system bar slice to simulate
// an Android PWA that hasn't been granted true-fullscreen display mode.
const VIEWPORTS = [
  { name: 'pixel-9a-landscape',         width: 915, height: 412, dpr: 2.625 },
  { name: 'pixel-9a-statusbar',         width: 915, height: 387, dpr: 2.625 },
  { name: 'pixel-9a-statusbar-nav',     width: 891, height: 387, dpr: 2.625 },
  { name: 'iphone-15-pro-max',          width: 926, height: 428, dpr: 3 },
  { name: 'galaxy-s24-landscape',       width: 915, height: 412, dpr: 3 },
  { name: 'ipad-landscape',             width: 1024, height: 768, dpr: 2 },
  { name: 'desktop-16x9',               width: 1920, height: 1080, dpr: 1 },
  { name: 'ultrawide-21x9',             width: 2560, height: 1080, dpr: 1 },
];

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.dpr,
    hasTouch: true,
    isMobile: vp.dpr > 1.5,
  });
  const page = await ctx.newPage();

  // Surface any runtime errors so we don't silently miss a broken scene.
  const errors = [];
  page.on('pageerror', (err) => errors.push(String(err)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });

  await page.goto(URL, { waitUntil: 'networkidle' });
  // BootScene runs asset generators for ~700ms, then MenuScene fades in.
  await page.waitForTimeout(2500);

  const layout = await page.evaluate(() => {
    const body = document.body.getBoundingClientRect();
    const game = document.getElementById('game');
    const gameRect = game?.getBoundingClientRect();
    const gameStyle = game ? getComputedStyle(game) : null;
    const canvas = document.querySelector('#game canvas');
    const canvasRect = canvas?.getBoundingClientRect();
    const canvasStyle = canvas ? getComputedStyle(canvas) : null;
    return {
      viewport: { w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio },
      body: { w: body.width, h: body.height, x: body.x, y: body.y },
      gameDiv: gameRect && {
        w: gameRect.width, h: gameRect.height, x: gameRect.x, y: gameRect.y,
        padding: gameStyle?.padding,
        display: gameStyle?.display,
      },
      canvas: canvasRect && {
        w: canvasRect.width, h: canvasRect.height, x: canvasRect.x, y: canvasRect.y,
        styleW: canvasStyle?.width,
        styleH: canvasStyle?.height,
        marginLeft: canvasStyle?.marginLeft,
        marginTop: canvasStyle?.marginTop,
        attrW: canvas?.width,
        attrH: canvas?.height,
      },
    };
  });

  const gapLeft = layout.canvas ? layout.canvas.x : null;
  const gapRight = layout.canvas ? layout.viewport.w - (layout.canvas.x + layout.canvas.w) : null;
  const gapTop = layout.canvas ? layout.canvas.y : null;
  const gapBottom = layout.canvas ? layout.viewport.h - (layout.canvas.y + layout.canvas.h) : null;

  console.log(`\n=== ${vp.name} (${vp.width}x${vp.height} @${vp.dpr}x) ===`);
  console.log(`  viewport: ${layout.viewport.w}x${layout.viewport.h} dpr=${layout.viewport.dpr}`);
  console.log(`  #game:    ${layout.gameDiv?.w.toFixed(1)}x${layout.gameDiv?.h.toFixed(1)} at (${layout.gameDiv?.x.toFixed(1)}, ${layout.gameDiv?.y.toFixed(1)}) pad=${layout.gameDiv?.padding}`);
  console.log(`  canvas:   ${layout.canvas?.w.toFixed(1)}x${layout.canvas?.h.toFixed(1)} at (${layout.canvas?.x.toFixed(1)}, ${layout.canvas?.y.toFixed(1)})`);
  console.log(`  canvas attr: ${layout.canvas?.attrW}x${layout.canvas?.attrH}  style: ${layout.canvas?.styleW} x ${layout.canvas?.styleH}  margin L/T: ${layout.canvas?.marginLeft}/${layout.canvas?.marginTop}`);
  console.log(`  GAPS  L:${gapLeft?.toFixed(1)}  R:${gapRight?.toFixed(1)}  T:${gapTop?.toFixed(1)}  B:${gapBottom?.toFixed(1)}`);
  if (errors.length) console.log(`  ERRORS: ${errors.join(' | ')}`);

  await page.screenshot({ path: `${OUT}/${vp.name}.png`, fullPage: false });
  await ctx.close();
}

await browser.close();
console.log('\nScreenshots written to', OUT);
