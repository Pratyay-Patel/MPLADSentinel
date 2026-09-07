import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { StateUtilisation, UtilisationBand, UtilisationBucket } from '../../data';
import { formatINRCompact } from '../../format';

/**
 * Utilisation band → fill. A good→bad quality scale (green / blue / amber / red),
 * validated for CVD separation (`scripts/validate_palette.js`). Colour carries
 * the band, so both charts pair it with x-axis labels + a legend, and the low-
 * contrast pair (green/amber) always has a direct % label beside it.
 */
const BAND_COLOUR: Record<UtilisationBand, string> = {
  High: '#1baf7a',
  Good: '#2a78d6',
  Moderate: '#eda100',
  Low: '#cf4b3e',
};

const GRID = '#e6ebf1';
const AXIS_TEXT = '#5f6772';

const TOOLTIP_STYLE = {
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  fontSize: 'var(--text-xs)',
  boxShadow: 'var(--shadow-md)',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
} as const;

const money = (n: number) => formatINRCompact({ amount: n, currency: 'INR' });

interface StateTipProps {
  active?: boolean;
  payload?: { payload: StateUtilisation }[];
}

function StateTooltip({ active, payload }: StateTipProps) {
  if (!active || !payload?.length) return null;
  const s = payload[0].payload;
  return (
    <div style={TOOLTIP_STYLE} className="an-tip">
      <strong>{s.state}</strong>
      <div>Recorded utilisation: {Math.round(s.utilisationPct)}% ({s.band})</div>
      <div>Sanctioned (scored works): {money(s.sanctioned)}</div>
      <div>Recorded payments: {money(s.spent)}</div>
      <div>
        {s.worksScored} of {s.works} works scored (estimate + payment known)
      </div>
    </div>
  );
}

const ROW_H = 30;

/**
 * Every state/UT (in the order passed — already filtered + sorted by the page),
 * ranked by recorded fund utilisation. Fixed-height, vertically scrollable: the
 * inner chart grows with the row count, the wrapper caps the visible height. One
 * bar per state, coloured by band; the % is direct-labelled and the money detail
 * is in the hover tooltip.
 */
export function StateUtilisationChart({ states }: { states: StateUtilisation[] }) {
  const innerHeight = Math.max(180, states.length * ROW_H + 40);

  return (
    <div
      className="an-scroll"
      role="img"
      aria-label={`${states.length} states and union territories ranked by recorded fund utilisation`}
    >
      <ResponsiveContainer width="100%" height={innerHeight}>
        <BarChart
          layout="vertical"
          data={states}
          margin={{ top: 4, right: 44, bottom: 4, left: 8 }}
          barCategoryGap="28%"
        >
          <CartesianGrid horizontal={false} stroke={GRID} />
          <XAxis
            type="number"
            domain={[0, (max: number) => Math.max(20, Math.ceil(max / 20) * 20)]}
            tickFormatter={(v) => `${Math.round(Number(v) || 0)}%`}
            tick={{ fontSize: 12, fill: AXIS_TEXT }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="state"
            width={140}
            interval={0}
            tick={{ fontSize: 12, fill: AXIS_TEXT }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip cursor={{ fill: 'rgba(27,77,128,0.06)' }} content={<StateTooltip />} />
          <Bar dataKey="utilisationPct" radius={[0, 4, 4, 0]} isAnimationActive={false}>
            {states.map((d) => (
              <Cell key={d.state} fill={BAND_COLOUR[d.band]} />
            ))}
            <LabelList
              dataKey="utilisationPct"
              position="right"
              formatter={(v) => `${Math.round(Number(v) || 0)}%`}
              style={{ fontSize: 12, fill: AXIS_TEXT }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface BandTipProps {
  active?: boolean;
  payload?: { payload: UtilisationBucket }[];
}

function BandTooltip({ active, payload }: BandTipProps) {
  if (!active || !payload?.length) return null;
  const b = payload[0].payload;
  return (
    <div style={TOOLTIP_STYLE} className="an-tip">
      <strong>{b.band} utilisation</strong>
      <div>
        {b.mps} {b.mps === 1 ? 'MP' : 'MPs'} · {Math.round(b.sharePct)}% of those analysed
      </div>
    </div>
  );
}

/**
 * How the MPs analysed split across recorded-utilisation bands. Ordered best →
 * worst; one series, one hue — the x-axis labels and the band-definition caption
 * carry the meaning.
 */
export function UtilisationBandsChart({ buckets }: { buckets: UtilisationBucket[] }) {
  return (
    <div role="img" aria-label="MPs by recorded fund-utilisation band">
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={buckets} margin={{ top: 20, right: 8, bottom: 4, left: 8 }} barCategoryGap="34%">
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis
            dataKey="band"
            tick={{ fontSize: 12, fill: AXIS_TEXT }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(v) => `${Math.round(Number(v) || 0)}%`}
            tick={{ fontSize: 12, fill: AXIS_TEXT }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip cursor={{ fill: 'rgba(27,77,128,0.06)' }} content={<BandTooltip />} />
          <Bar dataKey="sharePct" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {buckets.map((b) => (
              <Cell key={b.band} fill={BAND_COLOUR[b.band]} />
            ))}
            <LabelList
              dataKey="sharePct"
              position="top"
              formatter={(v) => `${Math.round(Number(v) || 0)}%`}
              style={{ fontSize: 12, fill: AXIS_TEXT }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Shared legend mapping the four band colours to their utilisation ranges. */
export function BandLegend() {
  const items: { band: UtilisationBand; range: string }[] = [
    { band: 'High', range: '85%+' },
    { band: 'Good', range: '70–84%' },
    { band: 'Moderate', range: '50–69%' },
    { band: 'Low', range: 'below 50%' },
  ];
  return (
    <ul className="an-legend">
      {items.map((it) => (
        <li key={it.band} className="an-legend__item">
          <span className="an-legend__swatch" style={{ background: BAND_COLOUR[it.band] }} aria-hidden />
          {it.band} <span className="an-legend__range">({it.range})</span>
        </li>
      ))}
    </ul>
  );
}
