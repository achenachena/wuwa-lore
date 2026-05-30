# AI Collaboration Baseline

This repository is prepared for Cursor with:

- `.cursor/rules/*` for project behavior and guardrails
- `.cursor/skills/*` for repeatable workflows
- `.cursor/mcp.json` for MCP tool providers

## Current MCP setup

- `neon`: for PostgreSQL-oriented analytics/storage workflows
- `github`: for issue/PR/release automation from agent sessions

## Notes

- Keep secrets outside git.
- If MCP tools fail, check token scopes and local `npx` availability.
