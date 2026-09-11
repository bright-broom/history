/**
 * パンくずナビゲーションコンポーネント
 * @module components/features/navigation/Breadcrumbs
 */

'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Home, ChevronRight, Calendar, Clock, ChevronDown } from 'lucide-react';
import type { Year, Month } from '@/domain/types';
import { t, getMonthName } from '@/config/i18n';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

/** パンくずナビゲーションのプロパティ */
export interface BreadcrumbsProps {
  /** 現在の年（任意） */
  readonly currentYear?: Year;
  /** 現在の月（任意） */
  readonly currentMonth?: Month;
  /** 利用可能な年のリスト（任意：ドロップダウン用） */
  readonly availableYears?: readonly Year[];
  /** 利用可能な月のリスト（任意：ドロップダウン用） */
  readonly availableMonths?: readonly Month[];
  /** 追加のクラス名 */
  readonly className?: string;
}

/** パンくずアイテムのラッパー */
function BreadcrumbItemWrapper({
  children,
  isLast = false,
}: {
  children: React.ReactNode;
  isLast?: boolean;
}) {
  return (
    <li className="flex items-center gap-1">
      {children}
      {!isLast && (
        <ChevronRight
          className="size-4 text-muted-foreground/50 flex-shrink-0"
          aria-hidden="true"
        />
      )}
    </li>
  );
}

/** ホームリンク */
function HomeLink({ isActive }: { isActive: boolean }) {
  if (isActive) {
    return (
      <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-medium">
        <Home className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">{t.nav.home}</span>
      </span>
    );
  }

  return (
    <Link
      href="/"
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary hover:bg-secondary/80 text-secondary-foreground text-sm font-medium transition-colors"
      aria-label="ホームへ戻る"
    >
      <Home className="size-4" aria-hidden="true" />
      <span className="hidden sm:inline">{t.nav.home}</span>
    </Link>
  );
}

/** 年セレクター */
function YearSelector({
  currentYear,
  availableYears,
  isActive,
}: {
  currentYear: Year;
  availableYears?: readonly Year[];
  isActive: boolean;
}) {
  const router = useRouter();
  const hasDropdown = availableYears && availableYears.length > 1;

  const handleYearSelect = useCallback(
    (year: Year) => {
      router.push(`/${year}`);
    },
    [router]
  );

  const baseClasses = cn(
    'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all',
    isActive
      ? 'bg-primary text-primary-foreground'
      : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'
  );

  // ドロップダウンなしの場合
  if (!hasDropdown) {
    if (isActive) {
      return (
        <span className={baseClasses}>
          <Calendar className="size-4" aria-hidden="true" />
          {t.nav.year(currentYear)}
        </span>
      );
    }
    return (
      <Link
        href={`/${currentYear}`}
        className={baseClasses}
        aria-label={t.a11y.navigateToYear(currentYear)}
      >
        <Calendar className="size-4" aria-hidden="true" />
        {t.nav.year(currentYear)}
      </Link>
    );
  }

  // ドロップダウンありの場合
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(baseClasses, 'h-auto cursor-pointer')}
        >
          <Calendar className="size-4" aria-hidden="true" />
          {t.nav.year(currentYear)}
          <ChevronDown className="size-3 ml-1 opacity-60" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          年を選択
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {availableYears.map((year) => (
          <DropdownMenuItem
            key={year}
            onClick={() => handleYearSelect(year)}
            className={cn(
              'cursor-pointer',
              year === currentYear && 'bg-accent font-medium'
            )}
          >
            {t.nav.year(year)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** 月セレクター */
function MonthSelector({
  currentYear,
  currentMonth,
  availableMonths,
}: {
  currentYear: Year;
  currentMonth: Month;
  availableMonths?: readonly Month[];
}) {
  const router = useRouter();
  const hasDropdown = availableMonths && availableMonths.length > 1;

  const handleMonthSelect = useCallback(
    (month: Month) => {
      router.push(`/${currentYear}/${month}`);
    },
    [router, currentYear]
  );

  const baseClasses =
    'flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-medium';

  // ドロップダウンなしの場合
  if (!hasDropdown) {
    return (
      <span className={baseClasses}>
        <Clock className="size-4" aria-hidden="true" />
        {getMonthName(currentMonth)}
      </span>
    );
  }

  // ドロップダウンありの場合
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(baseClasses, 'h-auto cursor-pointer transition-all')}
        >
          <Clock className="size-4" aria-hidden="true" />
          {getMonthName(currentMonth)}
          <ChevronDown className="size-3 ml-1 opacity-60" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          月を選択
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="grid grid-cols-3 gap-1 p-1">
          {availableMonths.map((month) => (
            <DropdownMenuItem
              key={month}
              onClick={() => handleMonthSelect(month)}
              className={cn(
                'cursor-pointer justify-center text-center',
                month === currentMonth && 'bg-accent font-medium'
              )}
            >
              {getMonthName(month)}
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * パンくずナビゲーション
 * 階層構造を明確に表示し、ドロップダウンで素早くナビゲート可能
 */
export function Breadcrumbs({
  currentYear,
  currentMonth,
  availableYears,
  availableMonths,
  className = 'mb-8',
}: BreadcrumbsProps) {
  const isHome = !currentYear;
  const isYearPage = currentYear && !currentMonth;
  const isMonthPage = currentYear && currentMonth;

  return (
    <nav
      aria-label="パンくずナビゲーション"
      className={cn('flex items-center', className)}
    >
      <ol className="flex items-center gap-1 flex-wrap">
        {/* ホーム */}
        <BreadcrumbItemWrapper isLast={isHome}>
          <HomeLink isActive={isHome} />
        </BreadcrumbItemWrapper>

        {/* 年 */}
        {currentYear && (
          <BreadcrumbItemWrapper isLast={isYearPage}>
            <YearSelector
              currentYear={currentYear}
              availableYears={availableYears}
              isActive={isYearPage ?? false}
            />
          </BreadcrumbItemWrapper>
        )}

        {/* 月 */}
        {isMonthPage && (
          <BreadcrumbItemWrapper isLast>
            <MonthSelector
              currentYear={currentYear}
              currentMonth={currentMonth}
              availableMonths={availableMonths}
            />
          </BreadcrumbItemWrapper>
        )}
      </ol>
    </nav>
  );
}

export default Breadcrumbs;
