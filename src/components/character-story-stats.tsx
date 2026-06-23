"use client";

import { MetricBar } from "@/components/metric-bar";

type StorySegmentRow = {
  segment: {
    id: string;
    version: string;
    nameZh: string;
    wikiTitle: string;
  };
  appeared: boolean;
  lineCount: number;
};

type Labels = {
  storySegment: string;
  appeared: string;
  lineCount: string;
  totalStoryLines: string;
  segmentAppearances: string;
  yes: string;
  dash: string;
};

type Props = {
  rows: StorySegmentRow[];
  labels: Labels;
  formatSegmentLabel: (segment: StorySegmentRow["segment"]) => string;
};

export function CharacterStoryStats({ rows, labels, formatSegmentLabel }: Props) {
  const totalLines = rows.reduce((sum, row) => sum + row.lineCount, 0);
  const appearanceCount = rows.filter((row) => row.appeared).length;
  const maxLines = Math.max(...rows.map((row) => row.lineCount), 1);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-sky-100 bg-sky-50 p-4">
          <p className="text-sm text-sky-700">{labels.totalStoryLines}</p>
          <p className="mt-1 text-2xl font-semibold text-sky-900">{totalLines}</p>
          <MetricBar value={totalLines} max={totalLines} colorClass="bg-sky-500" showValue={false} />
        </div>
        <div className="rounded-lg border border-violet-100 bg-violet-50 p-4">
          <p className="text-sm text-violet-700">{labels.segmentAppearances}</p>
          <p className="mt-1 text-2xl font-semibold text-violet-900">{appearanceCount}</p>
          <MetricBar
            value={appearanceCount}
            max={rows.length}
            colorClass="bg-violet-500"
            showValue={false}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-zinc-500">
              <th className="py-2 pr-4">{labels.storySegment}</th>
              <th className="py-2 pr-4">{labels.appeared}</th>
              <th className="py-2">{labels.lineCount}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.segment.id} className="border-b border-zinc-100">
                <td className="py-3 pr-4 font-medium">{formatSegmentLabel(row.segment)}</td>
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
                    <MetricBar value={row.lineCount} max={maxLines} colorClass="bg-sky-500" />
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
