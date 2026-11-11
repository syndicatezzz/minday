import type { Habit, HabitEntry, HabitKind } from '@/types';

export const KIND_META: Record<HabitKind, { label: string; hint: string; defaultUnit: string; step: number }> = {
  check: { label: 'Отметка', hint: 'Сделано или нет', defaultUnit: '', step: 1 },
  count: { label: 'Количество', hint: 'Повторения, отмечаемые по одному', defaultUnit: 'раз', step: 1 },
  duration: { label: 'Время', hint: 'Минуты занятия', defaultUnit: 'мин', step: 5 },
  numeric: { label: 'Число', hint: 'Страницы, километры, шаги…', defaultUnit: 'стр.', step: 1 },
  sessions: { label: 'Сессии', hint: 'Сессии фокуса засчитываются автоматически', defaultUnit: 'сесс.', step: 1 },
};

/** Значение, с которого день засчитывается (минимальная цель или основная). */
export function completionThreshold(habit: Habit): number {
  return habit.kind === 'check' ? 1 : habit.minTarget ?? habit.targetPerDay;
}

export function entryValue(entry: HabitEntry | undefined): number {
  if (!entry || entry.status === 'missed' || entry.status === 'moved') return 0;
  return entry.count;
}

/** Доля основной цели (0…1+). */
export function goalShare(habit: Habit, value: number): number {
  return habit.targetPerDay > 0 ? value / habit.targetPerDay : 0;
}

export type CompletionLevel = 'none' | 'partial' | 'minimum' | 'full';

export function completionLevel(habit: Habit, value: number): CompletionLevel {
  if (value <= 0) return 'none';
  if (value >= habit.targetPerDay) return 'full';
  if (habit.minTarget !== null && value >= habit.minTarget) return 'minimum';
  return 'partial';
}

export function isMeasured(habit: Habit): boolean {
  return habit.kind !== 'check';
}

/** Нужен ли ввод произвольного значения (а не +1). */
export function needsValueInput(habit: Habit): boolean {
  return habit.kind === 'duration' || habit.kind === 'numeric';
}

export function formatAmount(habit: Habit, value: number): string {
  const v = Number.isInteger(value) ? String(value) : value.toFixed(1).replace('.', ',');
  return habit.unit ? `${v} ${habit.unit}` : v;
}

export function describeTarget(habit: Habit): string {
  if (habit.kind === 'check') return 'Отметка';
  const main = formatAmount(habit, habit.targetPerDay);
  return habit.minTarget !== null ? `${formatAmount(habit, habit.minTarget)} – ${main}` : main;
}
