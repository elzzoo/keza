# Claude Code handoff - P1-01 E2E CI

This is a prepared handoff, not an automatic assignment. The user must give it to Claude Code when Claude is available.

## Prompt to send

You are implementing Xalifly backlog item P1-01. Read `AGENTS.md`, `BACKLOG.md`, and `docs/orchestration/PROTOCOL.md` first. Work in your own Git worktree/branch, not in the master's active checkout. Own only `e2e/**`, `playwright.config.ts`, and `.github/workflows/ci.yml`. Do not edit application source, authentication/payment configuration, `BACKLOG.md`, `docs/orchestration/STATE.md`, or any files assigned to Codex's P0 sprint. Do not push `main` or deploy.

Investigate why the Playwright job is disabled (the CI comment mentions 7/106 failures). Repair a minimal reliable suite for public navigation FR/EN, search/result states, alert creation UI without sending real emails, sign-in entry, and checkout entry without paying. Avoid tests that mutate production or require live paid providers. Re-enable a bounded E2E gate in CI only when it is deterministic and appropriately isolated; otherwise leave it disabled and explain precisely what blocks re-enablement. Keep screenshots/traces on failure.

Run focused Playwright locally and report: exact files changed, tests and results, skipped scenarios, environment assumptions, failure evidence, commit SHA/branch if committed, and risks. Do not push or merge. Stop and report if application code changes are necessary; the master will assign those separately.

## Integration gate for master

- Review Claude's diff and test evidence; do not blindly merge shared-checkout changes.
- Confirm no real alerts, emails, payments, or production data were created by tests.
- Run CI-equivalent checks and verify `main` remains free of unrelated changes before push.
