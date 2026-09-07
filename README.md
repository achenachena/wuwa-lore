# Wuwa Lore

I wanted to look up where a character shows up in the story and how many lines they actually get, so I made a little site for it. You can also browse character profiles and compare their dialogue across patches.

**[Visit the site → wuwalore.xyz](https://wuwalore.xyz)**

It covers appearances and dialogue in main quests, companion stories, events, and side quests, with word clouds on character pages. Chinese and English are supported. Expect spoilers: quest names and character appearances are visible, so you might want to catch up on the story first.

## About the numbers

Character profiles and voice-over data come from the Wuthering Waves Wiki on Fandom. Story dialogue mainly comes from [Encore](https://encore.moe/), and patch dates are checked against Kuro's announcements. The site's [counting notes](https://wuwalore.xyz/methodology) explain the sources and methods in more detail.

These are dialogue entry counts, not voice-acting duration or a measure of how important a character is to the story. A character can have lines before their playable release, too. Missing source data and speaker aliases can throw the counts off.

Spotted a missing line or a wrong count? [Open an issue](https://github.com/achenachena/wuwa-lore/issues) with the character, patch, and quest name. A specific line or screenshot helps a lot.

## Running locally

Use Node.js 22. The repo includes the data, so you can work on the site without running the scrapers first.

```bash
npm ci
npm run dev
```

Then open <http://localhost:3000>. It's built with Next.js, TypeScript, and Tailwind. Data lives in JSON files; there's no database to set up.

## Updating the data

A GitHub Actions workflow checks character, patch, and main-story data every Monday and opens a PR when something changes. Those changes still need review and merging. You can also run `Sync game data` manually from the Actions tab. Sources take time to catch up, so a new patch won't necessarily be complete on day one.

For local updates:

```bash
npm run data:sync                 # Characters, voice-over data, and patch notices
npm run data:sync-stories         # Main quests, appearances, and dialogue
npm run data:sync-optional-quests # Companion stories, events, and side quests
npm run data:generate             # Stats and word clouds; fetches data and takes a while
npm run data:validate             # Check the data
npm run data:audit-stories        # Cross-check main-story appearances and dialogue
```

`content/` holds character records, patches, and quest mappings. `data/raw/` keeps source snapshots, and `data/derived/` contains the stats the site reads. The scraping and processing scripts are in `scripts/`.

After code changes, run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`. To recalculate stats from the data already in the repo, use `npm run data:generate-local`.

The site runs on Vercel and deploys when changes reach `main`. [Deployment notes](docs/deployment.md) cover the custom domain and bundling the data files.

An unofficial side project, maintained in my spare time. Wuthering Waves characters, artwork, and text belong to Kuro Games and their respective owners. Thanks to everyone maintaining the Wiki and Encore data that makes this possible.
