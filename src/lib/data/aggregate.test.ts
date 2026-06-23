import { describe, expect, test } from "vitest";
import {
  aggregateVersionStats,
  aggregateVoiceLineStats,
  buildCharacterStorySegmentRows,
  getFirstAppearanceVersion,
} from "@/lib/data/aggregate";
import type { Character, StoryAppearanceRow, StoryDialogueRow, StorySegment, VersionRecord, VoiceLineEntry } from "@/types/lore";

const characters: Character[] = [
  {
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
  },
];

const versions: VersionRecord[] = [
  { version: "1.0", releaseDate: "2024-05-23", notes: "" },
  { version: "1.1", releaseDate: "2024-06-28", notes: "" },
];

const entries: VoiceLineEntry[] = [
  {
    id: "1",
    characterId: "yangyang",
    version: "1.0",
    locale: "en-US",
    line: "line a",
    source: { sourceUrl: "https://a.com", scrapedAt: "2026-05-30T00:00:00.000Z", editor: "test" },
  },
  {
    id: "2",
    characterId: "yangyang",
    version: "1.0",
    locale: "en-US",
    line: "line b",
    source: { sourceUrl: "https://a.com", scrapedAt: "2026-05-30T00:00:00.000Z", editor: "test" },
  },
];

describe("aggregateVoiceLineStats", () => {
  test("fills missing versions with zero and sums totals", () => {
    const rows = aggregateVoiceLineStats({
      characters,
      versions,
      entries,
      generatedAt: "2026-05-30T00:00:00.000Z",
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.totalLineCount).toBe(2);
    expect(rows[0]?.perVersionLineCounts).toEqual([
      { version: "1.0", lineCount: 2 },
      { version: "1.1", lineCount: 0 },
    ]);
  });
});

describe("aggregateVersionStats", () => {
  test("uses main-story dialogue totals by version when provided", () => {
    const voiceRows = aggregateVoiceLineStats({
      characters,
      versions,
      entries,
      generatedAt: "2026-05-30T00:00:00.000Z",
    });
    const storyDialogueStats: StoryDialogueRow[] = [
      {
        locale: "zh-Hans",
        characterId: "yangyang",
        questId: "quest-a",
        wikiTitle: "Quest A",
        nameZh: "任务A",
        version: "1.1",
        half: "a",
        versionHalf: "1.1-a",
        lineCount: 40,
        encoreStoryIds: [1],
      },
    ];

    const rows = aggregateVersionStats({
      versions,
      characters,
      voiceStats: voiceRows,
      storyDialogueStats,
    });

    expect(rows.find((row) => row.version === "1.0")?.totalVoiceLines).toBe(0);
    expect(rows.find((row) => row.version === "1.1")?.totalVoiceLines).toBe(40);
  });
});

describe("getFirstAppearanceVersion", () => {
  test("uses earliest main-story segment instead of banner release version", () => {
    const segments: StorySegment[] = [
      {
        id: "unknown-deja-vu",
        wikiTitle: "Unknown Deja Vu",
        nameZh: "未知的既感",
        version: "3.0",
        half: "a",
        versionHalf: "3.0-a",
        sortOrder: 0,
      },
      {
        id: "voyage-star",
        wikiTitle: "Voyage Star",
        nameZh: "远航星",
        version: "3.1",
        half: "a",
        versionHalf: "3.1-a",
        sortOrder: 1,
      },
    ];
    const storyAppearances: StoryAppearanceRow[] = [
      {
        characterId: "aemeath",
        questId: "unknown-deja-vu",
        wikiTitle: "Unknown Deja Vu",
        nameZh: "未知的既感",
        version: "3.0",
        half: "a",
        versionHalf: "3.0-a",
      },
    ];
    const storyDialogueStats: StoryDialogueRow[] = [];

    expect(
      getFirstAppearanceVersion({
        characterId: "aemeath",
        segments,
        storyAppearances,
        storyDialogueStats,
      }),
    ).toBe("3.0");
  });
});

describe("buildCharacterStorySegmentRows", () => {
  test("counts dialogue-only segments as appeared", () => {
    const segments: StorySegment[] = [
      {
        id: "to-the-shores-end",
        wikiTitle: "To the Shore's End",
        nameZh: "行至海岸尽头",
        version: "1.3",
        half: "a",
        versionHalf: "1.3-a",
        sortOrder: 0,
      },
    ];
    const storyAppearances: StoryAppearanceRow[] = [];
    const storyDialogueStats: StoryDialogueRow[] = [
      {
        locale: "zh-Hans",
        characterId: "yangyang",
        questId: "to-the-shores-end",
        wikiTitle: "To the Shore's End",
        nameZh: "行至海岸尽头",
        version: "1.3",
        half: "a",
        versionHalf: "1.3-a",
        lineCount: 33,
        encoreStoryIds: [100012],
      },
    ];

    const rows = buildCharacterStorySegmentRows({
      characterId: "yangyang",
      segments,
      storyAppearances,
      storyDialogueStats,
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.appeared).toBe(true);
    expect(rows[0]?.lineCount).toBe(33);
  });
});
