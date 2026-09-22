# Ajuste: migración de contenedores a EspoCRM 10.0.6

| Campo | Detalle |
|---|---|
| Fecha | 2026-08-25 |
| Estado | Validado localmente |
| Responsable | Equipo CRM Ambiental |
| Áreas o roles impactados | Todos los usuarios; operación y despliegue técnico |
| Versión de despliegue | EspoCRM 10.0.6 |

## Objetivo

Fijar EspoCRM **10.0.6** y adaptar la persistencia Docker a la distribución de volúmenes requerida por esa versión.

## Diseño y decisión técnica

EspoCRM 10 conserva como datos persistentes solamente `data/`, `custom/` y `client/custom/`. Montar todo `/var/www/html` impide la instalación automática y deja la aplicación sin desplegar. La imagen queda fijada en `espocrm/espocrm:10.0.6`, evitando actualizaciones no validadas en futuras reconstrucciones.

El WebSocket usa variables `ESPOCRM_CONFIG_*`, que EspoCRM 10 aplica a su configuración de ejecución.

## Archivos afectados

| Acción | Ruta | Propósito |
|---|---|---|
| Modificado | `docker/espocrm/Dockerfile` | Fija la imagen base en EspoCRM 10.0.6. |
| Modificado | `docker-compose.yml` | Separa volúmenes, actualiza healthchecks y WebSocket. |
| Modificado | `scripts/ensure-admin-login.php` | Permite la primera instalación antes de que el custom haya sido copiado. |
| Modificado | `scripts/includes/deploy-steps.sh` | Elimina el wipe automático; ahora exige confirmación explícita. |
| Modificado | `scripts/verify-meeting-save.php` | Evita reasignar el servicio de usuario, no permitido en EspoCRM 10. |
| Modificado | `docker/espocrm/entrypoint-with-deploy.sh` | Detecta la instalación con el comando oficial de EspoCRM 10. |
| Modificado | `scripts/verify-custom-deploy.sh` | Corrige comprobaciones que producían falsos fallos. |
| Modificado | `README.md` | Documenta la persistencia. |
| Modificado | `docs/GUIA-HANDOFF-PROYECTO.md` | Corrige stack y persistencia. |

## Riesgos y dependencias

- Antes de una migración con datos reales, respaldar base de datos y volúmenes.
- Conservar el volumen legado hasta validar la aplicación. Para migrar datos, copiar desde él `data/`, `custom/` y `client/custom/` hacia los nuevos volúmenes, siguiendo la documentación oficial de EspoCRM.
- Validar hooks, metadata, frontend y generación de documentos tras instalar y desplegar el custom.
- En una instalación nueva, el primer ajuste del admin no puede depender de clases del custom: estas se aplican en la verificación final del deploy.
- El borrado de datos de negocio es destructivo y solo puede ejecutarse con `ESPO_WIPE_BUSINESS_DATA=1`.
- El estado de instalación en EspoCRM 10 se consulta con `bin/command config:get isInstalled`; no con `data/state.php`.

## Validación

| Escenario probado | Resultado | Evidencia u observación |
|---|---|---|
| Composición Docker con los nuevos volúmenes | Correcto | `docker compose config --quiet` completó sin errores. |
| Instalación base EspoCRM 10 | Correcto | EspoCRM 10.0.6 instaló y `bin/command app-check` pasó. |
| Despliegue custom | Correcto | Auto-deploy finalizó y `verify-custom-deploy.sh` pasó completo. |
| Acceso web, daemon y WebSocket | Correcto | `espocrm`, PostgreSQL, daemon y WebSocket quedaron activos; web en `http://localhost:8080`. |

## Despliegue y reversión

Para un entorno local nuevo:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml down
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

En producción, hacer backup y migrar los tres directorios persistentes antes de cambiar los montajes. No usar `down --volumes` en un entorno con datos.

## Documentación relacionada

| Documento | Acción requerida | Estado |
|---|---|---|
| `README.md` | Actualizar persistencia | Actualizado |
| `docs/GUIA-HANDOFF-PROYECTO.md` | Actualizar stack y persistencia | Actualizado |
| Documentación oficial de instalación Docker de EspoCRM | Fuente de migración | Consultada |
