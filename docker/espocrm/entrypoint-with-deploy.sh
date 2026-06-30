#!/bin/bash
# Al arrancar el contenedor: aplica espocrm-custom si el código en la imagen cambió.
# Dokploy: push a main → Redeploy (rebuild imagen) → este script corre solo.
set -uo pipefail

REPO_ROOT="${REPO_ROOT:-/opt/bootstrap/repo}"
STAMP_FILE="/var/www/html/data/.custom-deploy-stamp"
DEPLOY_VERSION_FILE="/var/www/html/data/.deploy-version-applied"
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

read_image_deploy_version() {
  if [ -f "$REPO_ROOT/.deploy-version" ]; then
    tr -d '\r\n' < "$REPO_ROOT/.deploy-version"
    return 0
  fi

  echo "unknown"
}

deploy_version_changed() {
  local image_version applied_version

  image_version="$(read_image_deploy_version)"
  applied_version=""

  if [ -f "$DEPLOY_VERSION_FILE" ]; then
    applied_version="$(tr -d '\r\n' < "$DEPLOY_VERSION_FILE")"
  fi

  if [ "$image_version" != "$applied_version" ]; then
    echo "Auto-deploy: versión imagen=$image_version aplicada=${applied_version:-ninguna}"
    return 0
  fi

  return 1
}

write_deploy_version_applied() {
  mkdir -p "$(dirname "$DEPLOY_VERSION_FILE")"
  read_image_deploy_version > "$DEPLOY_VERSION_FILE"
  chown www-data:www-data "$DEPLOY_VERSION_FILE" 2>/dev/null || true
}

run_auto_deploy_if_needed() {
  # Por defecto activo (Dockerfile ENV). Desactivar solo con ESPO_RUN_AUTO_DEPLOY=0
  if [ "${ESPO_RUN_AUTO_DEPLOY:-1}" != "1" ]; then
    echo "Auto-deploy: desactivado (ESPO_RUN_AUTO_DEPLOY=0)."
    return 0
  fi

  if [ ! -f "$DEPLOY_SCRIPT" ]; then
    echo "Auto-deploy: no se encontró $DEPLOY_SCRIPT"
    return 0
  fi

  if [ "$(is_espocrm_installed)" != "1" ]; then
    echo "Auto-deploy: EspoCRM aún no está instalado (se aplicará con espocrm-init)."
    return 0
  fi

  local new_stamp="" current_stamp="" should_deploy=0

  if [ "${ESPO_FORCE_AUTO_DEPLOY:-0}" = "1" ]; then
    should_deploy=1
  elif deploy_version_changed; then
    should_deploy=1
  elif command -v deploy_stamp_compute >/dev/null 2>&1; then
    new_stamp="$(deploy_stamp_compute)"
    current_stamp=""

    if [ -f "$STAMP_FILE" ]; then
      current_stamp="$(tr -d '\r\n' < "$STAMP_FILE")"
    fi

    if [ -z "$new_stamp" ] || [ "$new_stamp" != "$current_stamp" ]; then
      should_deploy=1
      echo "Auto-deploy: huella nueva=$new_stamp actual=${current_stamp:-ninguna}"
    fi
  else
    should_deploy=1
  fi

  if [ "$should_deploy" != "1" ]; then
    echo "Auto-deploy: sin cambios (omitido). Huella=${current_stamp:-$(cat "$STAMP_FILE" 2>/dev/null || echo '?')}"
    if [ -f "$REPO_ROOT/.deploy-version" ]; then
      echo "Auto-deploy: imagen .deploy-version=$(read_image_deploy_version)"
    fi
    return 0
  fi

  echo "==> Auto-deploy CRM Alcaldía (sincronizando custom antes de servir tráfico)..."
  if bash "$DEPLOY_SCRIPT"; then
    if command -v deploy_stamp_write >/dev/null 2>&1; then
      deploy_stamp_write "$STAMP_FILE"
    fi
    write_deploy_version_applied
    echo "==> Auto-deploy completado."
  else
    echo "ERROR: auto-deploy falló — Apache arranca con la versión anterior del custom."
    echo "ERROR: revisa logs arriba; tras corregir, vuelve a desplegar en Dokploy."
  fi
}

run_auto_deploy_if_needed

ensure_admin_login() {
  if [ "$(is_espocrm_installed)" != "1" ]; then
    return 0
  fi

  local script="$REPO_ROOT/scripts/ensure-admin-login.php"

  if [ ! -f "$script" ]; then
    return 0
  fi

  echo "==> Verificando usuario admin (credenciales Dokploy)..."
  if [ -z "${ESPOCRM_ADMIN_PASSWORD:-}" ] && [ -r /var/www/html/data/.alcaldia-admin-credentials.json ]; then
    echo "Admin: usando credenciales guardadas en data/.alcaldia-admin-credentials.json"
  elif [ -z "${ESPOCRM_ADMIN_PASSWORD:-}" ]; then
    echo "AVISO: ESPOCRM_ADMIN_PASSWORD vacía — define la variable en Dokploy → Environment."
    return 0
  fi

  if [ ! -f "$REPO_ROOT/scripts/includes/admin-credentials.php" ]; then
    mkdir -p /tmp/includes
    cp "$REPO_ROOT/scripts/includes/admin-credentials.php" /tmp/includes/admin-credentials.php 2>/dev/null || true
  fi

  ESPOCRM_ADMIN_USERNAME="${ESPOCRM_ADMIN_USERNAME:-admin}" \
  ESPOCRM_ADMIN_PASSWORD="${ESPOCRM_ADMIN_PASSWORD:-}" \
  php "$script" || echo "AVISO: ensure-admin-login falló — revisa ESPOCRM_ADMIN_* en Dokploy."
}

ensure_admin_login

if [ "$#" -eq 0 ]; then
  set -- apache2-foreground
fi

exec docker-entrypoint.sh "$@"
