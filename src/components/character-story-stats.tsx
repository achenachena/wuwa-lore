import { AppearanceStatsTable } from "@/components/appearance-stats-table";

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
  return (
    <AppearanceStatsTable
      rows={rows.map((row) => ({
        id: row.segment.id,
        label: formatSegmentLabel(row.segment),
        appeared: row.appeared,
        lineCount: row.lineCount,
      }))}
      labels={{
        item: labels.storySegment,
        appeared: labels.appeared,
        lineCount: labels.lineCount,
        totalLines: labels.totalStoryLines,
        appearances: labels.segmentAppearances,
        yes: labels.yes,
        dash: labels.dash,
      }}
      totalTone="sky"
      appearanceTone="violet"
    />
  );
}
