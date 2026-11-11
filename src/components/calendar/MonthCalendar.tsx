'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, type KeyboardEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import {
  WEEKDAY_SHORT,
  addDays,
  diffDays,
  endOfMonth,
  formatLongDate,
  formatMonthYear,
  orderedWeekdays,
  parseKey,
  startOfMonth,
  startOfWeek,
} from '@/lib/date';
import type { DayState, DaySummary } from '@/lib/habits/schedule';
import type { DateKey } from '@/types';
import { springSnappy } from '@/lib/motion';

export const DAY_STATE_META: Record<DayState, { label: string; bg: string; fg: string; dot: string }> = {
  full: { label: 'Всё выполнено', bg: 'bg-success/16', fg: 'text-fg', dot: 'bg-success' },
  partial: { label: 'Выполнена часть', bg: 'bg-warning/14', fg: 'text-fg', dot: 'bg-warning' },
  missed: { label: 'Есть пропуски', bg: 'bg-danger/14', fg: 'text-fg', dot: 'bg-danger' },
  today: { label: 'Сегодня, в процессе', bg: 'bg-accent/12', fg: 'text-fg', dot: 'bg-accent' },
  empty: { label: 'Нет запланированных', bg: 'bg-transparent', fg: 'text-subtle', dot: 'bg-fill-strong' },
  future: { label: 'Ещё не наступил', bg: 'bg-transparent', fg: 'text-subtle', dot: 'bg-transparent' },
};

interface MonthCalendarProps {
  month: DateKey;
  direction: number;
  onMonthChange: (month: DateKey, direction: number) => void;
  selected: DateKey;
  onSelect: (date: DateKey) => void;
  today: DateKey;
  weekStartsOn: 0 | 1;
  summaries: Record<DateKey, DaySummary>;
}

export function monthGridRange(month: DateKey, weekStartsOn: 0 | 1) {
  const start = startOfWeek(startOfMonth(month), weekStartsOn);
  const end = addDays(startOfWeek(endOfMonth(month), weekStartsOn), 6);
  return { start, end };
}

export function MonthCalendar({ month, direction, onMonthChange, selected, onSelect, today, weekStartsOn, summaries }: MonthCalendarProps) {
  const { start, end } = monthGridRange(month, weekStartsOn);
  const days = useMemo(() => {
    const n = diffDays(end, start) + 1;
    return Array.from({ length: n }, (_, i) => addDays(start, i));
  }, [start, end]);
  const monthNum = parseKey(month).m;

  const shift = (n: number) => {
    const { y, m } = parseKey(month);
    const total = y * 12 + (m - 1) + n;
    const next = `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}-01`;
    onMonthChange(next, n);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (!(e.key in moves)) return;
    e.preventDefault();
    const next = addDays(selected, moves[e.key]);
    onSelect(next);
    if (startOfMonth(next) !== month) onMonthChange(startOfMonth(next), next > selected ? 1 : -1);
    window.requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-day="${next}"]`)?.focus());
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-2">
        <AnimatePresence mode="wait" initial={false}>
          <motion.h2
            key={month}
            initial={{ opacity: 0, y: direction > 0 ? 8 : -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: direction > 0 ? -8 : 8 }}
            transition={{ duration: 0.2 }}
            className="text-lg font-semibold tracking-[-0.02em] whitespace-nowrap text-fg sm:text-2xl"
            aria-live="polite"
          >
            {formatMonthYear(month).replace(' г.', '')}
          </motion.h2>
        </AnimatePresence>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onSelect(today);
              if (startOfMonth(today) !== month) onMonthChange(startOfMonth(today), today > month ? 1 : -1);
            }}
          >
            Сегодня
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Предыдущий месяц" onClick={() => shift(-1)}>
            <ChevronLeft size={18} />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Следующий месяц" onClick={() => shift(1)}>
            <ChevronRight size={18} />
          </Button>
        </div>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1 text-center sm:gap-1.5" aria-hidden>
        {orderedWeekdays(weekStartsOn).map((d) => (
          <span key={d} className="text-[11px] font-medium tracking-wide text-subtle uppercase">
            {WEEKDAY_SHORT[d]}
          </span>
        ))}
      </div>

      <div className="relative -m-1 overflow-hidden p-1">
        <AnimatePresence mode="popLayout" initial={false} custom={direction}>
          <motion.div
            key={month}
            custom={direction}
            initial={{ opacity: 0, x: direction * 48 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -48 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            role="grid"
            aria-label={`Календарь: ${formatMonthYear(month).replace(' г.', '')}`}
            onKeyDown={onKeyDown}
            className="grid grid-cols-7 gap-1 sm:gap-1.5"
          >
            {days.map((d) => {
              const s = summaries[d];
              const inMonth = parseKey(d).m === monthNum;
              const meta = DAY_STATE_META[s?.state ?? 'empty'];
              const isToday = d === today;
              const isSelected = d === selected;
              return (
                <button
                  key={d}
                  type="button"
                  role="gridcell"
                  data-day={d}
                  tabIndex={isSelected ? 0 : -1}
                  aria-selected={isSelected}
                  aria-current={isToday ? 'date' : undefined}
                  aria-label={`${formatLongDate(d)}. ${meta.label}${s && s.scheduled ? `, ${s.completed} из ${s.scheduled}` : ''}`}
                  onClick={() => onSelect(d)}
                  className={cn(
                    'group relative flex h-11 min-w-0 flex-col items-center justify-center rounded-xl text-sm sm:h-auto sm:aspect-[1.15] sm:rounded-2xl',
                    'transition-[background-color,opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95',
                    meta.bg,
                    inMonth ? '' : 'opacity-35',
                    !isSelected && 'hover:ring-1 hover:ring-line',
                  )}
                >
                  {isSelected && (
                    <motion.span
                      layoutId="calendar-selected"
                      className="absolute inset-0 rounded-xl ring-2 ring-fg/70 shadow-[0_8px_24px_-10px_var(--ring)] sm:rounded-2xl"
                      transition={springSnappy}
                      aria-hidden
                    />
                  )}
                  <span
                    className={cn(
                      'relative grid h-7 w-7 place-items-center rounded-full font-medium tabular-nums transition-colors duration-500',
                      isToday ? 'bg-accent text-accent-fg' : meta.fg,
                    )}
                  >
                    {parseKey(d).d}
                  </span>
                  {s && s.state !== 'future' && s.scheduled > 0 && (
                    <span className="mt-0.5 hidden text-[10px] text-muted tabular-nums sm:block">
                      {s.completed}/{s.scheduled}
                    </span>
                  )}
                  {s && s.state !== 'future' && s.state !== 'empty' && (
                    <span className={cn('absolute bottom-1.5 h-1 w-1 rounded-full sm:hidden', meta.dot)} aria-hidden />
                  )}
                </button>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export function CalendarLegend() {
  const items: DayState[] = ['full', 'partial', 'missed', 'today', 'empty', 'future'];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2 text-[12px] text-muted">
      {items.map((s) => (
        <li key={s} className="inline-flex items-center gap-1.5">
          <span
            className={cn(
              'h-3 w-3 rounded-[5px]',
              s === 'future' ? 'border border-dashed border-line' : s === 'empty' ? 'border border-line bg-fill' : DAY_STATE_META[s].dot,
            )}
          />
          {DAY_STATE_META[s].label}
        </li>
      ))}
    </ul>
  );
}
