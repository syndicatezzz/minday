import type {
  AppData,
  DataMode,
  DateKey,
  Habit,
  HabitEntry,
  HabitInput,
  Reminder,
  Settings,
  Weekday,
  WeeklyReview,
  Appearance,
  FocusSession,
  Goal,
  JournalEntry,
  Routine,
} from '@/types';
import { createStore, useStore } from './create-store';
import { storage, THEME_KEY } from '@/lib/storage/adapter';
import { createEmptyData, parseAppData } from '@/lib/storage/schema';
import { mergeAppData } from '@/lib/storage/merge';
import { clearSnapshots, takeDailySnapshot } from '@/lib/storage/snapshots';
import { EPOCH, entryKey, isCompleted, sameSchedule, scheduleAt } from '@/lib/habits/schedule';
import { addDays } from '@/lib/date';
import { completionThreshold, entryValue } from '@/lib/habits/values';
import { createId } from '@/lib/id';
import { buildDemoData } from '@/lib/demo';
import { guessHabitLook } from '@/lib/habits/guess';
import { computeToday } from '@/lib/today';

export interface AppState {
  status: 'loading' | 'ready' | 'error';
  mode: DataMode;
  data: AppData;
  error: string | null;
  saveError: string | null;
}

export const appStore = createStore<AppState>({
  status: 'loading',
  mode: 'real',
  data: createEmptyData(),
  error: null,
  saveError: null,
});

export function useApp<U>(selector: (s: AppState) => U): U {
  return useStore(appStore, selector);
}

/* ------------------------------------------------------------------ */
/* Загрузка и сохранение                                               */
/* ------------------------------------------------------------------ */

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let lastSaved: AppData | null = null;
let initialized = false;

async function flushSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = null;
  const { data, mode, status } = appStore.get();
  if (status !== 'ready' || data === lastSaved) return;
  try {
    await storage.save(mode, data);
    lastSaved = data;
    if (appStore.get().saveError) appStore.set({ saveError: null });
  } catch (e) {
    appStore.set({ saveError: e instanceof Error ? e.message : 'Ошибка сохранения' });
  }
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(flushSave, 150);
}

async function loadMode(mode: DataMode): Promise<AppData> {
  const raw = await storage.load(mode);
  return raw ? parseAppData(raw) : createEmptyData();
}

export async function initAppStore(): Promise<void> {
  if (initialized) return;
  initialized = true;
  appStore.subscribe(() => {
    const s = appStore.get();
    if (s.status === 'ready' && s.data !== lastSaved) scheduleSave();
  });
  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', () => void flushSave());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') void flushSave();
    });
    storage.subscribe(async (mode) => {
      if (mode !== appStore.get().mode) return;
      try {
        const remote = await loadMode(mode);
        const local = appStore.get().data;
        // Если в этой вкладке есть несохранённые правки — сливаем по записям
        const data = local !== lastSaved ? mergeAppData(local, remote) : remote;
        lastSaved = data === remote ? remote : null;
        appStore.set({ data });
      } catch {
        /* другая вкладка записала некорректные данные — игнорируем */
      }
    });
  }
  try {
    const mode = storage.getActiveMode();
    const data = await loadMode(mode);
    lastSaved = data;
    appStore.set({ status: 'ready', mode, data, error: null });
    if (mode === 'real') takeDailySnapshot(data, computeToday(data.settings));
  } catch (e) {
    appStore.set({ status: 'error', error: e instanceof Error ? e.message : 'Не удалось загрузить данные' });
  }
}

/* ------------------------------------------------------------------ */
/* Утилиты изменения состояния                                         */
/* ------------------------------------------------------------------ */

function update(fn: (data: AppData) => AppData) {
  appStore.set((s) => {
    const next = fn(s.data);
    if (next === s.data) return s;
    return { ...s, data: { ...next, meta: { ...next.meta, revision: next.meta.revision + 1 } } };
  });
}

function today(): DateKey {
  return computeToday(appStore.get().data.settings);
}

const nowIso = () => new Date().toISOString();

function patchHabit(data: AppData, id: string, patch: Partial<Habit>): AppData {
  const h = data.habits[id];
  if (!h) return data;
  return { ...data, habits: { ...data.habits, [id]: { ...h, ...patch, updatedAt: nowIso() } } };
}

function resumeIn(d: AppData, id: string, t: DateKey): AppData {
  const h = d.habits[id];
  if (!h) return d;
  const pauses = h.pauses
    .map((p) => (p.to === null ? { ...p, to: p.from > t ? p.from : t } : p))
    .filter((p) => p.to === null || p.from < p.to);
  return patchHabit(d, id, { pauses });
}

function setEntry(data: AppData, entry: HabitEntry | null, habitId: string, date: DateKey): AppData {
  const key = entryKey(habitId, date);
  const entries = { ...data.entries };
  if (entry) entries[key] = entry;
  else delete entries[key];
  return { ...data, entries };
}

function primaryReminder(data: AppData, habitId: string): Reminder | undefined {
  return Object.values(data.reminders)
    .filter((r) => r.habitId === habitId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
}


/* ---------- помощники записей ---------- */

function base(existing: HabitEntry | undefined, habitId: string, date: DateKey): HabitEntry {
  const e: HabitEntry = {
    id: existing?.id ?? createId('e'),
    habitId,
    date,
    status: 'pending',
    count: 0,
    completedAt: null,
    updatedAt: nowIso(),
  };
  if (existing?.extra) e.extra = true;
  if (existing?.time) e.time = existing.time;
  return e;
}

/** Запись без результата, но сохраняющая перенос времени/дополнительный день; иначе — удаление. */
function resetEntry(existing: HabitEntry): HabitEntry | null {
  const e = { ...base(existing, existing.habitId, existing.date) };
  return isEmptyEntry(e) ? null : e;
}

function isEmptyEntry(e: HabitEntry): boolean {
  return e.status === 'pending' && e.count === 0 && !e.extra && !e.time;
}

function withValue(h: Habit, existing: HabitEntry | undefined, habitId: string, date: DateKey, value: number): HabitEntry | null {
  const rounded = Math.round(value * 100) / 100;
  if (rounded <= 0) return existing ? resetEntry(existing) : null;
  const done = rounded >= completionThreshold(h);
  return {
    ...base(existing, habitId, date),
    status: done ? 'completed' : 'pending',
    count: rounded,
    completedAt: done ? (existing?.status === 'completed' && existing.completedAt) || nowIso() : null,
  };
}

function undoMoveIn(d: AppData, habitId: string, date: DateKey): AppData {
  const moved = d.entries[entryKey(habitId, date)];
  let next = setEntry(d, moved ? resetEntry({ ...moved, status: 'pending', movedTo: undefined }) : null, habitId, date);
  if (moved?.movedTo) {
    const extra = next.entries[entryKey(habitId, moved.movedTo)];
    if (extra?.extra) {
      const cleaned: HabitEntry = { ...extra };
      delete cleaned.extra;
      next = setEntry(next, isEmptyEntry(cleaned) ? null : cleaned, habitId, moved.movedTo);
    }
  }
  return next;
}

export interface HabitSnapshot {
  habit: Habit;
  entries: HabitEntry[];
  reminders: Reminder[];
  routineIds: string[];
  goalIds: string[];
  focusIds: string[];
}

/* ------------------------------------------------------------------ */
/* Действия                                                            */
/* ------------------------------------------------------------------ */

export const actions = {
  /* ---------- онбординг и режимы ---------- */

  completeOnboarding(userName: string, withDemo: boolean) {
    update((d) => ({
      ...d,
      settings: { ...d.settings, userName: userName.trim().slice(0, 40) },
      meta: { ...d.meta, onboarded: true },
    }));
    if (withDemo) void actions.enterDemo();
  },

  /** Демо-данные хранятся отдельно и никогда не смешиваются с реальными. */
  async enterDemo() {
    await flushSave();
    const real = appStore.get().data;
    const demo = buildDemoData(computeToday(real.settings), real.settings);
    storage.setActiveMode('demo');
    lastSaved = null;
    appStore.set({ mode: 'demo', data: demo });
    await flushSave();
  },

  async exitDemo() {
    await storage.clear('demo');
    storage.setActiveMode('real');
    const real = await loadMode('real');
    const merged: AppData = { ...real, meta: { ...real.meta, onboarded: true } };
    lastSaved = null;
    appStore.set({ mode: 'real', data: merged });
    await flushSave();
  },

  /* ---------- привычки ---------- */

  createHabit(input: HabitInput): string {
    const id = createId('h');
    const now = nowIso();
    update((d) => {
      const order = Math.max(0, ...Object.values(d.habits).map((h) => h.order + 1));
      const habit: Habit = {
        id,
        name: input.name.trim(),
        description: input.description.trim(),
        icon: input.icon,
        color: input.color,
        category: input.category,
        schedules: [{ from: EPOCH, schedule: input.schedule }],
        time: input.time,
        targetPerDay: input.kind === 'check' ? 1 : input.targetPerDay,
        kind: input.kind,
        unit: input.unit.trim(),
        minTarget: input.kind === 'check' ? null : input.minTarget,
        startDate: input.startDate,
        pauses: [],
        archivedOn: null,
        createdAt: now,
        updatedAt: now,
        order,
      };
      let next: AppData = { ...d, habits: { ...d.habits, [id]: habit } };
      if (input.reminderEnabled && input.reminderTime) {
        const rid = createId('r');
        next = {
          ...next,
          reminders: {
            ...next.reminders,
            [rid]: { id: rid, habitId: id, time: input.reminderTime, days: 'schedule', enabled: true, createdAt: now },
          },
        };
      }
      return next;
    });
    return id;
  },

  /**
   * Редактирование не трогает историю выполнений. Изменение расписания
   * создаёт новую версию, действующую с сегодняшнего дня, поэтому прошлые
   * дни продолжают оцениваться по старому расписанию.
   */
  updateHabit(id: string, input: HabitInput) {
    const t = today();
    update((d) => {
      const habit = d.habits[id];
      if (!habit) return d;
      let schedules = habit.schedules;
      if (!sameSchedule(scheduleAt(habit, t), input.schedule)) {
        if (habit.startDate >= t && input.startDate >= t) {
          // У привычки ещё нет прошедших дней — расписание можно заменить целиком.
          schedules = [{ from: EPOCH, schedule: input.schedule }];
        } else {
          const kept = habit.schedules.filter((v) => v.from < t);
          schedules = [...kept, { from: t, schedule: input.schedule }];
        }
      }
      let next = patchHabit(d, id, {
        name: input.name.trim(),
        description: input.description.trim(),
        icon: input.icon,
        color: input.color,
        category: input.category,
        time: input.time,
        targetPerDay: input.kind === 'check' ? 1 : input.targetPerDay,
        kind: input.kind,
        unit: input.unit.trim(),
        minTarget: input.kind === 'check' ? null : input.minTarget,
        startDate: input.startDate,
        schedules,
      });

      // Основное напоминание привычки
      const primary = primaryReminder(next, id);
      if (input.reminderEnabled && input.reminderTime) {
        const rem: Reminder = primary
          ? { ...primary, time: input.reminderTime, enabled: true }
          : { id: createId('r'), habitId: id, time: input.reminderTime, days: 'schedule', enabled: true, createdAt: nowIso() };
        next = { ...next, reminders: { ...next.reminders, [rem.id]: rem } };
      } else if (primary && primary.enabled) {
        next = { ...next, reminders: { ...next.reminders, [primary.id]: { ...primary, enabled: false } } };
      }

      // При изменении цели пересчитываем только сегодняшнюю запись — прошлое не меняется.
      const updated = next.habits[id];
      if (updated && (input.targetPerDay !== habit.targetPerDay || input.minTarget !== habit.minTarget || input.kind !== habit.kind)) {
        const e = next.entries[entryKey(id, t)];
        if (e && (e.status === 'completed' || e.status === 'pending') && e.count > 0) {
          const value = input.kind === 'check' ? Math.min(1, e.count) : e.count;
          next = setEntry(next, withValue(updated, e, id, t, value), id, t);
        }
      }
      return next;
    });
  },

  deleteHabit(id: string): HabitSnapshot | null {
    const d = appStore.get().data;
    const habit = d.habits[id];
    if (!habit) return null;
    const snapshot: HabitSnapshot = {
      habit,
      entries: Object.values(d.entries).filter((e) => e.habitId === id),
      reminders: Object.values(d.reminders).filter((r) => r.habitId === id),
      routineIds: Object.values(d.routines).filter((r) => r.habitIds.includes(id)).map((r) => r.id),
      goalIds: Object.values(d.goals).filter((g) => g.habitIds.includes(id)).map((g) => g.id),
      focusIds: Object.values(d.focusSessions).filter((f) => f.habitId === id).map((f) => f.id),
    };
    // Каскадное удаление: в хранилище не остаётся «осиротевших» ссылок.
    // Сессии фокуса сохраняются (время остаётся в статистике), но отвязываются от привычки.
    update((data) => {
      const habits = { ...data.habits };
      delete habits[id];
      const entries = Object.fromEntries(Object.entries(data.entries).filter(([, e]) => e.habitId !== id));
      const reminders = Object.fromEntries(Object.entries(data.reminders).filter(([, r]) => r.habitId !== id));
      const strip = <T extends { habitIds: string[] }>(rec: Record<string, T>) =>
        Object.fromEntries(Object.entries(rec).map(([k, v]) => [k, v.habitIds.includes(id) ? { ...v, habitIds: v.habitIds.filter((x) => x !== id) } : v]));
      const focusSessions = Object.fromEntries(
        Object.entries(data.focusSessions).map(([k, f]) => [k, f.habitId === id ? { ...f, habitId: null } : f]),
      );
      const recovery = data.meta.recovery
        ? { ...data.meta.recovery, habitIds: data.meta.recovery.habitIds.filter((x) => x !== id), pausedIds: data.meta.recovery.pausedIds.filter((x) => x !== id) }
        : null;
      return {
        ...data,
        habits,
        entries,
        reminders,
        routines: strip(data.routines),
        goals: strip(data.goals),
        focusSessions,
        meta: { ...data.meta, recovery },
      };
    });
    return snapshot;
  },

  restoreHabit(snapshot: HabitSnapshot) {
    update((d) => {
      const entries = { ...d.entries };
      for (const e of snapshot.entries) entries[entryKey(e.habitId, e.date)] = e;
      const reminders = { ...d.reminders };
      for (const r of snapshot.reminders) reminders[r.id] = r;
      const id = snapshot.habit.id;
      const routines = { ...d.routines };
      for (const rid of snapshot.routineIds) if (routines[rid]) routines[rid] = { ...routines[rid], habitIds: [...routines[rid].habitIds, id] };
      const goals = { ...d.goals };
      for (const gid of snapshot.goalIds) if (goals[gid]) goals[gid] = { ...goals[gid], habitIds: [...goals[gid].habitIds, id] };
      const focusSessions = { ...d.focusSessions };
      for (const fid of snapshot.focusIds) if (focusSessions[fid]) focusSessions[fid] = { ...focusSessions[fid], habitId: id };
      return { ...d, habits: { ...d.habits, [id]: snapshot.habit }, entries, reminders, routines, goals, focusSessions };
    });
  },

  pauseHabit(id: string) {
    const t = today();
    update((d) => {
      const h = d.habits[id];
      if (!h || h.pauses.some((p) => p.to === null)) return d;
      const doneToday = isCompleted(d.entries[entryKey(id, t)]);
      const from = doneToday ? addDays(t, 1) : t;
      return patchHabit(d, id, { pauses: [...h.pauses, { from, to: null }] });
    });
  },

  resumeHabit(id: string) {
    const t = today();
    update((d) => {
      const h = d.habits[id];
      if (!h) return d;
      const pauses = h.pauses
        .map((p) => (p.to === null ? { ...p, to: p.from > t ? p.from : t } : p))
        .filter((p) => p.to === null || p.from < p.to);
      return patchHabit(d, id, { pauses });
    });
  },

  archiveHabit(id: string) {
    const t = today();
    update((d) => {
      const h = d.habits[id];
      if (!h || h.archivedOn) return d;
      const doneToday = isCompleted(d.entries[entryKey(id, t)]);
      return patchHabit(d, id, { archivedOn: doneToday ? addDays(t, 1) : t });
    });
  },

  /** Период в архиве превращается в паузу, чтобы прошлые дни не стали «пропусками». */
  unarchiveHabit(id: string) {
    const t = today();
    update((d) => {
      const h = d.habits[id];
      if (!h || !h.archivedOn) return d;
      const pauses = h.archivedOn < t ? [...h.pauses, { from: h.archivedOn, to: t }] : h.pauses;
      return patchHabit(d, id, { archivedOn: null, pauses });
    });
  },

  /* ---------- отметки ---------- */

  /** Полностью отметить (основная цель) / снять отметку выполнения. */
  toggleHabit(habitId: string, date: DateKey): 'completed' | 'cleared' | null {
    if (date > today()) return null;
    let result: 'completed' | 'cleared' | null = null;
    update((d) => {
      const h = d.habits[habitId];
      if (!h) return d;
      const existing = d.entries[entryKey(habitId, date)];
      if (existing?.status === 'completed') {
        result = 'cleared';
        return setEntry(d, resetEntry(existing), habitId, date);
      }
      result = 'completed';
      return setEntry(d, withValue(h, existing, habitId, date, Math.max(h.targetPerDay, entryValue(existing))), habitId, date);
    });
    return result;
  },

  /** +1 / −1 (или шаг типа привычки) к фактическому результату. */
  stepHabit(habitId: string, date: DateKey, delta: number): 'completed' | 'progress' | 'cleared' | null {
    if (date > today()) return null;
    let result: 'completed' | 'progress' | 'cleared' | null = null;
    update((d) => {
      const h = d.habits[habitId];
      if (!h) return d;
      const existing = d.entries[entryKey(habitId, date)];
      const value = Math.max(0, entryValue(existing) + delta);
      const next = withValue(h, existing, habitId, date, value);
      result = next === null || next.count === 0 ? 'cleared' : next.status === 'completed' ? 'completed' : 'progress';
      return setEntry(d, next, habitId, date);
    });
    return result;
  },

  /** Установить фактический результат (страницы, минуты, км…). */
  setHabitValue(habitId: string, date: DateKey, value: number): 'completed' | 'progress' | 'cleared' | null {
    if (date > today()) return null;
    let result: 'completed' | 'progress' | 'cleared' | null = null;
    update((d) => {
      const h = d.habits[habitId];
      if (!h) return d;
      const existing = d.entries[entryKey(habitId, date)];
      const next = withValue(h, existing, habitId, date, Math.max(0, Math.min(100000, value)));
      result = next === null || next.count === 0 ? 'cleared' : next.status === 'completed' ? 'completed' : 'progress';
      return setEntry(d, next, habitId, date);
    });
    return result;
  },

  /** Явно отметить пропуск (например, «сегодня не получится»). */
  skipHabit(habitId: string, date: DateKey) {
    if (date > today()) return;
    update((d) => {
      const existing = d.entries[entryKey(habitId, date)];
      return setEntry(
        d,
        { ...base(existing, habitId, date), status: 'missed', count: 0, completedAt: null, updatedAt: nowIso() },
        habitId,
        date,
      );
    });
  },

  /** Убрать отметку и вернуть вычисляемый статус по умолчанию. */
  clearEntry(habitId: string, date: DateKey) {
    update((d) => {
      const existing = d.entries[entryKey(habitId, date)];
      if (existing?.status === 'moved' && existing.movedTo) return undoMoveIn(d, habitId, date);
      return setEntry(d, existing ? resetEntry(existing) : null, habitId, date);
    });
  },

  /** Перенести выполнение на завтра: сегодня не требуется, завтра — дополнительное выполнение. */
  moveToTomorrow(habitId: string, date: DateKey) {
    const to = addDays(date, 1);
    update((d) => {
      const existing = d.entries[entryKey(habitId, date)];
      let next = setEntry(
        d,
        { ...base(existing, habitId, date), status: 'moved', movedTo: to, count: 0, completedAt: null, updatedAt: nowIso() },
        habitId,
        date,
      );
      const target = next.entries[entryKey(habitId, to)];
      next = setEntry(
        next,
        target ? { ...target, extra: true, updatedAt: nowIso() } : { ...base(undefined, habitId, to), status: 'pending', count: 0, completedAt: null, updatedAt: nowIso(), extra: true },
        habitId,
        to,
      );
      return next;
    });
  },

  /** Перенести привычку на другое время в конкретный день (null — вернуть время по умолчанию). */
  rescheduleTime(habitId: string, date: DateKey, time: string | null) {
    update((d) => {
      const existing = d.entries[entryKey(habitId, date)];
      if (!existing && time === null) return d;
      const entry: HabitEntry = existing
        ? { ...existing, updatedAt: nowIso() }
        : { ...base(undefined, habitId, date), status: 'pending', count: 0, completedAt: null, updatedAt: nowIso() };
      if (time) entry.time = time;
      else delete entry.time;
      return setEntry(d, isEmptyEntry(entry) ? null : entry, habitId, date);
    });
  },

  setDayOrder(date: DateKey, ids: string[]) {
    update((d) => ({ ...d, dayOrder: { ...d.dayOrder, [date]: ids } }));
  },

  /* ---------- напоминания ---------- */

  saveReminder(input: { id?: string; habitId: string; time: string; days: 'schedule' | Weekday[]; enabled: boolean }) {
    update((d) => {
      const existing = input.id ? d.reminders[input.id] : undefined;
      const rem: Reminder = {
        id: existing?.id ?? createId('r'),
        habitId: input.habitId,
        time: input.time,
        days: Array.isArray(input.days) && input.days.length === 0 ? 'schedule' : input.days,
        enabled: input.enabled,
        createdAt: existing?.createdAt ?? nowIso(),
      };
      return { ...d, reminders: { ...d.reminders, [rem.id]: rem } };
    });
  },

  toggleReminder(id: string, enabled: boolean) {
    update((d) => {
      const r = d.reminders[id];
      return r ? { ...d, reminders: { ...d.reminders, [id]: { ...r, enabled } } } : d;
    });
  },

  deleteReminder(id: string): Reminder | null {
    const r = appStore.get().data.reminders[id] ?? null;
    update((d) => {
      const reminders = { ...d.reminders };
      delete reminders[id];
      return { ...d, reminders };
    });
    return r;
  },

  restoreReminder(r: Reminder) {
    update((d) => (d.habits[r.habitId] ? { ...d, reminders: { ...d.reminders, [r.id]: r } } : d));
  },

  /** Новый порядок привычек после drag-and-drop. */
  reorderHabits(orderedIds: string[]) {
    update((d) => {
      const habits = { ...d.habits };
      orderedIds.forEach((id, i) => {
        if (habits[id] && habits[id].order !== i) habits[id] = { ...habits[id], order: i };
      });
      return { ...d, habits };
    });
  },

  /** Быстрое добавление: ежедневная привычка без времени, с иконкой по ключевым словам. */
  quickAddHabit(name: string): string | null {
    const clean = name.trim().slice(0, 60);
    if (!clean) return null;
    return actions.createHabit({
      name: clean,
      description: '',
      ...guessHabitLook(clean),
      schedule: { type: 'daily' },
      time: null,
      targetPerDay: 1,
      kind: 'check',
      unit: '',
      minTarget: null,
      startDate: today(),
      reminderEnabled: false,
      reminderTime: null,
    });
  },

  markCelebrated(date: DateKey) {
    update((d) => ({ ...d, meta: { ...d.meta, celebratedOn: date } }));
  },

  saveReview(review: Omit<WeeklyReview, 'updatedAt'>) {
    update((d) => ({ ...d, reviews: { ...d.reviews, [review.weekStart]: { ...review, updatedAt: nowIso() } } }));
  },

  /* ---------- рутины ---------- */

  saveRoutine(input: { id?: string; name: string; icon: string; color: Routine['color']; habitIds: string[] }): string {
    const id = input.id ?? createId('rt');
    update((d) => {
      const existing = d.routines[id];
      const order = existing?.order ?? Math.max(0, ...Object.values(d.routines).map((r) => r.order + 1));
      const routine: Routine = {
        id,
        name: input.name.trim().slice(0, 60),
        icon: input.icon,
        color: input.color,
        habitIds: input.habitIds.filter((h) => d.habits[h]),
        createdAt: existing?.createdAt ?? nowIso(),
        updatedAt: nowIso(),
        order,
      };
      return { ...d, routines: { ...d.routines, [id]: routine } };
    });
    return id;
  },

  deleteRoutine(id: string): Routine | null {
    const r = appStore.get().data.routines[id] ?? null;
    update((d) => {
      const routines = { ...d.routines };
      delete routines[id];
      return { ...d, routines };
    });
    return r;
  },

  restoreRoutine(r: Routine) {
    update((d) => ({ ...d, routines: { ...d.routines, [r.id]: r } }));
  },

  /* ---------- цели ---------- */

  saveGoal(input: { id?: string; name: string; description: string; color: Goal['color']; icon: string; targetDate: DateKey | null; habitIds: string[] }): string {
    const id = input.id ?? createId('g');
    const t = today();
    update((d) => {
      const existing = d.goals[id];
      const goal: Goal = {
        id,
        name: input.name.trim().slice(0, 80),
        description: input.description.trim().slice(0, 500),
        color: input.color,
        icon: input.icon,
        startDate: existing?.startDate ?? t,
        targetDate: input.targetDate,
        habitIds: input.habitIds.filter((h) => d.habits[h]),
        achievedOn: existing?.achievedOn ?? null,
        history: existing ? [...existing.history, { date: t, type: 'updated' }] : [{ date: t, type: 'created' }],
        createdAt: existing?.createdAt ?? nowIso(),
        updatedAt: nowIso(),
      };
      return { ...d, goals: { ...d.goals, [id]: goal } };
    });
    return id;
  },

  setGoalAchieved(id: string, achieved: boolean) {
    const t = today();
    update((d) => {
      const g = d.goals[id];
      if (!g) return d;
      return {
        ...d,
        goals: {
          ...d.goals,
          [id]: { ...g, achievedOn: achieved ? t : null, history: [...g.history, { date: t, type: achieved ? 'achieved' : 'reopened' }], updatedAt: nowIso() },
        },
      };
    });
  },

  deleteGoal(id: string): Goal | null {
    const g = appStore.get().data.goals[id] ?? null;
    update((d) => {
      const goals = { ...d.goals };
      delete goals[id];
      return { ...d, goals };
    });
    return g;
  },

  restoreGoal(g: Goal) {
    update((d) => ({ ...d, goals: { ...d.goals, [g.id]: g } }));
  },

  /* ---------- дневник ---------- */

  saveJournal(date: DateKey, patch: Partial<Omit<JournalEntry, 'date' | 'updatedAt'>>) {
    update((d) => {
      const prev = d.journal[date] ?? { date, mood: 0, note: '', reflection: '', updatedAt: nowIso() };
      const next: JournalEntry = { ...prev, ...patch, date, updatedAt: nowIso() };
      const journal = { ...d.journal };
      if (!next.mood && !next.note.trim() && !next.reflection.trim()) delete journal[date];
      else journal[date] = next;
      return { ...d, journal };
    });
  },

  deleteJournal(date: DateKey): JournalEntry | null {
    const j = appStore.get().data.journal[date] ?? null;
    update((d) => {
      const journal = { ...d.journal };
      delete journal[date];
      return { ...d, journal };
    });
    return j;
  },

  restoreJournal(j: JournalEntry) {
    update((d) => ({ ...d, journal: { ...d.journal, [j.date]: j } }));
  },

  /* ---------- фокус ---------- */

  /**
   * Сохраняет сессию фокуса. Для привычек типа «Время» минуты добавляются
   * к результату дня, для «Сессий» — +1 за завершённую сессию.
   */
  recordFocusSession(session: Omit<FocusSession, 'id' | 'date'>): { applied: 'duration' | 'sessions' | null } {
    const date = today();
    const id = createId('f');
    let applied: 'duration' | 'sessions' | null = null;
    update((d) => {
      let next: AppData = { ...d, focusSessions: { ...d.focusSessions, [id]: { ...session, id, date } } };
      const h = session.habitId ? d.habits[session.habitId] : undefined;
      if (h && h.kind === 'duration') {
        const minutes = Math.round(session.actualMs / 60_000);
        if (minutes > 0) {
          const e = next.entries[entryKey(h.id, date)];
          next = setEntry(next, withValue(h, e, h.id, date, entryValue(e) + minutes), h.id, date);
          applied = 'duration';
        }
      } else if (h && h.kind === 'sessions' && session.completed) {
        const e = next.entries[entryKey(h.id, date)];
        next = setEntry(next, withValue(h, e, h.id, date, entryValue(e) + 1), h.id, date);
        applied = 'sessions';
      }
      return next;
    });
    return { applied };
  },

  deleteFocusSession(id: string) {
    update((d) => {
      const focusSessions = { ...d.focusSessions };
      delete focusSessions[id];
      return { ...d, focusSessions };
    });
  },

  /* ---------- режим восстановления ---------- */

  startRecovery(habitIds: string[], pauseOthers: boolean, targetDays = 7) {
    const t = today();
    update((d) => {
      let next = d;
      const pausedIds: string[] = [];
      if (pauseOthers) {
        for (const h of Object.values(d.habits)) {
          if (habitIds.includes(h.id) || h.archivedOn || h.pauses.some((p) => p.to === null)) continue;
          next = patchHabit(next, h.id, { pauses: [...h.pauses, { from: t, to: null }] });
          pausedIds.push(h.id);
        }
      }
      return { ...next, meta: { ...next.meta, recovery: { startedOn: t, habitIds, pausedIds, targetDays } } };
    });
  },

  /** Вернуть в план ещё одну привычку (снимается пауза восстановления). */
  addRecoveryHabit(habitId: string) {
    const t = today();
    update((d) => {
      const rec = d.meta.recovery;
      if (!rec) return d;
      let next = d;
      if (rec.pausedIds.includes(habitId)) next = resumeIn(next, habitId, t);
      return {
        ...next,
        meta: { ...next.meta, recovery: { ...rec, habitIds: [...new Set([...rec.habitIds, habitId])], pausedIds: rec.pausedIds.filter((x) => x !== habitId) } },
      };
    });
  },

  /** Завершить восстановление: все приостановленные привычки возвращаются. */
  endRecovery() {
    const t = today();
    update((d) => {
      const rec = d.meta.recovery;
      if (!rec) return d;
      let next = d;
      for (const id of rec.pausedIds) next = resumeIn(next, id, t);
      return { ...next, meta: { ...next.meta, recovery: null, recoveryDismissedOn: t } };
    });
  },

  dismissRecovery() {
    const t = today();
    update((d) => ({ ...d, meta: { ...d.meta, recoveryDismissedOn: t } }));
  },

  /* ---------- оформление ---------- */

  updateAppearance(patch: Partial<Appearance>) {
    update((d) => ({ ...d, settings: { ...d.settings, appearance: { ...d.settings.appearance, ...patch } } }));
  },

  /* ---------- настройки и данные ---------- */

  updateSettings(patch: Partial<Settings>) {
    update((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
    if (patch.theme) {
      try {
        localStorage.setItem(THEME_KEY, patch.theme);
      } catch {
        /* ignore */
      }
    }
  },

  dismissHint(id: string) {
    update((d) =>
      d.meta.dismissedHints.includes(id) ? d : { ...d, meta: { ...d.meta, dismissedHints: [...d.meta.dismissedHints, id] } },
    );
  },

  /** Импорт всегда записывается в реальные данные и выключает демо-режим. */
  async importData(raw: unknown): Promise<{ habits: number; entries: number }> {
    const data = parseAppData(raw);
    data.meta.onboarded = true;
    if (appStore.get().mode === 'demo') {
      await storage.clear('demo');
      storage.setActiveMode('real');
    }
    lastSaved = null;
    appStore.set({ mode: 'real', data });
    await flushSave();
    return { habits: Object.keys(data.habits).length, entries: Object.keys(data.entries).length };
  },

  async resetAll() {
    const theme = appStore.get().data.settings.theme;
    await storage.clear('real');
    await storage.clear('demo');
    clearSnapshots();
    storage.setActiveMode('real');
    const fresh = createEmptyData();
    fresh.settings.theme = theme;
    lastSaved = null;
    appStore.set({ mode: 'real', data: fresh, status: 'ready', error: null });
    await flushSave();
  },

  async recoverFromError() {
    await actions.resetAll();
  },
};
