/**
 * Zodバリデーションスキーマ
 * @module domain/validation/schemas
 */

import { z } from 'zod';
import { isValidDateString } from './validators';
import { YEAR_RANGE, MONTH_RANGE, EVENT_CATEGORIES } from '@/config/constants';

// ============================================
// プリミティブスキーマ
// ============================================

/**
 * 年のスキーマ（1800-2025）
 */
export const yearSchema = z
  .number()
  .int('年は整数である必要があります')
  .min(YEAR_RANGE.MIN, `年は${YEAR_RANGE.MIN}以上である必要があります`)
  .max(YEAR_RANGE.MAX, `年は${YEAR_RANGE.MAX}以下である必要があります`);

/**
 * 月のスキーマ（1-12）
 */
export const monthSchema = z
  .number()
  .int('月は整数である必要があります')
  .min(MONTH_RANGE.MIN, `月は${MONTH_RANGE.MIN}以上である必要があります`)
  .max(MONTH_RANGE.MAX, `月は${MONTH_RANGE.MAX}以下である必要があります`);

/**
 * 日付文字列のスキーマ（YYYY-MM-DD形式）
 */
export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, '日付はYYYY-MM-DD形式である必要があります')
  .refine(isValidDateString, '有効な日付である必要があります');

/**
 * イベントカテゴリのスキーマ
 */
export const eventCategorySchema = z.enum(EVENT_CATEGORIES);

// ============================================
// エンティティスキーマ
// ============================================

/**
 * 歴史イベントのスキーマ
 */
export const historyEventSchema = z.object({
  date: dateStringSchema,
  title: z.string().min(1, 'タイトルは必須です').max(200, 'タイトルは200文字以内である必要があります'),
  category: z.string().min(1, 'カテゴリは必須です'),
  description: z.string().min(1, '説明は必須です').max(2000, '説明は2000文字以内である必要があります'),
  related_countries: z.array(z.string().min(1)).default([]),
  sources: z.array(z.string().min(1)).optional(),
});

/**
 * 月別データのスキーマ
 */
export const monthDataSchema = z.object({
  month: monthSchema,
  year: yearSchema,
  events: z.array(historyEventSchema),
});

/**
 * 年別データのスキーマ
 */
export const yearDataSchema = z.object({
  year: yearSchema,
  summary: z.string().max(1000, '概要は1000文字以内である必要があります').optional(),
  majorEvents: z.array(historyEventSchema).optional(),
});

// ============================================
// パラメータスキーマ
// ============================================

/**
 * 年別ページパラメータのスキーマ
 */
export const yearPageParamsSchema = z.object({
  year: z.string().regex(/^\d+$/, '年は数値である必要があります'),
});

/**
 * 月別ページパラメータのスキーマ
 */
export const monthPageParamsSchema = z.object({
  year: z.string().regex(/^\d+$/, '年は数値である必要があります'),
  month: z.string().regex(/^\d+$/, '月は数値である必要があります'),
});

// ============================================
// 型推論
// ============================================

export type HistoryEventInput = z.input<typeof historyEventSchema>;
export type HistoryEventOutput = z.output<typeof historyEventSchema>;
export type MonthDataInput = z.input<typeof monthDataSchema>;
export type MonthDataOutput = z.output<typeof monthDataSchema>;
export type YearDataInput = z.input<typeof yearDataSchema>;
export type YearDataOutput = z.output<typeof yearDataSchema>;
