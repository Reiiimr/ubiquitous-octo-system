# API v1 — Dashboard records and public pre-listing

All paths use `/api/v1`. Responses are JSON with the existing request-ID/error envelope. Dashboard writes require a signed-in `Admin` or `Encoder` and a same-origin `Origin` header. The server validates dataset names, record identifiers, batch sizes and record size; user-supplied SQL identifiers are never accepted.

## Dashboard records

Supported dataset names: `owners`, `pets`, `paravets`, `respondents`, `households`, `animals`, `stubs`, `services`, `programs`, `participants`.

| Method & path | Purpose |
|---|---|
| `GET /records/{dataset}?page=1&pageSize=500&archived=false` | List active records. `archived=true` lists archived rows; `archived=all` lists both and includes `_archived`. Response: `{data,page,pageSize,total}` |
| `POST /records/{dataset}` | Upsert `{records:[{id,...fields}]}` (up to 100 rows/request). Used by program/stub entry. |
| `POST /records/{dataset}/archive` | Archive or restore `{ids:[...],archived:true\|false}`. |
| `POST /records/{dataset}/import` | Apply `{batchId,label,records:[...]}`. A batch id is a UUID. The server records pre-import values for safe undo. |
| `POST /records/{dataset}/undo-import` | Undo `{batchId}` if none of its records have changed since import. |
| `GET /activity?page=1&pageSize=500` | List staff activity entries. |
| `POST /activity` | Record `{action,detail?}` for the signed-in staff member. |

Dashboard list filtering, sorting, CSV export, charts, and report views use the same UI record fields. Their durable source in live mode is `ekapon.dashboard_records`; the UI demo seed rows are not shown as real backend records.

## Public owner pre-listing

`POST /prelistings` accepts `{owner,mobile,barangay,program,pets:[{name,species,sex,age}]}` without a session. The API validates the selected barangay against the reference table and returns `{ref}`. Staff `Admin`/`Encoder` sessions can list submissions using `GET /prelistings?page=1&pageSize=500`.

Public submissions are personal information. Before launching the form publicly, enable Vercel WAF/rate limiting or CAPTCHA and define the office's retention/access policy.

## Storage notes

Dashboard records currently use JSONB with a fixed server-side dataset allowlist because the prototype's operational modules do not share the separate Prisma schema's field model. This is a persistence bridge, not a claim that all domain relationships or data validation are complete. Domain-specific relational schemas should replace it as those requirements are finalized.
