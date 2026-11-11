import { createStore } from './create-store';
import { actions } from './app-store';

export interface TimerState {
  habitId: string | null;
  durationMs: number;
  /** Момент окончания, пока таймер идёт. */
  endAt: number | null;
  /** Оставшееся время на паузе. */
  remainingMs: number;
  finished: boolean;
  /** Время первого старта текущей сессии (для истории). */
  startedAt: number | null;
}

export const timerStore = createStore<TimerState>({
  habitId: null,
  durationMs: 25 * 60_000,
  endAt: null,
  remainingMs: 25 * 60_000,
  finished: false,
  startedAt: null,
});

const MIN_SAVED_MS = 60_000;

function elapsed(s: TimerState): number {
  const left = s.endAt ? Math.max(0, s.endAt - Date.now()) : s.remainingMs;
  return Math.max(0, s.durationMs - left);
}

export const timer = {
  setDuration(minutes: number) {
    const ms = Math.max(1, Math.min(240, minutes)) * 60_000;
    timerStore.set({ durationMs: ms, remainingMs: ms, endAt: null, finished: false, startedAt: null });
  },
  setHabit(habitId: string | null) {
    timerStore.set({ habitId });
  },
  start() {
    const s = timerStore.get();
    const restart = s.finished || s.remainingMs <= 0;
    const remaining = restart ? s.durationMs : s.remainingMs;
    timerStore.set({
      endAt: Date.now() + remaining,
      remainingMs: remaining,
      finished: false,
      startedAt: restart || !s.startedAt ? Date.now() : s.startedAt,
    });
  },
  pause() {
    const s = timerStore.get();
    if (!s.endAt) return;
    timerStore.set({ endAt: null, remainingMs: Math.max(0, s.endAt - Date.now()) });
  },
  /** Сброс без сохранения сессии. */
  reset() {
    const s = timerStore.get();
    timerStore.set({ endAt: null, remainingMs: s.durationMs, finished: false, startedAt: null });
  },
  /** Остановить досрочно: сессия длиннее минуты сохраняется как незавершённая. */
  stop(): number {
    const s = timerStore.get();
    const done = elapsed(s);
    if (s.startedAt && done >= MIN_SAVED_MS) {
      actions.recordFocusSession({
        habitId: s.habitId,
        startedAt: new Date(s.startedAt).toISOString(),
        plannedMs: s.durationMs,
        actualMs: done,
        completed: false,
      });
    }
    timerStore.set({ endAt: null, remainingMs: s.durationMs, finished: false, startedAt: null });
    return done >= MIN_SAVED_MS ? done : 0;
  },
  /** Вызывается тиком. При окончании сохраняет завершённую сессию. */
  tick(): { finished: false } | { finished: true; applied: 'duration' | 'sessions' | null } {
    const s = timerStore.get();
    if (!s.endAt) return { finished: false };
    const left = s.endAt - Date.now();
    if (left > 0) {
      timerStore.set({ remainingMs: left });
      return { finished: false };
    }
    const { applied } = actions.recordFocusSession({
      habitId: s.habitId,
      startedAt: new Date(s.startedAt ?? Date.now() - s.durationMs).toISOString(),
      plannedMs: s.durationMs,
      actualMs: s.durationMs,
      completed: true,
    });
    timerStore.set({ endAt: null, remainingMs: 0, finished: true, startedAt: null });
    return { finished: true, applied };
  },
  isActive(): boolean {
    const s = timerStore.get();
    return s.endAt !== null || (s.startedAt !== null && s.remainingMs > 0);
  },
};

export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
