// Game dimensions.
//
// GAME_HEIGHT is fixed at 216 (pixel-art reference height). GAME_WIDTH is
// computed at boot from the device aspect ratio so the canvas exactly matches
// the viewport and Phaser's FIT scale mode fills the screen without
// letterboxing on modern 19:9 / 20:9+ phones. It is clamped to a reasonable
// range so banners, menus, and world spawn logic always have a predictable
// layout budget.
//
// `export let` creates a live binding — scenes that read GAME_WIDTH inside
// create()/update() see the latest value after initGameSize() runs in main.ts
// before the Phaser.Game is constructed.
export let GAME_WIDTH = 384;
export const GAME_HEIGHT = 216;

// Layout-safe bounds for GAME_WIDTH. 320 keeps the 280px daily challenge
// banner from spilling off 4:3 tablets; 640 prevents ultra-wide foldables or
// desktop browsers from stretching the playfield into a too-zoomed-out view.
export const MIN_GAME_WIDTH = 320;
export const MAX_GAME_WIDTH = 640;

export const TILE_SIZE = 16;
export const GRAVITY = 800;
export const INITIAL_SCROLL_SPEED = 200;
export const MAX_SCROLL_SPEED = 600;
export const PLAYER_START_X = 80;
export const PLAYER_START_Y = 150;

/**
 * Compute the game canvas width from the current viewport so the 16:9-ish
 * playfield exactly matches the device aspect ratio. Call once before
 * `new Phaser.Game(config)`, and again from a resize/orientationchange
 * handler if you also call `game.scale.resize(...)` afterwards.
 */
export function initGameSize(): { width: number; height: number } {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 384;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 216;
  const aspect = vh > 0 ? vw / vh : GAME_WIDTH / GAME_HEIGHT;

  let width = Math.round(GAME_HEIGHT * aspect);
  if (width < MIN_GAME_WIDTH) width = MIN_GAME_WIDTH;
  if (width > MAX_GAME_WIDTH) width = MAX_GAME_WIDTH;
  if (width % 2 !== 0) width += 1; // keep even for crisp centered UI

  GAME_WIDTH = width;
  return { width: GAME_WIDTH, height: GAME_HEIGHT };
}
