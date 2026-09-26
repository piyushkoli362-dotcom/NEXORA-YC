# Railway deployment

Deploy both services from the repository root on the `main` branch. Provision PostgreSQL and Redis in the same Railway project. Keep database and Redis access on the private network.

## API service

- Set `RAILWAY_DOCKERFILE_PATH=infrastructure/Dockerfile.api`.
- Set the pre-deploy command to `python -m alembic -c alembic.ini upgrade head`.
- Set the health check path to `/api/v1/health`.
- Set `APP_ENV=production`.
- Set `DATABASE_URL` using PostgreSQL's private connection details, with the SQLAlchemy driver prefix `postgresql+psycopg://` (the application uses psycopg 3).
- Set `REDIS_URL` using the Redis service connection reference.
- Set `FRONTEND_URL` to the frontend HTTPS origin and `ALLOWED_ORIGINS` to a JSON array containing that exact origin.
- Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, and `SMTP_FROM` using the email provider's values. Verify sender delivery before opening registration to users.

The container listens on Railway's `PORT`. Run migrations as the pre-deploy job, not in every API replica.

## Web service

- Set `RAILWAY_DOCKERFILE_PATH=infrastructure/Dockerfile.web`.
- Set `API_INTERNAL_URL` to the API HTTPS origin, or its reachable private HTTP origin including its port. This value is required at build time because Next.js compiles the API rewrite into the build.
- Generate a public HTTPS domain and use it in the API's origin settings above.
- Set the health check path to `/`.
- Redeploy the frontend when changing `API_INTERNAL_URL`.

The container listens on Railway's `PORT`. Browser calls stay on `/api/v1` on the frontend domain, preserving same-origin session cookies.

## Verify after deployment

Check `/`, `/register`, and `/api/v1/health` through the frontend public URL. Verify registration, real verification email delivery, login, logout, and password reset. Create the first administrator using the operator CLI documented in `OPERATIONS.md`; do not upload the development database or demo credentials.

Local build verification does not verify the Docker image or a Railway deployment. Deployment is complete only after Railway reports both services healthy and the public URL passes the checks above.
