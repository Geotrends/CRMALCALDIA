# Almacenamiento de documentos — CRM Ambiental

Guía de **dónde quedan guardados** todos los archivos del CRM: formatos generados, plantillas, Excel, fotos, actas diligenciadas a mano, comunicaciones y lo que sube el usuario.

**Entorno de referencia:** contenedor Docker `espocrm`, ruta base `/var/www/html/`.

---

## Índice

1. [Mapa general](#1-mapa-general)
2. [Carpetas físicas en el servidor](#2-carpetas-físicas-en-el-servidor)
3. [Base de datos (índice lógico)](#3-base-de-datos-índice-lógico)
4. [Plantillas oficiales (fuente, no son los PDFs del trámite)](#4-plantillas-oficiales-fuente-no-son-los-pdfs-del-trámite)
5. [Formatos generados automáticamente (PDF)](#5-formatos-generados-automáticamente-pdf)
6. [Vista previa, descarga e impresión](#6-vista-previa-descarga-e-impresión)
7. [Archivos que sube el usuario](#7-archivos-que-sube-el-usuario)
8. [Excel oficial Alcaldía](#8-excel-oficial-alcaldía)
9. [Módulo Documentos (menú lateral)](#9-módulo-documentos-menú-lateral)
10. [Consultas SQL útiles](#10-consultas-sql-útiles)
11. [Resumen por tipo de archivo](#11-resumen-por-tipo-de-archivo)

---

## 1. Mapa general

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         REPOSITORIO (Git)                                │
│  formatos/          → plantillas Word originales (deploy)               │
│  exports/           → excelAlcaldia.xlsx semilla                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │ deploy
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    SERVIDOR (contenedor espocrm)                         │
│                                                                          │
│  custom/.../files/templates/   → plantillas Word/PDF base en runtime    │
│                                                                          │
│  /tmp/formato-*                → generación temporal (se borra)         │
│                                                                          │
│  data/upload/                  → TODOS los adjuntos persistentes        │
│  data/exports/excelAlcaldia.xlsx → Excel maestro de trabajo             │
│                                                                          │
│  PostgreSQL                    → quién es cada archivo (attachment,     │
│                                  case, acta_visita, document, etc.)     │
└─────────────────────────────────────────────────────────────────────────┘
```

**Regla clave:** casi todo archivo “del CRM” (PDFs, fotos, scans, plantillas publicadas) termina en **`data/upload/`** con un nombre hash. La base de datos dice **qué es** y **a qué registro pertenece**.

---

## 2. Carpetas físicas en el servidor

| Ruta en contenedor | Qué guarda | ¿Persiste? |
|--------------------|------------|------------|
| `/var/www/html/data/upload/` | Binarios de adjuntos EspoCRM (PDFs, fotos, Word, Excel copiado a Documentos) | **Sí** (volumen Docker) |
| `/var/www/html/data/upload/thumbs/` | Miniaturas de imágenes | **Sí** |
| `/var/www/html/data/exports/excelAlcaldia.xlsx` | Excel maestro operativo (filas de casos) | **Sí** |
| `/var/www/html/custom/Espo/Custom/files/templates/` | Plantillas Word/PDF **base** para generar formatos | **Sí** (viene del deploy) |
| `/tmp/formato-solicitud-*` | PDF temporal al generar formato solicitud | **No** (se elimina) |
| `/tmp/formato-acta-visita-*` | PDF temporal al generar acta | **No** |
| `/tmp/formato-actuo-archivo-*` | PDF/DOCX temporal al generar actuo | **No** |
| `/tmp/reporte-gerencial-*` | Reporte gerencial temporal | **No** |

En **Dokploy/producción**, `data/` vive en el volumen persistente del servicio `espocrm`.

En el **repo del proyecto** (no es donde el CRM guarda trámites en runtime):

| Ruta repo | Propósito |
|-----------|-----------|
| `formatos/` | Fuente de plantillas Word al construir la imagen |
| `exports/` | Copia inicial del Excel (puede estar vacío con `.gitkeep`) |

---

## 3. Base de datos (índice lógico)

EspoCRM no guarda el archivo dentro de la fila del caso: guarda un **ID de adjunto**.

### Tabla principal: `attachment`

| Columna | Significado |
|---------|-------------|
| `id` | ID del adjunto (ej. `664a1b2c3d4e5f60`) |
| `name` | Nombre legible (`ActaVisita-AIR-2026-001.pdf`) |
| `type` | MIME (`application/pdf`, `image/jpeg`, etc.) |
| `storage_file_path` | Nombre del archivo en disco dentro de `data/upload/` |
| `parent_type` / `parent_id` | Entidad dueña (ej. `Case`, `ActaVisita`) |
| `related_type` / `related_id` | Entidad relacionada (campos `attachmentMultiple`) |
| `field` | Campo del formulario al que pertenece |

### Tablas que apuntan a adjuntos

| Tabla | Campo | Documento |
|-------|-------|-----------|
| `case` | `c_formato_solicitud_pdf_id` | PDF formato solicitud guardado en el caso |
| `acta_visita` | `c_formato_acta_visita_pdf_id` | PDF acta de visita guardado |
| `actuo_archivo` | `c_formato_actuo_archivo_pdf_id` | PDF auto de archivo guardado |
| `document` | `file_id` | Archivo del registro en menú Documentos |

Los campos **`attachmentMultiple`** (fotos, acta a mano, adjuntos de comunicación) no tienen columna `*_id` en la entidad: EspoCRM enlaza varios registros en `attachment` con `related_type`, `related_id` y `field`.

---

## 4. Plantillas oficiales (fuente, no son los PDFs del trámite)

Son los **moldes** con los que el sistema rellena datos. **No** son los PDFs que ve el ciudadano en el caso.

| Plantilla | Origen en repo | En servidor (runtime) |
|-----------|----------------|------------------------|
| Formato solicitud | `formatos/FormatoSolicitud.doc` | `custom/.../files/templates/FormatoSolicitud.doc` + `FormatoSolicitud-template.pdf` |
| Acta de visita | `formatos/ActaVisita2.docx` | `.../ActaVisita2.docx` + `ActaVisita2-template.pdf` |
| Actuo archivo | `formatos/ActuoArchivo.docx` | `.../ActuoArchivo.docx` + `ActuoArchivo-template.pdf` |

**Scripts que las usan:** `fill-formato-solicitud.py`, `fill-formato-acta-visita.py`, `fill-formato-actuo-archivo.py` (carpeta `espocrm-custom/files/scripts/`).

**Generadores PHP:** `FormatoSolicitudGenerator`, `FormatoActaVisitaGenerator`, `FormatoActuoArchivoGenerator`.

---

## 5. Formatos generados automáticamente (PDF)

Estos son los PDFs **del trámite**, rellenados con datos del caso/acta/actuo.

### 5.1 Formato de solicitud (Case)

| Dato | Valor |
|------|-------|
| **Cuándo se guarda** | Después de **radicación completa** (radicado + expediente), al guardar el caso si cambian datos relevantes |
| **Hook** | `GenerateFormatoSolicitudOnSave.php` |
| **Servicio** | `FormatoSolicitudAttacher.php` |
| **Campo en pantalla** | `cFormatoSolicitudPdf` (panel **Formatos generados** del caso) |
| **Columna BD** | `case.c_formato_solicitud_pdf_id` |
| **Archivo en disco** | `data/upload/{hash}` vía tabla `attachment` |
| **Nombre típico** | `FormatoSolicitud-{radicado}.pdf` |

### 5.2 Acta de visita (ActaVisita)

| Dato | Valor |
|------|-------|
| **Cuándo se guarda** | Al **crear o editar** el acta (modo digital con contenido, o con adjunto manual) |
| **Hook** | `GenerateFormatoActaVisitaOnSave.php` |
| **Servicio** | `FormatoActaVisitaAttacher.php` |
| **Campo** | `cFormatoActaVisitaPdf` |
| **Columna BD** | `acta_visita.c_formato_acta_visita_pdf_id` |
| **Archivo en disco** | `data/upload/{hash}` |
| **Nombre típico** | `ActaVisita-{radicado}.pdf` |

**Modo manual:** si `modoDiligenciamiento = Manual` y solo suben el scan (`formatoManoAdjunto`) sin texto digital, **no** se regenera PDF automático hasta que haya contenido o adjunto.

### 5.3 Auto de archivo (ActuoArchivo)

| Dato | Valor |
|------|-------|
| **Cuándo se guarda** | Al guardar el actuo con **`motivoArchivo`** diligenciado |
| **Hook** | `GenerateFormatoActuoArchivoOnSave.php` |
| **Servicio** | `FormatoActuoArchivoAttacher.php` |
| **Campo** | `cFormatoActuoArchivoPdf` |
| **Columna BD** | `actuo_archivo.c_formato_actuo_archivo_pdf_id` |
| **Archivo en disco** | `data/upload/{hash}` |
| **Nombre típico** | `AutoArchivo-{radicado}.pdf` |

### Flujo de guardado (común a los tres)

```
1. Usuario guarda entidad (Case / ActaVisita / ActuoArchivo)
2. Hook afterSave detecta cambios
3. Generator crea PDF en /tmp/formato-.../
4. Attacher lee el PDF y hace Attachment::setContents()
5. EspoCRM escribe bytes en data/upload/{hash}
6. Se guarda el ID en el campo file del registro
7. Se borra /tmp/formato-.../
```

---

## 6. Vista previa, descarga e impresión

Desde el panel **Formatos generados** del caso (o botones de acta/actuo), el usuario puede **ver** o **descargar** sin ir al adjunto guardado: el sistema **regenera** el archivo en el momento.

| Acción en UI | Entry point | ¿Lee adjunto guardado? | ¿Guarda en disco? |
|--------------|-------------|------------------------|-------------------|
| Vista previa formato solicitud | `FormatoSolicitud` | No — regenera desde plantilla + datos del caso | No — `/tmp`, se borra al terminar la petición |
| Vista previa / descarga acta (desde caso) | `FormatoActaVisitaCaso` | No — regenera | No — temporal |
| Descarga acta (desde registro ActaVisita) | `FormatoActaVisita` | No — regenera | No — temporal |
| Vista previa / descarga actuo PDF | `FormatoActuoArchivoCaso` | No — regenera | No — temporal |
| Descarga actuo Word editable | `FormatoActuoArchivoCaso&format=docx` | No — regenera DOCX | No — temporal |
| Descarga Excel oficial | `ExcelAlcaldiaDownload` | **Sí** — lee `data/exports/excelAlcaldia.xlsx` | No crea copia nueva |
| Vista previa Excel en modal | API `Document/action/excelAlcaldiaPreview` | **Sí** — lee el Excel de `data/exports/` | No |

**Imprimir** en el navegador = abrir vista previa (`inline=1`) → el PDF se genera en `/tmp`, se muestra en otra pestaña y **se elimina** al cerrar la petición.

**Importante:** el PDF **persistente** es el del hook (sección 5). La vista previa/descarga del panel puede coincidir en contenido, pero **no es el mismo archivo en disco** que el adjunto guardado.

---

## 7. Archivos que sube el usuario

### 7.1 Fotos en acta de visita

| Campo | Entidad | Tipos aceptados | Dónde queda |
|-------|---------|-----------------|-------------|
| `registroFotografico` | ActaVisita | Imágenes (`image/*`) | `data/upload/` + enlaces en `attachment` (`related_type = ActaVisita`, `field = registroFotografico`) |

En el PDF generado, si hay fotos, el texto del campo `registroFotografico` indica: *"Ver registro fotográfico adjunto en el CRM"* (las imágenes **no** se incrustan en el PDF; quedan como adjuntos del acta).

### 7.2 Acta diligenciada a mano (scan / PDF / Word)

| Campo | Entidad | Tipos aceptados | Dónde queda |
|-------|---------|-----------------|-------------|
| `formatoManoAdjunto` | ActaVisita | Imágenes, PDF, `.doc`, `.docx` | `data/upload/` + `attachment` (`field = formatoManoAdjunto`) |

Uso típico: patrullero diligencia en papel, escanea y sube el archivo aquí. Es **independiente** del PDF auto-generado `cFormatoActaVisitaPdf`.

### 7.3 Adjuntos en comunicaciones del caso

| Campo | Entidad | Tipos | Dónde queda |
|-------|---------|-------|-------------|
| `adjuntos` | ComunicacionCaso | Varios (citaciones, oficios, etc.) | `data/upload/` + `attachment` (`field = adjuntos`) |

Panel: **Comunicaciones** del detalle del caso.

### 7.4 Documentos del menú lateral (subida manual)

Si un usuario con permiso crea o edita un registro en **Documentos** y adjunta un archivo:

| Dónde en UI | Tabla | Archivo |
|-------------|-------|---------|
| Menú → Documentos | `document` + `document.file_id` → `attachment` | `data/upload/{hash}` |

Las **plantillas oficiales** del sistema (formato solicitud, acta, actuo, Excel) se cargan por script `configure-document-plantillas.php` y `configure-excel-alcaldia-document.php`, no por el usuario en operación normal.

---

## 8. Excel oficial Alcaldía

Este archivo tiene **dos roles**:

### 8.1 Archivo de trabajo (maestro)

| Ruta | `data/exports/excelAlcaldia.xlsx` |
|------|-----------------------------------|
| **Cuándo se actualiza** | Al radicar un caso (`ExportCaseExcelAlcaldiaOnSave`) y al guardar acta (`ExportActaVisitaExcelOnSave`) |
| **Script Python** | `upsert-excel-alcaldia.py` |
| **Quién lo lee** | Vista previa HTML (`render-excel-alcaldia-preview.py`), descarga directa (`ExcelAlcaldiaDownload`) |

### 8.2 Copia en módulo Documentos

| Ruta lógica | Registro `Document` categoría **Excel oficial** |
|-------------|--------------------------------------------------|
| **Archivo físico** | Otra copia en `data/upload/` (adjunto del Document) |
| **Sincronización** | `ExcelAlcaldiaDocumentSync.php` copia el contenido del maestro al adjunto del Document |

**Resumen:** el Excel “vivo” que crece con cada caso radicado está en **`data/exports/`**. La copia en Documentos es para que aparezca en el menú y se pueda descargar/ver desde ahí.

---

## 9. Módulo Documentos (menú lateral)

| Categoría (`cCategoria`) | Contenido | Origen del archivo |
|--------------------------|-----------|-------------------|
| Formato solicitud | Plantilla Word de solicitud | `configure-document-plantillas.php` |
| Acta de visita | Plantilla Word del acta | Idem |
| Actuo archivo | Plantilla Word del actuo | Idem |
| Excel oficial | Copia del Excel maestro | `configure-excel-alcaldia-document.php` + sync al exportar |

Todos los archivos visibles en Documentos están en **`data/upload/`** (campo `document.file_id`).

La **vista previa HTML del Excel** no guarda nada nuevo: convierte en memoria el `.xlsx` de `data/exports/` a tabla HTML (ver `ExcelAlcaldiaPreviewService` + `render-excel-alcaldia-preview.py`).

---

## 10. Consultas SQL útiles

Ejecutar en `espocrm-db` (Dokploy → terminal → `psql`).

### Últimos adjuntos del sistema

```sql
SELECT
    a.id,
    a.name,
    a.type,
    a.storage_file_path,
    a.parent_type,
    a.parent_id,
    a.related_type,
    a.related_id,
    a.field,
    a.created_at
FROM attachment a
WHERE a.deleted = false
ORDER BY a.created_at DESC
LIMIT 30;
```

### PDFs de un caso (formato solicitud)

```sql
SELECT
    c.id AS case_id,
    c.c_numero_radicado,
    a.id AS attachment_id,
    a.name,
    a.storage_file_path
FROM "case" c
LEFT JOIN attachment a ON a.id = c.c_formato_solicitud_pdf_id AND a.deleted = false
WHERE c.deleted = false
  AND c.c_numero_radicado IS NOT NULL
ORDER BY c.created_at DESC
LIMIT 20;
```

### Acta: PDF generado + fotos + acta a mano

```sql
SELECT
    av.id AS acta_id,
    av.numero_radicado,
    av.modo_diligenciamiento,
    pdf.name AS pdf_generado,
    pdf.storage_file_path AS pdf_path
FROM acta_visita av
LEFT JOIN attachment pdf ON pdf.id = av.c_formato_acta_visita_pdf_id AND pdf.deleted = false
WHERE av.deleted = false
ORDER BY av.created_at DESC
LIMIT 10;

-- Adjuntos múltiples del acta (fotos y formato a mano)
SELECT
    a.name,
    a.type,
    a.field,
    a.storage_file_path,
    a.related_id AS acta_id
FROM attachment a
WHERE a.deleted = false
  AND a.related_type = 'ActaVisita'
  AND a.field IN ('registroFotografico', 'formatoManoAdjunto')
ORDER BY a.created_at DESC
LIMIT 30;
```

### Documentos del menú lateral

```sql
SELECT
    d.name,
    d.c_categoria,
    a.name AS file_name,
    a.storage_file_path
FROM document d
LEFT JOIN attachment a ON a.id = d.file_id AND a.deleted = false
WHERE d.deleted = false
ORDER BY d.c_categoria;
```

### Ruta física a partir de `storage_file_path`

Si `storage_file_path = '6a453cd06af553944'`, el archivo está en:

```
/var/www/html/data/upload/6a453cd06af553944
```

---

## 11. Resumen por tipo de archivo

| Qué es | ¿Dónde queda guardado? | ¿Cuándo? |
|--------|------------------------|----------|
| Plantilla Word/PDF base | `custom/.../files/templates/` | Deploy |
| PDF formato solicitud (persistente) | `data/upload/` + `case.c_formato_solicitud_pdf_id` | Tras radicar y guardar caso |
| PDF acta generada | `data/upload/` + `acta_visita.c_formato_acta_visita_pdf_id` | Al guardar acta |
| PDF actuo generado | `data/upload/` + `actuo_archivo.c_formato_actuo_archivo_pdf_id` | Al guardar actuo con motivo |
| Fotos del acta | `data/upload/` + `attachment` (`registroFotografico`) | Al subir en el formulario del acta |
| Acta escaneada a mano | `data/upload/` + `attachment` (`formatoManoAdjunto`) | Al subir en el acta |
| Adjuntos comunicación | `data/upload/` + `attachment` (`adjuntos`) | Al crear comunicación |
| Excel maestro | `data/exports/excelAlcaldia.xlsx` | Al radicar / actualizar acta |
| Excel en Documentos | `data/upload/` + `document.file_id` | Sync desde maestro |
| Plantillas en Documentos | `data/upload/` + `document.file_id` | Script de deploy |
| Vista previa / imprimir PDF | `/tmp/formato-*` (temporal) | Cada clic; **no persiste** |
| Vista previa Excel HTML | No guarda archivo; lee `data/exports/` | Cada apertura del modal |

---

## Referencias en código

| Componente | Ruta |
|------------|------|
| Adjuntar PDF solicitud | `Tools/CaseObj/FormatoSolicitudAttacher.php` |
| Adjuntar PDF acta | `Tools/ActaVisita/FormatoActaVisitaAttacher.php` |
| Adjuntar PDF actuo | `Tools/ActuoArchivo/FormatoActuoArchivoAttacher.php` |
| Excel export/sync | `Tools/CaseObj/ExcelAlcaldiaExporter.php`, `ExcelAlcaldiaDocumentSync.php` |
| Entry points descarga | `espocrm-custom/EntryPoints/` |
| Reset borra uploads | `scripts/reset-operational-data.php` → `data/upload/` |

Documentación relacionada: [`CONSULTAS-BD-VALIDACION.md`](CONSULTAS-BD-VALIDACION.md), [`GUIA-HANDOFF-PROYECTO.md`](GUIA-HANDOFF-PROYECTO.md).
