# Ajuste: Proceso Verbal Inmediato de Policía — OrdenComparendo, ActuacionPoliciaInmediata

| Campo | Detalle |
|---|---|
| Fecha | 2026-09-22 |
| Estado | Validado localmente |
| Responsable | Claude Code (sesión con Jonathan Ochoa) |
| Áreas o roles impactados | Patrullero Ambiental, Inspector Ambiental, Secretario de Despacho |
| Versión de despliegue | local (Docker, no desplegado a Dokploy) |

## Objetivo

Bloque 3 del cierre de los 28 BPMN de `config.json`: cubrir `proceso_verbal_inmediato_v1.0.bpmn` (Ley 1801/2016 art. 222 + Decreto 768/2025), el proceso que adelanta un patrullero de Policía en el sitio de los hechos, independiente del Proceso Verbal Abreviado (PVA).

## Alcance funcional

- Flujo: un patrullero atiende un hecho contrario a la convivencia, identifica al presunto infractor, escucha descargos, intenta mediación. Si no se resuelve, impone `OrdenPolicia` y/o `MedidaCorrectiva` — **entidades ya existentes**, construidas para el PVA. Puede existir un antecedente `OrdenComparendo`. Toda actuación se documenta en el formato oficial de convivencia (Decreto 768/2025, documento externo). Si hay apelación, se resuelve en segunda instancia con plazos de 24h (remisión) y 3 días hábiles (resolución, art. 222).
- **Reutilización confirmada por el modelo fuente, no diseño propio**: `domain.json` ya incluye en los campos de `OrdenPolicia` y `MedidaCorrectiva` un origen alternativo `actuacionPoliciaInmediataId?` (junto al origen PVA), y las relaciones declaran explícitamente que `ActuacionPoliciaInmediata` "puede emitir" `OrdenPolicia` y "puede imponer" `MedidaCorrectiva`. Por lo tanto NO se duplicaron esas entidades: se les agregó únicamente el link opcional de origen faltante.
- **Apelación reutiliza `Recurso`** (ya construido para el PVA), siguiendo la nota del propio modelo fuente ("la apelación del PVI entra a Segunda Instancia, no a un PVA nuevo"). No se creó un mecanismo de apelación paralelo.
- Como el PVI no siempre abre `Expediente` formal (es una actuación rápida de policía en sitio), se relajó la restricción `required` del campo `expediente` en `MedidaCorrectiva` y en `Recurso` (antes obligatorio) y se les agregó un campo `case` opcional, para que puedan registrarse directamente contra el `Case` sin depender de que exista un `Expediente`. `OrdenPolicia` ya admitía `case` opcional desde su construcción original en el PVA, no requirió cambios.
- `OrdenComparendo` y `ActuacionPoliciaInmediata` son entidades completamente nuevas (no existían en el CRM ni tenían equivalente).

## Diseño y decisión técnica

- `OrdenComparendo`: `case` (opcional), `numeroComparendo`, `fecha` (requerido), `autoridadEmisora` (belongsTo User, requerido), `comportamientoCodigo`, `documento` (file, soporte externo de Policía), `referenciaRNMC`, `estado` (enum PROPUESTA_CRM: Registrado/Vinculado a actuación/Anulado — `estados.md` no define catálogo oficial para esta entidad).
- `ActuacionPoliciaInmediata`: `case` (opcional), `ordenComparendo` (opcional, antecedente), `fechaInicio`, `autoridad` (belongsTo User, requerido), `conducta`, `descargos`, `mediacionUtilizada` (bool), `resultado` (enum requerido: Resuelta por mediación / Con medida correctiva u orden de policía / Sin resolver), `ordenPolicia` (opcional, belongsTo la entidad ya existente), `medidaCorrectiva` (opcional, belongsTo la entidad ya existente), `documentoConvivencia` (file, requerido, formato oficial Decreto 768/2025), `apelacion` (opcional, belongsTo `Recurso`), `estado` (enum PROPUESTA_CRM: Iniciada/En mediación/Resuelta por mediación/Con medida impuesta/En apelación/Apelación resuelta/Trasladada a PVA por incumplimiento/Cerrada — sin catálogo oficial en `estados.md`).
- `MedidaCorrectiva` y `Recurso`: `expediente` pasó de `required: true` a `required: false` (compatible hacia atrás, los registros existentes conservan su expediente); se agregó `case` opcional a ambas, y `actuacionPoliciaInmediata` (belongsTo en `MedidaCorrectiva`; en `Recurso` solo el link recíproco de solo lectura `actuacionesPoliciaInmediata`, ya que el `belongsTo` vive del lado de `ActuacionPoliciaInmediata.apelacion`).
- `OrdenPolicia`: se agregó únicamente el link opcional `actuacionPoliciaInmediata`; no requirió ningún otro cambio porque ya admitía `case` opcional.

## Archivos afectados

| Acción | Ruta | Propósito |
|---|---|---|
| Creado (×2 entidades) | `Resources/metadata/entityDefs/<Nombre>.json`, `Entities/<Nombre>.php`, `Controllers/<Nombre>.php`, `Resources/metadata/scopes/<Nombre>.json`, `Resources/metadata/clientDefs/<Nombre>.json`, `Resources/i18n/es_ES/<Nombre>.json`, `Resources/layouts/<Nombre>/{detail,edit,filters,list,listSmall}.json` | Definición de `OrdenComparendo` y `ActuacionPoliciaInmediata` |
| Modificado | `Resources/metadata/entityDefs/MedidaCorrectiva.json`, `Resources/i18n/es_ES/MedidaCorrectiva.json` | `expediente` opcional, campos `case`/`actuacionPoliciaInmediata` |
| Modificado | `Resources/metadata/entityDefs/OrdenPolicia.json`, `Resources/i18n/es_ES/OrdenPolicia.json` | Campo `actuacionPoliciaInmediata` |
| Modificado | `Resources/metadata/entityDefs/Recurso.json`, `Resources/i18n/es_ES/Recurso.json` | `expediente` opcional, campo `case`, link recíproco `actuacionesPoliciaInmediata` |
| Modificado | `Resources/metadata/entityDefs/Case.json`, `Resources/i18n/es_ES/Case.json` | Links recíprocos `ordenesComparendo`, `actuacionesPoliciaInmediata`, `medidasCorrectivas`, `recursos` |
| Modificado | `scripts/roles/configure-roles-modelo-preliminar.php` | ACL Inspector Ambiental (crea/edita todo), Secretario de Despacho (lectura) |
| Modificado | `scripts/roles/configure-role-patrullaje.php` | ACL Patrullero Ambiental: crea/edita propio en `ActuacionPoliciaInmediata`, `OrdenComparendo`, `OrdenPolicia`, `MedidaCorrectiva` |
| Modificado | `scripts/configure-full-access-all-roles.php` | Agregadas las 2 entidades nuevas al `$scopes` de acceso completo |

## Riesgos y dependencias

- `OrdenComparendo.estado` y `ActuacionPoliciaInmediata.estado` son catálogos PROPUESTA_CRM (sin respaldo en `estados.md`) — a validar si en una reunión de modelo se define un catálogo oficial.
- Relajar `expediente` a opcional en `MedidaCorrectiva`/`Recurso` es retrocompatible (no afecta registros existentes) pero amplía el alcance de esas entidades — cualquier hook o reporte futuro que asuma `expediente` siempre presente debe revisarse (hoy ninguno de los dos tiene hooks propios).
- El campo `apelacion` en `ActuacionPoliciaInmediata` requiere que el usuario tenga ACL sobre `Recurso` para poder vincularlo — en la prueba, el usuario `patrullaje` no pudo actualizar ese campo (403 esperado, correcto: la apelación la resuelve Inspector, no el patrullero).

## Validación

| Escenario probado | Resultado | Evidencia u observación |
|---|---|---|
| `php -l` sobre los 4 archivos PHP nuevos (dentro del contenedor) | Correcto | Sin errores de sintaxis |
| Validación JSON + ausencia de claves duplicadas en los 26 archivos tocados | Correcto | Verificado con `json.loads` y `object_pairs_hook` |
| `docker compose build && up --force-recreate` + revisión de logs | Correcto | Sin `ERROR`/`Exception`/`Fatal` |
| `GET /api/v1/<Entidad>` para las 2 entidades nuevas (usuario `patrullaje`) | Correcto (200) tras aplicar ACL | |
| `Case` → `OrdenComparendo` → `ActuacionPoliciaInmediata` (usuario `patrullaje`) | Correcto | IDs reales encadenados |
| `ActuacionPoliciaInmediata` → `OrdenPolicia` reutilizada (sin `Expediente`, con `actuacionPoliciaInmediataId`) | Correcto | |
| `ActuacionPoliciaInmediata` → `MedidaCorrectiva` reutilizada (sin `Expediente`, con `actuacionPoliciaInmediataId`) | Correcto | Validaciones `required` existentes (`comportamientoCodigo`, `sujetoObligado`, etc.) siguen funcionando |
| `Recurso` (apelación) creado sin `Expediente`, vinculado como `apelacionId` en `ActuacionPoliciaInmediata` (usuario `inspector`) | Correcto | Usuario `patrullaje` recibió 403 esperado al intentar vincular la apelación (no tiene ACL sobre `Recurso`) |

## Despliegue y reversión

Desplegado en Docker local (`docker compose build espocrm && docker compose up -d --force-recreate espocrm espocrm-daemon espocrm-websocket`), `php clear_cache.php`/`rebuild.php`, y re-ejecución de los scripts de ACL (`configure-roles-modelo-preliminar.php`, `configure-role-patrullaje.php`, `configure-full-access-all-roles.php`) dentro del contenedor. Pendiente desplegar a Dokploy. Reversión: revertir el commit de este ajuste.

## Documentación relacionada

| Documento | Acción requerida | Estado |
|---|---|---|
| `docs/PLAN-MODELO-FUNCIONAL-INSPECCION-AMBIENTAL.md` | Marcar "Proceso Verbal Inmediato de Policía" como ✅ en el inventario de 28 BPMN | Pendiente |
