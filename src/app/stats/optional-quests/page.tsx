import { OptionalQuestsBrowser } from "@/components/optional-quests-browser";
import { getOptionalQuestStatsPageData } from "@/lib/data";
import { getMessages } from "@/lib/i18n/server";
import type { QuestCategory } from "@/types/lore";

type PageProps = {
  searchParams: Promise<{ category?: string }>;
};

function parseCategory(value?: string): QuestCategory {
  if (value === "event" || value === "side" || value === "companion") {
    return value;
  }
  return "companion";
}

export default async function OptionalQuestStatsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const category = parseCategory(params.category);
  const [pageData, t] = await Promise.all([getOptionalQuestStatsPageData(category), getMessages()]);

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">{t.optionalQuests.title}</h1>
      <p className="text-zinc-600">{t.optionalQuests.description}</p>
      <OptionalQuestsBrowser
        initialCategory={category}
        questCounts={pageData.questCounts}
        ranking={pageData.ranking}
        characterPortraits={pageData.characterPortraits}
        coverage={pageData.coverage}
        unmappedSpeakers={pageData.unmappedSpeakers}
        labels={t.optionalQuests}
      />
    </section>
  );
}
