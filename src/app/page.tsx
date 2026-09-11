/**
 * ホームページ（年一覧）
 * @module app/page
 */

import { t } from '@/config/i18n';
import { getCatalog } from '@/server/history';
import {
  PageContainer,
  PageHeader,
  Breadcrumbs,
  YearCard,
  EmptyState,
} from '@/components/features';

/**
 * ホームページコンポーネント
 * 利用可能な年の一覧を表示
 */
export default async function HomePage() {
  const { years: yearStatistics, totalEvents } = await getCatalog();
  const years = yearStatistics.map(({ year }) => year);
  const hasData = years.length > 0;

  return (
    <PageContainer>
      <Breadcrumbs availableYears={years} />

      <PageHeader
        title={t.page.homeTitle}
        badge={totalEvents > 0 ? t.stats.totalEvents(totalEvents) : undefined}
        description={t.page.homeDescription}
      />

      {hasData ? (
        <div
          className="divide-y divide-border"
          role="list"
          aria-label="年一覧"
        >
          {yearStatistics.map(({ year, totalEvents }) => (
            <div key={year} role="listitem">
              <YearCard year={year} eventCount={totalEvents} />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState variant="noData" />
      )}
    </PageContainer>
  );
}
