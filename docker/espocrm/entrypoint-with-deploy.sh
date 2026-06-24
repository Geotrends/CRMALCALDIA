#!/bin/bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-/opt/bootstrap/repo}"
STAMP_FILE="/var/www/html/data/.custom-deploy-stamp"
DEPLOY_SCRIPT="$REPO_ROOT/scripts/deploy-custom-dokploy.sh"

# shellcheck source=../../scripts/includes/deploy-stamp.sh
source "$REPO_ROOT/scripts/includes/deploy-stamp.sh"

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
  '
}

run_auto_deploy() {
  if [ "${ESPO_RUN_AUTO_DEPLOY:-0}" != "1" ]; then
    return 0
  fi

  if [ ! -f "$DEPLOY_SCRIPT" ]; then
    echo "Auto-deploy: no se encontró $DEPLOY_SCRIPT"
    return 0
  fi

  if [ "$(is_espocrm_installed)" != "1" ]; then
    echo "Auto-deploy: EspoCRM aún no está instalado."
    return 0
  fi

  if [ "${ESPO_FORCE_AUTO_DEPLOY:-0}" != "1" ]; then
    local new_stamp current_stamp
    new_stamp="$(deploy_stamp_compute)"
    current_stamp=""

    if [ -f "$STAMP_FILE" ]; then
      current_stamp="$(cat "$STAMP_FILE")"
    fi

    if [ -n "$new_stamp" ] && [ "$new_stamp" = "$current_stamp" ]; then
      echo "Auto-deploy: sin cambios en custom/scripts (omitido)."
      return 0
    fi
  fi

  echo "==> Auto-deploy CRM Alcaldía..."
  bash "$DEPLOY_SCRIPT"
  deploy_stamp_write "$STAMP_FILE"
  echo "==> Auto-deploy completado."
}

run_auto_deploy

exec docker-entrypoint.sh "$@"
