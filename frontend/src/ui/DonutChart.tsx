import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

export interface DonutSlice {
  label: string;
  value: number;
  /** Fill for this slice. Status/semantic colour — always paired with the label. */
  color: string;
}

export interface DonutChartProps {
  slices: DonutSlice[];
  /** Big number in the hole (e.g. the total). */
  centerValue?: string;
  /** Small caption under the centre value. */
  centerCaption?: string;
  /** Required — the chart is not identifiable by colour alone. */
  ariaLabel: string;
  /** Chart height in px (the ring scales to it). Default 200. */
  height?: number;
}

/**
 * A donut for a small status breakdown (4–6 slices). Identity is carried by the
 * legend labels and per-slice counts, never colour alone (dataviz: status
 * palette + label). Segments are separated by a 2px surface gap.
 */
export function DonutChart({
  slices,
  centerValue,
  centerCaption,
  ariaLabel,
  height = 200,
}: DonutChartProps) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const pct = (value: number) => (total > 0 ? Math.round((value / total) * 100) : 0);

  return (
    <div className="donut" role="img" aria-label={ariaLabel}>
      <div className="donut__chart" style={{ height }}>
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="label"
              innerRadius="62%"
              outerRadius="100%"
              paddingAngle={total > 0 ? 2 : 0}
              stroke="var(--color-surface)"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {slices.map((slice) => (
                <Cell key={slice.label} fill={slice.color} />
              ))}
            </Pie>
            <Tooltip
              cursor={false}
              formatter={(value, name) => {
                const n = typeof value === 'number' ? value : Number(value) || 0;
                return [`${n} (${pct(n)}%)`, String(name)];
              }}
              contentStyle={{
                border: 'var(--border)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-xs)',
                boxShadow: 'var(--shadow-md)',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        {centerValue ? (
          <div className="donut__center" aria-hidden>
            <span className="donut__center-value">{centerValue}</span>
            {centerCaption ? <span className="donut__center-caption">{centerCaption}</span> : null}
          </div>
        ) : null}
      </div>

      <ul className="donut__legend">
        {slices.map((slice) => (
          <li className="donut__legend-item" key={slice.label}>
            <span className="donut__swatch" style={{ background: slice.color }} aria-hidden />
            <span className="donut__legend-label">{slice.label}</span>
            <span className="donut__legend-value">
              {slice.value}
              <span className="donut__legend-pct"> · {pct(slice.value)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
