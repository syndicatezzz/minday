import type { Transition, Variants } from 'framer-motion';

/*
 * Единая система движения MINDAY.
 * Все анимации используют эти токены — длительности, кривые и пружины,
 * поэтому интерфейс двигается одинаково на всех страницах.
 * Анимируются только transform и opacity (GPU-friendly).
 */

export const DURATION = {
  instant: 0.12,
  fast: 0.2,
  base: 0.32,
  slow: 0.5,
  slower: 0.8,
} as const;

/** Основная кривая: быстрый старт, мягкое торможение (как в iOS). */
export const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];
/** Для исчезновения: плавный разгон. */
export const EASE_IN: [number, number, number, number] = [0.4, 0, 1, 1];
export const EASE_IN_OUT: [number, number, number, number] = [0.65, 0, 0.35, 1];

export const springSoft: Transition = { type: 'spring', stiffness: 260, damping: 30, mass: 0.9 };
export const springSnappy: Transition = { type: 'spring', stiffness: 420, damping: 32, mass: 0.7 };
export const springBouncy: Transition = { type: 'spring', stiffness: 520, damping: 22, mass: 0.7 };

export const tween = (duration: number = DURATION.base, ease = EASE_OUT): Transition => ({ duration, ease });

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: tween(DURATION.base) },
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: tween(DURATION.slow) },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  show: { opacity: 1, scale: 1, transition: springSoft },
};

export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.04 } },
};

/** Смещение для слайд-переходов (календарь, шаги онбординга, weekly review). */
export const slide = (direction: number, distance = 40) => ({
  initial: { opacity: 0, x: direction * distance },
  animate: { opacity: 1, x: 0, transition: tween(DURATION.base) },
  exit: { opacity: 0, x: direction * -distance, transition: tween(DURATION.fast, EASE_IN) },
});

/** Нажатие на интерактивную карточку. */
export const pressable = {
  whileTap: { scale: 0.985 },
  transition: springSnappy,
} as const;
