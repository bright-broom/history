import type { Year, Month, HistoryEvent, MonthData, YearData } from '@/domain/types';

/** Storage port. Missing optional documents return null; invalid data and I/O failures throw. */
export interface IHistoryRepository {
  getAvailableYears(): Promise<Year[]>;
  getAvailableMonths(year: Year): Promise<Month[]>;
  getYearData(year: Year): Promise<YearData | null>;
  getMonthData(year: Year, month: Month): Promise<MonthData | null>;
  getAllMonthsForYear(year: Year): Promise<MonthData[]>;
  getAllEventsForYear(year: Year): Promise<HistoryEvent[]>;
}
