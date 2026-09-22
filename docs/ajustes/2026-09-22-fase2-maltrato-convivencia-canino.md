# Ajuste: Fase 2 — Convivencia Animal, Registro/Permiso Canino, Maltrato Animal

| Campo | Detalle |
|---|---|
| Fecha | 2026-09-22 |
| Estado | Validado localmente |
| Responsable | Claude Code (sesión con Jonathan Ochoa) |
| Áreas o roles impactados | Inspector Ambiental, Auxiliar Administrativo · Receptor |
| Versión de despliegue | local (Docker, no desplegado a Dokploy) |

## Objetivo

Cierra la Fase 2 del plan: las 3 rutas de fauna/animales, deliberadamente separadas en el modelo aunque suenen parecidas. Se investigaron los 4 BPMN activos antes de programar: `conductas_convivencia_animales_v1.0.bpmn`, `registro_permiso_canino_manejo_especial_v1.0.bpmn`, `proceso_verbal_maltrato_animal_v1.0.bpmn` y su N3 `audiencia_maltrato_animal_v1.0.bpmn`.

## Alcance funcional

- **Conductas de Convivencia Relacionadas con Animales**: la investigación confirmó que es puramente un clasificador — el propio BPMN dice "Sustituye la denominación ambigua 'Tenencia Animal'" y termina abriendo el Proceso Verbal Abreviado ya construido. **No requiere entidad nueva.**
- **Registro y Permiso de Canino de Manejo Especial**: `domain.json` ya tenía el modelo de datos completo (`RegistroCaninoManejoEspecial` 1:0..1 desde Case, `PermisoCaninoManejoEspecial` 1:0..N desde el registro — las renovaciones se modelan como nuevos permisos, no sobrescribiendo fechas). Se construyó tal cual.
- **Proceso Verbal de Maltrato Animal**: **vacío real del modelo fuente** — `domain.json` no define ninguna entidad para esto, solo lo describe el BPMN en prosa. Se diseñó `ActuacionMaltratoAnimal` a partir de la narrativa del BPMN, reutilizando entidades ya existentes en vez de duplicar: la remisión a Fiscalía/GELMA usa `RemisionAutoridad` (con `autoridadDestino = "Fiscalía / GELMA"`), y la audiencia reutiliza `Audiencia` con un nuevo valor de `tipoProceso` — el propio `domain.json` dice explícitamente que el campo `tipoProceso` de `Audiencia` existe justo para "no mezclar verbal abreviado y maltrato animal".

## Diseño y decisión técnica

- `ActuacionMaltratoAnimal` distingue la clasificación jurídica que el BPMN exige mantener separada: **Maltrato leve / Posible delito / Concurrencia**. El campo `efectosDecision` (texto libre) documenta explícitamente que las sanciones de este régimen (Ley 2455/2025) **no son una `MedidaCorrectiva`** de Ley 1801 — el propio BPMN lo advierte dos veces ("No convertir sanciones de Ley 2455 en MedidaCorrectiva de Ley 1801").
- La aprehensión material preventiva se modela como campos dentro de `ActuacionMaltratoAnimal` (no como entidad aparte) porque el BPMN la trata como un paso documental temprano del mismo caso, distinto y anterior a la clasificación jurídica de fondo — no se identificó una necesidad de trazabilidad independiente que justificara una entidad propia.
- **FILMA**: confirmado en 3 lugares del repo fuente (documentación del proceso, tarea de remisión, y `rules.json`) que es un término mencionado en una reunión municipal, explícitamente marcado "POR VALIDAR" y "no se adopta como término jurídico oficial", sin definición de su significado en ningún archivo. **No se creó ningún campo ni catálogo "FILMA"** — se usa "Fiscalía / GELMA" como valor real en `RemisionAutoridad.autoridadDestino`.
- Se extendió el enum `Audiencia.tipoProceso` con la opción "Proceso Verbal de Maltrato Animal", en vez de crear `AudienciaMaltratoAnimal`/`SuspensionAudienciaMaltratoAnimal`/`GrabacionAudienciaMaltratoAnimal` separadas — sigue la intención explícita de `domain.json`, aunque el BPMN de esta audiencia específica es más simple que el del PVA (no modela "primera inasistencia con 3 días" como paso propio; delega el control de suspensión "a la ruta principal").
- **Hallazgo corregido en el camino**: al agregar el rol `Auxiliar Administrativo · Receptor` para el trámite canino, se detectó que el array PHP de `configure-roles-modelo-preliminar.php` iba a quedar con la clave `'Auxiliar Administrativo · Receptor'` duplicada (PHP no da error, la segunda definición silenciosamente reemplaza la primera) — se corrigió fusionando en la definición original antes de desplegar.

## Archivos afectados

| Acción | Ruta | Propósito |
|---|---|---|
| Creado | `Resources/metadata/entityDefs/{RegistroCaninoManejoEspecial,PermisoCaninoManejoEspecial,ActuacionMaltratoAnimal}.json`, `Entities/*.php`, `Controllers/*.php` | Definición de las 3 entidades (Controllers obligatorios, ver Fase 1) |
| Creado | `Resources/metadata/scopes/*`, `clientDefs/*`, `layouts/{...}/*`, `i18n/es_ES/{...}.json` | Soporte estándar EspoCRM |
| Modificado | `Resources/metadata/entityDefs/Audiencia.json`, `i18n/es_ES/Audiencia.json` | Nuevo valor de `tipoProceso` para reutilizar la audiencia en maltrato animal |
| Modificado | `Resources/metadata/entityDefs/Case.json`, `Expediente.json` | Links recíprocos |
| Modificado | `scripts/configure-full-access-all-roles.php` | Acceso amplio para los roles operativos ya mapeados |
| Modificado | `scripts/roles/configure-roles-modelo-preliminar.php` | ACL para Inspector Ambiental (crear/editar las 3) y Auxiliar Administrativo · Receptor (crear registro canino); corregido el bug de clave duplicada detectado en el camino |

## Riesgos y dependencias

- `ActuacionMaltratoAnimal` es diseño propio (no está en `domain.json`) — debe validarse con la Alcaldía antes de considerarse definitivo, igual que los estados propuestos para `OrdenPolicia`/`SuspensionAudiencia` en ajustes anteriores.
- El ACL del trámite canino solo cubre Inspector Ambiental (decide) y Auxiliar Administrativo · Receptor (recibe) — los pasos intermedios de verificación de requisitos (RPC03) del BPMN no tienen un rol operativo claro asignado todavía en el CRM.

## Validación

| Escenario probado | Resultado | Evidencia u observación |
|---|---|---|
| Las 3 entidades responden `GET .../api/v1/<Entidad>` | Correcto (200) | Sin el bug de Fase 1 (Controllers incluidos desde el primer deploy) |
| `RegistroCaninoManejoEspecial` → `PermisoCaninoManejoEspecial` (con adjunto real) | Correcto | Cadena completa con el usuario `inspector` |
| `ActuacionMaltratoAnimal` con clasificación "Posible delito" + aprehensión preventiva + `RemisionAutoridad` a "Fiscalía / GELMA" | Correcto | Escenario completo del BPMN reproducido de punta a punta |

## Despliegue y reversión

Desplegado en Docker local. Pendiente desplegar a Dokploy. Reversión: revertir el commit de este ajuste.

## Documentación relacionada

| Documento | Acción requerida | Estado |
|---|---|---|
| `docs/PLAN-MODELO-FUNCIONAL-INSPECCION-AMBIENTAL.md` | Marcar Fase 2 como completa | Pendiente |
