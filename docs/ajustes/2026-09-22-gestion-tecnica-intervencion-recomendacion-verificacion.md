# Ajuste: Gestión Técnica — IntervencionTecnica, ProgramacionVisita, RecomendacionTecnica, Compromiso, VerificacionCumplimiento

| Campo | Detalle |
|---|---|
| Fecha | 2026-09-22 |
| Estado | Validado localmente |
| Responsable | Claude Code (sesión con Jonathan Ochoa) |
| Áreas o roles impactados | Profesional Universitario, Técnico Operativo, Inspector Ambiental, Secretario de Despacho |
| Versión de despliegue | local (Docker, no desplegado a Dokploy) |

## Objetivo

Bloque 2 del cierre de los 28 BPMN de `config.json`: cubrir los 4 diagramas internos de Gestión Técnica — `medicion_v1.1.bpmn`, `informe_concepto_v1.1.bpmn`, `recomendaciones_tecnicas_compromisos_v1.1.bpmn` y `verificacion_v1.1.bpmn` — construyendo el modelo genérico que `domain.json` define para ellos.

## Alcance funcional

- El modelo fuente (`domain.json`) no trata "Visita", "Medición" e "Informe" como entidades separadas: define una única entidad genérica `IntervencionTecnica` (hija 1:N de `GestionTecnica`) con un campo `tipo` que distingue Visita/Medición/Revisión/Consulta/Informe/Recomendación/Compromiso/Verificación. `ProgramacionVisita` controla la programación/reprogramación de una intervención. `RecomendacionTecnica` y `Compromiso` documentan indicaciones/acuerdos que se originan en una intervención (o, en el caso de `Compromiso`, también directamente en un `Case`/`Expediente`). `VerificacionCumplimiento` registra el resultado de verificar cualquiera de esos elementos, o una `MedidaCorrectiva`/`OrdenPolicia` ya existente en el CRM.
- **Decisión de arquitectura clave** (confirmada con el usuario antes de construir): el CRM ya tenía `ActaVisita`, una entidad madura y en producción activa (numeración, generación de PDF, ~15 hooks) que no sigue el patrón genérico del modelo fuente. En vez de retrofitear `ActaVisita` para que cuelgue de `IntervencionTecnica` (fiel al modelo pero de alto riesgo sobre una pieza frágil del sistema), se optó por la alternativa segura: `IntervencionTecnica` se construyó como capa genérica nueva para Medición/Informe/Recomendación/Compromiso/Verificación, y se agregó a `ActaVisita` un campo **opcional** `intervencionTecnica` (link) sin tocar ningún campo, hook o comportamiento existente. Las visitas formales siguen funcionando exactamente igual; el cruce con el ledger genérico es opt-in.
- No se creó ninguna entidad separada para "Informe/Concepto Técnico": está cubierto por `IntervencionTecnica.tipo = "Informe"` + el campo `informeTecnicoDocumento`, tal como lo define `domain.json` (no hay una entidad `Informe` en el modelo fuente).

## Diseño y decisión técnica

- `IntervencionTecnica`: `gestionTecnica` (belongsTo, requerido), `tipo` (enum de 8 valores literales del modelo), `fechaSolicitud`/`fechaProgramada`/`fechaEjecucion`, `responsable`, `estado` (8 valores oficiales de `estados.md` sección 4, sin cambios), `resultado` (texto libre, sin catálogo cerrado en el modelo fuente), campos opcionales de metadatos ArcGIS Survey123 (`survey123FormId/SubmissionId/Url/FechaCaptura/Ubicacion`, tal cual `domain.json`), `informeTecnicoDocumento` (file), `anexos` (attachmentMultiple).
- `ProgramacionVisita`: `intervencionTecnica` (belongsTo, requerido), `fechaObjetivo`/`fechaProgramada`, `tipoProgramacion`, `responsable`, `motivoReprogramacion`, `estado`. **`tipoProgramacion` y `estado` son PROPUESTA_CRM**: `estados.md` no define un catálogo cerrado para esta entidad (solo aparece nombrada, sin estados oficiales).
- `RecomendacionTecnica` y `Compromiso`: comparten el enum de estado de la sección "5. ObligacionRecomendacion" de `estados.md` (Pendiente/En plazo/Vencida/En verificación/Cumplida/Parcial/No cumplida/No verificable/Cerrada) — es el nombre legado que usa el modelo para este seguimiento de cumplimiento, la nota del propio `estados.md` aclara "no confundir esta entidad técnica/operativa con `MedidaCorrectiva`".
  - `Compromiso.partes` se modeló como texto libre (no como relación estructurada) porque el modelo fuente no define un catálogo o entidad de "partes".
  - Ninguna de las dos entidades incluye `actuacionJuridicaId` del modelo fuente: `ActuacionJuridica` no existe todavía como entidad propia en el CRM (su equivalente funcional más cercano hoy es `Expediente`); se omitió en vez de inventar un link a una entidad inexistente. Es una brecha pendiente para cuando se decida construir `ActuacionJuridica` explícitamente.
- `VerificacionCumplimiento`: enlaces opcionales hacia `RecomendacionTecnica`, `Compromiso`, `MedidaCorrectiva` y `OrdenPolicia` (todas ya existentes), `ordenExternaReferencia` (varchar libre, porque el modelo fuente marca `ordenExternaId?` sin que exista una entidad "orden externa" en el CRM), `intervencionTecnica` (belongsTo, requerido), `resultado` (enum de 4 valores oficiales de `estados.md` sección 6).
- Reciprocidad agregada: `GestionTecnica.intervencionesTecnicas` (hasMany), `Case.compromisos` (hasMany), `Expediente.compromisos` (hasMany), `ActaVisita.intervencionTecnica` (belongsTo opcional, nuevo).

## Archivos afectados

| Acción | Ruta | Propósito |
|---|---|---|
| Creado (×5 entidades) | `Resources/metadata/entityDefs/<Nombre>.json`, `Entities/<Nombre>.php`, `Controllers/<Nombre>.php`, `Resources/metadata/scopes/<Nombre>.json`, `Resources/metadata/clientDefs/<Nombre>.json`, `Resources/i18n/es_ES/<Nombre>.json`, `Resources/layouts/<Nombre>/{detail,edit,filters,list,listSmall}.json` | Definición completa de `IntervencionTecnica`, `ProgramacionVisita`, `RecomendacionTecnica`, `Compromiso`, `VerificacionCumplimiento` |
| Modificado | `Resources/metadata/entityDefs/GestionTecnica.json`, `Resources/i18n/es_ES/GestionTecnica.json` | Link recíproco `intervencionesTecnicas` |
| Modificado | `Resources/metadata/entityDefs/ActaVisita.json`, `Resources/i18n/es_ES/ActaVisita.json` | Campo opcional `intervencionTecnica` (aditivo, sin tocar comportamiento existente) |
| Modificado | `Resources/metadata/entityDefs/Case.json`, `Resources/i18n/es_ES/Case.json` | Link recíproco `compromisos` |
| Modificado | `Resources/metadata/entityDefs/Expediente.json`, `Resources/i18n/es_ES/Expediente.json` | Link recíproco `compromisos` |
| Modificado | `scripts/roles/configure-roles-modelo-preliminar.php` | ACL: Profesional Universitario y Técnico Operativo (crea/edita propio), Inspector Ambiental (crea/edita todo), Secretario de Despacho (solo lectura) |
| Modificado | `scripts/configure-full-access-all-roles.php` | Agregadas las 5 entidades al `$scopes` de acceso completo (roles legacy) |

## Riesgos y dependencias

- `ActuacionJuridica` sigue sin existir como entidad CRM propia; `Compromiso` no puede vincularse todavía a ella (ver arriba). Cuando se construya, habrá que agregar el link.
- `ProgramacionVisita.tipoProgramacion`/`estado` son catálogos propuestos por el CRM, no confirmados en el modelo fuente — revisar si en una reunión de validación del modelo se define un catálogo oficial distinto.
- El campo nuevo `ActaVisita.intervencionTecnica` es opcional y no lo llena ningún hook automáticamente; es un cruce manual hasta que se decida automatizarlo.

## Validación

| Escenario probado | Resultado | Evidencia u observación |
|---|---|---|
| `php -l` sobre los 10 archivos PHP nuevos (dentro del contenedor) | Correcto | Sin errores de sintaxis |
| Validación JSON + ausencia de claves duplicadas en los 58 archivos tocados | Correcto | Verificado con `json.loads` y `object_pairs_hook` |
| `docker compose build && up --force-recreate` + revisión de logs | Correcto | Sin `ERROR`/`Exception`/`Fatal` en logs |
| `GET /api/v1/<Entidad>` para las 5 entidades nuevas | Correcto (200) tras aplicar ACL | Antes de aplicar ACL devolvía 403 esperado |
| Cadena completa: `Case` → crear `GestionTecnica` (usuario `profesional`) → `IntervencionTecnica` → `ProgramacionVisita` | Correcto | IDs reales encadenados |
| `IntervencionTecnica` → `RecomendacionTecnica` (con `Attachment` real para `documentoOrigen`) → `VerificacionCumplimiento` | Correcto | Validación `required` de `documentoOrigen` funciona; verificación referencia ambos padres |
| `Case` + `IntervencionTecnica` → `Compromiso` (con `Attachment` real) | Correcto | |
| `ActaVisita` existente → `PUT` agregando `intervencionTecnicaId` (usuario `inspeccion`) | Correcto (200) | Comportamiento previo de `ActaVisita` intacto |

## Despliegue y reversión

Desplegado en Docker local (`docker compose build espocrm && docker compose up -d --force-recreate espocrm espocrm-daemon espocrm-websocket`), luego `php clear_cache.php`/`rebuild.php` y re-ejecución de los scripts de ACL dentro del contenedor. Pendiente desplegar a Dokploy. Reversión: revertir el commit de este ajuste.

## Documentación relacionada

| Documento | Acción requerida | Estado |
|---|---|---|
| `docs/PLAN-MODELO-FUNCIONAL-INSPECCION-AMBIENTAL.md` | Marcar los 4 diagramas como ✅ en el inventario de 28 BPMN | Pendiente |
