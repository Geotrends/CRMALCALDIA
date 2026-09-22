# Ajuste: Fase 1 — Entidades GestionTecnica/DecisionRutaJuridica y separación de estados de Case

| Campo | Detalle |
|---|---|
| Fecha | 2026-09-22 |
| Estado | Validado localmente |
| Responsable | Claude Code (sesión con Jonathan Ochoa) |
| Áreas o roles impactados | Patrullaje, Inspección, Asignación (flujo de visitas y decisión de ruta) |
| Versión de despliegue | local (Docker, no desplegado a Dokploy) |

## Objetivo

Iniciar la implementación del modelo funcional objetivo descrito en el repo `InspeccionAmbiental-Workflow` (`90_MODELO_CRM/`), de forma incremental sobre el CRM ya operativo. Se decidió (con el usuario) empezar por separar los estados que hoy están mezclados en un único campo `Case.status`, distinguiendo el seguimiento del ciudadano/petición (Case) de la coordinación técnica de campo (GestionTecnica) y de la decisión jurídica formal (DecisionRutaJuridica).

## Alcance funcional

- Nuevas entidades `GestionTecnica` y `DecisionRutaJuridica`, con estado propio y trazabilidad (decisor, fundamento normativo, motivación) que hoy no existía.
- `Case.status` pasa de 10 a 8 valores: se colapsan `En proceso`, `Visita realizada` y `En proceso de otra visita` en un único `En gestión técnica` (el detalle de esa etapa pasa a vivir en `GestionTecnica.estado` y en `ActaVisita.estado`).
- El kanban del caso muestra menos columnas en el tramo de gestión técnica (simplificación intencional, aceptada explícitamente por el usuario).
- Se preserva la distinción operativa entre "Finalizado" (gestión sustantiva lista, pendiente archivo formal) y "Proceso cerrado" (cierre formal) — confirmado con el usuario, no se colapsan.

## Diseño y decisión técnica

- `GestionTecnica`: `case` (belongsTo), `estado` (enum), `motivo`, `fechaSolicitud`, `responsable`, `observaciones`. Relación `Case 1:N GestionTecnica` (se descartó la relación N:M `GestionTecnicaCase` del modelo objetivo para no sobreconstruir sin un caso de uso real de "una visita, varias quejas").
- `DecisionRutaJuridica`: `case` (belongsTo), `decisor` (obligatorio), `resultado` (enum con las 8 rutas del modelo: sin mérito, nueva gestión técnica, remisión, ruta policiva, Recursos Naturales, Tenencia Animal, Maltrato Animal, Ambiental Preventiva), `fundamentoNormativo`, `motivacion` (obligatoria), `expediente` (opcional). Reemplaza funcionalmente al campo `cDecisionTramite`, que queda sin trazabilidad de quién decidió ni con qué fundamento.
- `ActaVisita` gana un link opcional `gestionTecnica` (belongsTo), sin tocar sus campos/hooks/generación de PDF existentes.
- El hook `SetEnProcesoOnActaVisita` ahora crea/actualiza la `GestionTecnica` del caso al diligenciar un acta, en vez de solo escribir el status del Case.
- **Hallazgo corregido durante el trabajo**: al migrar el frontend y el backend en paralelo (dos agentes), el frontend (`acta-visita-case-status.js`) perdió la capacidad de distinguir "esperando otra visita" porque esa señal dependía de los 3 valores de status que se colapsaron. Se cerró la brecha agregando el endpoint `GET Case/action/enProcesoOtraVisita` (expone `CaseActaVisitaHelper::isCaseEnProcesoOtraVisita`, que sí consulta `GestionTecnica`) y conectándolo en el frontend.
- **Bloqueo encontrado y resuelto**: las 4 entidades nuevas devolvían 404 en la API pese a tener tablas y metadata correctas. Causa: en este proyecto toda entidad custom requiere su propia clase `Controllers/<Entidad>.php` (aunque sea vacía, extendiendo `Espo\Core\Controllers\Record`) — no hay fallback automático a un controller genérico. Se agregaron los 4 controllers faltantes.

## Archivos afectados

| Acción | Ruta | Propósito |
|---|---|---|
| Creado | `Resources/metadata/entityDefs/GestionTecnica.json`, `DecisionRutaJuridica.json` | Definición de las entidades nuevas |
| Creado | `Entities/GestionTecnica.php`, `Entities/DecisionRutaJuridica.php` | Clases ORM |
| Creado | `Controllers/GestionTecnica.php`, `Controllers/DecisionRutaJuridica.php` | Controllers mínimos (requeridos para que la API responda) |
| Creado | `Resources/metadata/scopes/*`, `clientDefs/*`, `layouts/GestionTecnica/*`, `layouts/DecisionRutaJuridica/*`, `i18n/es_ES/GestionTecnica.json`, `i18n/es_ES/DecisionRutaJuridica.json` | Soporte estándar EspoCRM (ACL, vistas, layouts, traducciones) |
| Modificado | `Resources/metadata/entityDefs/Case.json`, `Expediente.json`, `ActaVisita.json` | Links `gestionesTecnicas`, `decisionesRuta`, `gestionTecnica`; enum `status` reducido a 8 valores |
| Nuevo | `Tools/CaseObj/CaseGestionTecnicaHelper.php` | Abrir/reutilizar la GestionTecnica abierta de un caso |
| Modificado | `Hooks/ActaVisita/SetEnProcesoOnActaVisita.php`, `Hooks/ActaVisita/NotifyInspeccionOnActaDiligenciada.php` | Crear/actualizar GestionTecnica al diligenciar acta |
| Modificado | `Tools/CaseObj/CaseActaVisitaHelper.php` | Constantes de status renombradas (alias deprecados conservados); helpers de "esperando visita" consultan GestionTecnica |
| Modificado | `Controllers/CaseObj.php` | Acciones de visita actualizadas al nuevo status; nueva acción `getActionEnProcesoOtraVisita` |
| Modificado | `Tools/CaseObj/CaseTimelineService.php`, `CaseCronogramaService.php`, `CaseCalendarEventService.php`, `PlazoLegalCatalog.php`, `ReporteGerencialService.php`, `Tools/ActaVisita/FormatoActaVisitaGenerator.php` | Adaptados al nuevo enum; alias de lectura para datos históricos con los 3 valores viejos |
| Nuevo | `scripts/migrate-case-status-gestion-tecnica.php` | Migración idempotente de casos existentes al nuevo status + backfill de GestionTecnica (no ejecutado contra producción) |
| Modificado (frontend) | `dashboard.js`, `helpers/case-status-colors.js`, `helpers/case-status-timeline.js`, `helpers/asignador-case-flow.js`, `loader/theme-buttons.js`, `views/home.js`, `views/case/fields/acta-visita-action.js`, `views/case/fields/decision-juridica.js`, `helpers/acta-visita-case-status.js` | Migración del enum en UI (colores, timeline, kanban, dashboard) |
| Modificado | `scripts/verify-custom-deploy.sh` | Checks de deploy actualizados a los nuevos nombres (2 por esta migración, 3 ya estaban desactualizados de un refactor anterior de `numero-radicado.js` y del rename de `NotifyInspeccionAndAsignadorOnRadicado.php`) |

## Riesgos y dependencias

- El script de migración de datos (`scripts/migrate-case-status-gestion-tecnica.php`) **no se ejecutó contra ninguna base real**; queda listo para correr en el próximo despliegue.
- No se pudo correr `php -l` ni tests automatizados (sin PHP/Docker-exec con esas herramientas en el entorno de validación inicial; sí se probó en el contenedor Docker real después).
- El kanban pierde granularidad visual en el tramo de gestión técnica — cambio de comportamiento aceptado explícitamente por el usuario, no un defecto.

## Validación

| Escenario probado | Resultado | Evidencia u observación |
|---|---|---|
| Build de imagen Docker con todos los cambios | Correcto | `docker compose build espocrm` sin errores |
| Deploy automático (`verify-custom-deploy.sh` + rebuild) | Correcto tras ajustar 5 checks | Log del contenedor sin `ERROR`/`DESACTUALIZADO` |
| Tablas `gestion_tecnica`, `decision_ruta_juridica` creadas | Correcto | Verificado con `psql \dt` |
| API `GET /api/v1/GestionTecnica`, `/DecisionRutaJuridica` | Correcto (200) tras agregar los Controllers faltantes | Antes devolvían 404 |
| Registro real de `GestionTecnica` creado por el hook al diligenciar un acta de prueba | Correcto | Confirmado vía API tras la prueba manual del usuario |

## Despliegue y reversión

Desplegado en Docker local (`docker compose build espocrm && docker compose up -d --force-recreate espocrm espocrm-daemon espocrm-websocket`). Pendiente desplegar a Dokploy y correr `scripts/migrate-case-status-gestion-tecnica.php` contra la base de producción. Reversión: revertir los commits de este ajuste: implica revertir también datos ya escritos en `gestion_tecnica`/`decision_ruta_juridica` si se llegó a usar en producción.

## Documentación relacionada

| Documento | Acción requerida | Estado |
|---|---|---|
| `docs/GUIA-HANDOFF-PROYECTO.md` | Actualizar (nuevas entidades, nuevo enum de status) | Pendiente |
| `docs/MANUAL-USUARIO-CRM-AMBIENTAL.md` | Actualizar (diagrama de flujo usa los 3 estados viejos: "Visita realizada", "En proceso de otra visita") | Pendiente |
| `docs/handoff/ANEXO-H-METADATA.md` (si existe) | Revisar inventario de entidades | Pendiente |
