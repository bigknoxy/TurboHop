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
- `src/constants.ts` — Game dimensions (384x216), physics constants

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
- **PWA** — manifest.json in public/, InstallManager singleton captures beforeinstallprompt.
- **Scene Lifecycle** — GameScene registers shutdown handler. UIScene runs in parallel via `scene.launch()`.

## Common Pitfalls
- Don't use `time.timeScale` — it affects all timers globally. Use camera effects instead.
- UIScene runs as a parallel scene — pointer events propagate to both UIScene and GameScene.
- `EventBus.removeAllListeners()` in GameScene.create() nukes all listeners — systems must re-register.
- Ghost enemies must disable their physics body during invisible phase.
- Enemy sprites are pooled — body size must be updated when texture changes on reuse.
- **FIT scale mode adds letterboxing** — black bars on ultra-wide screens to preserve full canvas. All UI elements visible within canvas bounds.

## PR Workflow Rules
- **Always check if a PR is already merged/closed** before pushing to its branch or updating it. Check the PR state via the GitHub API. If merged, create a new branch from main and a new PR.
- **Squash merges drop later commits.** When a PR is squash-merged, only commits that existed at merge time are included. Always `git fetch origin main` and `git diff origin/main..HEAD` to verify what's actually missing before creating a follow-up PR.
- **Never push to a merged PR's branch** — create a fresh branch from `origin/main` instead.

## Deployment Workflow
- **Staging (Auto):** Push to `main` → GitHub Actions deploys to GitHub Pages automatically
- **Production (Manual approval):** After testing staging, approve `deploy-firebase` workflow → Firebase Hosting + auto-versioning
- **FIREBASE_TOKEN:** Required in GitHub Secrets for production deploys (generate with `firebase login:ci`)
- **Environment protection:** `firebase-production` environment requires manual approval before deploy

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
