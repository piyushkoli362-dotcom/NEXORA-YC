# Operations and production deployment

## Deployment topology
Deploy `apps/web` to Vercel with the repository root as install/build context and `npm run build -w apps/web`. Configure `API_INTERNAL_URL` before build to point to the FastAPI HTTPS origin. No secret environment variable may be prefixed `NEXT_PUBLIC_`. Same-origin `/api/v1` rewrites keep cookies on the frontend domain. Configure `APP_ENV=production`, `FRONTEND_URL=https://your-domain`, and `ALLOWED_ORIGINS=["https://your-domain"]` on the API.

Build the API container from repository root using `docker build -f infrastructure/Dockerfile.api .`. Run `alembic upgrade head` as a one-off release job before rolling out API replicas; do not run migrations simultaneously per replica. Provision PostgreSQL and Redis privately. Set SMTP host/port/credentials/from address. Production startup validates PostgreSQL, Redis and HTTPS origin configuration. Configure email sender SPF/DKIM/DMARC and test real verification and recovery delivery before inviting users.

For Supabase, use its PostgreSQL connection URL through SQLAlchemy; use a least-privilege database role and exclude the application schema from PostgREST exposure. This Phase 1 backend is the only data access layer. It does not use the browser Supabase client or Supabase service-role key. Private storage and vector access policies are introduced with Phase 2. Do not enable an unprotected REST/vector path around the API.

## Session security
Opaque 48-byte random session tokens are hashed at rest and set as HttpOnly, SameSite=Lax cookies. Secure is required in production. Sessions expire after 12 hours; password resets revoke all sessions. Mutations require the expected Origin and custom request header, including login. CORS lists exact origins. Never configure wildcard credentialed origins. Scope cookies to the frontend host and `/`. The JWT_SECRET placeholder is reserved for future integrations; Phase 1 deliberately uses revocable opaque sessions.

Use TLS end-to-end and enforce HSTS at the edge. The web CSP denies framing, object embedding, off-origin connections and arbitrary form targets. Next.js bootstrap requires inline scripts in the current static rendering strategy; adopt nonce-based dynamic rendering before adding third-party scripts. No user HTML is rendered. API error responses never include exception internals. Sensitive responses use `Cache-Control: no-store`.

## Rate limits and proxy boundary
Redis provides atomic shared request limiting: 20 auth mutations and 240 other requests per peer IP per minute. The in-memory limiter is only a single-process development fallback. Redis failures fail closed. API containers default to `--no-proxy-headers`. For a production reverse proxy, block direct public API ingress and configure uvicorn forwarded headers only for the exact trusted proxy IP ranges. Otherwise all proxied clients share a conservative rate bucket. Do not trust arbitrary client-supplied X-Forwarded-For headers. Configure additional edge bot and abuse limits.

## Database integrity and migrations
UUID primary keys, indexed foreign keys, role/status checks and unique membership/application-cycle constraints protect core data. Optimistic versions reject concurrent startup/application edits. Submission and review transitions commit status history, notification and audit in the same transaction. The migration uses a frozen schema snapshot independent of runtime models. Destructive downgrade is disabled; restore a backup or make a forward corrective migration.

The application implements resource-level row access through server-owned membership, owner and reviewer queries. Database RLS is a required defense-in-depth gate before adding direct Supabase access or pgvector retrieval in Phase 2. Do not claim database RLS is active in Phase 1.

## Recovery and observability
Send structured stdout events to a managed log sink. Log request IDs, response status, duration, actor/resource IDs and action names; never log request bodies, cookies, reset tokens, credentials, notes or model context. Correlate user reports with `X-Request-ID`. Set alerts on sustained 5xx, Redis outages, mail delivery failure and database readiness failure. Application audit rows are append-only through the API; restrict DB write permissions for operators.

Enable PostgreSQL backups and point-in-time recovery. Rehearse restoring to an isolated database and running the migration before launch. Define account deletion, data retention, support and incident-response policies before accepting production users. Current listing endpoints are bounded at 100; application API has limit/offset, while additional high-volume admin pagination is a next scaling task.

## OAuth / storage / AI boundaries
OIDC OAuth callbacks, provider secrets, PKCE/state/nonce validation and verified subject linking are designed adapter extensions; OAuth is not enabled. File uploads and extraction do not exist yet: links are validated HTTPS references and are never fetched by the server. AI registry/provider contracts exist in packages/ai, with an explicit configuration-required error. The API status says no AI analysis has run. Future AI jobs must have durable queues, tenant-filtered retrieval, tool allowlists, redacted run logs and human review before any acceptance decision.

## Launch gate
Use a staging environment to verify real PostgreSQL migrations, concurrent requests, sender delivery, reverse proxy/CSRF handling, cookie flags, rate limits, accessibility, backup recovery and monitoring. This source delivery is not a deployed or independently audited production service. No external infrastructure or accounts were provisioned by this task.

## Initial production administrator
Use the operator-only CLI once, after migrations. Set `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD` (16+ characters) and optionally `BOOTSTRAP_ADMIN_NAME` through the deployment secret store, then run `PYTHONPATH=apps/api python -m app.bootstrap_admin`. The CLI refuses to run if a super administrator already exists, takes a PostgreSQL advisory transaction lock, refuses to take over an existing email, and creates an audit event. The operator is responsible for verifying ownership of the bootstrap email. Remove bootstrap secrets immediately afterward. There is no public administrator-registration endpoint.

Database logging also needs a privacy policy: configure PostgreSQL `log_error_verbosity=terse`, `log_parameter_max_length_on_error=0`, and avoid statement/body logging for authentication tables. The development Compose file includes these settings. Do not collect database error DETAIL rows containing password hashes or sensitive application fields in centralized logs.
