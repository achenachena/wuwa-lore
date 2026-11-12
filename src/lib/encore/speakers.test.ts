import { describe, expect, test } from "vitest";
import attributionEvidence from "./fixtures/attribution-2026-11-12.json";

import {
  buildSpeakerResolver,
  countDialoguesBySpeaker,
  storyLineCountAdjustments,
} from "@/lib/encore/speakers";

const resolver = buildSpeakerResolver({
  enRoles: [
    { Id: 1, Name: "Cartethyia" },
    { Id: 2, Name: "Galbrena" },
    { Id: 3, Name: "Jinhsi" },
    { Id: 4, Name: "Jiyan" },
  ],
  localeRoles: [
    { Id: 1, Name: "卡提希娅" },
    { Id: 2, Name: "嘉贝莉娜" },
    { Id: 3, Name: "今汐" },
    { Id: 4, Name: "忌炎" },
  ],
  knownCharacterIds: new Set([
    "cartethyia",
    "galbrena",
    "jingran",
    "jinhsi",
    "jiyan",
    "shorekeeper",
  ]),
});

describe("story speaker attribution", () => {
  test.each(attributionEvidence)(
    "reproduces reviewed $locale story $storyId attribution ($expected lines)",
    (evidence) => {
      const resolve = buildSpeakerResolver({
        enRoles: [
          { Id: 1, Name: "Jingran" },
          { Id: 2, Name: "Cartethyia" },
        ],
        localeRoles:
          evidence.locale === "en"
            ? [
                { Id: 1, Name: "Jingran" },
                { Id: 2, Name: "Cartethyia" },
              ]
            : [
                { Id: 1, Name: "景燃" },
                { Id: 2, Name: "卡提希娅" },
              ],
        knownCharacterIds: new Set(["jingran", "cartethyia"]),
      });
      // Histogram captured independently from each source's Chapters/Dialogues.
      // Include all NPC speakers, so accidental broad matching also fails.
      const payload = {
        Chapters: Object.entries(evidence.speakerCounts).map(
          ([Speaker, count]) => ({
            Dialogues: Array.from({ length: count ?? 0 }, () => ({ Speaker })),
          }),
        ),
      };
      let actual = 0;
      for (const [speaker, count] of countDialoguesBySpeaker(payload)) {
        if (resolve.resolveSpeakers(speaker).includes(evidence.characterId))
          actual += count;
      }
      expect(actual).toBe(evidence.expected);
    },
  );

  const shortNameResolver = buildSpeakerResolver({
    enRoles: [
      { Id: 1, Name: "Hsin" },
      { Id: 2, Name: "Jianxin" },
      { Id: 3, Name: "Xiangli Yao" },
    ],
    localeRoles: [
      { Id: 1, Name: "心" },
      { Id: 2, Name: "鉴心" },
      { Id: 3, Name: "相里要" },
    ],
    knownCharacterIds: new Set(["hsin", "jianxin", "xiangli-yao"]),
  });

  test.each([
    "心魔",
    "天演溯心",
    "Suhsin the Inevitable",
    "Yao",
    "小瑶",
    "热心的贵族",
    "心情沉重的老者",
    "“心底的声音”",
    "",
  ])(
    "does not attribute NPC or partial name %s to a playable character",
    (speaker) => {
      expect(shortNameResolver.resolveSpeakers(speaker)).toEqual([]);
    },
  );

  test.each([
    "心",
    "Hsin",
    "昔日的心",
    "Hsin of the Past",
    "心月狐",
    "<color=XinyuehuTitle>心的心声</color>",
    '<color=XinyuehuTitle>"Hsin\'s" Voice</color>',
    "心？",
    "Hsin?",
    "{message}心",
  ])("keeps explicit Hsin identity %s", (speaker) => {
    expect(shortNameResolver.resolveSpeakers(speaker)).toEqual(["hsin"]);
  });

  test("keeps short names separate from longer character names", () => {
    expect(shortNameResolver.resolveSpeakers("鉴心")).toEqual(["jianxin"]);
    expect(shortNameResolver.resolveSpeakers("Xiangli Yao")).toEqual([
      "xiangli-yao",
    ]);
  });

  test.each([
    ['"Cat of the Nether Lamp"', "jingran"],
    ["「鬼猫挈灯」", "jingran"],
    ["Fleurdelys", "cartethyia"],
    ["芙露德莉斯", "cartethyia"],
    ["Kharon (Schwarzloch)", "galbrena"],
    ["卡戎（斯瓦茨洛）", "galbrena"],
    ["The Shorekeeper", "shorekeeper"],
  ])("maps %s to %s", (speaker, characterId) => {
    expect(resolver.resolveSpeakers(speaker)).toEqual([characterId]);
  });

  test("credits a shared line to every named playable character", () => {
    expect(resolver.resolveSpeakers("Cartethyia & Galbrena")).toEqual([
      "cartethyia",
      "galbrena",
    ]);
    expect(resolver.resolveSpeakers("忌炎&今汐")).toEqual(["jiyan", "jinhsi"]);
  });

  test("accounts for Jingran's seven pre-reveal anonymous lines", () => {
    expect(
      storyLineCountAdjustments({ locale: "en", storyId: 100046 }).get(
        "jingran",
      ),
    ).toBe(7);
  });
});
