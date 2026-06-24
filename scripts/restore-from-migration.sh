#!/bin/bash
# Restaura un respaldo hecho con backup-for-migration.sh
#
# Uso (después de docker compose up -d):
#   bash scripts/restore-from-migration.sh backups/migration-YYYYMMDD-HHMM
#
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BACKUP_DIR="${1:-}"

if [ -z "$BACKUP_DIR" ] || [ ! -d "$BACKUP_DIR" ]; then
  echo "Uso: bash scripts/restore-from-migration.sh backups/migration-YYYYMMDD-HHMM"
  exit 1
fi

SQL="$BACKUP_DIR/espocrm.sql"
DATA="$BACKUP_DIR/espocrm-data.tar.gz"

if [ ! -f "$SQL" ]; then
  echo "No se encontró: $SQL"
  exit 1
fi

if [ ! -f .env ]; then
  echo "Copia tu .env a la raíz del proyecto antes de restaurar."
  exit 1
fi

POSTGRES_USER="$(grep -E '^POSTGRES_USER=' .env | cut -d= -f2- | tr -d '\"')"
POSTGRES_DB="$(grep -E '^POSTGRES_DB=' .env | cut -d= -f2- | tr -d '\"')"

echo "==> Esperando PostgreSQL..."
for i in $(seq 1 30); do
  if docker exec espocrm-db pg_isready -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

echo "==> Restaurando base de datos..."
docker exec -i espocrm-db psql -U "${POSTGRES_USER}" -d postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${POSTGRES_DB}' AND pid <> pg_backend_pid();" \
  >/dev/null 2>&1 || true
docker exec -i espocrm-db psql -U "${POSTGRES_USER}" -d postgres -c "DROP DATABASE IF EXISTS ${POSTGRES_DB};"
docker exec -i espocrm-db psql -U "${POSTGRES_USER}" -d postgres -c "CREATE DATABASE ${POSTGRES_DB};"
docker exec -i espocrm-db psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" < "$SQL"
echo "    OK"

if [ -f "$DATA" ]; then
  echo "==> Restaurando archivos data/..."
  docker exec espocrm mkdir -p /var/www/html/data
  docker exec -i espocrm tar xzf - -C /var/www/html/data < "$DATA"
  docker exec espocrm chown -R www-data:www-data /var/www/html/data
  echo "    OK"
fi

echo "==> Esperando contenedor EspoCRM..."
for i in $(seq 1 60); do
  if docker exec espocrm test -f /var/www/html/bootstrap.php 2>/dev/null; then
    break
  fi
  sleep 3
done

echo "==> Aplicando custom (reinicio con auto-deploy)..."
docker compose restart espocrm

# shellcheck source=includes/wait-for-espocrm.sh
source "$ROOT/scripts/includes/wait-for-espocrm.sh"
wait_for_espocrm_ready "http://localhost:8080"

echo ""
echo "Restauración completa. Abre http://localhost:8080 y recarga con Ctrl+Shift+R."
