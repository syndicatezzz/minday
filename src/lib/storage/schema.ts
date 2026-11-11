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
  Appearance,
  AppMeta,
  DashboardWidget,
  FocusSession,
  Goal,
  GoalEvent,
  HabitKind,
  JournalEntry,
  Routine,
} from '@/types';
import { createId } from '@/lib/id';
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
    appearance: defaultAppearance(),
  };
}

export const DASHBOARD_WIDGETS: DashboardWidget[] = ['streak', 'week', 'review', 'goals', 'focus', 'journal', 'last7', 'quote'];

export function defaultAppearance(): Appearance {
  return {
    accent: 'violet',
    blur: 'medium',
    surface: 'glass',
    density: 'comfortable',
    motion: 'full',
    calendarStyle: 'tinted',
    dashboard: DASHBOARD_WIDGETS.map((widget) => ({ widget, visible: true })),
  };
}

function normalizeAppearance(v: unknown): Appearance {
  const d = defaultAppearance();
  if (!isObj(v)) return d;
  const pick = <T extends string>(val: unknown, allowed: readonly T[], fallback: T): T =>
    allowed.includes(val as T) ? (val as T) : fallback;
  const seen = new Set<DashboardWidget>();
  const dashboard: Appearance['dashboard'] = [];
  if (Array.isArray(v.dashboard)) {
    for (const w of v.dashboard) {
      if (isObj(w) && DASHBOARD_WIDGETS.includes(w.widget as DashboardWidget) && !seen.has(w.widget as DashboardWidget)) {
        seen.add(w.widget as DashboardWidget);
        dashboard.push({ widget: w.widget as DashboardWidget, visible: w.visible !== false });
      }
    }
  }
  for (const w of DASHBOARD_WIDGETS) if (!seen.has(w)) dashboard.push({ widget: w, visible: true });
  return {
    accent: pick(v.accent, ['violet', 'sky', 'teal', 'rose', 'amber', 'silver'] as const, d.accent),
    blur: pick(v.blur, ['low', 'medium', 'high'] as const, d.blur),
    surface: pick(v.surface, ['glass', 'frosted', 'solid'] as const, d.surface),
    density: pick(v.density, ['comfortable', 'compact'] as const, d.density),
    motion: pick(v.motion, ['full', 'reduced', 'off'] as const, d.motion),
    calendarStyle: pick(v.calendarStyle, ['tinted', 'dots', 'rings'] as const, d.calendarStyle),
    dashboard,
  };
}

export function defaultMeta(): AppMeta {
  return {
    onboarded: false,
    dismissedHints: [],
    createdAt: new Date().toISOString(),
    celebratedOn: null,
    recovery: null,
    recoveryDismissedOn: null,
    revision: 0,
    deviceId: createId('dev'),
  };
}

export function createEmptyData(): AppData {
  return {
    version: SCHEMA_VERSION,
    habits: {},
    entries: {},
    reminders: {},
    reviews: {},
    routines: {},
    goals: {},
    journal: {},
    focusSessions: {},
    dayOrder: {},
    settings: defaultSettings(),
    meta: defaultMeta(),
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
  const targetValue = Number.isFinite(target) ? Math.min(100000, Math.max(1, Math.round(target * 100) / 100)) : 1;
  const kinds: HabitKind[] = ['check', 'count', 'duration', 'numeric', 'sessions'];
  const kind: HabitKind = kinds.includes(v.kind as HabitKind) ? (v.kind as HabitKind) : targetValue > 1 ? 'count' : 'check';
  const minRaw = Number(v.minTarget);
  const minTarget = v.minTarget != null && Number.isFinite(minRaw) && minRaw > 0 && minRaw < targetValue ? minRaw : null;
  return {
    id,
    name,
    description: str(v.description).slice(0, 240),
    icon: str(v.icon, 'Sparkles'),
    color,
    category,
    schedules,
    time: isTimeString(v.time) ? v.time : null,
    targetPerDay: kind === 'check' ? 1 : targetValue,
    kind,
    unit: str(v.unit).slice(0, 12),
    minTarget: kind === 'check' ? null : minTarget,
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
  const status = v.status === 'completed' || v.status === 'missed' || v.status === 'pending' || v.status === 'moved' ? v.status : null;
  if (!status) return null;
  const count = Number(v.count);
  const entry: HabitEntry = {
    id: str(v.id) || entryKey(habitId, v.date),
    habitId,
    date: v.date,
    status,
    count: Number.isFinite(count) ? Math.max(0, Math.round(count * 100) / 100) : status === 'completed' ? 1 : 0,
    completedAt: typeof v.completedAt === 'string' ? v.completedAt : null,
    updatedAt: str(v.updatedAt, new Date().toISOString()),
  };
  if (v.extra === true) entry.extra = true;
  if (isDateKey(v.movedTo)) entry.movedTo = v.movedTo;
  if (isTimeString(v.time)) entry.time = v.time;
  return entry;
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
    appearance: normalizeAppearance(v.appearance),
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

  const ids = (v: unknown) => (Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string' && !!habits[x]))] : []);
  const colorOk = (c: unknown): HabitColor => (HABIT_COLORS.some((x) => x.id === c) ? (c as HabitColor) : 'violet');
  const nowIso = new Date().toISOString();

  const routines: Record<string, Routine> = {};
  if (isObj(raw.routines)) {
    Object.entries(raw.routines).forEach(([id, r], i) => {
      if (!isObj(r) || !str(r.name).trim()) return;
      routines[id] = {
        id,
        name: str(r.name).trim().slice(0, 60),
        icon: str(r.icon, 'Sun'),
        color: colorOk(r.color),
        habitIds: ids(r.habitIds),
        createdAt: str(r.createdAt, nowIso),
        updatedAt: str(r.updatedAt, nowIso),
        order: Number.isFinite(Number(r.order)) ? Number(r.order) : i,
      };
    });
  }

  const goals: Record<string, Goal> = {};
  if (isObj(raw.goals)) {
    for (const [id, g] of Object.entries(raw.goals)) {
      if (!isObj(g) || !str(g.name).trim()) continue;
      const startDate = isDateKey(g.startDate) ? g.startDate : str(g.createdAt, nowIso).slice(0, 10);
      goals[id] = {
        id,
        name: str(g.name).trim().slice(0, 80),
        description: str(g.description).slice(0, 500),
        color: colorOk(g.color),
        icon: str(g.icon, 'Target'),
        startDate: isDateKey(startDate) ? startDate : nowIso.slice(0, 10),
        targetDate: isDateKey(g.targetDate) ? g.targetDate : null,
        habitIds: ids(g.habitIds),
        achievedOn: isDateKey(g.achievedOn) ? g.achievedOn : null,
        history: Array.isArray(g.history)
          ? g.history
              .filter(isObj)
              .filter((e) => isDateKey(e.date) && ['created', 'updated', 'achieved', 'reopened'].includes(String(e.type)))
              .map((e) => ({ date: e.date as string, type: e.type as GoalEvent['type'], note: typeof e.note === 'string' ? e.note.slice(0, 200) : undefined }))
          : [],
        createdAt: str(g.createdAt, nowIso),
        updatedAt: str(g.updatedAt, nowIso),
      };
    }
  }

  const journal: Record<string, JournalEntry> = {};
  if (isObj(raw.journal)) {
    for (const j of Object.values(raw.journal)) {
      if (!isObj(j) || !isDateKey(j.date)) continue;
      const mood = Number(j.mood);
      journal[j.date] = {
        date: j.date,
        mood: Number.isFinite(mood) ? Math.min(5, Math.max(0, Math.round(mood))) : 0,
        note: str(j.note).slice(0, 5000),
        reflection: str(j.reflection).slice(0, 2000),
        updatedAt: str(j.updatedAt, nowIso),
      };
    }
  }

  const focusSessions: Record<string, FocusSession> = {};
  if (isObj(raw.focusSessions)) {
    for (const [id, f] of Object.entries(raw.focusSessions)) {
      if (!isObj(f) || !isDateKey(f.date)) continue;
      const planned = Number(f.plannedMs);
      const actual = Number(f.actualMs);
      if (!Number.isFinite(actual) || actual <= 0) continue;
      focusSessions[id] = {
        id,
        habitId: typeof f.habitId === 'string' && habits[f.habitId] ? f.habitId : null,
        date: f.date,
        startedAt: str(f.startedAt, nowIso),
        plannedMs: Number.isFinite(planned) ? planned : actual,
        actualMs: actual,
        completed: f.completed === true,
      };
    }
  }

  const dayOrder: Record<string, string[]> = {};
  if (isObj(raw.dayOrder)) {
    for (const [d, list] of Object.entries(raw.dayOrder)) if (isDateKey(d)) dayOrder[d] = ids(list);
  }

  const meta = isObj(raw.meta) ? raw.meta : {};
  const rec = isObj(meta.recovery) ? meta.recovery : null;
  const dm = defaultMeta();
  return {
    version: SCHEMA_VERSION,
    habits,
    entries,
    reminders,
    reviews,
    routines,
    goals,
    journal,
    focusSessions,
    dayOrder,
    settings: normalizeSettings(raw.settings),
    meta: {
      onboarded: meta.onboarded === true || Object.keys(habits).length > 0,
      dismissedHints: Array.isArray(meta.dismissedHints) ? meta.dismissedHints.filter((x): x is string => typeof x === 'string') : [],
      createdAt: str(meta.createdAt, nowIso),
      celebratedOn: isDateKey(meta.celebratedOn) ? meta.celebratedOn : null,
      recovery:
        rec && isDateKey(rec.startedOn)
          ? {
              startedOn: rec.startedOn,
              habitIds: ids(rec.habitIds),
              pausedIds: ids(rec.pausedIds),
              targetDays: Number.isFinite(Number(rec.targetDays)) ? Math.min(30, Math.max(3, Number(rec.targetDays))) : 7,
            }
          : null,
      recoveryDismissedOn: isDateKey(meta.recoveryDismissedOn) ? meta.recoveryDismissedOn : null,
      revision: Number.isFinite(Number(meta.revision)) ? Number(meta.revision) : 0,
      deviceId: str(meta.deviceId) || dm.deviceId,
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
