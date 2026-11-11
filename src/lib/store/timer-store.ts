import { createStore } from './create-store';

export interface TimerState {
  habitId: string | null;
  durationMs: number;
  /** Момент окончания, пока таймер идёт. */
  endAt: number | null;
  /** Оставшееся время на паузе. */
  remainingMs: number;
  finished: boolean;
}

export const timerStore = createStore<TimerState>({
  habitId: null,
  durationMs: 10 * 60_000,
  endAt: null,
  remainingMs: 10 * 60_000,
  finished: false,
});

export const timer = {
  setDuration(minutes: number) {
    const ms = Math.max(1, Math.min(180, minutes)) * 60_000;
    timerStore.set({ durationMs: ms, remainingMs: ms, endAt: null, finished: false });
  },
  setHabit(habitId: string | null) {
    timerStore.set({ habitId });
  },
  start() {
    const s = timerStore.get();
    const remaining = s.finished || s.remainingMs <= 0 ? s.durationMs : s.remainingMs;
    timerStore.set({ endAt: Date.now() + remaining, remainingMs: remaining, finished: false });
  },
  pause() {
    const s = timerStore.get();
    if (!s.endAt) return;
    timerStore.set({ endAt: null, remainingMs: Math.max(0, s.endAt - Date.now()) });
  },
  reset() {
    const s = timerStore.get();
    timerStore.set({ endAt: null, remainingMs: s.durationMs, finished: false });
  },
  /** Вызывается тиком; возвращает true, если таймер только что закончился. */
  tick(): boolean {
    const s = timerStore.get();
    if (!s.endAt) return false;
    const left = s.endAt - Date.now();
    if (left <= 0) {
      timerStore.set({ endAt: null, remainingMs: 0, finished: true });
      return true;
    }
    timerStore.set({ remainingMs: left });
    return false;
  },
};

export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
