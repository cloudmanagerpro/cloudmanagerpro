# Contributing to CloudManagerPro

Thanks for your interest in contributing! This guide covers local setup, how to run the frontend and
backend, branch strategy, pull-request rules, and coding conventions.

By contributing you agree that your contributions are licensed under the project's
[Apache License 2.0](../LICENSE).

---

## Prerequisites

| Tool | Version | Used for |
| --- | --- | --- |
| **Node.js** | 20.x | Frontend (Next.js) |
| **Java (JDK)** | 17 | Backend (Spring Boot) |
| **Maven** | via `./mvnw` wrapper | Backend build/run |
| **Docker** + Compose v2 | latest | Local Postgres, full-stack runs |
| **Git** | latest | Version control |

You do **not** need a global Maven install — use the bundled Maven Wrapper (`./mvnw`).

---

## Local setup

```bash
# 1. Fork on GitHub, then clone your fork
git clone https://github.com/<you>/cloudmanagerpro.git
cd cloudmanagerpro

# 2. Add the upstream remote to keep in sync
git remote add upstream https://github.com/your-org/cloudmanagerpro.git
```

The repository is a monorepo:

```
cloudmanagerpro/
  frontend/   # Next.js 14 app
  backend/    # Spring Boot 3 app
  docker/     # compose files, Caddyfile, env template
  scripts/    # deploy/update/backup/restore/healthcheck
  docs/        # you are here
```

---

## Running the app locally

Run the database in Docker and the two apps natively for the fastest feedback loop. These are the three
commands:

```bash
# 1. Start Postgres (+ pgAdmin) for local development
cd docker && docker compose -f docker-compose.dev.yml up -d

# 2. Start the backend (profile "local" enables CORS for http://localhost:3000)
cd backend && ./mvnw spring-boot:run -Dspring-boot.run.profiles=local

# 3. Start the frontend, pointed at the local backend
cd frontend && npm install && npm run dev   # NEXT_PUBLIC_API_URL=http://localhost:8080/api
```

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8080/api` (health: `http://localhost:8080/api/health`)
- Demo data is on by default, so the UI is fully populated without any cloud credentials.

For local frontend env, create `frontend/.env.local` (from `frontend/.env.example`) with:

```
NEXT_PUBLIC_API_URL=http://localhost:8080/api
```

### Building (what CI expects to pass)

```bash
# Frontend production build
cd frontend && npm install && npm run build

# Backend package (skip tests for a quick check)
cd backend && ./mvnw clean package -DskipTests
```

### Full stack via Docker (optional)

To run the production-shaped stack locally, copy `docker/.env.production.example` to
`docker/.env.production`, then use the production compose file (see
[DEPLOYMENT_VM.md](DEPLOYMENT_VM.md)).

---

## Database migrations

- Migrations are **Flyway** SQL files in `backend/src/main/resources/db/migration/`.
- They are named `V<n>__<description>.sql` (e.g. `V3__cloud_resources.sql`) and run **in order
  automatically** on backend startup.
- **Never edit an already-merged migration.** To change the schema, add a **new** migration with the
  next version number.
- Conventions: UUID primary keys, `timestamptz` for timestamps, `numeric` for money, `jsonb` for
  tags/metadata, and a `user_id` column **with an index** on every tenant-owned table.

See [ARCHITECTURE.md](ARCHITECTURE.md#database-postgresql-16) for the migration list and schema notes.

---

## Branch strategy

- `main` is always releasable; do not commit directly to it.
- Branch off `main` using a descriptive, prefixed name:

| Prefix | For |
| --- | --- |
| `feat/` | New features (e.g. `feat/gcp-provider`) |
| `fix/` | Bug fixes (e.g. `fix/sync-null-region`) |
| `docs/` | Documentation only |
| `refactor/` | Internal changes, no behavior change |
| `chore/` | Tooling, deps, CI |

Keep branches focused and reasonably small. Rebase on the latest `main` before opening a PR:

```bash
git fetch upstream
git rebase upstream/main
```

---

## Commit messages

Follow **Conventional Commits**:

```
<type>(optional scope): <short summary>

[optional body explaining the why]
```

Examples:

```
feat(cost): add savings-opportunities endpoint
fix(auth): reject expired tokens with 401
docs(api): document cleanup dry-run response
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`, `build`, `ci`.

---

## Pull-request rules

Before opening a PR:

1. **Build passes locally** — both `npm run build` (frontend) and `./mvnw clean package` (backend).
2. **No secrets** — never commit `.env`, `docker/.env.production`, keys, or tokens. Only `*.example`
   templates are tracked.
3. **Docs updated** — if you change endpoints, env vars, or behavior, update the relevant docs
   (`README.md`, `docs/API.md`, etc.). The docs are the contract.
4. **Scoped** — one logical change per PR; avoid mixing refactors with features.
5. **Migrations are additive** — add new Flyway files; don't rewrite merged ones.

In the PR description, include: what changed and why, how you tested it, any screenshots for UI changes,
and linked issues. PRs require review approval and green CI before merge. Squash-merge is preferred to
keep `main` history clean.

---

## Coding style & conventions

### General
- Match the existing style of the file/area you're editing.
- Prefer clear names over comments; add comments only for non-obvious intent or trade-offs.
- Never log secrets; always mask credentials in responses.
- Enforce tenant isolation: every data-access path must be scoped to the authenticated user.

### Frontend (TypeScript / Next.js)
- TypeScript everywhere; avoid `any`. Define shared types in `lib/types.ts`.
- Use the `lib/api.ts` fetch wrapper (it injects the Bearer token) — don't hand-roll `fetch` with auth.
- Server state goes through **React Query**; keep components presentational where possible.
- Use the shared **shadcn/ui** components and Tailwind utility classes; follow the Linear-inspired design
  tokens in `tailwind.config.ts` / `app/globals.css`.
- Provide loading skeletons and empty states for data views.
- Run formatting/linting (`npm run lint`) before pushing.

### Backend (Java / Spring Boot)
- Standard Java 17 conventions; keep controllers thin and put logic in services.
- Use DTO **records** for request/response; never expose entities directly, and always mask secrets.
- Repositories must expose only tenant-scoped finders (e.g. `findByIdAndUserId`).
- Throw typed exceptions and let `GlobalExceptionHandler` produce the uniform error JSON
  (`{timestamp, status, error, message}`) — don't leak stack traces or secrets.
- Put feature flags/secrets behind `AppProperties`; read config from Spring profiles, not hardcoded
  values.

---

## Reporting bugs & requesting features

- Open a GitHub issue with clear reproduction steps (for bugs) or a concise problem statement and
  proposed solution (for features).
- For **security issues**, do **not** open a public issue — report privately to the maintainers (see
  [SECURITY.md](SECURITY.md)).

---

## Related docs

- [README](../README.md) — overview, quick start, env vars
- [ARCHITECTURE.md](ARCHITECTURE.md) — system design
- [API.md](API.md) — endpoint contract
- [SECURITY.md](SECURITY.md) — security model and secret handling
