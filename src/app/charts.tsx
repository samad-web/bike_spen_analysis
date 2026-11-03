import { useId } from "react";

/* Chart primitives — plain SVG, no library. Dataviz skill rules:
   - thin marks (2px lines, 4px rounded data-ends, >=8px markers)
   - 2px gap between adjacent fills
   - recessive axes (--divider), text in --ink-muted
   - categorical colors assigned in fixed order from --chart-1..6
*/

export const CHART_COLORS = ["--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-5", "--chart-6"] as const;

export interface BarChartDatum { label: string; value: number }

/** Gradient-filled vertical bars (AI Meeting Tool style). Hero bar auto-detected
 * = max value, gets the brand accent gradient; others get a muted glass fill. */
export function GradientBars({ data, height = 180, highlightIdx }: {
  data: BarChartDatum[];
  height?: number;
  highlightIdx?: number;
}) {
  const gradId = useId();
  if (data.length === 0) return <p className="u-ink-muted u-text-sm">No data.</p>;
  const max = Math.max(...data.map((d) => d.value), 1);
  const barW = 32;
  const gap = 12; // >= 2px per skill, 12 picked for breathing room
  const w = data.length * (barW + gap) - gap;
  const pad = 20;
  const highlight = highlightIdx ?? data.reduce((best, d, i, arr) => (d.value > arr[best].value ? i : best), 0);

  return (
    <svg className="chart" viewBox={`0 0 ${w + pad * 2} ${height + 32}`} role="img" aria-label="Bar chart">
      <defs>
        <linearGradient id={`${gradId}-hero`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--accent-glow)"/>
          <stop offset="100%" stopColor="var(--accent-500)"/>
        </linearGradient>
        <linearGradient id={`${gradId}-mute`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--ink-muted)" stopOpacity="0.35"/>
          <stop offset="100%" stopColor="var(--ink-muted)" stopOpacity="0.12"/>
        </linearGradient>
      </defs>
      {data.map((d, i) => {
        const h = (d.value / max) * height;
        const x = pad + i * (barW + gap);
        const y = height - h;
        return (
          <g key={d.label}>
            <rect x={x} y={y} width={barW} height={h} rx={8}
              fill={i === highlight ? `url(#${gradId}-hero)` : `url(#${gradId}-mute)`} />
            <text x={x + barW / 2} y={height + 20} textAnchor="middle">{d.label}</text>
            {i === highlight && (
              <text x={x + barW / 2} y={y - 8} textAnchor="middle" style={{ fill: "var(--ink)", fontWeight: 600 }}>
                {formatShort(d.value)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** Smooth line with soft gradient fill underneath (Dashboard UI style). */
export function TrendLine({ data, height = 160, color = "--chart-1" }: {
  data: number[];
  height?: number;
  color?: typeof CHART_COLORS[number];
}) {
  const gradId = useId();
  if (data.length < 2) return <p className="u-ink-muted u-text-sm">Not enough data for a trend.</p>;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 320;
  const pad = 8;
  const stepX = (w - pad * 2) / (data.length - 1);
  const points = data.map((v, i) => ({
    x: pad + i * stepX,
    y: pad + (height - pad * 2) * (1 - (v - min) / range),
  }));
  const path = smoothPath(points);
  const area = `${path} L ${points[points.length - 1].x} ${height - pad} L ${points[0].x} ${height - pad} Z`;

  return (
    <svg className="chart" viewBox={`0 0 ${w} ${height}`} role="img" aria-label="Trend line">
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={`var(${color})`} stopOpacity="0.35"/>
          <stop offset="100%" stopColor={`var(${color})`} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path d={path} className="mark-line" style={{ stroke: `var(${color})` }} />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill={`var(${color})`} />
      ))}
    </svg>
  );
}

/** Donut — used for payment-method breakdown and category split. */
export function Donut({ data, size = 180, thickness = 22, centerLabel, centerValue }: {
  data: { label: string; value: number; color?: typeof CHART_COLORS[number] }[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return <p className="u-ink-muted u-text-sm">No data.</p>;
  const r = size / 2 - thickness / 2;
  const cx = size / 2;
  const cy = size / 2;
  let acc = 0;
  const circ = 2 * Math.PI * r;
  const segments = data.map((d, i) => {
    const frac = d.value / total;
    const len = frac * circ;
    const offset = -acc;
    acc += len;
    return { color: d.color ?? CHART_COLORS[i % CHART_COLORS.length], len, offset, gap: 2 };
  });

  return (
    <svg className="chart" viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Donut chart">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--divider)" strokeWidth={thickness}/>
      {segments.map((s, i) => (
        <circle key={i}
          cx={cx} cy={cy} r={r} fill="none"
          stroke={`var(${s.color})`}
          strokeWidth={thickness}
          strokeDasharray={`${Math.max(0, s.len - s.gap)} ${circ}`}
          strokeDashoffset={s.offset}
          transform={`rotate(-90 ${cx} ${cy})`}
          strokeLinecap="butt"
        />
      ))}
      {centerValue && (
        <>
          <text x={cx} y={cy - 2} textAnchor="middle" style={{ fill: "var(--ink)", fontWeight: 700, fontSize: 20 }}>
            {centerValue}
          </text>
          {centerLabel && <text x={cx} y={cy + 16} textAnchor="middle">{centerLabel}</text>}
        </>
      )}
    </svg>
  );
}

/* ---------------- helpers ---------------- */

function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const cur = pts[i];
    const mx = (prev.x + cur.x) / 2;
    d += ` C ${mx} ${prev.y}, ${mx} ${cur.y}, ${cur.x} ${cur.y}`;
  }
  return d;
}

export function formatShort(n: number): string {
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return n.toFixed(0);
}

export function formatCurrency(n: number, currency: "INR" | "USD" = "INR"): string {
  const symbol = currency === "INR" ? "₹" : "$";
  return `${symbol}${n.toLocaleString(undefined, { maximumFractionDigits: n < 100 ? 2 : 0 })}`;
}
