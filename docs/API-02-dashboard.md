# API v1 — Dashboard records and public pre-listing

All paths use `/api/v1`. Responses are JSON with the existing request-ID/error envelope. Dashboard writes require a signed-in account and a same-origin `Origin` header. The server validates dataset names, record identifiers, batch sizes and record size; user-supplied SQL identifiers are never accepted.

`SuperAdmin` and `Admin` have city-wide access to approved records. `Paravet` can read the owners/pets masterlist within their assigned barangay and submit census records for that barangay, but cannot create, replace, archive, or restore approved dashboard records. Census submissions stay pending until an `Admin` or `SuperAdmin` reviews them.

## Dashboard records

Supported dataset names: `owners`, `pets`, `paravets`, `respondents`, `households`, `animals`, `stubs`, `services`, `programs`, `participants`.

| Method & path | Purpose |
|---|---|
| `GET /records/{dataset}?page=1&pageSize=500&archived=false` | List active records. `archived=true` lists archived rows; `archived=all` lists both and includes `_archived`. Response: `{data,page,pageSize,total}` |
| `POST /records/{dataset}` | `SuperAdmin`/`Admin` only: upsert `{records:[{id,...fields}]}` (up to 100 rows/request). |
| `POST /records/{dataset}/archive` | `SuperAdmin`/`Admin` only: archive or restore `{ids:[...],archived:true\|false}`. |
| `POST /records/{dataset}/import` | `SuperAdmin`/`Admin`: apply `{batchId,label,records:[...]}` with a restore point. Paravet census-dataset imports instead append to a pending census submission; they do not touch approved records. |
| `POST /records/{dataset}/undo-import` | `SuperAdmin`/`Admin`: undo `{batchId}` if none of its records have changed. Paravets can remove only their own still-pending census submission. |
| `POST /census/submissions` | Paravet: submit `{submissionId,label,records:[{dataset,record}]}`. Datasets are limited to respondents, households, and animals; each record must match the assigned barangay. Repeated requests with the same UUID append/update records in the same pending form. |
| `GET /census/submissions?status=pending\|approved\|rejected\|all` | List the caller's own submissions for Paravets; city-wide list for Admin/SuperAdmin. |
| `GET /census/submissions/{id}` | Read submission details. Paravets can read only their own submissions. |
| `PUT /census/submissions/{id}` | Admin/SuperAdmin only: `{decision:"approve"\|"reject",note?}`. Approval atomically applies every record; matching record IDs are replaced. The review decision and reviewer are retained. |
| `GET /activity?page=1&pageSize=500` | List staff activity entries. |
| `POST /activity` | Record `{action,detail?}` for the signed-in staff member. |

Dashboard list filtering, sorting, CSV export, charts, and report views use the same UI record fields. Their durable source in live mode is `ekapon.dashboard_records`; the UI demo seed rows are not shown as real backend records.

The pending submission table is introduced by `db/005_census_submissions.sql`; `db/006_census_submitter_retention.sql` preserves submitter attribution while allowing account removal. It is a staging/review layer, not a normalized registry; reviewed records are applied to `dashboard_records` only through the Admin/SuperAdmin approval endpoint.

## Public owner pre-listing

`POST /prelistings` accepts `{owner,mobile,barangay,program,pets:[{name,species,sex,age}]}` without a session. The API validates the selected barangay against the reference table and returns `{ref}`. Staff `SuperAdmin`/`Admin` sessions can list submissions using `GET /prelistings?page=1&pageSize=500`; Paravets only see submissions for their assigned barangay.

Public submissions are personal information. Before launching the form publicly, enable Vercel WAF/rate limiting or CAPTCHA and define the office's retention/access policy.

## SuperAdmin controls and database backup

| Method & path | Purpose |
|---|---|
| `GET /admin/controls` | Return current maintenance mode and feature access settings for the authenticated role. |
| `PUT /admin/controls` | SuperAdmin-only update of maintenance mode and Admin/Paravet feature availability. |
| `GET /admin/backup` | SuperAdmin-only JSON export of application records, accounts without credential hashes, barangays, pre-listings, audit history with credential-hash fields removed, and controls. |

The database export is intended for safekeeping and is not a restore endpoint. The pre-existing browser-local backup/restore utility remains separate and must not be used as a replacement for a Supabase database backup.

## Storage notes

Dashboard records currently use JSONB with a fixed server-side dataset allowlist because the prototype's operational modules do not share the separate Prisma schema's field model. This is a persistence bridge, not a claim that all domain relationships or data validation are complete. Domain-specific relational schemas should replace it as those requirements are finalized.
