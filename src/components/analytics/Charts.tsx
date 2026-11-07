'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ChartPoint, MonthPoint } from '@/lib/habits/analytics';

const AXIS = { fontSize: 11, fill: 'var(--fg-subtle)' };

interface TooltipEntry {
  payload?: ChartPoint & MonthPoint & { tooltipLabel?: string };
}

function ChartTooltip({ active, payload, mode }: { active?: boolean; payload?: readonly TooltipEntry[]; mode?: 'count' | 'rate' }) {
  const p = payload?.[0]?.payload;
  if (!active || !p) return null;
  return (
    <div className="glass-solid rounded-xl px-3 py-2 text-xs">
      <p className="font-medium text-fg">{p.tooltipLabel ?? p.fullLabel ?? p.label}</p>
      {mode === 'rate' ? (
        <p className="mt-1 text-muted">
          Выполнение: <span className="font-semibold text-fg tabular-nums">{p.rate === null ? '—' : `${p.rate}%`}</span>
        </p>
      ) : null}
      <p className="mt-0.5 text-muted tabular-nums">
        Выполнено {p.completed} из {p.scheduled}
        {p.missed ? ` · пропущено ${p.missed}` : ''}
      </p>
    </div>
  );
}

function ChartLegend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-4 text-[12px] text-muted">
      {items.map((i) => (
        <li key={i.label} className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: i.color }} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

/** Выполнено / пропущено по дням или неделям (столбцы с накоплением). */
export function CompletionBars({ data, height = 240, tooltipPrefix }: { data: ChartPoint[]; height?: number; tooltipPrefix?: string }) {
  const rows = data.map((d) => ({ ...d, tooltipLabel: tooltipPrefix ? `${tooltipPrefix} ${d.label}` : d.label, open: Math.max(0, d.scheduled - d.completed - d.missed) }));
  return (
    <div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 4, left: -24, bottom: 0 }} barCategoryGap="22%">
            <CartesianGrid vertical={false} stroke="var(--hairline)" />
            <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={8} />
            <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} width={48} />
            <Tooltip cursor={{ fill: 'var(--fill)' }} content={<ChartTooltip mode="count" />} />
            <Bar dataKey="completed" stackId="a" fill="var(--success)" isAnimationActive animationDuration={700} />
            <Bar dataKey="missed" stackId="a" fill="var(--danger)" fillOpacity={0.75} />
            <Bar dataKey="open" stackId="a" fill="var(--fill-strong)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartLegend
        items={[
          { label: 'Выполнено', color: 'var(--success)' },
          { label: 'Пропущено', color: 'var(--danger)' },
          { label: 'Ожидает', color: 'var(--fill-strong)' },
        ]}
      />
    </div>
  );
}

/** Процент выполнения во времени. */
export function RateArea({ data, height = 240 }: { data: (ChartPoint | MonthPoint)[]; height?: number }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id="rate-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--hairline)" />
          <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={16} />
          <YAxis domain={[0, 100]} ticks={[0, 50, 100]} tick={AXIS} tickLine={false} axisLine={false} width={48} unit="%" />
          <Tooltip cursor={{ stroke: 'var(--fg-subtle)', strokeDasharray: '3 3' }} content={<ChartTooltip mode="rate" />} />
          <Area
            type="monotone"
            dataKey="rate"
            stroke="var(--accent)"
            strokeWidth={2}
            fill="url(#rate-fill)"
            connectNulls
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--bg)' }}
            animationDuration={800}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Сравнение процента по неделям/месяцам. */
export function RateBars({ data, height = 220 }: { data: (ChartPoint | MonthPoint)[]; height?: number }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: -24, bottom: 0 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke="var(--hairline)" />
          <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={8} />
          <YAxis domain={[0, 100]} ticks={[0, 50, 100]} tick={AXIS} tickLine={false} axisLine={false} width={48} unit="%" />
          <Tooltip cursor={{ fill: 'var(--fill)' }} content={<ChartTooltip mode="rate" />} />
          <Bar dataKey="rate" fill="var(--accent)" radius={[4, 4, 0, 0]} animationDuration={700} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
