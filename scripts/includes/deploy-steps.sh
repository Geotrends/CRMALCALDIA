#!/usr/bin/env bash
# Manifiesto compartido entre deploy-custom.sh y deploy-custom-dokploy.sh.
# Formato de cada paso: "etiqueta visible|nombre-archivo.php"
# No cambiar el orden sin revisar dependencias entre scripts configure-*.

DEPLOY_SETUP_STEPS=(
  "Usuario administrador (desde .env)|seed-admin-user.php"
  "Roles y equipos base (despliegue desde cero)|seed-roles.php"
  "Sincronizar equipos homónimos (utilidad Espo; perfiles por rol en alcaldiaProfile)|sync-user-teams-from-roles.php"
  "Catálogos Excel Alcaldía (desplegables)|configure-excel-alcaldia-case-fields.php"
  "Placeholder en desplegables Case|configure-case-enum-placeholders.php"
  "Menú lateral (tabList global)|configure-global-tablist.php"
  "WebSocket (wss://dominio/ws)|configure-websocket.php"
  "Idioma, zona horaria Bogotá y hora 24 h|configure-default-locale.php"
  "Calendario: reuniones, tareas y casos|configure-calendar-meetings-only.php"
  "Kanban de Casos (todos los usuarios)|configure-case-kanban.php"
  "Home: tablero custom + dashlets editables|configure-user-dashboards.php"
  "Acceso completo — menú y permisos para todos los roles|configure-full-access-all-roles.php"
  "Permisos de asignación (crear caso sin patrullero)|configure-case-assignment-permissions.php"
  "Permisos ActaVisita por rol (Inspección edita acta)|configure-acta-visita-entity.php"
  "Permisos ActuoArchivo por rol|configure-actuo-archivo-entity.php"
  "Documentos: plantillas oficiales (solicitud, acta, actuo)|configure-document-plantillas.php"
  "Documentos: Excel oficial (excelAlcaldia.xlsx)|configure-excel-alcaldia-document.php"
)

DEPLOY_LEGACY_MIGRATION_SCRIPTS=(
  migrate-drop-case-categoria-tipo.php
  migrate-case-documento-fields.php
  migrate-case-canonical-fields.php
  migrate-case-peticionario-db-columns.php
  migrate-case-party-field-names.php
)

DEPLOY_POST_LEGACY_STEPS=(
  "Permisos campos peticionario y perjudicante|configure-case-party-field-access.php"
  "Permisos de campo (radicado, registro Excel, fecha vencimiento)|configure-radicacion-field-level.php"
  "Job alertas de vencimiento (campana)|configure-case-vencimiento-alerts.php"
  "Historial de asignaciones (permisos por rol)|configure-asignacion-historial.php"
  "Comunicaciones por caso (permisos por rol)|configure-comunicacion-caso-entity.php"
  "Defaults Recibida por / Remitido a (por rol)|configure-case-create-defaults.php"
  "Vínculos caso ↔ tercero (peticionario / infractor)|sync-case-party-links.php"
  "Modo sin roles: permisos amplios automáticos|configure-alcaldia-no-roles-mode.php"
  "Auditoría usuarios y roles|audit-users-roles.php"
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
  else
    echo "Wipe omitido (ya ejecutado). Forzar: ESPO_WIPE_BUSINESS_DATA=1"
  fi
}

deploy_maybe_wipe_business_data_docker() {
  local root="$1"
  local force_wipe="${ESPO_WIPE_BUSINESS_DATA:-0}"

  docker cp "${root}/scripts/wipe-business-data.php" espocrm:/tmp/wipe-business-data.php

  docker exec -e "ESPO_WIPE_BUSINESS_DATA=${force_wipe}" espocrm bash -c '
    APP_ROOT=/var/www/html
    STAMP="$APP_ROOT/data/.alcaldia-full-reset-v2"
    FORCE="${ESPO_WIPE_BUSINESS_DATA:-0}"

    if [ "$FORCE" = "1" ] || [ ! -f "$STAMP" ]; then
      echo "Reset total (usuarios, roles, datos)..."
      php /tmp/wipe-business-data.php
      mkdir -p "$APP_ROOT/data"
      touch "$STAMP"
      echo "Wipe completado."
    else
      echo "Wipe omitido (ya ejecutado). Forzar: ESPO_WIPE_BUSINESS_DATA=1"
    fi
  '
}
