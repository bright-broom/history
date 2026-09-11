/**
 * 国際化（i18n）設定
 * @module config/i18n
 */

import { isValidDateString } from '@/domain/validation/validators';

/** 月名の定義 */
export const MONTH_NAMES = {
  ja: [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月',
  ],
  en: [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ],
} as const;

/** UIラベル */
export const LABELS = {
  ja: {
    // ナビゲーション
    nav: {
      home: '世界史年表',
      year: (year: number) => `${year}年`,
      month: (month: number) => `${month}月`,
    },
    // ページタイトル
    page: {
      homeTitle: '世界史年表',
      homeDescription: '1800年から2025年までの日本中心の世界史を閲覧できます',
      yearTitle: (year: number) => `${year}年`,
      monthTitle: (year: number, month: number) => `${year}年 ${month}月`,
    },
    // イベントカード
    event: {
      relatedCountries: '関連国・地域',
      sources: '参考文献',
    },
    // 統計
    stats: {
      totalEvents: (count: number) => `全${count}件の出来事を収録`,
      eventCount: (count: number) => `${count}件`,
      eventsInYear: (count: number) => `${count}件の出来事`,
    },
    // セクション
    section: {
      majorEvents: '主要イベント',
      monthlyDetails: '月別詳細',
    },
    // 空状態
    empty: {
      noData: 'データがまだ登録されていません。',
      noYearData: 'この年のデータはまだ登録されていません。',
      noMonthData: 'この月のデータはまだ登録されていません。',
    },
    // エラー
    error: {
      notFound: 'ページが見つかりません',
      invalidYear: '無効な年が指定されました',
      invalidMonth: '無効な月が指定されました',
      loadFailed: 'データの読み込みに失敗しました',
    },
    // アクセシビリティ
    a11y: {
      navigateToYear: (year: number) => `${year}年のページへ移動`,
      navigateToMonth: (year: number, month: number) => `${year}年${month}月のページへ移動`,
      eventCategory: (category: string) => `カテゴリ: ${category}`,
      eventDate: (date: string) => `日付: ${date}`,
    },
  },
} as const;

/** 現在のロケール（将来的に動的切り替え対応可能） */
export const CURRENT_LOCALE = 'ja' as const;

/** ロケールに基づいたラベル取得 */
export const t = LABELS[CURRENT_LOCALE];

/**
 * 月番号から月名を取得
 * @param month - 月番号（1-12）
 * @param locale - ロケール
 * @returns 月名
 */
export function getMonthName(month: number, locale: keyof typeof MONTH_NAMES = CURRENT_LOCALE): string {
  if (month < 1 || month > 12) {
    return '';
  }
  return MONTH_NAMES[locale][month - 1];
}

/**
 * 日付文字列をフォーマット
 * @param dateString - YYYY-MM-DD形式の日付文字列
 * @param locale - ロケール
 * @returns フォーマットされた日付文字列
 */
export function formatDate(dateString: string, locale: string = CURRENT_LOCALE): string {
  if (!isValidDateString(dateString)) return dateString;
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale, {
      timeZone: 'UTC',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}
