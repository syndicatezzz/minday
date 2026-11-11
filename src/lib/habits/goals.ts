import type { DateKey, Goal, Habit } from '@/types';
import { addDays, diffDays, maxKey, minKey, rangeKeys, startOfWeek } from '@/lib/date';
import { type EntryMap, isActiveOn, isFixedScheduledOn, scheduleAt, weeklyTarget } from './schedule';
import { habitRate } from './analytics';

export interface GoalProgress {
  /** Выполнено отметок привязанных привычек с начала цели. */
  done: number;
  /** Ожидается выполнений до даты цели (по текущему расписанию; для будущего — прогноз). */
  expected: number;
  /** Доля пути к цели 0…1 (по выполнениям). */
  progress: number;
  /** Доля прошедшего времени 0…1 (если задана дата). */
  timeShare: number | null;
  /** Процент выполнения за прошедшие дни. */
  rate: number | null;
  daysLeft: number | null;
}

/** Сколько раз привычка ожидается в интервале (будущие дни — по действующему расписанию). */
function expectedCount(habit: Habit, from: DateKey, to: DateKey, weekStartsOn: 0 | 1): number {
  let n = 0;
  const weeks = new Set<DateKey>();
  for (const d of rangeKeys(maxKey(from, habit.startDate), to)) {
    if (!isActiveOn(habit, d)) continue;
    if (scheduleAt(habit, d).type === 'weekly') weeks.add(startOfWeek(d, weekStartsOn));
    else if (isFixedScheduledOn(habit, d)) n++;
  }
  for (const ws of weeks) n += weeklyTarget(habit, ws);
  return n;
}

export function goalProgress(goal: Goal, habits: Record<string, Habit>, entries: EntryMap, today: DateKey, weekStartsOn: 0 | 1): GoalProgress {
  const linked = goal.habitIds.map((id) => habits[id]).filter((h): h is Habit => !!h);
  const end = goal.targetDate ?? addDays(goal.startDate, 89);
  let done = 0;
  let expected = 0;
  let scheduledPast = 0;
  for (const h of linked) {
    const r = habitRate(h, entries, goal.startDate, minKey(today, end), today, weekStartsOn);
    done += r.completed;
    scheduledPast += r.scheduled;
    expected += expectedCount(h, goal.startDate, end, weekStartsOn);
  }
  const total = diffDays(end, goal.startDate) + 1;
  const passed = Math.min(total, Math.max(0, diffDays(today, goal.startDate) + 1));
  return {
    done,
    expected,
    progress: goal.achievedOn ? 1 : expected ? Math.min(1, done / expected) : 0,
    timeShare: goal.targetDate ? passed / total : null,
    rate: scheduledPast ? done / scheduledPast : null,
    daysLeft: goal.targetDate ? diffDays(goal.targetDate, today) : null,
  };
}

/** История продвижения: накопленный процент по неделям с начала цели. */
export function goalHistory(goal: Goal, habits: Record<string, Habit>, entries: EntryMap, today: DateKey, weekStartsOn: 0 | 1) {
  const p = goalProgress(goal, habits, entries, today, weekStartsOn);
  const linked = goal.habitIds.map((id) => habits[id]).filter((h): h is Habit => !!h);
  const points: { key: string; label: string; value: number }[] = [];
  let ws = startOfWeek(goal.startDate, weekStartsOn);
  let guard = 0;
  while (ws <= today && guard++ < 160) {
    const we = minKey(addDays(ws, 6), today);
    let done = 0;
    for (const h of linked) done += habitRate(h, entries, goal.startDate, we, today, weekStartsOn).completed;
    points.push({ key: ws, label: we, value: p.expected ? Math.min(100, Math.round((done / p.expected) * 100)) : 0 });
    ws = addDays(ws, 7);
  }
  return points;
}
