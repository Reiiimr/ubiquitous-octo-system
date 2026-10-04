-- =====================================================================
--  CityVet backend: database login role for the API (run after 000_ekapon_schema.sql)
--  Supabase: SQL Editor -> paste -> edit the password -> Run.
--  The API connects as this role, NOT as postgres / service_role.
-- =====================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ekapon_api') THEN
        -- >>> CHANGE THIS PASSWORD to a long random value (and use the same one in DATABASE_URL) <<<
        CREATE ROLE ekapon_api LOGIN PASSWORD 'CHANGE_ME_TO_A_LONG_RANDOM_PASSWORD';
    END IF;
END $$;

-- Table, sequence and function privileges come from the ekapon_admin role created by ekapon_schema.sql
-- (including: audit_log is append-only, no access to anything outside the ekapon schema).
GRANT ekapon_admin TO ekapon_api;

-- Supabase keeps pgcrypto in the "extensions" schema; the password functions need to reach it.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'extensions') THEN
        GRANT USAGE ON SCHEMA extensions TO ekapon_api;
    END IF;
END $$;

-- Safety: the API role cannot create objects or touch other schemas.
REVOKE CREATE ON SCHEMA public FROM ekapon_api;
