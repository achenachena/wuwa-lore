type MetricBarProps = {
  value: number;
  max: number;
  colorClass?: string;
  showValue?: boolean;
};

export function MetricBar({
  value,
  max,
  colorClass = "bg-sky-500",
  showValue = true,
}: MetricBarProps) {
  const widthPercent = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;

  return (
    <div className="flex min-w-[120px] items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100">
        <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${widthPercent}%` }} />
      </div>
      {showValue ? <span className="w-10 shrink-0 text-right tabular-nums">{value}</span> : null}
    </div>
  );
}
