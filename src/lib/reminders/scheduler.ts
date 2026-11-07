import type { AppData, DateKey, Habit, Reminder } from '@/types';
import { addDays, timeToMinutes, weekdayOf } from '@/lib/date';
import { getEntry, isActiveOn, isCompleted, resolveDayItem } from '@/lib/habits/schedule';

/** Напоминание считается актуальным в течение этого окна после назначенного времени. */
export const FIRE_WINDOW_MIN = 10;

export interface DueReminder {
  reminder: Reminder;
  habit: Habit;
  /** Уникальный ключ срабатывания: защищает от повторов после перезагрузки. */
  fireKey: string;
}

/** Применимо ли напоминание к календарной дате. */
export function reminderAppliesOn(reminder: Reminder, habit: Habit, data: AppData, date: DateKey, weekStartsOn: 0 | 1) {
  if (!isActiveOn(habit, date)) return false;
  if (reminder.days === 'schedule') {
    return resolveDayItem(habit, data.entries, date, date, weekStartsOn) !== null;
  }
  return reminder.days.includes(weekdayOf(date));
}

/**
 * Возвращает напоминания, которые должны сработать сейчас.
 * calendarDate — дата по часам пользователя (не логическая), nowMinutes — минуты от полуночи.
 */
export function dueReminders(
  data: AppData,
  calendarDate: DateKey,
  logicalDate: DateKey,
  nowMinutes: number,
  fired: Record<string, number>,
): DueReminder[] {
  const out: DueReminder[] = [];
  for (const reminder of Object.values(data.reminders)) {
    if (!reminder.enabled) continue;
    const habit = data.habits[reminder.habitId];
    if (!habit) continue;
    const at = timeToMinutes(reminder.time);
    if (nowMinutes < at || nowMinutes >= at + FIRE_WINDOW_MIN) continue;
    const fireKey = `${reminder.id}:${calendarDate}:${reminder.time}`;
    if (fired[fireKey]) continue;
    if (!reminderAppliesOn(reminder, habit, data, logicalDate, data.settings.weekStartsOn)) continue;
    if (data.settings.skipCompletedReminders && isCompleted(getEntry(data.entries, habit.id, logicalDate))) continue;
    out.push({ reminder, habit, fireKey });
  }
  return out;
}

/** Ближайшее время срабатывания для отображения в списке. */
export function nextOccurrence(
  reminder: Reminder,
  habit: Habit,
  data: AppData,
  today: DateKey,
  nowMinutes: number,
): DateKey | null {
  for (let i = 0; i < 14; i++) {
    const d = addDays(today, i);
    if (i === 0 && timeToMinutes(reminder.time) <= nowMinutes) continue;
    if (reminderAppliesOn(reminder, habit, data, d, data.settings.weekStartsOn)) return d;
  }
  return null;
}
