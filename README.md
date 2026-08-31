# Nabta

**Learn. Grow. Thrive.** — School platform for Egyptian international schools.

## Run the project

See **[GETTING_STARTED.md](GETTING_STARTED.md)** for setup details and seeded users.

```bash
pnpm install
cp .env.example .env
ln -sf ../../.env packages/database/.env
pnpm start
```

`pnpm start` brings up Docker infra, migrates, seeds, then runs the API + web. Use `pnpm start:app` (or `pnpm dev`) when infra is already running.

## Docs

Authoritative product spec: [`docs/roadmap/02-academic-core/`](docs/roadmap/02-academic-core/) (Phase 1 track complete).  
AI tooling guide: [`AGENTS.md`](AGENTS.md).
