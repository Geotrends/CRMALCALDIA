#!/usr/bin/env bash
# Arranque en Mac: levanta Docker, restaura backups/espocrm.dump y despliega custom.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DUMP="${1:-$ROOT/backups/espocrm.dump}"

if [[ ! -f .env ]]; then
  echo "ERROR: Falta .env. Copia .env.example y configúralo."
  exit 1
fi

if [[ ! -f "$DUMP" ]]; then
  echo "ERROR: No existe el backup: $DUMP"
  echo "Coloca espocrm.dump en backups/ o pasa la ruta: ./scripts/setup-mac.sh /ruta/al.dump"
  exit 1
fi

if docker ps --format '{{.Names}}' | grep -qx 'espocrm-db'; then
  echo "==> Contenedores ya en marcha, se reutilizan."
else
  echo "==> Levantando base de datos..."
  docker compose up -d espocrm-db
fi

echo "==> Esperando PostgreSQL..."
for i in {1..40}; do
  if docker exec espocrm-db pg_isready -U espocrm -d espocrm >/dev/null 2>&1; then
    break
  fi
  sleep 3
done

echo "==> Restaurando backup (puede tardar un minuto)..."
if head -c 5 "$DUMP" | grep -q PGDMP; then
  docker exec -i espocrm-db pg_restore -U espocrm -d espocrm --clean --if-exists --no-owner <"$DUMP"
else
  docker exec -i espocrm-db psql -U espocrm -d espocrm <"$DUMP"
fi

if docker ps --format '{{.Names}}' | grep -qx 'espocrm'; then
  echo "==> EspoCRM ya está arriba."
else
  echo "==> Levantando EspoCRM (app, daemon, websocket)..."
  docker compose up -d
fi

echo "==> Esperando contenedor espocrm..."
sleep 15

echo "==> Aplicando custom (reinicio con auto-deploy)..."
docker compose restart espocrm

# shellcheck source=includes/wait-for-espocrm.sh
source "$ROOT/scripts/includes/wait-for-espocrm.sh"
wait_for_espocrm_ready "http://localhost:8080"

if [[ -f "$ROOT/scripts/fix-custom-permissions.sh" ]]; then
  chmod +x "$ROOT/scripts/fix-custom-permissions.sh" 2>/dev/null || true
  "$ROOT/scripts/fix-custom-permissions.sh" || true
fi

echo ""
echo "Listo."
echo "  CRM:  http://localhost:8080"
echo "  Admin y usuarios: los mismos que en Windows (restaurados del backup)"
echo "  Recarga el navegador con Cmd+Shift+R"
echo ""
echo "Si el correo no envía, revisa Administración → Cuenta de correo grupal (SMTP)."
