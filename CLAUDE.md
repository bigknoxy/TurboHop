# TurboHop — Claude Code Project Guide

## Project Overview
TurboHop is a Phaser 3 browser platformer game (TypeScript + Vite). The player auto-runs right, jumping between platforms, collecting coins, and stomping enemies.

## Tech Stack
- **Engine:** Phaser 3 (v3.80+)
- **Language:** TypeScript (strict)
- **Build:** Vite 5 with `base: '/TurboHop/'`
- **Tests:** Vitest + jsdom
- **Deploy:** GitHub Pages at https://bigknoxy.github.io/TurboHop/

## Key Architecture
- `src/scenes/` — Phaser scenes (BootScene, MenuScene, GameScene, UIScene, GameOverScene, ShopScene, UpgradeScene, SettingsScene)
- `src/entities/` — Player entity with component system
- `src/systems/` — Game systems (Audio, Score, Difficulty, Spawn, Mission, PowerUp, Save, Settings, InstallManager)
- `src/factories/` — Platform and enemy factories with object pooling
- `src/utils/` — ButtonHelper, TransitionHelper, EventBus
- `src/constants.ts` — Game dimensions (384x216), physics constants

## Commands
- `bun run build` — TypeScript check + Vite production build
- `npm test` — Run vitest unit tests
- `npx tsc --noEmit` — Type check only

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

## PR Workflow Rules
- **Always check if a PR is already merged/closed** before pushing to its branch or updating it. Use `mcp__github__pull_request_read` with `method: "get"` and check the `state` field. If merged, create a new branch from main and a new PR.
- **Squash merges drop later commits.** When a PR is squash-merged, only commits that existed at merge time are included. Always `git fetch origin main` and `git diff origin/main..HEAD` to verify what's actually missing before creating a follow-up PR.
- **Never push to a merged PR's branch** — create a fresh branch from `origin/main` instead.

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
