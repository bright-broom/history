import assert from 'node:assert/strict';
import { test } from 'node:test';
import { HistoryService } from '../src/services/history-service';
import type { IHistoryRepository } from '../src/domain/repositories/history-repository';
import type { HistoryEvent } from '../src/domain/types';
import { createYear, createMonth, createDateString } from '../src/domain/validation/validators';

const year = createYear(2024);
const month = createMonth(1);
const event: HistoryEvent = {
  date: createDateString('2024-01-01'),
  title: 'Event', category: '社会', description: 'Description', relatedCountries: [],
};

function repository(overrides: Partial<IHistoryRepository> = {}): IHistoryRepository {
  return {
    getAvailableYears: async () => [],
    getAvailableMonths: async () => [],
    getYearData: async () => null,
    getMonthData: async () => null,
    getAllMonthsForYear: async () => [],
    getAllEventsForYear: async () => [],
    ...overrides,
  };
}

test('catalog retains repository year order and counts only monthly events', async () => {
  const earlier = createYear(2023);
  const service = new HistoryService(repository({
    getAvailableYears: async () => [earlier, year],
    getAvailableMonths: async () => [month],
    getAllEventsForYear: async (value) => value === year ? [event, event] : [event],
    getYearData: async () => { throw new Error('Overview events must not be counted'); },
  }));
  assert.deepEqual(await service.getCatalog(), {
    years: [
      { year: earlier, totalEvents: 1, monthsWithData: 1 },
      { year, totalEvents: 2, monthsWithData: 1 },
    ],
    totalEvents: 3,
  });
  assert.equal(await service.getTotalEventCount(), 3);
});

test('empty catalog has zero total and absent year has no overview', async () => {
  const service = new HistoryService(repository());
  assert.deepEqual(await service.getCatalog(), { years: [], totalEvents: 0 });
  assert.equal(await service.getYearOverview(year), null);
});

test('summary-only years remain visible without double counting major events', async () => {
  const data = { year, summary: 'Summary', majorEvents: [event] };
  const service = new HistoryService(repository({ getYearData: async () => data }));
  assert.deepEqual(await service.getYearOverview(year), {
    data, months: [], monthStatistics: [], totalEvents: 0,
  });
});

test('year overview retains empty months and sums monthly event counts', async () => {
  const february = createMonth(2);
  const service = new HistoryService(repository({
    getAvailableMonths: async () => [month, february],
    getAllMonthsForYear: async () => [
      { year, month, events: [event, event] },
      { year, month: february, events: [] },
    ],
  }));
  assert.deepEqual(await service.getYearOverview(year), {
    data: null,
    months: [month, february],
    monthStatistics: [
      { year, month, eventCount: 2 },
      { year, month: february, eventCount: 0 },
    ],
    totalEvents: 2,
  });
});

test('read models propagate storage failures instead of showing empty content', async () => {
  const failure = new Error('Storage unavailable');
  const service = new HistoryService(repository({
    getAvailableYears: async () => [year],
    getAvailableMonths: async () => { throw failure; },
  }));
  await assert.rejects(service.getCatalog(), (error) => error === failure);
  await assert.rejects(service.getYearOverview(year), (error) => error === failure);
});
