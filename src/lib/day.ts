import type { DateKey } from '@/types';
import { timeToMinutes } from '@/lib/date';
import { blockOf, type TimeBlock } from '@/lib/habits/insights';
import type { DayItem } from '@/lib/habits/schedule';

export interface TimelineItem extends DayItem {
  /** Время с учётом переноса на этот день. */
  time: string | null;
  rescheduled: boolean;
  block: TimeBlock;
  phase: 'past' | 'now' | 'next' | 'later' | 'done' | 'missed';
}

export const BLOCK_ORDER: TimeBlock[] = ['morning', 'day', 'evening', 'anytime'];
const NOW_WINDOW = 45;

/**
 * Временная шкала дня: привычки по блокам с учётом переносов времени,
 * пользовательского порядка и текущего момента.
 */
export function buildTimeline(items: DayItem[], order: string[] | undefined, isToday: boolean, nowMinutes: number): TimelineItem[] {
  const pos = new Map((order ?? []).map((id, i) => [id, i]));
  const mapped = items.map((it) => {
    const time = it.entry?.time ?? it.habit.time;
    return { ...it, time, rescheduled: !!it.entry?.time && it.entry.time !== it.habit.time, block: blockOf(time) };
  });
  const sorted = mapped.sort((a, b) => {
    const pa = pos.get(a.habit.id);
    const pb = pos.get(b.habit.id);
    if (pa !== undefined && pb !== undefined) return pa - pb;
    const ta = a.time ? timeToMinutes(a.time) : 9999;
    const tb = b.time ? timeToMinutes(b.time) : 9999;
    return ta - tb || a.habit.order - b.habit.order;
  });
  let nextAssigned = false;
  return sorted.map((it) => {
    let phase: TimelineItem['phase'];
    if (it.status === 'completed') phase = 'done';
    else if (it.status === 'missed') phase = 'missed';
    else if (!isToday || !it.time) phase = 'later';
    else {
      const t = timeToMinutes(it.time);
      if (t + NOW_WINDOW < nowMinutes) phase = 'past';
      else if (t - NOW_WINDOW <= nowMinutes) phase = 'now';
      else if (!nextAssigned) {
        phase = 'next';
        nextAssigned = true;
      } else phase = 'later';
    }
    return { ...it, phase };
  });
}

export function groupByBlock(items: TimelineItem[]): Record<TimeBlock, TimelineItem[]> {
  const out: Record<TimeBlock, TimelineItem[]> = { morning: [], day: [], evening: [], anytime: [] };
  for (const it of items) out[it.block].push(it);
  return out;
}

export function dayKeyLabel(date: DateKey, today: DateKey): string {
  return date === today ? 'Сегодня' : '';
}
