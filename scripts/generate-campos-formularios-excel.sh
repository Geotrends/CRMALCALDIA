#!/usr/bin/env bash
# Genera exports/campos-formularios-crm.xlsx
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VENV="$ROOT/scripts/.venv-excel"

if [[ ! -d "$VENV" ]]; then
  echo "Creando entorno virtual..."
  python3 -m venv "$VENV"
  "$VENV/bin/pip" install -q openpyxl
fi

"$VENV/bin/python" "$ROOT/scripts/generate-campos-formularios-excel.py" "$@"
