# Nexora

An original dark founder workspace built with Next.js, TypeScript, Tailwind, shadcn-style Radix primitives, TanStack Query, FastAPI, Pydantic, SQLAlchemy and PostgreSQL-ready migrations.

**Phase 1 is the implementation scope.** AI execution, storage ingestion, matching, mentor workflows, fundraising, analytics and autonomous MVP execution are future phases. The interface labels them accordingly. No fake AI responses or synthetic startup health scores.

## Read the architecture first
- [Architecture, RBAC, AI boundaries, page map, milestones](docs/ARCHITECTURE.md)
- [Database ERD and phased schema](docs/DATABASE.md)
- [API specification](docs/API.md)
- [Production deployment and security](docs/OPERATIONS.md)

## Local setup
Requires Node.js 22+ and Python 3.12. Run all commands from the repository root.

```sh
npm ci
python -m venv .venv
# Activate the virtual environment for your shell.
pip install -r apps/api/requirements.lock.txt
cp .env.example .env
python -m alembic -c apps/api/alembic.ini upgrade head
```

The default database is SQLite for a local smoke test only. For PostgreSQL, set `DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST:5432/DB` before running migrations. `infrastructure/compose.yml` provides PostgreSQL/pgvector and Redis when Docker is available. Set `POSTGRES_PASSWORD` before starting it. On Windows, `Copy-Item .env.example .env` replaces the `cp` command.

Start API (terminal 1):
```sh
python -m uvicorn app.main:app --app-dir apps/api --host 127.0.0.1 --port 8000 --no-access-log --no-proxy-headers
```
Start web (terminal 2):
```sh
npm run dev
```
Open http://localhost:3000. API docs: http://127.0.0.1:8000/api/v1/docs. The web proxies `/api/v1` to the API, keeping authentication same-origin.

## Development demo
Set `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` and `SEED_FOUNDER_PASSWORD` in `.env` (passwords at least 12 characters). Then:
```sh
# Linux/macOS
PYTHONPATH=apps/api python -m app.seed
# PowerShell
$env:PYTHONPATH = 'apps/api'
python -m app.seed
```
Seeds 10 founders, 5 startups, 3 investors, 3 mentors, 20 applications, 5 challenge briefs, one reviewer and a super administrator. All demo records are marked. Founder login: `founder1@demo.nexora.example.com`; reviewer: `reviewer@demo.nexora.example.com`. Passwords come from your environment. Seed refuses to run outside development and is idempotent.

For this prepared local workspace only, randomly generated credentials are in ignored `.local/demo-credentials.txt`. Never deploy that file or `.env`.

Email verification and reset links appear explicitly as development-only links when SMTP is absent. Production does not expose token links and requires SMTP. Tokens are carried in URL fragments, removed from browser history after reading, hashed at rest and single-use.

## Verification
```sh
python -m pytest tests -q
npm run typecheck
npm run build
# With both servers running:
npx playwright install chromium
npm run test:e2e
```
To use installed Chrome, set `CHROME_PATH` to its executable path. Tests create independent accounts; use a disposable database for automated tests. PostgreSQL tests require `TEST_DATABASE_URL` pointing to an empty disposable test database. The test suite creates and drops domain tables there.

CI runs PostgreSQL migrations/database tests, a production web build, dependency audit, and browser flows. The exact locally completed checks and remaining operational gates are documented in `docs/VERIFICATION.md`.

## Important boundaries
- Public directories return only opted-in summary fields.
- Founder application views never include private reviewer notes.
- Only assigned reviewers and administrative roles can review applications.
- Founders must verify email and complete required fields before submission.
- Submitted snapshots are immutable; profile updates use optimistic version checks.
- Admin status changes, permission changes and review activity are audited.
- Document links are references only. Upload, scanning, signed storage access and RAG are Phase 2.
- There is no payment or securities transaction functionality.

## Verification results
See [the verification report](docs/VERIFICATION.md) for completed local checks, PostgreSQL evidence, browser coverage and operational limits.
