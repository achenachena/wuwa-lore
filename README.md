# Wuwa Lore

A Next.js + TypeScript site for collecting Wuthering Waves character archives, image metadata, debut versions, per-version voice line counts, and total voice line counts.

## Features

- Character list page: `/characters`
- Character detail page with voice stats and image metadata: `/characters/[id]`
- Version analytics page: `/stats/versions`
- Data tooling page: `/tools`
- Deterministic JSON-first data pipeline (`data/raw` -> `data/derived`)

## Project layout

- `content/characters/`: canonical character records
- `content/versions/`: version registry
- `content/images/`: character image metadata
- `data/raw/`: immutable source snapshots
- `data/derived/`: generated stats and validation reports
- `scripts/`: generation and validation CLI scripts

## Commands

```bash
npm run dev           # Start local dev server
npm run data:sync     # Pull full character/version/voice stats from Fandom API
npm run data:generate # Generate data/derived/voice-line-stats.json
npm run data:validate # Validate identity and stat integrity
npm run typecheck     # TypeScript checks
npm run lint          # ESLint
npm run test          # Vitest
npm run build         # Next.js production build
```

## CI and deployment

- GitHub Actions runs: data generation, data validation, typecheck, lint, test, build.
- Vercel config is in `vercel.json`.
- Deployment notes in `docs/deployment.md`.
