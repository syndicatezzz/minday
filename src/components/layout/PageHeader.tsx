'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { EASE_OUT } from '@/lib/motion';

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE_OUT }}
      className="mb-7 flex flex-col gap-4 sm:mb-9 sm:flex-row sm:items-end sm:justify-between"
    >
      <div className="min-w-0">
        {eyebrow && <p className="mb-2 text-[13px] font-medium text-subtle">{eyebrow}</p>}
        <h1 className="text-[30px] leading-[1.08] font-semibold tracking-[-0.035em] text-fg text-balance sm:text-[40px]">{title}</h1>
        {description && <p className="mt-2.5 max-w-xl text-[15px] leading-relaxed text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </motion.header>
  );
}
