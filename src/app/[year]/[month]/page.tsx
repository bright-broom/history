/**
 * 月別ページ
 * @module app/[year]/[month]/page
 */

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { t, getMonthName } from '@/config/i18n';
import { parseYear, parseMonth } from '@/domain/validation/validators';
import {
  getAvailableYears,
  getAvailableMonths,
  getMonthData,
} from '@/server/history';
import {
  PageContainer,
  PageHeader,
  Breadcrumbs,
  EventCard,
  EmptyState,
} from '@/components/features';

/** ページパラメータの型 */
interface MonthPageParams {
  readonly year: string;
  readonly month: string;
}

/** ページプロパティ */
interface MonthPageProps {
  readonly params: Promise<MonthPageParams>;
}

/**
 * 動的メタデータ生成
 */
export async function generateMetadata({
  params,
}: MonthPageProps): Promise<Metadata> {
  const { year: yearStr, month: monthStr } = await params;

  const yearResult = parseYear(yearStr);
  const monthResult = parseMonth(monthStr);

  if (!yearResult.success || !monthResult.success) {
    return { title: t.error.notFound };
  }

  const title = t.page.monthTitle(yearResult.data, monthResult.data);

  return {
    title,
    description: `${yearResult.data}年${getMonthName(monthResult.data)}の歴史的出来事`,
  };
}

/**
 * 静的生成パラメータ
 */
export async function generateStaticParams(): Promise<MonthPageParams[]> {
  const years = await getAvailableYears();
  const params: MonthPageParams[] = [];

  for (const year of years) {
    const months = await getAvailableMonths(year);
    for (const month of months) {
      params.push({
        year: year.toString(),
        month: month.toString(),
      });
    }
  }

  return params;
}

/**
 * 月別ページコンポーネント
 */
export default async function MonthPage({
  params,
}: MonthPageProps) {
  const { year: yearStr, month: monthStr } = await params;

  const yearResult = parseYear(yearStr);
  const monthResult = parseMonth(monthStr);

  if (!yearResult.success || !monthResult.success) {
    notFound();
  }

  const year = yearResult.data;
  const month = monthResult.data;

  const [monthData, allYears, allMonths] = await Promise.all([
    getMonthData(year, month),
    getAvailableYears(),
    getAvailableMonths(year),
  ]);

  if (!monthData) {
    notFound();
  }

  const eventCount = monthData.events.length;
  const hasEvents = eventCount > 0;

  return (
    <PageContainer>
      <Breadcrumbs
        currentYear={year}
        currentMonth={month}
        availableYears={allYears}
        availableMonths={allMonths}
      />

      <PageHeader
        title={t.page.monthTitle(year, month)}
        badge={t.stats.eventCount(eventCount)}
      />

      {hasEvents ? (
        <div
          className="divide-y divide-border"
          role="feed"
          aria-label={`${year}年${getMonthName(month)}の出来事`}
        >
          {monthData.events.map((event, index) => (
            <EventCard key={`${event.date}-${index}`} event={event} />
          ))}
        </div>
      ) : (
        <EmptyState variant="noMonthData" />
      )}
    </PageContainer>
  );
}
