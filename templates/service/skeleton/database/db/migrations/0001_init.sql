-- First migration for ${{ values.name }}; the database itself is provisioned by the platform.
CREATE TABLE IF NOT EXISTS schema_info (
    version    integer PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO schema_info (version) VALUES (1) ON CONFLICT DO NOTHING;
