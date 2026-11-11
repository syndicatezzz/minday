import type { DateKey, Habit, JournalEntry } from '@/types';
import { type EntryMap, getDayItems, summarizeDay } from '@/lib/habits/schedule';

export const MOODS = [
  { value: 1, label: 'Тяжело' },
  { value: 2, label: 'Так себе' },
  { value: 3, label: 'Нормально' },
  { value: 4, label: 'Хорошо' },
  { value: 5, label: 'Отлично' },
] as const;

/**
 * Сопоставление настроения и выполнения: средний процент выполнения привычек
 * в дни с каждой оценкой настроения. Только описательная статистика по вашим
 * записям — без выводов о причинах.
 */
export function moodVsCompletion(journal: JournalEntry[], habits: Habit[], entries: EntryMap, today: DateKey, weekStartsOn: 0 | 1) {
  const acc = new Map<number, { days: number; rateSum: number }>();
  for (const j of journal) {
    if (!j.mood || j.date > today) continue;
    const s = summarizeDay(getDayItems(habits, entries, j.date, today, weekStartsOn), j.date, today);
    const denom = j.date === today ? s.scheduled : s.completed + s.missed;
    if (!denom) continue;
    const a = acc.get(j.mood) ?? { days: 0, rateSum: 0 };
    a.days++;
    a.rateSum += s.completed / denom;
    acc.set(j.mood, a);
  }
  return MOODS.map((m) => {
    const a = acc.get(m.value);
    return { mood: m.value, label: m.label, days: a?.days ?? 0, rate: a ? a.rateSum / a.days : null };
  });
}
