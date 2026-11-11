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
  /**
   * Основная цель за день в единицах привычки: 1 для обычной отметки,
   * число повторений, минут, страниц, сессий и т. п.
   */
  targetPerDay: number;
  /** Тип измерения привычки. */
  kind: HabitKind;
  /** Единица измерения для количества/числа (например, «стр.», «км»). */
  unit: string;
  /** Минимальная цель: при её достижении день засчитывается (минимальное выполнение). */
  minTarget: number | null;
  startDate: DateKey;
  pauses: PauseRange[];
  /** Логическая дата архивации: с этого дня привычка не планируется. */
  archivedOn: DateKey | null;
  createdAt: string;
  updatedAt: string;
  order: number;
}

/**
 * check — обычная отметка; count — повторения (+1); duration — минуты;
 * numeric — произвольное число с единицей; sessions — количество сессий фокуса.
 */
export type HabitKind = 'check' | 'count' | 'duration' | 'numeric' | 'sessions';

/** moved — выполнение перенесено на другой день (не считается пропуском). */
export type EntryStatus = 'completed' | 'missed' | 'pending' | 'moved';

/** Отдельная запись о выполнении привычки за конкретный день. */
export interface HabitEntry {
  id: string;
  habitId: string;
  date: DateKey;
  status: EntryStatus;
  /** Фактический результат за день в единицах привычки. */
  count: number;
  completedAt: string | null;
  updatedAt: string;
  /** Дополнительное (перенесённое) выполнение в день вне расписания. */
  extra?: boolean;
  /** Куда перенесено выполнение (для status = moved). */
  movedTo?: DateKey;
  /** Время, на которое привычка перенесена в этот день (HH:mm). */
  time?: string;
}

export interface Routine {
  id: string;
  name: string;
  icon: string;
  color: HabitColor;
  habitIds: string[];
  createdAt: string;
  updatedAt: string;
  order: number;
}

export interface GoalEvent {
  date: DateKey;
  type: 'created' | 'updated' | 'achieved' | 'reopened';
  note?: string;
}

export interface Goal {
  id: string;
  name: string;
  description: string;
  color: HabitColor;
  icon: string;
  startDate: DateKey;
  targetDate: DateKey | null;
  habitIds: string[];
  achievedOn: DateKey | null;
  history: GoalEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface JournalEntry {
  date: DateKey;
  /** 1 — очень плохо … 5 — отлично; 0 — не указано. */
  mood: number;
  note: string;
  reflection: string;
  updatedAt: string;
}

export interface FocusSession {
  id: string;
  habitId: string | null;
  date: DateKey;
  startedAt: string;
  plannedMs: number;
  actualMs: number;
  completed: boolean;
}

export type AccentName = 'violet' | 'sky' | 'teal' | 'rose' | 'amber' | 'silver';

export type DashboardWidget = 'streak' | 'week' | 'review' | 'last7' | 'goals' | 'focus' | 'journal' | 'quote';

export interface Appearance {
  accent: AccentName;
  blur: 'low' | 'medium' | 'high';
  surface: 'glass' | 'frosted' | 'solid';
  density: 'comfortable' | 'compact';
  motion: 'full' | 'reduced' | 'off';
  calendarStyle: 'tinted' | 'dots' | 'rings';
  dashboard: { widget: DashboardWidget; visible: boolean }[];
}

/** Мягкий режим возвращения к привычкам после пропусков. */
export interface RecoveryState {
  startedOn: DateKey;
  habitIds: string[];
  /** Привычки, поставленные на паузу на время восстановления. */
  pausedIds: string[];
  targetDays: number;
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
  appearance: Appearance;
}

export type DataMode = 'real' | 'demo';

export interface AppMeta {
  onboarded: boolean;
  dismissedHints: string[];
  createdAt: string;
  /** Логическая дата, за которую уже показана анимация «все привычки выполнены». */
  celebratedOn: DateKey | null;
  recovery: RecoveryState | null;
  /** Дата, когда пользователь скрыл предложение режима восстановления. */
  recoveryDismissedOn: DateKey | null;
  /** Счётчик изменений — основа для будущего разрешения конфликтов синхронизации. */
  revision: number;
  deviceId: string;
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
  routines: Record<string, Routine>;
  goals: Record<string, Goal>;
  journal: Record<DateKey, JournalEntry>;
  focusSessions: Record<string, FocusSession>;
  /** Пользовательский порядок привычек в «Моём дне» по датам. */
  dayOrder: Record<DateKey, string[]>;
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
  kind: HabitKind;
  unit: string;
  minTarget: number | null;
  startDate: DateKey;
  reminderEnabled: boolean;
  reminderTime: string | null;
}
