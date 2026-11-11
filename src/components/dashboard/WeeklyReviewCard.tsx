'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import type { DaySummary } from '@/lib/habits/schedule';
import { fadeUp } from '@/lib/motion';
import { useApp } from '@/lib/store/app-store';
import { ui } from '@/lib/store/ui-store';

/** Вход в Weekly Review с кратким итогом текущей недели. */
export function WeeklyReviewCard({ days }: { days: DaySummary[] }) {
  const weekStart = days[0]?.date;
  const reviewed = useApp((s) => (weekStart ? !!s.data.reviews[weekStart] : false));
  const done = days.reduce((a, d) => a + d.completed, 0);
  const due = days.reduce((a, d) => a + d.completed + d.missed, 0);
  const rate = due ? Math.round((done / due) * 100) : 0;
  return (
    <motion.button
      type="button"
      variants={fadeUp}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.985 }}
      onClick={() => ui.setReview(true)}
      className="glass glass-hover spotlight relative block w-full overflow-hidden rounded-[28px] p-5 text-left sm:p-6"
    >
      <div aria-hidden className="pointer-events-none absolute -right-12 -bottom-16 h-44 w-44 rounded-full bg-accent/20 blur-3xl" />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="flex items-center gap-1.5 text-[12px] font-medium tracking-wide text-accent uppercase">
            <Sparkles size={13} /> Итоги недели
          </p>
          <p className="mt-2 text-[15px] font-semibold text-fg">{reviewed ? 'Обзор заполнен — можно дополнить' : 'Подведите итоги за 2 минуты'}</p>
        </div>
        <p className="text-2xl font-semibold tracking-[-0.03em] text-fg tabular-nums">
          <AnimatedNumber value={rate} />%
        </p>
      </div>
      <p className="relative mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted">
        Открыть обзор <ArrowRight size={14} />
      </p>
    </motion.button>
  );
}
