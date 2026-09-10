import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { stringify } from 'yaml';
import { FileSystemHistoryRepository } from '../src/infrastructure/repositories/history-repository';
import { AsyncCache } from '../src/infrastructure/cache';
import { DataLoadError, DataParseError } from '../src/domain/errors';
import { createYear, createMonth, isValidDateString, parseYear, parseMonth } from '../src/domain/validation/validators';
import { HistoryService } from '../src/services/history-service';
import type { IHistoryRepository } from '../src/domain/repositories/history-repository';

const year = createYear(2024);
const month = createMonth(1);
const event = { date: '2024-01-01', title: 'Test', category: '社会', description: 'Description', sources: ['Reference'] };

async function fixture(t: TestContext) {
  const root = await mkdtemp(join(tmpdir(), 'history-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, '2024'));
  const path = join(root, '2024', '2024-01.yaml');
  await writeFile(path, stringify({ year, month, events: [event] }));
  return { root, path, repository: new FileSystemHistoryRepository(root) };
}

test('route parsing rejects partial numbers and dates reject calendar overflow', () => {
  for (const value of ['2024abc', '2024.5', ' 2024', '+2024', '']) assert.equal(parseYear(value).success, false);
  for (const value of ['1abc', '1.5', ' 1', '13', '0']) assert.equal(parseMonth(value).success, false);
  assert.equal(parseMonth('01').success, true);
  assert.equal(isValidDateString('2024-02-29'), true);
  assert.equal(isValidDateString('2023-02-29'), false);
  assert.equal(isValidDateString('2024-02-30'), false);
});

test('validated mapping preserves sources and defaults countries', async (t) => {
  const { repository } = await fixture(t);
  const data = await repository.getMonthData(year, month);
  assert.deepEqual(data?.events[0].sources, ['Reference']);
  assert.deepEqual(data?.events[0].relatedCountries, []);
  assert.equal(await repository.getMonthData(year, createMonth(2)), null);
});

test('invalid documents fail and can be retried after repair', async (t) => {
  const { path, repository } = await fixture(t);
  for (const content of ['events: [', stringify({ year, month, events: [{}] }), stringify({ year, month: 2, events: [] }), stringify({ year, month, events: [{ ...event, date: '2024-02-01' }] })]) {
    await writeFile(path, content);
    await assert.rejects(repository.getMonthData(year, month), DataParseError);
  }
  await writeFile(path, stringify({ year, month, events: [event] }));
  assert.equal((await repository.getMonthData(year, month))?.events.length, 1);
});

test('year documents must agree with their path and event dates', async (t) => {
  const { root, repository } = await fixture(t);
  const path = join(root, '2024', '2024.yaml');
  await writeFile(path, stringify({ year: 2023 }));
  await assert.rejects(repository.getYearData(year), DataParseError);
  await writeFile(path, stringify({ year, majorEvents: [{ ...event, date: '2023-01-01' }] }));
  await assert.rejects(repository.getYearData(year), DataParseError);
});

test('catalog only discovers canonical directory and matching month filenames', async (t) => {
  const { root, repository } = await fixture(t);
  await mkdir(join(root, '2023backup'));
  await writeFile(join(root, '2024', '2023-02.yaml'), '');
  await writeFile(join(root, '2024', '2024-13.yaml'), '');
  assert.deepEqual(await repository.getAvailableYears(), [year]);
  assert.deepEqual(await repository.getAvailableMonths(year), [month]);
  assert.deepEqual(await repository.getAvailableMonths(createYear(2023)), []);
  await assert.rejects(new FileSystemHistoryRepository(join(root, 'missing')).getAvailableYears(), DataLoadError);
});

test('I/O errors are not reported as absent documents', async (t) => {
  const { root, repository } = await fixture(t);
  await mkdir(join(root, '2024', '2024-02.yaml'));
  await assert.rejects(repository.getMonthData(year, createMonth(2)), DataLoadError);
});

test('repository instances and returned values are isolated', async (t) => {
  const first = await fixture(t);
  const second = await fixture(t);
  await writeFile(second.path, stringify({ year, month, events: [] }));
  const data = await first.repository.getAvailableYears();
  data.length = 0;
  assert.deepEqual(await first.repository.getAvailableYears(), [year]);
  assert.equal((await first.repository.getMonthData(year, month))?.events.length, 1);
  assert.equal((await second.repository.getMonthData(year, month))?.events.length, 0);
});

test('cache deduplicates concurrent loads, expires, evicts and retries failures', async () => {
  let now = 0;
  let calls = 0;
  const cache = new AsyncCache(10, 1, () => now);
  const load = async () => { calls++; return [calls]; };
  const results = await Promise.all([cache.get('a', load), cache.get('a', load)]);
  assert.equal(calls, 1);
  results[0].push(99);
  assert.deepEqual(results[1], [1]);
  now = 10;
  assert.deepEqual(await cache.get('a', load), [2]);
  await cache.get('b', load);
  assert.deepEqual(await cache.get('a', load), [4]);
  await assert.rejects(cache.get('error', async () => { throw new Error('temporary'); }));
  assert.equal(await cache.get('error', async () => 42), 42);
});

test('service calculates statistics against an injected storage port', async () => {
  const repository: IHistoryRepository = {
    getAvailableYears: async () => [year],
    getAvailableMonths: async () => [month],
    getYearData: async () => null,
    getMonthData: async () => ({ year, month, events: [] }),
    getAllMonthsForYear: async () => [],
    getAllEventsForYear: async () => [],
  };
  const service = new HistoryService(repository);
  assert.deepEqual(await service.getYearStatistics(year), { year, totalEvents: 0, monthsWithData: 1 });
  assert.equal(await service.getTotalEventCount(), 0);
});
