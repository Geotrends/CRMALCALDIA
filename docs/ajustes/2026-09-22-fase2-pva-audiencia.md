# Ajuste: Fase 2 (Proceso Verbal Abreviado) — Audiencia, SuspensionAudiencia, GrabacionAudiencia

| Campo | Detalle |
|---|---|
| Fecha | 2026-09-22 |
| Estado | Validado localmente |
| Responsable | Claude Code (sesión con Jonathan Ochoa) |
| Áreas o roles impactados | Inspector Ambiental, Apoyo Jurídico, Secretario de Despacho |
| Versión de despliegue | local (Docker, no desplegado a Dokploy) |

## Objetivo

Cierra la tercera y última rama de Recursos Naturales (Policiva → Proceso Verbal Abreviado). Se investigaron ambos BPMN activos antes de programar: el N2 principal (`proceso_verbal_abreviado_convivencia_v1.0.bpmn`) y el N3 de audiencia (`audiencia_proceso_verbal_abreviado_v1.0.bpmn`, Ley 1801 art. 223 + Decreto 768/2025).

## Alcance funcional

El N2 completo de PVA involucra 7 entidades del modelo objetivo (Audiencia, SuspensionAudiencia, GrabacionAudiencia, OrdenPolicia, NotificacionActo, Recurso, MedidaCorrectiva). De esas, solo el trío de audiencia está completamente documentado por el N3 ya leído; las otras 4 requieren investigar sus propios BPMN N3 (Determinación de Medidas Correctivas, Orden de Policía, Notificación/Recursos/Ejecutoria, Gestión y Ejecución de Medidas Correctivas) — no se investigaron todavía. Se acordó con el usuario limitar el alcance de hoy al trío de audiencia, dejando el resto para iteraciones futuras con su propia investigación previa.

- `Audiencia`: registro de la diligencia (tipo de proceso, autoridad, fechas, participantes, estado, resultado, acta).
- `SuspensionAudiencia`: registra el escenario más detallado del N3 — primera inasistencia del presunto infractor con término de 3 días para justificar (Decreto 768/2025 art. 2.2.8.18.5.3), o suspensión por prueba/actuación pendiente fuera de audiencia.
- `GrabacionAudiencia`: el audio de la audiencia o la constancia motivada de excepción cuando no fue posible grabar.

## Diseño y decisión técnica

- **Se omitió `ActuacionJuridica`** como entidad intermedia obligatoria (el modelo la exige como padre formal de `Audiencia` dentro de `domain.json`) — se vinculó `Audiencia` directamente a `Expediente` (requerido) y opcionalmente a `Case`, para no introducir una capa de abstracción genérica sin un caso de uso concreto todavía. Es una simplificación deliberada, documentada aquí para revisarla si en el futuro se necesita agrupar actuaciones jurídicas de forma más fina.
- **Vacío real del modelo fuente**: `90_MODELO_CRM/estados.md` no define catálogo de estados para `SuspensionAudiencia` (ni para `OrdenPolicia`, que no se construyó hoy). Se propusieron estados razonables a partir de la narrativa del propio BPMN N3 (Registrada, Con término de justificación pendiente, Justificación resuelta, Actuación pendiente en curso, Reanudada, Cerrada), marcados aquí como propuesta a validar — no existe fuente oficial que confirmarlos.
- El BPMN modela `Audiencia` → `GrabacionAudiencia` como relación **1:1** ("debe tener audio o excepción"); en EspoCRM se implementó como `hasMany` desde `Audiencia` sin restricción de unicidad a nivel de base de datos — es una simplificación técnica aceptada (EspoCRM no tiene un tipo de relación "hasOne" nativo cómodo para este patrón); si se necesita forzar unicidad real, habría que agregarlo como regla de negocio en un hook, no se hizo en este ajuste.
- El N3 de audiencia tiene dos eventos de fin distintos con semántica de negocio real: `E_SUSP` (audiencia suspendida, retorna al N2 a reprogramar) y `E_CONT` (audiencia completa documentalmente, sigue directo a la decisión) — el campo `estado` de `Audiencia` refleja esa distinción (`Pendiente de audio/acta/soportes` vs. `Completa documentalmente`).
- Los formatos IV-F-366 (Acta de Conciliación) e IV-F-367 (Diligencia de compromisos) están confirmados en `formatos.json` para esta ruta pero no se modelaron como campos/entidad propia todavía — el acta general se cubre con `actaDocumento` en `Audiencia`; conciliación/compromisos quedan pendientes de una iteración futura si se necesitan como registro estructurado aparte.
- El código IV-F del Acta de Audiencia y el de la constancia de suspensión están marcados **POR VALIDAR** en `formatos.json` — no se hardcodeó ningún nombre/código de plantilla, ambos son adjuntos genéricos (`file`).

## Archivos afectados

| Acción | Ruta | Propósito |
|---|---|---|
| Creado | `Resources/metadata/entityDefs/{Audiencia,SuspensionAudiencia,GrabacionAudiencia}.json` | Definición de las 3 entidades |
| Creado | `Entities/{Audiencia,SuspensionAudiencia,GrabacionAudiencia}.php`, `Controllers/{...}.php` | Clases ORM y Controllers (obligatorios, ver Fase 1) |
| Creado | `Resources/metadata/scopes/*`, `clientDefs/*`, `layouts/{Audiencia,SuspensionAudiencia,GrabacionAudiencia}/*`, `i18n/es_ES/{...}.json` | Soporte estándar EspoCRM |
| Modificado | `Resources/metadata/entityDefs/Case.json`, `Expediente.json` | Link `audiencias` (hasMany) |
| Modificado | `scripts/configure-full-access-all-roles.php` | Acceso amplio para los roles operativos ya mapeados |
| Modificado | `scripts/roles/configure-roles-modelo-preliminar.php` | ACL para Inspector Ambiental (crear/editar los 3) y Secretario de Despacho (lectura de Audiencia) |
| Modificado | `scripts/roles/configure-role-juridica.php` | Apoyo Jurídico con lectura de Audiencia |

## Riesgos y dependencias

- Sin `ActuacionJuridica`, si en el futuro se retoma esa entidad del modelo, `Audiencia` tendrá que migrarse para colgar de ella en vez de (o además de) `Expediente` directamente.
- La relación 1:1 `Audiencia`↔`GrabacionAudiencia` no está forzada técnicamente; nada impide hoy crear más de una grabación por audiencia.
- Los estados de `SuspensionAudiencia` son una propuesta propia (el modelo fuente no los define) — deben validarse con quien mantenga el repo BPMN antes de considerarse definitivos.
- Quedan pendientes de esta misma ruta (PVA): OrdenPolicia, NotificacionActo, Recurso, MedidaCorrectiva — cada uno requiere investigar su propio BPMN N3 antes de programar.

## Validación

| Escenario probado | Resultado | Evidencia u observación |
|---|---|---|
| Crear una `Audiencia` vinculada a un Expediente real, con el usuario `inspector` | Correcto | Respuesta 200, `estado: Programada` |
| Crear una `SuspensionAudiencia` reflejando el escenario de primera inasistencia (3 días) | Correcto | Respuesta 200, con `esPrimeraInasistencia: true` y `fechaLimiteJustificacion` |
| Crear una `GrabacionAudiencia` con constancia de excepción (no fue posible grabar) | Correcto | Respuesta 200, `estado: Excepción no grabada` con motivo registrado |

## Despliegue y reversión

Desplegado en Docker local. Pendiente desplegar a Dokploy. Reversión: revertir el commit de este ajuste.

## Documentación relacionada

| Documento | Acción requerida | Estado |
|---|---|---|
| `docs/PLAN-MODELO-FUNCIONAL-INSPECCION-AMBIENTAL.md` | Marcar avance de Fase 2 | Pendiente |
