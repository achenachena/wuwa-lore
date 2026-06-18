import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCharacterDetailData } from "@/lib/data";
import { formatStorySegmentLabel } from "@/lib/i18n/locale";
import { getMessages, getSiteLocale } from "@/lib/i18n/server";

type CharacterDetailProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: CharacterDetailProps): Promise<Metadata> {
  const { id } = await params;
  const [t, { character }] = await Promise.all([getMessages(), getCharacterDetailData(id)]);
  if (!character) {
    return {
      title: t.characterDetail.notFoundTitle,
    };
  }
  return {
    title: `${character.name} | ${t.siteTitle}`,
    description: `${character.name} ${t.characterDetail.metaDescription}`,
  };
}

export default async function CharacterDetailPage({ params }: CharacterDetailProps) {
  const { id } = await params;
  const [locale, t, { character, characterImages, storySegments }] = await Promise.all([
    getSiteLocale(),
    getMessages(),
    getCharacterDetailData(id),
  ]);

  if (!character) {
    notFound();
  }

  return (
    <section className="space-y-6">
      <div>
        <Link href="/characters" className="text-sm text-zinc-500">
          {t.common.backToCharacters}
        </Link>
        <h1 className="mt-2 text-3xl font-semibold">{character.name}</h1>
        <p className="mt-2 max-w-3xl text-zinc-700">{character.profile}</p>
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

      <div className="grid gap-4 md:grid-cols-4">
        <article className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-sm text-zinc-500">{t.characterDetail.element}</p>
          <p className="mt-1 font-medium">{character.element}</p>
        </article>
        <article className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-sm text-zinc-500">{t.characterDetail.weapon}</p>
          <p className="mt-1 font-medium">{character.weapon}</p>
        </article>
        <article className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-sm text-zinc-500">{t.characterDetail.faction}</p>
          <p className="mt-1 font-medium">{character.faction}</p>
        </article>
        <article className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-sm text-zinc-500">{t.characterDetail.debutVersion}</p>
          <p className="mt-1 font-medium">{character.releaseVersion}</p>
        </article>
      </div>

      <article className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold">{t.characterDetail.storySectionTitle}</h2>
        <p className="mt-1 text-sm text-zinc-600">
          {t.characterDetail.storySectionDescription}{" "}
          <a
            className="underline"
            href={locale === "zh" ? "https://encore.moe/story?lang=zh-Hans" : "https://encore.moe/story?lang=en"}
            target="_blank"
            rel="noreferrer"
          >
            encore.moe
          </a>
          .
        </p>
        {storySegments.length === 0 ? (
          <p className="mt-2 text-zinc-600">{t.characterDetail.noStoryData}</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-zinc-500">
                  <th className="py-2 pr-4">{t.characterDetail.storySegment}</th>
                  <th className="py-2 pr-4">{t.characterDetail.appeared}</th>
                  <th className="py-2">{t.characterDetail.lineCount}</th>
                </tr>
              </thead>
              <tbody>
                {storySegments.map((row) => (
                  <tr key={row.segment.id} className="border-b border-zinc-100">
                    <td className="py-2 pr-4 font-medium">
                      {formatStorySegmentLabel(row.segment, locale)}
                    </td>
                    <td className="py-2 pr-4">{row.appeared ? t.common.yes : t.common.dash}</td>
                    <td className="py-2">{row.lineCount > 0 ? row.lineCount : t.common.dash}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <article className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold">{t.characterDetail.imagesTitle}</h2>
        {characterImages.length === 0 ? (
          <p className="mt-2 text-zinc-600">{t.characterDetail.noImages}</p>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {characterImages.map((image) => (
              <figure key={image.id} className="rounded border border-zinc-200 p-3">
                <Image
                  src={image.localPath}
                  alt={image.title}
                  width={480}
                  height={270}
                  className="h-auto w-full rounded"
                />
                <figcaption className="mt-2 text-xs text-zinc-600">
                  {image.title} ({image.type}) · {t.common.source}: {image.source.sourceUrl}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}
