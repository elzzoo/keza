#!/usr/bin/env bash
# Run this before every push to main to catch issues before CI does.
# Usage: bash scripts/validate-before-push.sh
set -e

echo "▶ TypeScript..."
npx tsc --noEmit
echo "✅ TypeScript OK"

echo "▶ ESLint..."
npx next lint
echo "✅ ESLint OK"

echo "▶ Jest..."
npx jest --passWithNoTests
echo "✅ Jest OK"

echo "▶ E2E (Playwright against production)..."
BASE_URL=https://keza-taupe.vercel.app npx playwright test
echo "✅ E2E OK"

echo ""
echo "🟢 All checks passed — safe to push."
