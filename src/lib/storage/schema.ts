import type {
  AppData,
  Habit,
  HabitCategory,
  HabitColor,
  HabitEntry,
  Reminder,
  Schedule,
  ScheduleVersion,
  Settings,
  Weekday,
  WeeklyReview,
} from '@/types';
import { isDateKey, isTimeString } from '@/lib/date';
import { EPOCH, entryKey } from '@/lib/habits/schedule';
import { HABIT_CATEGORIES, HABIT_COLORS } from '@/lib/habits/meta';
import { APP_CONFIG } from '@/config/app';

export const SCHEMA_VERSION = 1 as const;

export function defaultSettings(): Settings {
  return {
    userName: '',
    theme: 'dark',
    timeZone: 'auto',
    timeFormat: '24h',
    weekStartsOn: 1,
    dayStartHour: 0,
    notificationsEnabled: false,
    skipCompletedReminders: true,
    inAppReminders: true,
    soundEnabled: false,
    hapticsEnabled: true,
    timerSound: true,
  };
}

export function createEmptyData(): AppData {
  return {
    version: SCHEMA_VERSION,
    habits: {},
    entries: {},
    reminders: {},
    reviews: {},
    settings: defaultSettings(),
    meta: { onboarded: false, dismissedHints: [], createdAt: new Date().toISOString(), celebratedOn: null },
  };
}

/* ------------------------------------------------------------------ */
/* Валидация и нормализация (используется при загрузке и импорте)     */
/* ------------------------------------------------------------------ */

export class DataValidationError extends Error {}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const isWeekday = (v: unknown): v is Weekday => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 6;

function normalizeSchedule(v: unknown): Schedule {
  if (!isObj(v)) return { type: 'daily' };
  if (v.type === 'weekdays' && Array.isArray(v.days)) {
    const days = [...new Set(v.days.filter(isWeekday))];
    return days.length ? { type: 'weekdays', days } : { type: 'daily' };
  }
  if (v.type === 'weekly') {
    const n = Number(v.timesPerWeek);
    return { type: 'weekly', timesPerWeek: Number.isFinite(n) ? Math.min(7, Math.max(1, Math.round(n))) : 3 };
  }
  return { type: 'daily' };
}

function normalizeHabit(id: string, v: unknown, index: number): Habit | null {
  if (!isObj(v)) return null;
  const name = str(v.name).trim().slice(0, 80);
  if (!name) return null;
  const startDate = isDateKey(v.startDate) ? v.startDate : new Date().toISOString().slice(0, 10);
  const schedules: ScheduleVersion[] = Array.isArray(v.schedules)
    ? v.schedules
        .filter(isObj)
        .map((s) => ({ from: isDateKey(s.from) ? s.from : EPOCH, schedule: normalizeSchedule(s.schedule) }))
        .sort((a, b) => a.from.localeCompare(b.from))
    : [];
  if (!schedules.length) schedules.push({ from: EPOCH, schedule: normalizeSchedule(v.schedule) });
  const pauses = Array.isArray(v.pauses)
    ? v.pauses
        .filter(isObj)
        .filter((p) => isDateKey(p.from))
        .map((p) => ({ from: p.from as string, to: isDateKey(p.to) ? p.to : null }))
    : [];
  const color = HABIT_COLORS.some((c) => c.id === v.color) ? (v.color as HabitColor) : 'violet';
  const category = HABIT_CATEGORIES.some((c) => c.id === v.category) ? (v.category as HabitCategory) : 'other';
  const now = new Date().toISOString();
  const target = Number(v.targetPerDay);
  return {
    id,
    name,
    description: str(v.description).slice(0, 240),
    icon: str(v.icon, 'Sparkles'),
    color,
    category,
    schedules,
    time: isTimeString(v.time) ? v.time : null,
    targetPerDay: Number.isFinite(target) ? Math.min(50, Math.max(1, Math.round(target))) : 1,
    startDate,
    pauses,
    archivedOn: isDateKey(v.archivedOn) ? v.archivedOn : null,
    createdAt: str(v.createdAt, now),
    updatedAt: str(v.updatedAt, now),
    order: Number.isFinite(Number(v.order)) ? Number(v.order) : index,
  };
}

function normalizeEntry(v: unknown, habits: Record<string, Habit>): HabitEntry | null {
  if (!isObj(v)) return null;
  const habitId = str(v.habitId);
  if (!habits[habitId] || !isDateKey(v.date)) return null;
  const status = v.status === 'completed' || v.status === 'missed' || v.status === 'pending' ? v.status : null;
  if (!status) return null;
  const count = Number(v.count);
  return {
    id: str(v.id) || entryKey(habitId, v.date),
    habitId,
    date: v.date,
    status,
    count: Number.isFinite(count) ? Math.max(0, Math.round(count)) : status === 'completed' ? 1 : 0,
    completedAt: typeof v.completedAt === 'string' ? v.completedAt : null,
    updatedAt: str(v.updatedAt, new Date().toISOString()),
  };
}

function normalizeReminder(id: string, v: unknown, habits: Record<string, Habit>): Reminder | null {
  if (!isObj(v)) return null;
  const habitId = str(v.habitId);
  if (!habits[habitId] || !isTimeString(v.time)) return null;
  const days =
    v.days === 'schedule'
      ? 'schedule'
      : Array.isArray(v.days)
        ? [...new Set(v.days.filter(isWeekday))]
        : 'schedule';
  return {
    id,
    habitId,
    time: v.time,
    days: Array.isArray(days) && days.length === 0 ? 'schedule' : days,
    enabled: v.enabled !== false,
    createdAt: str(v.createdAt, new Date().toISOString()),
  };
}

function normalizeSettings(v: unknown): Settings {
  const d = defaultSettings();
  if (!isObj(v)) return d;
  const hour = Number(v.dayStartHour);
  return {
    userName: str(v.userName).slice(0, 40),
    theme: v.theme === 'light' || v.theme === 'system' || v.theme === 'dark' ? v.theme : d.theme,
    timeZone: str(v.timeZone, 'auto') || 'auto',
    timeFormat: v.timeFormat === '12h' ? '12h' : '24h',
    weekStartsOn: v.weekStartsOn === 0 ? 0 : 1,
    dayStartHour: Number.isFinite(hour) ? Math.min(5, Math.max(0, Math.round(hour))) : 0,
    notificationsEnabled: v.notificationsEnabled === true,
    skipCompletedReminders: v.skipCompletedReminders !== false,
    inAppReminders: v.inAppReminders !== false,
    soundEnabled: v.soundEnabled === true,
    hapticsEnabled: v.hapticsEnabled !== false,
    timerSound: v.timerSound !== false,
  };
}

/**
 * Приводит произвольный JSON к корректной структуре AppData.
 * Некорректные записи отбрасываются, дубликаты выполнений схлопываются
 * по ключу «привычка + дата».
 */
export function parseAppData(input: unknown): AppData {
  let raw = input;
  if (isObj(raw) && isObj(raw.data) && raw.app === APP_CONFIG.name) raw = raw.data;
  if (isObj(raw) && isObj(raw.data) && !isObj(raw.habits)) raw = raw.data;
  if (!isObj(raw)) throw new DataValidationError('Файл не похож на резервную копию приложения');
  if (!isObj(raw.habits)) throw new DataValidationError('В файле нет списка привычек');
  if (raw.version !== undefined && Number(raw.version) > SCHEMA_VERSION) {
    throw new DataValidationError('Файл создан более новой версией приложения');
  }

  const habits: Record<string, Habit> = {};
  Object.entries(raw.habits).forEach(([id, h], i) => {
    const habit = normalizeHabit(str(isObj(h) ? h.id : '', id) || id, h, i);
    if (habit) habits[habit.id] = habit;
  });

  const entries: Record<string, HabitEntry> = {};
  const entrySource = isObj(raw.entries) ? Object.values(raw.entries) : Array.isArray(raw.entries) ? raw.entries : [];
  for (const e of entrySource) {
    const entry = normalizeEntry(e, habits);
    if (entry) entries[entryKey(entry.habitId, entry.date)] = entry;
  }

  const reminders: Record<string, Reminder> = {};
  if (isObj(raw.reminders)) {
    for (const [id, r] of Object.entries(raw.reminders)) {
      const rem = normalizeReminder(id, r, habits);
      if (rem) reminders[rem.id] = rem;
    }
  }

  const reviews: Record<string, WeeklyReview> = {};
  if (isObj(raw.reviews)) {
    for (const r of Object.values(raw.reviews)) {
      if (!isObj(r) || !isDateKey(r.weekStart)) continue;
      const rating = Number(r.rating);
      reviews[r.weekStart] = {
        weekStart: r.weekStart,
        rating: Number.isFinite(rating) ? Math.min(5, Math.max(0, Math.round(rating))) : 0,
        wins: str(r.wins).slice(0, 1000),
        improve: str(r.improve).slice(0, 1000),
        updatedAt: str(r.updatedAt, new Date().toISOString()),
      };
    }
  }

  const meta = isObj(raw.meta) ? raw.meta : {};
  return {
    version: SCHEMA_VERSION,
    habits,
    entries,
    reminders,
    reviews,
    settings: normalizeSettings(raw.settings),
    meta: {
      onboarded: meta.onboarded === true || Object.keys(habits).length > 0,
      dismissedHints: Array.isArray(meta.dismissedHints) ? meta.dismissedHints.filter((x): x is string => typeof x === 'string') : [],
      createdAt: str(meta.createdAt, new Date().toISOString()),
      celebratedOn: isDateKey(meta.celebratedOn) ? meta.celebratedOn : null,
    },
  };
}

export function buildBackup(data: AppData) {
  return {
    app: APP_CONFIG.name,
    exportedAt: new Date().toISOString(),
    schemaVersion: SCHEMA_VERSION,
    data,
  };
}
