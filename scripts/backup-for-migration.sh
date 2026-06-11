#!/bin/bash
# Respaldo completo para llevar el entorno a otra máquina (Mac → Windows, etc.)
#
# Genera en backups/migration-FECHA/:
#   - espocrm.sql          (PostgreSQL: casos, usuarios, roles, notificaciones…)
#   - espocrm-data.tar.gz  (PDFs, adjuntos, config interna de EspoCRM)
#   - env.example.txt      (referencia de variables; copia tu .env a mano)
#
# Uso:
#   bash scripts/backup-for-migration.sh
#
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -f .env ]; then
  echo "Falta .env en la raíz del proyecto."
  exit 1
fi

POSTGRES_USER="$(grep -E '^POSTGRES_USER=' .env | cut -d= -f2- | tr -d '\"')"
POSTGRES_DB="$(grep -E '^POSTGRES_DB=' .env | cut -d= -f2- | tr -d '\"')"

STAMP="$(date +%Y%m%d-%H%M)"
DEST="$ROOT/backups/migration-$STAMP"
mkdir -p "$DEST"

echo "==> Volcando base de datos PostgreSQL..."
docker exec espocrm-db pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" --no-owner --no-acl \
  > "$DEST/espocrm.sql"
echo "    OK: $DEST/espocrm.sql ($(du -h "$DEST/espocrm.sql" | awk '{print $1}'))"

echo "==> Empaquetando /var/www/html/data (adjuntos, PDFs, config)..."
docker exec espocrm tar czf - -C /var/www/html/data . > "$DEST/espocrm-data.tar.gz"
echo "    OK: $DEST/espocrm-data.tar.gz ($(du -h "$DEST/espocrm-data.tar.gz" | awk '{print $1}'))"

echo "==> Referencia de entorno..."
cp .env.example "$DEST/env.example.txt"
echo "    Copia también tu .env real (no va a GitHub)."

cat > "$DEST/LEEME.txt" <<EOF
Respaldo CRM Alcaldía — $STAMP

Lleva esta carpeta completa a Windows junto con el repo (git clone o USB).

Archivos:
  espocrm.sql         — Base de datos
  espocrm-data.tar.gz — Archivos subidos/generados
  env.example.txt     — Plantilla; necesitas tu .env con las mismas contraseñas

En Windows:
  1. Instalar Docker Desktop + Git
  2. git clone https://github.com/isabelasring/CRMALCALDIA.git
  3. Copiar .env (desde Mac) y esta carpeta backups/migration-$STAMP
  4. bash scripts/restore-from-migration.sh backups/migration-$STAMP
EOF

echo ""
echo "Listo. Carpeta de respaldo:"
echo "  $DEST"
echo ""
echo "Lleva a Windows:"
echo "  1. Esta carpeta backups/migration-$STAMP  (USB, OneDrive, etc.)"
echo "  2. Tu archivo .env (contraseñas y SMTP)"
echo "  3. El código ya está en GitHub → git pull en Windows"
