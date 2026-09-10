import 'server-only';

import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { parse } from 'yaml';
import { z } from 'zod';
import { DATA_DIR_PATH, FILE_PATTERNS } from '@/config/constants';
import type { IHistoryRepository } from '@/domain/repositories/history-repository';
import type { Year, Month, HistoryEvent, MonthData, YearData } from '@/domain/types';
import { DataLoadError, DataParseError } from '@/domain/errors';
import { monthDataSchema, yearDataSchema, type HistoryEventOutput } from '@/domain/validation/schemas';
import { isValidYear, isValidMonth, createDateString, assertYear, assertMonth } from '@/domain/validation/validators';
import { AsyncCache } from '@/infrastructure/cache';

function isMissing(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}

function toEvent(event: HistoryEventOutput): HistoryEvent {
  return {
    date: createDateString(event.date),
    title: event.title,
    category: event.category,
    description: event.description,
    relatedCountries: event.related_countries,
    sources: event.sources,
  };
}

/** YAML is validated once at the storage boundary, before domain mapping or caching. */
export class FileSystemHistoryRepository implements IHistoryRepository {
  private readonly cache = new AsyncCache();

  constructor(private readonly dataDir = join(process.cwd(), ...DATA_DIR_PATH)) {}

  private async readDocument<T>(path: string, schema: z.ZodType<T>): Promise<T | null> {
    let content: string;
    try {
      content = await readFile(path, 'utf8');
    } catch (error) {
      if (isMissing(error)) return null;
      throw new DataLoadError('Failed to read history data', path, error instanceof Error ? error : undefined);
    }
    try {
      return schema.parse(parse(content));
    } catch (error) {
      throw new DataParseError('Invalid history data', path, error instanceof Error ? error : undefined);
    }
  }

  async getAvailableYears(): Promise<Year[]> {
    return this.cache.get('years', async () => {
      try {
        const entries = await readdir(this.dataDir, { withFileTypes: true });
        return entries.filter((entry) => entry.isDirectory() && /^\d{4}$/.test(entry.name))
          .map((entry) => Number(entry.name)).filter(isValidYear).sort((a, b) => a - b);
      } catch (error) {
        // A missing root means a deployment/configuration error, not an empty catalog.
        throw new DataLoadError('Failed to read history directory', this.dataDir, error instanceof Error ? error : undefined);
      }
    });
  }

  async getAvailableMonths(year: Year): Promise<Month[]> {
    assertYear(year);
    return this.cache.get(`months:${year}`, async () => {
      const path = join(this.dataDir, String(year));
      try {
        const entries = await readdir(path, { withFileTypes: true });
        const pattern = new RegExp(`^${year}-(\\d{2})\\.yaml$`);
        return entries.filter((entry) => entry.isFile() && pattern.test(entry.name))
          .map((entry) => Number(entry.name.match(pattern)![1]))
          .filter(isValidMonth).sort((a, b) => a - b);
      } catch (error) {
        if (isMissing(error)) return [];
        throw new DataLoadError('Failed to read month directory', path, error instanceof Error ? error : undefined);
      }
    });
  }

  async getYearData(year: Year): Promise<YearData | null> {
    assertYear(year);
    return this.cache.get(`year:${year}`, async () => {
      const path = join(this.dataDir, String(year), FILE_PATTERNS.YEAR_SUMMARY(year));
      const data = await this.readDocument(path, yearDataSchema);
      if (!data) return null;
      if (data.year !== year || data.majorEvents?.some((event) => !event.date.startsWith(`${year}-`))) {
        throw new DataParseError('Year data does not match its path', path);
      }
      return { year, summary: data.summary, majorEvents: data.majorEvents?.map(toEvent) };
    });
  }

  async getMonthData(year: Year, month: Month): Promise<MonthData | null> {
    assertYear(year);
    assertMonth(month);
    return this.cache.get(`month:${year}:${month}`, async () => {
      const path = join(this.dataDir, String(year), FILE_PATTERNS.MONTH_DATA(year, month));
      const data = await this.readDocument(path, monthDataSchema);
      if (!data) return null;
      const prefix = `${year}-${String(month).padStart(2, '0')}-`;
      if (data.year !== year || data.month !== month || data.events.some((event) => !event.date.startsWith(prefix))) {
        throw new DataParseError('Month data does not match its path', path);
      }
      return { year, month, events: data.events.map(toEvent) };
    });
  }

  async getAllMonthsForYear(year: Year): Promise<MonthData[]> {
    const months = await this.getAvailableMonths(year);
    const results = await Promise.all(months.map((month) => this.getMonthData(year, month)));
    return results.filter((data): data is MonthData => data !== null);
  }

  async getAllEventsForYear(year: Year): Promise<HistoryEvent[]> {
    const months = await this.getAllMonthsForYear(year);
    return months.flatMap((month) => month.events).sort((a, b) => a.date.localeCompare(b.date));
  }
}
