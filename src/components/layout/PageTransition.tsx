'use client';

import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { DURATION, EASE_IN, EASE_OUT } from '@/lib/motion';
import { useStore } from '@/lib/store/create-store';
import { uiStore } from '@/lib/store/ui-store';

/**
 * Переходы между страницами: старая страница уходит вверх и растворяется,
 * новая мягко поднимается снизу. Оболочка (сайдбар, навигация) не
 * перерисовывается — меняется только содержимое.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const leaving = useStore(uiStore, (s) => s.leaving);

  useEffect(() => {
    uiStore.set({ leaving: false });
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 14 }}
      animate={leaving ? { opacity: 0, y: -8, transition: { duration: DURATION.fast, ease: EASE_IN } } : { opacity: 1, y: 0, transition: { duration: DURATION.slow, ease: EASE_OUT } }}
    >
      {children}
    </motion.div>
  );
}
