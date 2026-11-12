# 部署备注

网站在 Vercel，正式域名是 <https://wuwalore.xyz>。GitHub 的 `main` 分支自动部署到正式环境，其他分支会生成预览。

## 配置

- Framework：Next.js
- Build command：`npm run build`，和 CI 一样
- `NEXT_PUBLIC_SITE_URL=https://wuwalore.xyz`：用于 sitemap、robots 和页面的 canonical URL。换域名时一起改；本地可参考 `.env.example`。

页面读取仓库里的 JSON，不需要数据库或运行时密钥。`next.config.ts` 中的 `outputFileTracingIncludes` 要保留 `content/**/*.json` 和 `data/derived/**/*.json`，否则可能构建成功、上线后却找不到数据。抓取脚本在本地或 GitHub Actions 跑，不在用户打开网页时跑。

## 定时同步的台词审计

同步失败不会发布部分数据，线上继续使用上次通过检查的版本。审计在可选词云生成之前执行；失败时从 Actions 的 `failed-sync-<run>-<attempt>` artifact 下载剧情映射及统计快照（保留 14 天）。

2026-11-12 的 run `43174485657` 失败于历史固定基准与 Encore 当前数据不一致：景燃 / Song of the Heart Sword 为 68 条本名 + 13 条别名 = 81，卡提希娅 / The Maiden, The Defier, The Death Crier 为 395 条本名 + 33 条别名 = 428，中英文一致。旧预期分别为 77 和 353。来源 URL、响应 SHA-256 和独立提取的完整说话人计数保存在 `src/lib/encore/fixtures/attribution-2026-11-12.json`，并由回归测试验证归属。

再次出现数量变化时，先核对原始剧情及明确别名，区分上游变化与解析错误，再同步更新有证据的基准和统计。不要靠重试、忽略审计错误或自动接受新数量来消除告警。固定基准是人工复核关卡，外部数据发生真实变化时仍可能需要维护。

## 发布后看一眼

确认 Vercel 部署的提交和 GitHub 一致，再检查首页、角色页、统计页以及 `/api/health/data-quality`。健康接口应返回 `ok: true`。构建显示 Ready 不代表运行时数据一定齐全。

遇到线上问题可以用 `vercel rollback <上一份正常部署的 URL>` 回滚。修好后检查正式域名是否已经跟到新部署；必要时用 `vercel promote <已验证的部署 URL>` 切回。

## 域名

在 Vercel 项目的 Domains 添加域名，再按页面给出的记录配置 Cloudflare DNS，避免照抄旧 IP。Cloudflare 的 SSL/TLS 用 Full (strict)。如果换了域名，记得更新 `NEXT_PUBLIC_SITE_URL` 并重新部署，检查 `/sitemap.xml` 和 `/robots.txt` 中的地址。
