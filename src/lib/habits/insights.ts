import type { DateKey, Habit, Weekday } from '@/types';
import { addDays, rangeKeys, startOfWeek, timeToMinutes, weekdayOf, zonedParts } from '@/lib/date';
import { type EntryMap, getDayItems, summarizeDay } from './schedule';
import { habitRate } from './analytics';

export interface Rate {
  done: number;
  due: number;
  rate: number | null;
}

const mk = (done: number, due: number): Rate => ({ done, due, rate: due ? done / due : null });

/** Процент выполнения по дням недели за период. Учитываются только завершённые дни. */
export function weekdayRates(habits: Habit[], entries: EntryMap, from: DateKey, to: DateKey, today: DateKey, weekStartsOn: 0 | 1) {
  const acc = new Map<Weekday, { done: number; due: number }>();
  for (const d of rangeKeys(from, to)) {
    if (d >= today) continue;
    const s = summarizeDay(getDayItems(habits, entries, d, today, weekStartsOn), d, today);
    const w = weekdayOf(d);
    const a = acc.get(w) ?? { done: 0, due: 0 };
    a.done += s.completed;
    a.due += s.completed + s.missed;
    acc.set(w, a);
  }
  return [...acc.entries()].map(([weekday, a]) => ({ weekday, ...mk(a.done, a.due) }));
}

export type TimeBlock = 'morning' | 'day' | 'evening' | 'anytime';
export const BLOCK_LABEL: Record<TimeBlock, string> = { morning: 'Утро', day: 'День', evening: 'Вечер', anytime: 'Без времени' };

export function blockOf(time: string | null | undefined): TimeBlock {
  if (!time) return 'anytime';
  const m = timeToMinutes(time);
  if (m < 12 * 60) return 'morning';
  if (m < 18 * 60) return 'day';
  return 'evening';
}

/** Успешность по запланированному времени привычки (утро / день / вечер / без времени). */
export function blockRates(habits: Habit[], entries: EntryMap, from: DateKey, to: DateKey, today: DateKey, weekStartsOn: 0 | 1) {
  const acc: Record<TimeBlock, { done: number; due: number; habits: number }> = {
    morning: { done: 0, due: 0, habits: 0 },
    day: { done: 0, due: 0, habits: 0 },
    evening: { done: 0, due: 0, habits: 0 },
    anytime: { done: 0, due: 0, habits: 0 },
  };
  for (const h of habits) {
    const r = habitRate(h, entries, from, to, today, weekStartsOn);
    if (!r.scheduled) continue;
    const b = acc[blockOf(h.time)];
    b.done += r.completed;
    b.due += r.scheduled;
    b.habits++;
  }
  return (Object.keys(acc) as TimeBlock[]).map((block) => ({ block, habits: acc[block].habits, ...mk(acc[block].done, acc[block].due) }));
}

/** Распределение фактического времени отметок по часам. */
export function completionHours(entries: EntryMap, from: DateKey, to: DateKey, timeZone: string) {
  const hours = Array.from({ length: 24 }, () => 0);
  for (const e of Object.values(entries)) {
    if (e.status !== 'completed' || !e.completedAt || e.date < from || e.date > to) continue;
    hours[zonedParts(new Date(e.completedAt), timeZone).hour]++;
  }
  return hours;
}

/** Сравнение текущей недели (по сегодняшний день) с тем же отрезком прошлой недели. */
export function weekComparison(habits: Habit[], entries: EntryMap, today: DateKey, weekStartsOn: 0 | 1) {
  const ws = startOfWeek(today, weekStartsOn);
  const elapsed = rangeKeys(ws, today).length;
  const prevStart = addDays(ws, -7);
  const sum = (from: DateKey, to: DateKey) => {
    let done = 0;
    let due = 0;
    for (const d of rangeKeys(from, to)) {
      const s = summarizeDay(getDayItems(habits, entries, d, today, weekStartsOn), d, today);
      done += s.completed;
      due += d === today ? s.scheduled : s.completed + s.missed;
    }
    return mk(done, due);
  };
  return { current: sum(ws, today), previous: sum(prevStart, addDays(prevStart, elapsed - 1)), days: elapsed };
}

/** Средняя частота пропусков в неделю по привычкам за период. */
export function missFrequency(habits: Habit[], entries: EntryMap, from: DateKey, to: DateKey, today: DateKey, weekStartsOn: 0 | 1) {
  const weeks = Math.max(1, rangeKeys(from, to).length / 7);
  return habits
    .map((h) => {
      const r = habitRate(h, entries, from, to, today, weekStartsOn);
      return { habit: h, missed: r.missed, scheduled: r.scheduled, perWeek: r.missed / weeks };
    })
    .filter((x) => x.scheduled > 0)
    .sort((a, b) => b.perWeek - a.perWeek);
}
