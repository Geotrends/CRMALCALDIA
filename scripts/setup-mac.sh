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

echo "==> Levantando base de datos..."
docker compose up -d espocrm-db

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

echo "==> Levantando EspoCRM (app, daemon, websocket)..."
docker compose up -d

echo "==> Esperando contenedor espocrm..."
sleep 15

echo "==> Desplegando código custom..."
chmod +x "$ROOT/scripts/deploy-custom.sh" 2>/dev/null || true
"$ROOT/scripts/deploy-custom.sh"

for script in merge-radicacion-field-metadata.php configure-radicacion-field-level.php configure-edwin-radicacion-access.php configure-acta-visita-entity.php; do
  if [[ -f "$ROOT/scripts/$script" ]]; then
    docker cp "$ROOT/scripts/$script" "espocrm:/tmp/$script"
    docker exec espocrm php "/tmp/$script" || true
  fi
done

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
