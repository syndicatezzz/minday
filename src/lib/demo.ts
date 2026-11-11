import type { AppData, DateKey, Habit, HabitEntry, Reminder, Schedule, Settings } from '@/types';
import { addDays, rangeKeys, weekdayOf } from '@/lib/date';
import { EPOCH, entryKey } from '@/lib/habits/schedule';
import { createEmptyData } from '@/lib/storage/schema';

/** Детерминированный генератор, чтобы демо выглядело одинаково. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface DemoHabit {
  name: string;
  description: string;
  icon: string;
  color: Habit['color'];
  category: Habit['category'];
  schedule: Schedule;
  time: string | null;
  target: number;
  probability: number;
  startOffset: number;
  doneToday: boolean;
  reminder?: string;
}

const DEMO: DemoHabit[] = [
  {
    name: 'Стакан воды утром',
    description: 'Сразу после пробуждения, до кофе',
    icon: 'GlassWater',
    color: 'sky',
    category: 'health',
    schedule: { type: 'daily' },
    time: '07:30',
    target: 1,
    probability: 0.9,
    startOffset: 84,
    doneToday: true,
    reminder: '07:30',
  },
  {
    name: 'Медитация',
    description: '10 минут тишины и дыхания',
    icon: 'Leaf',
    color: 'violet',
    category: 'mind',
    schedule: { type: 'daily' },
    time: '08:00',
    target: 1,
    probability: 0.74,
    startOffset: 84,
    doneToday: true,
  },
  {
    name: 'Чтение',
    description: '20 страниц нехудожественной книги',
    icon: 'BookOpen',
    color: 'amber',
    category: 'learning',
    schedule: { type: 'daily' },
    time: '21:30',
    target: 1,
    probability: 0.68,
    startOffset: 70,
    doneToday: false,
    reminder: '21:15',
  },
  {
    name: 'Тренировка',
    description: 'Силовая или функциональная',
    icon: 'Dumbbell',
    color: 'coral',
    category: 'fitness',
    schedule: { type: 'weekdays', days: [1, 3, 5] },
    time: '18:30',
    target: 1,
    probability: 0.8,
    startOffset: 84,
    doneToday: false,
  },
  {
    name: '8 стаканов воды',
    description: 'Отмечайте каждый стакан',
    icon: 'Droplets',
    color: 'teal',
    category: 'health',
    schedule: { type: 'daily' },
    time: null,
    target: 8,
    probability: 0.6,
    startOffset: 40,
    doneToday: false,
  },
  {
    name: 'Прогулка 8 000 шагов',
    description: 'Без телефона в руках',
    icon: 'Footprints',
    color: 'green',
    category: 'fitness',
    schedule: { type: 'weekly', timesPerWeek: 4 },
    time: null,
    target: 1,
    probability: 0.62,
    startOffset: 56,
    doneToday: false,
  },
  {
    name: 'Без соцсетей до обеда',
    description: 'Утро — для важного',
    icon: 'Target',
    color: 'rose',
    category: 'productivity',
    schedule: { type: 'weekdays', days: [1, 2, 3, 4, 5] },
    time: '09:00',
    target: 1,
    probability: 0.58,
    startOffset: 63,
    doneToday: true,
  },
];

export function buildDemoData(today: DateKey, baseSettings: Settings): AppData {
  const rand = mulberry32(20241107);
  const data = createEmptyData();
  data.settings = { ...baseSettings };
  data.meta = { onboarded: true, dismissedHints: [], createdAt: new Date().toISOString(), celebratedOn: null };
  const now = new Date().toISOString();

  DEMO.forEach((d, i) => {
    const id = `demo_h${i + 1}`;
    const startDate = addDays(today, -d.startOffset);
    const habit: Habit = {
      id,
      name: d.name,
      description: d.description,
      icon: d.icon,
      color: d.color,
      category: d.category,
      schedules: [{ from: EPOCH, schedule: d.schedule }],
      time: d.time,
      targetPerDay: d.target,
      startDate,
      pauses: [],
      archivedOn: null,
      createdAt: `${startDate}T08:00:00.000Z`,
      updatedAt: now,
      order: i,
    };
    data.habits[id] = habit;

    // Постепенный рост стабильности со временем — так графики выглядят живо.
    const days = rangeKeys(startDate, addDays(today, -1));
    let weekCount = 0;
    days.forEach((day, idx) => {
      const progress = idx / Math.max(1, days.length);
      const p = Math.min(0.97, d.probability * (0.82 + progress * 0.3));
      const wd = weekdayOf(day);
      if (d.schedule.type === 'weekdays' && !d.schedule.days.includes(wd)) return;
      if (d.schedule.type === 'weekly') {
        if (wd === 1) weekCount = 0;
        if (weekCount >= d.schedule.timesPerWeek || rand() > 0.62) return;
        weekCount++;
      } else if (rand() > p) {
        return;
      }
      const hh = d.time ? Number(d.time.slice(0, 2)) : 12 + Math.floor(rand() * 6);
      const mm = Math.floor(rand() * 50);
      const entry: HabitEntry = {
        id: `demo_e${i}_${day}`,
        habitId: id,
        date: day,
        status: 'completed',
        count: d.target,
        completedAt: `${day}T${String(Math.max(0, hh - 7)).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00.000Z`,
        updatedAt: now,
      };
      data.entries[entryKey(id, day)] = entry;
    });

    if (d.doneToday) {
      data.entries[entryKey(id, today)] = {
        id: `demo_e${i}_${today}`,
        habitId: id,
        date: today,
        status: 'completed',
        count: d.target,
        completedAt: now,
        updatedAt: now,
      };
    } else if (d.target > 1) {
      data.entries[entryKey(id, today)] = {
        id: `demo_e${i}_${today}`,
        habitId: id,
        date: today,
        status: 'pending',
        count: 3,
        completedAt: null,
        updatedAt: now,
      };
    }

    if (d.reminder) {
      const rid = `demo_r${i + 1}`;
      const reminder: Reminder = { id: rid, habitId: id, time: d.reminder, days: 'schedule', enabled: true, createdAt: now };
      data.reminders[rid] = reminder;
    }
  });

  return data;
}
