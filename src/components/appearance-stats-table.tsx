import { MetricBar } from "@/components/metric-bar";

export type AppearanceStatRow = {
  id: string;
  label: string;
  appeared: boolean;
  lineCount: number;
};

type Labels = {
  item: string;
  appeared: string;
  lineCount: string;
  totalLines: string;
  appearances: string;
  yes: string;
  dash: string;
};

type Props = {
  rows: AppearanceStatRow[];
  labels: Labels;
  lineColorClass?: string;
  totalTone?: "sky" | "amber";
  appearanceTone?: "violet" | "emerald";
};

const TONES = {
  sky: {
    border: "border-sky-100 bg-sky-50",
    label: "text-sky-700",
    value: "text-sky-900",
    bar: "bg-sky-500",
  },
  amber: {
    border: "border-amber-100 bg-amber-50",
    label: "text-amber-800",
    value: "text-amber-950",
    bar: "bg-amber-500",
  },
  violet: {
    border: "border-violet-100 bg-violet-50",
    label: "text-violet-700",
    value: "text-violet-900",
    bar: "bg-violet-500",
  },
  emerald: {
    border: "border-emerald-100 bg-emerald-50",
    label: "text-emerald-800",
    value: "text-emerald-950",
    bar: "bg-emerald-500",
  },
} as const;

export function AppearanceStatsTable({
  rows,
  labels,
  lineColorClass,
  totalTone = "sky",
  appearanceTone = "violet",
}: Props) {
  const totalLines = rows.reduce((sum, row) => sum + row.lineCount, 0);
  const appearanceCount = rows.filter((row) => row.appeared).length;
  const maxLines = Math.max(...rows.map((row) => row.lineCount), 1);
  const totalStyles = TONES[totalTone];
  const appearanceStyles = TONES[appearanceTone];
  const barColor = lineColorClass ?? totalStyles.bar;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className={`rounded-lg border p-4 ${totalStyles.border}`}>
          <p className={`text-sm ${totalStyles.label}`}>{labels.totalLines}</p>
          <p className={`mt-1 text-2xl font-semibold ${totalStyles.value}`}>{totalLines}</p>
          <MetricBar value={totalLines} max={totalLines} colorClass={totalStyles.bar} showValue={false} />
        </div>
        <div className={`rounded-lg border p-4 ${appearanceStyles.border}`}>
          <p className={`text-sm ${appearanceStyles.label}`}>{labels.appearances}</p>
          <p className={`mt-1 text-2xl font-semibold ${appearanceStyles.value}`}>{appearanceCount}</p>
          <MetricBar
            value={appearanceCount}
            max={rows.length}
            colorClass={appearanceStyles.bar}
            showValue={false}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-zinc-500">
              <th className="py-2 pr-4">{labels.item}</th>
              <th className="py-2 pr-4">{labels.appeared}</th>
              <th className="py-2">{labels.lineCount}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-zinc-100">
                <td className="py-3 pr-4 font-medium">{row.label}</td>
                <td className="py-3 pr-4">
                  {row.appeared ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      {labels.yes}
                    </span>
                  ) : (
                    labels.dash
                  )}
                </td>
                <td className="py-3">
                  {row.lineCount > 0 ? (
                    <MetricBar value={row.lineCount} max={maxLines} colorClass={barColor} />
                  ) : (
                    labels.dash
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
