# TurboHop

![Version](https://img.shields.io/badge/version-v0.7.4--dev-blue)
![Phaser 3](https://img.shields.io/badge/Phaser-3.80-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![Vite](https://img.shields.io/badge/Vite-5.x-purple)

A SNES-style 16-bit endless platformer built with Phaser 3 + TypeScript + Vite + Bun. Installable as a PWA for fullscreen mobile play.

## Play

**[Production](https://turbohop-game.web.app/)** (Firebase Hosting) | **[Staging](https://bigknoxy.github.io/TurboHop/)** (GitHub Pages)

## Gameplay

- **Auto-runner** — the world scrolls automatically, you control the jumps
- **Tap / Space / Up Arrow** to jump
- **Hold** for higher jump, **tap again mid-air** for double-jump
- **Stomp enemies** by landing on top, avoid side contact
- **Collect coins** to spend in the shop on character skins or permanent upgrades
- **5 enemy types** — Slime, Bird, Bat (swoops), Spike (unstompable), Ghost (phases in/out)
- **13 character skins** — Blue, Red, Ninja, Cat, Robot, Wizard, Gold, Astronaut, Skeleton, Purple, Dragon, Rainbow, Green
- **Survive** as the speed ramps up every 15 seconds
- **Complete missions** — 3 rotating goals per run for bonus coins
- **Grab power-ups** — Magnet, Shield, 2x Coins, Speed Boost
- **Upgrade permanently** — Extra HP, Coin Magnet, Slow Start, Jump Boost, Starting Shield
- **Daily rewards** — 7-day streak calendar with escalating coin payouts
- **Install as app** — PWA support for fullscreen mobile play, no browser chrome
- **Gamepad support** — A button to jump
- **Accessibility** — Reduced motion mode, colorblind mode, settings scene
- **Daily challenges** — New seed-based challenge every 24h with unique leaderboards
- **Global leaderboards** — Compete with players worldwide, see top 100 rankings
- **Analytics** — Automatic gameplay tracking for balance tuning

## Tech Stack

| Layer | Choice |
|---|---|
| Game Engine | Phaser 3 |
| Language | TypeScript (strict) |
| Build Tool | Vite |
| Package Manager | Bun |
| Backend | Firebase (Firestore, Auth, Remote Config, Analytics) |
| Deployment | Firebase Hosting (prod) + GitHub Pages (staging) |

## Architecture

Entity-Component pattern with SOLID principles:

```
src/
├── main.ts               # Phaser game config + bootstrap
├── constants.ts           # Game constants (gravity, speed, dimensions)
├── scenes/                # Phaser scenes (Boot, Menu, Game, UI, GameOver, Shop, Upgrade, Settings, **Leaderboard**)
├── entities/              # Entity base class + Player
├── components/            # Reusable behaviors (JumpComponent, **DailyChallengeBanner**)
├── systems/               # Game logic (Difficulty, Spawn, Score, Save, Audio, Mission, PowerUp, Upgrade, DailyReward, Settings, InstallManager, **Analytics, RemoteConfig, DailyChallenge**)
├── services/              # Backend integration (**FirebaseService**)
├── interfaces/            # TypeScript contracts (IEntity, IComponent, ISystem, **IBackendService**)
├── factories/             # Object creation (PlatformFactory, EnemyFactory)
├── __tests__/             # Unit tests (Vitest + jsdom)
└── utils/                 # EventBus, ButtonHelper, TransitionHelper
```

### Key Patterns

- **EventBus** — Decoupled cross-scene communication (GameScene <-> UIScene)
- **Object Pooling** — Platforms, coins, and enemies are recycled, not created/destroyed
- **Factory Pattern** — PlatformFactory and EnemyFactory handle object creation and pooling
- **System Injection** — DifficultySystem, SpawnSystem, ScoreSystem updated in game loop
- **Procedural Assets** — All textures generated in BootScene via Phaser Graphics API
- **Procedural Audio** — Chiptune SFX generated via Web Audio API oscillators

### Scene Flow

```
BootScene → MenuScene → GameScene + UIScene → GameOverScene → GameScene / MenuScene / ShopScene / UpgradeScene
                ↕
          SettingsScene
```

## Development

### Prerequisites

- [Bun](https://bun.sh/) (v1.0+)

### Commands

```bash
# Install dependencies
bun install

# Start dev server (port 3000)
bun run dev

# Production build
bun run build

# Run unit tests
npm test

# Preview production build
bun run preview
```

### Visual Style

| Element | Spec |
|---|---|
| Resolution | 384x216 (16:9 SNES-like), scaled up |
| Tile Size | 16x16px |
| Player Size | 16x24px |
| Font | Press Start 2P |
| Scaling | FIT (letterboxing, preserves full canvas on all aspect ratios) |
| Effects | CRT scanlines, parallax backgrounds, screen shake, particle effects, vignette |
| PWA | Installable, landscape orientation lock, standalone display mode |

## CI/CD

### Deployment Workflow

```
push to main → GitHub Pages (staging, auto) → manual approval → Firebase (production, auto + versioning)
```

1. **Staging (Auto-deploy):** Every push to `main` automatically deploys to GitHub Pages for testing
2. **Production (Manual approval):** After verifying staging, approve the `deploy-firebase` workflow to deploy to Firebase Hosting
3. **Auto-versioning:** Production deploys automatically bump version, update changelog, and create GitHub Release

### Automated Versioning
Production deploys are automatically versioned using conventional commits:
- `feat:` commits bump the **minor** version
- `fix:` / `perf:` / `refactor:` commits bump the **patch** version
- `BREAKING CHANGE` / `feat!:` commits bump the **major** version

Each production release automatically:
- Updates `package.json` version
- Updates `CHANGELOG.md`
- Creates a Git tag and GitHub Release

### Setup (one-time)

**GitHub Pages (Staging):**
1. Go to **Settings → Pages → Source** and select **"GitHub Actions"**

**Firebase (Production):**
1. Install Firebase CLI: `npm install -g firebase-tools`
2. Generate CI token: `firebase login:ci`
3. Add token to GitHub Secrets: **Settings → Secrets → Actions → New repository secret**
   - Name: `FIREBASE_TOKEN`
   - Value: (token from step 2)
4. Create environment: **Settings → Environments → New environment**
   - Name: `firebase-production`
   - Required reviewers: Add yourself

## License

MIT
