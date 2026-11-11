'use client';

import { animate } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { DURATION, EASE_OUT } from '@/lib/motion';
import { prefersReducedMotion } from '@/lib/navigation';

const round = (v: number) => String(Math.round(v));

/** Число, плавно «перетекающее» к новому значению. */
export function AnimatedNumber({
  value,
  format = round,
  className,
}: {
  value: number;
  format?: (v: number) => string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(value);
  const formatRef = useRef(format);
  formatRef.current = format;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const from = prev.current;
    prev.current = value;
    if (from === value || prefersReducedMotion()) {
      el.textContent = formatRef.current(value);
      return;
    }
    const controls = animate(from, value, {
      duration: DURATION.slow,
      ease: EASE_OUT,
      onUpdate: (v) => {
        el.textContent = formatRef.current(v);
      },
    });
    return () => controls.stop();
  }, [value]);

  return (
    <span ref={ref} className={className}>
      {format(value)}
    </span>
  );
}
