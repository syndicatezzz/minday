import { DURATION } from '@/lib/motion';
import { uiStore } from '@/lib/store/ui-store';

type Router = { push: (href: string) => void };

let pending: ReturnType<typeof setTimeout> | null = null;

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  const level = document.documentElement.dataset.motion;
  return (level !== undefined && level !== 'full') || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Переход между страницами с анимацией ухода: текущая страница плавно
 * исчезает, затем выполняется навигация, и новая страница появляется.
 */
export function navigateWithTransition(router: Router, href: string) {
  if (pending) clearTimeout(pending);
  if (prefersReducedMotion()) {
    router.push(href);
    return;
  }
  uiStore.set({ leaving: true, drawerOpen: false });
  pending = setTimeout(() => {
    pending = null;
    router.push(href);
    // Страховка: если маршрут не сменился (тот же адрес), вернуть страницу.
    setTimeout(() => uiStore.get().leaving && uiStore.set({ leaving: false }), 900);
  }, DURATION.fast * 1000 * 0.9);
}
