# Xalifly Orchestration State

Updated: 2026-10-18 (Africa/Dakar)

## Current run

- Status: `ready` (P1-01 local E2E smoke implemented and verified; broader E2E coverage remains queued).
- Reconcile Git before every run; the authoritative commit is `git log -1`.
- Active sprint: none. P1-01 phase 1 is complete locally; P1-01 as a whole remains open.
- Active worker agents: none. Claude MCP task `6a295f0d-91ef-4d01-b157-e1359f203187` completed the bounded smoke spec in an isolated worktree; master reviewed and integrated it, correcting the EN title assertion. The earlier broad task `1794c1d8-018d-42c1-9206-cef8d6faa788` failed without changes.
- Scheduled wake: active hourly heartbeat `xalifly-cto-reprise-du-backlog`, attached to this conversation. It checks limits at wake; it cannot detect the exact reset instant. Local work requires the computer and Codex app to be running.
- Claude bridge: `keza_claude` supports read-only review and asynchronous coding tasks in isolated worktrees. Its source is versioned in `tools/claude-bridge`; local configuration and job/worktree state remain under `~/.codex`. Smoke tests and P1-07 implementation completed. The master reviewed P1-07 and ran focused tests (63 passed), bridge tests (5 passed), TypeScript, lint, and a production build (existing Sentry/OpenTelemetry bundling warnings only). No Claude coding task is active. At resume, call `list_claude_code_tasks` before starting a new Claude assignment and inspect any unfinished worktree.
- Next candidate: `P0-01` in `BACKLOG.md` (unverified public conversion/revenue events).
- External approval needed before: any production data migration, secret/payment configuration change, or broad auth policy change.

## Verified baseline

- Production `/api/version` matched `e1bb3d5`; `/api/health` returned Redis `ok`, cron `running` on 2026-10-18.
- Production `/api/version` matched `cc99145` after the P1-07 release on 2026-10-18. The Claude P1-07 worktree was removed after verifying its files matched `main`.
- `npx tsc --noEmit` and `npm run lint` passed.
- Offline Jest: 247 suites, 2243 tests passed, 13 skipped; open-handle warning after completion.
- E2E are disabled in CI. Live provider, payment, email delivery, and database restoration were not verified by the audit.
- Existing unrelated untracked files at setup: `.cloud_work/`, `build_travel_workbook.mjs`, `outputs/`. Do not stage or delete them.

## Sprint ledger

| Item | Status | Owner | Commit | Verification | Next |
| --- | --- | --- | --- | --- | --- |
| Audit 360 and orchestration setup | complete | Master | See Git history for this documentation change | Source review, live UI/version, TS/lint/Jest, independent protocol review | Start P0-01 on a later run |
| P0-01 public conversion integrity | queued | Master | none | Not started | Inspect consumers and define verified conversion source |
| P0-02 trial uniqueness | queued | Unassigned | none | Not started | Wait for P0-01 sprint checkpoint |
| P0-03 daily cron dispatch | queued | Unassigned | none | Not started | Wait for P0-02 sprint checkpoint |
| P0-04 personalized search cache | queued | Unassigned | none | Not started | Wait for P0-03 sprint checkpoint |
| P0-05 live price truth | queued | Unassigned | none | Not started | Verify supplier coverage and product claims |
| P1-07 roundtrip return date | verified | Claude MCP + Master | See Git history | 63 focused tests, TypeScript, lint, build passed; full pre-push gate on release | Verify deployed SHA and close worktree |
| P1-01 E2E smoke phase | verified locally, release pending | Claude MCP + Master | pending | 5/5 Chromium smoke tests passed with fake CI env; TypeScript, lint, YAML syntax passed | Push bounded CI gate, observe GitHub Actions; then add isolated tests for search/results, alerts, sign-in, checkout |

## Claude handoff

`docs/orchestration/CLAUDE_HANDOFF.md` documents the original P1-01 assignment. The smaller MCP assignment succeeded. The new smoke gate tests FR/EN home title, FR search entry, and FR/EN alert links only; it does not claim alert creation, sign-in, checkout, or supplier search coverage. Clicking through to the alert page with fake Redis did not render its heading in a local exploratory run; the exact cause is not yet isolated. Keep this as an E2E fixture/workflow follow-up, not a green alert-page claim. Claude must not overlap the master's P0 files or push from its worktree.

## Resume instruction

Read the latest user message first. Then reconcile this file with Git and deployment state, check usage, and choose the smallest sprint that can be completed and verified before the current window ends. Update this ledger before stopping.
