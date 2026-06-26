import type { EncoreLocale } from "@/lib/encore/types";

const ZH_STOP = new Set([
  "一个",
  "一些",
  "一下",
  "一点",
  "不会",
  "不是",
  "不能",
  "不过",
  "与",
  "为了",
  "为什么",
  "也",
  "了",
  "什么",
  "今天",
  "从",
  "他",
  "他们",
  "以",
  "会",
  "但",
  "但是",
  "你",
  "你们",
  "使",
  "来",
  "很",
  "的",
  "得",
  "和",
  "因为",
  "在",
  "地",
  "她",
  "它",
  "就",
  "已经",
  "应该",
  "怎么",
  "我们",
  "我",
  "或",
  "所以",
  "所",
  "把",
  "被",
  "要",
  "让",
  "这",
  "这个",
  "这些",
  "这里",
  "那",
  "那个",
  "那些",
  "那里",
  "而",
  "能",
  "自己",
  "虽然",
  "还是",
  "还有",
  "这样",
  "那样",
  "现在",
  "用",
  "着",
  "知道",
  "给",
  "觉得",
  "然后",
  "到",
  "对",
  "将",
  "并",
  "当",
  "吗",
  "呢",
  "吧",
  "啊",
  "哦",
  "嗯",
  "没有",
  "不是",
  "可以",
  "可能",
  "其实",
  "只是",
  "一直",
  "一定",
  "非常",
  "比较",
  "很多",
  "如果",
  "时候",
]);

const EN_STOP = new Set([
  "a",
  "about",
  "all",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "been",
  "but",
  "by",
  "can",
  "could",
  "did",
  "do",
  "does",
  "for",
  "from",
  "had",
  "has",
  "have",
  "he",
  "her",
  "here",
  "him",
  "his",
  "how",
  "i",
  "if",
  "in",
  "into",
  "is",
  "it's",
  "it",
  "its",
  "just",
  "like",
  "me",
  "more",
  "my",
  "no",
  "not",
  "now",
  "of",
  "on",
  "one",
  "or",
  "our",
  "out",
  "re",
  "really",
  "s",
  "she",
  "so",
  "some",
  "than",
  "that",
  "the",
  "their",
  "them",
  "then",
  "there",
  "they",
  "this",
  "to",
  "too",
  "up",
  "us",
  "ve",
  "very",
  "was",
  "we",
  "well",
  "were",
  "what",
  "when",
  "where",
  "who",
  "why",
  "will",
  "with",
  "would",
  "you",
  "your",
]);

export function cleanDialogueLine(text: string): string {
  return text
    .replace(/\{PlayerName\}/g, " ")
    .replace(/漂泊者/g, " ")
    .replace(/\bRover\b/gi, " ")
    .replace(/\*[^*]+\*/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/…+/g, " ")
    .replace(/\.{2,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenizeLine(text: string, locale: EncoreLocale): string[] {
  const cleaned = cleanDialogueLine(text);
  if (!cleaned) {
    return [];
  }

  const segmenter = new Intl.Segmenter(locale === "zh-Hans" ? "zh-Hans" : "en", {
    granularity: "word",
  });
  const tokens: string[] = [];

  for (const { segment, isWordLike } of segmenter.segment(cleaned)) {
    const word = segment.trim();
    if (!isWordLike || word.length < 2) {
      continue;
    }
    if (locale === "zh-Hans") {
      if (!/^[\u4e00-\u9fff]+$/.test(word) || ZH_STOP.has(word)) {
        continue;
      }
      tokens.push(word);
      continue;
    }
    const normalized = word.toLowerCase().replace(/[^a-z']/g, "");
    if (normalized.length < 2 || EN_STOP.has(normalized)) {
      continue;
    }
    tokens.push(normalized);
  }

  if (locale === "zh-Hans") {
    for (const run of cleaned.match(/[\u4e00-\u9fff]{4,}/g) ?? []) {
      for (let index = 0; index < run.length - 1; index += 1) {
        const bigram = run.slice(index, index + 2);
        if (!ZH_STOP.has(bigram)) {
          tokens.push(bigram);
        }
      }
    }
  }

  return tokens;
}

export function buildTermFrequencies(
  lines: string[],
  locale: EncoreLocale,
  topN = 50,
): Array<{ term: string; count: number }> {
  const counts = new Map<string, number>();
  for (const line of lines) {
    for (const token of tokenizeLine(line, locale)) {
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], locale))
    .slice(0, topN)
    .map(([term, count]) => ({ term, count }));
}
