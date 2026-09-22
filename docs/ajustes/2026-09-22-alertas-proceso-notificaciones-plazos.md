# Ajuste: Sistema de alertas de proceso (AlertaProceso) y notificaciones de plazos legales

| Campo | Detalle |
|---|---|
| Fecha | 2026-09-22 |
| Estado | Validado localmente |
| Responsable | Claude Code (sesión con Jonathan Ochoa) |
| Áreas o roles impactados | Inspector Ambiental, Patrullero Ambiental, Secretario de Despacho, Auxiliar Administrativo · Radicador |
| Versión de despliegue | local (Docker, no desplegado a Dokploy) |

## Objetivo

El usuario pidió revisar todo el sistema de notificaciones y contrastarlo contra lo que exige el modelo BPMN por rol/acción. Una auditoría previa (sin cambios de código) encontró que:
- Todo lo que ya funciona (radicación, asignación de patrullero, acta diligenciada, Auto de Inicio, vencimientos de `Case`) gira exclusivamente alrededor de `Case`/`ActaVisita`/`AutoInicio`/`ComunicacionCaso`.
- Las 23 entidades nuevas construidas en esta sesión (todo el cierre de los 28 BPMN) no disparaban ninguna notificación.
- El modelo fuente exige seguimiento de varios plazos legales que hoy no tenían ningún control automático: término de recursos/firmeza tras `NotificacionActo`, remisión de apelación PVI en 24h + resolución en 3 días hábiles, objeción de comparendo RNMC en 3 días hábiles, justificación de primera inasistencia a audiencia en 3 días.
- El modelo fuente ya prevé una entidad genérica para esto, `AlertaProceso` (`domain.json`), mencionada explícitamente en 2 diagramas (Visita — VIS03, Tesorería — TES04A), pero nunca construida en el CRM.

Este ajuste construye `AlertaProceso` como pieza reutilizable y la conecta a los 5 puntos de mayor impacto jurídico detectados en la auditoría.

## Alcance funcional

- `AlertaProceso` es genérica: se relaciona con cualquier entidad mediante `entidadTipo`/`entidadId` (no un link estructurado de EspoCRM), siguiendo el diseño del modelo fuente. Se le agregó un `case` opcional (no está en `domain.json`) para poder filtrar/agrupar alertas por caso — decisión propia de usabilidad, sin la cual sería muy difícil ver todas las alertas de un expediente desde el `Case`.
- Se conectó a 5 puntos con plazo legal explícito en el modelo (todos con `reglaFuente` citando la norma exacta):
  1. `NotificacionActo.fechaEfectiva` → alerta informativa (sin fecha de vencimiento calculada, ya que el modelo no fija un número de días único para todos los tipos de acto).
  2. `ActuacionPoliciaInmediata.apelacion` (se vincula) → alerta de 24h para remitir al Inspector (Ley 1801 art. 222 par. 1).
  3. `Recurso.fechaRecepcion` (solo si el Recurso está vinculado a una `ActuacionPoliciaInmediata`) → alerta de 3 días hábiles para resolver la apelación PVI.
  4. `ActuacionRNMC` con `tipoIngresoRNMC = "Objeción de comparendo"` → alerta de 3 días hábiles para validar la objeción.
  5. `SuspensionAudiencia` con `esPrimeraInasistencia = true` → alerta usando el `fechaLimiteJustificacion` ya registrado por quien crea la suspensión (Decreto 768/2025 art. 2.2.8.18.5.3).
- **Limitación explícita y deliberada**: los plazos "hábiles" (3 días hábiles, en los puntos 3 y 4) se aproximan a días calendario simples — el CRM no tiene calendario de festivos/fines de semana. Cada `reglaFuente` generada dice explícitamente que es una aproximación. No se automatizó ningún efecto jurídico (declarar mora, iniciar cobro coactivo, etc.), solo el aviso operativo, siguiendo la misma cautela que el propio modelo aplica a la alerta de 30 días de Tesorería.
- Deduplicación: por `entidadTipo`+`entidadId`+`tipoAlerta` (no se crea una alerta duplicada si el hook se dispara más de una vez sobre el mismo registro), y las notificaciones de recordatorio/vencida se deduplican por fase y por día.
- Job diario (`0 7 * * *`, igual horario que el ya existente para `Case`): notifica recordatorio cuando una alerta "Pendiente" vence hoy o mañana (y la marca "Notificada"), y notifica + marca "Vencida sin atender" cuando ya pasó la fecha sin atender.

## Diseño y decisión técnica

- `AlertaProceso`: `case` (opcional), `entidadTipo`/`entidadId` (genéricos, requeridos), `tipoAlerta` (enum: Vencimiento de término legal / Seguimiento operativo / Recordatorio de reporte externo / Otro), `fechaBase`, `fechaVencimiento` (opcional), `reglaFuente` (texto, cita la norma), `prioridad` (Alta/Media/Baja), `estado` (Pendiente/Notificada/Atendida/Vencida sin atender/Cancelada — PROPUESTA_CRM, sin catálogo oficial), `responsable`.
- `Tools/AlertaProceso/AlertaProcesoNotifier.php`: `crearYNotificar()` (crea con dedup + notifica in-app inmediatamente), `notificarRecordatorio()`, `notificarVencida()` — mismo estilo que el ya existente `CaseAlertNotifier`.
- `Jobs/CheckAlertaProcesoVencimientos.php`: mismo patrón que `CheckCaseVencimientoAlerts`, registrado en `Resources/metadata/app/scheduledJobs.json` sin tocar el job existente.
- 5 hooks `AfterSave` (uno por entidad), cada uno con try/catch que nunca bloquea el guardado del registro origen, siguiendo el patrón ya usado en `Hooks/AutoInicio/NotifyOnAutoInicioCreated.php`.

## Archivos afectados

| Acción | Ruta | Propósito |
|---|---|---|
| Creado | `Resources/metadata/entityDefs/AlertaProceso.json`, `Entities/AlertaProceso.php`, `Controllers/AlertaProceso.php`, `Resources/metadata/scopes/AlertaProceso.json`, `Resources/metadata/clientDefs/AlertaProceso.json`, `Resources/i18n/es_ES/AlertaProceso.json`, `Resources/layouts/AlertaProceso/*` | Entidad genérica |
| Creado | `Tools/AlertaProceso/AlertaProcesoNotifier.php` | Motor de notificación in-app |
| Creado | `Jobs/CheckAlertaProcesoVencimientos.php` | Job diario de recordatorio/vencimiento |
| Creado | `Hooks/NotificacionActo/CreateAlertaOnFechaEfectiva.php`, `Hooks/ActuacionPoliciaInmediata/CreateAlertaOnApelacion.php`, `Hooks/Recurso/CreateAlertaResolucionApelacionPVI.php`, `Hooks/ActuacionRNMC/CreateAlertaObjecion.php`, `Hooks/SuspensionAudiencia/CreateAlertaJustificacionInasistencia.php` | Disparadores de los 5 plazos |
| Modificado | `Resources/metadata/entityDefs/Case.json`, `Resources/i18n/es_ES/Case.json` | Link recíproco `alertasProceso` |
| Modificado | `Resources/metadata/app/scheduledJobs.json` | Nueva entrada `CheckAlertaProcesoVencimientos` |
| Modificado | `scripts/roles/configure-roles-modelo-preliminar.php`, `scripts/roles/configure-role-patrullaje.php`, `scripts/configure-full-access-all-roles.php` | ACL de `AlertaProceso` |

## Riesgos y dependencias

- Los plazos "hábiles" se calculan como días calendario simples — riesgo de imprecisión en fines de semana/festivos, documentado explícitamente en cada `reglaFuente`. Si se requiere precisión real, hace falta un calendario de festivos colombiano, fuera de alcance de este ajuste.
- El resto de brechas de la auditoría (bajo/medio impacto: Ambiental Preventiva, Permiso Canino, art. 172 informar a Policía Nacional vía `ReporteRNMC`, coordinación interna de Gestión Técnica) quedan pendientes — se priorizaron los 5 de mayor impacto jurídico según la auditoría.
- Se detectó (documentado, no corregido aquí) que `assignedUser` es `readOnlyAfterCreate` en varias entidades (`Recurso` incluido) — al probar hubo que asignar el responsable en la creación, no después. Es un patrón preexistente en todo el proyecto, no un bug de este ajuste.

## Validación

| Escenario probado | Resultado | Evidencia u observación |
|---|---|---|
| Validación JSON + ausencia de claves duplicadas en los 12 archivos tocados | Correcto | |
| `php -l` sobre los 8 archivos PHP nuevos (dentro del contenedor) | Correcto | Sin errores de sintaxis |
| `docker compose build && up --force-recreate` + `clear_cache`/`rebuild` | Correcto | |
| Hook 1 (NotificacionActo.fechaEfectiva) | Correcto | Alerta informativa creada sin fecha de vencimiento |
| Hook 2 (ActuacionPoliciaInmediata.apelacion) | Correcto | Alerta 24h creada, notificación in-app recibida por el Patrullero |
| Hook 3 (Recurso.fechaRecepcion + vínculo a PVI) | Correcto | Alerta 3 días creada solo tras confirmar el vínculo con `ActuacionPoliciaInmediata` |
| Hook 4 (ActuacionRNMC objeción) | Correcto | Alerta 3 días creada al radicar |
| Hook 5 (SuspensionAudiencia primera inasistencia) | Correcto | Usa `fechaLimiteJustificacion` tal cual, sin recalcular |
| Job diario (`php command.php run-job CheckAlertaProcesoVencimientos`) | Correcto | Alertas que vencían mañana pasaron a "Notificada" con recordatorio in-app; alerta forzada al pasado pasó a "Vencida sin atender" con notificación in-app |
| Revisión de logs tras todas las pruebas | Correcto | Únicos errores registrados fueron de mis propios intentos de diagnóstico (invocación CLI directa fallida, POST a Job vía API), no del código entregado |

## Despliegue y reversión

Desplegado en Docker local (`docker compose build espocrm && docker compose up -d --force-recreate espocrm espocrm-daemon espocrm-websocket`), `php clear_cache.php`/`rebuild.php`, y re-ejecución de los scripts de ACL dentro del contenedor. Pendiente desplegar a Dokploy (recordar que el job diario depende de que `espocrm-daemon` corra el cron). Reversión: revertir el commit de este ajuste.

## Documentación relacionada

| Documento | Acción requerida | Estado |
|---|---|---|
| `docs/PLAN-MODELO-FUNCIONAL-INSPECCION-AMBIENTAL.md` | Registrar el sistema de alertas y las brechas restantes de notificación (medio/bajo impacto) como pendiente | Pendiente |
