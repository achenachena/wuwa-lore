import { MetricBar } from "@/components/metric-bar";
import type { CharacterOptionalQuestRow } from "@/types/lore";

type Labels = {
  quest: string;
  appeared: string;
  lineCount: string;
  totalLines: string;
  questAppearances: string;
  yes: string;
  dash: string;
};

type Props = {
  rows: CharacterOptionalQuestRow[];
  labels: Labels;
  questLabel: (row: CharacterOptionalQuestRow) => string;
};

export function CharacterOptionalQuestStats({ rows, labels, questLabel }: Props) {
  const totalLines = rows.reduce((sum, row) => sum + row.lineCount, 0);
  const appearanceCount = rows.filter((row) => row.appeared).length;
  const maxLines = Math.max(...rows.map((row) => row.lineCount), 1);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-amber-100 bg-amber-50 p-4">
          <p className="text-sm text-amber-800">{labels.totalLines}</p>
          <p className="mt-1 text-2xl font-semibold text-amber-950">{totalLines}</p>
          <MetricBar value={totalLines} max={totalLines} colorClass="bg-amber-500" showValue={false} />
        </div>
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
          <p className="text-sm text-emerald-800">{labels.questAppearances}</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-950">{appearanceCount}</p>
          <MetricBar
            value={appearanceCount}
            max={rows.length}
            colorClass="bg-emerald-500"
            showValue={false}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-zinc-500">
              <th className="py-2 pr-4">{labels.quest}</th>
              <th className="py-2 pr-4">{labels.appeared}</th>
              <th className="py-2">{labels.lineCount}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.quest.id} className="border-b border-zinc-100">
                <td className="py-3 pr-4 font-medium">{questLabel(row)}</td>
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
                    <MetricBar value={row.lineCount} max={maxLines} colorClass="bg-amber-500" />
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
