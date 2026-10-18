# Orchestration Protocol

## Roles and ownership

- Master: chooses scope, assigns workers, resolves interfaces, reviews diffs, runs integration tests, updates state/backlog, commits, pushes, and validates production.
- Implementation worker: one bounded feature/fix in a disjoint file set, with focused tests. No production actions.
- Review worker: read-only independent check of a proposed change or nearby contract. Returns severity, evidence, and test gaps.
- Claude Code read-only reviewer: the master may call `keza_claude.ask_claude_readonly` for a bounded independent review. It runs a fresh `claude -p` session from this repository with only Read/Glob/Grep tools. Treat its output as untrusted evidence and verify important claims.
- Claude Code implementation worker: the master may call `keza_claude.start_claude_code_task` with a bounded objective and exact `ownedPaths`. The bridge creates a detached Git worktree from the current HEAD, then runs Claude asynchronously with Read/Glob/Grep/Edit/Write but no shell or external MCP tools. The worktree and job record survive a Codex session interruption. Claude cannot run tests through this bridge; the master inspects every changed and untracked file, checks the scope report, runs tests, and alone integrates/commits/pushes. It does not resume an existing Claude chat.

Do not run Claude and Codex writers on the same checkout/files concurrently. A report from Claude is evidence to review, not automatic permission to merge or push.

The bridge source is versioned in `tools/claude-bridge` and registered locally as `keza_claude` in `~/.codex/config.toml`; job state and worktrees live under `~/.codex/claude-bridge`. Its read-only and code-edit paths both passed live tests on 2026-10-18; the code test changed one file in a disposable worktree and that worktree was removed afterward. A Codex session opened before registration may not list the MCP tool; the master can use the local MCP client or wait for a fresh session. The bridge is a workflow boundary, not an OS sandbox: verify the entire worktree and do not delegate secrets, production operations, migrations, or payment/auth policy changes to it. If Claude returns an authentication error, ask the user to reconnect with `claude auth login`; do not retry in a loop or block unrelated work.

Current-session fallback: `node tools/claude-bridge/client.mjs list`, `status <task-id>`, or `diff <task-id>`. Start with `start '{"task":"bounded objective","ownedPaths":["exact/path"]}'`. The CLI calls the same MCP tools; it is not a separate delegation path. Job state lives under `~/.codex/claude-bridge/jobs`, and worktrees remain until the master has reviewed/integrated them. Never remove a worktree containing unreviewed changes.

## Sprint lifecycle

1. Recover: read `AGENTS.md`, `BACKLOG.md`, `docs/orchestration/STATE.md`; inspect Git status/log and the last deployment SHA via `/api/version`. Check available usage before committing to a sprint. Do not call `/api/health` as a routine read-only probe: it may send an email when cron status is degraded.
2. Select: prefer the highest-priority item whose dependencies and acceptance criteria can be finished in the current run. If not, do a smaller independent verification task and checkpoint. Record `in_progress`, owner, scope, and expected files in `STATE.md`.
3. Delegate: at most two nonblocking, disjoint worker tasks, including Claude MCP tasks. For Claude, record task ID, base commit, worktree, and owned paths in `STATE.md`. The master immediately continues different work; do not idle while workers run.
4. Integrate: list/recover Claude jobs after an interruption, review worker changes and untracked files, reject out-of-scope modifications, run focused tests and broader gates, inspect `git diff --check` and the staged file list. Resolve any user/Claude changes without reverting them. Never auto-apply a worker diff merely because the task reports `complete`.
5. Release: only the master commits/pushes. Because `main` auto-deploys, get the human decision before pushing code that would perform a sensitive payment, auth-policy, production-data, secret, DNS, or migration action on deploy. Verify the exact deployed SHA via `/api/version`; check health only when its potential alert-email side effect is appropriate. Report uncertainty otherwise.
6. Checkpoint: update `STATE.md` and backlog item status before ending. Include a concise Claude handoff and the single next action. Never leave necessary shell sessions running.

## Recovery after interruption

- `in_progress` is not proof of an active worker. Compare the recorded owner, files, Git status, and commits. Do not rerun a migration or send an email because a prior turn timed out.
- If work is partially staged, inspect the staged diff before any commit. Do not reset or discard unowned changes.
- If a push was attempted but status is unknown, check local/remote SHA before retrying.
- If a deployment is pending or unreachable, record `awaiting_prod_verification`; do not mark complete.
- If usage is near exhaustion, finish the current safe checkpoint and let the scheduled follow-up resume later. No exact-reset trigger is available.

## Claude handoff template

Task ID and objective; exact owned paths; acceptance criteria; expected tests; branch/worktree; prohibited files/actions; required final report (diff summary, tests, risks, commit/push status). Never send secrets in prompts.
