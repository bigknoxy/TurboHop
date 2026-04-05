Run the full TurboHop review, fix, test, and PR pipeline for the current branch.

## Steps

### 1. SR Dev Review
Launch a subagent (general-purpose) to do a senior developer code review of all changed files on the current branch vs main. The review should check for:
- Bugs, race conditions, null refs, state leaks
- Phaser lifecycle issues (scene cleanup, event listener leaks)
- Mobile UX issues (touch targets, event propagation)
- Performance (per-frame allocations, missing pooling)
- Type safety

Report findings as CRITICAL/HIGH/MEDIUM/LOW with file paths and line numbers.

### 2. Code Simplifier Review
Launch a second subagent (general-purpose) in parallel to review the same changed files for:
- Dead code, unused imports/variables
- Duplicated logic that could be shared
- Over-engineering and unnecessary abstractions
- Things that could be simpler

### 3. Fix All Critical and High Issues
Address every CRITICAL and HIGH finding from both reviews. For MEDIUM findings, fix if they're quick (<5 lines). Skip LOW.

### 4. Run Unit Tests
Run `npm test` (vitest). Fix any failures.

### 5. Build Verification
Run `npx tsc --noEmit` and `bun run build`. Fix any errors.

### 6. Browser Automation
Run browser automation tests using Playwright with route interception to serve from dist/:
- Page loads, canvas renders, no JS errors during boot
- Game starts, gameplay stable for 8+ seconds
- PWA manifest loads and validates
- Screenshot captured for visual verification

Use this pattern for route interception:
```javascript
await page.route('**/*', async (route) => {
  const url = new URL(route.request().url());
  if (!url.hostname.includes('turbohop.test')) { await route.abort(); return; }
  let fp = url.pathname;
  if (fp.startsWith('/TurboHop/')) fp = fp.slice('/TurboHop'.length);
  if (fp === '/' || fp === '') fp = '/index.html';
  try {
    const body = fs.readFileSync('/home/user/TurboHop/dist' + fp);
    // ... serve with correct content type
  } catch { await route.fulfill({ status: 404, body: '' }); }
});
```

Clear daily reward before testing:
```javascript
await page.evaluate(() => {
  const today = new Date().toISOString().split('T')[0];
  localStorage.setItem('turbohop_daily_last', today);
  localStorage.setItem('turbohop_tutorial_done', '1');
});
```

### 7. Commit, Push, and Create/Update PR
- Stage all changes
- Write a descriptive commit message listing what was changed and what review findings were fixed
- Push to the current branch
- Create or update the PR with a summary including verification metrics (test counts, error counts, module counts)

## Verification Metrics to Report
- `tsc --noEmit` error count
- `vite build` module count and error count
- `vitest run` pass/fail counts
- Browser automation pass/fail counts and JS error count
- Screenshot path for visual verification
