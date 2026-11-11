'use client';

import { motion } from 'framer-motion';
import { Annoyed, ArrowRight, Crosshair, Frown, Laugh, Meh, Mountain, Play, Smile } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { AppLink } from '@/components/layout/AppLink';
import { LiquidProgress } from '@/components/ui/LiquidProgress';
import { cn } from '@/lib/cn';
import { focusStats, formatDuration } from '@/lib/focus';
import { goalProgress } from '@/lib/habits/goals';
import { colorOf } from '@/lib/habits/meta';
import { MOODS } from '@/lib/journal';
import { fadeUp, springBouncy } from '@/lib/motion';
import { actions, useApp } from '@/lib/store/app-store';
import { useToday } from '@/lib/store/clock';
import { useStore } from '@/lib/store/create-store';
import { formatClock, timer, timerStore } from '@/lib/store/timer-store';

const card = 'glass glass-hover spotlight rounded-[28px] p-5 sm:p-6';

function Head({ icon, title, href }: { icon: ReactNode; title: string; href: string }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em] text-fg">
        <span className="text-accent">{icon}</span> {title}
      </h2>
      <AppLink href={href} className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">
        Открыть <ArrowRight size={12} />
      </AppLink>
    </div>
  );
}

export function GoalsWidget() {
  const goalsMap = useApp((s) => s.data.goals);
  const habits = useApp((s) => s.data.habits);
  const entries = useApp((s) => s.data.entries);
  const ws = useApp((s) => s.data.settings.weekStartsOn);
  const { today } = useToday();
  const goals = useMemo(() => Object.values(goalsMap).filter((g) => !g.achievedOn).slice(0, 3), [goalsMap]);
  if (!goals.length) return null;
  return (
    <motion.section variants={fadeUp} className={card} aria-label="Цели">
      <Head icon={<Mountain size={15} />} title="Цели" href="/goals" />
      <ul className="space-y-3">
        {goals.map((g) => {
          const p = goalProgress(g, habits, entries, today, ws);
          return (
            <li key={g.id} className="flex items-center gap-3">
              <LiquidProgress value={p.progress} size={44} color={colorOf(g.color)} label={g.name}>
                <span className="text-[10px] font-semibold text-fg drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]">{Math.round(p.progress * 100)}</span>
              </LiquidProgress>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-fg">{g.name}</p>
                <p className="text-xs text-subtle">{p.daysLeft !== null ? (p.daysLeft >= 0 ? `осталось ${p.daysLeft} дн.` : 'срок прошёл') : 'без срока'}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </motion.section>
  );
}

export function FocusWidget() {
  const sessions = useApp((s) => s.data.focusSessions);
  const ws = useApp((s) => s.data.settings.weekStartsOn);
  const t = useStore(timerStore, (s) => s);
  const { today } = useToday();
  const stats = useMemo(() => focusStats(Object.values(sessions), today, ws), [sessions, today, ws]);
  const running = t.endAt !== null;
  return (
    <motion.section variants={fadeUp} className={card} aria-label="Фокус">
      <Head icon={<Crosshair size={15} />} title="Фокус" href="/focus" />
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[28px] leading-none font-semibold tracking-[-0.04em] text-fg tabular-nums">{running || t.startedAt ? formatClock(t.remainingMs) : formatDuration(stats.todayMs)}</p>
          <p className="mt-1.5 text-xs text-subtle">{running ? 'идёт сессия' : t.startedAt ? 'на паузе' : `сегодня · ${formatDuration(stats.weekMs)} за неделю`}</p>
        </div>
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          transition={springBouncy}
          onClick={() => (running ? timer.pause() : timer.start())}
          aria-label={running ? 'Пауза' : 'Начать фокус'}
          className="grid h-12 w-12 place-items-center rounded-2xl bg-fg text-bg"
        >
          <Play size={18} className={cn(running && 'hidden')} />
          {running && <span className="h-3.5 w-3.5 rounded-[3px] bg-bg" />}
        </motion.button>
      </div>
    </motion.section>
  );
}

const MOOD_ICON = { 1: Frown, 2: Annoyed, 3: Meh, 4: Smile, 5: Laugh } as const;

export function JournalWidget() {
  const { today } = useToday();
  const entry = useApp((s) => s.data.journal[today]);
  return (
    <motion.section variants={fadeUp} className={card} aria-label="Настроение">
      <Head icon={<Smile size={15} />} title="Как вы сегодня?" href="/journal" />
      <div className="grid grid-cols-5 gap-1" role="radiogroup" aria-label="Настроение сегодня">
        {MOODS.map((m) => {
          const Icon = MOOD_ICON[m.value];
          const active = entry?.mood === m.value;
          return (
            <motion.button
              key={m.value}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={m.label}
              title={m.label}
              whileTap={{ scale: 0.85 }}
              onClick={() => actions.saveJournal(today, { mood: active ? 0 : m.value, note: entry?.note ?? '', reflection: entry?.reflection ?? '' })}
              className={cn('relative grid h-11 place-items-center rounded-xl transition-colors', active ? 'text-accent' : 'text-subtle hover:bg-fill hover:text-muted')}
            >
              {active && <motion.span layoutId="widget-mood" className="absolute inset-0 rounded-xl bg-accent/15" transition={springBouncy} />}
              <Icon size={20} className="relative" />
            </motion.button>
          );
        })}
      </div>
      {entry?.note ? <p className="mt-3 line-clamp-2 text-[13px] text-muted">{entry.note}</p> : <p className="mt-3 text-xs text-subtle">Заметку дня можно добавить в дневнике</p>}
    </motion.section>
  );
}

