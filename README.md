# TurboHop

![version-v0.1.0](https://img.shields.io/badge/version-v1.0.0-blue)
![Phaser 3](https://img.shields.io/badge/Phaser-3.80-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![Vite](https://img.shields.io/badge/Vite-5.x-purple)

A SNES-style 16-bit endless platformer built with Phaser 3 + TypeScript + Vite + Bun.

## Play

**[Play TurboHop](https://bigknoxy.github.io/TurboHop/)** (GitHub Pages)

## Gameplay

- **Auto-runner** — the world scrolls automatically, you control the jumps
- **Tap / Space / Up Arrow** to jump
- **Hold** for higher jump, **tap again mid-air** for double-jump
- **Stomp enemies** by landing on top, avoid side contact
- **Collect coins** to spend in the shop on character skins
- **Survive** as the speed ramps up every 15 seconds

## Tech Stack

| Layer | Choice |
|---|---|
| Game Engine | Phaser 3 |
| Language | TypeScript (strict) |
| Build Tool | Vite |
| Package Manager | Bun |
| Deployment | GitHub Pages via GitHub Actions |

## Architecture

Entity-Component pattern with SOLID principles:

```
src/
├── main.ts               # Phaser game config + bootstrap
├── constants.ts           # Game constants (gravity, speed, dimensions)
├── scenes/                # Phaser scenes (Boot, Menu, Game, UI, GameOver, Shop)
├── entities/              # Entity base class + Player
├── components/            # Reusable behaviors (JumpComponent)
├── systems/               # Game-wide logic (Difficulty, Spawn, Score, Save, Audio)
├── factories/             # Object creation (PlatformFactory, EnemyFactory)
├── interfaces/            # TypeScript contracts (IEntity, IComponent, ISystem)
└── utils/                 # EventBus (singleton), ObjectPool (generic)
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
BootScene → MenuScene → GameScene + UIScene → GameOverScene → GameScene / ShopScene
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
| Effects | CRT scanlines, parallax backgrounds, screen shake, particle effects |

## CI/CD

### Automated Deployment
Every push to `main` triggers a GitHub Actions workflow that builds and deploys to GitHub Pages.

### Automated Versioning
Merges to `main` are automatically versioned using conventional commits:
- `feat:` commits bump the **minor** version
- `fix:` / `perf:` / `refactor:` commits bump the **patch** version
- `BREAKING CHANGE` / `feat!:` commits bump the **major** version

Each release automatically:
- Updates `package.json` version
- Updates `CHANGELOG.md`
- Creates a Git tag and GitHub Release

### Setup (one-time)
1. Go to **Settings → Pages → Source** and select **"GitHub Actions"**
2. That's it — merging PRs will auto-deploy and auto-version

## License

MIT
