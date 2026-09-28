# Ajuste: Proceso Verbal Abreviado, tramo 1: citación y audiencia (bloque "Proceso del expediente")

| Campo | Detalle |
|---|---|
| Fecha | 2026-09-28 |
| Estado | Validado localmente |
| Responsable | Claude Code (sesión con Jonathan Ochoa) |
| Áreas o roles impactados | Apoyo Jurídico, Inspector Ambiental, Aux. Administrativo · Inspección y Admin (gestionan); responsable de una prueba externa (carga su soporte); Director Técnico (informado de pruebas ordenadas) |
| Versión de despliegue | local (Docker, no desplegado a Dokploy) |

## Objetivo

Implementar el primer tramo de la ruta **Proceso Verbal Abreviado** con dos BPMN como guía:

- `proceso_verbal_abreviado_convivencia_v1.0`: PVA01–PVA07.
- `audiencia_proceso_verbal_abreviado_v1.0`: AUD01–AUD11.

El tramo va desde el expediente abierto hasta la audiencia completa. Además, la **línea de tiempo** y el **cronograma** del caso muestran la apertura y los pasos de la ruta desde que se define la apertura de actuación.

## Decisiones del usuario

1. Por ahora, **Apoyo Jurídico, Inspector Ambiental y Aux. Inspección hacen todos los pasos**.
2. Un **solo bloque** con los pasos que se van habilitando, en lugar de contenedores separados. Lo que se repite (audiencias, suspensiones, pruebas) va como registros dentro de su paso.
3. Se empieza por la citación y la audiencia; la decisión, la notificación, la ejecución y el archivo vienen después.
4. Al definir la apertura por esta ruta, la línea de tiempo y el cronograma deben mostrar ese paso y los que siguen.

## Cambio

### Pasos de la ruta (`ExpedientePasosCatalog`)

- **PVA:** Citación → Audiencia pública → Decisión: orden de policía o medida correctiva → Notificación y recursos → Cumplimiento de la orden o medida → Auto de Archivo.
- **"Práctica de pruebas" ya no es un paso aparte:** según el BPMN, las pruebas ocurren dentro de la audiencia.
- **Otras rutas:** Recursos Naturales y Conductas con animales heredan estos pasos después de los suyos.
- **Pasos guiados:** Citación y Audiencia pública se cumplen solo con las acciones del bloque. "Avanzar paso" desde el expediente los rechaza.
- **Al firmar el Auto de Inicio**, el expediente queda en el primer paso de su ruta (antes quedaba en "Abierto") y empieza su `historialPasos`, con el inicio, el fin, quién lo cumplió y la observación de cada paso.

### Bloque "Proceso del expediente" (en el caso, debajo de la apertura)

Muestra la ruta, los pasos (cumplido, en curso, pendiente), el formulario del paso actual y las audiencias con sus soportes.

| Fase | Qué se registra | Efecto |
|---|---|---|
| Citar (PVA02) | Fecha y hora (sugeridas del Auto de Inicio), medio, documento de citación, soporte y fecha de entrega | Crea la `Audiencia` N.º 1 y el recordatorio al Inspector del día anterior. Con el soporte de entrega, el expediente pasa a **Audiencia pública** |
| Soporte de la citación | Soporte de entrega | Cumple el paso Citación |
| Audiencia (AUD01–AUD08) | Una de estas opciones: **se realizó** (resultado, asistentes, conciliación o compromiso) · **no compareció** · **suspensión por prueba externa** (tipo, qué verificar, responsable, plazo) · **aplazar u otra causa** | Solo se registra desde el día fijado; antes solo cabe aplazar |
| Primera inasistencia (AUD02) | Justificación aceptada, rechazada o no presentada, con su documento | Término de 3 días hábiles desde el día siguiente (Decreto 768/2025) y alerta del término |
| Prueba externa (PVA05–06, AUD07) | Soporte de la prueba | Aviso accionable y alerta al responsable, que puede cargar el soporte aunque no sea de los perfiles gestores. La audiencia queda lista para reanudar |
| Reprogramar (PVA07) | Nueva fecha y citación | Nueva `Audiencia` N.º siguiente; la anterior queda "Reprogramada" |
| Soportes (AUD09–AUD11) | Acta firmada (PDF) y audio, o constancia de que no se pudo grabar | Con ambos, la audiencia queda "Completa" y el expediente pasa a **Decisión** |
| Otros pasos (tramos siguientes) | Observación de cómo se cumplió | Avanza al paso siguiente (el Auto de Archivo queda para el tramo de cierre) |

- **Archivos:** se cargan con `Case/action/procesoArchivo`, que los crea en el servidor, porque Aux. Inspección no edita el caso. Luego se vinculan a su registro (`Audiencia`, `SuspensionAudiencia` o `GrabacionAudiencia`). Tamaño máximo por archivo: unos 35 MB (límite de 50 MB por envío del servidor).
- **Registros usados:** `Audiencia` (con campos nuevos de citación y N.º), `SuspensionAudiencia` (tipo de suspensión, prueba y plazo), `GrabacionAudiencia`, `Compromiso` y `AlertaProceso`.

### Línea de tiempo y cronograma del caso

- **Con la apertura definida y sin decidir:** aparece el paso **"Apertura de expediente"** (en curso) después de la definición del trámite.
- **Al decidir la ruta:** se agregan sus pasos como pendientes, aunque el expediente siga en preparación.
- **Con el expediente abierto:**
  - cada paso muestra su inicio y fin tomados de `historialPasos`;
  - el paso actual lleva su situación, por ejemplo: "Audiencia N.º 1 · 20/10/2026 09:30 am · falta el soporte de entrega de la citación".
- **Cronograma:**
  - lista las audiencias (N.º, fecha y estado) dentro del paso de audiencia;
  - "Estado actual" muestra el paso del expediente.

### Avisos (a los gestores y al Admin, nunca a quien hace la acción)

| Cuando… | Aviso |
|---|---|
| Se programa o reprograma la audiencia | "Audiencia programada" / "Audiencia reprogramada" (con fecha; si falta el soporte, lo indica) |
| Se entrega la citación | "Citación entregada" |
| No comparece o se aplaza | "Audiencia suspendida" (con el plazo para justificar, si aplica) |
| Se ordena una prueba | "Prueba ordenada por el Inspector": al **responsable** (accionable), al Director Técnico y a los gestores |
| Se carga el soporte de la prueba | "Soporte probatorio cargado: reprograme" |
| Se completa la audiencia | "Audiencia completa · sigue la decisión" |
| Se cumple un paso genérico | "Paso del expediente cumplido" |

### Archivos

- **Nuevos:**
  - `espocrm-custom/Tools/CaseObj/CaseProcesoService.php` (acciones y avisos)
  - `espocrm-custom/Tools/CaseObj/CaseProcesoLectura.php` (paso, fase, resumen, audiencias)
- **Modificados:**
  - `Controllers/CaseObj.php` (`procesoEstado`, `procesoAccion`, `procesoArchivo`)
  - `Controllers/Expediente.php` (bloquea "avanzar paso" en pasos guiados)
  - `Tools/CaseObj/CaseAperturaService.php` (firma → primer paso + historial)
  - `Tools/CaseObj/CaseTimelineService.php`
  - `Tools/CaseObj/CaseCronogramaService.php`
  - `Tools/Expediente/ExpedientePasosCatalog.php`
  - `Tools/User/AlcaldiaUserProfile.php` (`canGestionarProceso`, `findActiveGestoresProcesoUserIds`)
  - entityDefs e i18n de `Audiencia`, `SuspensionAudiencia`, `Expediente` (`historialPasos`) y `Case` (`cSoportesExpediente`)
  - `files/client/custom/src/helpers/case-detail-side-panels.js`
  - `alcaldia-notification-message.js`
  - `33-case-asignacion.css`

## Validación (local, API y navegador)

Recorrido completo de un caso de prueba:

1. **Definición:** la línea de tiempo muestra "Apertura de expediente" en curso.
2. **Decisión de la ruta PVA:** se agregan sus 6 pasos.
3. **Firma:** el expediente queda en "Citación".
4. **Citación:**
   - el Radicador recibe 403;
   - Aux. Inspección programa la audiencia sin soporte y el paso sigue en Citación;
   - Jurídica carga el soporte y el expediente pasa a Audiencia pública.
5. **Prueba externa:**
   - registrar el resultado antes de la fecha de la audiencia responde 400;
   - el Inspector suspende por inspección ocular a cargo de `tecnico`;
   - `tecnico` recibe el aviso accionable y carga el soporte.
6. **Primera inasistencia:** audiencia N.º 2 → inasistencia con plazo de 3 días hábiles (01/10/2026 para una audiencia del lunes 28/09) → justificación aceptada.
7. **Audiencia realizada:** audiencia N.º 3 realizada con compromiso; acta (Inspector) y constancia sin audio (Aux.) → audiencia completa y expediente en **Decisión**.
8. **Paso genérico:** "Registrar paso cumplido" lleva a Notificación y recursos.
9. **Cronograma:** apertura y pasos con fecha real, y las 3 audiencias con su estado.
10. **Avance manual:** "avanzar paso" desde el expediente en Audiencia pública responde 400.

- **Avisos:** revisados por destinatario. No llegan a quien hace la acción; el Admin los recibe todos; el Director Técnico solo recibe el de la prueba ordenada.
- **Navegador (`auxinspeccion`, `inspector`):** formulario de citación con archivos → paso Audiencia; opciones de resultado según la fecha; línea de tiempo y cronograma con los pasos nuevos.
- **Datos de prueba:** los casos y registros de prueba se eliminaron.

## Ajuste posterior: llevar el proceso desde el expediente

Pedido del usuario: "el expediente, cuando se abre en Expedientes, debería dejar llevar el proceso desde allí también".

- **Panel lateral:** en la vista del expediente, el panel se llama ahora **"Proceso del expediente"**. Muestra el **mismo bloque del caso**, con los mismos pasos, formularios y acciones: citación, audiencia, decisión, notificación y recursos.
- **Caso principal:** las acciones se registran sobre el caso principal del expediente, que es el del Auto de Inicio o, si no hay, el primero vinculado. El enlace a ese caso aparece arriba, y si hay más casos vinculados se indica cuántos.
- **Sin ruta en curso:** si el expediente está en preparación o no tiene ruta, el panel muestra la lista de pasos anterior.

**Archivos:**
- `Controllers/Expediente.php` (`procesoCaso`)
- `files/client/custom/src/views/expediente/record/panels/pasos.js`
- `case-detail-side-panels.js` (`mountProcesoEn`, exportado)
- `clientDefs/Expediente.json`
- `33-case-asignacion.css` (estilos también en la vista del expediente)

**Validación:**
- Como `juridica`, en `#Expediente/view/…`: se programó la audiencia con su soporte y el expediente pasó a "Audiencia pública" (el campo Estado del detalle se actualiza).
- El caso principal se muestra una vez.

**Nota:** el rol **Aux. Administrativo · Inspección** no tiene acceso al módulo de Expedientes y lo redirige al inicio. Lleva el proceso desde el caso.

## Ajuste posterior: citación generada con el formato de la Inspección

Pedido del usuario: "la citación de policía ambiental la puse en el repositorio para que se genere también, y luego carguen la firmada y escaneada".

- **Plantilla:** `formatos/Citacion.docx`, copia con nombre fijo de "Citacion Inspección de Policía Ambiental.docx". El despliegue en Dokploy la copia a las plantillas.
- **Al programar o reprogramar la audiencia** ("Programar y generar citación") se genera la citación en Word, `Citacion-<expediente>-A<n.º>.docx`, con:
  - radicado y expediente (la fecha de entrega queda para llenar a mano);
  - nombre e identificación del citado;
  - fecha y hora de la audiencia (por ejemplo, "22 de octubre de 2026 · 9:00 a. m.");
  - tema (Ley 1801 · recurso · asunto) y asunto "AUDIENCIA (X)";
  - dirección, barrio y teléfono de entrega, y correo del citado.
- **Después** se descarga, se entrega firmada y se carga la **citación firmada y escaneada**. Con eso se cumple el paso Citación, igual que antes con el soporte de entrega.
- **Casillas del asunto:** en el formato son rectángulos dibujados; el CRM marca "AUDIENCIA (X)" en el texto.
- **Vista previa:** "Ver citación (Word)" descarga la citación prellenada con la fecha y hora elegidas **antes** de programar la audiencia (acción `citacionPrevia`, no registra nada). Si la fecha del Auto de Inicio ya pasó, el formulario no la propone. Programar exige una fecha futura.
- **Archivos:** `fill-formato-proceso.py` (tipo `citacion`), `CaseProcesoService::generarCitacion`, `ProcesoFormatoGenerator::PLANTILLA_CITACION` y el formulario de citación en `case-detail-side-panels.js`.

## Ajuste posterior: lugar de la audiencia

Pedido del usuario: "así como la fecha de audiencia, la dirección predeterminada o personalizada de donde será la audiencia".

- **Opciones del campo "Lugar de la audiencia":**
  - **Despacho de la Inspección** (predeterminado): "Inspección de Policía Ambiental · Secretaría de Medio Ambiente y Desarrollo Rural, Calle 40 B Sur Nº 37-24, Barrio El Dorado, Envigado". Es la dirección del formato, se muestra fija y está en la constante `LUGAR_INSPECCION`.
  - **Lugar de los hechos** (art. 223 num. 3): se prellena con la dirección y el barrio del caso, y se puede editar.
  - **Otra dirección:** texto libre.
- **Validación:** sin dirección no se programa (400 "Indique la dirección donde se realizará la audiencia").
- **Registro:** se guarda en `Audiencia.lugarTipo` y `Audiencia.lugar`, y aparece en la tarjeta de cada audiencia, en la nota de la historia y en el aviso.
- **Citación en Word:**
  - Con el despacho se conserva el texto del formato.
  - Con otro lugar, el párrafo queda "Sírvase acercarse a {dirección}, donde se realizará la audiencia, en la siguiente…".
  - Aplica también a "Ver citación (Word)".
- **Validación (`juridica`, vista del expediente):** "Lugar de los hechos" propuso "Calle 10 # 20-30, barrio La Paz, Envigado"; la citación generada y la tarjeta muestran esa dirección.

## Ajuste posterior: el proceso a todo el ancho en la vista del expediente

Pedido del usuario: "pon el proceso debajo de asignación ocupando todo el ancho, a la derecha el proceso y a la izquierda los formularios".

- En `#Expediente/view/…`, el panel **"Proceso del expediente"** sale de la columna lateral y queda **debajo de Información general y Asignación, a todo el ancho**.
- **Izquierda:** el formulario del paso actual, con su título.
- **Derecha:** la ruta, los pasos, la decisión y las audiencias.
- En pantallas angostas las columnas se apilan. En el caso, el bloque sigue en la columna lateral con la disposición vertical.
- **Validación (`juridica`):** programar y generar la citación desde el expediente → se descarga `Citacion-T2-LAY-A1.docx` → formulario "Citación firmada y escaneada" a la izquierda y pasos a la derecha.

## Ajuste posterior: línea de tiempo y cronograma del proceso en el expediente

Pedido del usuario: "se debe poner en expedientes también el tiempo y cronograma, pero solo del proceso, después del proceso del expediente".

- **Paneles nuevos:** "Línea de tiempo del proceso" y "Cronograma del proceso" van debajo de "Proceso del expediente", a todo el ancho y en ese orden.
- **Qué muestran:** lo mismo que en el caso, pero **solo el tramo del proceso**:
  - la línea de tiempo va de "Apertura de expediente" a "Auto de Archivo", con su propio progreso (por ejemplo, 5 de 7, 67 %);
  - el cronograma muestra la apertura, cada paso con sus fechas, las audiencias y los pasos pendientes con su plazo.
  - No incluye el ingreso, la radicación, la visita ni el plazo del derecho de petición.
- **Datos:** `Expediente/action/procesoPaneles`, calculado sobre el caso principal. Los paneles se actualizan al registrar acciones en el proceso.
- **Archivos:**
  - `Controllers/Expediente.php` (`procesoPaneles`)
  - `helpers/expediente-ancho.js` (orden de los paneles a todo el ancho y consulta compartida)
  - `views/expediente/record/panels/proceso-timeline.js` y `proceso-cronograma.js`
  - `clientDefs/Expediente.json`
  - estilos del contorno en `12-case-timeline.css` y `13-case-cronograma.css`
- **Validación (`juridica`, expediente en Notificación y recursos):**
  - La línea de tiempo muestra 7 pasos, con los 4 primeros cumplidos y sus fechas, y "Notificación y recursos" en curso con fecha límite.
  - El cronograma muestra apertura, citación, audiencia, audiencia N.º 1 realizada, decisión, notificación ("2 días para terminar"), cumplimiento y archivo pendientes.

## Pendientes

- Tramo 2: decisión (orden de policía y medidas correctivas, fallo firmado) y notificación, recursos y ejecutoria (H2–H5).
- Tramo 3: ejecución, seguimiento y Auto de Archivo.
- Para audios de más de unos 35 MB hace falta carga por partes.
- El formato de citación está "POR SOLICITAR" en el catálogo: hoy se carga el documento, no se genera.

## Despliegue y reversión

- **Local:** `docker cp`, `rebuild` (campos nuevos), `clear-cache` y `update-app-timestamp`.
- **Reversión:** revertir el commit. Los expedientes abiertos con este cambio quedan con `estado` = primer paso de su ruta, que sigue siendo válido.
