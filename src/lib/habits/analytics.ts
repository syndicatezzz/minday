import type { DateKey, Habit, HabitCategory } from '@/types';
import { addDays, addMonths, formatKey, maxKey, rangeKeys, startOfMonth, startOfWeek, capitalize } from '@/lib/date';
import {
  type DaySummary,
  type EntryMap,
  getDayItems,
  isActiveOn,
  resolveDayItem,
  scheduleAt,
  summarizeDay,
  weeklyDone,
  weeklyTarget,
} from './schedule';

export interface HabitRate {
  scheduled: number;
  completed: number;
  missed: number;
  rate: number | null;
}

/**
 * Процент выполнения привычки за период. Учитываются только дни, когда
 * привычка действительно требовалась; сегодняшний незавершённый день
 * и будущие дни в знаменатель не входят.
 */
export function habitRate(
  habit: Habit,
  entries: EntryMap,
  from: DateKey,
  to: DateKey,
  today: DateKey,
  weekStartsOn: 0 | 1,
): HabitRate {
  const start = maxKey(from, habit.startDate);
  const end = to > today ? today : to;
  let scheduled = 0;
  let completed = 0;
  let missed = 0;
  const weeks = new Set<DateKey>();

  for (const d of rangeKeys(start, end)) {
    if (!isActiveOn(habit, d)) continue;
    if (scheduleAt(habit, d).type === 'weekly') {
      weeks.add(startOfWeek(d, weekStartsOn));
      continue;
    }
    const item = resolveDayItem(habit, entries, d, today, weekStartsOn);
    if (!item) continue;
    if (item.status === 'completed') {
      scheduled++;
      completed++;
    } else if (item.status === 'missed') {
      scheduled++;
      missed++;
    }
  }

  for (const ws of weeks) {
    const target = weeklyTarget(habit, ws);
    if (target <= 0) continue;
    const done = Math.min(weeklyDone(habit, entries, ws, today), target);
    const finished = addDays(ws, 6) < today;
    completed += done;
    if (finished) {
      scheduled += target;
      missed += target - done;
    } else {
      scheduled += done;
    }
  }

  return { scheduled, completed, missed, rate: scheduled > 0 ? completed / scheduled : null };
}

export function dailySeries(
  habits: Habit[],
  entries: EntryMap,
  from: DateKey,
  to: DateKey,
  today: DateKey,
  weekStartsOn: 0 | 1,
): DaySummary[] {
  return rangeKeys(from, to).map((d) =>
    summarizeDay(getDayItems(habits, entries, d, today, weekStartsOn), d, today),
  );
}

export interface ChartPoint {
  key: string;
  label: string;
  completed: number;
  scheduled: number;
  missed: number;
  /** Процент 0–100 или null, если ничего не было запланировано. */
  rate: number | null;
}

export function toChartPoints(days: DaySummary[], labelOf: (d: DateKey) => string): ChartPoint[] {
  return days.map((s) => ({
    key: s.date,
    label: labelOf(s.date),
    completed: s.completed,
    scheduled: s.scheduled,
    missed: s.missed,
    rate: ratePercent(s),
  }));
}

/** Процент дня: сегодняшние ожидающие привычки не считаются пропуском. */
function ratePercent(s: { completed: number; missed: number }): number | null {
  const denom = s.completed + s.missed;
  return denom > 0 ? Math.round((s.completed / denom) * 100) : null;
}

/** Агрегация дневных итогов по неделям. */
export function weeklyBuckets(days: DaySummary[], weekStartsOn: 0 | 1): ChartPoint[] {
  const map = new Map<DateKey, { completed: number; scheduled: number; missed: number }>();
  for (const d of days) {
    const ws = startOfWeek(d.date, weekStartsOn);
    const b = map.get(ws) ?? { completed: 0, scheduled: 0, missed: 0 };
    b.completed += d.completed;
    b.scheduled += d.scheduled;
    b.missed += d.missed;
    map.set(ws, b);
  }
  return [...map.entries()].map(([ws, b]) => ({
    key: ws,
    label: formatKey(ws, { day: 'numeric', month: 'short' }).replace('.', ''),
    ...b,
    rate: ratePercent(b),
  }));
}

export interface CategoryStat {
  category: HabitCategory;
  habits: number;
  completed: number;
  scheduled: number;
  rate: number | null;
}

export function categoryStats(
  habits: Habit[],
  entries: EntryMap,
  from: DateKey,
  to: DateKey,
  today: DateKey,
  weekStartsOn: 0 | 1,
): CategoryStat[] {
  const map = new Map<HabitCategory, CategoryStat>();
  for (const h of habits) {
    const r = habitRate(h, entries, from, to, today, weekStartsOn);
    const cur = map.get(h.category) ?? { category: h.category, habits: 0, completed: 0, scheduled: 0, rate: null };
    cur.habits++;
    cur.completed += r.completed;
    cur.scheduled += r.scheduled;
    map.set(h.category, cur);
  }
  return [...map.values()]
    .map((c) => ({ ...c, rate: c.scheduled > 0 ? c.completed / c.scheduled : null }))
    .sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1));
}

export interface HabitRanking {
  habit: Habit;
  rate: HabitRate;
}

export function rankHabits(
  habits: Habit[],
  entries: EntryMap,
  from: DateKey,
  to: DateKey,
  today: DateKey,
  weekStartsOn: 0 | 1,
): HabitRanking[] {
  return habits.map((habit) => ({ habit, rate: habitRate(habit, entries, from, to, today, weekStartsOn) }));
}

export interface MonthPoint {
  key: string;
  label: string;
  fullLabel: string;
  rate: number | null;
  completed: number;
  scheduled: number;
}

/** Помесячная динамика привычки за всё время. */
export function monthlySeries(
  habit: Habit,
  entries: EntryMap,
  today: DateKey,
  weekStartsOn: 0 | 1,
): MonthPoint[] {
  const out: MonthPoint[] = [];
  let m = startOfMonth(habit.startDate);
  const last = startOfMonth(today);
  let guard = 0;
  while (m <= last && guard++ < 240) {
    const end = addDays(addMonths(m, 1), -1);
    const r = habitRate(habit, entries, m, end, today, weekStartsOn);
    out.push({
      key: m,
      label: capitalize(formatKey(m, { month: 'short' }).replace('.', '')),
      fullLabel: capitalize(formatKey(m, { month: 'long', year: 'numeric' })),
      rate: r.rate === null ? null : Math.round(r.rate * 100),
      completed: r.completed,
      scheduled: r.scheduled,
    });
    m = addMonths(m, 1);
  }
  return out;
}

/** Ежедневные статусы одной привычки (для детальной истории). */
export function habitDailySeries(
  habit: Habit,
  entries: EntryMap,
  from: DateKey,
  to: DateKey,
  today: DateKey,
  weekStartsOn: 0 | 1,
): DaySummary[] {
  return dailySeries([habit], entries, from, to, today, weekStartsOn);
}

export function totalCompletions(entries: EntryMap, habitIds?: Set<string>): number {
  let n = 0;
  for (const e of Object.values(entries)) {
    if (e.status === 'completed' && (!habitIds || habitIds.has(e.habitId))) n++;
  }
  return n;
}
