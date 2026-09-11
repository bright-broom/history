/**
 * 歴史データサービス
 * ビジネスロジックとユースケースを実装
 * @module services/history-service
 */

import type { Year, Month, HistoryEvent, MonthData, YearData, YearStatistics, MonthStatistics, Result } from '@/domain/types';
import type { IHistoryRepository } from '@/domain/repositories/history-repository';
import { parseYear, parseMonth } from '@/domain/validation/validators';

/** Read models shared by page rendering and other callers. */
export interface HistoryCatalog {
  readonly years: readonly YearStatistics[];
  readonly totalEvents: number;
}

export interface YearOverview {
  readonly data: YearData | null;
  readonly months: readonly Month[];
  readonly monthStatistics: readonly MonthStatistics[];
  readonly totalEvents: number;
}

/**
 * 歴史データサービスインターフェース
 */
export interface IHistoryService {
  // 読み取り操作
  getAvailableYears(): Promise<Year[]>;
  getAvailableMonths(year: Year): Promise<Month[]>;
  getYearData(year: Year): Promise<YearData | null>;
  getMonthData(year: Year, month: Month): Promise<MonthData | null>;
  getAllEventsForYear(year: Year): Promise<HistoryEvent[]>;
  getAllMonthsForYear(year: Year): Promise<MonthData[]>;

  getCatalog(): Promise<HistoryCatalog>;
  getYearOverview(year: Year): Promise<YearOverview | null>;

  // 統計
  getYearStatistics(year: Year): Promise<YearStatistics>;
  getMonthStatistics(year: Year, month: Month): Promise<MonthStatistics | null>;
  getTotalEventCount(): Promise<number>;

  // パラメータ解析
  parseYearParam(yearStr: string): Result<Year>;
  parseMonthParam(monthStr: string): Result<Month>;
}

/**
 * 歴史データサービス実装
 */
export class HistoryService implements IHistoryService {
  private readonly repository: IHistoryRepository;

  constructor(repository: IHistoryRepository) {
    this.repository = repository;
  }

  /**
   * 利用可能な年のリストを取得
   */
  async getAvailableYears(): Promise<Year[]> {
    return this.repository.getAvailableYears();
  }

  /**
   * 指定した年の利用可能な月のリストを取得
   */
  async getAvailableMonths(year: Year): Promise<Month[]> {
    return this.repository.getAvailableMonths(year);
  }

  /**
   * 年別の概要データを取得
   */
  async getYearData(year: Year): Promise<YearData | null> {
    return this.repository.getYearData(year);
  }

  /**
   * 月別の詳細データを取得
   */
  async getMonthData(year: Year, month: Month): Promise<MonthData | null> {
    return this.repository.getMonthData(year, month);
  }

  /**
   * 指定した年の全イベントを取得
   */
  async getAllEventsForYear(year: Year): Promise<HistoryEvent[]> {
    return this.repository.getAllEventsForYear(year);
  }

  /**
   * 指定した年の全月別データを取得
   */
  async getAllMonthsForYear(year: Year): Promise<MonthData[]> {
    return this.repository.getAllMonthsForYear(year);
  }

  /**
   * 年別統計を取得
   */
  async getYearStatistics(year: Year): Promise<YearStatistics> {
    const [events, months] = await Promise.all([
      this.getAllEventsForYear(year),
      this.getAvailableMonths(year),
    ]);

    return {
      year,
      totalEvents: events.length,
      monthsWithData: months.length,
    };
  }

  /**
   * 月別統計を取得
   */
  async getMonthStatistics(year: Year, month: Month): Promise<MonthStatistics | null> {
    const monthData = await this.getMonthData(year, month);
    if (!monthData) return null;

    return {
      year,
      month,
      eventCount: monthData.events.length,
    };
  }

  /**
   * 全イベント数を取得
   */
  async getTotalEventCount(): Promise<number> {
    return (await this.getCatalog()).totalEvents;
  }

  async getCatalog(): Promise<HistoryCatalog> {
    const years = await this.getAvailableYears();
    const statistics = await Promise.all(years.map((year) => this.getYearStatistics(year)));
    return {
      years: statistics,
      totalEvents: statistics.reduce((sum, year) => sum + year.totalEvents, 0),
    };
  }

  /** A year with an overview or any month file exists, even when it has no events. */
  async getYearOverview(year: Year): Promise<YearOverview | null> {
    const [data, months, monthData] = await Promise.all([
      this.getYearData(year),
      this.getAvailableMonths(year),
      this.getAllMonthsForYear(year),
    ]);
    if (!data && months.length === 0) return null;

    const monthStatistics = monthData.map((data) => ({
      year,
      month: data.month,
      eventCount: data.events.length,
    }));
    return {
      data,
      months,
      monthStatistics,
      totalEvents: monthStatistics.reduce((sum, month) => sum + month.eventCount, 0),
    };
  }

  /**
   * 年パラメータを解析
   */
  parseYearParam(yearStr: string): Result<Year> {
    return parseYear(yearStr);
  }

  /**
   * 月パラメータを解析
   */
  parseMonthParam(monthStr: string): Result<Month> {
    return parseMonth(monthStr);
  }
}
