# Deployment

## Build parity

- CI build command: `npm run build`
- Vercel build command: `npm run build`

## Required runtime variables

This MVP is JSON-first and does not require runtime secrets for page rendering.

| Variable | Required | Example | Purpose |
|----------|----------|---------|---------|
| `NEXT_PUBLIC_SITE_URL` | Recommended (production) | `https://wuwalore.xyz` | Canonical URL for sitemap, robots, Open Graph |

Optional integrations (future phase):

- `NEON_API_KEY` for Neon MCP/database workflows
- `GITHUB_TOKEN` for GitHub MCP/workflows

## Deploy steps

1. Push `main` branch to GitHub.
2. Import repository in Vercel.
3. Keep framework preset as Next.js.
4. Confirm build command is `npm run build`.
5. Trigger deployment.

## Custom domain (`wuwalore.xyz` on Cloudflare)

Production site: **https://wuwalore.xyz**

### 1. Add domain in Vercel

1. [Vercel Dashboard](https://vercel.com) → **wuwa-lore** project.
2. **Settings → Domains**.
3. Add `wuwalore.xyz`.
4. (Optional) Add `www.wuwalore.xyz` and set redirects in Vercel (e.g. `www` → apex).

Vercel shows the DNS records it expects. Keep that tab open for the next step.

### 2. Cloudflare DNS records

Cloudflare Dashboard → **wuwalore.xyz** → **DNS** → **Records**.

**Recommended (apex + optional www):**

| Type | Name | Target / Content | Proxy |
|------|------|------------------|-------|
| `CNAME` | `@` | `cname.vercel-dns.com` | Proxied (orange) or DNS only (grey) |
| `CNAME` | `www` | `cname.vercel-dns.com` | Same as above |

Cloudflare supports CNAME at the zone apex (`@`) via CNAME flattening.

**Alternative for apex only:**

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| `A` | `@` | `76.76.21.21` | DNS only (grey) recommended for first setup |

Delete conflicting old `A` / `CNAME` records for `@` or `www` before adding new ones.

Back in Vercel **Domains**, wait until status is **Valid Configuration** (usually a few minutes).

### 3. Cloudflare SSL/TLS

**SSL/TLS** → Overview → set encryption mode to **Full (strict)**.

This lets Cloudflare connect to Vercel over HTTPS with a valid certificate. Avoid **Flexible** (can cause redirect loops with Vercel).

Optional but useful:

- **SSL/TLS → Edge Certificates** → enable **Always Use HTTPS**
- **Rules → Redirect Rules** → redirect `www.wuwalore.xyz` → `https://wuwalore.xyz` if you only use the apex domain

### 4. Canonical URL in Vercel

**Settings → Environment Variables**:

```
NEXT_PUBLIC_SITE_URL=https://wuwalore.xyz
```

Scope: **Production**. Redeploy after saving.

Locally: `cp .env.example .env.local` and use the same value if needed.

### 5. Primary domain & old URL redirect

**Settings → Domains** → set `wuwalore.xyz` as **Primary**. Enable redirect from `wuwa-lore.vercel.app` if offered.

### 6. Verify

- https://wuwalore.xyz
- https://wuwalore.xyz/sitemap.xml (URLs use `wuwalore.xyz`)
- https://wuwalore.xyz/robots.txt

### Troubleshooting

| Symptom | Fix |
|---------|-----|
| Vercel stuck on "Invalid Configuration" | Check record names (`@` not `wuwalore.xyz`), remove duplicates, wait 5–10 min |
| Redirect loop | Cloudflare SSL → **Full (strict)**; disable conflicting Page Rules |
| Site loads but sitemap shows `vercel.app` | Set `NEXT_PUBLIC_SITE_URL` and redeploy |
| SSL certificate pending | Grey-cloud DNS first until Vercel validates, then re-enable proxy |
