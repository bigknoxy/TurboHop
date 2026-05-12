# Lessons Learned

## Firebase CI/CD Authentication (2026-05-12)

### Problem
Firebase deployment workflow was failing with "Error: Failed to authenticate, have you run firebase login?" despite multiple attempts to fix authentication.

### Root Causes
1. **`FIREBASE_TOKEN` deprecated**: The `firebase login:ci` token was rejected by Firebase's API (401 error) because it's deprecated
2. **`GOOGLE_APPLICATION_CREDENTIALS` in env block**: GitHub Actions masks environment variables before shell expansion, preventing the JSON from being written correctly
3. **Newline stripping**: GitHub Secrets strips/transforms newlines in multi-line JSON, corrupting the service account key
4. **Manual credential handling**: Writing JSON to file with `echo` and inline env vars was fragile

### Solution (CORRECT)
Use `google-github-actions/auth@v2` action to handle authentication:

```yaml
- name: Authenticate to Google Cloud
  uses: google-github-actions/auth@v2
  with:
    credentials_json: ${{ secrets.GOOGLE_APPLICATION_CREDENTIALS }}

- name: Setup Firebase CLI
  run: npm install -g firebase-tools

- name: Deploy to Firebase Hosting
  run: firebase deploy --only hosting --project turbohop-game --non-interactive
```

### How to Set Up Service Account
1. Go to: https://console.firebase.google.com/project/turbohop-game/settings/iam
2. Click "Service Accounts" tab
3. Click "Generate new private key"
4. Save the JSON file
5. In GitHub repo → Settings → Secrets → Actions:
   - Add `GOOGLE_APPLICATION_CREDENTIALS` with the ENTIRE JSON file content
   - DO NOT base64 encode it - paste the raw JSON

### Key Lessons
- **Use official actions for auth**: Don't manually handle credentials in shell scripts
- **`google-github-actions/auth@v2` handles credential parsing** correctly, including newlines
- **FIREBASE_TOKEN is deprecated** - don't use it for new setups
- **Environment variable masking**: GitHub Actions masks env vars before shell expansion, so inline variable passing is needed if not using official actions

### Related Files
- `.github/workflows/deploy-firebase.yml` - Deployment workflow
- `firebase.json` - Must include `"site": "turbohop-game"` for hosting target resolution

---

## Git Remote Conflicts (Ongoing)

### Problem
Pushes fail with "Updates were rejected because the remote contains work that you do not have locally"

### Solution
Always use `git pull origin main --rebase && git push origin main` instead of just `git push`

---

## E2E Test Timing (2026-05-06)

### Problem
E2E tests were failing with `waitUntil: 'networkidle'` due to Firebase analytics calls never completing in sandboxed CI environment.

### Solution
Changed from `waitUntil: 'networkidle'` to `waitUntil: 'load'` in `e2e/lib.mjs`

### Additional Fix
GameOverScene transition takes ~1.1 seconds (800ms delay + 300ms fade). Increased timeout from 5000ms to 15000ms.