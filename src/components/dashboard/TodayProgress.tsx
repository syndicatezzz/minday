'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { CircularProgress } from '@/components/ui/Progress';
import { plural } from '@/lib/date';
import { fadeUp } from '@/lib/motion';
import type { DaySummary } from '@/lib/habits/schedule';

function Stat({ label, value, tone, suffix }: { label: string; value: number; tone?: string; suffix?: string }) {
  return (
    <div className="rounded-2xl bg-fill px-4 py-3">
      <p className="text-[11px] font-medium tracking-wide text-subtle uppercase">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-[-0.03em] tabular-nums" style={{ color: tone }}>
        <AnimatedNumber value={value} />
        {suffix}
      </p>
    </div>
  );
}

export function TodayProgress({ summary }: { summary: DaySummary }) {
  const { scheduled, completed } = summary;
  const remaining = scheduled - completed;
  const pct = scheduled ? Math.round((completed / scheduled) * 100) : 0;
  const allDone = scheduled > 0 && completed === scheduled;

  return (
    <motion.section
      variants={fadeUp}
      aria-label="Прогресс дня"
      className="glass glass-hover spotlight relative overflow-hidden rounded-[28px] p-5 sm:p-7"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-24 h-72 w-72 rounded-full bg-accent/20 blur-3xl transition-opacity duration-700"
        style={{ opacity: allDone ? 1 : 0.55 }}
      />
      <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
        <CircularProgress
          value={scheduled ? completed / scheduled : 0}
          size={176}
          stroke={13}
          label="Выполнение за день"
          color={allDone ? 'var(--success)' : 'var(--accent)'}
          secondaryColor={allDone ? 'color-mix(in oklab, var(--success) 60%, white)' : 'var(--accent-2)'}
        >
          <div className="text-center">
            <p className="text-[44px] leading-none font-semibold tracking-[-0.05em] text-fg tabular-nums">
              <AnimatedNumber value={pct} />
              <span className="text-xl text-subtle">%</span>
            </p>
            <p className="mt-1.5 text-xs text-subtle">за сегодня</p>
          </div>
        </CircularProgress>

        <div className="w-full min-w-0 flex-1">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={allDone ? 'done' : `${completed}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="text-center text-lg font-semibold tracking-[-0.02em] text-fg sm:text-left sm:text-xl"
            >
              {scheduled === 0
                ? 'На сегодня ничего не запланировано'
                : allDone
                  ? 'День закрыт. Отличная работа'
                  : `Сегодня выполнено ${completed} из ${scheduled} ${plural(scheduled, ['привычки', 'привычек', 'привычек'])}`}
            </motion.p>
          </AnimatePresence>
          <p className="mt-1 text-center text-sm text-muted sm:text-left">
            {scheduled === 0
              ? 'Отдохните или добавьте новую привычку'
              : allDone
                ? 'Все запланированные привычки отмечены'
                : `Осталось ${remaining} ${plural(remaining, ['привычка', 'привычки', 'привычек'])} — вы справитесь`}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <Stat label="Всего" value={scheduled} />
            <Stat label="Готово" value={completed} tone="var(--success)" />
            <Stat label="Осталось" value={remaining} />
            <Stat label="Процент" value={pct} suffix="%" tone="var(--accent)" />
          </div>
        </div>
      </div>
    </motion.section>
  );
}
