-- Dashboard roles and controls for an existing e-Kapon installation.
-- Run once after the earlier auth/accounts schema and dashboard migration.
BEGIN;

ALTER TYPE ekapon.account_type RENAME VALUE 'Admin' TO 'SuperAdmin';
ALTER TYPE ekapon.account_type RENAME VALUE 'Encoder' TO 'Admin';

CREATE TABLE ekapon.system_settings (
    setting_key   text PRIMARY KEY CHECK (setting_key IN ('maintenance_mode')),
    setting_value jsonb NOT NULL,
    updated_at    timestamptz NOT NULL DEFAULT now()
);
INSERT INTO ekapon.system_settings (setting_key, setting_value)
VALUES ('maintenance_mode', 'false'::jsonb);

CREATE TABLE ekapon.role_feature_access (
    account_type text NOT NULL CHECK (account_type IN ('Admin', 'Paravet')),
    feature_key  text NOT NULL CHECK (feature_key IN (
        'operations', 'registry', 'field-team', 'reports', 'data-quality',
        'data-management', 'settings'
    )),
    enabled      boolean NOT NULL DEFAULT true,
    updated_at   timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (account_type, feature_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON ekapon.system_settings, ekapon.role_feature_access TO ekapon_admin;

COMMIT;
