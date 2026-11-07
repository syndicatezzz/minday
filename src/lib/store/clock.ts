import { useMemo } from 'react';
import { createStore, useStore } from './create-store';
import { useApp } from './app-store';
import { greetingFor, logicalToday, resolveTimeZone, zonedMinutes, zonedParts } from '@/lib/date';
import type { DateKey } from '@/types';
export { computeToday } from '@/lib/today';

/** Глобальные «часы»: обновляются раз в 30 секунд и при возврате на вкладку. */
export const clockStore = createStore({ now: 0 });

let started = false;
export function startClock(): () => void {
  if (started || typeof window === 'undefined') return () => {};
  started = true;
  const tick = () => clockStore.set({ now: Date.now() });
  tick();
  const id = window.setInterval(tick, 30_000);
  const onVis = () => document.visibilityState === 'visible' && tick();
  document.addEventListener('visibilitychange', onVis);
  window.addEventListener('focus', tick);
  return () => {
    started = false;
    window.clearInterval(id);
    document.removeEventListener('visibilitychange', onVis);
    window.removeEventListener('focus', tick);
  };
}

export interface TodayInfo {
  today: DateKey;
  nowMinutes: number;
  hour: number;
  timeZone: string;
  greeting: string;
}

export function useToday(): TodayInfo {
  const now = useStore(clockStore, (s) => s.now) || Date.now();
  const settings = useApp((s) => s.data.settings);
  return useMemo(() => {
    const tz = resolveTimeZone(settings.timeZone);
    const date = new Date(now);
    const hour = zonedParts(date, tz).hour;
    return {
      today: logicalToday(date, tz, settings.dayStartHour),
      nowMinutes: zonedMinutes(date, tz),
      hour,
      timeZone: tz,
      greeting: greetingFor(hour),
    };
  }, [now, settings.timeZone, settings.dayStartHour]);
}
