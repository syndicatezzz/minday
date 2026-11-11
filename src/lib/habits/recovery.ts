import type { DateKey, Habit } from '@/types';
import { addDays, rangeKeys } from '@/lib/date';
import { type EntryMap, getDayItems, summarizeDay } from './schedule';

/**
 * Предлагать ли мягкое возвращение: за последние 7 завершённых дней
 * выполнено меньше трети запланированного или 3 последних дня подряд без отметок.
 * Это не оценка, а повод упростить план.
 */
export function shouldSuggestRecovery(habits: Habit[], entries: EntryMap, today: DateKey, weekStartsOn: 0 | 1): boolean {
  const days = rangeKeys(addDays(today, -7), addDays(today, -1)).map((d) =>
    summarizeDay(getDayItems(habits, entries, d, today, weekStartsOn), d, today),
  );
  const due = days.reduce((a, d) => a + d.completed + d.missed, 0);
  const done = days.reduce((a, d) => a + d.completed, 0);
  if (due < 5) return false;
  const lastThree = days.slice(-3).filter((d) => d.scheduled > 0);
  const quietStretch = lastThree.length === 3 && lastThree.every((d) => d.completed === 0);
  return done / due < 1 / 3 || quietStretch;
}
