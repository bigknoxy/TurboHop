# Changelog


## [v0.6.0] - 2026-04-07

### Phase 1: Social Competition Platform

**Milestone 1: Foundation**
- feat: add IBackendService interface for backend abstraction
- feat: add AnalyticsSystem with event queuing and batching
- feat: add RemoteConfigSystem for feature flags
- feat: add FirebaseService with health checks and circuit breaker
- feat: add Firestore security rules and indexes
- feat: integrate analytics with game events (game_start, game_end, coin_collect, enemy_stomp)

**Milestone 2: Daily Challenges**
- feat: add DailyChallengeSystem with deterministic seed generation
- feat: add LeaderboardScene for daily and global rankings
- feat: add DailyChallengeBanner UI component to menu
- feat: integrate ScoreSystem with Firebase backend
- feat: add score submission with replay input tracking
- feat: add 25 unit tests (85% coverage)

**Infrastructure**
- feat: Firebase project setup (Firestore, Auth, Remote Config)
- feat: Feature flags for gradual rollout (daily_challenge_enabled, ghost_racing_enabled, leaderboard_enabled)
- feat: Offline-first architecture with localStorage persistence
- feat: Circuit breaker pattern for backend failures

## [v0.5.3] - 2026-04-06

- chore: add test artifacts to gitignore (9208e63)


## [v0.5.2] - 2026-04-05

- fix: eliminate black bars on mobile + add documentation rules (#7) (01d78b6)


## [v0.5.1] - 2026-04-05

- fix: fill entire screen on mobile + add PR workflow rules (#6) (cbf7a86)


## [v0.5.0] - 2026-04-05

- feat: install prompt, HOME button, unit tests & project guide (#5) (8d81663)


## [v0.4.0] - 2026-04-05

- feat: fullscreen mode, PWA support & version display (#4) (0a59f0f)


## [v0.3.0] - 2026-04-05

- feat: v3 professional polish, content & accessibility (#3) (48202ad)


## [v0.2.1] - 2026-04-05

- fix: correct README badge, changelog history, and release workflow (37cd26f)

## [v0.2.0] - 2026-04-05

- feat: add 8 major engagement features for v2 (cfd631e)

## [v0.1.4] - 2026-04-05

- ci: trigger branch protection setup on this push (d9420b2)

## [v0.1.3] - 2026-04-05

- ci: add workflow to setup branch protection rules (dec3553)

## [v0.1.2] - 2026-04-05

- chore: add branch protection setup script (d713a2f)

## [v0.1.1] - 2026-04-05

- fix: correct GitHub Pages base path to match repo casing (8546959)

## [v0.1.0] - 2026-04-05

- feat: TurboHop SNES-style endless platformer game (#1) (3440dff)
