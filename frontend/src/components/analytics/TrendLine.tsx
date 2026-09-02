"use client";

/**
 * A minimal single-series trend line — thin 2px stroke on the accent token
 * (sequential/magnitude use is one hue, per the dataviz method), recessive
 * baseline, and a rounded end-cap on the last point so the current value
 * reads at a glance. No hover layer: this is a fixed-chart summary view, not
 * an explorable one — an accessible summary line under the chart carries the
 * same information for screen readers.
 */
export function TrendLine({
  points,
  label,
  formatValue = (v: number) => String(v),
}: {
  points: { date: string; value: number }[];
  label: string;
  formatValue?: (v: number) => string;
}) {
  const width = 100;
  const height = 40;
  const max = Math.max(1, ...points.map((p) => p.value));
  const step = points.length > 1 ? width / (points.length - 1) : 0;

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${(i * step).toFixed(2)} ${(height - (p.value / max) * height).toFixed(2)}`)
    .join(" ");

  const last = points[points.length - 1];
  const first = points[0];

  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-text-tertiary">{label}</p>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="h-20 w-full overflow-visible"
        role="img"
        aria-label={`${label} trend from ${formatValue(first?.value ?? 0)} to ${formatValue(last?.value ?? 0)}`}
      >
        <line x1={0} y1={height} x2={width} y2={height} stroke="var(--color-border)" strokeWidth={0.5} />
        <path d={path} fill="none" stroke="var(--color-accent)" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {last && (
          <circle
            cx={(points.length - 1) * step}
            cy={height - (last.value / max) * height}
            r={1.6}
            fill="var(--color-accent)"
          />
        )}
      </svg>
      <p className="mt-1 text-right text-sm font-semibold tabular-nums text-text-primary">
        {formatValue(last?.value ?? 0)}
      </p>
    </div>
  );
}
