"use client";

/**
 * A horizontal status bar for the three progress bands. Status colors
 * (success/warning/danger) are reserved for exactly this — real state, not a
 * stand-in for "series 4" — and each bar carries its own text label, so
 * identity never rests on color alone.
 */
export function StatusBarChart({
  segments,
}: {
  segments: { label: string; value: number; tone: "success" | "warning" | "danger" }[];
}) {
  const total = Math.max(1, segments.reduce((sum, s) => sum + s.value, 0));
  const toneClass = {
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
  } as const;
  const textToneClass = {
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
  } as const;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-3 overflow-hidden rounded-full bg-surface-alt">
        {segments.map((s) => (
          <div
            key={s.label}
            className={toneClass[s.tone]}
            style={{ width: `${(s.value / total) * 100}%` }}
            title={`${s.label}: ${s.value}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-4">
        {segments.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5 text-sm">
            <span className={"size-2 rounded-full " + toneClass[s.tone]} aria-hidden />
            <span className="text-text-secondary">{s.label}</span>
            <span className={"font-semibold tabular-nums " + textToneClass[s.tone]}>{s.value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
