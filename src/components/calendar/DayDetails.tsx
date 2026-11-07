'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Check, Clock, RotateCcw, SkipForward } from 'lucide-react';
import { habitIcon } from '@/components/habits/habit-icons';
import { ProgressBar } from '@/components/ui/Progress';
import { cn } from '@/lib/cn';
import { formatInstantTime, formatLongDate, formatTime, formatWeekday, timeToMinutes } from '@/lib/date';
import { colorOf } from '@/lib/habits/meta';
import type { DayItem, DaySummary } from '@/lib/habits/schedule';
import { actions } from '@/lib/store/app-store';
import { toast } from '@/lib/store/toast-store';
import type { DateKey, DayStatus } from '@/types';
import { DAY_STATE_META } from './MonthCalendar';

const STATUS: Record<DayStatus, { label: string; text: string }> = {
  completed: { label: 'Выполнено', text: 'text-success' },
  missed: { label: 'Пропущено', text: 'text-danger' },
  pending: { label: 'Ожидает', text: 'text-accent' },
  upcoming: { label: 'Запланировано', text: 'text-muted' },
};

export function DayDetails({
  date,
  items,
  summary,
  today,
  timeFormat,
  timeZone,
}: {
  date: DateKey;
  items: DayItem[];
  summary: DaySummary;
  today: DateKey;
  timeFormat: '24h' | '12h';
  timeZone: string;
}) {
  const isFuture = date > today;
  const sorted = [...items].sort(
    (a, b) => (a.habit.time ? timeToMinutes(a.habit.time) : 1440) - (b.habit.time ? timeToMinutes(b.habit.time) : 1440),
  );
  const denom = date === today ? summary.scheduled : summary.completed + summary.missed;
  const pct = denom ? Math.round((summary.completed / denom) * 100) : null;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={date}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.25 }}
        aria-live="polite"
      >
        <p className="text-[13px] font-medium text-subtle">{formatWeekday(date)}</p>
        <h2 className="mt-0.5 text-2xl font-semibold tracking-[-0.03em] text-fg">{formatLongDate(date)}</h2>
        <p className="mt-1 inline-flex items-center gap-1.5 text-[13px] text-muted">
          <span className={cn('h-2 w-2 rounded-full', DAY_STATE_META[summary.state].dot, summary.state === 'future' && 'border border-line')} />
          {DAY_STATE_META[summary.state].label}
        </p>

        <dl className="mt-5 grid grid-cols-4 gap-2">
          {[
            { k: 'План', v: summary.scheduled },
            { k: 'Готово', v: summary.completed, c: 'var(--success)' },
            { k: 'Пропуск', v: summary.missed, c: summary.missed ? 'var(--danger)' : undefined },
            { k: 'Процент', v: pct === null ? '—' : `${pct}%` },
          ].map((s) => (
            <div key={s.k} className="rounded-2xl bg-fill px-2 py-2.5 text-center">
              <dt className="text-[10.5px] font-medium tracking-wide text-subtle uppercase">{s.k}</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums" style={{ color: s.c ?? 'var(--fg)' }}>
                {s.v}
              </dd>
            </div>
          ))}
        </dl>
        {summary.scheduled > 0 && (
          <ProgressBar
            className="mt-3"
            value={summary.completed / summary.scheduled}
            color={summary.state === 'full' ? 'var(--success)' : 'var(--accent)'}
            label="Выполнение за день"
          />
        )}

        <h3 className="mt-6 mb-2.5 text-[12px] font-semibold tracking-[0.08em] text-subtle uppercase">Привычки дня</h3>
        {sorted.length === 0 ? (
          <p className="rounded-2xl bg-fill px-4 py-6 text-center text-sm text-muted">
            {isFuture ? 'На этот день ничего не запланировано' : 'В этот день привычки не были запланированы'}
          </p>
        ) : (
          <ul className="space-y-2">
            {sorted.map((it) => {
              const Icon = habitIcon(it.habit.icon);
              const color = colorOf(it.habit.color);
              const st = STATUS[it.status];
              const canToggle = !isFuture;
              return (
                <li key={it.habit.id} className="flex items-center gap-3 rounded-2xl bg-fill p-2.5 pr-2">
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
                    style={{ background: `color-mix(in oklab, ${color} 16%, transparent)`, color }}
                  >
                    <Icon size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-fg">{it.habit.name}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11.5px] text-subtle">
                      <span className="inline-flex items-center gap-1">
                        <Clock size={11} /> {it.habit.time ? formatTime(it.habit.time, timeFormat) : 'Любое время'}
                      </span>
                      <span className={cn('font-medium', st.text)}>
                        {it.status === 'completed' && it.entry?.completedAt
                          ? `${st.label} в ${formatInstantTime(it.entry.completedAt, timeZone, timeFormat)}`
                          : st.label}
                      </span>
                      {it.habit.targetPerDay > 1 && it.status !== 'completed' && (it.entry?.count ?? 0) > 0 && (
                        <span>
                          {it.entry?.count}/{it.habit.targetPerDay}
                        </span>
                      )}
                    </p>
                  </div>
                  {canToggle && (
                    <div className="flex items-center">
                      {it.status !== 'completed' && !it.flexible && it.entry?.status !== 'missed' && date === today && (
                        <button
                          type="button"
                          aria-label={`Пропустить: ${it.habit.name}`}
                          title="Пропустить"
                          onClick={() => actions.skipHabit(it.habit.id, date)}
                          className="grid h-9 w-9 place-items-center rounded-xl text-subtle hover:bg-fill-strong hover:text-fg"
                        >
                          <SkipForward size={15} />
                        </button>
                      )}
                      {it.entry?.status === 'missed' && (
                        <button
                          type="button"
                          aria-label={`Сбросить отметку: ${it.habit.name}`}
                          title="Сбросить отметку"
                          onClick={() => actions.clearEntry(it.habit.id, date)}
                          className="grid h-9 w-9 place-items-center rounded-xl text-subtle hover:bg-fill-strong hover:text-fg"
                        >
                          <RotateCcw size={15} />
                        </button>
                      )}
                      <button
                        type="button"
                        aria-pressed={it.status === 'completed'}
                        aria-label={it.status === 'completed' ? `Снять отметку: ${it.habit.name}` : `Отметить выполненной: ${it.habit.name}`}
                        onClick={() => {
                          const r = actions.toggleHabit(it.habit.id, date);
                          if (date !== today && r) {
                            toast({
                              tone: 'info',
                              title: r === 'completed' ? 'Отметка добавлена задним числом' : 'Отметка снята',
                              description: `${it.habit.name} · ${formatLongDate(date)}`,
                            });
                          }
                        }}
                        className={cn(
                          'grid h-9 w-9 place-items-center rounded-xl border transition-all duration-200 active:scale-90',
                          it.status === 'completed' ? 'border-transparent text-white' : 'border-line text-subtle hover:border-fill-strong hover:text-fg',
                        )}
                        style={it.status === 'completed' ? { background: color } : undefined}
                      >
                        <Check size={16} strokeWidth={2.5} />
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {!isFuture && sorted.length > 0 && date !== today && (
          <p className="mt-3 text-[11.5px] leading-relaxed text-subtle">
            Можно исправить случайную отметку или отметить выполнение задним числом.
          </p>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
