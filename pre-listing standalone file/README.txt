STANDALONE PRE-LISTING
======================

File:
  standalone-prelisting.html

This is a self-contained public-facing pre-listing form. It does not depend
on the dashboard's frontend scripts. It submits to the existing
/api/v1/prelistings endpoint.

Local preview:
  Start the project from its root folder with:
    npm run dev:local

  Then open:
    http://localhost:3000/pre-listing%20standalone%20file/standalone-prelisting.html

Database submissions require a working local environment configuration and
the project's PostgreSQL schema. The pre-listing API route source remains at
api-handlers/v1/prelistings/index.ts in the project root so the API dispatcher
can serve it; it is intentionally not copied here.

The public API currently accepts valid pre-listings without a staff sign-in.
Before advertising the form publicly, configure rate limiting/WAF or CAPTCHA
and confirm the organization's privacy and retention requirements.
