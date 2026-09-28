# Ajuste: Auto de Inicio con catálogo de normas, hora con selector y formato en Word

| Campo | Detalle |
|---|---|
| Fecha | 2026-09-28 |
| Estado | Validado localmente |
| Responsable | Claude Code (sesión con Jonathan Ochoa) |
| Áreas o roles impactados | Apoyo Jurídico (prepara el Auto), Inspector Ambiental (descarga y firma) |
| Versión de despliegue | local (Docker, no desplegado a Dokploy) |

## Objetivo

Pedidos del usuario:

1. Al crear el Auto de Inicio, elegir las normas y artículos de una lista, "según nuestro ejercicio", en lugar de escribirlos.
2. Elegir la hora de la audiencia con un selector de hora (reloj).
3. Descargar el formato en Word.

## Cambio

### Normas y artículos aplicables

El Auto de Inicio tiene un nuevo campo **"Normas y artículos aplicables"** (`normasSeleccionadas`). Es una selección múltiple con buscador.

**Catálogo:** `espocrm-custom/Resources/metadata/app/normasAutoInicio.json`, generado desde el modelo BPMN (`90_MODELO_CRM/matriz_conducta_medida` v1.1 · `viewer/public/medidas_correctivas.json`, 2026-09-10). Tiene 46 entradas:

- **Procedimiento y competencia:** Ley 1801 de 2016 art. 223 (Proceso Verbal Abreviado) y art. 206 modificado por la Ley 2492 de 2025 (competencia del Inspector de Convivencia y Paz).
- **Las 43 conductas de la matriz:** ruido (art. 93, Ley 2450/2025), agua (art. 100), flora y fauna silvestre (art. 101), aire (art. 102), animales (art. 116), tenencia de animales (art. 124) y caninos de manejo especial (art. 134).
- **Maltrato animal:** Ley 84 de 1989 modificada por la Ley 2455 de 2025.

**Cómo ayuda el campo:**

- Al abrir un Auto nuevo se precargan las normas de procedimiento de la ruta del expediente: art. 223 y art. 206 en las rutas de la Ley 1801, Ley 84/1989 en Maltrato Animal. El tipo de trámite también se precarga con la ruta del expediente (antes decía "Sin definir").
- La lista pone primero el procedimiento y luego, marcadas con ★, las conductas sugeridas por la clasificación del caso. Por ejemplo: ruido → art. 93; maltrato → Ley 84 y art. 116; aguas o cauce → art. 100; árboles o vegetación → art. 101.
- La sugerencia no selecciona conductas: la conducta y el numeral los determina la persona.

**En el formato y al enviar a firma:**

- El párrafo de la norma del IV-F-364 se arma con lo seleccionado ("artículo: descripción; …") más el texto libre del campo **"Otra norma o precisión (opcional)"** (antes "Norma o artículo…").
- No se puede enviar a firma sin al menos una norma.

**Normas que no están en la matriz** (quedan para el texto libre hasta que se agreguen al modelo): residuos sólidos y escombros, espacio público, urbanismo y suelos de protección.

### Hora de la audiencia

- En edición, el campo usa el selector de hora del navegador (ícono de reloj, pasos de 5 minutos) y se guarda como HH:MM.
- En el detalle y en el formato se muestra como "2:30 p. m.".
- **Corrección:** si la fecha de la audiencia quedaba en blanco, la hora se escribía en el espacio de la fecha. Ahora va siempre en su propio espacio.

### Formato en Word

- Al enviar a firma se genera **solo el Word** (`AutoInicio-<expediente>.docx`).
- El bloque "Pendiente de firma" muestra el botón **"Descargar formato prellenado (Word)"**.
- El Inspector sigue cargando el **PDF firmado**.
- El aviso al Inspector dice "Descargue el formato prellenado en Word…".

### Archivos

- `espocrm-custom/Resources/metadata/app/normasAutoInicio.json` (nuevo)
- `espocrm-custom/files/client/custom/src/views/auto-inicio/fields/normas.js` (nuevo)
- `espocrm-custom/files/client/custom/src/views/fields/hora-reloj.js` (nuevo)
- `espocrm-custom/Resources/metadata/entityDefs/AutoInicio.json`
- `espocrm-custom/Resources/i18n/es_ES/AutoInicio.json`
- `espocrm-custom/Resources/layouts/AutoInicio/edit.json` y `detail.json`
- `espocrm-custom/Tools/CaseObj/CaseAperturaService.php`: texto de normas, hora en formato de 12 horas, validación y solo Word. Además, la ruta sugerida ya no confunde "Tenencia inadecuada de lotes" con animales.
- `espocrm-custom/files/scripts/fill-formato-auto-inicio.py`
- `espocrm-custom/files/client/custom/src/helpers/case-detail-side-panels.js`
- `espocrm-custom/files/client/custom/src/helpers/alcaldia-notification-message.js`

## Validación (local, navegador y API)

**Caso de ruido (ruta PVA), como `juridica`:**

- El Auto nuevo trae precargados el art. 223 y el art. 206.
- La lista muestra primero ★ art. 93 num. 3 y num. 15.
- La hora se elige con el selector (`type=time`) y se guarda como "14:30".

**Formato generado:**

- La norma sale como "Ley 1801 de 2016, art. 223: …; … art. 93 num. 3 modificado por Ley 2450 de 2025: Ruido que afecta la convivencia en actividad económica."
- Con fecha: "el próximo 20 de octubre de 2026 a las 2:30 p. m.".
- Sin fecha: "el próximo ________ a las 2:30 p. m.".

**Caso de maltrato (ruta Maltrato Animal):**

- El tipo de trámite se precarga con la ruta.
- La norma precargada es Ley 84/1989 (★).
- Siguen el procedimiento y ★ art. 116.

**Descarga, como `inspector`:** el botón descarga `AutoInicio-2026-5.docx` (Microsoft Word 2007+). Ya no se genera PDF.

**Datos de prueba:** eliminados.

## Despliegue y reversión

- **Local:** `docker cp`, `rebuild` (campo nuevo), `clear-cache` y `update-app-timestamp`.
- **Reversión:** revertir el commit. Los Autos con normas seleccionadas conservan también el texto libre.
