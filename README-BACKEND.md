# CityVet dashboard backend — setup (Vercel + Supabase)

Stack: Vercel serverless functions (`/api`, Node 20+, TypeScript) + Supabase PostgreSQL. The static prototype and the API live in the same Vercel project.

## 1. Database (once)
1. For a **new** Supabase project, run `db/000_ekapon_schema.sql` in the SQL Editor. It creates the schema, staff accounts, barangays and dashboard storage.
   For an existing install of the earlier auth/accounts schema, run `db/002_fix_verify_password.sql` if needed, then `db/003_dashboard_records.sql`. Do not run the fresh-install migration over an existing database.
2. Edit the password in `db/001_create_api_role.sql`, then run it. This creates the restricted `ekapon_api` login the API uses.
3. Change the sample staff passwords (`admin`, `encoder`, currently `ChangeMe-123`) before the site is public. In the SQL editor:
   `select ekapon.set_permanent_password(id, 'A-new-strong-password-1') from ekapon.accounts where username = 'admin';` — this works while the account status is `Active` (it keeps `Active`).

## 2. Vercel
Settings → General: Root Directory `CityVet/CityVet` (or wherever this folder is), Framework Preset **Other**, no build command.
Settings → Environment Variables (Production and Preview):

| Name | Value |
|---|---|
| `DATABASE_URL` | Supabase → Connect → **Transaction pooler** string (port 6543), with user `ekapon_api.<project-ref>` and your role password |
| `JWT_SECRET` | 32+ random characters: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `ALLOWED_ORIGINS` | optional; only if another site must call the API |

Pick the Vercel function region closest to your Supabase region (Settings → Functions).

## 3. Run locally
```
npm install
Copy-Item .env.example .env.local  # PowerShell; fill in DATABASE_URL and JWT_SECRET
npm run dev:local              # http://localhost:3000/login.html  (static prototype + API)
npm run typecheck
npm test                       # needs a local PostgreSQL with the schema loaded and the ekapon_api role
```
Tests default to `postgres://ekapon_api:ekapon_api_test@localhost:5432/ekapon_test`; override with `TEST_DATABASE_URL`.

Never commit `.env.local` or paste database credentials into source files. For Vercel, add the same `DATABASE_URL` and a separately generated `JWT_SECRET` in the project's Environment Variables settings.

## Connected modules
- Staff sign-in, sessions, accounts and public barangay reference data use the existing `/api/v1` endpoints.
- The current dashboard's owners, pets, paravets, respondents, households, census animals, stubs, services, programs and participants use authenticated `/api/v1/records/{dataset}` endpoints. Create/import/archive/restore and import undo operations persist in PostgreSQL. CSV imports cover all of these operational datasets.
- Public owner pre-listings are validated and persisted through `/api/v1/prelistings`; staff can review them through the dashboard. Staff activity entries use the database audit log.
- The older standalone `app.js` clinic workflow is not connected by this integration.

`api-client.js` probes `/api/v1/health`. If the API answers, live rows come from the backend; if not, the app stays in browser-only demonstration mode. Do not use demo mode for real clinic records.
Switching to live mode does not automatically copy browser-local demo rows or earlier pre-listings into Supabase. Use the dashboard's CSV import for records that need to be retained.

## Security design (summary)
- Passwords and temporary passwords exist only as bcrypt hashes in the database; plaintext is shown once to the admin.
- Session = signed JWT in an `HttpOnly`, `SameSite=Strict`, `Secure` (production) cookie; the account is re-checked in the database on every request, so disabling, locking or archiving takes effect immediately.
- Temporary-password sign-in returns a restricted 10-minute cookie that can only be used to create the permanent password.
- Writes require a matching `Origin` (cross-site request blocking). Sign-in is limited per account (DB lockout) and per IP (`LOGIN_IP_MAX_FAILURES`, default 20 per 15 minutes).
- Every change is attributed in `audit_log` through `app.account_id` set per transaction.

## Known limits (honest list)
- Unknown-account sign-ins skip the password hash, so response timing could reveal whether an account exists. Add a dummy hash check before production hardening.
- Per-IP limiting relies on the platform's forwarded IP header; configure Vercel WAF/rate limiting or CAPTCHA in front of public pre-listing before public launch.
- Temporary passwords are shown to the admin; delivery by SMS/email is not built.
- Evolving dashboard operational rows use JSONB with an explicit dataset allowlist so the current UI can share durable data without pretending the unfinished Prisma model is active. Per-domain normalized models and row-level tenancy policies remain future work.
- Notification preferences, report selections, display/theme settings and backup files are still browser-local utility state; the standalone legacy `app.js` remains a separate prototype.
