# Ajuste: Entidad Expediente + Auto de Inicio + rol Jurídica

| Campo | Detalle |
|---|---|
| Fecha | 2026-08-25 |
| Estado | En desarrollo (Fase 1 de 9 completada y validada localmente) |
| Responsable | Sesión asistida (Claude Code) + gerencia@geotrends.co |
| Áreas o roles impactados | Inspección, Radicación, Jurídica (rol nuevo), Case, ActaVisita, ActuoArchivo |
| Versión de despliegue | `entidades-expediente-autoinicio-rol-juridica-2026-08-25` |

## Objetivo

Separar en el modelo de datos del CRM dos series documentales que hoy se mezclan en un único campo (`Case.cExpediente`, generado automáticamente al radicar):

- **Derechos de Petición** (TRD `109.01.01.21`): un radicado que se resuelve administrativamente sin escalar a proceso jurídico. Retención 2+8 años, disposición final **selección** (se elimina la mayoría salvo muestreo).
- **Procesos Policivos de Afectación Ambiental** (TRD `109.01.01.40.44`): un radicado que escala mediante un **Auto de Inicio (IV-F-364)**. Retención 2+8 años, disposición final **Conservación Total** (nunca se elimina).

Además, permitir que **varios radicados** (varias quejas sobre el mismo hecho/infractor) se consoliden bajo **un solo expediente** cuando este se abre — algo que hoy no es posible (relación 1:1 forzada entre `Case` y `cExpediente`).

Contexto completo del análisis normativo (TRD, procedimientos IV-P-004/IV-P-028/IV-P-021) en [`docs/Referencias/INTERPRETACION-Y-USO-EN-CRM.md`](../Referencias/INTERPRETACION-Y-USO-EN-CRM.md).

## Alcance funcional

Esta primera fase (de 9 planeadas) es **puramente de modelo de datos**, sin lógica de negocio ni cambios de comportamiento visibles para los usuarios actuales:

- Entidades nuevas `Expediente` y `AutoInicio`, funcionales de forma aislada (se pueden crear/editar/listar desde su propia pantalla).
- `Expediente` genera automáticamente su número (`AAAA-N`) al crearse, con consecutivo propio por año — no depende de `Case.cExpediente`.
- `AutoInicio` (calco de la entidad ya existente `ActuoArchivo`) copia `numeroRadicado` desde el `Case` vinculado al crearse.
- Enlaces nuevos en `Case`: `expediente` (belongsTo Expediente, de solo lectura para el usuario) y `autosInicio` (hasMany AutoInicio).
- Rol nuevo **Jurídica**: puede crear/editar `AutoInicio` y `Expediente`; solo lectura sobre `Case` (no edita el caso operativo, eso sigue siendo de Inspección/Radicación).

**Explícitamente fuera de esta fase** (pendiente, fases 2-9 del plan):
- El campo `Case.cExpediente` **sigue funcionando exactamente igual que antes** (se sigue autogenerando al radicar). Aún no se ha diferido su generación al Auto de Inicio — eso es la Fase 5 del plan (el cambio de mayor riesgo, aislado deliberadamente).
- No existe todavía el flujo de UI (panel/botón en el `Case`, modal) para crear un Auto de Inicio desde un caso.
- No existe todavía la sincronización automática `Expediente.numero → Case.cExpediente` ni la vinculación de varios radicados a un mismo expediente.
- No existe todavía la generación del PDF/Word del Auto de Inicio (falta la plantilla oficial IV-F-364; `ActuoArchivo.docx` existe en `formatos/`, no hay equivalente para Auto de Inicio).

## Diseño y decisión técnica

Ver el diseño completo, alternativas evaluadas y las 9 fases planeadas en el plan de implementación de esta sesión (no versionado en el repo, referenciado aquí para trazabilidad): `Expediente + Auto de Inicio: separar "radicado" de "proceso policivo"`.

Decisión clave para minimizar riesgo: **`Case.cExpediente` no se elimina ni se renombra**. Hay ~40 puntos de código (generadores de PDF/Word, exportadores a Excel institucional y Reporte Gerencial, ~10 archivos JS de frontend incluyendo 2 dashboards, scripts de ACL de roles) que ya lo leen como string simple. El expediente estructurado (entidad `Expediente`) se sincronizará hacia ese campo string en una fase posterior, sin tocar esos ~40 puntos.

`AutoInicio` y `Expediente` siguen el mismo patrón arquitectónico que `ActuoArchivo` ya usa en el proyecto: `entityClassName` → clase PHP vacía en `Entities/`, controller vacío que extiende `Espo\Core\Controllers\Record`, lógica de "rellenar al crear" vía `RecordHook` (`beforeCreateHookClassNameList` en `recordDefs/`), sin `aclDefs` propios (el ACL se maneja vía `scopes/*.json` estándar).

## Archivos afectados

| Acción | Ruta | Propósito |
|---|---|---|
| Creado | `espocrm-custom/Resources/metadata/entityDefs/Expediente.json` | Modelo de datos de Expediente |
| Creado | `espocrm-custom/Resources/metadata/{clientDefs,scopes,recordDefs}/Expediente.json` | Configuración de cliente, ACL/scope y hook de creación |
| Creado | `espocrm-custom/Resources/layouts/Expediente/{detail,edit,list,listSmall,filters}.json` | Pantallas de Expediente |
| Creado | `espocrm-custom/Entities/Expediente.php`, `Controllers/Expediente.php` | Clases PHP base |
| Creado | `espocrm-custom/Resources/i18n/{es_ES,en_US}/Expediente.json` | Traducciones |
| Creado | `espocrm-custom/Tools/Expediente/ExpedienteConsecutivoService.php` | Cálculo del siguiente consecutivo por año |
| Creado | `espocrm-custom/Classes/RecordHooks/Expediente/EarlyBeforeCreate.php` | Genera `numero`/`anio`/`consecutivo` al crear |
| Creado | `espocrm-custom/Resources/metadata/entityDefs/AutoInicio.json` | Modelo de datos de AutoInicio (calco de ActuoArchivo) |
| Creado | `espocrm-custom/Resources/metadata/{clientDefs,scopes,recordDefs}/AutoInicio.json` | Configuración de cliente, ACL/scope y hook de creación |
| Creado | `espocrm-custom/Resources/layouts/AutoInicio/{detail,edit,list,listSmall,filters}.json` | Pantallas de AutoInicio |
| Creado | `espocrm-custom/Entities/AutoInicio.php`, `Controllers/AutoInicio.php` | Clases PHP base |
| Creado | `espocrm-custom/Resources/i18n/{es_ES,en_US}/AutoInicio.json` | Traducciones |
| Creado | `espocrm-custom/Classes/RecordHooks/AutoInicio/EarlyBeforeCreate.php` | Copia `numeroRadicado` desde el Case al crear |
| Creado | `scripts/roles/configure-role-juridica.php` | Permisos del rol Jurídica |
| Modificado | `espocrm-custom/Resources/metadata/entityDefs/Case.json` | Enlaces `expediente` (belongsTo), `autosInicio` (hasMany) |
| Modificado | `espocrm-custom/Resources/i18n/es_ES/Case.json` | Etiquetas de los enlaces nuevos |
| Modificado | `espocrm-custom/Tools/User/AlcaldiaUserProfile.php` | Rol `Jurídica`: `isJuridica()`, `canManageAutoInicio()` |
| Modificado | `scripts/seed-alcaldia-roles.php` | Crea el rol `Jurídica` (5 roles en total) |
| Modificado | `scripts/configure-full-access-all-roles.php` | Incluye `Expediente`/`AutoInicio` en el acceso base; `Jurídica` en roles con Case restringido |
| Modificado | `scripts/includes/deploy-steps.sh` | Agrega el paso `roles/configure-role-juridica.php` al manifiesto de deploy |
| Modificado | `.deploy-version` | Nueva huella para forzar auto-deploy en el próximo build de imagen (Dokploy) |
| Modificado | `scripts/fix-operational-login.php` | Crea el usuario operativo `juridica` (rol Jurídica) para pruebas manuales |
| Modificado | `scripts/verify-custom-deploy.sh` | 4 comprobaciones nuevas (Expediente, AutoInicio, enlace en Case, rol en perfil de usuario) |

## Riesgos y dependencias

- **Sin impacto en el flujo operativo actual**: no se tocó `AutoGenerateRadicadoOnSave`, `CaseRadicadoHelper::isRadicadoCompleto()` ni ningún hook existente sobre `Case`. El campo `cExpediente` se sigue generando exactamente igual que antes.
- **Orden de hooks no alterado**: los hooks nuevos (`Expediente/EarlyBeforeCreate`, `AutoInicio/EarlyBeforeCreate`) son `RecordHook` de creación sobre entidades nuevas, no interfieren con la cadena de `BeforeSave` de `Case`.
- **Falta la plantilla oficial del Auto de Inicio (IV-F-364)**: `AutoInicio.cFormatoAutoInicioPdf` existe como campo pero no hay generador de PDF/Word conectado (a diferencia de `ActuoArchivo`, que sí tiene `ActuoArchivo.docx` en `formatos/`). Se necesita ese documento oficial de la Alcaldía antes de implementar esa parte.
- **Dato importante para las siguientes fases**: `RecordHook` (`beforeCreateHookClassNameList`) solo se ejecuta a través de `Espo\Core\Record\Service::create()` (capa API/RecordService), **no** con `EntityManager::saveEntity()` directo. Cualquier script de backfill o prueba futura debe usar el `ServiceContainer`, no el `EntityManager` a secas, o el hook no correrá (se confirmó este comportamiento durante la validación de esta fase).
- **Rol Jurídica sin dashboard propio todavía**: `resolveHomeProfile()` no incluye un caso para `isJuridica`, por lo que un usuario Jurídica cae en el perfil `gestion` por defecto. No es un error, es una decisión pendiente de UX para una fase posterior.
- **ACL de Expediente/AutoInicio aún no está restringida para los demás roles**: `scripts/configure-full-access-all-roles.php` da acceso completo (crear/editar/borrar) a `Expediente` y `AutoInicio` como línea base para *todos* los roles, y solo `configure-role-juridica.php` los deja explícitamente en manos de Jurídica. Los scripts `configure-role-inspeccion.php`, `configure-role-radicacion.php`, etc. no fueron tocados para restringirlos. Es decir, hoy Inspección/Radicación/Asignación/Patrullaje **también** pueden crear/editar Expediente y AutoInicio desde la URL directa, aunque no tengan un botón para hacerlo en la interfaz. No es un problema de datos (nadie lo usará sin saber que existe la URL), pero debe cerrarse antes de considerar esta funcionalidad lista para producción — pendiente para cuando se ajusten los demás scripts de rol.

## Validación

| Escenario probado | Resultado | Evidencia u observación |
|---|---|---|
| Sintaxis JSON de los 23 archivos de metadata/layouts/i18n nuevos | Correcto | Validado con `python3 -m json.tool` sobre cada archivo |
| Sintaxis PHP de las 11 clases/scripts nuevos o modificados | Correcto | `php -l` dentro del contenedor `crmalcaldia-espocrm-1` |
| Deploy real (`scripts/deploy-custom-dokploy.sh`) dentro del contenedor de desarrollo | Correcto | Copió custom, corrió `rebuild` + `clear-cache` dos veces, ejecutó los 24 pasos del manifiesto (incluyendo el nuevo `configure-role-juridica.php`), y las ~60 verificaciones de `verify-custom-deploy.sh` (features previas) siguieron en OK |
| Creación de tablas `expediente` y `auto_inicio` en PostgreSQL, columna `expediente_id` en `case` | Correcto | Verificado con `psql \d` sobre las 3 tablas |
| Rol `Jurídica` creado en BD | Correcto | `select name from role;` devuelve las 5 filas esperadas |
| Generación de número de expediente vía `ExpedienteService::create()` (capa RecordService, no ORM directo) | Correcto | Expediente 1 → `2026-1`, Expediente 2 → `2026-2` (consecutivo por año incrementa bien) |
| Creación de `AutoInicio` vinculado a un `Case` real existente | Correcto | Copia `numeroRadicado` y arma el `name`; `expedienteId` queda `NULL` como se espera (la sincronización es Fase 6, aún no implementada) |
| Registros de prueba eliminados tras la validación | Correcto | Sin datos residuales en `expediente`/`auto_inicio` |

## Despliegue y reversión

Desplegado ejecutando el script real de producción directamente dentro del contenedor de desarrollo (el repo está montado en `/opt/bootstrap/repo` vía `docker-compose.dev.yml`):

```bash
docker exec crmalcaldia-espocrm-1 bash /opt/bootstrap/repo/scripts/deploy-custom-dokploy.sh
```

`.deploy-version` se actualizó a `entidades-expediente-autoinicio-rol-juridica-2026-08-25` para que el próximo build de imagen en Dokploy dispare el auto-deploy (en local no depende de ese archivo porque no está montado por bind mount; se ejecutó el script manualmente).

**Reversión**: el cambio es aditivo (entidades y columnas nuevas, ningún comportamiento existente modificado). Revertir el commit y volver a desplegar es seguro; las tablas `expediente`/`auto_inicio` y la columna `case.expediente_id` quedarían huérfanas pero vacías/sin uso, sin afectar datos existentes de `Case`.

## Documentación relacionada

| Documento | Acción requerida | Estado |
|---|---|---|
| [`docs/Referencias/INTERPRETACION-Y-USO-EN-CRM.md`](../Referencias/INTERPRETACION-Y-USO-EN-CRM.md) | Actualizar sección "Puntos abiertos" para reflejar las decisiones ya tomadas | Actualizado en este mismo cambio |
| `docs/ajustes/README.md` | Agregar fila al índice de ajustes | Actualizado en este mismo cambio |
| `docs/handoff/ANEXO-C-CAMPOS-CASE.md` | Agregar los campos `expediente`/`autosInicio` al inventario de campos de Case | Pendiente (se hará al cerrar el conjunto de fases, para no documentar un modelo aún incompleto) |
