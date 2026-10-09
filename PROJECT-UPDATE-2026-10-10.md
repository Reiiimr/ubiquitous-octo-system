# Project update log — 2026-10-10

## Scope

This note records the local changes made after following `README-2026-10-09.md`. The changes address the census-review feature gate and record-ID collision risk. No release or deployment action was taken.

## Changes made

- `server/api-dispatch.ts`
  - Routed both census submission endpoints through the `data-quality` feature flag so the API gate matches the Admin/SuperAdmin review panel's Data quality section.

- `api-handlers/v1/census/submissions/[id].ts`
  - Changed approval so it stops when a submitted dataset/record ID already exists in the approved registry.
  - The handler reports whether the existing ID is in the same barangay or another barangay.
  - Added a `RETURNING` check on the insert conflict path so a concurrent record creation cannot be silently treated as a successful approval.
  - Since the transaction fails before the review decision is saved, the submission remains pending and existing approved records remain unchanged.

- `role-dashboard.js`
  - Updated the review panel text to explain that approval adds new records and stops when an ID already exists.

- `tests/auth-accounts.test.ts`
  - Added a regression case that creates an approved record in one barangay, submits the same ID from another barangay, checks that approval is blocked, and verifies the original record remains unchanged and the submission stays pending.

## Interim collision behavior

The API blocks all existing ID matches, including same-barangay matches. This prevents silent replacement while the README's same-barangay policy remains undecided. The review UI does not yet offer a per-record keep/replace/merge choice, so matching submissions cannot be approved until a policy and review flow are implemented.

## Verification recorded

- `npm run typecheck` — passed.
- `npm test -- --silent` against the configured staging database — 4 test files and 33 tests passed.
- Post-test cleanup check — zero test records, census submissions, or test accounts remained.
- `git diff --check` — passed; Git printed line-ending conversion warnings for existing working-tree files.

## Left untouched / not performed

- No other pre-existing modified or untracked project files were edited as part of this update. The workspace already contained numerous unrelated changes; they were left intact.
- No files were staged, committed, pushed, or deployed.
- No database migration or manual SQL change was made.
- No `.env.local` credentials were copied into documentation, printed, or changed.
- No production database or deployment environment was used.

## Current release limitations

The README's other open policy and product questions remain open, including the canonical census form contract, pending-submission edit/withdraw/resubmit lifecycle, Paravet CSV importer wording and lifecycle, retention/audit requirements, and database-level row security. This change does not resolve those items or make the project release-approved.
