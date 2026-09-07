# 部署备注

网站在 Vercel，正式域名是 <https://wuwalore.xyz>。GitHub 的 `main` 分支自动部署到正式环境，其他分支会生成预览。

## 配置

- Framework：Next.js
- Build command：`npm run build`，和 CI 一样
- `NEXT_PUBLIC_SITE_URL=https://wuwalore.xyz`：用于 sitemap、robots 和页面的 canonical URL。换域名时一起改；本地可参考 `.env.example`。
- `ENABLE_PUBLIC_TOOLS=1`：可选，开放 `/tools` 数据检查页。正式环境默认不开放，本地开发可以直接访问。

页面读取仓库里的 JSON，不需要数据库或运行时密钥。`next.config.ts` 中的 `outputFileTracingIncludes` 要保留 `content/**/*.json` 和 `data/derived/**/*.json`，否则可能构建成功、上线后却找不到数据。抓取脚本在本地或 GitHub Actions 跑，不在用户打开网页时跑。

## 发布后看一眼

确认 Vercel 部署的提交和 GitHub 一致，再检查首页、角色页、统计页以及 `/api/health/data-quality`。健康接口应返回 `ok: true`。构建显示 Ready 不代表运行时数据一定齐全。

遇到线上问题可以用 `vercel rollback <上一份正常部署的 URL>` 回滚。修好后检查正式域名是否已经跟到新部署；必要时用 `vercel promote <已验证的部署 URL>` 切回。

## 域名

在 Vercel 项目的 Domains 添加域名，再按页面给出的记录配置 Cloudflare DNS，避免照抄旧 IP。Cloudflare 的 SSL/TLS 用 Full (strict)。如果换了域名，记得更新 `NEXT_PUBLIC_SITE_URL` 并重新部署，检查 `/sitemap.xml` 和 `/robots.txt` 中的地址。
