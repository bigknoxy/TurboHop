# TurboHop — Claude Code Project Guide

## Project Overview
TurboHop is a Phaser 3 browser platformer game (TypeScript + Vite). The player auto-runs right, jumping between platforms, collecting coins, and stomping enemies.

## Tech Stack
- **Engine:** Phaser 3 (v3.80+)
- **Language:** TypeScript (strict)
- **Build:** Vite 5 with environment-aware base path (`/` for Firebase, `/TurboHop/` for GitHub Pages)
- **Tests:** Vitest + jsdom
- **Deploy:** Firebase Hosting (prod) + GitHub Pages (staging)
- **Backend:** Firebase (Firestore, Auth, Remote Config, Analytics)

## Key Architecture
- `src/scenes/` — Phaser scenes (BootScene, MenuScene, GameScene, UIScene, GameOverScene, ShopScene, UpgradeScene, SettingsScene, **LeaderboardScene**)
- `src/entities/` — Player entity with component system
- `src/systems/` — Game systems (Audio, Score, Difficulty, Spawn, Mission, PowerUp, Save, Settings, InstallManager, DailyReward, Upgrade, **AnalyticsSystem**, **RemoteConfigSystem**, **DailyChallengeSystem**)
- `src/components/` — UI components (**DailyChallengeBanner**)
- `src/services/` — Backend services (**FirebaseService**)
- `src/interfaces/` — Type definitions (**IBackendService**)
- `src/factories/` — Platform and enemy factories with object pooling
- `src/utils/` — ButtonHelper, TransitionHelper, EventBus
- `src/constants.ts` — Fixed logical height `GAME_HEIGHT=216`, dynamic `GAME_WIDTH` computed per device via `initGameSize()`, clamped to `[MIN_GAME_WIDTH, MAX_GAME_WIDTH]`, plus physics constants

## Commands
- `bun run build` — TypeScript check + Vite production build (Firebase)
- `bun run build:firebase` — Build for Firebase Hosting (root path `/`)
- `bun run build:github` — Build for GitHub Pages (`/TurboHop/` path)
- `npm test` — Run vitest unit tests
- `npx tsc --noEmit` — Type check only
- `npm run deploy:firebase` — Deploy to Firebase Hosting (requires FIREBASE_TOKEN)

## Important Patterns
- **EventBus** — Global event emitter for cross-system communication. GameScene calls `EventBus.removeAllListeners()` in create().
- **Object Pooling** — Enemies and coins reuse inactive sprites via factory groups.
- **PWA** — manifest.json in public/ (display: fullscreen), InstallManager singleton captures beforeinstallprompt.
- **Self-hosted font** — Press Start 2P loaded via `@fontsource/press-start-2p` and awaited with `document.fonts.load()` in `main.ts` before Phaser.Game is constructed. Phaser burns text into bitmap on first render, so the font must be ready before any scene calls `this.add.text()`. No Google Fonts CDN dependency.
- **E2E tests** — Playwright-based smoke flows in `e2e/` verify fullscreen, scene navigation, gameplay, upgrades, settings, and high score persistence across 7+ device viewports. Run: `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node e2e/flows.mjs`.
- **Scene Lifecycle** — GameScene registers shutdown handler. UIScene runs in parallel via `scene.launch()`.
- **Dynamic canvas width** — `GAME_WIDTH` is an `export let` in `constants.ts` that is set by `initGameSize()` in `main.ts` *before* `new Phaser.Game()`. It matches the device aspect ratio (e.g. ~480 on a 20:9 phone, 384 on a 16:9 desktop) so Phaser's FIT mode fills the viewport with zero letterboxing. Scenes must read `GAME_WIDTH` *inside* `create()`/`update()` (live binding) — never destructure it at module scope.
- **Tap target padding** — Pixel-art buttons are only ~6px tall. `makeButton` and the `expandHitArea(text)` helper in `utils/ButtonHelper.ts` apply a 12×10 logical-pixel hit-area pad so small labels remain tappable after the FIT scale chain.

## Common Pitfalls
- Don't use `time.timeScale` — it affects all timers globally. Use camera effects instead.
- UIScene runs as a parallel scene — pointer events propagate to both UIScene and GameScene.
- `EventBus.removeAllListeners()` in GameScene.create() nukes all listeners — systems must re-register.
- Ghost enemies must disable their physics body during invisible phase.
- Enemy sprites are pooled — body size must be updated when texture changes on reuse.
- **FIT scale mode with dynamic width** — `GAME_WIDTH` is computed per viewport at boot so FIT fills the screen without letterboxing on modern 19:9/20:9 phones. Layout code uses proportional positions (`GAME_WIDTH/2`, `GAME_WIDTH*3/4`) or right-anchored offsets (`GAME_WIDTH - N`) so it adapts to any canvas width between `MIN_GAME_WIDTH` and `MAX_GAME_WIDTH`. Don't hardcode pixel positions past 320 from the left.
- **Never read `GAME_WIDTH` at module scope** — `const X = GAME_WIDTH / 2;` at the top of a file captures the pre-init default of 384. Read it inside scene methods so live binding works.
- **Don't place UI at y ∈ [45..95]** in MenuScene — that slice is reserved for the Daily Challenge banner (centered at y=108 with a 56px-tall panel). Any element in that range gets covered by the banner.
- **Don't add flex/grid centering to `#game`** — Phaser's `autoCenter: CENTER_BOTH` sets `margin-top` on the `<canvas>` directly. Any flex/grid centering on the parent container stacks with Phaser's margin, producing asymmetric letterbox bars (the "double-centering" bug).

## PR Workflow Rules
- **Always check if a PR is already merged/closed** before pushing to its branch or updating it. Check the PR state via the GitHub API. If merged, create a new branch from main and a new PR.
- **Squash merges drop later commits.** When a PR is squash-merged, only commits that existed at merge time are included. Always `git fetch origin main` and `git diff origin/main..HEAD` to verify what's actually missing before creating a follow-up PR.
- **Never push to a merged PR's branch** — create a fresh branch from `origin/main` instead.

## Deployment Workflow
- **Staging (Auto):** Push to `main` → GitHub Actions deploys to GitHub Pages automatically
- **Production (Manual approval):** After testing staging, approve `deploy-firebase` workflow → Firebase Hosting + auto-versioning
- **FIREBASE_TOKEN:** Required in GitHub Secrets for production deploys (generate with `firebase login:ci`)
- **Environment protection:** `firebase-production` environment requires manual approval before deploy
- **Post-merge verification:** On every push/merge to `main`, run the e2e suite against the staging environment to catch regressions before approving production deploy: `TURBOHOP_URL=https://bigknoxy.github.io/TurboHop/ PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node e2e/flows.mjs`

## Documentation Rules
Before every PR, check and update all documentation to reflect the changes being made:
- **CLAUDE.md** — Update Key Architecture, Commands, Important Patterns, and Common Pitfalls sections if new systems, scenes, patterns, or gotchas were introduced.
- **README.md** — Update feature list, screenshots, and setup instructions if user-facing behavior changed.
- **CHANGELOG.md** — Add entry for the new version describing what changed (if the project uses a changelog).
- **package.json** — Verify `description`, `keywords`, and `scripts` are current.
- **manifest.json** — Update `description` if the game's scope or branding changed.
- **Code comments** — Update JSDoc/comments on any public APIs whose behavior changed.
- **This is a blocking requirement** — do not create a PR until documentation is verified and updated.

## Custom Slash Commands
- `/review-and-ship` — Full pipeline: SR dev review, code simplifier review, fix findings, unit tests, build, browser automation, commit, push, create/update PR.
