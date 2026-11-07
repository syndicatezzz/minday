import type { AppData, DataMode } from '@/types';
import { APP_CONFIG } from '@/config/app';

/**
 * Абстракция хранилища. Сейчас используется localStorage, но интерфейс
 * асинхронный — его можно заменить на IndexedDB или REST/GraphQL API
 * с авторизацией, не меняя остальной код приложения.
 */
export interface StorageAdapter {
  load(mode: DataMode): Promise<unknown | null>;
  save(mode: DataMode, data: AppData): Promise<void>;
  clear(mode: DataMode): Promise<void>;
  getActiveMode(): DataMode;
  setActiveMode(mode: DataMode): void;
  /** Подписка на изменения из других вкладок. */
  subscribe(listener: (mode: DataMode) => void): () => void;
}

const P = APP_CONFIG.storagePrefix;
const dataKey = (mode: DataMode) => `${P}:v1:${mode}`;
const MODE_KEY = `${P}:v1:active-mode`;

export class StorageError extends Error {
  constructor(message: string, readonly original?: unknown) {
    super(message);
    this.name = 'StorageError';
  }
}

export class LocalStorageAdapter implements StorageAdapter {
  private get ls(): Storage | null {
    try {
      return typeof window !== 'undefined' ? window.localStorage : null;
    } catch {
      return null;
    }
  }

  async load(mode: DataMode): Promise<unknown | null> {
    const raw = this.ls?.getItem(dataKey(mode));
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      throw new StorageError('Сохранённые данные повреждены', e);
    }
  }

  async save(mode: DataMode, data: AppData): Promise<void> {
    const ls = this.ls;
    if (!ls) throw new StorageError('Хранилище браузера недоступно');
    try {
      ls.setItem(dataKey(mode), JSON.stringify(data));
    } catch (e) {
      throw new StorageError('Не удалось сохранить данные: закончилось место в хранилище браузера', e);
    }
  }

  async clear(mode: DataMode): Promise<void> {
    this.ls?.removeItem(dataKey(mode));
  }

  getActiveMode(): DataMode {
    return this.ls?.getItem(MODE_KEY) === 'demo' ? 'demo' : 'real';
  }

  setActiveMode(mode: DataMode): void {
    try {
      this.ls?.setItem(MODE_KEY, mode);
    } catch {
      /* ignore */
    }
  }

  subscribe(listener: (mode: DataMode) => void): () => void {
    if (typeof window === 'undefined') return () => {};
    const handler = (e: StorageEvent) => {
      if (e.key === dataKey('real')) listener('real');
      if (e.key === dataKey('demo')) listener('demo');
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }
}

export const storage: StorageAdapter = new LocalStorageAdapter();

/** Ключ для синхронного чтения темы до гидратации (без мигания). */
export const THEME_KEY = `${P}:theme`;
