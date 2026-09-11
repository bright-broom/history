'use client';

/**
 * 歴史イベントカードコンポーネント
 * @module components/features/history/EventCard
 */

import { memo, useId } from 'react';
import type { HistoryEvent } from '@/domain/types';
import { t, formatDate } from '@/config/i18n';
import { cn } from '@/lib/utils';

/** イベントカードのプロパティ */
export interface EventCardProps {
  /** 表示するイベント */
  readonly event: HistoryEvent;
  /** 追加のクラス名 */
  readonly className?: string;
  /** コンパクト表示 */
  readonly compact?: boolean;
}

/**
 * 関連国・地域セクション
 */
function RelatedCountriesSection({
  countries,
}: {
  readonly countries: readonly string[];
}) {
  if (countries.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {countries.map((country, index) => (
        <span
          key={`${country}-${index}`}
          className="text-sm text-muted-foreground"
        >
          {country}
        </span>
      ))}
    </div>
  );
}

/**
 * 参考文献セクション
 */
function SourcesSection({
  sources,
}: {
  readonly sources?: readonly string[];
}) {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-widest text-muted-foreground/60">
        {t.event.sources}
      </p>
      <ul className="text-sm text-muted-foreground space-y-0.5">
        {sources.map((source, index) => (
          <li key={`source-${index}`}>
            {source}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * 歴史イベントカード
 * エディトリアルデザイン - タイポグラフィとコンテンツ中心
 */
function EventCardComponent({
  event,
  className,
  compact = false,
}: EventCardProps) {
  const titleId = useId();
  const formattedDate = formatDate(event.date);

  return (
    <article
      className={cn(
        'relative',
        'py-8 first:pt-0',
        'border-b border-border last:border-b-0',
        className
      )}
      role="article"
      aria-labelledby={titleId}
    >
      {/* メタ情報 */}
      <div className="flex items-center gap-4 mb-4 text-sm">
        <time
          dateTime={event.date}
          className="text-muted-foreground tabular-nums"
        >
          {formattedDate}
        </time>
        <span className="text-muted-foreground/30">|</span>
        <span className="text-muted-foreground">
          {event.category}
        </span>
      </div>

      {/* タイトル */}
      <h3
        id={titleId}
        className="text-xl md:text-2xl font-semibold text-foreground leading-snug mb-4"
      >
        {event.title}
      </h3>

      {/* 説明文 */}
      <p className={cn(
        'text-muted-foreground leading-relaxed max-w-prose',
        compact && 'line-clamp-3'
      )}>
        {event.description}
      </p>

      {/* 詳細情報 */}
      {!compact && (event.relatedCountries.length > 0 || event.sources?.length) && (
        <div className="mt-6 pt-6 border-t border-border/50 space-y-4">
          {event.relatedCountries.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-widest text-muted-foreground/60">
                {t.event.relatedCountries}
              </p>
              <RelatedCountriesSection countries={event.relatedCountries} />
            </div>
          )}
          <SourcesSection sources={event.sources} />
        </div>
      )}
    </article>
  );
}

/** メモ化されたイベントカード */
export const EventCard = memo(EventCardComponent);

export default EventCard;
