import type { AppData } from '@/types';

type Stamped = { updatedAt?: string; createdAt?: string };

function stamp(v: object | undefined): string {
  const x = v as Stamped | undefined;
  return x?.updatedAt ?? x?.createdAt ?? (v as { startedAt?: string } | undefined)?.startedAt ?? '';
}

/** Объединение коллекций по ключу: побеждает запись с более поздним updatedAt. */
function mergeRecords<T extends object>(a: Record<string, T>, b: Record<string, T>): Record<string, T> {
  const out: Record<string, T> = { ...a };
  for (const [k, v] of Object.entries(b)) {
    if (!out[k] || stamp(v) > stamp(out[k])) out[k] = v;
  }
  return out;
}

/**
 * Разрешение конфликта двух версий данных (сейчас — между вкладками браузера,
 * в будущем — между устройством и сервером). Записи сливаются по ключу,
 * при совпадении побеждает более свежая правка. Настройки берутся из версии
 * с большим номером ревизии.
 *
 * Ограничение: без «надгробий» удалённая в одной версии запись может
 * вернуться из другой — для серверной синхронизации понадобится журнал удалений.
 */
export function mergeAppData(local: AppData, remote: AppData): AppData {
  const newer = remote.meta.revision >= local.meta.revision ? remote : local;
  return {
    ...newer,
    habits: mergeRecords(local.habits, remote.habits),
    entries: mergeRecords(local.entries, remote.entries),
    reminders: mergeRecords(local.reminders, remote.reminders),
    reviews: mergeRecords(local.reviews, remote.reviews),
    routines: mergeRecords(local.routines, remote.routines),
    goals: mergeRecords(local.goals, remote.goals),
    journal: mergeRecords(local.journal, remote.journal),
    focusSessions: mergeRecords(local.focusSessions, remote.focusSessions),
    dayOrder: { ...local.dayOrder, ...remote.dayOrder },
    meta: { ...newer.meta, revision: Math.max(local.meta.revision, remote.meta.revision) + 1 },
  };
}
