import { spawn, spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { claudeEnv, parsePorcelainStatus, readJob, writeJob } from './jobs.mjs';

const CLAUDE = process.env.CLAUDE_BIN ?? join(homedir(), '.local', 'bin', 'claude');
const MAX_MS = 20 * 60_000;
const MAX_BYTES = 2_000_000;
const id = process.argv[2];
const job = readJob(id);
job.status = 'running';
job.workerPid = process.pid;
job.startedAt = new Date().toISOString();
writeJob(job);

const prompt = `Implement this bounded KEZA coding task in your current isolated Git worktree:\n\n${job.task}\n\nOwned paths (edit only these exact paths or files below these directories):\n${job.ownedPaths.map((p) => `- ${p}`).join('\n')}\n\nDo not edit any other path. Do not commit, push, deploy, access production, run migrations, or change secrets. You have no shell tool; report tests you could not run. Finish with a concise summary, changed files, and risks.`;
const child = spawn(CLAUDE, [
  '-p', '--no-session-persistence', '--permission-mode', 'acceptEdits',
  '--tools', 'Read,Glob,Grep,Edit,Write', '--strict-mcp-config',
  '--max-turns', '24', '--output-format', 'json',
  '--append-system-prompt',
  'You are a bounded implementation worker. Edit only the explicitly owned paths in this isolated worktree. Never access secrets or modify files outside the worktree. Do not use other agents or external tools. The master agent will inspect your diff and run all tests.',
  prompt,
], { cwd: job.worktree, stdio: ['ignore', 'pipe', 'pipe'], env: claudeEnv() });

let stdout = '';
let stderr = '';
let bytes = 0;
let timedOut = false;
const timer = setTimeout(() => {
  timedOut = true;
  child.kill('SIGTERM');
}, MAX_MS);
for (const [stream, label] of [[child.stdout, 'stdout'], [child.stderr, 'stderr']]) {
  stream.on('data', (chunk) => {
    bytes += chunk.length;
    if (bytes > MAX_BYTES) child.kill('SIGTERM');
    else if (label === 'stdout') stdout += chunk.toString();
    else stderr += chunk.toString();
  });
}

const outcome = await new Promise((resolve) => {
  child.on('error', (error) => { stderr += error.message; resolve({ code: -1, signal: null }); });
  child.on('close', (code, signal) => resolve({ code, signal }));
});
clearTimeout(timer);
let response;
try { response = JSON.parse(stdout); } catch { response = null; }
const status = spawnSync('git', ['status', '--porcelain', '--untracked-files=all'], {
  cwd: job.worktree, encoding: 'utf8', timeout: 30_000,
});
job.status = outcome.code === 0 && !response?.is_error && !timedOut && bytes <= MAX_BYTES ? 'complete' : 'failed';
job.finishedAt = new Date().toISOString();
job.exitCode = outcome.code;
job.signal = outcome.signal;
job.summary = String(response?.result ?? '').slice(0, 20_000);
job.error = job.status === 'failed'
  ? (response?.api_error_status === 401 ? 'Claude authentication expired (401)' : timedOut ? 'Claude task timed out' : bytes > MAX_BYTES ? 'Claude output exceeded size limit' : String(response?.result || stderr || stdout.slice(-1000) || `Claude exited with code ${outcome.code}, signal ${outcome.signal ?? 'none'}, without diagnostics`).slice(0, 2000))
  : null;
if (job.status === 'failed') {
  job.diagnostics = { stdoutTail: stdout.slice(-1000), stderrTail: stderr.slice(-1000) };
}
job.changedPaths = status.status === 0 ? parsePorcelainStatus(status.stdout) : [];
job.outsideScope = job.changedPaths.filter((file) => !job.ownedPaths.some((owned) => file === owned || file.startsWith(`${owned}/`)));
if (job.outsideScope.length) job.status = 'needs_review';
writeJob(job);
