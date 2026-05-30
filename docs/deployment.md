# Deployment

## Build parity

- CI build command: `npm run build`
- Vercel build command: `npm run build`

## Required runtime variables

This MVP is JSON-first and does not require runtime secrets for page rendering.

Optional integrations (future phase):

- `NEON_API_KEY` for Neon MCP/database workflows
- `GITHUB_TOKEN` for GitHub MCP workflows

## Deploy steps

1. Push `main` branch to GitHub.
2. Import repository in Vercel.
3. Keep framework preset as Next.js.
4. Confirm build command is `npm run build`.
5. Trigger deployment.
