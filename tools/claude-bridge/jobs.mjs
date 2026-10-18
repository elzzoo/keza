import { spawnSync, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SOURCE = dirname(fileURLToPath(import.meta.url));
export const PROJECT = resolve(SOURCE, '../..');
export const ROOT = join(homedir(), '.codex', 'claude-bridge');
export const JOBS = join(ROOT, 'jobs');
export const WORKTREES = join(ROOT, 'worktrees');
const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f-]{27,28}$/i;
const CLAUDE_ENV_KEYS = [
  'HOME', 'USER', 'LOGNAME', 'PATH', 'SHELL', 'LANG', 'LC_ALL', 'TERM', 'TMPDIR',
  'HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'NO_PROXY', 'SSL_CERT_FILE', 'NODE_EXTRA_CA_CERTS',
];

export function claudeEnv(source = process.env) {
  return Object.fromEntries(CLAUDE_ENV_KEYS.filter((key) => source[key] !== undefined)
    .map((key) => [key, source[key]]));
}

function git(args, cwd = PROJECT) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', timeout: 30_000 });
  if (result.status !== 0) throw new Error(`git ${args[0]} failed: ${(result.stderr || '').slice(0, 500)}`);
  return result.stdout.trimEnd();
}

function workerAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

function activeJob(job) {
  if (job.status === 'running') return workerAlive(job.workerPid);
  return job.status === 'queued' && Date.now() - Date.parse(job.createdAt) < 60_000;
}

export function jobPath(id) {
  if (!ID_PATTERN.test(id)) throw new Error('Invalid task ID');
  return join(JOBS, `${id}.json`);
}

export function readJob(id) {
  const path = jobPath(id);
  if (!existsSync(path)) throw new Error('Unknown task ID');
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function writeJob(job) {
  mkdirSync(JOBS, { recursive: true });
  const target = jobPath(job.id);
  const temp = `${target}.${process.pid}.tmp`;
  writeFileSync(temp, JSON.stringify(job, null, 2), { mode: 0o600 });
  renameSync(temp, target);
}

export function validatePaths(paths) {
  const unique = [...new Set(paths)];
  for (const path of unique) {
    const pieces = path.split('/');
    if (!path || path.startsWith('/') || path.includes('\\') || pieces.some((part) => !part || part === '.' || part === '..' || part === '.git')) {
      throw new Error(`Unsafe owned path: ${path}`);
    }
    if (pieces.some((part) => /^\.env($|\.)/i.test(part))) throw new Error(`Secret-like path is not allowed: ${path}`);
  }
  return unique;
}

export function parsePorcelainStatus(output) {
  return output.trimEnd().split('\n').filter(Boolean).map((line) => line.slice(3));
}

export function startJob({ task, ownedPaths }) {
  const paths = validatePaths(ownedPaths);
  mkdirSync(JOBS, { recursive: true });
  mkdirSync(WORKTREES, { recursive: true });
  const active = readdirSync(JOBS).filter((file) => file.endsWith('.json')).map((file) => {
    try { return JSON.parse(readFileSync(join(JOBS, file), 'utf8')); } catch { return null; }
  }).filter((job) => job && activeJob(job));
  if (active.length >= 2) throw new Error('Two Claude coding tasks are already active');

  const id = randomUUID();
  const worktree = join(WORKTREES, id);
  const baseCommit = git(['rev-parse', 'HEAD']);
  git(['worktree', 'add', '--detach', worktree, baseCommit]);
  const job = {
    id, task, ownedPaths: paths, worktree, baseCommit,
    status: 'queued', createdAt: new Date().toISOString(),
  };
  try {
    writeJob(job);
    const child = spawn(process.execPath, [join(SOURCE, 'worker.mjs'), id], {
      cwd: ROOT, detached: true, stdio: 'ignore', env: claudeEnv(),
    });
    if (!child.pid) throw new Error('Could not start Claude worker');
    child.unref();
    return { ...job, workerPid: child.pid };
  } catch (error) {
    git(['worktree', 'remove', worktree]);
    throw error;
  }
}

export function describeJob(id) {
  const job = readJob(id);
  if ((job.status === 'running' && !workerAlive(job.workerPid)) ||
      (job.status === 'queued' && Date.now() - Date.parse(job.createdAt) >= 60_000)) {
    job.status = 'interrupted';
    job.error = 'Claude worker stopped without a final result; inspect its worktree before retrying.';
  }
  let changedFiles = [];
  let diffStat = '';
  try {
    const status = git(['status', '--porcelain', '--untracked-files=all'], job.worktree);
    changedFiles = parsePorcelainStatus(status);
    diffStat = git(['diff', '--stat', 'HEAD'], job.worktree);
  } catch (error) {
    job.inspectionError = error.message;
  }
  const outsideScope = changedFiles.filter((file) => !job.ownedPaths.some((owned) => file === owned || file.startsWith(`${owned}/`)));
  const status = job.status === 'needs_review' && outsideScope.length === 0 && job.exitCode === 0 && !job.error
    ? 'complete' : job.status;
  return { ...job, status, changedFiles, diffStat, outsideScope };
}

export function listJobs() {
  if (!existsSync(JOBS)) return [];
  return readdirSync(JOBS).filter((file) => file.endsWith('.json')).map((file) => {
    try {
      const job = JSON.parse(readFileSync(join(JOBS, file), 'utf8'));
      return { id: job.id, status: describeJob(job.id).status, createdAt: job.createdAt,
        finishedAt: job.finishedAt ?? null, task: job.task.slice(0, 200), worktree: job.worktree };
    } catch { return null; }
  }).filter(Boolean).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 20);
}

export function taskDiff(id) {
  const job = describeJob(id);
  const result = spawnSync('git', ['diff', '--binary', 'HEAD'], {
    cwd: job.worktree, encoding: 'utf8', timeout: 30_000, maxBuffer: 300_000,
  });
  if (result.status !== 0) throw new Error('Could not read task diff');
  return { id, worktree: job.worktree, changedFiles: job.changedFiles, outsideScope: job.outsideScope,
    trackedDiff: result.stdout.slice(0, 100_000), truncated: result.stdout.length > 100_000,
    note: 'Untracked files are listed in changedFiles but not included in trackedDiff; inspect them in the worktree before integration.' };
}
