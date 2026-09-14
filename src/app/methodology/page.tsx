import { getSiteLocale } from "@/lib/i18n/server";

export default async function MethodologyPage() {
  const zh = (await getSiteLocale()) === "zh";
  return (
    <section className="max-w-3xl space-y-5 text-zinc-700">
      <h1 className="text-2xl font-semibold text-zinc-900">
        {zh ? "这些数字怎么算？" : "How are the lines counted?"}
      </h1>
      <p>
        {zh
          ? "首页统计主线剧情。台词数来自 Encore 的对话条目，出场记录来自 Wiki 任务角色列表，并补上有台词但未被列出的角色。提到一个角色的名字，不算该角色出场。"
          : "The homepage covers the main story. Lines come from Encore dialogue entries. Appearances use the Wiki quest cast, plus speakers missing from that list. Mentioning a character does not count as an appearance."}
      </p>
      <p>
        {zh
          ? "出场次数按版本上半、下半分别计数。同一角色在同一个上下半的多个任务中出现，只计一次。台词/出场是所选区间的台词数除以出场次数。段落明细可以查看具体任务。"
          : "Appearances are counted once per patch half, even if a character appears in several quests within it. Lines per appearance divides their dialogue total by that count. Use segment details to see individual quests."}
      </p>
      <p>
        {zh
          ? "角色首次在剧情登场的版本可能早于实装版本。中文和英文台词分开统计；条目数不等于配音时长，也不代表角色的重要程度。伴星、活动和支线在单独的页面统计。"
          : "A character can appear before their playable release. Chinese and English lines are counted separately. Entry counts are not voice-acting duration or a measure of importance. Companion, event, and side quests have their own page."}
      </p>
      <p>
        {zh
          ? "资料可能漏收，角色别名也可能造成归属错误。发现问题请带上角色、版本和任务名报错。"
          : "Sources can be incomplete, and aliases can cause attribution mistakes. If you spot one, please include the character, patch, and quest name in an issue."}
      </p>
      <div className="flex flex-wrap gap-5 text-sm">
        <a className="underline" href="https://encore.moe/">
          Encore
        </a>
        <a className="underline" href="https://wutheringwaves.fandom.com/">
          Wuthering Waves Wiki
        </a>
        <a
          className="underline"
          href="https://github.com/achenachena/wuwa-lore/issues"
        >
          {zh ? "报错 / 建议" : "Report an issue"}
        </a>
      </div>
    </section>
  );
}
