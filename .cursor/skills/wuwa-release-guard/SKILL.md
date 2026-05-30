---
name: wuwa-release-guard
description: Keep GitHub CI and Vercel release flow healthy for this TypeScript lore site. Use when preparing PRs, fixing CI failures, or validating deployment readiness.
disable-model-invocation: true
---

# Wuwa Release Guard

## Pre-PR gate

Run and pass locally before opening/updating PR:

- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`
- Data validation/generation checks used by CI

## CI triage order

1. Schema/data integrity failures
2. Type errors
3. Lint issues
4. Tests
5. Build/deploy configuration

## Deployment discipline

- Keep CI and Vercel build behavior aligned.
- Require explicit env var documentation updates with new runtime config.
- Prefer small PRs for data updates to simplify regression tracing.
