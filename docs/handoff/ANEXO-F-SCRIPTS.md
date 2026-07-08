# Anexo F — Scripts de deploy, roles y utilidades


**Total: 58 scripts** bajo `scripts/`.


| Ruta | Tipo |
|------|------|
| `configure-alcaldia-no-roles-mode.php` | php |
| `configure-calendar-meetings-only.php` | php |
| `configure-case-all-optional.php` | php |
| `configure-case-enum-placeholders.php` | php |
| `configure-case-kanban.php` | php |
| `configure-case-vencimiento-alerts.php` | php |
| `configure-comunicacion-caso-permissions.php` | php |
| `configure-default-locale.php` | php |
| `configure-document-plantillas.php` | php |
| `configure-excel-alcaldia-case-fields.php` | php |
| `configure-excel-alcaldia-document.php` | php |
| `configure-full-access-all-roles.php` | php |
| `configure-global-tablist.php` | php |
| `configure-meeting-permissions.php` | php |
| `configure-session-security.php` | php |
| `configure-task-permissions.php` | php |
| `configure-user-dashboards.php` | php |
| `configure-websocket.php` | php |
| `deploy-custom-dokploy.sh` | sh |
| `deploy-custom.sh` | sh |
| `diagnose-visita-aprobada.php` | php |
| `ensure-admin-login.php` | php |
| `fix-cfecha-caso-timezone.php` | php |
| `fix-notification-reference-labels.php` | php |
| `fix-user-save-emergency.sh` | sh |
| `force-deploy-now.sh` | sh |
| `format-nits-in-database.php` | php |
| `includes/admin-credentials.php` | php |
| `includes/alcaldia-comunicacion-caso-permissions.php` | php |
| `includes/alcaldia-deploy-roles.php` | php |
| `includes/alcaldia-meeting-permissions.php` | php |
| `includes/alcaldia-task-permissions.php` | php |
| `includes/deploy-rebuild.php` | php |
| `includes/deploy-stamp.sh` | sh |
| `includes/deploy-steps.sh` | sh |
| `includes/purge-obsolete-custom.sh` | sh |
| `includes/wait-for-espocrm.sh` | sh |
| `migrate-case-canonical-fields.php` | php |
| `migrate-case-documento-fields.php` | php |
| `migrate-case-party-field-names.php` | php |
| `migrate-case-peticionario-db-columns.php` | php |
| `migrate-drop-case-categoria-tipo.php` | php |
| `needs-legacy-db-migrations.php` | php |
| `repair-case-en-proceso-from-acta.php` | php |
| `repair-case-en-proceso-to-visita-realizada.php` | php |
| `reset-operational-data.php` | php |
| `roles/configure-role-asignacion.php` | php |
| `roles/configure-role-inspeccion.php` | php |
| `roles/configure-role-patrullaje.php` | php |
| `roles/configure-role-radicacion.php` | php |
| `seed-alcaldia-roles.php` | php |
| `seed-gestion-routing-users.php` | php |
| `set-user-password.php` | php |
| `sync-case-party-links.php` | php |
| `verify-custom-deploy.sh` | sh |
| `verify-meeting-save.php` | php |
| `wipe-business-data.php` | php |
| `write-admin-credentials.php` | php |

### Deploy (resumen)

- `deploy-custom.sh` — local
- `deploy-custom-dokploy.sh` — producción (contenedor)
- `force-deploy-now.sh` — forzar
- `verify-custom-deploy.sh` — verificación
- `includes/deploy-steps.sh` — manifiesto de pasos

### Roles

- `seed-alcaldia-roles.php`
- `roles/configure-role-inspeccion.php`
- `roles/configure-role-radicacion.php`
- `roles/configure-role-asignacion.php`
- `roles/configure-role-patrullaje.php`

### Reset datos

```bash
ESPO_CONFIRM_RESET=1 php /opt/bootstrap/repo/scripts/reset-operational-data.php  # en contenedor espocrm
```

---

*Guía: [`../GUIA-HANDOFF-PROYECTO.md`](../GUIA-HANDOFF-PROYECTO.md).*
