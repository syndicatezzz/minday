/** Календарная дата без часового пояса в формате YYYY-MM-DD. */
export type DateKey = string;

/** 0 — воскресенье … 6 — суббота (как в Date#getDay). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type Schedule =
  | { type: 'daily' }
  | { type: 'weekdays'; days: Weekday[] }
  | { type: 'weekly'; timesPerWeek: number };

/** Версия расписания, действующая начиная с даты `from` (включительно). */
export interface ScheduleVersion {
  from: DateKey;
  schedule: Schedule;
}

/** Пауза: с `from` включительно до `to` (не включительно). `to = null` — пауза продолжается. */
export interface PauseRange {
  from: DateKey;
  to: DateKey | null;
}

export type HabitCategory =
  | 'health'
  | 'fitness'
  | 'mind'
  | 'productivity'
  | 'learning'
  | 'social'
  | 'finance'
  | 'other';

export type HabitColor =
  | 'violet'
  | 'sky'
  | 'teal'
  | 'green'
  | 'amber'
  | 'coral'
  | 'rose'
  | 'silver';

export interface Habit {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: HabitColor;
  category: HabitCategory;
  /** История расписаний, отсортирована по `from`. */
  schedules: ScheduleVersion[];
  /** Запланированное время HH:mm или null. */
  time: string | null;
  /** Сколько раз за день нужно отметить привычку, чтобы она считалась выполненной. */
  targetPerDay: number;
  startDate: DateKey;
  pauses: PauseRange[];
  /** Логическая дата архивации: с этого дня привычка не планируется. */
  archivedOn: DateKey | null;
  createdAt: string;
  updatedAt: string;
  order: number;
}

export type EntryStatus = 'completed' | 'missed' | 'pending';

/** Отдельная запись о выполнении привычки за конкретный день. */
export interface HabitEntry {
  id: string;
  habitId: string;
  date: DateKey;
  status: EntryStatus;
  /** Количество отметок за день (для привычек с targetPerDay > 1). */
  count: number;
  completedAt: string | null;
  updatedAt: string;
}

export interface Reminder {
  id: string;
  habitId: string;
  /** HH:mm в часовом поясе пользователя. */
  time: string;
  /** 'schedule' — по расписанию привычки, иначе — конкретные дни недели. */
  days: 'schedule' | Weekday[];
  enabled: boolean;
  createdAt: string;
}

export type ThemePreference = 'dark' | 'light' | 'system';

export interface Settings {
  userName: string;
  theme: ThemePreference;
  /** 'auto' — часовой пояс устройства, иначе IANA-идентификатор. */
  timeZone: string;
  timeFormat: '24h' | '12h';
  weekStartsOn: 0 | 1;
  /** Час (0–5), в который начинается новый день. 0 — полночь. */
  dayStartHour: number;
  notificationsEnabled: boolean;
  /** Не напоминать о привычке, если она уже выполнена. */
  skipCompletedReminders: boolean;
  /** Дублировать напоминания всплывающим сообщением внутри приложения. */
  inAppReminders: boolean;
  /** Тихий звук при выполнении привычки. По умолчанию выключен. */
  soundEnabled: boolean;
  /** Вибрация на поддерживаемых устройствах. */
  hapticsEnabled: boolean;
  /** Звуковой сигнал по окончании таймера. */
  timerSound: boolean;
}

export type DataMode = 'real' | 'demo';

export interface AppMeta {
  onboarded: boolean;
  dismissedHints: string[];
  createdAt: string;
  /** Логическая дата, за которую уже показана анимация «все привычки выполнены». */
  celebratedOn: DateKey | null;
}

/** Итоги недели, которые пользователь заполняет в Weekly Review. */
export interface WeeklyReview {
  weekStart: DateKey;
  rating: number;
  wins: string;
  improve: string;
  updatedAt: string;
}

export interface AppData {
  version: 1;
  habits: Record<string, Habit>;
  entries: Record<string, HabitEntry>;
  reminders: Record<string, Reminder>;
  reviews: Record<DateKey, WeeklyReview>;
  settings: Settings;
  meta: AppMeta;
}

/** Вычисленный статус привычки в конкретный день. */
export type DayStatus = 'completed' | 'missed' | 'pending' | 'upcoming';

export interface HabitInput {
  name: string;
  description: string;
  icon: string;
  color: HabitColor;
  category: HabitCategory;
  schedule: Schedule;
  time: string | null;
  targetPerDay: number;
  startDate: DateKey;
  reminderEnabled: boolean;
  reminderTime: string | null;
}
