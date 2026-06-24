# Scripts operativos

Scripts que usa el CRM en despliegue y operación diaria.

## Despliegue (usar siempre estos)

| Script | Uso |
|--------|-----|
| `deploy-custom.sh` | Despliegue manual opcional (local); el auto-deploy al arrancar `espocrm` ya aplica todo |
| `deploy-custom-dokploy.sh` | Despliegue en Dokploy |
| `includes/deploy-steps.sh` | Manifiesto compartido de pasos post-rebuild |
| `includes/deploy-rebuild.php` | Rebuild condicional (batch Dokploy) |

## Configuración (`configure-*.php`)

Se ejecutan automáticamente en cada deploy, en este orden (ver `includes/deploy-steps.sh`):

| Dominio | Scripts |
|---------|---------|
| Roles y menú | `seed-roles.php`, `sync-user-teams-from-roles.php`, `configure-global-tablist.php`, `configure-default-locale.php`, `configure-full-access-all-roles.php` |
| Casos y Excel | `configure-excel-alcaldia-case-fields.php`, `configure-case-enum-placeholders.php`, `configure-radicacion-field-level.php`, `configure-case-party-field-access.php`, `configure-case-create-defaults.php`, `configure-case-vencimiento-alerts.php` |
| Permisos por rol | `configure-case-assignment-permissions.php`, `configure-acta-visita-entity.php`, `configure-actuo-archivo-entity.php`, `configure-asignacion-historial.php`, `configure-comunicacion-caso-entity.php` |
| UI | `configure-user-dashboards.php`, `configure-case-kanban.php`, `configure-calendar-meetings-only.php`, `configure-document-plantillas.php` |
| Sincronización | `sync-case-party-links.php` |

## Migraciones legacy (`migrate-*.php`)

Solo corren si `needs-legacy-db-migrations.php` detecta columnas antiguas en la BD.

## Utilidades puntuales

| Script | Uso |
|--------|-----|
| `audit-users-roles.php` | Lista usuarios y roles (post-deploy) |
| `set-user-password.php` | Cambiar contraseña de un usuario |
| `configure-case-vencimiento-alerts.php` | Activa job de alertas; probar con `php command.php run-job CheckCaseVencimientoAlerts` |
| `backup-for-migration.sh` | Crear respaldo BD + archivos |
| `restore-from-migration.sh` | Restaurar respaldo |
| `load-schema-dokploy.sh` | Cargar esquema en Dokploy |
| `purge-crm-data.php` / `.sh` | Vaciar datos de prueba (destructivo) |
| `purge-crm-cases.php` | Vaciar solo casos (destructivo) |
| `fix-custom-permissions.sh` | Permisos de archivos en contenedor |
| `setup-mac.sh` | Arranque Mac: Docker + restore dump + deploy |

## Convención de nombres

| Prefijo | Significado |
|---------|-------------|
| `configure-*` | Configuración idempotente (roles, permisos, metadata) |
| `migrate-*` | Cambio de esquema/datos en BD heredada |
| `sync-*` | Sincroniza datos entre entidades |
| `deploy-*` | Orquestación de despliegue |
| `purge-*` | Limpieza destructiva |
