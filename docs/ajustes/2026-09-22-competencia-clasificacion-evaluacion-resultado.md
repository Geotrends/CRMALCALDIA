# Ajuste: Competencia y Clasificación (ya cubierto) + entidad EvaluacionResultado

| Campo | Detalle |
|---|---|
| Fecha | 2026-09-22 |
| Estado | Validado localmente |
| Responsable | Claude Code (sesión con Jonathan Ochoa) |
| Áreas o roles impactados | Profesional Universitario, Inspector Ambiental |
| Versión de despliegue | local (Docker, no desplegado a Dokploy) |

## Objetivo

Primer bloque de cierre de los BPMN N1 pendientes del plan (ver inventario completo de 28 diagramas). Se investigaron `competencia_clasificacion.bpmn` y `evaluacion_resultado_v1.1.bpmn` antes de programar.

## Alcance funcional

- **Competencia y Clasificación**: la investigación confirmó que el CRM **ya cubre este proceso completo, bajo otros nombres**, sin necesidad de ningún cambio:
  - `modalidadJuridica` del modelo ↔ `Case.cClaseIngreso` (Derecho de petición, PQRSD, Consulta, Querella, Denuncia, Oficio, Otro).
  - `tematicaAmbiental` del modelo ↔ `Case.cRecursoTema`/`cAsunto` (aire, fauna, flora, hídrico, suelo, residuos, etc.).
  - La remisión por incompetencia (total/parcial) ya tiene mecanismo: `Case.status = "Remitido por competencia"` + `RemisionAutoridad` (que ya admite crearse desde un `Case` sin `Expediente`, construida en la Fase 2).
  - No se creó ninguna entidad ni campo nuevo para este proceso.
- **Evaluación de Resultado y Definición de Ruta**: a diferencia de Competencia, el modelo (`domain.json`) sí define `EvaluacionResultado` como entidad propia y diferenciada de `DecisionRutaJuridica`, con el principio explícito: "separa el resultado técnico de la decisión jurídica... un estado técnico NO_CUMPLIDO no abre automáticamente un Expediente ni produce por sí mismo una sanción". Se construyó tal cual, con los 7 estados oficiales de `estados.md` y la relación 1:0..1 hacia `DecisionRutaJuridica` (se agregó el campo `evaluacionResultado` a la `DecisionRutaJuridica` ya existente).

## Diseño y decisión técnica

- `EvaluacionResultado`: `case` (belongsTo, requerido), `fecha`, `resultadoTecnico` (texto libre), `informacionSuficiente`/`situacionResuelta`/`recomiendaNuevaGestion`/`recomiendaEscalamiento` (booleanos, tal cual los campos exactos de `domain.json`), `responsableTecnico`, `observaciones`, `estado` (enum de 7 valores).
- `DecisionRutaJuridica.evaluacionResultado`: link opcional nuevo — opcional porque no toda decisión de ruta jurídica necesariamente proviene de una evaluación formal registrada (compatibilidad hacia atrás con las decisiones ya creadas en Fase 1/2 sin este campo).

## Archivos afectados

| Acción | Ruta | Propósito |
|---|---|---|
| Creado | `Resources/metadata/entityDefs/EvaluacionResultado.json`, `Entities/EvaluacionResultado.php`, `Controllers/EvaluacionResultado.php` | Definición de la entidad |
| Creado | `Resources/metadata/scopes/EvaluacionResultado.json`, `clientDefs/EvaluacionResultado.json`, `layouts/EvaluacionResultado/*`, `i18n/es_ES/EvaluacionResultado.json` | Soporte estándar EspoCRM |
| Modificado | `Resources/metadata/entityDefs/DecisionRutaJuridica.json`, `layouts/DecisionRutaJuridica/{detail,edit}.json`, `i18n/es_ES/DecisionRutaJuridica.json` | Campo `evaluacionResultado` |
| Modificado | `Resources/metadata/entityDefs/Case.json`, `i18n/es_ES/Case.json` | Link recíproco `evaluacionesResultado` |
| Modificado | `scripts/configure-full-access-all-roles.php`, `scripts/roles/configure-roles-modelo-preliminar.php` | ACL para Profesional Universitario (crea), Inspector Ambiental (crea/edita), Secretario de Despacho (lectura) |

## Riesgos y dependencias

- `resultadoTecnico` quedó como texto libre (no enum) porque `domain.json` no especifica valores cerrados para ese campo.
- Ninguna entidad/rol existente crea automáticamente una `EvaluacionResultado` al cerrar una `GestionTecnica` — hoy es un registro manual; automatizarlo sería un paso posterior si se decide.

## Validación

| Escenario probado | Resultado | Evidencia u observación |
|---|---|---|
| `GET /api/v1/EvaluacionResultado` | Correcto (200) | Controller incluido desde el primer deploy |
| Crear `EvaluacionResultado` → `DecisionRutaJuridica` vinculada por `evaluacionResultadoId` | Correcto | Cadena completa con el usuario `inspector` |

## Despliegue y reversión

Desplegado en Docker local. Pendiente desplegar a Dokploy. Reversión: revertir el commit de este ajuste.

## Documentación relacionada

| Documento | Acción requerida | Estado |
|---|---|---|
| `docs/PLAN-MODELO-FUNCIONAL-INSPECCION-AMBIENTAL.md` | Marcar avance | Pendiente |
