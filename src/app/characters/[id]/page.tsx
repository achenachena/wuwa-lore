import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CharacterOptionalQuestStats } from "@/components/character-optional-quest-stats";
import { CharacterStoryStats } from "@/components/character-story-stats";
import { CharacterWordCloud } from "@/components/character-word-cloud";
import { CharacterAvatar } from "@/components/character-avatar";
import { getCharacterDetailData } from "@/lib/data";
import { getCharacterDisplayName } from "@/lib/i18n/character-names";
import { localizeGameLabel, localizeImageType } from "@/lib/i18n/game-labels";
import { formatStorySegmentLabel } from "@/lib/i18n/locale";
import { getMessages, getSiteLocale } from "@/lib/i18n/server";
import { profileForLocale } from "@/lib/i18n/text-locale";

type CharacterDetailProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: CharacterDetailProps): Promise<Metadata> {
  const { id } = await params;
  const [t, siteLocale, { character }] = await Promise.all([
    getMessages(),
    getSiteLocale(),
    getCharacterDetailData(id),
  ]);
  if (!character) {
    return {
      title: t.characterDetail.notFoundTitle,
    };
  }
  const displayName = await getCharacterDisplayName(
    character.id,
    character.name,
    siteLocale,
  );
  return {
    title: `${displayName} | ${t.siteTitle}`,
    description: `${displayName} ${t.characterDetail.metaDescription}`,
  };
}

export default async function CharacterDetailPage({
  params,
}: CharacterDetailProps) {
  const { id } = await params;
  const [
    locale,
    t,
    {
      character,
      characterImages,
      storySegments,
      optionalQuestStats,
      portraitUrl,
      firstAppearanceVersion,
      wordCloud,
    },
  ] = await Promise.all([
    getSiteLocale(),
    getMessages(),
    getCharacterDetailData(id),
  ]);

  if (!character) {
    notFound();
  }

  const displayName = await getCharacterDisplayName(
    character.id,
    character.name,
    locale,
  );
  const profileText = profileForLocale(character.profile, locale);

  return (
    <section className="space-y-6">
      <div>
        <Link href="/characters" className="text-sm text-zinc-500">
          {t.common.backToCharacters}
        </Link>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
          <CharacterAvatar name={displayName} src={portraitUrl} size={88} />
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-semibold">{displayName}</h1>
            {profileText ? (
              <p className="mt-2 max-w-3xl text-zinc-700">{profileText}</p>
            ) : (
              <p className="mt-2 max-w-3xl text-zinc-500">
                {t.characterDetail.noProfile}
              </p>
            )}
            <p className="mt-2 text-xs text-zinc-500">
              {t.common.source}:{" "}
              <a
                href={character.source.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                {character.source.sourceUrl}
              </a>
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <article className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-sm text-zinc-500">{t.characterDetail.element}</p>
          <p className="mt-1 font-medium">
            {localizeGameLabel(character.element, "element", locale)}
          </p>
        </article>
        <article className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-sm text-zinc-500">{t.characterDetail.weapon}</p>
          <p className="mt-1 font-medium">
            {localizeGameLabel(character.weapon, "weapon", locale)}
          </p>
        </article>
        <article className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-sm text-zinc-500">{t.characterDetail.faction}</p>
          <p className="mt-1 font-medium">
            {localizeGameLabel(character.faction, "faction", locale)}
          </p>
        </article>
        <article className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-sm text-zinc-500">
            {t.characterDetail.appearanceVersion}
          </p>
          <p className="mt-1 font-medium">
            {firstAppearanceVersion ?? t.common.dash}
          </p>
        </article>
      </div>

      <article className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold">
          {t.characterDetail.wordCloudTitle}
        </h2>
        <div className="mt-4">
          <CharacterWordCloud
            terms={wordCloud?.terms ?? []}
            lineCount={wordCloud?.lineCount ?? 0}
            labels={{
              title: t.characterDetail.wordCloudTitle,
              description: t.characterDetail.wordCloudDescription,
              lineCount: t.characterDetail.wordCloudLineCount,
              termCount: t.characterDetail.wordCloudTermCount,
              empty: t.characterDetail.wordCloudEmpty,
            }}
          />
        </div>
      </article>

      <article className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold">
          {t.characterDetail.storySectionTitle}
        </h2>
        {storySegments.length === 0 ? (
          <p className="mt-2 text-zinc-600">{t.characterDetail.noStoryData}</p>
        ) : (
          <div className="mt-4">
            <CharacterStoryStats
              rows={storySegments}
              labels={{
                storySegment: t.characterDetail.storySegment,
                appeared: t.characterDetail.appeared,
                lineCount: t.characterDetail.lineCount,
                totalStoryLines: t.characterDetail.totalStoryLines,
                segmentAppearances: t.characterDetail.segmentAppearances,
                yes: t.common.yes,
                dash: t.common.dash,
              }}
              formatSegmentLabel={(segment) =>
                formatStorySegmentLabel(segment, locale)
              }
            />
          </div>
        )}
      </article>

      {optionalQuestStats.map((section) =>
        section.rows.length > 0 ? (
          <article
            key={section.category}
            className="rounded-lg border border-zinc-200 bg-white p-4"
          >
            <h2 className="text-lg font-semibold">
              {t.optionalQuests.sectionTitles[section.category]}
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              {t.optionalQuests.sectionDescriptions[section.category]}
            </p>
            <div className="mt-4">
              <CharacterOptionalQuestStats
                rows={section.rows}
                labels={{
                  quest: t.optionalQuests.quest,
                  appeared: t.characterDetail.appeared,
                  lineCount: t.characterDetail.lineCount,
                  totalLines: t.optionalQuests.totalLines,
                  questAppearances: t.optionalQuests.questAppearances,
                  yes: t.common.yes,
                  dash: t.common.dash,
                }}
                questLabel={(row) =>
                  locale === "zh" ? row.quest.nameZh : row.quest.nameEn
                }
              />
            </div>
          </article>
        ) : null,
      )}

      <article className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold">
          {t.characterDetail.imagesTitle}
        </h2>
        {characterImages.length === 0 ? (
          <p className="mt-2 text-zinc-600">{t.characterDetail.noImages}</p>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {characterImages.map((image) => (
              <figure
                key={image.id}
                className="rounded border border-zinc-200 p-3"
              >
                <Image
                  src={image.localPath}
                  alt={image.title}
                  width={480}
                  height={270}
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="h-auto w-full rounded"
                />
                <figcaption className="mt-2 text-xs text-zinc-600">
                  {locale === "en"
                    ? `${image.title} (${localizeImageType(image.type, locale)})`
                    : localizeImageType(image.type, locale)}{" "}
                  · {t.common.source}: {image.source.sourceUrl}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}
