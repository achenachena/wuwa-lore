import { promises as fs } from "node:fs";
import path from "node:path";

import { ENCORE_BASE, ENCORE_LOCALES, fetchEncoreJson, fetchEncoreStoryDetail } from "@/lib/encore/client";
import { extractDialogueLinesBySpeaker } from "@/lib/encore/dialogues";
import { buildSpeakerResolver } from "@/lib/encore/speakers";
import type { EncoreLocale, EncoreRole } from "@/lib/encore/types";
import { buildTermFrequencies } from "@/lib/text/tokenize";
import { isRoverCharacter } from "@/lib/i18n/locale";

type CharacterWordCloudRow = {
  characterId: string;
  locale: EncoreLocale;
  lineCount: number;
  terms: Array<{ term: string; count: number }>;
};

const nowIso = new Date().toISOString();

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function linesKey(locale: EncoreLocale, characterId: string): string {
  return `${locale}::${characterId}`;
}

async function main() {
  const root = process.cwd();
  const charactersDir = path.join(root, "content", "characters");
  const characterFiles = (await fs.readdir(charactersDir)).filter((file) => file.endsWith(".json"));
  const characters = await Promise.all(
    characterFiles.map(async (file) =>
      JSON.parse(await fs.readFile(path.join(charactersDir, file), "utf8")) as { id: string },
    ),
  );
  const knownCharacterIds = new Set(
    characters.map((character) => character.id).filter((id) => !isRoverCharacter(id)),
  );

  const [optionalCatalog, storyDialogueStats, voiceLineDetails, enRolesPayload] = await Promise.all([
    fs
      .readFile(path.join(root, "content", "stories", "optional-quest-catalog.json"), "utf8")
      .then((text) => JSON.parse(text) as { quests: Array<{ encoreStoryId: number }> }),
    fs
      .readFile(path.join(root, "data", "derived", "story-dialogue-stats.json"), "utf8")
      .then((text) => JSON.parse(text) as { rows: Array<{ encoreStoryIds: number[] }> }),
    fs
      .readFile(path.join(root, "data", "derived", "voice-line-details.json"), "utf8")
      .then(
        (text) =>
          JSON.parse(text) as {
            rows: Array<{
              characterId: string;
              locale: "en-US" | "zh-CN";
              lines: Array<{ text: string }>;
            }>;
          },
      ),
    fetch("https://api.encore.moe/en/character", {
      headers: { "User-Agent": "wuwa-lore/1.0", Accept: "application/json" },
    }).then((response) => response.json() as Promise<{ roleList: EncoreRole[] }>),
  ]);

  const storyIds = new Set<number>();
  for (const quest of optionalCatalog.quests) {
    storyIds.add(quest.encoreStoryId);
  }
  for (const row of storyDialogueStats.rows) {
    for (const storyId of row.encoreStoryIds) {
      storyIds.add(storyId);
    }
  }

  const linesByCharacter = new Map<string, string[]>();
  const appendLines = (locale: EncoreLocale, characterId: string, texts: string[]) => {
    if (!knownCharacterIds.has(characterId) || texts.length === 0) {
      return;
    }
    const key = linesKey(locale, characterId);
    const bucket = linesByCharacter.get(key) ?? [];
    bucket.push(...texts);
    linesByCharacter.set(key, bucket);
  };

  for (const row of voiceLineDetails.rows) {
    if (isRoverCharacter(row.characterId)) {
      continue;
    }
    const locale: EncoreLocale = row.locale === "zh-CN" ? "zh-Hans" : "en";
    appendLines(
      locale,
      row.characterId,
      row.lines.map((line) => line.text),
    );
  }

  console.log(`Collecting encore dialogue from ${storyIds.size} unique stories...`);

  for (const locale of ENCORE_LOCALES) {
    const localeRolesPayload = await fetchEncoreJson<{ roleList: EncoreRole[] }>(
      `${ENCORE_BASE}/${locale}/character`,
    );
    const { resolveSpeaker } = buildSpeakerResolver({
      enRoles: enRolesPayload.roleList,
      localeRoles: localeRolesPayload.roleList,
      knownCharacterIds,
    });

    let processed = 0;
    for (const storyId of [...storyIds].sort((a, b) => a - b)) {
      processed += 1;
      if (processed % 25 === 0) {
        console.log(`[${locale}] ${processed}/${storyIds.size} stories`);
      }

      const detail = await fetchEncoreStoryDetail(locale, storyId, { logFallback: false });
      if (!detail) {
        await delay(40);
        continue;
      }

      for (const [speaker, texts] of extractDialogueLinesBySpeaker(detail).entries()) {
        const characterId = resolveSpeaker(speaker);
        if (characterId) {
          appendLines(locale, characterId, texts);
        }
      }
      await delay(45);
    }
  }

  const rows: CharacterWordCloudRow[] = [];
  for (const characterId of [...knownCharacterIds].sort()) {
    for (const locale of ENCORE_LOCALES) {
      const lines = linesByCharacter.get(linesKey(locale, characterId)) ?? [];
      if (lines.length === 0) {
        continue;
      }
      rows.push({
        characterId,
        locale,
        lineCount: lines.length,
        terms: buildTermFrequencies(lines, locale, 50),
      });
    }
  }

  const outputPath = path.join(root, "data", "derived", "character-word-clouds.json");
  await fs.writeFile(
    outputPath,
    `${JSON.stringify(
      {
        generatedAt: nowIso,
        source: {
          name: "encore.moe+fandom-voicelines",
          tokenMethod: "intl-segmenter+bigram",
          lineSources: ["main_story", "optional_quest", "ui_voiceline"],
          storyCount: storyIds.size,
        },
        rows,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  console.log(`Generated word clouds for ${rows.length} character/locale pairs → ${outputPath}`);
}

main().catch((error: unknown) => {
  console.error("Word cloud generation failed", error);
  process.exitCode = 1;
});
