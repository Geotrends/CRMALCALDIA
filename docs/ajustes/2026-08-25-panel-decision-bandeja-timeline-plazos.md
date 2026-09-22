# Ajuste: panel de decisión, bandeja, línea de tiempo dinámica y plazos legales

| Campo | Detalle |
|---|---|
| Fecha | 2026-08-25 |
| Estado | Validado localmente (Fases 4-7 de 9 del plan Expediente/AutoInicio) |
| Responsable | Sesión asistida (Claude Code) |
| Áreas o roles impactados | Asignación, Jurídica, todos los usuarios (línea de tiempo) |
| Versión de despliegue | (incluida en el mismo deploy de `entidades-expediente-autoinicio-rol-juridica-2026-08-25`) |

## Objetivo

Completar el flujo de decisión operativo: botones reales para cerrar el caso sin proceso o abrir el Auto de Inicio, una bandeja de trabajo para Asignación/Jurídica, la línea de tiempo del caso reflejando si escaló a proceso policivo, y una primera referencia de plazos legales por paso (tomados de los procedimientos oficiales, sin módulo configurable todavía — eso queda para una fase futura).

## Alcance funcional

1. **Panel "Decisión: cerrar o abrir proceso"** en el detalle del caso, visible solo cuando `status = Visita aprobada` y el caso no tiene ya un `AutoInicio`:
   - **Cerrar sin proceso** (Asignación y Jurídica): ejecuta de inmediato, pasa el caso a `Proceso cerrado`.
   - **Abrir Auto de Inicio** (solo Jurídica): abre el modal estándar de creación de `AutoInicio` precargado con los datos del caso (mismo patrón que el Auto de Archivo ya existente).
2. **Bandeja de decisión**: en la pestaña "Gestión de casos" del inicio, Asignación y Jurídica ven primero la lista "Listos para decisión" (casos en `Visita aprobada`), antes que "Todos los casos" y "En seguimiento".
3. **Jurídica puede ver las actas de visita** para tomar la decisión — ya estaba correctamente configurado en el ajuste anterior (`ActaVisita: read=all`); se verificó por API que el contenido completo del acta (incluido el PDF) es visible para Jurídica.
4. **Línea de tiempo dinámica**: el último paso ("Proceso cerrado") cambia de etiqueta y color a "Proceso policivo iniciado" cuando el caso tiene un `AutoInicio` vinculado.
5. **Plazos legales de referencia**: cada paso de la línea de tiempo muestra el plazo legal aproximado (ej. "Plazo legal: 10 día(s)"), tomado de las tablas de los procedimientos oficiales.

## Diseño y decisión técnica

- El panel de decisión sigue el patrón ya usado por el Auto de Archivo (`views/case/fields/actuo-archivo-action.js`): un campo virtual en el layout de detalle del caso, con estado cargado de forma asíncrona.
- "Abrir Auto de Inicio" reutiliza el helper estándar de EspoCRM `helpers/record-modal` (mismo mecanismo que Auto de Archivo) en vez de un endpoint custom — así el ACL de la entidad (`AutoInicio: create`) gatea automáticamente quién puede usarlo, sin duplicar lógica de permisos en el backend.
- "Cerrar sin proceso" sí es una acción custom (`Case/action/cerrarSinProceso`) porque solo cambia el `status` del caso, no crea un registro nuevo.
- La bandeja de decisión reutiliza el mecanismo ya existente de `home.js` (`profileConfig().lists`, ya usado para "Todos los casos"/"En seguimiento") — no se tocó el dashboard (`dashboard.js`), que es un archivo aparte con trabajo en curso.
- La línea de tiempo dinámica no rediseña el componente visual (rail lineal): el backend (`CaseTimelineService`) calcula la etiqueta/variante del último paso según exista o no un `AutoInicio`, y el frontend simplemente la aplica sobre el paso final.
- El catálogo de plazos legales (`PlazoLegalCatalog.php`) es una clase nueva con un mapa fijo en código; se diseñó para que un futuro módulo configurable solo tenga que cambiar la fuente de datos de `getDiasForStatus()`, sin tocar `CaseTimelineService` ni el frontend.
- Se agregó soporte para el rol **Jurídica** en el helper JS `radicacion-fields.js` (`isJuridicaUser`, `homeProfile: 'juridica'`) y en `AlcaldiaUserProfile::resolveHomeProfile` (PHP) — antes caía en el perfil `gestion` por defecto.

## Bug encontrado y corregido durante la prueba

Al probar `cerrarSinProceso` como usuario `asignacion`, el caso respondía `success: true` pero el `status` **no se guardaba en la base de datos**. La causa: el hook ya existente `LimitAsignadorCaseEdit` (protege que Asignación solo edite `assignedUser`/`cMotivoReasignacion`) revierte silenciosamente cualquier otro campo cambiado — incluido `status` cuando se guarda fuera del flujo normal de edición. Se corrigió agregando la misma bandera `skip*` que ya usan otros guardados controlados (`ProtectRadicadoForNonRadicacionUsers`, etc.): `skipAsignadorLimit`, pasada explícitamente desde `cerrarSinProceso`.

## Archivos afectados

| Acción | Ruta | Propósito |
|---|---|---|
| Modificado | `espocrm-custom/Controllers/CaseObj.php` | Acción `cerrarSinProceso` |
| Modificado | `espocrm-custom/Hooks/CaseObj/LimitAsignadorCaseEdit.php` | Bandera `skipAsignadorLimit` (fix del bug) |
| Creado | `espocrm-custom/files/client/custom/src/views/case/fields/decision-juridica.js` + `.tpl` | Panel de decisión en el caso |
| Creado | `espocrm-custom/files/client/custom/src/helpers/auto-inicio-modal.js`, `auto-inicio-from-case.js` | Apertura del modal de Auto de Inicio precargado |
| Creado | `espocrm-custom/files/client/custom/src/views/modals/auto-inicio.js` | Modal de creación/edición de Auto de Inicio |
| Modificado | `espocrm-custom/Resources/metadata/clientDefs/AutoInicio.json` | `modalViews.edit` |
| Modificado | `espocrm-custom/Resources/layouts/Case/detail.json` | Panel `decisionJuridica` en el layout |
| Modificado | `espocrm-custom/Resources/i18n/es_ES/Case.json` | Etiquetas del panel |
| Modificado | `espocrm-custom/files/client/custom/src/views/home.js` | Lista "Listos para decisión" primero para Asignación/Jurídica |
| Modificado | `espocrm-custom/files/client/custom/src/helpers/radicacion-fields.js` | `isJuridicaUser`, perfil `juridica` |
| Modificado | `espocrm-custom/Tools/User/AlcaldiaUserProfile.php` | `resolveHomeProfile` reconoce Jurídica |
| Modificado | `espocrm-custom/Tools/CaseObj/CaseTimelineService.php` | Último paso dinámico + `plazoLegalDias` |
| Creado | `espocrm-custom/Tools/CaseObj/PlazoLegalCatalog.php` | Catálogo de plazos legales |
| Modificado | `espocrm-custom/files/client/custom/src/helpers/case-status-timeline.js` | Consume `finalStep`/`plazoLegalDias` |
| Modificado | `espocrm-custom/files/client/custom/res/templates/case/record/panels/status-timeline.tpl`, `res/css/12-case-timeline.css` | Render y color de la variante "escalado" |

## Riesgos y dependencias

- Los plazos legales son una referencia fija en código, aproximada (los procedimientos no numeran sus pasos igual que los estados del caso) — dejarlo claro a los usuarios operativos, no es un plazo vinculante calculado automáticamente.
- La bandeja de decisión vive en la pestaña "Gestión de casos", no como pestaña de inicio por defecto — "lo primero que ve" un Asignador hoy sigue siendo la portada estática; moverlo a pestaña por defecto es un cambio de UX mayor, pendiente de decidir.
- `LimitAsignadorCaseEdit` ahora tiene una puerta de escape (`skipAsignadorLimit`) — cualquier código futuro que guarde un `Case` con esa opción se salta la restricción de campos de Asignación; usarla solo en acciones de servidor controladas, nunca expuesta directamente al cliente.
- Sigue pendiente (fuera de este ajuste): diferir `cExpediente` hasta el Auto de Inicio (`isRadicadoCompleto`), sincronización real Expediente↔Case, vinculación de varios radicados a un mismo expediente, y la plantilla oficial del PDF del Auto de Inicio.

## Validación

| Escenario probado | Resultado | Evidencia u observación |
|---|---|---|
| `POST Case/action/cerrarSinProceso` como `asignacion` (antes del fix) | Falló silenciosamente | `success:true` pero `status` sin cambios en BD |
| `POST Case/action/cerrarSinProceso` como `asignacion` (después del fix) | Correcto | `status` persistido como `Proceso cerrado`, `modified_at` actualizado |
| `POST Case/action/cerrarSinProceso` con `AutoInicio` ya existente | Correcto | 400 Bad Request, no permite cerrar |
| `POST AutoInicio` (crear) como `asignacion` | Correcto | 403 Forbidden — no tiene permiso |
| Crear `AutoInicio` vía `ServiceContainer` para un caso en Visita aprobada | Correcto | `GET Case/action/timeline` refleja `finalStep.label = "Proceso policivo iniciado"`, `variant = "escalado"` |
| `GET Case/action/timeline` para caso cerrado sin proceso | Correcto | `finalStep.label = "Proceso cerrado"`, `variant = "cerrado"`, `plazoLegalDias` presente en cada paso |
| `GET ActaVisita` como `juridica` | Correcto | Contenido completo del acta visible (ya validado en ajuste anterior) |

## Despliegue y reversión

Incluido en los deploys manuales de esta sesión. Reversión: revertir los archivos de esta tabla; sin cambios de esquema de base de datos.

## Documentación relacionada

| Documento | Acción requerida | Estado |
|---|---|---|
| [`2026-08-25-flujo-decision-asignador-juridica.md`](2026-08-25-flujo-decision-asignador-juridica.md) | Continuación directa | Referenciado |
| [`docs/Referencias/INTERPRETACION-Y-USO-EN-CRM.md`](../Referencias/INTERPRETACION-Y-USO-EN-CRM.md) | Actualizar cuando se cierre el conjunto completo de fases (9/9) | Pendiente |
