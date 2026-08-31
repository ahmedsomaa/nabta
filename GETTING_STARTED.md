# Getting Started — Nabta

How to run the Nabta monorepo locally (Phase 1 Foundation).

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

# Prisma loads DATABASE_URL from packages/database/.env
ln -sf ../../.env packages/database/.env

# 3. Start data services (Postgres, Redis, MinIO)
pnpm docker:up

# 4. Database migrate + seed
pnpm db:migrate
pnpm db:seed

# 5. Run API + web (Turbo)
pnpm start:app
```

Or in one step after install + `.env` setup:

```bash
pnpm start
```

(`pnpm start` = `docker:up` → migrate → seed → `pnpm dev`)
## URLs

| Service | URL |
|---------|-----|
| Portal (web) | http://localhost:5173 |
| API health | http://localhost:3000/api/v1/health |
| MinIO console | http://localhost:9001 |

## Seeded users

After `pnpm db:seed`, these accounts are available (demo school **Nabta Demo School**):

| Email | Password | Role |
|-------|----------|------|
| `admin@nabta.local` | `Password123!` | ADMIN |
| `teacher@nabta.local` | `Password123!` | TEACHER |
| `student@nabta.local` | `Password123!` | STUDENT |

Registering a new school via the UI creates a new school + ADMIN user (separate from the seed).

## Optional: full stack in Docker

Infra is the default Compose profile. To also run API + web containers:

```bash
pnpm docker:up:full
```

Dockerfiles live under `nabta-docker/` (`Dockerfile.api`, `Dockerfile.web`).

## Useful scripts

| Command | Purpose |
|---------|---------|
| `pnpm start` | Docker infra up + migrate + seed + API/web (`dev`) |
| `pnpm start:app` | Start API + web only (infra already running) |
| `pnpm dev` | Same as `start:app` (Turbo watch) |
| `pnpm docker:up` | Start Postgres, Redis, MinIO |
| `pnpm docker:down` | Stop Compose services |
| `pnpm docker:up:full` | Infra + API/web containers |
| `pnpm docker:logs` | Follow Compose logs |
| `pnpm docker:ps` | Show Compose status |
| `pnpm build` | Build all packages and apps |
| `pnpm test` | Run Jest (API) + Vitest (web) |
| `pnpm typecheck` | TypeScript check across the monorepo |
| `pnpm db:migrate` | Apply Prisma migrations (`migrate deploy`) |
| `pnpm db:migrate:dev` | Interactive Prisma migrate (local schema changes) |
| `pnpm db:seed` | Seed demo school + three role users |
| `pnpm db:generate` | Regenerate Prisma client |

## Project layout

| Path | Purpose |
|------|---------|
| `apps/web` | React 19 + Vite + HeroUI v3 portals |
| `apps/api` | NestJS API (`/api/v1`) |
| `packages/database` | Prisma schema, migrations, seed |
| `packages/types` | Shared TypeScript types |
| `packages/validation` | Shared Zod schemas |
| `packages/config` | Env helpers / constants |
| `packages/i18n` | EN/AR translation files |
| `nabta-docker/` | Compose + Dockerfiles |

## Docs & agents

- Product / phase spec: [`docs/roadmap/01-foundation/`](docs/roadmap/01-foundation/)
- Full documentation site: [`docs/`](docs/)
- AI implementation guide: [`AGENTS.md`](AGENTS.md)
