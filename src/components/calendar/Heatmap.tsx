'use client';

import { motion } from 'framer-motion';
import { useEffect, useMemo, useRef, type CSSProperties } from 'react';
import { cn } from '@/lib/cn';
import { WEEKDAY_SHORT, addDays, formatKey, formatLongDate, orderedWeekdays, parseKey, startOfWeek } from '@/lib/date';
import type { DaySummary } from '@/lib/habits/schedule';
import type { DateKey } from '@/types';

function cellStyle(s: DaySummary | undefined): { cls: string; style?: CSSProperties } {
  if (!s || s.state === 'future') return { cls: 'bg-transparent border border-dashed border-line' };
  if (s.scheduled === 0) return { cls: 'bg-fill' };
  const denom = s.state === 'today' ? s.scheduled : s.completed + s.missed;
  const rate = denom ? s.completed / denom : 0;
  if (rate === 0) return { cls: s.state === 'today' ? 'bg-fill-strong' : 'bg-danger/30' };
  if (rate >= 1) return { cls: 'bg-success' };
  return { cls: '', style: { background: `color-mix(in oklab, var(--accent) ${Math.round(25 + rate * 60)}%, transparent)` } };
}

export function Heatmap({
  summaries,
  weeks,
  today,
  weekStartsOn,
  selected,
  onSelect,
}: {
  summaries: Record<DateKey, DaySummary>;
  weeks: number;
  today: DateKey;
  weekStartsOn: 0 | 1;
  selected?: DateKey;
  onSelect?: (d: DateKey) => void;
}) {
  const columns = useMemo(() => {
    const lastWeek = startOfWeek(today, weekStartsOn);
    return Array.from({ length: weeks }, (_, i) => {
      const ws = addDays(lastWeek, -(weeks - 1 - i) * 7);
      return Array.from({ length: 7 }, (_, j) => addDays(ws, j));
    });
  }, [today, weeks, weekStartsOn]);
  const wds = orderedWeekdays(weekStartsOn);
  const scrollRef = useRef<HTMLDivElement>(null);

  // На узких экранах показываем самые свежие недели
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [weeks, today]);

  return (
    <div ref={scrollRef} className="scrollbar-none overflow-x-auto">
      <div className="inline-flex min-w-full gap-2">
        <div className="flex flex-col gap-[3px] pt-5 text-[9.5px] text-subtle" aria-hidden>
          {wds.map((d, i) => (
            <span key={d} className="flex h-[13px] items-center sm:h-[15px]">
              {i % 2 === 0 ? WEEKDAY_SHORT[d] : ''}
            </span>
          ))}
        </div>
        <div className="flex gap-[3px]" role="grid" aria-label="Карта активности">
          {columns.map((col, ci) => {
            const first = col[0];
            const showMonth = ci === 0 || parseKey(first).m !== parseKey(columns[ci - 1][0]).m;
            return (
              <div key={first} className="flex flex-col gap-[3px]" role="row">
                <span className="h-4 text-[9.5px] whitespace-nowrap text-subtle" aria-hidden>
                  {showMonth ? formatKey(first, { month: 'short' }).replace('.', '') : ''}
                </span>
                {col.map((d, di) => {
                  const s = summaries[d];
                  const { cls, style } = cellStyle(s);
                  return (
                    <motion.button
                      key={d}
                      type="button"
                      role="gridcell"
                      initial={{ opacity: 0, scale: 0.4 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: Math.min(0.6, ci * 0.012 + di * 0.01), duration: 0.25 }}
                      onClick={() => onSelect?.(d)}
                      title={`${formatLongDate(d)}${s && s.scheduled ? ` — ${s.completed} из ${s.scheduled}` : ''}`}
                      aria-label={`${formatLongDate(d)}${s && s.scheduled ? `: ${s.completed} из ${s.scheduled}` : ': нет привычек'}`}
                      className={cn(
                        'h-[13px] w-[13px] rounded-[4px] transition-transform hover:scale-125 sm:h-[15px] sm:w-[15px]',
                        cls,
                        selected === d && 'ring-2 ring-fg/80 ring-offset-1 ring-offset-transparent',
                      )}
                      style={style}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[10.5px] text-subtle" aria-hidden>
        <span>Меньше</span>
        <span className="h-3 w-3 rounded-[4px] bg-danger/30" />
        <span className="h-3 w-3 rounded-[4px]" style={{ background: 'color-mix(in oklab, var(--accent) 35%, transparent)' }} />
        <span className="h-3 w-3 rounded-[4px]" style={{ background: 'color-mix(in oklab, var(--accent) 70%, transparent)' }} />
        <span className="h-3 w-3 rounded-[4px] bg-success" />
        <span>Больше</span>
      </div>
    </div>
  );
}
