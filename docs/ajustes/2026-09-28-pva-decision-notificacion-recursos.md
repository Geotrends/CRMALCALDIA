# Ajuste: Proceso Verbal Abreviado, tramo 2: decisión, notificación y recursos (con retornos)

| Campo | Detalle |
|---|---|
| Fecha | 2026-09-28 |
| Estado | Validado localmente |
| Responsable | Claude Code (sesión con Jonathan Ochoa) |
| Áreas o roles impactados | Apoyo Jurídico, Inspector Ambiental, Aux. Administrativo · Inspección y Admin (gestionan); Director Técnico (sin cambios) |
| Versión de despliegue | local (Docker, no desplegado a Dokploy) |

## Objetivo

Implementar los pasos **Decisión: orden de policía o medida correctiva** y **Notificación y recursos** del bloque "Proceso del expediente", con los retornos del BPMN.

BPMN de referencia:

- `proceso_verbal_abreviado_convivencia_v1.0`: PVA08–PVA13.
- `determinacion_medidas_correctivas_v1.2`: momentos 1 a 8.
- `notificacion_ejecutoria_v1.0`: NE01–NE08.
- `recursos_segunda_instancia_v1.1`: RSI01–RSI09.

## Decisiones del usuario

1. **Formatos entregados:**
   - "Notificación personal": se usa para la notificación personal.
   - "Notificación por aviso": se usa para el aviso.
   - "Auto de archivo": es igual al `ActuoArchivo.docx` existente; queda para el tramo de cierre.
2. **Multas:** el valor se deja para llenar a mano.
3. **Causal de archivo:** el proceso se cerró como indica el procedimiento (tramo 3).
4. Se continúa con lo propuesto: campos seleccionables en lugar de texto libre, y retornos como acciones con motivo.

## Cambio

### Decisión (lista automática desde la matriz conducta → medida)

**Conductas probadas**
- Se ofrecen las conductas del Auto de Inicio, y se puede agregar otra del catálogo.
- También está la opción "No se probó ninguna conducta".

**Medidas:** por cada conducta, el CRM muestra solo las medidas de la matriz. La fuente es `Resources/metadata/app/medidasCorrectivas.json`, generado desde el BPMN (43 conductas, 70 reglas).

| Tipo de regla | Qué hace el CRM |
|---|---|
| **Prescrita** (el Inspector es competente) | Se incorpora sola |
| **Condicional** | Solo se incluye con la prueba que acredita la condición (obligatoria) |
| **Alternativa o facultativa** | Se decide y se motiva (obligatorio) |
| **De otra autoridad** | Se ve bloqueada y queda como derivación ("Remitir a Comandante de estación…, para lo de su competencia") |
| **Reglas especiales** | Se muestran como aviso, por ejemplo el par. 7 del art. 93 sobre el plazo de insonorización |

- **Condiciones particulares por medida:** texto libre (valor de la multa, duración, bien…). Si una multa no trae valor, en el Word queda "valor: ______".

**Orden de Policía**
- Va aparte de las medidas: texto, destinatario (prellenado con el citado), plazo, criterio de cumplimiento y si requiere verificación.

**Texto y documento**
- Se registran los hechos probados y la motivación.
- **Proyecto de decisión en Word:** no hay formato institucional de fallo, así que sale marcado "POR VALIDAR". Incluye datos del caso, hechos, conductas, consideraciones y RESUELVE (medidas, orden, derivaciones, recursos y notificación en estrados).
- **Corrección antes de firmar (retorno del BPMN):** se ajusta el formulario y se regenera el proyecto.

**Firma**
- Se carga la decisión firmada (PDF).
- Se crean una `MedidaCorrectiva` por cada medida incluida y la `OrdenPolicia`, con el documento de origen.
- El expediente pasa a **Notificación y recursos**.

### Notificación y recursos

**Notificación**
- **Medio:** en estrados (por defecto), personal, por aviso u otro medio.
- **Formatos:** para personal y aviso se genera el **formato prellenado en Word** (nombre, documento, acto, expediente y frase de recursos), y la constancia firmada es obligatoria.
- **"No fue efectiva":** queda registrada y se intenta otro medio (retorno).
- **Única instancia:** si todas las medidas incluidas son de única instancia, la decisión queda en firme al notificarse (art. 223 par. 4).

**Recursos:** se elige entre ninguno, reposición, reposición y en subsidio apelación, o apelación.
- **Ninguno:** la decisión queda **en firme**.
- **Reposición:** se resuelve con confirma, modifica o revoca, y su fundamento. Con apelación en subsidio y sin revocar, se concede la apelación.
- **Apelación:**
  - Se remite a la autoridad de segunda instancia con fecha, oficio y fecha de seguimiento opcional (alerta).
  - Se registra la **salida del expediente físico** (`MovimientoExpediente` en tránsito).
  - Al devolverse se registra el resultado y el documento de segunda instancia, y el movimiento queda "Devuelto".

**Firmeza**
- Las medidas quedan "Pendiente de ejecución" y la orden "Notificada".
- Se atiende la alerta informativa de la notificación.
- El expediente pasa a **Cumplimiento** o, si no hay nada por cumplir, a **Auto de Archivo**, y Cumplimiento queda como "No aplica".

### Retornos

| Desde | Hacia | Cuándo |
|---|---|---|
| Decisión | Decisión (regenerar) | Corregir antes de firmar |
| Notificación | Notificación (otro medio) | La notificación no fue efectiva |
| Recursos | **Decisión** | La reposición o la apelación **modifica** la decisión. Se ajusta y se carga firmada; las medidas anteriores quedan "Sustituidas" y la decisión queda en firme sin nuevos recursos |
| Recursos | **Auto de Archivo** | Se **revoca**: las medidas quedan "Anuladas por acto" y Cumplimiento "No aplica" |
| Firmeza | **Auto de Archivo** | No hay medidas ni orden de Policía (Cumplimiento "No aplica") |

- **En el historial:** cada retorno queda en `historialPasos` (retornos, con fecha, motivo y quién) y en la historia del caso.
- **En pantalla:** el bloque muestra "↩ N retorno(s)" y los pasos omitidos tachados como "No aplica". La línea de tiempo y el cronograma también los muestran.

### Avisos (a los gestores y al Admin, nunca a quien hace la acción)

Decisión adoptada · Recurso interpuesto · Apelación concedida · Expediente en segunda instancia · Decisión por ajustar · Decisión revocada · Decisión en firme.

### Archivos

- **Nuevos:**
  - `espocrm-custom/Tools/CaseObj/CaseDecisionService.php`
  - `espocrm-custom/Tools/CaseObj/ProcesoFormatoGenerator.php`
  - `espocrm-custom/files/scripts/fill-formato-proceso.py`
  - `espocrm-custom/Resources/metadata/app/medidasCorrectivas.json`
  - `formatos/NotificacionPersonal.docx` y `formatos/NotificacionAviso.docx` (copias con nombre fijo de los formatos entregados)
- **Modificados:**
  - `Tools/CaseObj/CaseProcesoService.php` (fases nuevas, `retornar`, pasos omitidos, alerta con fecha)
  - `Tools/CaseObj/CaseProcesoLectura.php`
  - `Tools/CaseObj/CaseTimelineService.php`
  - `Tools/CaseObj/CaseCronogramaService.php`
  - `Tools/Expediente/ExpedientePasosCatalog.php`
  - `Resources/metadata/entityDefs/Expediente.json` (`decisionFondo`, `decisionBorrador`, `decisionFirmada`) y su i18n
  - `files/client/custom/src/helpers/case-detail-side-panels.js`
  - `33-case-asignacion.css`
  - `scripts/deploy-custom-dokploy.sh` (copia las plantillas de notificación)

## Validación (local, API y navegador)

**A · recorrido completo**
1. La condición de la multa por ruido sin prueba responde 400; con prueba se incluye.
2. La suspensión temporal queda bloqueada y derivada al Comandante de estación.
3. Se registra la orden de Policía.
4. Se carga la firma → Notificación.
5. Formato personal generado. Personal sin constancia responde 400; "no efectiva" registrada; en estrados → Recursos.
6. Reposición y en subsidio apelación: la reposición confirma → apelación concedida → remitida (movimiento en tránsito y alerta) → segunda instancia **modifica**.
7. **Retorno a Decisión** (1 retorno) → ajuste → firma → en firme → **Cumplimiento**.
8. En la base: la multa anterior queda "Sustituida" y la nueva "Pendiente de ejecución".

**B · sin conducta probada**
- En estrados → sin recursos → **Auto de Archivo**, con Cumplimiento "No aplica" en el bloque y en la línea de tiempo.

**C · revocatoria**
- La reposición **revoca** → Auto de Archivo. La medida queda "Anulada por acto" y el recurso "Reposición resuelta · Revoca".

**Otras comprobaciones**
- **Proyecto en Word:** incluye datos, hechos, conducta, medida con sus condiciones, la derivación y los numerales RESUELVE en orden.
- **Formato de notificación personal:** llena fecha, nombre, cédula, acto, expediente, frase de recursos, nombre, CC, funcionario y cargo.
- **Navegador (`inspector`):** conducta del Auto con su regla especial, la medida bloqueada y la condicional; generar proyecto → descargar Word → cargar la firmada → paso Notificación con el formato personal y el resumen de la decisión.
- **Datos de prueba:** eliminados.

## Ajuste posterior: la decisión en el formato IV-F-117 «Modelo de resolución»

El usuario entregó `formatos/IV-F-117 Modelo de resolucion.doc`. Se convirtió a `formatos/Resolucion117.docx` (Word actual) y es la plantilla de la decisión. El despliegue la copia.

**Relleno automático** (`fill-formato-proceso.py`, tipo `resolucion`):

| Sección del IV-F-117 | Contenido |
|---|---|
| Encabezado (tabla) | Proceso (PVA art. 223 · expediente), quejoso, contraventor con CC/NIT, radicado y consecutivo (N.º de expediente), providencia "Decisión de fondo", temas (artículos de las conductas) |
| Hechos | Hechos probados, un párrafo por línea |
| Del procedimiento agotado | **Se arma desde el expediente**: radicación, Auto de Inicio firmado, cada audiencia (fecha, lugar, medio de citación, entrega y resultado o suspensión con su causa) |
| Normatividad aplicable | Art. 223, art. 206 (mod. Ley 2492/2025), el artículo de cada conducta y sus reglas especiales |
| Asunto a resolver | "Determinar si {contraventor} incurrió en el comportamiento… y, en caso afirmativo, las medidas…" |
| Tesis de la Inspección | Campo nuevo **opcional** en el formulario; si queda vacío, se conserva el espacio |
| De las pruebas y su valor | Actas de visita, pruebas ordenadas en audiencia (con su soporte), acta y grabación o constancia de cada audiencia, y la prueba de cada condición acreditada |
| Competencia | Art. 206 y trámite por el art. 223 |
| Conclusiones | La motivación |
| RESUELVE | PRIMERO (declaración y medidas, con "valor: ____" en las multas), orden de Policía, remisiones, recursos y notificación en estrados, cada numeral en su párrafo |
| Expedida | "Expedida en Envigado a los N días del mes de … de …" |

- **Queda a mano:** el **número de resolución** y la firma.
- **Sin plantilla:** si falta, se genera el borrador anterior.
- **En pantalla:** los botones dicen "Generar resolución (IV-F-117)" y "Descargar resolución IV-F-117 (Word)", y el archivo se llama `Resolucion-<expediente>.docx`.
- **Validación:** en un caso de ruido con multa condicional, orden de Policía y remisión, todas las secciones salieron llenadas, con el encabezado oficial "Resolución por Afectación Ambiental · IV-F-117 · Versión 002".

## Ajuste posterior: Auto de Archivo y cierre del expediente

Pregunta del usuario (con el expediente en "Auto de Archivo"): "¿esto dónde lo genero?". El paso no tenía formulario; se implementa el N2 `auto_archivo_cierre_documental_expediente_v1.1`.

**Pasos**
1. **Pendientes (ARC01):** si queda una medida correctiva sin cerrar, la orden de Policía sin cumplir o un recurso sin resolver, el bloque lo lista y **no deja archivar**. La idea es volver al paso pendiente.
2. **Causal (ARC02):** por defecto, **"El proceso se cerró conforme al procedimiento"** (decisión del usuario). Es editable, admite observación opcional y la casilla "Requiere notificación o comunicación".
3. **Auto de Archivo en Word (ARC03):** se genera con la plantilla de la Inspección `ActuoArchivo.docx` (igual a la entregada "Auto de archivo Inspeccion Ambiental.docx"). Lleva:
   - fecha de Envigado, radicado y consecutivo interno (N.º de expediente);
   - referencia (artículo · recurso · asunto);
   - motivo: causal, resumen de la decisión (fecha, firmeza, medidas cumplidas / sin medida / revocada), "no existen recursos, órdenes ni medidas pendientes" y la observación;
   - "Dada en Envigado a los…".
4. **Firma y archivo (ARC04–ARC09):** al cargar el **Auto de Archivo firmado (PDF)**:
   - el expediente queda **archivado** y el paso figura como cumplido;
   - se crea el registro del módulo **ActuoArchivo** para la trazabilidad;
   - la línea de tiempo del caso pasa a "Finalizado" con la referencia "Expediente archivado el…".
5. **Casos vinculados (ARC10):** cada caso queda **Finalizado** (ver el ajuste posterior). Las comunicaciones se siguen registrando.

- **Aviso:** "Expediente archivado", a los gestores y al Admin.
- **Cumplimiento (provisional):** hasta que exista su tramo guiado, "Registrar paso cumplido" en Cumplimiento deja las medidas en "Cumplida" (con la observación) y la orden en "Cumplida / Ejecutada".
- **Archivos:**
  - `Tools/CaseObj/CaseArchivoService.php` (nuevo)
  - `fill-formato-proceso.py` (tipo `archivo`)
  - `CaseProcesoService`, `CaseProcesoLectura` (fases `archivo` / `archivado`)
  - `CaseTimelineService`, `CaseCronogramaService`
  - `ProcesoFormatoGenerator::PLANTILLA_ARCHIVO`
  - campos `Expediente.autoArchivoFormato` y `autoArchivoFirmado`
  - bloque en `case-detail-side-panels.js`
- **Validación:**
  1. Decisión con multa → en firme → cumplimiento registrado → Auto de Archivo sin pendientes.
  2. Medida forzada "En ejecución" → 400 "No se puede archivar: Medida correctiva… en ejecución".
  3. Cerrada la medida: Word generado y revisado, cargado el firmado → expediente archivado, caso en "Pendiente de respuesta final" con su requisito de respuesta final, `ActuoArchivo` "Diligenciada" y todos los pasos cumplidos.

## Ajuste posterior: al archivar el expediente, sus casos quedan finalizados

**Pedido del usuario:** "si se cierra el expediente, que finalice el caso; se podrán enviar comunicaciones pero puede quedar cerrado; programa y actualiza los que están así".

**Cambio**
- Al cargar el Auto de Archivo firmado, cada caso vinculado pasa a **Finalizado**, en lugar de "Pendiente de respuesta final". La nota en la historia dice que se pueden seguir registrando comunicaciones.
- El aviso "Expediente archivado" informa que los casos quedaron finalizados.
- **Casos existentes:** se ejecutó `CaseArchivoService::finalizarCasos()` sobre los expedientes ya archivados. El caso RAD_PJ_002 (EXP-PJ-002) pasó de "Pendiente de respuesta final" a Finalizado.

**Validación**
- RAD_PJ_002 queda Finalizado y su línea de tiempo muestra "Finalizado · Expediente archivado el 28/09/2026".
- Una comunicación "Respuesta al peticionario" (respuesta final) se registró en el caso finalizado sin reabrirlo. Era de prueba y se borró.

**En Dokploy:** este cambio aún no está desplegado. Al desplegar no hay casos que actualizar, salvo que ya existan expedientes archivados.

## Pendientes

- **Tramo 3:**
  - Cumplimiento: gestión y ejecución de cada medida, Tesorería, verificación de la orden, reporte RNMC e incumplimiento con retorno a valoración.
  - Auto de Archivo: formato `ActuoArchivo.docx`, causal "proceso cerrado conforme al procedimiento" y cierre de los casos vinculados.
- Validar con la Inspección la redacción del proyecto de decisión: no hay formato institucional de fallo.
- El formato de notificación personal también puede servir para notificar el Auto de Inicio en la citación.
- La ruta de Maltrato Animal usa sus propios pasos ("Decisión de fondo"); su decisión guiada queda pendiente.

## Despliegue y reversión

- **Local:** `docker cp`, `rebuild` (campos nuevos del expediente), `clear-cache` y `update-app-timestamp`. En Dokploy, las plantillas se copian desde `formatos/`.
- **Reversión:** revertir el commit. Los expedientes en estos pasos volverían al botón genérico "Registrar paso cumplido".
