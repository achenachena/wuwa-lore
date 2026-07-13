import { AppearanceStatsTable } from "@/components/appearance-stats-table";
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
  return (
    <AppearanceStatsTable
      rows={rows.map((row) => ({
        id: row.quest.id,
        label: questLabel(row),
        appeared: row.appeared,
        lineCount: row.lineCount,
      }))}
      labels={{
        item: labels.quest,
        appeared: labels.appeared,
        lineCount: labels.lineCount,
        totalLines: labels.totalLines,
        appearances: labels.questAppearances,
        yes: labels.yes,
        dash: labels.dash,
      }}
      totalTone="amber"
      appearanceTone="emerald"
      lineColorClass="bg-amber-500"
    />
  );
}
