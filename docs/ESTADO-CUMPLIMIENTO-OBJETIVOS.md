# Estado de cumplimiento — CRM Ambiental Alcaldía de Envigado

**Referencia:** propuesta técnica vs. implementación actual  
**Alcance:** objetivos 1 a 22  
**Entorno de referencia:** EspoCRM custom en Docker (`http://localhost:8080`)  
**Datos al momento de la revisión:** 7 casos, 3 actas de visita, 3 plantillas documentales, 5 usuarios operativos

---

## Leyenda de estado

| Estado | Significado |
|--------|-------------|
| **Listo** | Implementado y operativo |
| **Parcial** | Existe, pero incompleto |
| **Pendiente** | No implementado o no iniciado |
| **Proceso** | Depende de capacitación, actas, firmas u otra gestión no técnica |

**Columna «Qué falta»:** solo se rellena en actividades **Parcial** o **Pendiente**. En **Listo** aparece «—».

---

# Bloque 1 — Objetivos 1 a 9

## Objetivo 1 — Diseñar la estructura técnica del CRM ambiental

**Estado general:** Parcial

### Actividades

| Actividad | Estado | Qué hay hoy en el CRM | Qué falta |
|-----------|--------|------------------------|-----------|
| Crear modelo entidad-relación | Parcial | Modelo en código: Case, Contact, Account, ActaVisita, ActuoArchivo, ComunicacionCaso, AsignacionHistorial, Document, Meeting, Task, Team, User. | Diagrama ER formal publicado como entregable del proyecto. |
| Definir auditoría de cambios | Parcial | Stream nativo, createdAt/modifiedBy, campos con audited en hooks. | Política de auditoría escrita (qué se audita, retención, quién consulta). |
| Definir tablas de casos, terceros, documentos, comunicaciones y estados | Listo | Tablas operativas incluyendo ComunicacionCaso y AsignacionHistorial. | — |
| Definir relaciones y permisos | Listo | Roles, hooks ACL, filtros por rol, scripts configure-*. | — |


---

## Objetivo 2 — Crear el módulo de registro de casos ambientales

**Estado general:** Parcial

### Actividades

| Actividad | Estado | Qué hay hoy en el CRM | Qué falta |
|-----------|--------|------------------------|-----------|
| Diseñar formulario de caso | Listo | Formulario completo: peticionario, infractor, queja, Excel Alcaldía, radicación, etc. | — |
| Validar campos obligatorios | Listo | Hooks al guardar (solicitud completa, tipos de persona, enums). | — |
| Asociar caso a tercero y dependencia | Parcial | Tercero vía Contact/Account y lookup por cédula/NIT. Tema/recurso, zona y equipos en el caso. | Entidad o catálogo formal de **Dependencia** institucional (hoy solo campos en Case). |
| Guardar historial inicial | Listo | Stream, notificación al crear, estado inicial automático. | — |


---

## Objetivo 3 — Capacitar a funcionarios en operación del CRM ambiental

**Estado general:** Proceso

### Actividades

| Actividad | Estado | Qué hay hoy | Qué falta |
|-----------|--------|-------------|-----------|
| Crear caso piloto | Listo | Sistema operativo con casos reales en BD. | — |
| Cambiar estados | Listo | 8 estados del flujo configurados. | — |
| Cargar documentos | Parcial | PDFs automáticos (solicitud, acta, actuo) al guardar. | Flujo cómodo para **subir anexos libres** (fotos, oficios escaneados) como gestión documental abierta. |
| Registrar comunicaciones | Listo | Panel Comunicaciones (ComunicacionCaso): tipos, destinatario, registro. | — |
| Revisar dashboards y reportes PDF | Listo | Tablero Chart.js; PDFs por formato; reporte gerencial PDF/Excel en tablero. | — |


---

## Objetivo 4 — Permitir asignar responsables internos a cada caso ambiental

**Estado general:** Listo

### Actividades

| Actividad | Estado | Qué hay hoy | Qué falta |
|-----------|--------|-------------|-----------|
| Definir roles internos | Listo | Inspección, Radicación, Asignador, Patrullero. | — |
| Implementar campo responsable | Listo | assignedUser con lógica post-radicación. | — |
| Registrar asignaciones y reasignaciones | Listo | Notificación, AsignacionHistorial, motivo de reasignación, pestaña Asignador. | — |
| Filtrar casos por responsable | Listo | misCasos, ACL patrullero, dashboard filtrado. | — |


---

## Objetivo 5 — Crear trazabilidad cronológica integral por caso

**Estado general:** Parcial

### Actividades

| Actividad | Estado | Qué hay hoy | Qué falta |
|-----------|--------|-------------|-----------|
| Registrar eventos automáticos | Parcial | Hooks de estado, notificaciones, PDFs, comunicaciones. | **Log unificado** de eventos (una sola tabla/vista cronológica automática, no repartida en paneles). |
| Mostrar línea de tiempo por caso | Listo | Panel «Línea de tiempo» en detalle del caso. | — |
| Incluir cambios de estado, documentos y comunicaciones | Listo | Estados, formatos/PDFs y panel ComunicacionCaso. | — |
| Validar trazabilidad con caso piloto | Listo | Probado en casos reales del entorno. | — |


---

## Objetivo 6 — Implementar control de tiempos y vencimientos

**Estado general:** Parcial

### Actividades

| Actividad | Estado | Qué hay hoy | Qué falta |
|-----------|--------|-------------|-----------|
| Definir reglas por tipo de caso y estado | Parcial | Alertas por cFechaVencimiento (vencido / ≤3 días). | Reglas **documentadas y diferenciadas** por tipo de trámite o estado (no solo fecha única). |
| Implementar semáforos | Listo | Dashboard con semáforo de vencimiento. | — |
| Crear alertas internas | Listo | Notificaciones + job diario CheckCaseVencimientoAlerts. | — |
| Probar casos vencidos, próximos y al día | Listo | Semáforo, alertas y job operativos con casos reales. | — |


---

## Objetivo 7 — Configurar notificaciones del CRM

**Estado general:** Parcial

### Actividades

| Actividad | Estado | Qué hay hoy | Qué falta |
|-----------|--------|-------------|-----------|
| Definir eventos notificables | Listo | Nueva solicitud, radicado, asignación, vencimiento, finalizado. | — |
| Crear plantillas de mensaje | Parcial | Mensajes en hooks PHP y vista custom de notificaciones (campana). | **Matriz formal** de plantillas (texto estándar por evento, variables, canal campana/email). |
| Configurar destinatarios | Listo | Por rol/usuario en hooks. | — |
| Probar notificaciones internas y externas | Parcial | Campana operativa en todos los eventos clave. | Email externo depende de **SMTP** configurado; no probado end-to-end por correo. |


---

## Objetivo 8 — Implementar gestión documental del CRM

**Estado general:** Parcial

### Actividades

| Actividad | Estado | Qué hay hoy | Qué falta |
|-----------|--------|-------------|-----------|
| Definir tipos documentales | Listo | Formato solicitud, Acta de visita, Actuo archivo. | — |
| Cargar archivos por caso | Parcial | PDFs generados automáticamente al guardar. | Carga manual **estandarizada** de otros tipos de archivo (anexos, evidencias). |
| Indexar documentos | Parcial | Categorías + adjuntos nativos EspoCRM. | Índice/búsqueda documental **avanzada** (metadatos institucionales, palabras clave). |
| Organizar docs técnicos y administrativos | Parcial | Módulo Documentos + PDFs en cada caso. | Clasificación explícita **técnico vs administrativo** (carpetas, reglas o tipos dedicados). |
| Validar consulta y descarga | Listo | Entry points PDF + listado Documentos. | — |


---

## Objetivo 9 — Verificar relación técnica con sistemas institucionales

**Estado general:** Pendiente

### Actividades

| Actividad | Estado | Qué hay hoy | Qué falta |
|-----------|--------|-------------|-----------|
| Identificar sistemas relacionados | Pendiente | — | Documento de análisis de sistemas institucionales relacionados. |
| Definir integraciones o restricciones | Parcial | Export/sync Excel Alcaldía; formulario web referenciado como caído. | Mapa formal de integraciones, restricciones y responsables técnicos. |
| Documentar no conflicto | Pendiente | — | Informe o acta de no conflicto con otros sistemas. |
| Validar con responsables técnicos | Pendiente | — | Sesión/revisión firmada con responsables TI institucionales. |


---

# Bloque 2 — Objetivos 10 a 19

## Objetivo 10 — Validar el CRM con usuarios reales internos

**Estado general:** Proceso

### Actividades

| Actividad | Estado | Qué hay hoy en el CRM | Qué falta |
|-----------|--------|------------------------|-----------|
| Preparar casos de prueba | Parcial | 7 casos, 3 actas, 5 usuarios operativos (juan, edwin, julian, 2 patrulleros). | Paquete **formal de casos UAT** (escenarios escritos con datos y resultado esperado). |
| Ejecutar sesión UAT | Pendiente | — | Acta o registro de sesión UAT con usuarios reales. |
| Registrar hallazgos | Pendiente | — | Matriz de hallazgos (bug, mejora, observación). |
| Priorizar ajustes | Pendiente | Ajustes hechos en desarrollo iterativo. | Priorización **formal** post-UAT (crítico / medio / bajo). |
| Cerrar errores críticos | Parcial | Varios bugs corregidos (radicado, notificaciones, documentos, equipos). | Trazabilidad UAT: qué error se cerró, cuándo y quién validó. |


---

## Objetivo 11 — Preparar procedimiento de migración de datos previos al CRM

**Estado general:** Parcial

### Actividades

| Actividad | Estado | Qué hay hoy en el CRM | Qué falta |
|-----------|--------|------------------------|-----------|
| Identificar fuentes previas | Parcial | Excel Alcaldía, scripts backup/restore/purge. | Inventario **formal** de fuentes legacy (Excel, BD vieja, archivos, etc.). |
| Definir plantilla de carga | Pendiente | — | Plantilla estándar CSV/Excel para migración masiva de casos y terceros. |
| Definir reglas de limpieza | Parcial | Scripts migrate-drop, purge-crm-data. | Procedimiento escrito de limpieza y validación pre-carga. |
| Definir procedimiento de carga y validación | Pendiente | — | Plan de migración con piloto, rollback y checklist de validación. |


---

## Objetivo 12 — Centralizar actuaciones por tercero en una vista única

**Estado general:** Listo

### Actividades

| Actividad | Estado | Qué hay hoy en el CRM | Qué falta |
|-----------|--------|------------------------|-----------|
| Definir datos del tercero | Listo | Contact y Account con documento, barrio, municipio, NIT. | — |
| Relacionar casos con tercero | Listo | SyncPeticionarioToContact, SyncPerjudicanteParty, buscarParte, paneles casos-relacion. | — |
| Crear vista consolidada de historial | Listo | Panel **Expediente único** en detalle Contact/Account: KPIs, casos vinculados, línea de tiempo (casos, actas, comunicaciones, actuos) vía PartyExpedienteService. | — |
| Validar consulta persona natural y jurídica | Listo | Tipos de persona y búsqueda por documento operativos. | — |


---

## Objetivo 13 — Mejorar calidad de datos y evitar duplicidad de registros

**Estado general:** Parcial

### Actividades

| Actividad | Estado | Qué hay hoy en el CRM | Qué falta |
|-----------|--------|------------------------|-----------|
| Definir reglas para cédula, NIT y nombres | Parcial | Reglas activas en hooks (ValidatePersonaTipoOnSave, PreventDuplicate*, DocumentNormalizer). | Documento formal con reglas acordadas (formatos, obligatoriedad, duplicados). |
| Implementar validación de formatos | Listo | Validación al guardar, enums, placeholders. | — |
| Implementar búsqueda previa de terceros | Listo | party-document-lookup.js + buscarParte. | — |
| Probar casos duplicados | Listo | PreventDuplicateDocument y PreventDuplicateNit operativos. | — |


---

## Objetivo 14 — Registrar comunicaciones y actuaciones relacionadas con cada caso

**Estado general:** Parcial

### Actividades

| Actividad | Estado | Qué hay hoy en el CRM | Qué falta |
|-----------|--------|------------------------|-----------|
| Definir tipos de comunicación | Listo | ComunicacionCaso: Citación, Respuesta al peticionario, Notificación al infractor, Llamada, Correo, Oficio, Otro. | — |
| Asociar comunicación a caso | Listo | Panel Comunicaciones en detalle de caso. | — |
| Registrar respuesta final | Parcial | Cierre por estados Finalizado/Proceso cerrado + auto de archivo; flag esRespuestaFinal en comunicación. | Campo o flujo dedicado de **respuesta final al ciudadano** como cierre formal explícito. |
| Marcar estado cerrado con evidencia | Parcial | Auto de archivo + PDF; flujo de cierre en CRM. | Poca data de actuos en BD; falta validar **cierre de punta a punta** con actuo real en producción. |


---

## Objetivo 15 — Clasificar terceros y usuarios según criterios ambientales

**Estado general:** Parcial

### Actividades

| Actividad | Estado | Qué hay hoy en el CRM | Qué falta |
|-----------|--------|------------------------|-----------|
| Definir criterios aplicables | Parcial | Criterios en Case: recurso/tema, zona, barrio, canal. | Matriz **formal** de segmentación ambiental (documento del proyecto). |
| Crear campos de segmentación | Parcial | Campos en Case y Contact (barrio residencia); criterios de caso en tercero vía filtros. | Campos de segmentación **propios del tercero/usuario** (no derivados del caso). |
| Implementar filtros | Listo | Casos: estado, responsable, radicación, recurso, barrio, zona, canal. Terceros: filtro «Con casos asociados» + filtros avanzados por criterio ambiental del caso (recurso, barrio, zona, canal, estado). Dashboard por tema/barrio. | — |
| Probar consultas por criterio | Listo | Dashboard y filtros de terceros operativos con casos reales. | — |


---

## Objetivo 16 — Crear tableros de control para seguimiento interno de casos

**Estado general:** Listo

### Actividades

| Actividad | Estado | Qué hay hoy en el CRM | Qué falta |
|-----------|--------|------------------------|-----------|
| Definir métricas de embudo | Listo | Embudo de 8 estados. | — |
| Crear indicadores por estado y tiempo | Listo | Semáforo, ingreso diario, radicados/día, asignación. | — |
| Diseñar visualizaciones | Listo | dashboard.html + Chart.js. | — |
| Validar con casos de prueba | Listo | Tablero con casos reales del entorno. | — |

**Complemento:** en detalle de caso hay línea de tiempo y cronograma como paneles de seguimiento individual.


---

## Objetivo 17 — Automatizar alertas de escalamiento a supervisores

**Estado general:** Parcial

### Actividades

| Actividad | Estado | Qué hay hoy en el CRM | Qué falta |
|-----------|--------|------------------------|-----------|
| Definir X días por tipo de trámite o estado | Parcial | Alertas por cFechaVencimiento (vencido y ≤3 días). | Reglas de días **por tipo de trámite o estado** del flujo (no solo vencimiento global). |
| Programar regla de inactividad | Pendiente | — | Job/regla «caso sin movimiento en X días». |
| Configurar notificación al supervisor | Parcial | Notificaciones a Inspección, Radicación, Asignador en eventos clave. | Escalamiento explícito a **supervisor por inactividad** (rol o jerarquía dedicada). |
| Probar caso con vencimiento | Listo | Job diario + hook inmediato; notificaciones en campana. | — |


---

## Objetivo 18 — Ubicar territorialmente los casos ambientales

**Estado general:** Parcial

### Actividades

| Actividad | Estado | Qué hay hoy en el CRM | Qué falta |
|-----------|--------|------------------------|-----------|
| Definir campos de coordenadas o dirección | Parcial | Dirección, barrio, zona Alcaldía (cZonaAlcaldia). | Campos **latitud/longitud** o geocodificación. |
| Validar formato geográfico | Pendiente | — | Validación de coordenadas o dirección contra formato/reglas geográficas. |
| Implementar vista de mapa | Pendiente | — | Mapa integrado en CRM (casos/terceros georreferenciados). |
| Probar filtros territoriales | Parcial | Dashboard por barrio; filtros por zona en casos y terceros. | Georreferenciación y filtros sobre **mapa** (no solo barrio/zona en listas). |


---

## Objetivo 19 — Garantizar calidad mínima de información registrada en el CRM

**Estado general:** Listo

### Actividades

| Actividad | Estado | Qué hay hoy en el CRM | Qué falta |
|-----------|--------|------------------------|-----------|
| Definir campos obligatorios | Listo | Hooks: solicitud completa, persona tipo, enums, radicado. | — |
| Validar formatos | Listo | Documento/NIT, siglas radicado, placeholders. | — |
| Implementar mensajes de error | Listo | Mensajes claros al usuario por rol y campo. | — |
| Probar datos inválidos | Listo | Sistema rechaza datos inválidos al guardar. | — |


---

# Bloque 3 — Objetivos 20 a 22

## Objetivo 20 — Generar informe PDF institucional a partir del CRM

**Estado general:** Parcial

### Actividades

| Actividad | Estado | Qué hay hoy en el CRM | Qué falta |
|-----------|--------|------------------------|-----------|
| Definir plantilla SGC | Pendiente | Plantillas operativas por etapa (solicitud, acta, actuo). | Plantilla de **informe institucional consolidado** tipo SGC. |
| Mapear datos del caso, visitas y documentos | Parcial | Generadores PDF separados por documento. | Mapeo **unificado** caso + visitas + documentos en un solo informe. |
| Permitir agregar análisis del caso | Pendiente | — | Campo/sección de análisis institucional editable para informe final. |
| Preparar campos de elaboración y revisión | Parcial | Campos de revisión en ActaVisita (vistoBueno, observaciones, etc.). | Campos pensados para **informe global del caso**, no solo acta. |
| Generar PDF | Parcial | PDF por formato (solicitud, acta, actuo) + reporte gerencial del tablero. | Botón/flujo «**generar informe institucional completo**» por caso. |

**Nota:** Lo operativo hoy son formatos por etapa y reporte gerencial del tablero, no un informe final que consolide todo el caso en un solo PDF tipo SGC.

---

## Objetivo 21 — Configurar permisos internos del CRM

**Estado general:** Parcial

### Actividades

| Actividad | Estado | Qué hay hoy en el CRM | Qué falta |
|-----------|--------|------------------------|-----------|
| Definir perfiles institucionales | Listo | Inspección, Radicación, Asignador, Patrullero, Admin; equipos Patrulleros, Radicación, Recibidores. | — |
| Configurar accesos por módulo | Parcial | Scripts configure-*; menú global; restricciones reales en hooks/ACL (el script de acceso amplio resetea scopes en deploy). | Matriz estable de permisos por módulo **sin depender solo del script amplio**. |
| Probar restricciones | Listo | Patrullero solo lo suyo, asignador post-radicado, radicación campos limitados, etc. | — |
| Documentar permisos | Pendiente | Lógica en código y scripts. | Matriz de perfiles como **entregable formal** (PDF/Excel). |

### Detalle de restricciones implementadas (más allá de permisos EspoCRM)

| Rol | Restricción principal |
|-----|------------------------|
| Inspección | Crea casos; edita registro Excel; revisa actas; auto de archivo en Finalizado |
| Radicación | Edita radicado/expediente; asistente de consecutivos |
| Asignador | Solo casos radicados; solo cambia responsable |
| Patrullero | Solo casos asignados a él; acta vía modal; no edita el caso |
| Admin | Acceso total |


---

## Objetivo 22 — Verificar acceso exclusivamente institucional al CRM

**Estado general:** Parcial

### Actividades

| Actividad | Estado | Qué hay hoy en el CRM | Qué falta |
|-----------|--------|------------------------|-----------|
| Revisar rutas públicas | Parcial | Login obligatorio; PDFs vía sesión autenticada. | Auditoría **documentada** de rutas públicas y entry points. |
| Validar autenticación obligatoria | Listo | Usuario/contraseña; usuarios internos activos. | — |
| Documentar restricción de acceso | Pendiente | Comportamiento implementado en el sistema. | Acta o informe formal de verificación de acceso exclusivo institucional. |
