import { describe, expect, it } from "vitest";

import {
  colorForWord,
  prepareWordCloudWords,
  scaleWordCloudFontSize,
} from "@/lib/text/word-cloud-layout";

describe("prepareWordCloudWords", () => {
  it("sorts by count descending and scales largest term highest", () => {
    const words = prepareWordCloudWords([
      { term: "风", count: 10 },
      { term: "时间", count: 50 },
      { term: "今州", count: 30 },
    ]);

    expect(words[0]?.text).toBe("时间");
    expect(words[0]?.size).toBeGreaterThan(words[1]?.size ?? 0);
    expect(words[1]?.size).toBeGreaterThan(words[2]?.size ?? 0);
  });
});

describe("scaleWordCloudFontSize", () => {
  it("returns wider range for distant counts", () => {
    const low = scaleWordCloudFontSize(5, 5, 100);
    const high = scaleWordCloudFontSize(100, 5, 100);
    expect(high - low).toBeGreaterThan(30);
  });
});

describe("colorForWord", () => {
  it("uses gold for the top-ranked word", () => {
    expect(colorForWord("时间", 0)).toBe("#ca8a04");
  });
});
