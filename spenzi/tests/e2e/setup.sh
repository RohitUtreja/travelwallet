#!/bin/bash
# Prepares a throw-away Postgres database "fw" that mimics Supabase (auth schema + roles),
# applies schema.sql + migrations, and writes a PostgREST config. Idempotent.
# Requires: a running Postgres (PGHOST/PGPORT/PGUSER), and the `postgrest` binary on PATH.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$HERE/../../supabase"
export PGHOST="${PGHOST:-/tmp}" PGPORT="${PGPORT:-54329}" PGUSER="${PGUSER:-postgres}"
psql -q -d postgres -c "drop database if exists fw" -c "create database fw"
P="psql -q -v ON_ERROR_STOP=1 -d fw"
$P -f "$ROOT/tests/supabase_stub.sql"
$P -f "$ROOT/schema.sql"
$P -f "$ROOT/migrations/003_wallet_platform.sql"
$P <<'SQL'
create or replace function auth.uid() returns uuid language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''),
                  (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid $$;
do $$ begin create role authenticator login noinherit; exception when duplicate_object then null; end $$;
grant anon, authenticated to authenticator;
grant all on all tables in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
SQL
cat > "$HERE/pgrst.conf" <<CONF
db-uri = "postgres://authenticator@/fw?host=$PGHOST&port=$PGPORT"
db-schemas = "public"
db-anon-role = "anon"
jwt-secret = "super-secret-jwt-key-with-at-least-32-chars!!"
server-port = 3000
CONF
echo "ready. Next: postgrest $HERE/pgrst.conf & node $HERE/proxy.js &"
