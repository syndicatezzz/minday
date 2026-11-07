'use client';

import { motion } from 'framer-motion';
import { Flame, Quote, Trophy } from 'lucide-react';
import Link from 'next/link';
import { MiniRing } from '@/components/ui/Progress';
import { cn } from '@/lib/cn';
import { WEEKDAY_SHORT, formatShortDate, parseKey, plural, weekdayOf } from '@/lib/date';
import type { DaySummary } from '@/lib/habits/schedule';
import { EASE_OUT, fadeUp } from '@/lib/motion';
import type { DateKey } from '@/types';

export function StreakCard({ current, best }: { current: number; best: number }) {
  return (
    <motion.section variants={fadeUp} aria-label="Серии" className="glass relative overflow-hidden rounded-[28px] p-5 sm:p-6">
      <div aria-hidden className="pointer-events-none absolute -top-16 -right-10 h-40 w-40 rounded-full bg-warning/15 blur-3xl" />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[12px] font-medium tracking-wide text-subtle uppercase">Текущая серия</p>
          <p className="mt-2 flex items-baseline gap-2">
            <span className="text-[44px] leading-none font-semibold tracking-[-0.05em] text-fg tabular-nums">{current}</span>
            <span className="text-sm text-muted">{plural(current, ['день', 'дня', 'дней'])}</span>
          </p>
        </div>
        <motion.span
          className="grid h-11 w-11 place-items-center rounded-2xl bg-warning/12 text-warning"
          animate={current > 0 ? { scale: [1, 1.08, 1] } : undefined}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Flame size={20} />
        </motion.span>
      </div>
      <div className="relative mt-5 flex items-center gap-2 rounded-2xl bg-fill px-3.5 py-2.5 text-sm">
        <Trophy size={15} className="text-accent" />
        <span className="text-muted">Лучшая серия</span>
        <span className="ml-auto font-semibold text-fg tabular-nums">
          {best} {plural(best, ['день', 'дня', 'дней'])}
        </span>
      </div>
      <p className="relative mt-3 text-xs leading-relaxed text-subtle">Дни подряд, когда выполнены все запланированные привычки.</p>
    </motion.section>
  );
}

export function QuoteCard({ text, author }: { text: string; author?: string }) {
  return (
    <motion.figure variants={fadeUp} className="glass rounded-[28px] p-5 sm:p-6">
      <Quote size={18} className="text-accent/70" aria-hidden />
      <blockquote className="mt-3 text-[15px] leading-relaxed text-fg text-balance">{text}</blockquote>
      {author && <figcaption className="mt-2 text-xs text-subtle">— {author}</figcaption>}
    </motion.figure>
  );
}

const STATE_COLOR: Record<string, string> = {
  full: 'var(--success)',
  partial: 'var(--warning)',
  missed: 'var(--danger)',
  today: 'var(--accent)',
  empty: 'var(--fill-strong)',
  future: 'var(--fill-strong)',
};

export function WeekStrip({ days, today }: { days: DaySummary[]; today: DateKey }) {
  return (
    <motion.section variants={fadeUp} aria-label="Эта неделя" className="glass rounded-[28px] p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-fg">Эта неделя</h2>
        <Link href="/calendar" className="text-xs font-medium text-accent hover:underline">
          Календарь
        </Link>
      </div>
      <ol className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const isToday = d.date === today;
          const rate = d.state === 'future' || d.scheduled === 0 ? null : d.completed / d.scheduled;
          return (
            <li key={d.date}>
              <Link
                href={`/calendar?date=${d.date}`}
                aria-label={`${formatShortDate(d.date)}: ${d.scheduled ? `${d.completed} из ${d.scheduled}` : 'нет привычек'}`}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-2xl py-2 transition-colors hover:bg-fill',
                  isToday && 'bg-fill ring-1 ring-line',
                )}
              >
                <span className={cn('text-[10.5px] font-medium', isToday ? 'text-accent' : 'text-subtle')}>
                  {WEEKDAY_SHORT[weekdayOf(d.date)]}
                </span>
                <span className="relative grid place-items-center">
                  <MiniRing value={rate} size={32} stroke={3} color={STATE_COLOR[d.state]} />
                  <span className={cn('absolute text-[11px] font-semibold tabular-nums', d.state === 'future' ? 'text-subtle' : 'text-fg')}>
                    {parseKey(d.date).d}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </motion.section>
  );
}

export function SevenDayStats({ days }: { days: DaySummary[] }) {
  const counted = days.filter((d) => d.completed + d.missed > 0);
  const totalDone = days.reduce((s, d) => s + d.completed, 0);
  const totalDue = days.reduce((s, d) => s + d.completed + d.missed, 0);
  const avg = totalDue ? Math.round((totalDone / totalDue) * 100) : null;
  const perfect = days.filter((d) => d.state === 'full').length;
  const max = Math.max(1, ...days.map((d) => d.scheduled));
  return (
    <motion.section variants={fadeUp} aria-label="Последние 7 дней" className="glass rounded-[28px] p-5 sm:p-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-fg">Последние 7 дней</h2>
          <p className="mt-0.5 text-xs text-subtle">
            {counted.length ? `${perfect} ${plural(perfect, ['идеальный день', 'идеальных дня', 'идеальных дней'])}` : 'Пока нет завершённых дней'}
          </p>
        </div>
        <p className="text-2xl font-semibold tracking-[-0.03em] text-fg tabular-nums">{avg === null ? '—' : `${avg}%`}</p>
      </div>
      <div className="mt-5 flex h-24 items-end gap-2" role="list">
        {days.map((d, i) => {
          const h = d.scheduled ? (d.scheduled / max) * 100 : 6;
          const fill = d.scheduled ? (d.completed / d.scheduled) * 100 : 0;
          return (
            <div key={d.date} role="listitem" className="flex h-full flex-1 flex-col items-center gap-1.5" aria-label={`${formatShortDate(d.date)}: ${d.completed} из ${d.scheduled}`}>
              <div className="relative w-full flex-1">
                <div className="absolute inset-x-0 bottom-0 overflow-hidden rounded-lg bg-fill-strong" style={{ height: `${h}%` }}>
                  <motion.div
                    className="absolute inset-x-0 bottom-0 rounded-lg"
                    style={{ background: 'linear-gradient(180deg, var(--accent-2), var(--accent))' }}
                    initial={{ height: 0 }}
                    animate={{ height: `${fill}%` }}
                    transition={{ duration: 0.8, delay: i * 0.05, ease: EASE_OUT }}
                  />
                </div>
              </div>
              <span className="text-[10px] text-subtle">{WEEKDAY_SHORT[weekdayOf(d.date)]}</span>
            </div>
          );
        })}
      </div>
    </motion.section>
  );
}
