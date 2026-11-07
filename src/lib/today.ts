import type { DateKey, Settings } from '@/types';
import { logicalToday, resolveTimeZone } from '@/lib/date';

/** Логическая «сегодняшняя» дата с учётом часового пояса и часа начала дня. */
export function computeToday(settings: Settings, now: number = Date.now()): DateKey {
  return logicalToday(new Date(now), resolveTimeZone(settings.timeZone), settings.dayStartHour);
}
