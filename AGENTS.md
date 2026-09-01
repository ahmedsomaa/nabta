# Nabta — AI implementation guide

**Nabta** (نَبْتَة) — *Learn. Grow. Thrive.*

A school platform for Egyptian international schools — Moodle for the Middle East, purpose-built for how schools operate.

## Working specification

- **Use:** HTML docs under `docs/` — this is the authoritative spec
- **Do not use:** `docs/requirements/requirements.md` as the implementation source (historical reference only)

## Where to start

1. Read [docs/business/what-is-nabta.html](docs/business/what-is-nabta.html) for positioning
2. Read [docs/business/glossary.html](docs/business/glossary.html) for domain terms
3. Read [docs/business/getting-started.html](docs/business/getting-started.html) for the workflow
4. Implement [docs/roadmap/07-portal-ui/](docs/roadmap/07-portal-ui/index.html) next (Phase 6 Administration is complete)

## Golden rule

Implement **one phase folder at a time**. Phase 1 (Foundation + 1b–1e bootstrap), Phase 2 (Academic Core), Phase 3 (Student Experience), Phase 4 (Teacher Experience), Phase 5 (Assessments), and Phase 6 (Administration) are complete. Example prompts:

> Implement Phase 7 only. Do not implement Phase 8+ functionality.

> Implement Phase 7 portal UI only. Do not implement notifications (Phase 8).

## Stack summary

| Layer | Technology |
|-------|-----------|
| Web frontend | React 19, Vite, Tailwind CSS v4, [HeroUI v3](https://heroui.com/) (`@heroui/react` + `@heroui/styles`), Lucide React + [lucide-animated](https://lucide-animated.com/) — `apps/web`, `apps/marketing`, `apps/system-admin` |
| Mobile | Expo (~54), Expo Router, [HeroUI Native](https://heroui.com/) + Uniwind — `apps/mobile-student`, `apps/mobile-staff` |
| Backend | NestJS, Prisma, PostgreSQL |
| Cache/queues | Redis, BullMQ |
| Email | Resend |
| Files | MinIO (dev), S3/R2 (prod) |
| Monorepo | pnpm + Turbo |

## Design

- **UI:** HeroUI v3 — Nabta green `#10B981` as `--accent` (see `docs/design/`)
- **Icons:** Lucide React (default static); lucide-animated for selective hover icons (per-icon via shadcn registry CLI)
- **Logo:** Lucide Sprout icon (see `docs/design/logos.html`)
- **Fonts:** Quicksand (EN), Zain (AR); JetBrains Mono for code
- **i18n:** EN/AR from Phase 1, RTL support required
- **Docs site:** Pure HTML/CSS in `docs/` — Fumadocs-inspired layout, emerald-500 palette, no build step

## HeroUI agent tooling

When building portal UI, use HeroUI tooling (do not invent parallel component APIs):

| Tool | Setup | Use |
|------|--------|-----|
| [MCP Server](https://heroui.com/en/docs/react/getting-started/mcp-server) | [`.cursor/mcp.json`](.cursor/mcp.json) → `@heroui/react-mcp` | Live component docs, props, theme variables, source |
| [Agent Skills](https://heroui.com/en/docs/react/getting-started/agent-skills) | `.agents/skills/heroui-react` (also `heroui-native`, `heroui-migration`) | `/heroui-react` or `/heroui-native` — web vs mobile |
| [agents-md](https://heroui.com/en/docs/react/getting-started/agents-md) | [docs/technical/heroui-agents.md](docs/technical/heroui-agents.md) + `.heroui-docs/` | Local docs index; refresh with `npx heroui-cli@latest agents-md --react --output docs/technical/heroui-agents.md` |

This file (`AGENTS.md`) is **Nabta-first**. Never overwrite it with the HeroUI CLI output.

## Key references

| Section | Path |
|---------|------|
| Business | `docs/business/` |
| Requirements | `docs/requirements/` |
| Design | `docs/design/` |
| Technical | `docs/technical/` |
| Roadmap | `docs/roadmap/` |
| Env vars | `docs/technical/environment.html` |
| Cursor rules | `docs/requirements/notice.md` |
| HeroUI docs index | `docs/technical/heroui-agents.md` |
