import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { MP_SERIES_VARS, type Metric } from './metrics';

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

/** Minimal shape this chart needs — either `MpStat` or the citizen-safe `CitizenMpStat`. */
export interface MpLike {
  id: string;
  mpName: string;
}

export interface MpCompareChartProps<T extends MpLike> {
  selected: T[];
  /** Every MP, for the "all-MP average" reference line. */
  allMps: T[];
  metric: Metric<T>;
}

/**
 * One coloured bar per selected MP for the chosen metric, with a dashed
 * all-MP-average reference line. Identity is carried by the x-axis MP name and
 * the value label on each bar (never colour alone); the detailed table below is
 * the accessible fallback. dataviz palette slots 1–4, theme-swapped in CSS.
 *
 * Generic over `T` so the citizen-safe Compare MPs page can reuse this exact
 * chart with `CitizenMpStat` — no risk-specific code lives here either way.
 */
export function MpCompareChart<T extends MpLike>({ selected, allMps, metric }: MpCompareChartProps<T>) {
  const rows = selected.map((m, i) => ({
    key: m.id,
    name: truncate(m.mpName, 18),
    full: m.mpName,
    value: metric.value(m),
    label: metric.format(m),
    fill: MP_SERIES_VARS[i % MP_SERIES_VARS.length],
  }));

  const avg =
    allMps.length > 0 ? allMps.reduce((sum, m) => sum + metric.value(m), 0) / allMps.length : 0;

  return (
    <div className="mpc-chart" role="img" aria-label={`${metric.label} by selected MP`}>
      <div className="mpc-chart__plot" style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={rows} margin={{ top: 24, right: 16, bottom: 4, left: 4 }} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke="var(--color-border)" />
            <XAxis
              dataKey="name"
              interval={0}
              tickLine={false}
              axisLine={{ stroke: 'var(--color-border)' }}
              tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }}
            />
            <YAxis
              tickFormatter={metric.fmt}
              width={64}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
            />
            <Tooltip
              cursor={{ fill: 'var(--color-surface-sunken)' }}
              formatter={(_value, _name, entry) => [
                (entry?.payload as { label: string }).label,
                (entry?.payload as { full: string }).full,
              ]}
              contentStyle={{
                border: 'var(--border)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-xs)',
                boxShadow: 'var(--shadow-md)',
              }}
            />
            {allMps.length > 0 && (
              <ReferenceLine
                y={avg}
                stroke="var(--color-text-muted)"
                strokeDasharray="4 4"
                label={{
                  value: `all-MP avg ${metric.fmt(avg)}`,
                  position: 'insideTopRight',
                  fontSize: 11,
                  fill: 'var(--color-text-muted)',
                }}
              />
            )}
            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={96} isAnimationActive={false}>
              {rows.map((row) => (
                <Cell key={row.key} fill={row.fill} />
              ))}
              <LabelList
                dataKey="label"
                position="top"
                style={{ fontSize: 12, fill: 'var(--color-text)' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <ul className="mpc-chart__legend">
        {selected.map((m, i) => (
          <li key={m.id}>
            <span
              className="mpc-chart__swatch"
              style={{ background: MP_SERIES_VARS[i % MP_SERIES_VARS.length] }}
              aria-hidden
            />
            {m.mpName}
          </li>
        ))}
      </ul>
    </div>
  );
}
