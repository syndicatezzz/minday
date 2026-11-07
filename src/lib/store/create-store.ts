import { useSyncExternalStore } from 'react';

export interface Store<T> {
  get(): T;
  set(updater: Partial<T> | ((state: T) => T)): void;
  subscribe(listener: () => void): () => void;
  initial: T;
}

/** Небольшое реактивное хранилище на базе useSyncExternalStore. */
export function createStore<T extends object>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    initial,
    get: () => state,
    set(updater) {
      const next = typeof updater === 'function' ? updater(state) : { ...state, ...updater };
      if (next === state) return;
      state = next;
      listeners.forEach((l) => l());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/** Селектор должен возвращать стабильные ссылки (части состояния, примитивы). */
export function useStore<T extends object, U>(store: Store<T>, selector: (state: T) => U): U {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.get()),
    () => selector(store.initial),
  );
}
