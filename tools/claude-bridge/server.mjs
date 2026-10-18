import { spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { z } from 'zod/v4';
import { claudeEnv, describeJob, listJobs, PROJECT, startJob, taskDiff } from './jobs.mjs';

const CLAUDE = process.env.CLAUDE_BIN ?? join(homedir(), '.local', 'bin', 'claude');
const TIMEOUT_MS = 180_000;
const MAX_OUTPUT_BYTES = 256_000;

function askClaude(prompt) {
  return new Promise((resolve, reject) => {
    const child = spawn(CLAUDE, [
      '-p',
      '--no-session-persistence',
      '--permission-mode', 'plan',
      '--tools', 'Read,Glob,Grep',
      '--strict-mcp-config',
      '--max-turns', '8',
      '--output-format', 'json',
      '--append-system-prompt',
      'You are a read-only reviewer for the KEZA project. Do not modify files, execute commands, or inspect secrets. Give concise findings with file paths when relevant.',
      prompt,
    ], { cwd: PROJECT, stdio: ['ignore', 'pipe', 'pipe'], env: claudeEnv() });

    let stdout = '';
    let stderr = '';
    let size = 0;
    let finished = false;
    const timer = setTimeout(() => child.kill('SIGTERM'), TIMEOUT_MS);

    const collect = (chunk, stream) => {
      size += chunk.length;
      if (size > MAX_OUTPUT_BYTES) {
        child.kill('SIGTERM');
        return;
      }
      if (stream === 'stdout') stdout += chunk.toString();
      else stderr += chunk.toString();
    };
    child.stdout.on('data', (chunk) => collect(chunk, 'stdout'));
    child.stderr.on('data', (chunk) => collect(chunk, 'stderr'));
    child.on('error', (error) => {
      clearTimeout(timer);
      if (!finished) {
        finished = true;
        reject(error);
      }
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (finished) return;
      finished = true;
      if (size > MAX_OUTPUT_BYTES) return reject(new Error('Claude output exceeded the size limit'));
      try {
        const response = JSON.parse(stdout);
        if (response.api_error_status === 401) {
          return reject(new Error('Claude Code authentication expired (401). Run claude auth login, then retry.'));
        }
        if (response.is_error || code !== 0) {
          return reject(new Error(`Claude failed: ${String(response.result ?? stderr).slice(0, 1000)}`));
        }
        resolve(response.result ?? stdout);
      } catch {
        if (code !== 0) reject(new Error(`Claude exited with code ${code}: ${stderr.slice(0, 1000)}`));
        else reject(new Error('Claude returned invalid JSON'));
      }
    });
  });
}

serveStdio(() => {
  const server = new McpServer({ name: 'keza-claude-bridge', version: '0.1.0' });
  server.registerTool('ask_claude_readonly', {
    description: 'Ask Claude Code for a read-only assessment of the KEZA repository. Claude cannot edit files or run shell commands. This starts a fresh Claude session; it does not access an existing chat.',
    inputSchema: z.object({ prompt: z.string().min(1).max(4000) }),
  }, async ({ prompt }) => {
    try {
      const answer = await askClaude(prompt);
      return { content: [{ type: 'text', text: answer }] };
    } catch (error) {
      return { isError: true, content: [{ type: 'text', text: error.message }] };
    }
  });
  server.registerTool('start_claude_code_task', {
    description: 'Start a bounded Claude Code implementation task asynchronously in a new isolated Git worktree. Claude may edit only requested paths; it has no Bash or MCP tools. It cannot run tests, commit, push, or deploy. The master must inspect the result and integrate manually.',
    inputSchema: z.object({
      task: z.string().min(10).max(6000),
      ownedPaths: z.array(z.string().min(1).max(200)).min(1).max(20),
    }),
  }, async ({ task, ownedPaths }) => {
    try {
      const job = startJob({ task, ownedPaths });
      return { content: [{ type: 'text', text: JSON.stringify({ id: job.id, status: job.status, worktree: job.worktree, baseCommit: job.baseCommit }) }] };
    } catch (error) {
      return { isError: true, content: [{ type: 'text', text: error.message }] };
    }
  });
  server.registerTool('get_claude_code_task', {
    description: 'Get status, summary, changed files, and scope violations for a Claude Code implementation task.',
    inputSchema: z.object({ id: z.string().uuid() }),
  }, async ({ id }) => {
    try {
      return { content: [{ type: 'text', text: JSON.stringify(describeJob(id)) }] };
    } catch (error) {
      return { isError: true, content: [{ type: 'text', text: error.message }] };
    }
  });
  server.registerTool('list_claude_code_tasks', {
    description: 'List recent Claude coding tasks so the master can recover work after a session interruption.',
    inputSchema: z.object({}),
  }, async () => ({ content: [{ type: 'text', text: JSON.stringify(listJobs()) }] }));
  server.registerTool('get_claude_code_diff', {
    description: 'Read the tracked Git diff for a Claude coding task. Untracked files must be inspected directly in its worktree.',
    inputSchema: z.object({ id: z.string().uuid() }),
  }, async ({ id }) => {
    try {
      return { content: [{ type: 'text', text: JSON.stringify(taskDiff(id)) }] };
    } catch (error) {
      return { isError: true, content: [{ type: 'text', text: error.message }] };
    }
  });
  return server;
});
