# Getting Started — Nabta

How to run the Nabta monorepo locally.

## Current phase

**Phase 7 — Notifications** is the active implementation target. Phase 1 track, Phase 2 Academic Core, Phase 3 Student Experience, Phase 4 Teacher Experience, Phase 5 Assessments, and Phase 6 Administration are complete:

| Phase | Status |
|-------|--------|
| Phase 1 — Foundation | Complete |
| Phase 1b — Marketing | Bootstrap complete (landing polish in Phase 2) |
| Phase 1c — System Admin | Bootstrap complete (operator console in Phase 6) |
| Phase 1d — Mobile Student | Bootstrap complete |
| Phase 1e — Mobile Staff | Bootstrap complete |
| Phase 2 — Academic Core | Complete |
| Phase 3 — Student Experience | Complete |
| Phase 4 — Teacher Experience | Complete |
| Phase 5 — Assessments | Complete |
| Phase 6 — Administration | Complete |

Read [`docs/roadmap/07-notifications/`](docs/roadmap/07-notifications/index.html) before implementing new features.

Example Cursor prompt:

> Implement Phase 7 only. Do not implement Phase 8+ functionality.

## Prerequisites

- **Node.js** 22+
- **pnpm** 10+
- **Docker Desktop** (PostgreSQL, Redis, MinIO)

## First-time setup

```bash
# 1. Install dependencies
pnpm install

# 2. Environment
cp .env.example .env

# 3. Start data services (Postgres, Redis, MinIO)
pnpm docker:up

# 4. Generate Prisma client, migrate, seed
pnpm db:generate
pnpm db:migrate
pnpm db:seed

# 5. Run web apps + API (see below)
pnpm start:web
```

Or in one step after install + `.env` setup:

```bash
pnpm start
```

(`pnpm start` = `docker:up` → migrate → seed → `pnpm dev` — includes mobile Expo tasks)

> **Prisma 7:** Database URL lives in [`packages/database/prisma.config.ts`](packages/database/prisma.config.ts), loaded from the monorepo root `.env`. No symlink needed.

## Client surfaces

Nabta has **six** clients. For day-to-day web development, start the four browser/API apps:

| Surface | Path | Dev command | URL |
|---------|------|-------------|-----|
| School portals | `apps/web` | (included in `start:web`) | http://localhost:5173 |
| API | `apps/api` | (included in `start:web`) | http://localhost:3000/api/v1 |
| Marketing | `apps/marketing` | `pnpm dev:marketing` | http://localhost:5174 |
| System admin | `apps/system-admin` | `pnpm dev:system-admin` | http://localhost:5175 |
| Student mobile | `apps/mobile-student` | `pnpm dev:mobile-student` | Expo dev server |
| Staff mobile | `apps/mobile-staff` | `pnpm dev:mobile-staff` | Expo dev server |

### Start web + API (no mobile)

```bash
pnpm start:web
```

This runs API, web portal, marketing site, and system admin in parallel.

### Start individual apps

```bash
pnpm --filter @nabta/api dev
pnpm --filter @nabta/web dev
pnpm dev:marketing
pnpm dev:system-admin
```

Mobile apps use `EXPO_PUBLIC_API_URL` (default `http://localhost:3000`) to reach the API.

## URLs

| Service | URL |
|---------|-----|
| School portals (web) | http://localhost:5173 |
| Marketing site | http://localhost:5174 |
| System admin | http://localhost:5175 |
| API health | http://localhost:3000/api/v1/health |
| MinIO console | http://localhost:9001 |

## Seeded users

After `pnpm db:seed`, these accounts are available (demo school **Egyptian International School**):

| Email | Password | Role | App |
|-------|----------|------|-----|
| `admin@nabta.local` | `Password123!` | ADMIN (school) | Web portal |
| `teacher@nabta.local` | `Password123!` | TEACHER | Web portal |
| `student@nabta.local` | `Password123!` | STUDENT | Web portal |
| `system@nabta.local` | `Password123!` | SYSTEM_ADMIN (platform) | System admin |

Registering a new school via the web UI creates a new school + ADMIN user (separate from the seed).

## Optional: full stack in Docker

Infra is the default Compose profile. To also run API + web + marketing + system-admin containers:

```bash
pnpm docker:up:full
```

Dockerfiles live under `nabta-docker/` (`Dockerfile.api`, `Dockerfile.web`, `Dockerfile.marketing`, `Dockerfile.system-admin`).

## Useful scripts

| Command | Purpose |
|---------|---------|
| `pnpm start` | Docker infra up + migrate + seed + all Turbo dev tasks |
| `pnpm start:web` | API + web + marketing + system-admin (no mobile) |
| `pnpm start:app` | Alias for `pnpm dev` (all Turbo dev tasks) |
| `pnpm dev` | All Turbo dev tasks (web, api, marketing, system-admin, mobile) |
| `pnpm dev:marketing` | Marketing site only |
| `pnpm dev:system-admin` | System admin only |
| `pnpm dev:mobile-student` | Student Expo app |
| `pnpm dev:mobile-staff` | Staff Expo app |
| `pnpm docker:up` | Start Postgres, Redis, MinIO |
| `pnpm docker:down` | Stop Compose services |
| `pnpm docker:up:full` | Infra + API/web/marketing/system-admin containers |
| `pnpm docker:logs` | Follow Compose logs |
| `pnpm docker:ps` | Show Compose status |
| `pnpm build` | Build all packages and apps |
| `pnpm test` | Run tests across the monorepo |
| `pnpm typecheck` | TypeScript check across the monorepo |
| `pnpm db:generate` | Regenerate Prisma client (required after schema changes) |
| `pnpm db:migrate` | Apply Prisma migrations (`migrate deploy`) |
| `pnpm db:migrate:dev` | Interactive Prisma migrate + regenerate client |
| `pnpm db:seed` | Seed demo school + users |

## Project layout

| Path | Purpose |
|------|---------|
| `apps/web` | React 19 + Vite + HeroUI v3 school portals |
| `apps/marketing` | Public marketing site (Phase 1b) |
| `apps/system-admin` | Platform operator console (Phase 1c) |
| `apps/mobile-student` | Student mobile app — Expo + HeroUI Native (Phase 1d) |
| `apps/mobile-staff` | Staff mobile app — Expo + HeroUI Native (Phase 1e) |
| `apps/api` | NestJS API (`/api/v1`) |
| `packages/database` | Prisma schema, `prisma.config.ts`, migrations, seed |
| `packages/types` | Shared TypeScript types |
| `packages/validation` | Shared Zod schemas |
| `packages/config` | Env helpers / constants |
| `packages/i18n` | EN/AR translation files |
| `nabta-docker/` | Compose + Dockerfiles |

## Docs & agents

- Product / phase spec: [`docs/roadmap/07-notifications/`](docs/roadmap/07-notifications/) (Phases 1–6 complete)
- Full documentation site: [`docs/`](docs/)
- AI implementation guide: [`AGENTS.md`](AGENTS.md)
