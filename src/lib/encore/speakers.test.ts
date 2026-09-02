import { describe, expect, test } from "vitest";

import {
  buildSpeakerResolver,
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
