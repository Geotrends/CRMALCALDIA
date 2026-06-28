#!/bin/bash
# Auto-deploy opcional (solo local). Nunca debe impedir que Apache arranque.
set -uo pipefail

REPO_ROOT="${REPO_ROOT:-/opt/bootstrap/repo}"
STAMP_FILE="/var/www/html/data/.custom-deploy-stamp"
DEPLOY_SCRIPT="$REPO_ROOT/scripts/deploy-custom-dokploy.sh"
STAMP_SCRIPT="$REPO_ROOT/scripts/includes/deploy-stamp.sh"

if [ -f "$STAMP_SCRIPT" ]; then
  # shellcheck source=/dev/null
  source "$STAMP_SCRIPT"
fi

is_espocrm_installed() {
  php -r '
    foreach (["/var/www/html/data/config.php"] as $file) {
      if (!file_exists($file)) {
        continue;
      }
      $config = include $file;
      if (is_array($config) && !empty($config["isInstalled"])) {
        echo "1";
        exit;
      }
    }
    echo "0";
  ' 2>/dev/null || echo "0"
}

run_auto_deploy_background() {
  if [ "${ESPO_RUN_AUTO_DEPLOY:-0}" != "1" ]; then
    return 0
  fi

  (
    if [ ! -f "$DEPLOY_SCRIPT" ]; then
      echo "Auto-deploy: no se encontró $DEPLOY_SCRIPT"
      exit 0
    fi

    if [ "$(is_espocrm_installed)" != "1" ]; then
      echo "Auto-deploy: EspoCRM aún no está instalado."
      exit 0
    fi

    if [ "${ESPO_FORCE_AUTO_DEPLOY:-0}" != "1" ] && command -v deploy_stamp_compute >/dev/null 2>&1; then
      new_stamp="$(deploy_stamp_compute)"
      current_stamp=""

      if [ -f "$STAMP_FILE" ]; then
        current_stamp="$(cat "$STAMP_FILE")"
      fi

      if [ -n "$new_stamp" ] && [ "$new_stamp" = "$current_stamp" ]; then
        echo "Auto-deploy: sin cambios (omitido). Huella=$current_stamp"
        if [ -f "$REPO_ROOT/.deploy-version" ]; then
          echo "Auto-deploy: imagen .deploy-version=$(cat "$REPO_ROOT/.deploy-version")"
        fi
        exit 0
      fi
    fi

    echo "==> Auto-deploy CRM Alcaldía (en segundo plano)... huella_nueva=$new_stamp huella_actual=${current_stamp:-ninguna}"
    if bash "$DEPLOY_SCRIPT"; then
      if command -v deploy_stamp_write >/dev/null 2>&1; then
        deploy_stamp_write "$STAMP_FILE"
      fi
      echo "==> Auto-deploy completado."
    else
      echo "AVISO: auto-deploy falló; el CRM sigue en línea con la versión anterior."
    fi
  ) &
}

run_auto_deploy_background

if [ "$#" -eq 0 ]; then
  set -- apache2-foreground
fi

exec docker-entrypoint.sh "$@"
