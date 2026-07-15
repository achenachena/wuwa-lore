import type { Metadata } from "next";

import { OptionalQuestsBrowser } from "@/components/optional-quests-browser";
import { getOptionalQuestStatsPageData } from "@/lib/data";
import { isQuestCategory } from "@/lib/data/quest-categories";
import { getMessages, getSiteLocale } from "@/lib/i18n/server";
import { pageMetadata } from "@/lib/seo/metadata";
import type { QuestCategory } from "@/types/lore";

type PageProps = {
  searchParams: Promise<{ category?: string }>;
};

function parseCategory(value?: string): QuestCategory {
  return isQuestCategory(value) ? value : "companion";
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const category = parseCategory(params.category);
  const [t, locale] = await Promise.all([getMessages(), getSiteLocale()]);
  const categoryLabel = t.optionalQuests[category];
  return pageMetadata({
    title: `${t.optionalQuests.title} · ${categoryLabel}`,
    description: t.optionalQuests.description,
    path:
      category === "companion"
        ? "/stats/optional-quests"
        : `/stats/optional-quests?category=${category}`,
    locale,
    keywords: t.siteKeywords,
  });
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
