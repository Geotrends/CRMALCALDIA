# Ajuste: aprobación de visita por Asignador + notificaciones del flujo de decisión

| Campo | Detalle |
|---|---|
| Fecha | 2026-08-25 |
| Estado | Validado localmente (Fases 2-3 de 9 del plan Expediente/AutoInicio) |
| Responsable | Sesión asistida (Claude Code) |
| Áreas o roles impactados | Asignación, Jurídica, Inspección, Patrullaje |
| Versión de despliegue | (incluida en el mismo deploy de `entidades-expediente-autoinicio-rol-juridica-2026-08-25`) |

## Objetivo

Continuación de [`2026-08-25-expediente-autoinicio-rol-juridica.md`](2026-08-25-expediente-autoinicio-rol-juridica.md): implementar el flujo real confirmado con el usuario — Asignador (además de Inspección) puede aprobar la visita; al aprobarla, se avisa a Asignación y Jurídica que el caso está listo para decidir (cerrar sin proceso o abrir Auto de Inicio); y, un paso antes, se avisa a ambos roles apenas el Patrullero deja el acta diligenciada, para que sepan que hay algo pendiente de revisar.

## Alcance funcional

- `confirmarVisitaAprobada` ahora acepta Inspección **o** Asignación (antes solo Inspección).
- Nueva notificación al aprobar la visita: Asignación y Jurídica reciben "Caso listo para decisión".
- Nueva notificación cuando el acta queda Diligenciada (antes de cualquier aprobación): Asignación y Jurídica reciben "Acta de visita lista para revisar".
- Jurídica sigue siendo el único rol que puede crear el registro `AutoInicio` (sin cambios en esta parte, ya validado en el ajuste anterior).

## Diseño y decisión técnica

- El endpoint `confirmarVisitaAprobada` valida por perfil (`AlcaldiaUserProfile`), no por ACL genérico — se mantiene ese patrón ya existente (ver comentario original en el archivo) y se le suma `isAsignador()`.
- La notificación de "listo para decisión" se agregó como método nuevo en `CaseVisitaAprobadaNotifier` (ya usado por `notifyPatrullero`) y se invoca en el mismo punto del controlador, porque ese guardado usa `skipAll`/`skipHooks` deliberadamente y no dispara la cadena normal de hooks de `Case`.
- La notificación de "acta lista para revisar" sí es un hook (`AfterSave` sobre `ActaVisita`), porque el guardado de una `ActaVisita` normal **no** salta hooks — se aprovecha el hook ya existente `MarkActaDiligenciadaOnSave` (que pone `estado = Diligenciada`) agregando uno nuevo después.
- Ambas notificaciones reutilizan `AlcaldiaUserProfile::findActiveUserIdsByRoleName()` y `CaseNotificationDuplicateGuard` (patrón ya establecido en `NotifyInspeccionAndAsignadorOnRadicado`), y se les agregó texto legible en el helper de frontend `alcaldia-notification-message.js` (antes cualquiera de estas dos hubiera caído en el mensaje genérico de fallback).

## Archivos afectados

| Acción | Ruta | Propósito |
|---|---|---|
| Modificado | `espocrm-custom/Controllers/CaseObj.php` | `confirmarVisitaAprobada` acepta Asignador; llama a la nueva notificación |
| Modificado | `espocrm-custom/Tools/CaseObj/CaseVisitaAprobadaNotifier.php` | Nuevo método `notifyAsignadorYJuridica()` |
| Modificado | `espocrm-custom/files/client/custom/src/helpers/patrullero-acta.js` | `canAprobarVisita` acepta Asignador |
| Modificado | `scripts/roles/configure-role-asignacion.php` | ACL: `confirmarVisitaAprobada`, `cerrarSinProceso` en `yes`; campo `cProximaActuacion` editable |
| Modificado | `espocrm-custom/Resources/metadata/scopes/Case.json` | Nuevas acciones ACL: `cerrarSinProceso`, `abrirAutoInicio`, `bandejaDecision` (declaradas para fases siguientes, aún sin implementar) |
| Creado | `espocrm-custom/Hooks/ActaVisita/NotifyAsignadorYJuridicaOnDiligenciada.php` | Notificación al quedar el acta Diligenciada |
| Modificado | `espocrm-custom/files/client/custom/src/helpers/alcaldia-notification-message.js` | Texto legible para los 2 `eventKey` nuevos |

## Riesgos y dependencias

- Estas notificaciones dependen de que existan usuarios activos con rol Asignación/Jurídica — si no hay ninguno, no falla, simplemente no se crea notificación (`$notifyUserIds === []` corta silenciosamente).
- El botón/checkbox de aprobación en pantalla (`acta-visita-action.js`) no se modificó más allá del helper de permiso — falta verificar visualmente que el checkbox aparece correctamente para un usuario Asignador (se validó el endpoint por API, no el clic en pantalla).
- Las acciones `cerrarSinProceso`/`abrirAutoInicio`/`bandejaDecision` quedaron declaradas en el ACL (`scopes/Case.json`) pero **no implementadas todavía** — es intencional, preparación para la siguiente fase.

## Validación

| Escenario probado | Resultado | Evidencia u observación |
|---|---|---|
| `POST Case/action/confirmarVisitaAprobada` como `asignacion` | Correcto | `{"success":true,"status":"Visita aprobada",...}` |
| Notificación a `juridica` al aprobar | Correcto | `"Caso listo para decisión" | case.visita.aprobada.juridica` |
| `POST ActaVisita` con contenido como `patrullaje` | Correcto | Acta creada con `estado: "Diligenciada"` |
| Notificación a `asignacion` y `juridica` al diligenciar el acta | Correcto | Ambos recibieron `"Acta de visita lista para revisar" | acta.diligenciada.pendiente` |
| `AlcaldiaUserProfile::isAsignador/isJuridica/canManageAutoInicio` | Correcto | Verificado con usuarios reales: Asignación no puede gestionar Auto de Inicio, Jurídica sí |

## Despliegue y reversión

Incluido en los mismos deploys manuales de esta sesión (`docker exec crmalcaldia-espocrm-1 bash /opt/bootstrap/repo/scripts/deploy-custom-dokploy.sh`), posteriores al fix de controladores documentado en [`2026-08-25-fix-controladores-custom-espocrm10.md`](2026-08-25-fix-controladores-custom-espocrm10.md) (sin el cual estas acciones no se podían probar). Reversión: revertir los archivos de esta tabla; no hay cambios de esquema de base de datos en este ajuste.

## Documentación relacionada

| Documento | Acción requerida | Estado |
|---|---|---|
| [`2026-08-25-expediente-autoinicio-rol-juridica.md`](2026-08-25-expediente-autoinicio-rol-juridica.md) | Continuación directa (fases 2-3 del plan) | Sin cambios, se referencia |
| [`2026-08-25-fix-controladores-custom-espocrm10.md`](2026-08-25-fix-controladores-custom-espocrm10.md) | Bug bloqueante encontrado y corregido durante esta prueba | Referenciado |
