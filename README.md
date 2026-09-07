# 鸣潮角色台词统计 · Wuwa Lore

想查一个角色在哪段剧情出过场、到底说了多少句话，就做了这个小站。也可以拿来翻角色资料，看看不同版本里谁的戏份多一点。

**[打开网站 → wuwalore.xyz](https://wuwalore.xyz)**

有主线、伴星、活动和支线的出场与台词统计，角色页还放了台词词云。支持中文和英文。页面里会出现任务名和角色出场信息，介意剧透的话先过完剧情再看。

## 数字怎么看

角色档案和语音资料来自 Wuthering Waves Wiki（Fandom），剧情台词主要来自 [Encore](https://encore.moe/)，版本日期会和库洛的公告核对。原始来源和统计方式可以在站内的[统计说明](https://wuwalore.xyz/methodology)里看。

这里数的是整理到的台词条目，不是配音时长，也不等于角色的剧情重要程度。角色实装版本和第一次在剧情里开口的版本也可能不同。上游资料缺失、说话人用了别名，都会影响结果。

发现漏算或算错，欢迎 [开个 issue](https://github.com/achenachena/wuwa-lore/issues)。带上角色、版本、任务名，有具体台词或截图就更容易查。

## 本地跑一下

用 Node.js 22，装好依赖就能启动。仓库里带了数据，单纯改页面不用先抓一遍。

```bash
npm ci
npm run dev
```

打开 <http://localhost:3000>。技术上就是 Next.js、TypeScript 和 Tailwind，数据放 JSON 文件，没有数据库。

## 更新数据

GitHub Actions 每周一检查一次角色、版本和主线数据，有变化会开 PR，检查后再合并；也能在 Actions 里手动运行 `Sync game data`。上游资料更新有延迟，所以新版本内容不一定当天就齐。

本地常用这几个命令：

```bash
npm run data:sync                  # 角色、语音资料和版本公告
npm run data:sync-stories          # 主线任务、出场和台词
npm run data:sync-optional-quests  # 伴星、活动、支线（单独更新）
npm run data:generate              # 统计和词云；词云会联网，比较慢
npm run data:validate              # 检查数据
npm run data:audit-stories         # 检查主线出场和台词是否对得上
```

`content/` 放角色、版本和任务对应关系，`data/raw/` 留来源快照，`data/derived/` 是网站读取的统计结果。抓取和整理脚本都在 `scripts/`。

改完代码可以跑 `npm run typecheck`、`npm run lint`、`npm test` 和 `npm run build`。只想从已有数据重算统计，用 `npm run data:generate-local` 就行。

部署在 Vercel，推到 `main` 会自动发布。[部署备注](docs/deployment.md)里留了自定义域名和运行数据打包的注意事项。

个人维护的非官方小项目。鸣潮的角色、图片和文本归库洛游戏及相应权利方所有，也感谢整理 Wiki 和 Encore 数据的朋友。
