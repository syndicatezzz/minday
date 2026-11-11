import type { AppData } from '@/types';
import { APP_CONFIG } from '@/config/app';

/**
 * Автоматические локальные резервные копии: одна в день, хранятся три
 * последние. Позволяют откатиться, если данные случайно испортили или удалили.
 */
const KEY = `${APP_CONFIG.storagePrefix}:v1:snapshots`;
const KEEP = 3;

export interface Snapshot {
  date: string;
  savedAt: string;
  habits: number;
  entries: number;
  data: AppData;
}

export function listSnapshots(): Snapshot[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Snapshot[]) : [];
  } catch {
    return [];
  }
}

export function takeDailySnapshot(data: AppData, date: string) {
  if (!Object.keys(data.habits).length) return;
  const list = listSnapshots();
  if (list[0]?.date === date) return;
  const next: Snapshot[] = [
    { date, savedAt: new Date().toISOString(), habits: Object.keys(data.habits).length, entries: Object.keys(data.entries).length, data },
    ...list,
  ].slice(0, KEEP);
  // При нехватке места храним меньше копий
  for (let n = next.length; n > 0; n--) {
    try {
      localStorage.setItem(KEY, JSON.stringify(next.slice(0, n)));
      return;
    } catch {
      /* try fewer */
    }
  }
}

export function clearSnapshots() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
