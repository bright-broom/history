import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { validateHistoryData } from '../scripts/lib/validate-history-data';
import { historyEventSchema, yearDataSchema } from '../src/domain/validation/schemas';
import { formatDate } from '../src/config/i18n';

const event = { date: '2024-01-01', title: ' Title ', category: ' 社会 ', description: ' Description ' };

test('calendar dates do not shift across runtime time zones', () => {
  const script = `const { formatDate } = require('./src/config/i18n.ts'); console.log(formatDate('2024-01-01')); console.log(formatDate('2024-02-29'));`;
  for (const TZ of ['UTC', 'America/Los_Angeles', 'Asia/Tokyo']) {
    const result = spawnSync(process.execPath, ['--import', 'tsx', '-e', script], { env: { ...process.env, TZ }, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), '2024年1月1日\n2024年2月29日');
  }
  for (const invalid of ['not-a-date', '2024-02-30', '']) assert.equal(formatDate(invalid), invalid);
});

test('text fields are trimmed and whitespace-only values are rejected', () => {
  const parsed = historyEventSchema.parse({ ...event, sources: [' Reference '], related_countries: [' 日本 '] });
  assert.equal(parsed.title, 'Title');
  assert.equal(parsed.category, '社会');
  assert.equal(parsed.description, 'Description');
  assert.deepEqual(parsed.sources, ['Reference']);
  assert.deepEqual(parsed.related_countries, ['日本']);
  for (const field of ['title', 'category', 'description']) {
    assert.equal(historyEventSchema.safeParse({ ...event, [field]: ' \t\n　' }).success, false);
  }
  for (const field of ['sources', 'related_countries']) {
    assert.equal(historyEventSchema.safeParse({ ...event, [field]: ['　 '] }).success, false);
  }
  assert.equal(yearDataSchema.safeParse({ year: 2024, summary: '　 ' }).success, false);
  assert.equal(yearDataSchema.safeParse({ year: 2024 }).success, true);
  assert.equal(yearDataSchema.parse({ year: 2024, summary: ' Summary ' }).summary, 'Summary');
});

test('disk audit validates every YAML and reports ignored or misplaced files together', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'history-audit-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, '2024'));
  await writeFile(join(root, '2024', '2024.yaml'), 'year: 2024');
  await writeFile(join(root, '2024', '2024-01.yaml'), 'year: 2024\nmonth: 1\nevents: []');
  await writeFile(join(root, 'README.md'), 'Documentation is allowed');
  assert.deepEqual(await validateHistoryData(root), { years: 1, files: 2, events: 0 });

  const invalidNames = ['2024/2024-1.yaml', '2024/2023-02.yaml', '2024/2024-13.yaml', '2024/2024.yml', '2024/2024-03.YAML', 'orphan.yaml', '2024/2024-04.yaml'];
  for (const name of invalidNames) await writeFile(join(root, name), 'events: [');
  await assert.rejects(validateHistoryData(root), (error) => {
    assert.ok(error instanceof AggregateError);
    assert.equal(error.errors.length, invalidNames.length);
    for (const name of invalidNames) assert.ok(error.errors.some((issue) => issue.message.includes(name)));
    return true;
  });
});

test('CLI validation fails for out-of-range and nested YAML files', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'history-cli-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, '2026'));
  await mkdir(join(root, '2024', 'nested'), { recursive: true });
  await writeFile(join(root, '2026', '2026.yaml'), 'year: 2026');
  await writeFile(join(root, '2024', 'nested', '2024.yaml'), 'year: 2024');
  const result = spawnSync(process.execPath, ['--conditions=react-server', '--import', 'tsx', 'scripts/validate-data.ts', root], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /2026\/2026.yaml/);
  assert.match(result.stderr, /2024\/nested\/2024.yaml/);
});
