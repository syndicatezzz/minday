import type { HabitCategory, HabitColor } from '@/types';

export const HABIT_CATEGORIES: { id: HabitCategory; label: string }[] = [
  { id: 'health', label: 'Здоровье' },
  { id: 'fitness', label: 'Спорт' },
  { id: 'mind', label: 'Осознанность' },
  { id: 'productivity', label: 'Продуктивность' },
  { id: 'learning', label: 'Обучение' },
  { id: 'social', label: 'Отношения' },
  { id: 'finance', label: 'Финансы' },
  { id: 'other', label: 'Другое' },
];

export const CATEGORY_LABEL = Object.fromEntries(HABIT_CATEGORIES.map((c) => [c.id, c.label])) as Record<
  HabitCategory,
  string
>;

/** Приглушённые цвета, одинаково читаемые в светлой и тёмной теме. */
export const HABIT_COLORS: { id: HabitColor; label: string; hex: string }[] = [
  { id: 'violet', label: 'Лаванда', hex: '#9486f7' },
  { id: 'sky', label: 'Небо', hex: '#62a8e8' },
  { id: 'teal', label: 'Бирюза', hex: '#45b5a8' },
  { id: 'green', label: 'Шалфей', hex: '#62bd8c' },
  { id: 'amber', label: 'Янтарь', hex: '#d6a24c' },
  { id: 'coral', label: 'Коралл', hex: '#e48a62' },
  { id: 'rose', label: 'Роза', hex: '#de7d93' },
  { id: 'silver', label: 'Серебро', hex: '#9ba1b0' },
];

export const COLOR_HEX = Object.fromEntries(HABIT_COLORS.map((c) => [c.id, c.hex])) as Record<HabitColor, string>;

export function colorOf(color: HabitColor): string {
  return COLOR_HEX[color] ?? COLOR_HEX.violet;
}
