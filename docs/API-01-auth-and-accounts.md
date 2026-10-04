# API v1 — Modules 1–2

Base path `/api/v1`. JSON in, JSON out. Errors: `{"error":{"code","message","details?","requestId"}}`.
Cookie session (`ekapon_session`). Non-GET requests need an `Origin` header matching the site (browsers send it; with curl add `-H "Origin: http://localhost:3000"`).

## Auth
| Method & path | Who | Body → result |
|---|---|---|
| `POST /auth/login` | anyone | `{identifier, password}` → `{account}` + cookie. Staff: username. Paravet/User: account key. Errors: 401 `INVALID_CREDENTIALS`, 423 `ACCOUNT_LOCKED`, 403 `FIRST_SIGN_IN_REQUIRED`, 429 `TOO_MANY_ATTEMPTS` |
| `POST /auth/first-signin` | Paravet/User | `{accountKey, temporaryPassword}` → `{mustCreatePassword:true}` + 10-minute restricted cookie. 401 (with `details.attemptsLeft`), 410 `TEMP_PASSWORD_EXPIRED`, 423 locked after 3 wrong tries |
| `POST /auth/set-password` | restricted cookie only | `{newPassword, confirmPassword}` → `{account}` + full cookie. Rules: 8+ chars, a letter and a number |
| `POST /auth/logout` | any | clears the cookie |
| `GET /auth/me` | signed in | `{account:{id,type,name,username,accountKey}}` |
| `GET /health` | anyone | `{ok:true}` (checks the database) |

## Barangays
`GET /barangays?q=&district=1|2` — public, cached 1 hour. → `{data:[{id,acronym,name,district,zip}], total}` (62 rows without filters).

## Accounts (Admin only)
| Method & path | Purpose |
|---|---|
| `GET /accounts` | List. Query: `page, pageSize (≤500), sort (name\|key\|type\|barangay\|status\|created), dir, q, type, barangay, status, year, month, archived` → `{data,page,pageSize,total}` |
| `POST /accounts` | Create `{accountType:'Paravet'\|'User', firstName, middleName?, lastName, suffix?, mobile, barangay, paravetId?, ownerId?}` → 201 `{account, temporaryPassword, expiresInMinutes:15}` (password shown once). Key e.g. `PV2026-TMP001-3023`. 409 `DUPLICATE_ACCOUNT`, 422 `UNKNOWN_BARANGAY` |
| `GET /accounts/{key or id}` | Detail |
| `PATCH /accounts/{key or id}` | Edit names, mobile, barangay (the key never changes). Staff accounts: 403 |
| `DELETE /accounts/{key or id}` | Delete a Paravet/User account (not yourself, not staff). 409 `ACCOUNT_IN_USE` → archive instead |
| `POST /accounts/{key}/reset-password` | New temporary password (also unlocks) |
| `POST /accounts/archive` | `{ids:[...], restore?:false}` batch archive/restore |

Example (local):
```
curl -c jar -H "Origin: http://localhost:3000" -H "Content-Type: application/json" \
  -d '{"identifier":"admin","password":"..."}' http://localhost:3000/api/v1/auth/login
curl -b jar "http://localhost:3000/api/v1/accounts?type=Paravet&sort=created&dir=desc"
```
