# API v1 specification

FastAPI generates authoritative OpenAPI at `/api/v1/openapi.json` and interactive documentation at `/api/v1/docs`. JSON input rejects unknown fields. Errors have `detail`; validation errors include field locations. List APIs are bounded. Cookies authenticate requests; mutations require `X-Nexora-Request: 1` and an allowed Origin. Object authorization happens on every request.

| Method | Endpoint | Contract / authorization |
|---|---|---|
| POST | /auth/register | email, password (12+), name, founder/cofounder only; 201 |
| POST | /auth/login | credentials; sets session cookie |
| GET | /auth/me | current database role and profile; 401 if invalid |
| POST | /auth/logout | revoke current session |
| GET/DELETE | /auth/sessions[/{id}] | list/revoke owned sessions |
| POST | /auth/forgot-password | generic response, email token |
| POST | /auth/reset-password | single-use token + new password; revoke all sessions |
| POST | /auth/verify-email | single-use token |
| POST | /auth/resend-verification | authenticated user; generic result |
| GET/PATCH | /users/me | own profile |
| GET | /startups/public?q= | opted-in public summary search |
| GET | /founders/public | opted-in founder profile summaries |
| GET/POST | /startups | member list / create owned startup |
| GET/PATCH | /startups/{id} | member read; owner write with version conflict detection |
| GET/POST | /applications | owned/assigned/all by role; create draft for owned startup |
| GET | /applications/{id} | filtered by owner/assignment/admin; private notes omitted from founder responses |
| POST | /applications/{id}/submit | verified owner, complete startup snapshot |
| POST | /applications/{id}/messages | authorized founder or reviewer; visible requests/replies |
| PATCH | /admin/applications/{id} | admin transition and/or reviewer assignment, version required |
| POST | /admin/applications/{id}/notes | assigned reviewer/admin; private |
| POST | /admin/applications/{id}/interviews | admin; future date and location |
| GET/PATCH | /admin/users[/{id}] | admin listing; privileged role changes super-admin only |
| GET | /admin/audit | admin, redacted append-only audit |
| GET/POST | /cohorts | admin list/create |
| POST | /cohorts/{id}/members | admin adds startup |
| GET | /challenges | public published/demo directory |
| GET/POST | /notifications[/{id}/read] | owned only |
| GET | /ai/status | explicit unconfigured/future phase state |
| GET | /health | readiness, database connectivity |

Future versioned routers: /evaluations, /cofounders, /investors, /funding, /mentors, /mvp, /documents, /analytics. Do not return fake success for unimplemented routes. API documentation and generated client contracts evolve with migrations. A future breaking API requires a new version.
