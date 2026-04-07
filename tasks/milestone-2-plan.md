# Milestone 2: Daily Challenges — Implementation Plan

**Created:** 2026-04-07  
**Target Version:** v0.6.0  
**Status:** Planning  

---

## Executive Summary

This milestone implements **Daily Challenges** — seeded daily runs with global leaderboards. Players get the same seed-generated level every day, compete for top scores, and can view rankings in a new LeaderboardScene.

**Scope:**
1. DailyChallengeSystem — Core challenge logic with seed generation
2. LeaderboardScene — UI for global and daily challenge rankings
3. DailyChallengeBanner — Menu UI component showing today's challenge
4. ScoreSystem extension — Backend score submission integration
5. Unit tests (80%+ coverage)
6. E2E tests for critical flows

**Timeline:** 60 min implementation + 45 min review/QA

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Phaser 3)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  MenuScene                                                       │
│  ┌────────────────────┐                                         │
│  │ DailyChallenge     │ ───────┐                                │
│  │ Banner             │        │                                │
│  └────────────────────┘        │                                │
│                                ▼                                │
│  DailyChallengeSystem    ┌────────────────────┐                 │
│  ┌─────────────────────┐  │ RemoteConfigSystem│                 │
│  │ • generate(date)    │◄─┤ • isEnabled()     │                 │
│  │ • fetch()           │  │ • getNumber()     │                 │
│  │ • submit()          │  └────────────────────┘                 │
│  │ • isCompleted()     │                                         │
│  └─────────┬───────────┘                                         │
│            │                                                      │
│            │ EventBus events                                      │
│            ▼                                                      │
│  ScoreSystem          FirebaseService                             │
│  ┌─────────────────┐  ┌────────────────────┐                     │
│  │ • finalize()    │  │ • getDailyChallenge│                     │
│  │ • submitToBackend│─►│ • submitScore()    │                     │
│  └─────────────────┘  │ • getLeaderboard() │                     │
│                       └────────────────────┘                     │
│                                                                  │
│  LeaderboardScene                                                │
│  ┌────────────────────┐                                         │
│  │ • fetch()          │                                         │
│  │ • render()         │                                         │
│  │ • paginate()       │                                         │
│  └────────────────────┘                                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Firebase Backend                          │
├─────────────────────────────────────────────────────────────────┤
│  Firestore                                                       │
│  ┌────────────────────┐  ┌────────────────────┐                 │
│  │ daily_challenges   │  │ daily_challenges/  │                 │
│  │ • date             │  │ {id}/submissions   │                 │
│  │ • seed             │  │ • userId           │                 │
│  │ • active           │  │ • score            │                 │
│  │ • params           │  │ • coins            │                 │
│  └────────────────────┘  │ • stomps           │                 │
│                          │ • timestamp        │                 │
│                          └────────────────────┘                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Firestore Data Model

### Collection: `daily_challenges`

```typescript
{
  id: string,              // Auto-generated
  date: string,            // ISO date (YYYY-MM-DD)
  seed: number,            // Deterministic seed
  active: boolean,         // Is challenge active?
  params: {
    platformCount: number, // Number of platforms
    enemyCount: number,    // Number of enemies
    coinMultiplier: number // Coin score bonus
  },
  createdAt: Timestamp
}
```

### Subcollection: `daily_challenges/{id}/submissions`

```typescript
{
  userId: string,          // Firebase UID
  score: number,           // Final score
  coins: number,           // Coins collected
  stomps: number,          // Enemies stomped
  timestamp: Timestamp,    // Submission time
  replayInput?: string     // JSON string of inputs (optional)
}
```

### Indexes Required

```typescript
// daily_challenges
['date', 'desc']

// daily_challenges/{id}/submissions
['score', 'desc']
['userId', 'timestamp', 'desc']
```

---

## Component List

### New Files

| File | Lines | Description |
|------|-------|-------------|
| `src/systems/DailyChallengeSystem.ts` | ~150 | Core challenge logic, seed generation, submission |
| `src/scenes/LeaderboardScene.ts` | ~200 | Leaderboard UI with tabs (Global/Daily) |
| `src/components/DailyChallengeBanner.ts` | ~80 | Menu UI banner component |
| `src/systems/__tests__/DailyChallengeSystem.test.ts` | ~120 | Unit tests |
| `src/scenes/__tests__/LeaderboardScene.test.ts` | ~100 | Unit tests |

### Modified Files

| File | Changes | Description |
|------|---------|-------------|
| `src/systems/ScoreSystem.ts` | +30 lines | Add `submitToBackend()` method |
| `src/scenes/MenuScene.ts` | +40 lines | Add daily challenge banner |
| `src/main.ts` | +5 lines | Import DailyChallengeSystem |
| `tests/integration/daily-challenge.test.ts` | ~150 | E2E tests |

---

## Test Plan

### Unit Tests (80%+ coverage required)

**DailyChallengeSystem.test.ts:**
1. `generate(date)` — Deterministic seed from date
2. `generate(date)` — Same seed for same date
3. `generate(date)` — Different seed for different date
4. `generateChallenge(seed)` — Generates valid params
5. `check()` — Returns challenge available
6. `check()` — Returns already completed
7. `claim()` — Submits score to backend
8. `isCompleted()` — Returns true after submission
9. Error handling — Backend unavailable
10. Error handling — Network timeout

**LeaderboardScene.test.ts:**
1. Render empty state
2. Render loading state
3. Render leaderboard entries
4. Pagination works correctly
5. Tab switching (Global/Daily)
6. Error state display

**ScoreSystem.test.ts:**
1. `submitToBackend()` — Submits with replay data
2. `submitToBackend()` — Handles backend error
3. `finalize()` — Triggers submission

### Integration Tests

**daily-challenge.test.ts:**
1. Full flow: View challenge → Play → Submit → See rank
2. Offline mode: Play offline → Sync on reconnect
3. Midnight rollover: Challenge changes at midnight UTC
4. Duplicate submission: Second submit is idempotent

### E2E Tests (Critical flows)

1. Load today's daily challenge from menu
2. Complete daily challenge run
3. Submit score and see leaderboard ranking
4. View "Come back tomorrow" after completion
5. Leaderboard pagination works
6. Error handling: Firebase unavailable

---

## File Manifest with Line Estimates

```
src/
├── systems/
│   ├── DailyChallengeSystem.ts      (NEW, ~150 lines)
│   └── __tests__/
│       └── DailyChallengeSystem.test.ts (NEW, ~120 lines)
├── scenes/
│   ├── LeaderboardScene.ts          (NEW, ~200 lines)
│   └── __tests__/
│       └── LeaderboardScene.test.ts (NEW, ~100 lines)
├── components/
│   └── DailyChallengeBanner.ts      (NEW, ~80 lines)
├── systems/
│   ├── ScoreSystem.ts               (MOD, +30 lines)
├── scenes/
│   ├── MenuScene.ts                 (MOD, +40 lines)
├── main.ts                          (MOD, +5 lines)
tests/
└── integration/
    └── daily-challenge.test.ts      (NEW, ~150 lines)
```

**Total:** ~875 new lines, ~75 modified lines

---

## Risk Assessment

### High Risk

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Firebase init fails | Low | High | Graceful fallback to local-only mode |
| Seed generation mismatch | Medium | High | Unit test determinism, server-authoritative seed |
| Leaderboard write contention | Low | Medium | Batch submissions, retry logic |

### Medium Risk

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Midnight rollover edge case | Medium | Medium | Cache challenge for 24h, client-side validation |
| Duplicate score submissions | Low | Low | Idempotent API, client-side debounce |
| Network timeout during submit | Medium | Low | Queue submission, retry on reconnect |

### Low Risk

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| UI layout issues | Low | Low | Follow existing MenuScene patterns |
| TypeScript strict mode errors | Low | Low | Read existing files first, match conventions |
| EventBus listener leaks | Low | Medium | Clean up in destroy(), follow ScoreSystem pattern |

---

## Implementation Order

1. **DailyChallengeSystem.ts** — Foundation (seed gen, fetch, submit)
2. **ScoreSystem.ts extension** — Backend submission integration
3. **LeaderboardScene.ts** — UI for rankings
4. **DailyChallengeBanner.ts** — Menu UI component
5. **MenuScene.ts** — Integrate banner
6. **Unit tests** — All new files
7. **Integration tests** — Full flows
8. **Documentation** — Update CLAUDE.md, README.md

---

## Success Criteria

- [ ] Daily challenge loads on menu (Remote Config enabled)
- [ ] Seed is deterministic (same seed for same date)
- [ ] Score submission works (backend available)
- [ ] Leaderboard displays rankings (global + daily tabs)
- [ ] "Come back tomorrow" shows after completion
- [ ] 80%+ unit test coverage
- [ ] All E2E tests pass
- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] Build passes (`bun run build`)
- [ ] Tests pass (`npm test`)

---

## Remote Config Flags

```typescript
daily_challenge_enabled: true
leaderboard_enabled: true
max_daily_submissions: 3
```

All features behind Remote Config for instant rollback.

---

## Edge Cases to Handle

1. **No network:** Show cached challenge, queue submissions
2. **Challenge not found:** Generate fallback challenge client-side
3. **Already completed:** Show "Come back tomorrow" message
4. **Midnight rollover mid-play:** Use challenge from run start
5. **Duplicate submission:** Idempotent, ignore silently
6. **Backend error:** Show error toast, retry on reconnect
7. **Empty leaderboard:** Show "Be the first!" message
8. **Leaderboard timeout:** Show cached data, refresh button

---

## Security Considerations

1. **Score validation:** Server-side replay validation (Phase 2)
2. **Rate limiting:** Max 3 submissions per challenge
3. **Input sanitization:** All strings escaped in UI
4. **Firestore rules:** Authenticated write, public read
5. **Cheat detection:** Flag impossible scores (>3x median)

---

## Performance Budget

| Metric | Target | Measurement |
|--------|--------|-------------|
| Challenge load time | <500ms | Performance marks |
| Leaderboard render | <100ms | Scene creation time |
| Score submit latency | <1s p95 | Firebase logs |
| Memory usage | <10MB | Chrome DevTools |

---

## Rollback Plan

1. Set `daily_challenge_enabled = false` in Remote Config
2. Set `leaderboard_enabled = false`
3. Revert to v0.5.3 build (5-minute deploy via GitHub Pages)

**Time to rollback:** <15 minutes with feature flags

---

## Next Steps

1. Implement DailyChallengeSystem.ts
2. Implement LeaderboardScene.ts
3. Implement DailyChallengeBanner.ts
4. Extend ScoreSystem.ts
5. Update MenuScene.ts
6. Write unit tests
7. Write integration tests
8. Run reviews (SR Dev + Code Simplifier)
9. QA testing
10. Fix findings
11. Ship
