import { describe, expect, it } from "vitest";

import { buildTermFrequencies, cleanDialogueLine, tokenizeLine } from "@/lib/text/tokenize";

describe("cleanDialogueLine", () => {
  it("removes stage directions and player placeholders", () => {
    expect(cleanDialogueLine("*Effort Sound* Stay close, {PlayerName}.")).toBe("Stay close, .");
  });
});

describe("tokenizeLine", () => {
  it("tokenizes Chinese dialogue with meaningful terms", () => {
    const tokens = tokenizeLine("我也能感受到风中的流息潜藏着不安的躁动。", "zh-Hans");
    expect(tokens).toContain("感受到");
    expect(tokens).not.toContain("的");
  });

  it("tokenizes English dialogue", () => {
    const tokens = tokenizeLine("The wind carries many stories.", "en");
    expect(tokens).toContain("wind");
    expect(tokens).toContain("stories");
    expect(tokens).not.toContain("the");
  });
});

describe("buildTermFrequencies", () => {
  it("ranks repeated terms higher", () => {
    const result = buildTermFrequencies(
      ["The wind carries stories.", "The wind is strong.", "Stories fade in the wind."],
      "en",
      10,
    );
    expect(result[0]?.term).toBe("wind");
    expect(result[0]?.count).toBeGreaterThan(1);
  });
});
