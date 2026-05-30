---
name: wuwa-version-voice-analytics
description: Compute and verify per-version and total voice-line statistics for Wuthering Waves characters. Use when the user asks for version debut tracking, line counting, or aggregated voice-line metrics.
disable-model-invocation: true
---

# Wuwa Version Voice Analytics

## Objective

Create trustworthy per-version and total voice-line counts per character and locale.

## Counting protocol

1. Build/update a version index (`versions` registry) first.
2. Extract line entries from normalized content into an intermediate table.
3. Aggregate by (`characterId`, `version`, `locale`).
4. Compute totals by (`characterId`, `locale`).
5. Validate totals == sum(per-version counts).

## Validation rules

- Emit explicit `0` counts for missing versions in tracked windows.
- Reject negative or non-integer counts.
- Report characters with missing debut version metadata.
- Produce deterministic output ordering for clean diffs.

## Output contract

- `debutVersion`
- `perVersionLineCounts[]`
- `totalLineCount`
- `locale`
- `sources[]`
- `generatedAt`
