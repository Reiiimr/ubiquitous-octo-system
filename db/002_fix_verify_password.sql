-- =====================================================================
--  Patch 002: fix verify_password (a wrong permanent password raised
--  "multiple assignments to same column failed_login_count").
--  Run ONCE in the Supabase SQL editor when upgrading an older auth schema.
--  Fresh installs of db/000_ekapon_schema.sql already contain this fix.
-- =====================================================================
SET search_path = ekapon, public, extensions;

-- Permanent-password sign-in for username (staff) or account key (Paravet/User).
CREATE OR REPLACE FUNCTION verify_password(p_login text, p_password text, p_ip inet DEFAULT NULL)
RETURNS TABLE (o_ok boolean, o_reason text, o_account_id bigint)
LANGUAGE plpgsql SET search_path = ekapon, public, extensions AS $$
DECLARE a accounts%ROWTYPE; maxa integer := setting_int('max_login_attempts', 5); r text;
BEGIN
    SELECT * INTO a FROM accounts
     WHERE (username = p_login::citext OR account_key = upper(btrim(p_login))) AND archived_at IS NULL FOR UPDATE;
    IF NOT FOUND THEN
        PERFORM log_login_attempt(p_login, NULL, 'permanent', false, 'unknown account', p_ip);
        RETURN QUERY SELECT false, 'invalid'::text, NULL::bigint; RETURN;
    END IF;
    r := CASE
        WHEN a.status = 'Disabled' THEN 'disabled'
        WHEN a.status = 'Locked' OR a.locked_until > now() THEN 'locked'
        WHEN a.status IN ('Temporary password pending', 'Temporary password expired') THEN 'use_temporary_password'
        WHEN a.status = 'Password reset required' THEN 'must_reset'
        END;
    IF r IS NOT NULL THEN
        PERFORM log_login_attempt(p_login, a.id, 'permanent', false, r, p_ip);
        RETURN QUERY SELECT false, r, a.id; RETURN;
    END IF;
    IF a.password_hash IS NOT NULL AND a.password_hash = crypt(p_password, a.password_hash) THEN
        UPDATE accounts SET failed_login_count = 0, locked_until = NULL, last_login_at = now() WHERE id = a.id;
        PERFORM log_login_attempt(p_login, a.id, 'permanent', true, NULL, p_ip);
        RETURN QUERY SELECT true, 'ok'::text, a.id; RETURN;
    END IF;
    UPDATE accounts SET
           locked_until = CASE WHEN failed_login_count + 1 >= maxa THEN now() + interval '15 minutes' END,
           failed_login_count = CASE WHEN failed_login_count + 1 >= maxa THEN 0 ELSE failed_login_count + 1 END
     WHERE id = a.id;
    PERFORM log_login_attempt(p_login, a.id, 'permanent', false, 'invalid', p_ip);
    RETURN QUERY SELECT false, 'invalid'::text, a.id;
END $$;
