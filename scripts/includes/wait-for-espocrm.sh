#!/usr/bin/env bash
# Espera a que el contenedor espocrm termine el auto-deploy y responda HTTP.
wait_for_espocrm_ready() {
  local url="${1:-http://localhost:8080}"
  local max_attempts="${2:-120}"

  echo "==> Esperando CRM ($url)..."
  for ((i = 1; i <= max_attempts; i++)); do
    if curl -sf "$url" >/dev/null 2>&1; then
      echo "    CRM listo."
      return 0
    fi
    sleep 3
  done

  echo "AVISO: el CRM no respondió a tiempo. Revisa: docker logs espocrm"
  return 1
}
