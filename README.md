# myBudget
A mobile budgeting platform that combines normalized recurring planning, category-based budget tracking, automatic unspent carryover, and flexible analytics in a polished, secure app.

## Email Verification With Resend

The API sends verification codes through SMTP when all SMTP settings are present. For Resend, use:

- `SMTP_HOST=smtp.resend.com`
- `SMTP_PORT=587`
- `SMTP_USERNAME=resend`
- `SMTP_PASSWORD=<your Resend API key>`
- `EMAIL_FROM=MyBudget <onboarding@your-verified-domain.com>`

Copy `apps/api/.env.example` to `apps/api/.env`, fill in `SMTP_PASSWORD` and `EMAIL_FROM`, then restart the API or rerun `docker compose up --build`. The Docker compose API service reads `apps/api/.env`; its container database/JWT defaults still override the local development values where needed.

## Production Compose Notes

- `docker-compose.yml` expects runtime configuration in `apps/api/.env`.
- `adminer` is now behind the `debug` profile and will not start in a normal production deploy.
- Postgres is no longer published on the host by default.
- Use explicit `CORS_ALLOWED_ORIGINS` values such as `https://app.example.com`.
- For the bundled Postgres container, set `DATABASE_URL` to use host `postgres`, not `localhost`.

Example:

```env
POSTGRES_DB=mybudget
POSTGRES_USER=mybudget
POSTGRES_PASSWORD=replace-with-strong-postgres-password
DATABASE_URL=postgres://mybudget:replace-with-strong-postgres-password@postgres:5432/mybudget?sslmode=disable
APP_ENV=production
CORS_ALLOWED_ORIGINS=https://app.example.com
```
