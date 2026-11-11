'use client';

import { motion } from 'framer-motion';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Clock, Lightbulb } from 'lucide-react';
import { useMemo, useState } from 'react';
import { RateBars } from '@/components/analytics/Charts';
import { habitIcon } from '@/components/habits/habit-icons';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { CardHeader, GlassCard } from '@/components/ui/GlassCard';
import { cn } from '@/lib/cn';
import { WEEKDAY_SHORT, addDays, capitalize, formatKey, orderedWeekdays, plural, startOfMonth } from '@/lib/date';
import { dailySeries, habitRate } from '@/lib/habits/analytics';
import { BLOCK_LABEL, blockRates, completionHours, missFrequency, weekComparison, weekdayRates } from '@/lib/habits/insights';
import { colorOf } from '@/lib/habits/meta';
import { EASE_OUT, stagger } from '@/lib/motion';
import { useApp } from '@/lib/store/app-store';
import { useToday } from '@/lib/store/clock';
import type { Weekday } from '@/types';

const ON_WEEKDAY: Record<Weekday, string> = { 0: 'в воскресенье', 1: 'в понедельник', 2: 'во вторник', 3: 'в среду', 4: 'в четверг', 5: 'в пятницу', 6: 'в субботу' };
const pct = (r: number | null) => (r === null ? '—' : `${Math.round(r * 100)}%`);

function Bar({ value, active, label, sub, onHover }: { value: number | null; active?: boolean; label: string; sub: string; onHover?: (on: boolean) => void }) {
  return (
    <div className="group flex h-full flex-1 flex-col items-center gap-1.5" onMouseEnter={() => onHover?.(true)} onMouseLeave={() => onHover?.(false)} title={sub}>
      <span className={cn('text-[10.5px] tabular-nums transition-opacity', active ? 'text-fg opacity-100' : 'text-subtle opacity-0 group-hover:opacity-100')}>{pct(value)}</span>
      <div className="relative w-full flex-1">
        <motion.div
          className={cn('absolute inset-x-0 bottom-0 origin-bottom rounded-lg transition-[filter]', active ? '' : 'group-hover:brightness-110')}
          style={{ height: `${Math.max(3, (value ?? 0) * 100)}%`, background: active ? 'var(--accent)' : 'color-mix(in oklab, var(--accent) 38%, transparent)' }}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.7, ease: EASE_OUT }}
        />
      </div>
      <span className={cn('text-[11px]', active ? 'font-semibold text-accent' : 'text-subtle')}>{label}</span>
    </div>
  );
}

export function Insights() {
  const habitsMap = useApp((s) => s.data.habits);
  const entries = useApp((s) => s.data.entries);
  const ws = useApp((s) => s.data.settings.weekStartsOn);
  const { today, timeZone } = useToday();
  const habits = useMemo(() => Object.values(habitsMap), [habitsMap]);
  const from90 = addDays(today, -89);
  const from30 = addDays(today, -29);
  const [hoverHour, setHoverHour] = useState<number | null>(null);

  const weekdays = useMemo(() => {
    const rates = weekdayRates(habits, entries, from90, today, today, ws);
    return orderedWeekdays(ws).map((w) => rates.find((r) => r.weekday === w) ?? { weekday: w, done: 0, due: 0, rate: null });
  }, [habits, entries, from90, today, ws]);
  const blocks = useMemo(() => blockRates(habits, entries, from90, today, today, ws), [habits, entries, from90, today, ws]);
  const hours = useMemo(() => completionHours(entries, from90, today, timeZone), [entries, from90, today, timeZone]);
  const cmp = useMemo(() => weekComparison(habits, entries, today, ws), [habits, entries, today, ws]);
  const misses = useMemo(() => missFrequency(habits.filter((h) => !h.archivedOn), entries, from30, today, today, ws).filter((m) => m.missed > 0), [habits, entries, from30, today, ws]);
  const stable = useMemo(
    () =>
      habits
        .filter((h) => !h.archivedOn)
        .map((h) => ({ h, r: habitRate(h, entries, from30, today, today, ws) }))
        .filter((x) => x.r.scheduled >= 5)
        .sort((a, b) => (b.r.rate ?? 0) - (a.r.rate ?? 0))
        .slice(0, 3),
    [habits, entries, from30, today, ws],
  );
  const months = useMemo(() => {
    const start = startOfMonth(addDays(today, -175));
    const days = dailySeries(habits, entries, start, today, today, ws);
    const map = new Map<string, { completed: number; missed: number; scheduled: number }>();
    for (const d of days) {
      const k = d.date.slice(0, 7);
      const a = map.get(k) ?? { completed: 0, missed: 0, scheduled: 0 };
      a.completed += d.completed;
      a.missed += d.missed;
      a.scheduled += d.scheduled;
      map.set(k, a);
    }
    return [...map.entries()].map(([k, a]) => ({
      key: k,
      label: capitalize(formatKey(`${k}-01`, { month: 'short' }).replace('.', '')),
      fullLabel: capitalize(formatKey(`${k}-01`, { month: 'long', year: 'numeric' })),
      rate: a.completed + a.missed ? Math.round((a.completed / (a.completed + a.missed)) * 100) : null,
      completed: a.completed,
      scheduled: a.scheduled,
      missed: a.missed,
    }));
  }, [habits, entries, today, ws]);

  // Наблюдения — только факты из данных, без интерпретаций
  const observations: string[] = [];
  const rankedDays = weekdays.filter((w) => w.due >= 4 && w.rate !== null).sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0));
  if (rankedDays.length >= 2) {
    const best = rankedDays[0];
    const worst = rankedDays[rankedDays.length - 1];
    observations.push(`Чаще всего привычки выполняются ${ON_WEEKDAY[best.weekday]} — ${pct(best.rate)}; реже всего — ${ON_WEEKDAY[worst.weekday]} (${pct(worst.rate)}).`);
  }
  const rankedBlocks = blocks.filter((b) => b.due >= 5).sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0));
  if (rankedBlocks.length >= 2) {
    observations.push(`Привычки со временем «${BLOCK_LABEL[rankedBlocks[0].block].toLowerCase()}» выполняются в ${pct(rankedBlocks[0].rate)} случаев, «${BLOCK_LABEL[rankedBlocks[rankedBlocks.length - 1].block].toLowerCase()}» — в ${pct(rankedBlocks[rankedBlocks.length - 1].rate)}.`);
  }
  const peak = hours.indexOf(Math.max(...hours));
  if (hours[peak] >= 5) observations.push(`Больше всего отметок ставится с ${peak}:00 до ${peak + 1}:00.`);
  if (cmp.previous.rate !== null && cmp.current.rate !== null) {
    const delta = Math.round((cmp.current.rate - cmp.previous.rate) * 100);
    observations.push(
      delta === 0
        ? `За первые ${cmp.days} ${plural(cmp.days, ['день', 'дня', 'дней'])} эта неделя идёт на уровне прошлой.`
        : `За первые ${cmp.days} ${plural(cmp.days, ['день', 'дня', 'дней'])} эта неделя ${delta > 0 ? 'выше' : 'ниже'} прошлой на ${Math.abs(delta)} п. п.`,
    );
  }
  if (stable[0]) observations.push(`Самая стабильная привычка за 30 дней — «${stable[0].h.name}» (${pct(stable[0].r.rate)}).`);

  const delta = cmp.current.rate !== null && cmp.previous.rate !== null ? Math.round((cmp.current.rate - cmp.previous.rate) * 100) : null;
  const maxHour = Math.max(1, ...hours);

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-4 lg:space-y-5">
      <GlassCard className="p-5 sm:p-6">
        <CardHeader title="Наблюдения" subtitle="Факты из ваших отметок за последние 30–90 дней" icon={<Lightbulb size={16} />} className="mb-4" />
        {observations.length === 0 ? (
          <p className="text-sm text-muted">Данных пока мало — наблюдения появятся после пары недель отметок.</p>
        ) : (
          <ul className="space-y-2.5">
            {observations.map((o, i) => (
              <motion.li
                key={o}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.06, duration: 0.4, ease: EASE_OUT }}
                className="flex gap-2.5 text-[14px] leading-relaxed text-fg"
              >
                <ArrowRight size={15} className="mt-1 shrink-0 text-accent" />
                {o}
              </motion.li>
            ))}
          </ul>
        )}
      </GlassCard>

      <div className="grid gap-4 lg:grid-cols-12 lg:gap-5">
        <GlassCard className="p-5 sm:p-6 lg:col-span-5">
          <CardHeader title="Эта неделя и прошлая" subtitle={`Одинаковое число дней: ${cmp.days}`} className="mb-5" />
          <div className="grid grid-cols-2 gap-3">
            {[
              { k: 'Эта неделя', r: cmp.current },
              { k: 'Прошлая', r: cmp.previous },
            ].map((x, i) => (
              <div key={x.k} className={cn('rounded-2xl px-4 py-3', i === 0 ? 'bg-accent/10' : 'bg-fill')}>
                <p className="text-[11px] font-medium tracking-wide text-subtle uppercase">{x.k}</p>
                <p className="mt-1 text-[30px] leading-none font-semibold tracking-[-0.04em] text-fg tabular-nums">
                  {x.r.rate === null ? '—' : <><AnimatedNumber value={Math.round(x.r.rate * 100)} />%</>}
                </p>
                <p className="mt-1.5 text-xs text-subtle tabular-nums">
                  {x.r.done} из {x.r.due}
                </p>
              </div>
            ))}
          </div>
          {delta !== null && (
            <p className={cn('mt-4 inline-flex items-center gap-1.5 text-sm font-medium', delta > 0 ? 'text-success' : delta < 0 ? 'text-warning' : 'text-muted')}>
              {delta > 0 ? <ArrowUpRight size={16} /> : delta < 0 ? <ArrowDownRight size={16} /> : <ArrowRight size={16} />}
              {delta === 0 ? 'Без изменений' : `${delta > 0 ? '+' : '−'}${Math.abs(delta)} п. п.`}
            </p>
          )}
        </GlassCard>

        <GlassCard className="p-5 sm:p-6 lg:col-span-7">
          <CardHeader title="Успешные дни недели" subtitle="Процент выполнения за 90 дней" className="mb-4" />
          <div className="flex h-40 items-end gap-2">
            {weekdays.map((w) => (
              <Bar key={w.weekday} value={w.rate} active={rankedDays[0]?.weekday === w.weekday} label={WEEKDAY_SHORT[w.weekday]} sub={`${WEEKDAY_SHORT[w.weekday]}: ${w.done} из ${w.due}`} />
            ))}
          </div>
        </GlassCard>

        <GlassCard className="p-5 sm:p-6 lg:col-span-5">
          <CardHeader title="Время и успешность" subtitle="По запланированному времени привычек" icon={<Clock size={16} />} className="mb-4" />
          <ul className="space-y-3">
            {blocks.map((b) => (
              <li key={b.block} className={cn(!b.due && 'opacity-40')}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="text-fg">{BLOCK_LABEL[b.block]}</span>
                  <span className="text-xs text-subtle tabular-nums">
                    {b.habits} {plural(b.habits, ['привычка', 'привычки', 'привычек'])} · <span className="font-semibold text-fg">{pct(b.rate)}</span>
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-fill-strong">
                  <motion.div
                    className="h-full origin-left rounded-full bg-accent"
                    style={{ width: `${Math.round((b.rate ?? 0) * 100)}%` }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.8, ease: EASE_OUT }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </GlassCard>

        <GlassCard className="p-5 sm:p-6 lg:col-span-7">
          <CardHeader
            title="Когда ставятся отметки"
            subtitle={hoverHour !== null ? `${hoverHour}:00–${hoverHour + 1}:00 · ${hours[hoverHour]} ${plural(hours[hoverHour], ['отметка', 'отметки', 'отметок'])}` : 'Фактическое время выполнения за 90 дней'}
            className="mb-4"
          />
          <div className="flex h-28 items-end gap-[3px]" onMouseLeave={() => setHoverHour(null)}>
            {hours.map((n, h) => (
              <button
                key={h}
                type="button"
                aria-label={`${h}:00 — ${n}`}
                onMouseEnter={() => setHoverHour(h)}
                onFocus={() => setHoverHour(h)}
                className="relative h-full flex-1"
              >
                <motion.span
                  className="absolute inset-x-0 bottom-0 origin-bottom rounded-[3px]"
                  style={{ height: `${Math.max(2, (n / maxHour) * 100)}%`, background: hoverHour === h ? 'var(--accent)' : 'color-mix(in oklab, var(--accent) 40%, transparent)' }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.6, delay: h * 0.012, ease: EASE_OUT }}
                />
              </button>
            ))}
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] text-subtle">
            <span>0:00</span>
            <span>6:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>23:00</span>
          </div>
        </GlassCard>

        <GlassCard className="p-5 sm:p-6 lg:col-span-7">
          <CardHeader title="Динамика по месяцам" subtitle="Процент выполнения всех привычек" className="mb-4" />
          <RateBars data={months} height={200} />
        </GlassCard>

        <GlassCard className="p-5 sm:p-6 lg:col-span-5">
          <CardHeader title="Частота пропусков" subtitle="В среднем за неделю, последние 30 дней" className="mb-4" />
          {misses.length === 0 ? (
            <p className="rounded-2xl bg-fill px-4 py-6 text-center text-sm text-muted">Пропусков за 30 дней нет</p>
          ) : (
            <ul className="space-y-2">
              {misses.slice(0, 6).map(({ habit, perWeek, missed }) => {
                const I = habitIcon(habit.icon);
                return (
                  <li key={habit.id} className="flex items-center gap-2.5 text-sm">
                    <I size={15} style={{ color: colorOf(habit.color) }} />
                    <span className="min-w-0 flex-1 truncate text-fg">{habit.name}</span>
                    <span className="text-xs text-subtle tabular-nums">
                      {perWeek.toFixed(1).replace('.', ',')}/нед · {missed}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </GlassCard>
      </div>
    </motion.div>
  );
}
