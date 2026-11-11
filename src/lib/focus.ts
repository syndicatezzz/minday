import type { DateKey, FocusSession } from '@/types';
import { addDays, rangeKeys, startOfWeek } from '@/lib/date';

export function focusStats(sessions: FocusSession[], today: DateKey, weekStartsOn: 0 | 1) {
  const ws = startOfWeek(today, weekStartsOn);
  const sum = (list: FocusSession[]) => list.reduce((a, s) => a + s.actualMs, 0);
  const todayList = sessions.filter((s) => s.date === today);
  const week = sessions.filter((s) => s.date >= ws && s.date <= today);
  const days = rangeKeys(addDays(today, -6), today).map((d) => ({
    date: d,
    minutes: Math.round(sum(sessions.filter((s) => s.date === d)) / 60000),
  }));
  const byHabit = new Map<string | null, number>();
  for (const s of sessions) byHabit.set(s.habitId, (byHabit.get(s.habitId) ?? 0) + s.actualMs);
  return {
    todayMs: sum(todayList),
    todayCount: todayList.length,
    weekMs: sum(week),
    totalMs: sum(sessions),
    completedCount: sessions.filter((s) => s.completed).length,
    days,
    byHabit: [...byHabit.entries()].map(([habitId, ms]) => ({ habitId, ms })).sort((a, b) => b.ms - a.ms),
  };
}

export function formatDuration(ms: number): string {
  const total = Math.round(ms / 60000);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h && m) return `${h} ч ${m} мин`;
  if (h) return `${h} ч`;
  return `${m} мин`;
}
