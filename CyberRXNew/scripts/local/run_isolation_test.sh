#!/usr/bin/env bash
# Phase 1 acceptance test runner.
# Creates a fresh local Postgres database, applies the Supabase auth shim and the
# real migrations, then runs the tenant-isolation test. Exits non-zero on any
# failure (ON_ERROR_STOP + RAISE EXCEPTION in the test).
#
# Usage: bash scripts/local/run_isolation_test.sh
set -euo pipefail

DB=cyberrx_test
HERE="$(cd "$(dirname "$0")" && pwd)"
MIG="$HERE/../../supabase/migrations"

# Run psql as the postgres superuser, reading SQL from stdin so the postgres OS
# user doesn't need filesystem access to the repo.
pg() { su postgres -c "psql -v ON_ERROR_STOP=1 -X -q -d '$1'"; }

echo "▶ recreating database '$DB'…"
su postgres -c "dropdb --if-exists $DB"
su postgres -c "createdb $DB"

echo "▶ applying local Supabase auth shim…"
pg "$DB" < "$HERE/00_supabase_shim.sql"

echo "▶ applying migrations…"
for f in "$MIG"/*.sql; do
  echo "   - $(basename "$f")"
  pg "$DB" < "$f"
done

echo "▶ running tenant-isolation acceptance test…"
pg "$DB" < "$HERE/10_isolation_test.sql"
