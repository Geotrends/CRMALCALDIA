# Ajuste: Fase 2 (PVA) — OrdenPolicia, MedidaCorrectiva, EjecucionMedidaCorrectiva, NotificacionActo, Recurso, MovimientoExpediente

| Campo | Detalle |
|---|---|
| Fecha | 2026-09-22 |
| Estado | Validado localmente |
| Responsable | Claude Code (sesión con Jonathan Ochoa) |
| Áreas o roles impactados | Inspector Ambiental, Apoyo Jurídico, Secretario de Despacho |
| Versión de despliegue | local (Docker, no desplegado a Dokploy) |

## Objetivo

Completa el N2 de Proceso Verbal Abreviado · Convivencia, que quedó a medias en el ajuste anterior (solo el trío de audiencia). Se investigaron los 5 BPMN N3 restantes antes de programar: `determinacion_medidas_correctivas_v1.2.bpmn`, `gestion_ejecucion_medidas_correctivas_v1.0.bpmn`, `orden_policia_cumplimiento_v1.0.bpmn`, `notificacion_ejecutoria_v1.0.bpmn`, `recursos_segunda_instancia_v1.1.bpmn`.

## Alcance funcional

6 entidades nuevas:
- `OrdenPolicia` — mandato de autoridad de Policía, independiente de `MedidaCorrectiva` (pueden coexistir en la misma decisión, el BPMN es explícito en que son figuras distintas).
- `MedidaCorrectiva` — catálogo de tipos tomado literalmente de la anotación de texto del BPMN de determinación (Amonestación, Multa General tipos 1-4, Multa especial por ruido, Suspensión temporal/definitiva, Decomiso, Destrucción, Inutilización, Restitución, Disolución de reunión).
- `EjecucionMedidaCorrectiva` — el BPMN es explícito: "el módulo de ejecución posterior no puede añadir medidas nuevas", solo ejecuta lo ya definido en `MedidaCorrectiva`.
- `NotificacionActo` — de la notificación de un acto (personal/aviso/estrados/otro) hasta su firmeza o el disparo hacia `Recurso` si se interpone uno.
- `Recurso` — reposición/apelación, con el flujo completo hasta segunda instancia.
- `MovimientoExpediente` — **hallazgo no anticipado**: el BPMN de Recursos y Segunda Instancia (v1.1) instruye explícitamente "Crear MovimientoExpediente" al remitir el expediente físico a segunda instancia, y "Cerrar MovimientoExpediente" al recibir la devolución — es requisito explícito del propio BPMN, no una entidad opcional.

## Diseño y decisión técnica

- Todo el diseño se construyó a partir de 3 investigaciones paralelas de los BPMN N3 (ver hallazgos abajo) más los campos ya confirmados de `domain.json` en sesiones anteriores. La construcción mecánica (42 archivos siguiendo el patrón ya establecido) se delegó a un agente con las especificaciones exactas ya cerradas; se verificó el resultado (JSON válido, PHP balanceado, Controllers presentes) antes de desplegar.
- **Vacíos reales del modelo fuente, no inventados por decisión propia**:
  - `estados.md` no define catálogo de estados para `OrdenPolicia`. Se propuso uno basado en la narrativa del propio BPMN (Registrada, Notificada, En seguimiento, Cumplida/Ejecutada, Incumplida, En valoración jurídica) — marcado como propuesta, no oficial.
  - Ninguno de los 5 BPMN usa `callActivity` de forma consistente: el de Orden de Policía y el de Determinación de Medidas no tienen ninguno (las referencias a otros procesos son solo texto en `documentation`); el de Gestión y Ejecución sí tiene 2 (`callActivity` a Tesorería y a "N2 · Verificación de Cumplimiento", este último no modelado todavía).
  - `formatos.json` no tiene ninguna entrada para "determinacion-medidas" ni "medidas-correctivas" — no hay formato IV-F confirmado asociado a estos dos procesos todavía.
- **Se agregó `recurso` (opcional) a `MovimientoExpediente`**, aunque `domain.json` solo define `expedienteId` — es una adición de bajo riesgo para trazabilidad directa (qué recurso originó el movimiento), señalada explícitamente como desviación menor.
- **Se difirieron `ReporteRNMC` y `VerificacionCumplimiento`**: ambas están relacionadas con `MedidaCorrectiva`/`OrdenPolicia` en `domain.json`, pero `ReporteRNMC` ya estaba planeado para la Fase 3 (RNMC) del plan general, y `VerificacionCumplimiento` tiene una dependencia obligatoria (`intervencionTecnicaId` no opcional) que requiere resolver antes de modelarla — no se improvisó una solución.

## Archivos afectados

49 archivos (42 nuevos de las 6 entidades — `entityDefs`, `Entities`, `Controllers`, `scopes`, `clientDefs`, `layouts/{detail,edit,list,listSmall,filters}`, `i18n` por cada una — más `Case.json`/`Expediente.json` y sus i18n con los links recíprocos, más los 3 scripts de ACL). Detalle completo navegable en el commit de este ajuste.

## Riesgos y dependencias

- Los estados propuestos para `OrdenPolicia` no tienen respaldo oficial en el modelo fuente — deben validarse.
- `VerificacionCumplimiento` (mencionada en 2 de los 3 reportes de investigación como entidad relacionada) sigue sin construirse — hoy `requiereVerificacion` es solo un booleano en `OrdenPolicia`/`MedidaCorrectiva`, sin un registro estructurado del resultado de esa verificación.
- El callActivity a "N2 · Verificación de Cumplimiento" (Gestión y Ejecución de Medidas) y el `calledElement` de Tesorería no se modelaron todavía.

## Validación

| Escenario probado | Resultado | Evidencia u observación |
|---|---|---|
| Las 6 entidades responden `GET .../api/v1/<Entidad>` | Correcto (200) | Sin el bug de Fase 1 (Controllers incluidos desde el primer deploy) |
| `MedidaCorrectiva` → `EjecucionMedidaCorrectiva` (con adjunto real como `documentoOrigen`) | Correcto | Cadena completa creada con el usuario `inspector` |
| `Recurso` → `MovimientoExpediente` (escenario de remisión a segunda instancia) | Correcto | Cadena completa creada, incluyendo el link `recurso` en el movimiento |

## Despliegue y reversión

Desplegado en Docker local. Pendiente desplegar a Dokploy. Reversión: revertir el commit de este ajuste.

## Documentación relacionada

| Documento | Acción requerida | Estado |
|---|---|---|
| `docs/PLAN-MODELO-FUNCIONAL-INSPECCION-AMBIENTAL.md` | Marcar Fase 2 (PVA) como completa; anotar pendientes de VerificacionCumplimiento/ReporteRNMC | Pendiente |
