# Nabta (نَبْتَة) — Learn. Grow. Thrive.

One important change I'd make for Cursor

I would not paste this and tell Cursor "build the whole thing." Cursor is much more effective if this becomes the master specification, then you give it smaller implementation prompts such as:

"Implement Phase 2 only. Do not implement Phase 3+ functionality."

Then move phase-by-phase.

For this particular product, I'd also strongly recommend making the repository a monorepo:

nabta/
├── apps/
│   ├── web/           # Nabta portals (student/teacher/admin)
│   ├── api/           # NestJS
│   └── marketing/     # Public marketing site (Phase 1b)
│
├── packages/
│   ├── database/      # Prisma schema/client
│   ├── types/         # Shared domain types
│   ├── validation/    # Shared Zod schemas
│   ├── config/        # Shared configuration
│   └── i18n/          # Shared EN/AR translations
│
├── nabta-docker/
│   ├── docker-compose.yml
│   ├── docker-compose.prod.yml
│   ├── Dockerfile.api
│   ├── Dockerfile.web
│   └── Dockerfile.marketing
│
├── .github/workflows/ # CI/CD from day one
├── package.json
├── pnpm-workspace.yaml
└── turbo.json

That gives you a much better foundation for eventually adding a parent portal, mobile apps, school-specific customization, SSO, payments, messaging, and integrations without turning the codebase into a monolith.

Use the HTML documentation under docs/ as the working spec (authoritative — not requirements.md):

- `docs/business/` — why Nabta exists, product vision, glossary, getting started
- `docs/requirements/` — what the product must do (portals, platform capabilities)
- `docs/design/` — philosophy, colors, typography, logos, UX states
- `docs/technical/` — stack, architecture, deployment, diagrams
- `docs/roadmap/` — implementation phases (Phase 1 track complete; start with `02-academic-core/`, then `03-student-experience/…`)
- `AGENTS.md` — AI entry point at repo root

Golden rule: implement **one phase folder at a time**.
