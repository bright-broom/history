import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { parse } from 'yaml';
import { classifyChanges } from '../scripts/ci/change-policy.mjs';

const full = { verify: true, build: true, dependencies: false, security: true };
test('CI policy skips docs, checks tests, and builds application and unknown files', () => {
  assert.deepEqual(classifyChanges(['README.md', 'docs/design.md', 'AGENTS.md']), { verify: false, build: false, dependencies: false, security: false });
  assert.deepEqual(classifyChanges(['tests/example.test.ts']), { ...full, build: false });
  assert.deepEqual(classifyChanges(['src/app/page.tsx']), full);
  assert.deepEqual(classifyChanges(['package-lock.json']), { ...full, dependencies: true });
  assert.equal(classifyChanges(['src/data/2024/2024.yaml']).build, true);
  assert.equal(classifyChanges(['new-runtime-config.json']).build, true);
  assert.equal(classifyChanges(['scripts/ci/change-policy.mjs']).build, true);
  assert.equal(classifyChanges(['README.md', 'src/app/page.tsx']).build, true);
});

test('workflow has bounded events, stable check and least-privilege permissions', async () => {
  const workflow = parse(await readFile('.github/workflows/ci.yml', 'utf8'));
  assert.deepEqual(workflow.on.push.branches, ['main']);
  assert.equal(workflow.on.pull_request.paths, undefined);
  assert.equal(workflow.on.pull_request_target, undefined);
  assert.equal(workflow.concurrency['cancel-in-progress'], true);
  assert.deepEqual(workflow.permissions, { contents: 'read' });
  assert.ok(workflow.jobs.verify.if.includes('draft == false'));
  for (const job of Object.values(workflow.jobs) as { steps: { uses?: string; with?: Record<string, unknown> }[]; 'timeout-minutes': number }[]) {
    assert.ok(job['timeout-minutes'] <= 20);
    for (const step of job.steps) {
      if (step.uses) assert.match(step.uses, /@[a-f0-9]{40}$/);
      if (step.uses?.startsWith('actions/checkout@')) assert.equal(step.with?.['persist-credentials'], false);
    }
  }
});

test('dependency updates are grouped monthly and AI review does not run on every push', async () => {
  const dependabot = parse(await readFile('.github/dependabot.yml', 'utf8'));
  for (const update of dependabot.updates) {
    assert.equal(update.schedule.interval, 'monthly');
    assert.equal(update.cooldown['default-days'], 7);
    assert.ok(Object.values(update.groups).some((group) => (group as Record<string, string>)['applies-to'] === 'security-updates'));
  }
  const rabbit = parse(await readFile('.coderabbit.yaml', 'utf8'));
  assert.equal(rabbit.reviews.auto_review.auto_incremental_review, false);
  assert.equal(rabbit.reviews.auto_review.drafts, false);
});

test('Vercel skips docs but includes application changes since the last successful deployment', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'history-ci-policy-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const git = (...args: string[]) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  git('init', '-q');
  git('config', 'user.name', 'CI Test');
  git('config', 'user.email', 'ci@example.invalid');
  await writeFile(join(root, 'README.md'), 'initial');
  git('add', '.'); git('commit', '-qm', 'initial');
  const initial = git('rev-parse', 'HEAD');
  await writeFile(join(root, 'README.md'), 'docs');
  git('add', '.'); git('commit', '-qm', 'docs');
  const docs = git('rev-parse', 'HEAD');
  const run = (base: string, head: string) => spawnSync(process.execPath, [resolve('scripts/ci/ignore-vercel-build.mjs')], {
    cwd: root, env: { ...process.env, VERCEL_GIT_PREVIOUS_SHA: base, VERCEL_GIT_COMMIT_SHA: head }, encoding: 'utf8',
  });
  assert.equal(run(initial, docs).status, 0);
  await mkdir(join(root, 'src'));
  await writeFile(join(root, 'src', 'app.ts'), 'export const value = 1;');
  git('add', '.'); git('commit', '-qm', 'app');
  await writeFile(join(root, 'README.md'), 'more docs');
  git('add', '.'); git('commit', '-qm', 'more docs');
  assert.equal(run(docs, git('rev-parse', 'HEAD')).status, 1);
  git('mv', 'src/app.ts', 'docs.md'); git('commit', '-qm', 'move app');
  assert.equal(run(docs, git('rev-parse', 'HEAD')).status, 1);
  assert.equal(run('', git('rev-parse', 'HEAD')).status, 1);
  assert.equal(run('a'.repeat(40), git('rev-parse', 'HEAD')).status, 1);
});
