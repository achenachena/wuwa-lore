import { describe, expect, test } from "vitest";

import { cleanWikiText, parseTemplateField } from "@/lib/fandom/wikitext";

describe("Fandom wikitext helpers", () => {
  test("normalizes common links and templates", () => {
    expect(
      cleanWikiText(
        "'''Acolyte''' of [[Order of the Deep|the Order]] from {{w|Cyberpunk: Edgerunners}}.&nbsp;",
      ),
    ).toBe("Acolyte of the Order from Cyberpunk: Edgerunners.");
  });

  test("parses full-line character fields", () => {
    expect(
      parseTemplateField("|profile=[[A|Alpha]] and [[B|Beta]]\n", "profile"),
    ).toBe("Alpha and Beta");
  });

  test("can stop at the next template field delimiter", () => {
    expect(
      parseTemplateField("|zhs=中文名|en=English", "zhs", { stopAtPipe: true }),
    ).toBe("中文名");
  });
});
