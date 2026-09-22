# Ajuste: Fase 2 (Recursos Naturales) — entidad RemisionAutoridad

| Campo | Detalle |
|---|---|
| Fecha | 2026-09-22 |
| Estado | Validado localmente |
| Responsable | Claude Code (sesión con Jonathan Ochoa) |
| Áreas o roles impactados | Inspector Ambiental, Apoyo Jurídico, Secretario de Despacho |
| Versión de despliegue | local (Docker, no desplegado a Dokploy) |

## Objetivo

Primer paso de la Fase 2 (rutas jurídicas), empezando por Recursos Naturales · Competencia Municipal, según lo acordado con el usuario.

## Alcance funcional

Se investigó el BPMN activo (`07_RUTAS_JURIDICAS/recursos_naturales_municipal_v1.4.bpmn`) antes de programar. Hallazgo clave: esta ruta es, en esencia, un enrutador — consolida la visita, verifica si persiste la afectación, y el Inspector decide entre 3 caminos. Dos de esos tres caminos (Policiva/PVA y Ambiental Preventiva) son llamadas (`callActivity`) a otros procesos N2 que **todavía no están construidos** en el CRM (quedan para una próxima iteración de Fase 2); el tercero (cierre con Auto de Archivo) **ya existe** como `ActuoArchivo`. Lo único genuinamente nuevo de esta ruta es el desenlace de remisión a otra autoridad — se acordó con el usuario limitar el alcance de hoy a eso.

- Nueva entidad `RemisionAutoridad`: registra cuando el caso/expediente se remite a otra autoridad (oficio, anexos, fecha de recibido, número de expediente externo, estado de seguimiento).
- El campo `resultado` de `DecisionRutaJuridica` (creado en Fase 1) ya cubría, sin saberlo en ese momento, las 3 ramas exactas de esta compuerta del BPMN ("Ruta policiva", "Ruta Ambiental Preventiva / Remisión", "Remisión a otra autoridad") — no requirió cambios.

## Diseño y decisión técnica

- `RemisionAutoridad`: `case` (belongsTo, requerido), `expediente` (belongsTo, opcional), `autoridadDestino` (texto libre — no se modela como catálogo cerrado porque el modelo trata a las autoridades externas como actores sin registro interno propio), `fechaRemision`, `oficioDocumento` (file), `anexos` (attachmentMultiple), `fechaRecibido`, `numeroExpedienteExterno`, `estadoSeguimiento` (enum de 7 valores tomado literalmente de `RemisionAutoridad` en `domain.json`/`estados.md` del modelo), `observaciones`.
- El BPMN marca el "oficio a autoridad ambiental" como formato **POR SOLICITAR/VALIDAR** — no se hardcodeó ningún nombre de plantilla PDF; `oficioDocumento` es un adjunto genérico hasta que la Alcaldía confirme el formato oficial.
- ACL: `Inspector Ambiental` (crear/editar — es quien decide y ejecuta la remisión según el modelo) y `Apoyo Jurídico` (crear/editar — "prepara... oficios" según `matriz_roles_v1.0.md`) con permiso completo; `Secretario de Despacho` con solo lectura; el resto de roles operativos ya mapeados (Radicación, Patrullaje, Director Técnico) lo reciben vía `configure-full-access-all-roles.php` como las demás entidades del proyecto.
- Sin panel embebido en el Case (mismo criterio que `GestionTecnica`/`DecisionRutaJuridica`/`Destino`/`RelacionCasos` en Fase 1): se navega desde su propia lista/búsqueda estándar.

## Archivos afectados

| Acción | Ruta | Propósito |
|---|---|---|
| Creado | `Resources/metadata/entityDefs/RemisionAutoridad.json`, `Entities/RemisionAutoridad.php`, `Controllers/RemisionAutoridad.php` | Definición de la entidad (el Controller es obligatorio, ver Fase 1) |
| Creado | `Resources/metadata/scopes/RemisionAutoridad.json`, `clientDefs/RemisionAutoridad.json`, `layouts/RemisionAutoridad/*`, `i18n/es_ES/RemisionAutoridad.json` | Soporte estándar EspoCRM |
| Modificado | `Resources/metadata/entityDefs/Case.json`, `Expediente.json` | Link `remisionesAutoridad` (hasMany) |
| Modificado | `scripts/configure-full-access-all-roles.php` | Acceso amplio para los roles operativos ya mapeados |
| Modificado | `scripts/roles/configure-roles-modelo-preliminar.php` | ACL para Inspector Ambiental (crear/editar) y Secretario de Despacho (lectura) |
| Modificado | `scripts/roles/configure-role-juridica.php` | ACL para Apoyo Jurídico (crear/editar) |

## Riesgos y dependencias

- `autoridadDestino` es texto libre, no un catálogo — si más adelante se necesita reportería consistente, convendría normalizarlo a un enum o entidad de catálogo.
- Las otras 2 ramas de esta ruta (Policiva/PVA, Ambiental Preventiva) quedan sin subproceso propio hasta que se construyan como rutas jurídicas aparte.

## Validación

| Escenario probado | Resultado | Evidencia u observación |
|---|---|---|
| `GET /api/v1/RemisionAutoridad` (admin e inspector) | Correcto (200) | Confirmado con Controller incluido desde el primer deploy (no repitió el bug de Fase 1) |
| Crear un registro real con el usuario `inspector`, vinculado a un caso existente | Correcto | Respuesta 200 con el registro creado, `createdByName: "Inspector Ambiental"` |

## Despliegue y reversión

Desplegado en Docker local. Pendiente desplegar a Dokploy. Reversión: revertir los commits de este ajuste.

## Documentación relacionada

| Documento | Acción requerida | Estado |
|---|---|---|
| `docs/PLAN-MODELO-FUNCIONAL-INSPECCION-AMBIENTAL.md` | Marcar avance de Fase 2 | Pendiente |
