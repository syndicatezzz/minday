import type { HabitCategory, HabitColor } from '@/types';

const RULES: { re: RegExp; icon: string; category: HabitCategory; color: HabitColor }[] = [
  { re: /вод|пить|стакан/i, icon: 'GlassWater', category: 'health', color: 'sky' },
  { re: /чита|книг|страниц/i, icon: 'BookOpen', category: 'learning', color: 'amber' },
  { re: /медит|дыхан|йог|осознан/i, icon: 'Leaf', category: 'mind', color: 'violet' },
  { re: /трен|спорт|зал|отжим|присед|пресс/i, icon: 'Dumbbell', category: 'fitness', color: 'coral' },
  { re: /бег|шаг|прогул|ходьб/i, icon: 'Footprints', category: 'fitness', color: 'green' },
  { re: /вело/i, icon: 'Bike', category: 'fitness', color: 'teal' },
  { re: /сон|спать|лечь|подъём|подъем/i, icon: 'Moon', category: 'health', color: 'violet' },
  { re: /англ|язык|слов/i, icon: 'Languages', category: 'learning', color: 'sky' },
  { re: /код|програм/i, icon: 'Code', category: 'productivity', color: 'teal' },
  { re: /дневник|писа|журнал/i, icon: 'PenLine', category: 'mind', color: 'rose' },
  { re: /витамин|таблет/i, icon: 'Pill', category: 'health', color: 'green' },
  { re: /деньг|бюджет|расход|сбереж/i, icon: 'Wallet', category: 'finance', color: 'amber' },
  { re: /музык|гитар|пиани/i, icon: 'Music', category: 'other', color: 'rose' },
  { re: /овощ|фрукт|салат|еда|сахар/i, icon: 'Salad', category: 'health', color: 'green' },
];

/** Подбирает иконку, категорию и цвет по названию привычки. */
export function guessHabitLook(name: string): { icon: string; category: HabitCategory; color: HabitColor } {
  const rule = RULES.find((r) => r.re.test(name));
  return rule ? { icon: rule.icon, category: rule.category, color: rule.color } : { icon: 'Sparkles', category: 'other', color: 'violet' };
}
