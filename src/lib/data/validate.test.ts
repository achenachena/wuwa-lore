import { describe, expect, test } from "vitest";
import { validateCharactersAndVersions, validateVoiceLineStats } from "@/lib/data/validate";
import type { Character, VersionRecord, VoiceLineStatRow } from "@/types/lore";

const versions: VersionRecord[] = [{ version: "1.0", releaseDate: "2024-05-23", notes: "" }];

const baseCharacter: Character = {
  id: "yangyang",
  name: "Yangyang",
  aliases: [],
  element: "Aero",
  weapon: "Sword",
  faction: "Jinzhou",
  rarity: 4,
  releaseVersion: "1.0",
  profile: "profile",
  locale: "en-US",
  source: {
    sourceUrl: "https://example.com",
    scrapedAt: "2026-05-30T00:00:00.000Z",
    editor: "test",
  },
};

describe("validateCharactersAndVersions", () => {
  test("fails when duplicate ids exist", () => {
    const result = validateCharactersAndVersions([baseCharacter, baseCharacter], versions);
    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => error.includes("Duplicate character id"))).toBe(true);
  });
});

describe("validateVoiceLineStats", () => {
  test("fails when total mismatch exists", () => {
    const rows: VoiceLineStatRow[] = [
      {
        characterId: "yangyang",
        debutVersion: "1.0",
        locale: "en-US",
        sourcePageTitle: "Yangyang/Voicelines",
        sourcePageExists: true,
        sourceLatestRevisionAt: "2026-05-30T00:00:00.000Z",
        sourceRevisionCount: 10,
        countMethod: "tx_key_unique_nonempty",
        qualityStatus: "verified",
        perVersionLineCounts: [{ version: "1.0", lineCount: 1 }],
        totalLineCount: 2,
        sources: ["https://example.com"],
        generatedAt: "2026-05-30T00:00:00.000Z",
      },
    ];

    const result = validateVoiceLineStats(rows);
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain("Total mismatch");
  });
});
