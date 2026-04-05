#!/bin/bash
# Sets up branch protection for main branch
# Run manually: gh api repos/bigknoxy/TurboHop/branches/main/protection -X PUT ...
# Or this script will be called by the setup workflow

set -e

OWNER="bigknoxy"
REPO="TurboHop"
BRANCH="main"

echo "Setting up branch protection for $OWNER/$REPO ($BRANCH)..."

gh api "repos/$OWNER/$REPO/branches/$BRANCH/protection" \
  --method PUT \
  --input - <<EOF
{
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true
  },
  "enforce_admins": false,
  "required_status_checks": null,
  "restrictions": null
}
EOF

echo "Branch protection configured successfully!"
echo "- PRs required to merge into main"
echo "- 1 approval required"  
echo "- Stale reviews dismissed on new commits"
echo "- Admin bypass enabled (bigknoxy can push directly)"
