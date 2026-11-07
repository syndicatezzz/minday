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
} from '@/types';
import { createStore, useStore } from './create-store';
import { storage, THEME_KEY } from '@/lib/storage/adapter';
import { createEmptyData, parseAppData } from '@/lib/storage/schema';
import { EPOCH, entryKey, isCompleted, sameSchedule, scheduleAt } from '@/lib/habits/schedule';
import { addDays } from '@/lib/date';
import { createId } from '@/lib/id';
import { buildDemoData } from '@/lib/demo';
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
        const data = await loadMode(mode);
        lastSaved = data;
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
  } catch (e) {
    appStore.set({ status: 'error', error: e instanceof Error ? e.message : 'Не удалось загрузить данные' });
  }
}

/* ------------------------------------------------------------------ */
/* Утилиты изменения состояния                                         */
/* ------------------------------------------------------------------ */

function update(fn: (data: AppData) => AppData) {
  appStore.set((s) => ({ ...s, data: fn(s.data) }));
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

export interface HabitSnapshot {
  habit: Habit;
  entries: HabitEntry[];
  reminders: Reminder[];
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
        targetPerDay: input.targetPerDay,
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
        targetPerDay: input.targetPerDay,
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

      // При изменении цели на день пересчитываем только сегодняшнюю запись — прошлое не меняется.
      if (input.targetPerDay !== habit.targetPerDay) {
        const e = next.entries[entryKey(id, t)];
        if (e && e.status !== 'missed') {
          const status = e.count >= input.targetPerDay ? 'completed' : 'pending';
          next = setEntry(
            next,
            { ...e, status, completedAt: status === 'completed' ? e.completedAt ?? nowIso() : null, updatedAt: nowIso() },
            id,
            t,
          );
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
    };
    // Каскадное удаление: в хранилище не остаётся «осиротевших» записей.
    update((data) => {
      const habits = { ...data.habits };
      delete habits[id];
      const entries = Object.fromEntries(Object.entries(data.entries).filter(([, e]) => e.habitId !== id));
      const reminders = Object.fromEntries(Object.entries(data.reminders).filter(([, r]) => r.habitId !== id));
      return { ...data, habits, entries, reminders };
    });
    return snapshot;
  },

  restoreHabit(snapshot: HabitSnapshot) {
    update((d) => {
      const entries = { ...d.entries };
      for (const e of snapshot.entries) entries[entryKey(e.habitId, e.date)] = e;
      const reminders = { ...d.reminders };
      for (const r of snapshot.reminders) reminders[r.id] = r;
      return { ...d, habits: { ...d.habits, [snapshot.habit.id]: snapshot.habit }, entries, reminders };
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

  /** Полностью отметить / снять отметку выполнения. */
  toggleHabit(habitId: string, date: DateKey): 'completed' | 'cleared' | null {
    if (date > today()) return null;
    let result: 'completed' | 'cleared' | null = null;
    update((d) => {
      const h = d.habits[habitId];
      if (!h) return d;
      const key = entryKey(habitId, date);
      const existing = d.entries[key];
      if (existing?.status === 'completed') {
        result = 'cleared';
        return setEntry(d, null, habitId, date);
      }
      result = 'completed';
      const now = nowIso();
      return setEntry(
        d,
        {
          id: existing?.id ?? createId('e'),
          habitId,
          date,
          status: 'completed',
          count: h.targetPerDay,
          completedAt: now,
          updatedAt: now,
        },
        habitId,
        date,
      );
    });
    return result;
  },

  /** +1 / −1 для привычек с несколькими повторениями в день. */
  stepHabit(habitId: string, date: DateKey, delta: 1 | -1): 'completed' | 'progress' | 'cleared' | null {
    if (date > today()) return null;
    let result: 'completed' | 'progress' | 'cleared' | null = null;
    update((d) => {
      const h = d.habits[habitId];
      if (!h) return d;
      const existing = d.entries[entryKey(habitId, date)];
      const base = existing?.status === 'missed' ? 0 : existing?.count ?? 0;
      const count = Math.max(0, Math.min(h.targetPerDay, base + delta));
      if (count === 0) {
        result = 'cleared';
        return setEntry(d, null, habitId, date);
      }
      const now = nowIso();
      const completed = count >= h.targetPerDay;
      result = completed ? 'completed' : 'progress';
      return setEntry(
        d,
        {
          id: existing?.id ?? createId('e'),
          habitId,
          date,
          status: completed ? 'completed' : 'pending',
          count,
          completedAt: completed ? existing?.completedAt ?? now : null,
          updatedAt: now,
        },
        habitId,
        date,
      );
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
        {
          id: existing?.id ?? createId('e'),
          habitId,
          date,
          status: 'missed',
          count: 0,
          completedAt: null,
          updatedAt: nowIso(),
        },
        habitId,
        date,
      );
    });
  },

  /** Убрать отметку и вернуть вычисляемый статус по умолчанию. */
  clearEntry(habitId: string, date: DateKey) {
    update((d) => setEntry(d, null, habitId, date));
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
