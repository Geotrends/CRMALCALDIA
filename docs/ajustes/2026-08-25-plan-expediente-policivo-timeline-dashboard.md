# Ajuste: expediente con pasos del proceso policivo, cronograma y métrica en dashboard

| Campo | Detalle |
|---|---|
| Fecha | 2026-08-25 |
| Estado | Validado localmente |
| Responsable | Sesión asistida (Claude Code) |
| Áreas o roles impactados | Jurídica, Asignación, todos los usuarios (dashboard) |
| Versión de despliegue | (incluida en el mismo deploy de `entidades-expediente-autoinicio-rol-juridica-2026-08-25`) |

## Objetivo

Completar lo pedido tras validar el panel de decisión: que abrir el Auto de Inicio lleve directamente a la creación de un `Expediente`; que el `Expediente` tenga su propia línea de tiempo/cronograma con los pasos específicos del proceso policivo (tomados de IV-P-028/IV-P-021); que el **estado del expediente refleje el paso concreto en el que está**, no un estado genérico; y que el Dashboard muestre cuántos casos se convirtieron en procesos policivos.

Decisiones tomadas para poder implementar (el usuario dio luz verde con "empecemos" tras el documento de diseño previo):
- `Expediente.estado` es un único campo enum con las opciones de ambas ramas (Ley 1333/2009 y Ley 1801/2016) — simple, igual de directo que `Case.status`.
- Jurídica no registra los pasos uno por uno a mano: **elige la rama (`tipoTramite`) al abrir el Auto de Inicio, y el sistema arma automáticamente la lista de pasos esperados**; Jurídica solo pulsa "Avanzar al siguiente paso" cuando corresponde.

## Alcance funcional

1. **Auto de Inicio → Expediente automático**: al guardar un `AutoInicio` sin expediente elegido explícitamente, el sistema crea el `Expediente` en el mismo momento (con el `tipoTramite` ya definido) y lo enlaza tanto al `AutoInicio` como al `Case` de origen (`Case.expedienteId`).
2. **Pasos del proceso policivo por rama**, tomados literalmente de las tablas oficiales:
   - **Ley 1333/2009 (IV-P-028)**: Elaboración de acto de decisión (10 días) → Notificación de acto administrativo (5 días) → Remisión a Autoridad Ambiental (3 días) → Auto de Archivo (3 días).
   - **Ley 1801/2016 (IV-P-021)**: Audiencia pública (10 días) → Práctica de pruebas (5 días) → Recepción y respuesta de recursos (3 días) → Revisión de pago de sanciones pecuniarias (90 días / 3 meses) → Verificación de acción correctiva (2 días) → Auto de Archivo.
3. **`Expediente.estado`** pasó de 4 valores genéricos a un enum con los 9 pasos específicos de ambas ramas (más "Abierto" como estado inicial) — de solo lectura en el formulario, se mueve únicamente vía la acción "Avanzar al siguiente paso".
4. **Panel "Pasos del proceso policivo"** en el detalle del `Expediente`: lista los pasos de su rama con su estado (hecho/actual/pendiente) y el plazo legal de referencia; botón "Avanzar al siguiente paso" visible solo para Jurídica (y admin).
5. **Dashboard**: nuevo KPI "Procesos policivos" — cuenta cuántos de los casos visibles tienen un `AutoInicio` vinculado.

## Diseño y decisión técnica

- Igual patrón que ya se usó para el `Case`: `ExpedientePasosCatalog.php` (mapa fijo `tipoTramite → pasos con plazo`, mismo espíritu que `PlazoLegalCatalog.php`) + `ExpedienteTimelineService.php` (calcula `currentIndex`/`progress`/`steps`, calcado de `CaseTimelineService::build()`).
- Nuevo `Hooks/AutoInicio/SyncExpedienteAndCase.php` (`AfterSave`): si el `AutoInicio` no tiene `expedienteId`, crea el `Expediente` vía `ServiceContainer` (no `EntityManager` directo — la lección de la Fase 1 sigue aplicando: hay que pasar por la capa de servicio para que corran los `RecordHook`), copia el número al `AutoInicio.consecutivoInterno`, y enlaza `Case.expedienteId`.
- Nuevo `Controllers/Expediente.php` con constructor explícito desde el inicio (patrón EspoCRM 10 ya establecido: declarar `entityManager` en vez de asumir inyección automática) — evita repetir el bug que se encontró y corrigió en la ronda anterior.
- El panel del `Expediente` usa el mecanismo estándar de EspoCRM (`sidePanels.detail` en `clientDefs`, base `views/record/panels/side`) — más simple que el truco de campo-virtual que hubo que usar en `Case` (que tiene una vista de detalle totalmente custom); aun así, se replicó el patrón de re-render forzado (`SafeUiPromise.safeReRender`) para evitar el mismo bug de "panel que nunca se re-dibuja" encontrado hoy en el panel de decisión del caso.
- El KPI del dashboard hace una consulta aparte y liviana (`AutoInicio?select=caseId`) en paralelo a la carga de casos, sin tocar el endpoint principal — `dashboard.js` es un archivo con trabajo en curso del usuario, así que el cambio se mantuvo aditivo y aislado (una variable nueva, una función nueva, tres líneas dentro de `renderDashboard`).

## Archivos afectados

| Acción | Ruta | Propósito |
|---|---|---|
| Modificado | `espocrm-custom/Resources/metadata/entityDefs/Expediente.json` | `estado` con los 9 pasos específicos, de solo lectura |
| Modificado | `espocrm-custom/Resources/i18n/es_ES/Expediente.json` | Etiquetas de los pasos por rama |
| Modificado | `espocrm-custom/Resources/metadata/scopes/Expediente.json` | Acciones ACL `timeline`, `avanzarPaso` |
| Modificado | `espocrm-custom/Resources/metadata/clientDefs/Expediente.json` | Panel lateral "Pasos del proceso policivo" |
| Creado | `espocrm-custom/Tools/Expediente/ExpedientePasosCatalog.php` | Catálogo de pasos por rama, con plazos |
| Creado | `espocrm-custom/Tools/Expediente/ExpedienteTimelineService.php` | Cálculo de progreso/pasos del expediente |
| Creado | `espocrm-custom/Controllers/Expediente.php` | Acciones `timeline`, `avanzarPaso` |
| Creado | `espocrm-custom/Hooks/AutoInicio/SyncExpedienteAndCase.php` | Creación automática del Expediente al abrir el Auto de Inicio |
| Creado | `espocrm-custom/files/client/custom/src/views/expediente/record/panels/pasos.js` + `.tpl` | Panel visual de pasos + botón "Avanzar" |
| Modificado | `espocrm-custom/files/client/custom/res/css/07-panels.css` | Estilo del listado de pasos |
| Modificado | `scripts/roles/configure-role-juridica.php` | ACL de las acciones nuevas de Expediente |
| Modificado | `espocrm-custom/files/client/custom/dashboard.js` | KPI "Procesos policivos" |
| Modificado | `espocrm-custom/files/client/custom/dashboard.html` | Tile del KPI nuevo |
| Modificado | `espocrm-custom/files/client/custom/res/css/08-dashboard.css` | Color del KPI nuevo |

## Riesgos y dependencias

- `Expediente.estado` ahora depende de `tipoTramite` para tener sentido — un expediente con `tipoTramite = "Sin definir"` no tiene pasos (`ExpedientePasosCatalog::getPasos()` devuelve `[]`), y `avanzarPaso` responde 400 en ese caso. Hoy `tipoTramite` se define al crear el `AutoInicio`, así que no debería quedar nunca en blanco en la práctica, pero no hay una validación que lo *exija* en el formulario.
- El botón "Avanzar al siguiente paso" no distingue por qué se avanza (no pide evidencia ni comentario) — es un avance simple de estado. Si más adelante se necesita adjuntar el documento de cada hito (acta de audiencia, acto de decisión, etc.), este mecanismo habrá que ampliarlo.
- El KPI del dashboard cuenta `AutoInicio` vigentes sin filtrar por casos eliminados/duplicados — aceptable para una primera versión, revisar si el volumen crece.
- Vinculación de varios radicados a un mismo expediente sigue sin implementarse (queda para la Fase 10 original) — hoy cada `AutoInicio` crea siempre un expediente nuevo.

## Validación

| Escenario probado | Resultado | Evidencia u observación |
|---|---|---|
| Crear `AutoInicio` (rama Ley 1801/2016) vía API como `juridica` | Correcto | Expediente `2026-2` creado automáticamente, `consecutivoInterno` poblado |
| `Case.expedienteId` tras crear el Auto de Inicio | Correcto | Enlazado al expediente recién creado |
| `GET Expediente/action/timeline` | Correcto | 6 pasos de la rama Ley 1801/2016 con plazos, `estadoActual: "Abierto"` |
| `POST Expediente/action/avanzarPaso` como `asignacion` | Correcto | 403 Forbidden |
| `POST Expediente/action/avanzarPaso` como `juridica` (x2) | Correcto | `Abierto → Audiencia pública → Práctica de pruebas`, timeline refleja `done`/`current`/`pending` correctamente |
| Datos de prueba | Limpios | `AutoInicio` y `Expediente` de prueba eliminados, `Case.expedienteId` revertido a null |

## Despliegue y reversión

Incluido en los deploys manuales de esta sesión. Reversión: revertir los archivos de esta tabla; sin cambios de esquema salvo el cambio de opciones del enum `estado` (no destructivo, EspoCRM solo cambia el catálogo de valores válidos).

## Documentación relacionada

| Documento | Acción requerida | Estado |
|---|---|---|
| [`2026-08-25-panel-decision-bandeja-timeline-plazos.md`](2026-08-25-panel-decision-bandeja-timeline-plazos.md) | Continuación directa | Referenciado |
| [`2026-08-25-expediente-autoinicio-rol-juridica.md`](2026-08-25-expediente-autoinicio-rol-juridica.md) | Resuelve la Fase 9 pendiente (creación automática del Expediente) | Referenciado |

## Corrección posterior: los pasos policivos se insertan en la línea de tiempo del Caso

Al probar en pantalla (caso real `ENV-SUE-9533-2026`, rama Sancionatorio ambiental), el usuario esperaba ver los pasos concretos del proceso policivo **dentro de la línea de tiempo del Caso** (entre "Visita aprobada" y "Finalizado"), no solo en el panel aparte del Expediente — y que "Finalizado" quedara como el último paso, no en medio de un paso genérico "Proceso policivo iniciado".

**Causa raíz encontrada**: `CaseTimelineService::build()` solo *renombraba* el último de los 7 pasos fijos; y el frontend (`case-status-timeline.js`) tenía su **propia copia hardcodeada** de los 7 estados y nunca leía la lista real de pasos que mandaba el backend — solo usaba `raw.steps` para sacar fechas, no para decidir cuántos pasos pintar.

**Corrección**:
- `CaseTimelineService::build()` ahora arma un flujo dinámico: los 5 pasos base (Pendiente…Visita aprobada) + los pasos del `Expediente` según su `tipoTramite` (vía `ExpedientePasosCatalog`, ya existente) + `Finalizado` al final — solo cuando el `Case` tiene un `Expediente` vinculado con rama definida; si no, el flujo de 7 pasos de siempre queda intacto (cero cambio de comportamiento para el caso general).
- `case-status-timeline.js`: nueva función `buildStepsFromRaw()` que pinta los pasos que manda el backend directamente (cantidad y orden dinámicos), en vez de mapear sobre una lista fija de 7. La lista hardcodeada (`STATUS_FLOW`) se conserva solo como *fallback* para el placeholder inicial y para el caso general no escalado.
- Cada paso del expediente llega con `variant: "escalado"` (no solo el último), así el color ámbar ya existente se aplica a todo el bloque insertado, no a un solo punto.

Verificado con el flujo real (rama Sancionatorio ambiental): `GET Case/action/timeline` devolvió 10 pasos totales — los 5 base, los 4 de la rama (Elaboración de acto de decisión → Notificación → Remisión → Auto de Archivo), y `Finalizado` al final — y el endpoint combinado `panelesDetalle` (el que usa la pantalla real) confirma el mismo orden. Datos de prueba limpiados tras validar.

## Segunda corrección: vencimientos por paso + sección "Procesos policivos" en el dashboard

El usuario pidió cuantificar dónde están los expedientes abiertos y detectar vencimientos por paso, y sugirió no crear una app aparte sino extender el dashboard existente.

**Diseño**: el `Expediente` no tenía forma de saber desde cuándo estaba en su paso actual, así que no se podía calcular vencido/próximo a vencer. Se agregó:

- Campo nuevo `Expediente.fechaInicioPaso` (fecha), de solo lectura — se fija al crear el expediente y se refresca cada vez que se ejecuta `avanzarPaso`.
- `Tools/Expediente/ExpedienteVencimientoHelper.php`: mismo criterio de semáforo que ya existe para el `Case` (`CaseVencimientoHelper`, 3 días = "próximo a vencer"), pero calculando la fecha límite como `fechaInicioPaso + plazo legal del paso actual` (ya definido en `ExpedientePasosCatalog`), no una fecha fija guardada.
- `ExpedienteTimelineService::build()` ahora también devuelve `diasEnPaso`, `diasRestantesPaso` y `semaforo` del paso actual.
- Nueva acción `GET Expediente/action/resumenDashboard`: lista los expedientes abiertos (con rama definida, sin llegar a su paso final) con su semáforo — usada por la nueva sección "Procesos policivos abiertos" al final del dashboard (tabla con radicado, rama, paso actual, días en el paso y semáforo, más contador de vencidos/próximos).

**Riesgo conocido**: los expedientes creados antes de este cambio no tenían `fechaInicioPaso` — se les asignó manualmente la fecha de hoy a los dos expedientes de prueba en pantalla (`ENV-SUE-9533-2026`, `ENV-FDO-9535-2026`) para que se vean con datos reales; no se hizo un backfill general porque no había ningún expediente más en el sistema en el momento del cambio.

**Validación**: se simularon los 3 estados del semáforo manipulando `fecha_inicio_paso` directamente en BD (ok/sin plazo aún, próximo a vencer a 2 días, vencido a -5 días) y se confirmó que `resumenDashboard` los clasifica correctamente en cada caso; se restauró la fecha a "hoy" al terminar para dejar el caso de demo en un estado realista.

## Tercera corrección: los pasos policivos también se insertan en el Cronograma (no solo en la Línea de tiempo)

El pedido original ("debemos agregar cosas a la línea de tiempo **y al cronograma**") incluía ambos paneles del `Case`, pero la corrección de la Línea de tiempo (sección anterior) solo tocó `CaseTimelineService`. El usuario lo confirmó tras ver la Línea de tiempo funcionando: "lo de linea del timepo no lo veo en cronograma" — el panel "Cronograma" (`CaseCronogramaService`, un panel distinto con su propio formato de fechas/plazos, deliberadamente no tocado antes por estar fuera del alcance que se creyó pedido) seguía mostrando solo el cierre genérico (Auto de archivo / Proceso cerrado) sin los pasos del expediente.

**Corrección**: `CaseCronogramaService::build()` ahora inserta, cuando el `Case` tiene un `Expediente` vinculado con `tipoTramite` definido, una entrada por cada paso de su rama (`ExpedientePasosCatalog::getPasosConPlazo()`) en vez de las entradas genéricas "Auto de archivo"/"Proceso cerrado":

- Pasos anteriores al actual → "Completado".
- Paso actual → fecha límite calculada con `ExpedienteVencimientoHelper::fechaLimite(Expediente.fechaInicioPaso, plazo legal del paso)`, reutilizando el mismo formateador de plazos (`formatDeadlineStatus`) que ya usa el resto del cronograma, para que se vea consistente ("N días para terminar" / "N días de retraso").
- Pasos siguientes → "Pendiente", con el plazo legal de referencia como detalle.
- "Cierre del caso (finalizado)" se movió para ejecutarse siempre al final (antes corría *antes* de Auto de archivo/Proceso cerrado en el código, aunque visualmente coincidía por casualidad con el orden esperado en el caso no escalado) — mismo criterio de "Finalizado va último" ya aplicado a la Línea de tiempo.
- Caso no escalado (sin `Expediente` o sin rama definida): cero cambios, sigue mostrando Auto de archivo/Proceso cerrado como siempre.

El frontend (`case-cronograma.js`) no necesitó ningún cambio: ya mapeaba `raw.entries` de forma genérica (sin asumir una cantidad fija de pasos), a diferencia de lo que pasaba con la Línea de tiempo.

**Validación** vía `GET Case/action/cronograma`:
- `ENV-SUE-9533-2026` (Sancionatorio ambiental, paso actual "Elaboración de acto de decisión"): el cronograma insertó los 4 pasos de la rama entre "Visita aprobada" y "Finalizado", con el paso actual mostrando "9 días para terminar".
- `ENV-FDO-9535-2026` (Código de policía, paso actual "Audiencia pública"): insertó los 6 pasos de esa rama en el orden correcto, paso actual en curso, el resto "Pendiente".
- Un caso cerrado sin escalar (`Proceso cerrado`, sin `Expediente`): confirmado que el cronograma no cambió — sigue mostrando "Auto de archivo"/"Proceso cerrado" como antes de este ajuste.
