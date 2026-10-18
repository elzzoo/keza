# Claude Code MCP bridge

This local Codex tool delegates bounded KEZA work to Claude Code. Source is versioned here; job records and detached Git worktrees live under `~/.codex/claude-bridge/` and are not deployed with the app.

## Setup

1. Run `npm ci` in this directory.
2. Authenticate the local Claude Code CLI with `claude auth login`.
3. Register the absolute paths to Node and `server.mjs` as a stdio MCP server named `keza_claude` in `~/.codex/config.toml`.
4. Open a new Codex session to load the tool. In an already-open session, use `node tools/claude-bridge/client.mjs list` from the repository root.

The MCP tools are `ask_claude_readonly`, `start_claude_code_task`, `get_claude_code_task`, `list_claude_code_tasks`, and `get_claude_code_diff`. The coding tool starts a fresh Claude session in a new detached worktree from the repository's current HEAD. Its `ownedPaths` are a task contract, not an OS sandbox. Claude has file read/edit tools but no shell or external MCP tools. It cannot run tests through this bridge; Codex must inspect all changes, run tests, and alone integrate, commit, and push.

Tasks run asynchronously and survive a Codex session interruption while the local computer remains on. Use `list_claude_code_tasks` after resuming. Do not delete a worktree until its changes have been reviewed or deliberately discarded. At most two Claude coding jobs run concurrently.

Run `npm test` here to check the bridge's path validation. A live test also requires a valid Claude Code login and consumes Claude quota.
