#!/usr/bin/env bash
# Afrofade — Provisionnement de la base de développement locale.
# Réinitialise afrofade_db, applique le bootstrap Supabase-mock, la chaîne
# complète des migrations (ordre lexical), puis le seed de démonstration.
#
# Usage : bash scripts/dev-db/provision.sh
# Prérequis : stack docker démarrée (docker compose up -d db)

set -euo pipefail

cd "$(dirname "$0")/../.."

DB="${POSTGRES_DB:-afrofade_db}"
DB_USER="${POSTGRES_USER:-afrofade}"
DB_CONTAINER="${DB_CONTAINER:-afrofade-db}"
MIGRATIONS_DIR="web/supabase/migrations"

psql_db() {
  docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB" -q -v ON_ERROR_STOP=1 -f - "$@"
}

echo "==> Réinitialisation de la base '$DB' (les données locales existantes sont perdues)"
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d postgres -q \
  -c "DROP DATABASE IF EXISTS $DB WITH (FORCE);" \
  -c "CREATE DATABASE $DB;"

echo "==> Bootstrap dev (schémas auth/storage mocks + extensions)"
psql_db < web/supabase/dev/00_dev_bootstrap.sql

echo "==> Application de la chaîne des migrations (ordre lexical)"
SKIPPED=(80_marketplace_demo_seed.sql)  # remplacé par seed_demo.sql (insertion dans une view, FK cassées)
for f in "$MIGRATIONS_DIR"/*.sql; do
  base="$(basename "$f")"
  skip=false
  for s in "${SKIPPED[@]}"; do [[ "$base" == "$s" ]] && skip=true; done
  if $skip; then
    echo "    SKIP  $base (supersédé par web/supabase/dev/seed_demo.sql)"
    continue
  fi
  echo "    APPLY $base"
  psql_db < "$f"
done

echo "==> Seed de démonstration"
psql_db < web/supabase/dev/seed_demo.sql

echo "==> Rechargement du cache de schéma PostgREST"
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB" -c "NOTIFY pgrst, 'reload schema';" || true
docker restart afrofade-postgrest || true

echo "==> Terminé."
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB" -tAc \
  "SELECT 'tables publiques: '||count(*) FROM information_schema.tables WHERE table_schema='public';"
