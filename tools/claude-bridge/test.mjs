import assert from 'node:assert/strict';
import test from 'node:test';
import { claudeEnv, jobPath, parsePorcelainStatus, validatePaths } from './jobs.mjs';

test('accepts a bounded file or directory scope', () => {
  assert.deepEqual(validatePaths(['app/api/search/route.ts', '__tests__/api']),
    ['app/api/search/route.ts', '__tests__/api']);
  assert.deepEqual(validatePaths(['README.md', 'README.md']), ['README.md']);
});

test('rejects paths outside the assigned worktree or secrets', () => {
  for (const path of ['/tmp/file', '../README.md', 'app/../README.md',
    'app//page.tsx', '.git/config', 'config/.env.local', 'app\\page.tsx']) {
    assert.throws(() => validatePaths([path]));
  }
});

test('rejects task id path traversal', () => {
  assert.throws(() => jobPath('../other'));
});

test('preserves the leading status column in Git porcelain output', () => {
  assert.deepEqual(parsePorcelainStatus(' M lib/searchInput.ts\n?? new-file.ts\n'),
    ['lib/searchInput.ts', 'new-file.ts']);
});

test('does not pass Codex or production secrets to Claude', () => {
  assert.deepEqual(claudeEnv({ HOME: '/tmp/home', PATH: '/usr/bin', GH_TOKEN: 'secret', DATABASE_URL: 'secret' }),
    { HOME: '/tmp/home', PATH: '/usr/bin' });
});
