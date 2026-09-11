import 'server-only';

import { HistoryService, type IHistoryService, type HistoryCatalog, type YearOverview } from '@/services/history-service';
import { FileSystemHistoryRepository } from '@/infrastructure/repositories/history-repository';
import type { Year, Month, HistoryEvent, MonthData, YearData, Result } from '@/domain/types';
import { isValidYear, isValidMonth, createYear, createMonth } from '@/domain/validation/validators';

// ============================================
// ファサード関数（後方互換性のため）
// ============================================

let defaultService: IHistoryService | null = null;

function getService(): IHistoryService {
  if (!defaultService) {
    defaultService = new HistoryService(new FileSystemHistoryRepository());
  }
  return defaultService;
}

/**
 * 利用可能な年のリストを取得
 */
export async function getAvailableYears(): Promise<Year[]> {
  return getService().getAvailableYears();
}

/**
 * 指定した年の利用可能な月のリストを取得
 */
export async function getAvailableMonths(year: number): Promise<Month[]> {
  if (!isValidYear(year)) return [];
  return getService().getAvailableMonths(year);
}

/**
 * 年別の概要データを取得
 */
export async function getYearData(year: number): Promise<YearData | null> {
  if (!isValidYear(year)) return null;
  return getService().getYearData(year);
}

/**
 * 月別の詳細データを取得
 */
export async function getMonthData(year: number, month: number): Promise<MonthData | null> {
  if (!isValidYear(year) || !isValidMonth(month)) return null;
  return getService().getMonthData(createYear(year), createMonth(month));
}

/**
 * 指定した年の全イベントを取得
 */
export async function getAllEventsForYear(year: number): Promise<HistoryEvent[]> {
  if (!isValidYear(year)) return [];
  return getService().getAllEventsForYear(year);
}

/**
 * 指定した年の全月別データを取得
 */
export async function getAllMonthsForYear(year: number): Promise<MonthData[]> {
  if (!isValidYear(year)) return [];
  return getService().getAllMonthsForYear(year);
}

/**
 * 年パラメータを解析
 */
export function parseYearParam(yearStr: string): Result<Year> {
  return getService().parseYearParam(yearStr);
}

/**
 * 月パラメータを解析
 */
export function parseMonthParam(monthStr: string): Result<Month> {
  return getService().parseMonthParam(monthStr);
}

export async function getCatalog(): Promise<HistoryCatalog> {
  return getService().getCatalog();
}

export async function getYearOverview(year: Year): Promise<YearOverview | null> {
  return getService().getYearOverview(year);
}
