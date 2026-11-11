'use client';

import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { CalendarClock, ChevronDown, Ellipsis, Flag, Mountain, Pencil, Plus, RotateCcw, Trash2, Trophy } from 'lucide-react';
import { useMemo, useState } from 'react';
import { GoalModal } from '@/components/goals/GoalModal';
import { habitIcon } from '@/components/habits/habit-icons';
import { PageHeader } from '@/components/layout/PageHeader';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { LiquidProgress } from '@/components/ui/LiquidProgress';
import { Menu } from '@/components/ui/Menu';
import { ProgressBar } from '@/components/ui/Progress';
import { cn } from '@/lib/cn';
import { formatLongDate, formatShortDate, plural } from '@/lib/date';
import { feedback } from '@/lib/feedback';
import { habitRate } from '@/lib/habits/analytics';
import { goalHistory, goalProgress } from '@/lib/habits/goals';
import { colorOf } from '@/lib/habits/meta';
import { DURATION, springSoft, stagger, tween } from '@/lib/motion';
import { actions, useApp } from '@/lib/store/app-store';
import { useToday } from '@/lib/store/clock';
import { toast } from '@/lib/store/toast-store';
import { ui } from '@/lib/store/ui-store';
import type { Goal } from '@/types';

const EVENT_LABEL: Record<string, string> = {
  created: 'Цель создана',
  updated: 'Цель изменена',
  achieved: 'Цель достигнута',
  reopened: 'Цель снова в работе',
};

function Sparkline({ points, color }: { points: { value: number }[]; color: string }) {
  if (points.length < 2) return <p className="text-xs text-subtle">История появится через неделю</p>;
  const w = 300;
  const h = 64;
  const max = Math.max(10, ...points.map((p) => p.value));
  const xy = points.map((p, i) => [(i / (points.length - 1)) * w, h - (p.value / max) * (h - 6) - 3]);
  const d = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-16 w-full" preserveAspectRatio="none" aria-hidden>
      <path d={`${d} L${w} ${h} L0 ${h} Z`} fill={color} opacity={0.15} />
      <motion.path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />
    </svg>
  );
}

function GoalCard({ goal, expanded, onToggle, onEdit }: { goal: Goal; expanded: boolean; onToggle: () => void; onEdit: () => void }) {
  const habitsMap = useApp((s) => s.data.habits);
  const entries = useApp((s) => s.data.entries);
  const ws = useApp((s) => s.data.settings.weekStartsOn);
  const { today } = useToday();
  const p = useMemo(() => goalProgress(goal, habitsMap, entries, today, ws), [goal, habitsMap, entries, today, ws]);
  const history = useMemo(() => (expanded ? goalHistory(goal, habitsMap, entries, today, ws) : []), [expanded, goal, habitsMap, entries, today, ws]);
  const Icon = habitIcon(goal.icon);
  const color = colorOf(goal.color);
  const achieved = !!goal.achievedOn;
  const pct = Math.round(p.progress * 100);

  return (
    <motion.li layout transition={springSoft} className={cn('glass glass-hover spotlight list-none overflow-hidden rounded-[26px]', expanded && 'lg:col-span-2')}>
      <motion.div layout="position" className="flex items-center gap-4 p-5">
        <LiquidProgress value={p.progress} size={expanded ? 96 : 72} color={achieved ? 'var(--success)' : color} label={`Прогресс цели ${goal.name}`}>
          <span className="text-lg font-semibold text-fg tabular-nums drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">
            <AnimatedNumber value={pct} />%
          </span>
        </LiquidProgress>
        <button type="button" onClick={onToggle} aria-expanded={expanded} className="min-w-0 flex-1 text-left">
          <p className="flex items-center gap-2 text-[16px] font-semibold tracking-[-0.01em] text-fg">
            <Icon size={16} style={{ color }} />
            <span className="truncate">{goal.name}</span>
          </p>
          {goal.description && <p className="mt-0.5 line-clamp-1 text-[13px] text-subtle">{goal.description}</p>}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {achieved ? (
              <Badge tone="success">
                <Trophy size={11} /> Достигнута {formatShortDate(goal.achievedOn!)}
              </Badge>
            ) : p.daysLeft !== null ? (
              <Badge tone={p.daysLeft < 0 ? 'warning' : 'default'}>
                <CalendarClock size={11} /> {p.daysLeft >= 0 ? `${p.daysLeft} ${plural(p.daysLeft, ['день', 'дня', 'дней'])}` : 'Срок прошёл'}
              </Badge>
            ) : (
              <Badge>Без срока</Badge>
            )}
            <Badge>
              {goal.habitIds.length} {plural(goal.habitIds.length, ['привычка', 'привычки', 'привычек'])}
            </Badge>
          </div>
        </button>
        <motion.button
          type="button"
          onClick={onToggle}
          aria-label={expanded ? 'Свернуть' : 'Подробнее'}
          animate={{ rotate: expanded ? 180 : 0 }}
          className="hidden h-9 w-9 place-items-center rounded-xl text-subtle hover:bg-fill hover:text-fg sm:grid"
        >
          <ChevronDown size={16} />
        </motion.button>
        <Menu
          label={`Действия: ${goal.name}`}
          trigger={<Ellipsis size={18} />}
          items={[
            { label: 'Изменить', icon: <Pencil size={15} />, onSelect: onEdit },
            {
              label: 'Отметить достигнутой',
              icon: <Trophy size={15} />,
              hidden: achieved,
              onSelect: () => {
                actions.setGoalAchieved(goal.id, true);
                feedback.allDone();
                toast({ title: 'Цель достигнута', description: goal.name });
              },
            },
            { label: 'Вернуть в работу', icon: <RotateCcw size={15} />, hidden: !achieved, onSelect: () => actions.setGoalAchieved(goal.id, false) },
            {
              label: 'Удалить',
              icon: <Trash2 size={15} />,
              tone: 'danger',
              onSelect: () => {
                const removed = actions.deleteGoal(goal.id);
                if (removed) toast({ title: 'Цель удалена', action: { label: 'Отменить', onClick: () => actions.restoreGoal(removed) } });
              },
            },
          ]}
        />
      </motion.div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1, transition: tween(DURATION.base) }}
            exit={{ height: 0, opacity: 0, transition: tween(DURATION.fast) }}
            className="overflow-hidden"
          >
            <div className="grid gap-5 border-t border-line p-5 lg:grid-cols-3">
              <div className="space-y-3">
                <p className="text-[12px] font-medium tracking-wide text-subtle uppercase">Прогресс</p>
                <p className="text-sm text-muted">
                  Выполнено <span className="font-semibold text-fg tabular-nums">{p.done}</span> из ~{p.expected} запланированных отметок
                  {p.rate !== null && <> · успешность {Math.round(p.rate * 100)}%</>}
                </p>
                {p.timeShare !== null && (
                  <div>
                    <div className="mb-1 flex justify-between text-xs text-subtle">
                      <span>Время до цели</span>
                      <span>{Math.round(p.timeShare * 100)}% прошло</span>
                    </div>
                    <ProgressBar value={p.timeShare} color="var(--fg-subtle)" height={4} label="Прошедшее время" />
                  </div>
                )}
                <p className="text-xs text-subtle">
                  С {formatLongDate(goal.startDate)}
                  {goal.targetDate ? ` до ${formatLongDate(goal.targetDate)}` : ''}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-[12px] font-medium tracking-wide text-subtle uppercase">Привычки</p>
                {goal.habitIds.length === 0 && <p className="text-sm text-subtle">Привяжите привычки в настройках цели</p>}
                {goal.habitIds.map((id) => {
                  const h = habitsMap[id];
                  if (!h) return null;
                  const r = habitRate(h, entries, goal.startDate, today, today, ws);
                  const HI = habitIcon(h.icon);
                  return (
                    <div key={id}>
                      <div className="mb-1 flex items-center gap-2 text-sm">
                        <HI size={14} style={{ color: colorOf(h.color) }} />
                        <span className="min-w-0 flex-1 truncate text-fg">{h.name}</span>
                        <span className="text-xs text-subtle tabular-nums">{r.rate === null ? '—' : `${Math.round(r.rate * 100)}%`}</span>
                      </div>
                      <ProgressBar value={r.rate ?? 0} color={colorOf(h.color)} height={4} label={h.name} />
                    </div>
                  );
                })}
              </div>
              <div className="space-y-3">
                <p className="text-[12px] font-medium tracking-wide text-subtle uppercase">История продвижения</p>
                <Sparkline points={history} color={color} />
                <ul className="space-y-1.5">
                  {[...goal.history]
                    .reverse()
                    .slice(0, 4)
                    .map((e, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-muted">
                        <Flag size={11} className="text-subtle" />
                        <span className="text-subtle tabular-nums">{formatShortDate(e.date)}</span> {EVENT_LABEL[e.type]}
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

export default function GoalsPage() {
  const goalsMap = useApp((s) => s.data.goals);
  const hasHabits = useApp((s) => Object.keys(s.data.habits).length > 0);
  const goals = useMemo(
    () => Object.values(goalsMap).sort((a, b) => Number(!!a.achievedOn) - Number(!!b.achievedOn) || a.createdAt.localeCompare(b.createdAt)),
    [goalsMap],
  );
  const [modal, setModal] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <>
      <PageHeader
        eyebrow="Цели"
        title="Куда ведут привычки"
        description="Долгосрочные цели и привычки, которые к ним приближают. Прогресс считается по вашим реальным отметкам."
        actions={
          <Button variant="primary" onClick={() => setModal({ open: true, id: null })}>
            <Plus size={17} /> Новая цель
          </Button>
        }
      />
      {goals.length === 0 ? (
        <EmptyState
          icon={<Mountain size={28} />}
          title="Целей пока нет"
          description="Сформулируйте большую цель и привяжите к ней привычки — прогресс будет считаться автоматически."
          action={
            hasHabits ? (
              <Button variant="primary" onClick={() => setModal({ open: true, id: null })}>
                <Plus size={16} /> Создать цель
              </Button>
            ) : (
              <Button variant="primary" onClick={() => ui.openHabitModal()}>
                Сначала создать привычку
              </Button>
            )
          }
        />
      ) : (
        <LayoutGroup>
          <motion.ul variants={stagger} initial="hidden" animate="show" className="grid gap-4 lg:grid-cols-2">
            {goals.map((g) => (
              <GoalCard
                key={g.id}
                goal={g}
                expanded={expanded === g.id}
                onToggle={() => setExpanded(expanded === g.id ? null : g.id)}
                onEdit={() => setModal({ open: true, id: g.id })}
              />
            ))}
          </motion.ul>
        </LayoutGroup>
      )}
      <GoalModal open={modal.open} goalId={modal.id} onClose={() => setModal((m) => ({ ...m, open: false }))} />
    </>
  );
}
