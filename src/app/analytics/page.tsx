'use client';

import { motion } from 'framer-motion';
import { Activity, CircleCheck, Flame, ListChecks, Percent, TrendingDown, TrendingUp, Trophy } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CompletionBars, RateArea, RateBars } from '@/components/analytics/Charts';
import { Heatmap } from '@/components/calendar/Heatmap';
import { habitIcon } from '@/components/habits/habit-icons';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { CardHeader, GlassCard } from '@/components/ui/GlassCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Select } from '@/components/ui/Field';
import { ProgressBar } from '@/components/ui/Progress';
import { Segmented } from '@/components/ui/Segmented';
import { StatsCard } from '@/components/ui/StatsCard';
import { addDays, formatShortDate, plural, rangeKeys, startOfWeek } from '@/lib/date';
import {
  categoryStats,
  dailySeries,
  habitRate,
  monthlySeries,
  rankHabits,
  toChartPoints,
  totalCompletions,
  weeklyBuckets,
} from '@/lib/habits/analytics';
import { CATEGORY_LABEL, colorOf } from '@/lib/habits/meta';
import { type DaySummary, earliestStart, getDayItems, summarizeDay } from '@/lib/habits/schedule';
import { habitStreak, overallStreak } from '@/lib/habits/streak';
import { stagger } from '@/lib/motion';
import { useApp } from '@/lib/store/app-store';
import { useToday } from '@/lib/store/clock';
import { ui } from '@/lib/store/ui-store';
import type { DateKey, Habit } from '@/types';

type Period = '7' | '30' | '90';

const pct = (r: number | null) => (r === null ? '—' : `${Math.round(r * 100)}%`);

export default function AnalyticsPage() {
  const habitsMap = useApp((s) => s.data.habits);
  const entries = useApp((s) => s.data.entries);
  const settings = useApp((s) => s.data.settings);
  const { today } = useToday();
  const ws = settings.weekStartsOn;
  const [period, setPeriod] = useState<Period>('30');
  const habits = useMemo(() => Object.values(habitsMap).sort((a, b) => a.order - b.order), [habitsMap]);
  const [selectedId, setSelectedId] = useState<string>('');
  const selectedHabit = habitsMap[selectedId] ?? habits.find((h) => !h.archivedOn) ?? habits[0];

  const start = earliestStart(habits) ?? today;

  const overview = useMemo(() => {
    let completed = 0;
    let scheduled = 0;
    for (const h of habits) {
      const r = habitRate(h, entries, h.startDate, today, today, ws);
      completed += r.completed;
      scheduled += r.scheduled;
    }
    return {
      active: habits.filter((h) => !h.archivedOn).length,
      archived: habits.filter((h) => h.archivedOn).length,
      completions: totalCompletions(entries),
      rate: scheduled ? completed / scheduled : null,
      streak: overallStreak(habits, entries, today, ws),
    };
  }, [habits, entries, today, ws]);

  const series90 = useMemo(() => dailySeries(habits, entries, addDays(today, -89), today, today, ws), [habits, entries, today, ws]);
  const periodDays = series90.slice(-Number(period));
  const periodPoints = useMemo(
    () =>
      period === '90'
        ? weeklyBuckets(periodDays, ws)
        : toChartPoints(periodDays, formatShortDate),
    [periodDays, period, ws],
  );
  const periodTotals = periodDays.reduce(
    (a, d) => ({ c: a.c + d.completed, m: a.m + d.missed }),
    { c: 0, m: 0 },
  );

  const weeks = useMemo(() => {
    const from = addDays(startOfWeek(today, ws), -7 * 11);
    return weeklyBuckets(dailySeries(habits, entries, from, today, today, ws), ws);
  }, [habits, entries, today, ws]);

  const from30 = addDays(today, -29);
  const categories = useMemo(() => categoryStats(habits, entries, from30, today, today, ws), [habits, entries, from30, today, ws]);
  const ranking = useMemo(
    () => rankHabits(habits.filter((h) => !h.archivedOn), entries, from30, today, today, ws).filter((r) => r.rate.scheduled >= 3),
    [habits, entries, from30, today, ws],
  );
  const stable = [...ranking].sort((a, b) => (b.rate.rate ?? 0) - (a.rate.rate ?? 0)).slice(0, 5);
  const missed = [...ranking].filter((r) => r.rate.missed > 0).sort((a, b) => b.rate.missed - a.rate.missed).slice(0, 5);

  if (habits.length === 0) {
    return (
      <>
        <PageHeader eyebrow="Аналитика" title="Ваш прогресс в цифрах" />
        <EmptyState
          icon={<Activity size={28} />}
          title="Данных пока нет"
          description="Аналитика строится только на ваших реальных отметках. Добавьте привычку и отметьте первое выполнение."
          action={
            <Button variant="primary" onClick={() => ui.openHabitModal()}>
              Добавить привычку
            </Button>
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Аналитика"
        title="Ваш прогресс в цифрах"
        description={`Все показатели рассчитаны по вашим отметкам с ${formatShortDate(start)} и учитывают только запланированные дни.`}
      />

      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-4 lg:space-y-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5 lg:gap-4">
          <StatsCard
            label="Привычек"
            value={overview.active}
            hint={overview.archived ? `+ ${overview.archived} в архиве` : 'активных'}
            icon={<ListChecks size={16} />}
          />
          <StatsCard label="Выполнений" value={overview.completions} hint="за всё время" icon={<CircleCheck size={16} />} tone="success" />
          <StatsCard label="Успешность" value={pct(overview.rate)} hint="от запланированного" icon={<Percent size={16} />} tone="accent" />
          <StatsCard
            label="Текущая серия"
            value={overview.streak.current}
            hint={plural(overview.streak.current, ['идеальный день', 'идеальных дня', 'идеальных дней'])}
            icon={<Flame size={16} />}
            tone="warning"
          />
          <StatsCard
            label="Рекорд"
            value={overview.streak.best}
            hint={plural(overview.streak.best, ['день подряд', 'дня подряд', 'дней подряд'])}
            icon={<Trophy size={16} />}
            className="col-span-2 lg:col-span-1"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-12 lg:gap-5">
          <GlassCard className="p-5 sm:p-6 lg:col-span-8">
            <CardHeader
              title="Выполнение привычек"
              subtitle={
                periodTotals.c + periodTotals.m
                  ? `${periodTotals.c} выполнено · ${periodTotals.m} пропущено · ${Math.round((periodTotals.c / (periodTotals.c + periodTotals.m)) * 100)}%`
                  : 'Нет завершённых дней в периоде'
              }
              action={
                <Segmented<Period>
                  ariaLabel="Период"
                  size="sm"
                  value={period}
                  onChange={setPeriod}
                  options={[
                    { value: '7', label: '7 дн' },
                    { value: '30', label: '30 дн' },
                    { value: '90', label: '90 дн' },
                  ]}
                />
              }
              className="mb-5"
            />
            <CompletionBars data={periodPoints} tooltipPrefix={period === '90' ? 'Неделя с' : undefined} />
          </GlassCard>

          <GlassCard className="p-5 sm:p-6 lg:col-span-4">
            <CardHeader title="По категориям" subtitle="Последние 30 дней" className="mb-5" />
            <ul className="space-y-4">
              {categories.map((c) => (
                <li key={c.category}>
                  <div className="mb-1.5 flex items-baseline justify-between text-sm">
                    <span className="text-fg">{CATEGORY_LABEL[c.category]}</span>
                    <span className="text-xs text-subtle tabular-nums">
                      {c.habits} · <span className="font-semibold text-fg">{pct(c.rate)}</span>
                    </span>
                  </div>
                  <ProgressBar value={c.rate ?? 0} label={CATEGORY_LABEL[c.category]} />
                </li>
              ))}
            </ul>
          </GlassCard>
        </div>

        <div className="grid gap-4 lg:grid-cols-12 lg:gap-5">
          <GlassCard className="p-5 sm:p-6 lg:col-span-7">
            <CardHeader title="Динамика за 30 дней" subtitle="Процент выполнения по дням" className="mb-5" />
            <RateArea data={toChartPoints(series90.slice(-30), formatShortDate)} />
          </GlassCard>
          <GlassCard className="p-5 sm:p-6 lg:col-span-5">
            <CardHeader title="Сравнение по неделям" subtitle="Последние 12 недель" className="mb-5" />
            <RateBars data={weeks.map((w) => ({ ...w, tooltipLabel: `Неделя с ${w.label}` }))} />
          </GlassCard>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:gap-5">
          <GlassCard className="p-5 sm:p-6">
            <CardHeader title="Самые стабильные" subtitle="Последние 30 дней" icon={<TrendingUp size={16} />} className="mb-4" />
            <RankList items={stable} empty="Нужно хотя бы 3 запланированных дня" kind="rate" onSelect={setSelectedId} />
          </GlassCard>
          <GlassCard className="p-5 sm:p-6">
            <CardHeader title="Чаще всего пропускаются" subtitle="Последние 30 дней" icon={<TrendingDown size={16} />} className="mb-4" />
            <RankList items={missed} empty="Пропусков нет — отличный результат" kind="missed" onSelect={setSelectedId} />
          </GlassCard>
        </div>

        {selectedHabit && (
          <HabitDetail habit={selectedHabit} habits={habits} onChange={setSelectedId} today={today} weekStartsOn={ws} />
        )}
      </motion.div>
    </>
  );
}

function RankList({
  items,
  empty,
  kind,
  onSelect,
}: {
  items: ReturnType<typeof rankHabits>;
  empty: string;
  kind: 'rate' | 'missed';
  onSelect: (id: string) => void;
}) {
  if (!items.length) return <p className="rounded-2xl bg-fill px-4 py-6 text-center text-sm text-muted">{empty}</p>;
  return (
    <ol className="space-y-1">
      {items.map(({ habit, rate }, i) => {
        const Icon = habitIcon(habit.icon);
        const color = colorOf(habit.color);
        return (
          <li key={habit.id}>
            <button
              type="button"
              onClick={() => {
                onSelect(habit.id);
                document.getElementById('habit-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition-colors hover:bg-fill"
            >
              <span className="w-4 text-center text-xs text-subtle tabular-nums">{i + 1}</span>
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl" style={{ background: `color-mix(in oklab, ${color} 16%, transparent)`, color }}>
                <Icon size={15} />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-fg">{habit.name}</span>
              <span className={kind === 'missed' ? 'text-sm font-semibold text-danger tabular-nums' : 'text-sm font-semibold text-fg tabular-nums'}>
                {kind === 'rate' ? pct(rate.rate) : `${rate.missed} ${plural(rate.missed, ['пропуск', 'пропуска', 'пропусков'])}`}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function HabitDetail({
  habit,
  habits,
  onChange,
  today,
  weekStartsOn,
}: {
  habit: Habit;
  habits: Habit[];
  onChange: (id: string) => void;
  today: DateKey;
  weekStartsOn: 0 | 1;
}) {
  const entries = useApp((s) => s.data.entries);
  const all = habitRate(habit, entries, habit.startDate, today, today, weekStartsOn);
  const month = habitRate(habit, entries, addDays(today, -29), today, today, weekStartsOn);
  const streak = habitStreak(habit, entries, today, weekStartsOn);
  const unit = streak.unit === 'week' ? 'нед.' : 'дн.';
  const months = useMemo(() => monthlySeries(habit, entries, today, weekStartsOn), [habit, entries, today, weekStartsOn]);
  const last30 = useMemo(
    () => toChartPoints(dailySeries([habit], entries, addDays(today, -29), today, today, weekStartsOn), formatShortDate),
    [habit, entries, today, weekStartsOn],
  );
  const heat = useMemo(() => {
    const map: Record<DateKey, DaySummary> = {};
    const from = addDays(startOfWeek(today, weekStartsOn), -7 * 19);
    for (const d of rangeKeys(from, addDays(startOfWeek(today, weekStartsOn), 6))) {
      map[d] = summarizeDay(getDayItems([habit], entries, d, today, weekStartsOn), d, today);
    }
    return map;
  }, [habit, entries, today, weekStartsOn]);
  const Icon = habitIcon(habit.icon);
  const color = colorOf(habit.color);

  return (
    <GlassCard id="habit-detail" className="scroll-mt-24 p-5 sm:p-7">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl" style={{ background: `color-mix(in oklab, ${color} 16%, transparent)`, color }}>
            <Icon size={21} />
          </span>
          <div>
            <p className="text-[12px] font-medium tracking-wide text-subtle uppercase">Детальная аналитика</p>
            <h2 className="text-xl font-semibold tracking-[-0.02em] text-fg">{habit.name}</h2>
          </div>
        </div>
        <div className="w-full sm:w-64">
          <label htmlFor="detail-habit" className="sr-only">
            Выберите привычку
          </label>
          <Select id="detail-habit" value={habit.id} onChange={(e) => onChange(e.target.value)}>
            {habits.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
                {h.archivedOn ? ' (архив)' : ''}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[
          { k: 'За всё время', v: pct(all.rate), s: `${all.completed} из ${all.scheduled}` },
          { k: 'За 30 дней', v: pct(month.rate), s: `${month.completed} из ${month.scheduled}` },
          { k: 'Текущая серия', v: `${streak.current}`, s: unit },
          { k: 'Лучшая серия', v: `${streak.best}`, s: unit },
        ].map((x) => (
          <div key={x.k} className="rounded-2xl bg-fill px-4 py-3">
            <dt className="text-[11px] font-medium tracking-wide text-subtle uppercase">{x.k}</dt>
            <dd className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-semibold tracking-[-0.03em] text-fg tabular-nums">{x.v}</span>
              <span className="text-xs text-subtle">{x.s}</span>
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-7 grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-3 text-sm font-medium text-fg">Динамика за месяц</h3>
          <CompletionBars data={last30} height={200} />
        </div>
        <div>
          <h3 className="mb-3 text-sm font-medium text-fg">Динамика за всё время</h3>
          {months.length > 1 ? (
            <RateArea data={months} height={200} />
          ) : (
            <RateBars data={months} height={200} />
          )}
        </div>
      </div>

      <div className="mt-7">
        <h3 className="mb-3 text-sm font-medium text-fg">История выполнения · 20 недель</h3>
        <Heatmap summaries={heat} weeks={20} today={today} weekStartsOn={weekStartsOn} />
      </div>
    </GlassCard>
  );
}
