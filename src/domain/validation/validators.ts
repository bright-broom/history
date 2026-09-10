/**
 * バリデーションユーティリティ
 * @module domain/validation/validators
 */

import { YEAR_RANGE, MONTH_RANGE } from '@/config/constants';
import type { Year, Month, DateString, Result } from '@/domain/types';

// ============================================
// Type Guards（型ガード）
// ============================================

/**
 * 年が有効範囲内かチェック
 * @param value - チェック対象の値
 * @returns 有効な場合true
 */
export function isValidYear(value: unknown): value is Year {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= YEAR_RANGE.MIN &&
    value <= YEAR_RANGE.MAX
  );
}

/**
 * 月が有効範囲内かチェック
 * @param value - チェック対象の値
 * @returns 有効な場合true
 */
export function isValidMonth(value: unknown): value is Month {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= MONTH_RANGE.MIN &&
    value <= MONTH_RANGE.MAX
  );
}

/**
 * 日付文字列が有効かチェック
 * @param value - チェック対象の値
 * @returns 有効な場合true
 */
export function isValidDateString(value: unknown): value is DateString {
  if (typeof value !== 'string') return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(value)) return false;
  const date = new Date(value);
  return !isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

// ============================================
// Safe Parsers（安全なパーサー）
// ============================================

/**
 * 文字列を年に変換（安全）
 * @param value - 変換対象の文字列
 * @returns 変換結果
 */
export function parseYear(value: string): Result<Year> {
  const parsed = Number(value);
  if (!/^\d+$/.test(value)) {
    return {
      success: false,
      error: { code: 'INVALID_FORMAT', message: '年は数値である必要があります' },
    };
  }
  if (!isValidYear(parsed)) {
    return {
      success: false,
      error: {
        code: 'OUT_OF_RANGE',
        message: `年は${YEAR_RANGE.MIN}から${YEAR_RANGE.MAX}の範囲である必要があります`,
      },
    };
  }
  return { success: true, data: parsed };
}

/**
 * 文字列を月に変換（安全）
 * @param value - 変換対象の文字列
 * @returns 変換結果
 */
export function parseMonth(value: string): Result<Month> {
  const parsed = Number(value);
  if (!/^\d+$/.test(value)) {
    return {
      success: false,
      error: { code: 'INVALID_FORMAT', message: '月は数値である必要があります' },
    };
  }
  if (!isValidMonth(parsed)) {
    return {
      success: false,
      error: {
        code: 'OUT_OF_RANGE',
        message: `月は${MONTH_RANGE.MIN}から${MONTH_RANGE.MAX}の範囲である必要があります`,
      },
    };
  }
  return { success: true, data: parsed };
}

// ============================================
// Assertion Functions（アサーション関数）
// ============================================

/**
 * 年の値をアサート
 * @param value - チェック対象の値
 * @throws 無効な値の場合
 */
export function assertYear(value: unknown): asserts value is Year {
  if (!isValidYear(value)) {
    throw new Error(`Invalid year: ${value}. Must be between ${YEAR_RANGE.MIN} and ${YEAR_RANGE.MAX}`);
  }
}

/**
 * 月の値をアサート
 * @param value - チェック対象の値
 * @throws 無効な値の場合
 */
export function assertMonth(value: unknown): asserts value is Month {
  if (!isValidMonth(value)) {
    throw new Error(`Invalid month: ${value}. Must be between ${MONTH_RANGE.MIN} and ${MONTH_RANGE.MAX}`);
  }
}

// ============================================
// Factory Functions（ファクトリ関数）
// ============================================

/**
 * Year型を作成（バリデーション付き）
 * @param value - 年の値
 * @returns Year型の値
 * @throws 無効な値の場合
 */
export function createYear(value: number): Year {
  assertYear(value);
  return value;
}

/**
 * Month型を作成（バリデーション付き）
 * @param value - 月の値
 * @returns Month型の値
 * @throws 無効な値の場合
 */
export function createMonth(value: number): Month {
  assertMonth(value);
  return value;
}

/**
 * DateString型を作成（バリデーション付き）
 * @param value - 日付文字列
 * @returns DateString型の値
 * @throws 無効な値の場合
 */
export function createDateString(value: string): DateString {
  if (!isValidDateString(value)) {
    throw new Error(`Invalid date string: ${value}. Must be in YYYY-MM-DD format`);
  }
  return value as DateString;
}
