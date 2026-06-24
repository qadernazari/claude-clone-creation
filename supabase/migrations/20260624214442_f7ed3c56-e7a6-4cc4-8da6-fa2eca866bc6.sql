
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO service_role;

-- Move has_role to the private schema. Existing RLS policies reference it
-- by OID, so they continue to work without modification.
ALTER FUNCTION public.has_role(uuid, app_role) SET SCHEMA private;
