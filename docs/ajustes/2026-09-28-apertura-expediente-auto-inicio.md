# Ajuste: Apertura de actuación: decisión, preparación y firma del Auto de Inicio (tramo G)

| Campo | Detalle |
|---|---|
| Fecha | 2026-09-28 |
| Estado | Validado localmente |
| Responsable | Claude Code (sesión con Jonathan Ochoa) |
| Áreas o roles impactados | Admin, Director Técnico, Inspector Ambiental y Apoyo Jurídico (deciden); Apoyo Jurídico (prepara); Inspector Ambiental (firma); Aux. Administrativo · Inspección (cita/notifica) |
| Versión de despliegue | local (Docker, no desplegado a Dokploy) |

## Objetivo

Implementar el N1 · Preparación y Apertura de Expediente (`06_APERTURA_EXPEDIENTE`, BPMN `preparacion_apertura_expediente_v1.1`).

Antes, "Abrir Auto de Inicio" abría el formulario a quien decidía, y al guardar se creaba el Expediente ya "Abierto": sin preparación, firma ni revisión de expedientes existentes. El Inspector Ambiental no podía decidir.

## Decisiones del usuario

1. La apertura la deciden **Admin, Director Técnico e Inspector Ambiental**.
2. El Inspector recibe el **formato prellenado** con todo lo que hay, **firma** fuera del CRM y **carga el PDF**.
3. Se revisa si existe un expediente abierto, con **todos los criterios posibles**.
4. Formato oficial: `formatos/FORMATOS AUTO DE INICIO Inspección Ambiental.docx` (IV-F-364, "Auto de Inicio y Acción de Policía").

## Flujo

| Paso | Quién | Qué pasa | Aviso a |
|---|---|---|---|
| Definición "Apertura de actuación" → "Guardar y decidir la apertura" | Admin / Director / Inspector Ambiental (la opción no aparece para los demás; servidor: 403) | Se guarda la revisión | — |
| **G1/G2 · Decidir** (bloque "Apertura de expediente") | Mismos | Se elige **abrir expediente nuevo** (**ruta jurídica N2**, ver [ajuste de ruta](2026-09-28-ruta-juridica-apertura.md)) o **incorporar** a uno sugerido, con motivación. Se registra una `DecisionRutaJuridica` y una nota en la historia. | Nuevo: **Jurídica** "Prepare el Auto de Inicio…" + copia al Director y al Admin. Incorporación: Jurídica + Inspector |
| **G3 · Preparar** | Apoyo Jurídico (o Admin) | "Preparar / Editar Auto de Inicio" (motivo, **norma aplicable**, **fecha y hora de la audiencia**) → "Enviar a firma". Genera el **formato prellenado en Word** (antes también en PDF; ver [ajuste posterior](2026-09-28-auto-inicio-normas-hora-word.md)). | **Inspector**: "…Descargue el formato prellenado, fírmelo y cargue el PDF" |
| **G4 · Firmar** | Inspector Ambiental (o Inspección, o Admin) | Descarga el formato, lo firma y **carga el PDF** → "Aprobar y abrir expediente". O "Devolver a Jurídica" con observaciones. | Firmado: **Jurídica + Aux. Inspección** "Proceda con la citación y notificación" + copia al Director y al Admin. Devuelto: Jurídica con el motivo |
| G5 | Sistema | Expediente "Abierto" con `fechaAperturaFormal`; la línea de tiempo pasa a los pasos del proceso (Ley 1801: "Audiencia pública"…) | — |

Mientras el expediente está en "Preparación", la línea de tiempo del caso sigue en "Revisión de hallazgos" con la nota "Apertura de actuación · Expediente N.º … en preparación · [fase]".

### Avisos de la apertura (nunca a quien hace la acción)

| Cuando alguien… | Reciben aviso |
|---|---|
| Guarda la definición "Apertura de actuación" | Director Técnico, Inspector Ambiental, Apoyo Jurídico y Admin: "pendiente de decisión" |
| Decide abrir expediente nuevo | **Apoyo Jurídico**: "Prepare el Auto de Inicio" (accionable) · Director, Inspector Ambiental y Admin: "Apertura decidida" (copia) |
| Incorpora el caso a un expediente existente | Apoyo Jurídico e Inspector |
| Envía el Auto a firma | Inspector (Inspector Ambiental / Inspección): "Descargue, firme y cargue el PDF" |
| Devuelve el Auto | Apoyo Jurídico, con el motivo |
| Firma y abre el expediente | **Apoyo Jurídico y Aux. Administrativo · Inspección**: "Citar y notificar" (accionable) · Director y Admin (copia) |

### Criterios de coincidencia (sugerencia; la persona decide)

Se comparan los casos de cada expediente no archivado con el caso actual:

| Peso | Criterio |
|---|---|
| 5 | Mismo documento del presunto infractor · mismo Destino · casos relacionados entre sí (Relación de casos) |
| 3 | Mismo nombre del presunto infractor (normalizado) · misma dirección de la afectación |
| 2 | Mismo peticionario |
| 1 | Mismo barrio y mismo recurso/tema · mismo asunto en los últimos 12 meses |

### Formato prellenado

- **Ley 1801 (policía):** se usa la plantilla oficial `AutoInicio.docx` (copia del formato entregado) y se reemplazan sus textos guía conservando encabezado IV-F-364, logo y texto legal. Fecha; Quejoso; Citado (nombre e identificación); Radicado y consecutivo (radicado · expediente); Dirección; Tema (Ley 1801 · recurso · asunto); Asunto ("en contra de…", "por afectación ambiental: …"); norma aplicable; consideraciones (motivo de apertura); fecha y hora de la audiencia; nombre del inspector. Lo que falte queda con su espacio subrayado.
- **Maltrato animal:** no hay formato de apertura en el BPMN; se genera un **borrador provisional "POR VALIDAR"**. (La Ley 1333 salió de la apertura: se atiende por remisión a la autoridad ambiental.)

## Cambio

| Acción | Ruta | Propósito |
|---|---|---|
| Creado | `espocrm-custom/Tools/CaseObj/CaseAperturaService.php` | Candidatos, decidir / incorporar, enviar a firma (genera formatos), firmar, devolver, estado, avisos y notas. |
| Creado | `espocrm-custom/files/scripts/fill-formato-auto-inicio.py` | Relleno de la plantilla oficial (XML del Word + LibreOffice a PDF) o borrador HTML. |
| Creado | `formatos/AutoInicio.docx` + paso en `scripts/deploy-custom-dokploy.sh` | Plantilla oficial IV-F-364. |
| Modificado | `espocrm-custom/Controllers/CaseObj.php` | `GET Case/action/aperturaEstado`, `POST Case/action/aperturaAccion`. Inspector Ambiental en las acciones de revisión. La definición "Apertura de actuación" queda restringida. |
| Modificado | `espocrm-custom/Tools/User/AlcaldiaUserProfile.php` | `isInspectorAmbiental`, `canDecidirApertura`, `canFirmarAutoInicio`, `findActiveInspectorFirmanteUserIds`. |
| Modificado | `espocrm-custom/Resources/metadata/entityDefs/Expediente.json`, i18n | Estado "Preparación" y `fechaAperturaFormal`. |
| Modificado | `espocrm-custom/Resources/metadata/entityDefs/AutoInicio.json`, i18n, layouts | Estados "Para firma", "Devuelto" y "Firmado". Campos `normaAplicable`, `fechaAudiencia`, `horaAudiencia`, `cFormatoAutoInicioDocx`, `actoFirmado`, `fechaFirma`, `observacionesDevolucion`. |
| Modificado | `espocrm-custom/Hooks/AutoInicio/SyncExpedienteAndCase.php` | Si el caso ya tiene expediente (en preparación), el Auto se enlaza a ese y no crea otro. |
| Modificado | `espocrm-custom/Hooks/AutoInicio/NotifyOnAutoInicioCreated.php` | No avisa "proceso iniciado" mientras el expediente está en preparación (el aviso sale al firmar). |
| Modificado | `espocrm-custom/Tools/CaseObj/CaseTimelineService.php` | Expediente en preparación → línea de tiempo normal con la nota de la fase. |
| Modificado | `espocrm-custom/files/client/custom/src/helpers/case-detail-side-panels.js` | Bloque "Apertura de expediente" por fase y rol. Los bloques de apertura y cierre escuchan los cambios del caso desde el inicio (antes el de cierre no aparecía hasta recargar). |
| Modificado | `espocrm-custom/files/client/custom/src/views/case/fields/decision-juridica.js`, `acta-visita-action.js` | Inspector Ambiental en la revisión. La opción de apertura se oculta a quien no decide. El formulario se oculta con la apertura decidida o con expediente. |
| Modificado | `espocrm-custom/files/client/custom/src/helpers/alcaldia-notification-message.js`, `res/css/33-case-asignacion.css` | Textos de los avisos y estilos. |

## Validación

**API** (casos A y B con el mismo presunto infractor):
- Jurídica / Inspección intentan decidir: 403.
- Inspector decide A → expediente 2026-4 "Preparación"; línea de tiempo "…en preparación · Auto de Inicio por preparar"; aviso a Jurídica.
- Enviar a firma sin motivo: 400. Con motivo: "Para firma", PDF y Word generados (≈1 s); aviso al Inspector.
- Devolver → "Devuelto" y aviso a Jurídica con el motivo. Reenviar → "Para firma".
- Firmar (Patrullero: 403) → Auto "Firmado", expediente "Abierto" con fecha de apertura formal; línea de tiempo "Audiencia pública" (12 pasos, ruta policiva); avisos a Jurídica, Aux. Inspección, Director y Admin.
- B: candidato 2026-4 con motivos "Mismo documento del presunto infractor · Mismo nombre · Mismo peticionario · Mismo asunto…" → incorporado al 2026-4.

**Formato:** PDF generado con el IV-F-364 oficial y los datos del caso (quejoso, citado con NIT, radicado · expediente, tema, asunto, norma, motivación, audiencia "15 de octubre de 2026 a las 9:00 a. m.", inspector).

**Interfaz (Playwright):**
- `asignacion`: la opción "Apertura de actuación" está disponible. Tras guardarla, el bloque muestra "Abrir expediente nuevo" y dos candidatos con sus coincidencias; el formulario de revisión desaparece.
- `inspector`: bloque "Pendiente de firma" con las descargas PDF y Word. Al cargar el PDF y confirmar: "Expediente 2026-5 · Abierto · abierto el 2026-09-28 · Auto de Inicio firmado".
- Campanita de Jurídica, Inspector y Aux. Inspección con los textos de cada paso.

Datos de prueba eliminados.

## Corrección (mismo día): Jurídica también decide y se avisa al guardar la apertura

**Reporte:** el usuario puso `RAD-PJ-001` en "Apertura de actuación" y a Jurídica no le apareció: Jurídica no podía decidir y no recibía aviso hasta que otro decidiera.

**Decisión del usuario:** Apoyo Jurídico **también puede decidir** la apertura.

**Cambio:**
- `AlcaldiaUserProfile::canDecidirApertura` incluye Apoyo Jurídico (servidor y pantalla).
- Nuevo aviso **"Apertura de actuación pendiente de decisión"** al guardar la definición "Apertura de actuación", para Director Técnico, Inspector Ambiental, Apoyo Jurídico y Admin (sin avisar a quien la guardó).
- Para `RAD-PJ-001`, guardado antes del cambio, se envió el aviso a mano.

**Validación:** `juridica` recibe el aviso; en `RAD-PJ-001` ve el bloque "Decisión de apertura" con el régimen, la motivación y "Confirmar apertura" (`puede.decidir = true`).

**Ajuste posterior:** la copia "Apertura decidida" llegaba solo al Director y al Admin; ahora llega también al Inspector Ambiental (a todos los que pueden decidir, excepto Jurídica, que recibe el aviso accionable).

## Ajuste posterior: ubicación de los bloques

Pedido del usuario: "cuando se haga la apertura, pon encima de la línea de tiempo la apertura".

Los bloques **"Apertura de expediente"** y **"Proceso del expediente"** quedaban al final de la columna lateral, debajo de visitas, publicaciones y comunicaciones. Ahora quedan **encima de la línea de tiempo**, en este orden:

1. Apertura
2. Proceso del expediente
3. Línea de tiempo
4. Cronograma
5. El resto

El orden se mantiene al actualizar el caso. Se implementa con `ubicarBloquesExpediente()` en `case-detail-side-panels.js`.

## Pendientes

- **Maltrato animal:** validar el formato del acto de apertura (hoy borrador).
- Los expedientes creados antes siguen como estaban. La numeración consecutiva de expedientes no cambia.
- La citación y notificación posteriores (H5) y la ruta N2 (PVA, etc.) son el siguiente tramo.

## Despliegue y reversión

Local: `docker cp`, `rebuild`, `clear-cache` y `update-app-timestamp`. En Dokploy, la plantilla se copia desde `formatos/` en el despliegue. Reversión: revertir el commit.
