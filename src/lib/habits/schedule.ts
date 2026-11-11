import type { DateKey, DayStatus, Habit, HabitEntry, Schedule, ScheduleVersion, Weekday } from '@/types';
import { addDays, rangeKeys, startOfWeek, weekdayOf } from '@/lib/date';

export type EntryMap = Record<string, HabitEntry>;

export const EPOCH: DateKey = '1970-01-01';

export function entryKey(habitId: string, date: DateKey): string {
  return `${habitId}:${date}`;
}

export function getEntry(entries: EntryMap, habitId: string, date: DateKey): HabitEntry | undefined {
  return entries[entryKey(habitId, date)];
}

export function isCompleted(entry: HabitEntry | undefined): boolean {
  return entry?.status === 'completed';
}

/** Расписание, действовавшее в указанный день. */
export function scheduleAt(habit: Habit, date: DateKey): Schedule {
  let current: ScheduleVersion = habit.schedules[0];
  for (const v of habit.schedules) {
    if (v.from <= date) current = v;
    else break;
  }
  return current?.schedule ?? { type: 'daily' };
}

export function currentSchedule(habit: Habit, today: DateKey): Schedule {
  return scheduleAt(habit, today);
}

export function isPausedOn(habit: Habit, date: DateKey): boolean {
  return habit.pauses.some((p) => p.from <= date && (p.to === null || date < p.to));
}

export function isPausedNow(habit: Habit, today: DateKey): boolean {
  return isPausedOn(habit, today);
}

export function isArchived(habit: Habit): boolean {
  return habit.archivedOn !== null;
}

/** Привычка существует и не на паузе в этот день (без учёта дня недели). */
export function isActiveOn(habit: Habit, date: DateKey): boolean {
  if (date < habit.startDate) return false;
  if (habit.archivedOn && date >= habit.archivedOn) return false;
  return !isPausedOn(habit, date);
}

export function isWeekly(schedule: Schedule): schedule is { type: 'weekly'; timesPerWeek: number } {
  return schedule.type === 'weekly';
}

/** Для фиксированных расписаний: назначена ли привычка на этот день. */
export function isFixedScheduledOn(habit: Habit, date: DateKey): boolean {
  if (!isActiveOn(habit, date)) return false;
  const s = scheduleAt(habit, date);
  if (s.type === 'daily') return true;
  if (s.type === 'weekdays') return s.days.includes(weekdayOf(date));
  return false;
}

/** Количество выполнений за неделю, начинающуюся с weekStart. */
export function weeklyDone(habit: Habit, entries: EntryMap, weekStart: DateKey, until?: DateKey): number {
  let done = 0;
  for (let i = 0; i < 7; i++) {
    const d = addDays(weekStart, i);
    if (until && d > until) break;
    if (isActiveOn(habit, d) && isCompleted(getEntry(entries, habit.id, d))) done++;
  }
  return done;
}

/** Недельная цель с поправкой на неполные недели (старт, архив, пауза). */
export function weeklyTarget(habit: Habit, weekStart: DateKey): number {
  let available = 0;
  let target = 0;
  for (let i = 0; i < 7; i++) {
    const d = addDays(weekStart, i);
    if (!isActiveOn(habit, d)) continue;
    const s = scheduleAt(habit, d);
    if (s.type !== 'weekly') continue;
    available++;
    target = s.timesPerWeek;
  }
  return Math.min(target, available);
}

export interface DayItem {
  habit: Habit;
  entry: HabitEntry | undefined;
  status: DayStatus;
  flexible: boolean;
  weekly?: { done: number; target: number };
}

/**
 * Статус одной привычки в конкретный день. Возвращает null, если привычка
 * в этот день не требовалась.
 *
 * Правила:
 *  - будущие дни никогда не считаются пропущенными;
 *  - сегодняшний день остаётся «ожидающим» до его окончания;
 *  - пропуск фиксируется только после окончания дня или явной отметки.
 */
export function resolveDayItem(
  habit: Habit,
  entries: EntryMap,
  date: DateKey,
  today: DateKey,
  weekStartsOn: 0 | 1,
): DayItem | null {
  if (!isActiveOn(habit, date)) return null;
  const schedule = scheduleAt(habit, date);
  const entry = getEntry(entries, habit.id, date);
  // Выполнение перенесено на другой день — в этот день привычка не требуется
  if (entry?.status === 'moved') return null;
  const done = isCompleted(entry);

  if (schedule.type === 'weekly') {
    const weekStart = startOfWeek(date, weekStartsOn);
    const target = weeklyTarget(habit, weekStart);
    const weekDone = weeklyDone(habit, entries, weekStart);
    const weekly = { done: weekDone, target };
    if (done) return { habit, entry, status: 'completed', flexible: true, weekly };
    if (date < today) return null; // для гибкого графика конкретный день не обязателен
    if (weekDone >= target) return null; // норма недели уже выполнена
    return { habit, entry, status: date === today ? 'pending' : 'upcoming', flexible: true, weekly };
  }

  const wd = weekdayOf(date);
  // Дополнительное выполнение (перенесено сюда с другого дня) действует и вне расписания
  if (schedule.type === 'weekdays' && !schedule.days.includes(wd) && !entry?.extra) return null;

  let status: DayStatus;
  if (done) status = 'completed';
  else if (entry?.status === 'missed') status = 'missed';
  else if (date < today) status = 'missed';
  else if (date === today) status = 'pending';
  else status = 'upcoming';
  return { habit, entry, status, flexible: false };
}

export function getDayItems(
  habits: Habit[],
  entries: EntryMap,
  date: DateKey,
  today: DateKey,
  weekStartsOn: 0 | 1,
): DayItem[] {
  const out: DayItem[] = [];
  for (const h of habits) {
    const item = resolveDayItem(h, entries, date, today, weekStartsOn);
    if (item) out.push(item);
  }
  return out;
}

export type DayState = 'future' | 'empty' | 'full' | 'partial' | 'missed' | 'today';

export interface DaySummary {
  date: DateKey;
  scheduled: number;
  completed: number;
  missed: number;
  pending: number;
  rate: number | null;
  state: DayState;
}

export function summarizeDay(items: DayItem[], date: DateKey, today: DateKey): DaySummary {
  let completed = 0;
  let missed = 0;
  let pending = 0;
  for (const it of items) {
    if (it.status === 'completed') completed++;
    else if (it.status === 'missed') missed++;
    else pending++;
  }
  const scheduled = items.length;
  let state: DayState;
  if (date > today) state = 'future';
  else if (scheduled === 0) state = 'empty';
  else if (completed === scheduled) state = 'full';
  else if (date === today && missed === 0) state = 'today';
  else if (completed === 0) state = 'missed';
  else state = 'partial';
  return {
    date,
    scheduled,
    completed,
    missed,
    pending,
    rate: scheduled > 0 ? completed / scheduled : null,
    state,
  };
}

export function summarizeRange(
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

export function describeSchedule(schedule: Schedule): string {
  if (schedule.type === 'daily') return 'Каждый день';
  if (schedule.type === 'weekly') return `${schedule.timesPerWeek} р. в неделю`;
  const names: Record<Weekday, string> = { 0: 'Вс', 1: 'Пн', 2: 'Вт', 3: 'Ср', 4: 'Чт', 5: 'Пт', 6: 'Сб' };
  const sorted = [...schedule.days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
  if (sorted.length === 7) return 'Каждый день';
  if (sorted.length === 5 && !sorted.includes(0) && !sorted.includes(6)) return 'По будням';
  if (sorted.length === 2 && sorted.includes(0) && sorted.includes(6)) return 'По выходным';
  return sorted.map((d) => names[d]).join(', ');
}

export function sameSchedule(a: Schedule, b: Schedule): boolean {
  if (a.type !== b.type) return false;
  if (a.type === 'weekdays' && b.type === 'weekdays') {
    return [...a.days].sort().join() === [...b.days].sort().join();
  }
  if (a.type === 'weekly' && b.type === 'weekly') return a.timesPerWeek === b.timesPerWeek;
  return true;
}

/** Самая ранняя дата, с которой есть данные (для ограничения перебора). */
export function earliestStart(habits: Habit[]): DateKey | null {
  let min: DateKey | null = null;
  for (const h of habits) if (!min || h.startDate < min) min = h.startDate;
  return min;
}

export function isFutureDay(date: DateKey, today: DateKey): boolean {
  return date > today;
}

export function yesterdayOf(today: DateKey): DateKey {
  return addDays(today, -1);
}
