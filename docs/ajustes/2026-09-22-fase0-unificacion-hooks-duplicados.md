# Ajuste: Fase 0 — Unificación de hooks duplicados en Case/ActaVisita

| Campo | Detalle |
|---|---|
| Fecha | 2026-09-22 |
| Estado | Validado localmente |
| Responsable | Claude Code (sesión con Jonathan Ochoa) |
| Áreas o roles impactados | Radicación, Inspección, Asignación (notificaciones y estado del caso) |
| Versión de despliegue | local (Docker, no desplegado a Dokploy) |

## Objetivo

Antes de empezar a reestructurar el CRM hacia el modelo funcional descrito en el repo `InspeccionAmbiental-Workflow`, se detectó que `Classes/RecordHooks/CaseObj/` y `Hooks/CaseObj/` tenían lógica duplicada o parcialmente solapada para las mismas responsabilidades (limpieza de infractor "no se conoce", avance de status a Radicado, normalización de enums, notificación a Radicación al crear caso). Mantener dos capas haciendo lo mismo aumenta el riesgo de que futuras reglas de negocio se agreguen en un solo lugar y queden desincronizadas.

## Alcance funcional

Consolidar cada responsabilidad duplicada en una sola implementación, sin cambiar el comportamiento observable para el usuario final, salvo un caso donde había un bug real de doble notificación.

## Diseño y decisión técnica

- **`ClearInfractorWhenUnknownOnSave` vs `EarlyClearInfractorWhenUnknown`**: duplicado exacto (mismo helper `InfractorUnknownHelper`). Se eliminó el RecordHook, se conservó el Hook clásico (cubre todos los guardados, no solo los que pasan por el Record Service de la API).
- **`SetRadicadoOnPostRadicacion` vs `EarlyBeforeUpdateRadicadoStatus`**: el Hook clásico ya cubría un superconjunto de casos (incluye reparación de casos que quedaron en `Pendiente de radicacion` por orden de hooks). Se eliminó el RecordHook.
- **`NormalizeCaseEnumPlaceholders` vs `EarlyNormalizeCaseEnums`**: el RecordHook usaba `CaseEnumNormalizer` (alias de barrios, defaults de `priority`/`type`), el Hook clásico tenía una lista de campos duplicada y más simple. Se dejaron ambas capas (cubren API vs. guardados internos), pero el Hook clásico ahora delega en el mismo `CaseEnumNormalizer` en vez de mantener su propia lista de campos.
- **`NotifyRadicacionOnCaseCreated` vs `AfterCreateNotifyRadicacion`**: aquí sí había una diferencia de comportamiento real, no solo duplicación. `AlcaldiaUserProfile::isInspeccion()` excluye explícitamente a usuarios admin (`!$user->isAdmin() && ...`), así que el Hook clásico nunca notificaba a Radicación cuando un caso lo creaba un admin; el RecordHook sí lo cubría. Además usaban `eventKey` distintos, por lo que el guard anti-duplicados no evitaba que Inspección recibiera el aviso dos veces. Se amplió el disparador del Hook clásico para cubrir también admins, se agregó el rol `Radicacion` (sin tilde) a los destinatarios, y se eliminó el RecordHook.

## Archivos afectados

| Acción | Ruta | Propósito |
|---|---|---|
| Eliminado | `espocrm-custom/Classes/RecordHooks/CaseObj/EarlyClearInfractorWhenUnknown.php` | Duplicado exacto del Hook clásico |
| Eliminado | `espocrm-custom/Classes/RecordHooks/CaseObj/EarlyBeforeUpdateRadicadoStatus.php` | Subsumido por el Hook clásico |
| Eliminado | `espocrm-custom/Classes/RecordHooks/CaseObj/AfterCreateNotifyRadicacion.php` | Fusionado en el Hook clásico para evitar doble notificación |
| Modificado | `espocrm-custom/Resources/metadata/recordDefs/Case.json` | Quitadas las referencias a los 3 RecordHooks eliminados |
| Modificado | `espocrm-custom/Hooks/CaseObj/NotifyRadicacionOnCaseCreated.php` | Dispara también para admins; agrega rol `Radicacion` (sin tilde) a destinatarios |
| Modificado | `espocrm-custom/Hooks/CaseObj/NormalizeCaseEnumPlaceholders.php` | Delega en `CaseEnumNormalizer` en vez de lista propia de campos |
| Modificado | `docs/GUIA-HANDOFF-PROYECTO.md`, `docs/handoff/ANEXO-E-BACKEND-PHP.md` | Actualizada la lista de RecordHooks existentes |

## Riesgos y dependencias

- El fix de doble notificación cambia comportamiento observable (antes: potencialmente 2 notificaciones a Radicación cuando Inspección crea un caso; ahora: 1). Se considera una corrección de bug, no una regresión.
- No se pudo correr `php -l` en el entorno de desarrollo (sin PHP local); la validación fue por lectura cuidadosa de cada par de hooks antes de tocarlos.

## Validación

| Escenario probado | Resultado | Evidencia u observación |
|---|---|---|
| JSON de `recordDefs/Case.json` válido tras editar | Correcto | Validado con `python3 -c "import json; json.load(...)"` |
| No quedan referencias a las clases eliminadas en el repo | Correcto | `grep` sobre PHP/JSON/MD tras el cambio, sin coincidencias |
| Deploy local levanta sin errores con estos cambios | Correcto | Confirmado como parte del deploy conjunto documentado en el ajuste de Fase 1 (mismo build) |

## Despliegue y reversión

Desplegado junto con el resto de cambios de esta sesión (ver `2026-09-22-fase1-gestion-tecnica-decision-ruta-juridica.md`). Reversión: restaurar los 3 archivos de `Classes/RecordHooks/CaseObj/` eliminados y sus referencias en `recordDefs/Case.json` desde el historial de git; revertir los 2 archivos modificados de `Hooks/CaseObj/`.

## Documentación relacionada

| Documento | Acción requerida | Estado |
|---|---|---|
| `docs/GUIA-HANDOFF-PROYECTO.md` | Actualizar | Hecho en este ajuste |
| `docs/handoff/ANEXO-E-BACKEND-PHP.md` | Actualizar | Hecho en este ajuste |
