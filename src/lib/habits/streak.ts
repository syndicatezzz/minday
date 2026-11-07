import type { DateKey, Habit } from '@/types';
import { addDays, rangeKeys, startOfWeek } from '@/lib/date';
import {
  type EntryMap,
  earliestStart,
  getDayItems,
  getEntry,
  isActiveOn,
  isCompleted,
  isFixedScheduledOn,
  scheduleAt,
  summarizeDay,
  weeklyDone,
  weeklyTarget,
} from './schedule';

export type PeriodResult = 'success' | 'fail' | 'open';

export interface StreakInfo {
  current: number;
  best: number;
  unit: 'day' | 'week';
}

/** Текущая и лучшая серия по последовательности результатов периодов. */
export function streakFromPeriods(periods: PeriodResult[]): { current: number; best: number } {
  let best = 0;
  let run = 0;
  for (const p of periods) {
    if (p === 'success') {
      run++;
      if (run > best) best = run;
    } else if (p === 'fail') {
      run = 0;
    }
  }
  let current = 0;
  for (let i = periods.length - 1; i >= 0; i--) {
    const p = periods[i];
    if (p === 'open') continue; // сегодняшний незавершённый период не прерывает серию
    if (p === 'fail') break;
    current++;
  }
  return { current, best };
}

/**
 * Последовательность периодов привычки по её собственному расписанию:
 *  - для фиксированных расписаний период — запланированный день;
 *  - для гибкого графика (N раз в неделю) период — неделя.
 * Дни паузы и дни, когда привычка не запланирована, пропускаются и не рвут серию.
 */
export function habitPeriods(
  habit: Habit,
  entries: EntryMap,
  today: DateKey,
  weekStartsOn: 0 | 1,
): PeriodResult[] {
  const out: PeriodResult[] = [];
  if (habit.startDate > today) return out;
  const end = habit.archivedOn && habit.archivedOn <= today ? addDays(habit.archivedOn, -1) : today;
  let pendingWeek: DateKey | null = null;

  const flushWeek = () => {
    if (!pendingWeek) return;
    const ws = pendingWeek;
    pendingWeek = null;
    const target = weeklyTarget(habit, ws);
    if (target <= 0) return;
    const done = weeklyDone(habit, entries, ws, today);
    if (done >= target) out.push('success');
    else if (addDays(ws, 6) < today) out.push('fail');
    else out.push('open');
  };

  for (const d of rangeKeys(habit.startDate, end)) {
    const ws = startOfWeek(d, weekStartsOn);
    if (pendingWeek && pendingWeek !== ws) flushWeek();
    if (!isActiveOn(habit, d)) continue;
    const s = scheduleAt(habit, d);
    if (s.type === 'weekly') {
      pendingWeek = ws;
      continue;
    }
    if (!isFixedScheduledOn(habit, d)) continue;
    const entry = getEntry(entries, habit.id, d);
    if (isCompleted(entry)) out.push('success');
    else if (d < today || entry?.status === 'missed') out.push('fail');
    else out.push('open');
  }
  flushWeek();
  return out;
}

export function habitStreak(
  habit: Habit,
  entries: EntryMap,
  today: DateKey,
  weekStartsOn: 0 | 1,
): StreakInfo {
  const { current, best } = streakFromPeriods(habitPeriods(habit, entries, today, weekStartsOn));
  return { current, best, unit: scheduleAt(habit, today).type === 'weekly' ? 'week' : 'day' };
}

/**
 * Общая серия: подряд идущие дни, в которые выполнены все запланированные
 * привычки. Дни без запланированных привычек пропускаются, сегодняшний
 * незавершённый день серию не прерывает.
 */
export function overallStreak(
  habits: Habit[],
  entries: EntryMap,
  today: DateKey,
  weekStartsOn: 0 | 1,
): { current: number; best: number } {
  const start = earliestStart(habits);
  if (!start || start > today) return { current: 0, best: 0 };
  const periods: PeriodResult[] = [];
  for (const d of rangeKeys(start, today)) {
    const s = summarizeDay(getDayItems(habits, entries, d, today, weekStartsOn), d, today);
    if (s.scheduled === 0) continue;
    if (s.completed === s.scheduled) periods.push('success');
    else if (d < today) periods.push('fail');
    else periods.push('open');
  }
  return streakFromPeriods(periods);
}
