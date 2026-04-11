#!/usr/bin/env bash
set -euo pipefail

VERSION="${1:-}"
TEMPLATE_FILE=".github/release-draft-template.md"

usage() {
  echo "Usage: npm run release:draft -- vX.Y.Z"
}

if [[ "$VERSION" == "--help" || "$VERSION" == "-h" ]]; then
  usage
  exit 0
fi

if [[ -z "$VERSION" ]]; then
  usage
  exit 1
fi

if [[ ! "$VERSION" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Version must match strict SemVer tag format: vX.Y.Z"
  exit 1
fi

if [[ ! -f "$TEMPLATE_FILE" ]]; then
  echo "Release template not found at $TEMPLATE_FILE"
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI (gh) is required."
  exit 1
fi

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$CURRENT_BRANCH" != "main" ]]; then
  echo "You must be on main to cut a release."
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree not clean. Commit or stash changes first."
  exit 1
fi

git fetch origin main --tags

LOCAL_MAIN="$(git rev-parse main)"
REMOTE_MAIN="$(git rev-parse origin/main)"
if [[ "$LOCAL_MAIN" != "$REMOTE_MAIN" ]]; then
  echo "Local main is not in sync with origin/main. Pull first."
  exit 1
fi

if git rev-parse "$VERSION" >/dev/null 2>&1; then
  echo "Tag $VERSION already exists locally."
  exit 1
fi

if git ls-remote --tags origin "$VERSION" | grep -q "refs/tags/$VERSION$"; then
  echo "Tag $VERSION already exists on origin."
  exit 1
fi

if gh release view "$VERSION" >/dev/null 2>&1; then
  echo "Release $VERSION already exists on GitHub."
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "GitHub CLI is not authenticated. Run 'gh auth login' first."
  exit 1
fi

git tag "$VERSION"
git push origin "$VERSION"

gh release create "$VERSION" \
  --draft \
  --title "$VERSION" \
  --notes-file "$TEMPLATE_FILE"

echo "Created draft release $VERSION from $TEMPLATE_FILE"
echo "Publish the draft in GitHub to make it appear on /release-notes."
