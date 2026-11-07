import type { DateKey, Weekday } from '@/types';
import { APP_CONFIG } from '@/config/app';

/*
 * Все календарные вычисления ведутся над DateKey (YYYY-MM-DD) — датами без
 * часового пояса. Внутри для арифметики используется UTC, поэтому переходы на
 * летнее время и смещения пояса не влияют на сдвиг дней.
 * Перевод «сейчас» в DateKey выполняется с учётом выбранного часового пояса.
 */

const pad = (n: number) => String(n).padStart(2, '0');

export function toKey(y: number, m: number, d: number): DateKey {
  return `${y}-${pad(m)}-${pad(d)}`;
}

export function parseKey(key: DateKey): { y: number; m: number; d: number } {
  const [y, m, d] = key.split('-').map(Number);
  return { y, m, d };
}

export function isDateKey(value: unknown): value is DateKey {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const { y, m, d } = parseKey(value);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export function keyToUTC(key: DateKey): Date {
  const { y, m, d } = parseKey(key);
  return new Date(Date.UTC(y, m - 1, d));
}

function utcToKey(date: Date): DateKey {
  return toKey(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

export function addDays(key: DateKey, n: number): DateKey {
  const date = keyToUTC(key);
  date.setUTCDate(date.getUTCDate() + n);
  return utcToKey(date);
}

/** Количество дней от b до a (a - b). */
export function diffDays(a: DateKey, b: DateKey): number {
  return Math.round((keyToUTC(a).getTime() - keyToUTC(b).getTime()) / 86_400_000);
}

export function weekdayOf(key: DateKey): Weekday {
  return keyToUTC(key).getUTCDay() as Weekday;
}

export function startOfWeek(key: DateKey, weekStartsOn: 0 | 1): DateKey {
  const wd = weekdayOf(key);
  const offset = (wd - weekStartsOn + 7) % 7;
  return addDays(key, -offset);
}

export function startOfMonth(key: DateKey): DateKey {
  const { y, m } = parseKey(key);
  return toKey(y, m, 1);
}

export function daysInMonth(key: DateKey): number {
  const { y, m } = parseKey(key);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function endOfMonth(key: DateKey): DateKey {
  const { y, m } = parseKey(key);
  return toKey(y, m, daysInMonth(key));
}

export function addMonths(key: DateKey, n: number): DateKey {
  const { y, m, d } = parseKey(key);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const first = toKey(ny, nm, 1);
  return toKey(ny, nm, Math.min(d, daysInMonth(first)));
}

export function minKey(a: DateKey, b: DateKey): DateKey {
  return a < b ? a : b;
}

export function maxKey(a: DateKey, b: DateKey): DateKey {
  return a > b ? a : b;
}

/** Все даты от from до to включительно. */
export function rangeKeys(from: DateKey, to: DateKey): DateKey[] {
  const out: DateKey[] = [];
  if (from > to) return out;
  let cur = from;
  while (cur <= to) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}

/** Дни недели в порядке отображения. */
export function orderedWeekdays(weekStartsOn: 0 | 1): Weekday[] {
  const base: Weekday[] = [0, 1, 2, 3, 4, 5, 6];
  return weekStartsOn === 1 ? [1, 2, 3, 4, 5, 6, 0] : base;
}

/* ------------------------------------------------------------------ */
/* Часовые пояса                                                       */
/* ------------------------------------------------------------------ */

export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function resolveTimeZone(setting: string): string {
  if (!setting || setting === 'auto') return deviceTimeZone();
  return isValidTimeZone(setting) ? setting : deviceTimeZone();
}

const partsCache = new Map<string, Intl.DateTimeFormat>();

export function zonedParts(date: Date, timeZone: string) {
  let fmt = partsCache.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    partsCache.set(timeZone, fmt);
  }
  const parts: Record<string, number> = {};
  for (const p of fmt.formatToParts(date)) {
    if (p.type !== 'literal') parts[p.type] = Number(p.value);
  }
  return {
    y: parts.year,
    m: parts.month,
    d: parts.day,
    hour: parts.hour === 24 ? 0 : parts.hour,
    minute: parts.minute,
  };
}

/** Календарная дата «сейчас» в указанном поясе. */
export function zonedToday(now: Date, timeZone: string): DateKey {
  const p = zonedParts(now, timeZone);
  return toKey(p.y, p.m, p.d);
}

/**
 * Логическая дата с учётом часа начала дня: если день начинается в 04:00,
 * то в 02:30 ещё продолжается «вчера».
 */
export function logicalToday(now: Date, timeZone: string, dayStartHour: number): DateKey {
  const p = zonedParts(now, timeZone);
  const key = toKey(p.y, p.m, p.d);
  return p.hour < dayStartHour ? addDays(key, -1) : key;
}

/** Минуты от полуночи в указанном поясе. */
export function zonedMinutes(now: Date, timeZone: string): number {
  const p = zonedParts(now, timeZone);
  return p.hour * 60 + p.minute;
}

export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function isTimeString(value: unknown): value is string {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

/* ------------------------------------------------------------------ */
/* Форматирование                                                      */
/* ------------------------------------------------------------------ */

const LOCALE = APP_CONFIG.locale;
const fmtCache = new Map<string, Intl.DateTimeFormat>();

export function formatKey(key: DateKey, options: Intl.DateTimeFormatOptions): string {
  const cacheKey = JSON.stringify(options);
  let fmt = fmtCache.get(cacheKey);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(LOCALE, { ...options, timeZone: 'UTC' });
    fmtCache.set(cacheKey, fmt);
  }
  return fmt.format(keyToUTC(key));
}

export function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

export function formatLongDate(key: DateKey): string {
  return formatKey(key, { day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatWeekday(key: DateKey, style: 'long' | 'short' = 'long'): string {
  return capitalize(formatKey(key, { weekday: style }));
}

export function formatMonthYear(key: DateKey): string {
  return capitalize(formatKey(key, { month: 'long', year: 'numeric' }));
}

export function formatShortDate(key: DateKey): string {
  return formatKey(key, { day: 'numeric', month: 'short' }).replace('.', '');
}

export function formatTime(hhmm: string | null, format: '24h' | '12h'): string {
  if (!hhmm) return '';
  if (format === '24h') return hhmm;
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)} ${suffix}`;
}

/** Время из ISO-метки в выбранном поясе. */
export function formatInstantTime(iso: string, timeZone: string, format: '24h' | '12h'): string {
  const p = zonedParts(new Date(iso), timeZone);
  return formatTime(`${pad(p.hour)}:${pad(p.minute)}`, format);
}

export const WEEKDAY_SHORT: Record<Weekday, string> = {
  0: 'Вс',
  1: 'Пн',
  2: 'Вт',
  3: 'Ср',
  4: 'Чт',
  5: 'Пт',
  6: 'Сб',
};

export function plural(n: number, forms: [string, string, string]): string {
  const abs = Math.abs(n) % 100;
  const n1 = abs % 10;
  if (abs > 10 && abs < 20) return forms[2];
  if (n1 > 1 && n1 < 5) return forms[1];
  if (n1 === 1) return forms[0];
  return forms[2];
}

export function greetingFor(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Доброе утро';
  if (hour >= 12 && hour < 18) return 'Добрый день';
  if (hour >= 18 && hour < 23) return 'Добрый вечер';
  return 'Доброй ночи';
}
