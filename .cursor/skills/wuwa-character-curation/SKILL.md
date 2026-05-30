---
name: wuwa-character-curation
description: Curate and normalize Wuthering Waves character profile and image metadata into canonical records. Use when adding or updating character archives, factions, release versions, or image assets.
disable-model-invocation: true
---

# Wuwa Character Curation

## Goal

Produce consistent, source-traceable character records suitable for UI rendering and analytics.

## Workflow

1. Validate source reliability and capture `sourceUrl` + `retrievedAt`.
2. Normalize names/aliases and map to stable `characterId`.
3. Ensure release version exists in version registry.
4. Classify image assets (`portrait`, `card`, `splash`, `other`) with attribution metadata.
5. Output canonical JSON sorted by `characterId`.

## Checklist

- [ ] Stable ID exists and is unique.
- [ ] Required profile fields are complete.
- [ ] Image records include rights/source metadata.
- [ ] Locale-specific fields are not mixed across languages.
- [ ] Changelog entry exists for significant lore updates.
