# Ajuste: Sección «Documentos del expediente» para consulta

| Campo | Detalle |
|---|---|
| Fecha | 2026-09-28 |
| Estado | Validado localmente |
| Responsable | Claude Code (sesión con Jonathan Ochoa) |
| Áreas o roles impactados | Quienes consultan expedientes (Admin, Director Técnico, Apoyo Jurídico, Inspector Ambiental…) |
| Versión de despliegue | local (Docker, no desplegado a Dokploy) |

## Objetivo

Pedido del usuario: "en expediente sería importante disponer una sección donde se vean los documentos de los casos relacionados en el expediente, para que puedan ser consultados, así como las fechas en que se hicieron".

## Cambio

**Ubicación:** en la vista del expediente, el panel nuevo **"Documentos del expediente"** va a todo el ancho y es el cuarto, después de Proceso, Línea de tiempo y Cronograma.

**Qué reúne**
- **De cada caso vinculado:** formato de solicitud, actas de visita (formato, diligenciadas, fotos), Auto de Inicio, comunicaciones, remisiones, recomendaciones e intervenciones técnicas, compromisos y adjuntos de la historia.
- **Del proceso:**
  - citaciones (Word y firmadas), actas de audiencia, audios, soportes de pruebas y justificaciones;
  - resolución IV-F-117 (Word y firmada);
  - notificaciones (formatos y constancias);
  - recursos (decisión de segunda instancia), oficio de remisión del expediente;
  - Auto de Archivo (Word y firmado).
- **Qué no repite:** las copias del mismo archivo (por ejemplo, la resolución firmada que se vincula a cada medida) y las cargas temporales.

**Columnas**

| Columna | Qué muestra |
|---|---|
| Fecha del acto | Cuándo se hizo la actuación: fecha de la queja, de la visita, del Auto o de su firma, de la audiencia, de la entrega de la citación, de la notificación, del recurso o de la firma de la resolución y del Auto de Archivo |
| Fecha de carga | Cuándo se subió o generó el archivo |
| Documento | Nombre legible y nombre del archivo, con ícono por tipo |
| Etapa | Solicitud, Gestión técnica, Apertura, Citación y audiencia, Decisión, Notificación y recursos, Cumplimiento, Archivo, Comunicaciones u Otros |
| Origen | Registro de donde sale (p. ej. "Audiencia N.º 1 · Exp. …") |
| Caso | Enlace al caso |
| Cargado por | Quién lo subió o generó |
| Acciones | Abrir y descargar |

- **Filtros:** por etapa, por caso (si hay más de uno) y búsqueda por texto. Orden: más reciente primero.

**Archivos**
- `Tools/Expediente/ExpedienteDocumentosService.php` (nuevo)
- `Controllers/Expediente.php` (`documentos`)
- `views/expediente/record/panels/documentos.js` (nuevo)
- `clientDefs/Expediente.json`
- estilos en `33-case-asignacion.css`

## Ajuste posterior: solo la versión vigente de cada documento

**Problema:** el usuario vio el "Formato de solicitud" repetido cuatro veces en el expediente EXP-PJ-002.

**Causa:** el formato de solicitud se regenera cada vez que se guarda el caso (Patrullero, Director Técnico, Radicador), y las versiones anteriores siguen adjuntas. Lo mismo puede pasar con el Auto de Inicio si se envía a firma más de una vez.

**Corrección** (`esVigente()` en `ExpedienteDocumentosService`): solo se lista la versión que el registro tiene asignada.

| Tipo de campo | Qué se lista |
|---|---|
| Archivo único | El que apunta el campo |
| Varios archivos | Los de la lista del campo |
| Proyecto del expediente (resolución y formato de notificación) | Los que están en la decisión |

**Validación:** en EXP-PJ-002 quedan 15 documentos sin repetidos: el formato de solicitud vigente (una vez) y el acta de visita, además de los del proceso.

## Validación (local, `juridica`)

- **Expediente con dos casos** (el segundo incorporado por la apertura): muestra 11 documentos de ambos casos y del proceso, con etapa, origen, caso, quién lo cargó y las dos fechas.
- **Filtro:** "Citación y audiencia" deja 3 de 11.
- **Orden de los paneles:** Proceso, Línea de tiempo, Cronograma, Documentos.
- **Datos de prueba:** eliminados.

## Nota

El rol **Aux. Administrativo · Inspección** no tiene acceso al módulo de Expedientes. Consulta los documentos desde cada caso.
