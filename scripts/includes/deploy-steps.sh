#!/usr/bin/env bash
# Manifiesto compartido entre deploy-custom.sh y deploy-custom-dokploy.sh.
# Formato de cada paso: "etiqueta visible|nombre-archivo.php"

DEPLOY_SETUP_STEPS=(
  "Credenciales admin (Dokploy → archivo local)|write-admin-credentials.php"
  "Usuario administrador (desde .env)|ensure-admin-login.php"
  "Roles operativos (Inspección, Radicación, Asignación, Patrullaje)|seed-alcaldia-roles.php"
  "Usuarios enrutamiento (Recibida por / Remitido a)|seed-gestion-routing-users.php"
  "Catálogos Excel Alcaldía (desplegables)|configure-excel-alcaldia-case-fields.php"
  "Placeholder en desplegables Case|configure-case-enum-placeholders.php"
  "Campos Case opcionales (sin obligatorios)|configure-case-all-optional.php"
  "Menú lateral (tabList global)|configure-global-tablist.php"
  "WebSocket (wss://dominio/ws)|configure-websocket.php"
  "Idioma, zona horaria Bogotá y hora 24 h|configure-default-locale.php"
  "Tokens de sesión (sin cierre por inactividad en cliente)|configure-session-security.php"
  "Calendario: reuniones, tareas y casos|configure-calendar-meetings-only.php"
  "Kanban de Casos (todos los usuarios)|configure-case-kanban.php"
  "Home: tablero custom (custom:views/home)|configure-user-dashboards.php"
  "Acceso completo — menú y permisos amplios|configure-full-access-all-roles.php"
  "Rol Inspección — permisos y campos|roles/configure-role-inspeccion.php"
  "Rol Radicación — solo radicado/expediente|roles/configure-role-radicacion.php"
  "Rol Asignación — solo panel Asignación|roles/configure-role-asignacion.php"
  "Rol Patrullaje — acta de visita y casos asignados|roles/configure-role-patrullaje.php"
  "Contraseñas usuarios operativos (inspeccion, radicacion, etc.)|fix-operational-login.php"
  "Permisos Radicación (campos radicado/expediente)|fix-radicacion-access.php"
  "Permisos ComunicacionCaso (todos los roles)|configure-comunicacion-caso-permissions.php"
  "Permisos Task — crear tareas (todos los roles)|configure-task-permissions.php"
  "Permisos Meeting — solo propias (todos los roles)|configure-meeting-permissions.php"
  "Verificar creación de reuniones|verify-meeting-save.php"
  "Documentos: plantillas oficiales (solicitud, acta, actuo)|configure-document-plantillas.php"
  "Documentos: Excel oficial (excelAlcaldia.xlsx)|configure-excel-alcaldia-document.php"
)

DEPLOY_LEGACY_MIGRATION_SCRIPTS=(
  migrate-drop-case-categoria-tipo.php
  migrate-case-documento-fields.php
  migrate-case-canonical-fields.php
  migrate-case-peticionario-db-columns.php
  migrate-case-party-field-names.php
  migrate-visita-historial.php
)

DEPLOY_POST_LEGACY_STEPS=(
  "Job alertas de vencimiento (campana)|configure-case-vencimiento-alerts.php"
  "Vínculos caso ↔ tercero (peticionario / infractor)|sync-case-party-links.php"
  "Historial de visitas (tabla + backfill)|ensure-visita-historial.php"
)

deploy_run_steps_docker() {
  local root="$1"
  shift
  local entry label script

  for entry in "$@"; do
    label="${entry%%|*}"
    script="${entry#*|}"
    echo "${label}..."
    docker cp "${root}/scripts/${script}" "espocrm:/tmp/${script}"
    docker exec espocrm php "/tmp/${script}"
  done
}

deploy_run_legacy_migrations_docker() {
  local root="$1"
  shift
  local script

  echo 'Eliminando columnas obsoletas / migraciones legacy (si aplica)...'
  docker cp "${root}/scripts/needs-legacy-db-migrations.php" espocrm:/tmp/needs-legacy-db-migrations.php

  if docker exec espocrm php /tmp/needs-legacy-db-migrations.php; then
    for script in "$@"; do
      docker cp "${root}/scripts/${script}" "espocrm:/tmp/${script}"
      docker exec espocrm php "/tmp/${script}"
    done
  else
    echo 'BD nueva — migraciones legacy omitidas.'
  fi
}

# Vacía datos de negocio una sola vez por servidor (inicio desde cero).
# Forzar de nuevo: ESPO_WIPE_BUSINESS_DATA=1
deploy_maybe_wipe_business_data() {
  local app_root="$1"
  local scripts_source="$2"
  local php_bin="${3:-php}"
  local wipe_stamp="$app_root/data/.alcaldia-full-reset-v2"
  local force_wipe="${ESPO_WIPE_BUSINESS_DATA:-0}"
  local wipe_script="$scripts_source/wipe-business-data.php"
  local seed_script="$scripts_source/ensure-admin-login.php"

  if [ ! -f "$wipe_script" ]; then
    echo "AVISO: wipe-business-data.php no encontrado — omitiendo wipe."
    return 0
  fi

  if [ "$force_wipe" = "1" ] || [ ! -f "$wipe_stamp" ]; then
    echo "Reset total (usuarios, roles, datos)..."
    "$php_bin" "$wipe_script"
    mkdir -p "$app_root/data"
    touch "$wipe_stamp"
    echo "Wipe completado."

    if [ -f "$seed_script" ]; then
      echo "Recreando usuario admin..."
      "$php_bin" "$seed_script" || exit 1
    fi
  else
    echo "Wipe omitido (ya ejecutado). Forzar: ESPO_WIPE_BUSINESS_DATA=1"
  fi
}

deploy_maybe_wipe_business_data_docker() {
  local root="$1"
  local force_wipe="${ESPO_WIPE_BUSINESS_DATA:-0}"

  docker cp "${root}/scripts/wipe-business-data.php" espocrm:/tmp/wipe-business-data.php
  docker cp "${root}/scripts/ensure-admin-login.php" espocrm:/tmp/ensure-admin-login.php
  docker exec espocrm mkdir -p /tmp/includes
  docker cp "${root}/scripts/includes/admin-credentials.php" espocrm:/tmp/includes/admin-credentials.php

  docker exec -e "ESPO_WIPE_BUSINESS_DATA=${force_wipe}" \
    -e "ESPOCRM_ADMIN_USERNAME=${ESPOCRM_ADMIN_USERNAME:-}" \
    -e "ESPOCRM_ADMIN_PASSWORD=${ESPOCRM_ADMIN_PASSWORD:-}" \
    espocrm bash -c '
    APP_ROOT=/var/www/html
    STAMP="$APP_ROOT/data/.alcaldia-full-reset-v2"
    FORCE="${ESPO_WIPE_BUSINESS_DATA:-0}"

    if [ "$FORCE" = "1" ] || [ ! -f "$STAMP" ]; then
      echo "Reset total (usuarios, roles, datos)..."
      php /tmp/wipe-business-data.php
      mkdir -p "$APP_ROOT/data"
      touch "$STAMP"
      echo "Wipe completado."
      if [ -f /tmp/ensure-admin-login.php ]; then
        echo "Recreando usuario admin..."
        php /tmp/ensure-admin-login.php || exit 1
      fi
    else
      echo "Wipe omitido (ya ejecutado). Forzar: ESPO_WIPE_BUSINESS_DATA=1"
    fi
  '
}
