# Interpretación de documentos de referencia y su uso en el CRM

> Basado en los 6 documentos de `docs/Referencias/`: GD-G-021 (Guía Documento Electrónico), GD-G-014 (Guía Digitalización), IV-P-004 (Atención de solicitudes por afectación ambiental), IV-P-028 (Régimen sancionatorio ambiental), IV-P-021 (Código de Policía y Maltrato Animal), y la TRD de Inspección de Policía Ambiental (código de oficina productora `109.01.01`).

## 1. Qué es cada documento

| Documento | Código | Qué regula | Para qué nos sirve en el CRM |
|---|---|---|---|
| Guía para la Gestión de Documentos y Expedientes Electrónicos e Híbridos de Archivo | GD-G-021 | Cómo se crean, nombran, agrupan y conservan documentos electrónicos (autenticidad, fiabilidad, integridad, disponibilidad) | Define el estándar de nomenclatura de archivos, metadatos y estructura de expediente que el CRM debe reproducir al generar/adjuntar PDFs |
| Guía para Digitalización Documental | GD-G-014 | Estándares técnicos de escaneo (resolución, color, formato) y estructura de carpetas | Aplica cuando un funcionario sube un PDF escaneado (queja en papel, prueba física) al caso |
| Procedimiento para atención de solicitudes por afectación ambiental | IV-P-004 | Flujo **general** de cualquier queja/solicitud ambiental: recepción → visita/medición → informe → verificación de cumplimiento → trámite contravencional si no hay cumplimiento | Es el **tronco común** del proceso que ya modela el CRM (`Case`) |
| Procedimiento para aplicación del régimen sancionatorio ambiental | IV-P-028 | Flujo **jurídico** cuando la afectación deriva en proceso sancionatorio bajo Ley 1333 de 2009 (medidas preventivas, acto de decisión, remisión a autoridad ambiental) | Es una **rama** del proceso general — se activa cuando IV-P-004 no logra cumplimiento voluntario |
| Procedimiento Código de Policía y Maltrato Animal | IV-P-021 | Flujo **jurídico-policivo** bajo Ley 1801/2016 y Ley 84/1989 (audiencia pública, recursos, sanciones pecuniarias, cobro coactivo) | Es otra **rama** del proceso general, específica para comportamientos contrarios a la convivencia / maltrato animal |
| TRD Inspección de Policía Ambiental | Oficina `109.01.01` | Series/subseries documentales, tiempos de retención, disposición final | Define **qué tipos de documento existen oficialmente**, cuánto se conservan y qué pasa con ellos al vencer — es el diccionario de tipos documentales que el CRM debe usar |

## 2. Interpretación: un único proceso con dos posibles ramas jurídicas

Los tres procedimientos (IV-P-004, IV-P-028, IV-P-021) **no son procesos independientes**: comparten el mismo origen y las primeras etapas, y se bifurcan según qué pasa cuando el ciudadano/infractor no cumple.

```
Solicitud/queja (IV-F-007)
        │
        ▼
Recepción y reparto (Auxiliar / Director técnico)
        │
        ▼
Visita de inspección o medición (Acta IV-F-023 / IV-F-202 / IV-F-004 / mediciones ruido-aire)
        │
        ▼
Informe técnico (IV-F-005)
        │
        ▼
Verificación de obligaciones/recomendaciones
        │
   ┌────┴─────┐
   │          │
Cumplió    No cumplió
   │          │
Archivo   ¿Qué tipo de infracción?
           │
     ┌─────┴──────┐
     │             │
Afectación       Comportamiento contrario a
ambiental        convivencia / maltrato animal
(Ley 1333/2009)  (Ley 1801/2016, Ley 84/1989)
     │             │
IV-P-028          IV-P-021
(medida preventiva,  (citación, audiencia pública,
acto administrativo, recursos, sanción pecuniaria
remisión a Aut.      o cobro coactivo)
Ambiental)
```

Esto coincide con lo que ya existe en el CRM: un `Case` (caso) que nace de una solicitud, pasa por visita/informe, y **opcionalmente** escala a un trámite jurídico. El CRM no necesita tres módulos separados — necesita **un tipo de trámite/subproceso** dentro del mismo caso para distinguir cuál de las dos rutas jurídicas aplica cuando no hay cumplimiento voluntario.

## 3. Reglas de gestión documental (GD-G-021) que el CRM debe cumplir

- **Correos electrónicos**: si se reciben como canal de radicación, deben conservarse en `.eml` (no imprimirse ni convertirse a texto plano), porque el formato conserva metadatos de producción/transmisión.
- **Nomenclatura de archivos** (aplica a todo lo que el CRM genere o el usuario suba):
  - 5 a 30 caracteres.
  - Sin tildes, espacios ni caracteres especiales (`&%/#`); solo guion bajo `_`.
  - Sin artículos/preposiciones (el, la, los, de, en, por, para) ni acrónimos salvo los de uso común en la dependencia.
  - Fecha en formato ISO 8601 `AAMMDD`.
  - Debe identificar la actuación de forma concisa y reconocible.
  - Ejemplo válido: `acta_visita_240815.pdf`, `informe_tecnico_240815.pdf`.
- **Metadatos mínimos (Dublin Core)** por documento/expediente: Título, Autor, Fecha (obligatorios), Relación (referencia cruzada al expediente/caso — obligatorio), y opcionalmente Materia, Editor, Tipo de recurso, Descripción, Colaborador, Formato, Fuente, Derechos, Identificador, Idioma, Cobertura.
- **Expediente híbrido**: si el caso tiene documentos físicos y electrónicos, deben quedar vinculados entre sí (referencia cruzada, testigo documental). El CRM ya centraliza todo en el `Case`, así que basta con que cada documento cargado registre de qué caso/expediente es parte — lo cual ya ocurre al adjuntarlo al registro.
- **Formato de preservación para documentos oficiales**: PDF/A (no PDF genérico). Los PDFs que el CRM genera desde plantillas (actas, autos, resoluciones) deberían exportarse como PDF/A cuando sea viable, o al menos documentarse la limitación si se mantiene PDF estándar.
- **Hoja de Control de Documentos Electrónicos**: exigida quien gestione expedientes fuera de un SGDEA formal (caso de "Mercurio", la carpeta compartida de la Alcaldía). El CRM, al ser un sistema de gestión de casos con expedientes electrónicos íntegros y trazables (histórico de adjuntos, auditoría), **cumple funcionalmente el rol de índice electrónico automatizado** que sustituye la Hoja de Control manual — es un punto a favor a documentar frente a Calidad/SGI.

## 4. Reglas de digitalización (GD-G-014) que aplican cuando se sube un escaneo

- Resolución estándar: **300 dpi** (subir solo si hay problemas de legibilidad).
- Formato de captura: **PDF/A** como estándar; JPEG/JPG/JPEG2000 solo para consulta y difusión.
- Color: **blanco y negro** por defecto; escala de grises solo si B/N compromete legibilidad; color solo si el contenido lo exige (mapas, planos, fotos).
- OCR obligatorio para permitir búsqueda dentro del documento.
- Sin manchas/puntos/rayas generados por el propio escáner.
- La digitalización **no reemplaza el papel original** — es una guía de manejo del ciudadano/usuario que sube evidencia, no obliga al CRM a implementar un motor de escaneo, pero sí a **advertir/validar** estos criterios cuando se cargan adjuntos tipo imagen/PDF desde campo (ej. fotos de la visita).

## 5. La TRD como diccionario de tipos documentales y retención

La TRD de la Inspección de Policía Ambiental (oficina `109.01.01`) define tres series relevantes al CRM:

| Código | Serie/Subserie | Retención (Gestión + Central) | Disposición final |
|---|---|---|---|
| `109.01.01.21` | Derechos de Petición (Petición, Respuesta) | 2 + 8 años | Selección (5-100% según criterio) → Conservación Total del muestreo, resto eliminación |
| `109.01.01.27.09` | Informes de Gestión | 2 + 4 años | Conservación Total |
| `109.01.01.40.44` | Procesos Policivos de Afectación Ambiental (queja, acta de visita, informes técnicos, citaciones, notificaciones, pruebas, acta de audiencia, resolución, actas de medida preventiva/decomiso/aprehensión, comparendo, resolución 2ª instancia, comprobante de pago, auto ejecutorio, auto de archivo) | 2 + 8 años | Conservación Total |

**Implicación directa para el CRM**: cada `Case` del sistema corresponde, casi siempre, a la subserie **Procesos Policivos de Afectación Ambiental** (`109.01.01.40.44`), y su ciclo de vida documental es: 2 años activo en "Archivo de Gestión" desde el auto de archivo/constancia ejecutoria, luego 8 años en "Archivo Central", y al final transferencia a histórico con conservación total (nunca se elimina). Esto sugiere que el CRM podría (a futuro, no ahora):

- Etiquetar cada caso con su **código de serie/subserie TRD** al cerrarse, para trazabilidad archivística.
- Calcular una fecha de "fin de retención en archivo de gestión" = fecha de auto de archivo + 2 años, útil para reportes de transferencia documental (no para borrar nada — la disposición final es Conservación Total, nunca eliminación).
- Reconocer que los tipos documentales listados en la TRD (`Acta visita de inspección`, `Informe técnico`, `Citación`, `Notificación`, `Acta de audiencia`, `Resolución`, `Acta de imposición de medida preventiva`, `Acta de decomiso`, `Acta de aprehensión`, `Comparendo`, `Auto ejecutorio`, `Auto de archivo`, etc.) **son el vocabulario oficial** que debería usarse para nombrar los documentos generados/adjuntos en el CRM — muchos de estos ya existen como entidades custom (`ActaVisita`, `ActuoArchivo`).

## 6. Correspondencia entre formatos oficiales (IV-F-xxx) y el CRM

| Formato oficial | Uso en el procedimiento | Estado en el CRM |
|---|---|---|
| IV-F-007 | Solicitud del servicio (radicación) | Corresponde a la creación del `Case` |
| IV-F-023 / IV-F-202 | Acta de visita de control y vigilancia / Acta de visita Inspección Ambiental | Corresponde a la entidad `ActaVisita` existente |
| IV-F-005 | Informe de solicitud de atención de afectación ambiental | Informe técnico del caso |
| IV-F-147 | Acta de incautación y aprehensión | Aplica a maltrato animal (IV-P-021) |
| IV-F-361 | Auto de Archivo | Corresponde a `ActuoArchivo` existente |
| IV-F-364 | Auto de inicio | Trámite jurídico (rama sancionatoria/policiva) |
| IV-F-362 / IV-F-365 | Notificación personal / por aviso | Comunicación formal al ciudadano |
| IV-F-366 / IV-F-367 | Acta de conciliación / diligencia de compromisos | Acuerdos de cumplimiento voluntario |
| IV-F-117 | Modelo de resolución | Decisión de fondo (rama IV-P-021) |
| IV-F-004 | Formato de visita fauna | Casos de maltrato animal |
| IV-F-154 | Acta PMIRS (residuos sólidos) | Casos de manejo de residuos |
| IV-D-019 a IV-D-026 | Guías/plantillas de ruido y calidad de aire | Casos de mediciones técnicas (ruido, PM10/PM2.5) |

Esto confirma que el modelo de datos actual del CRM (Case + ActaVisita + ActuoArchivo + adjuntos) ya cubre el núcleo del proceso general (IV-P-004). Lo que probablemente falta mapear explícitamente es la **bifurcación jurídica** (sancionatorio ambiental vs. código de policía/maltrato animal) y los formatos específicos de cada rama (auto de inicio, audiencia pública, recursos, medidas preventivas, sanción pecuniaria/cobro coactivo).

## 7. Punto 1 resuelto: modelo de datos para la bifurcación policiva

El punto 1 de esta sección (cómo modelar la bifurcación IV-P-028/IV-P-021 y la distinción Derechos de Petición vs. Proceso Policivo) ya se decidió y está en implementación. Ver el registro completo en [`docs/ajustes/2026-08-25-expediente-autoinicio-rol-juridica.md`](../ajustes/2026-08-25-expediente-autoinicio-rol-juridica.md):

- Entidad nueva `Expediente` (agrupa N `Case`/radicados bajo un mismo trámite jurídico), con campo `tipoTramite` para distinguir la rama Ley 1333/2009 (IV-P-028) de la rama Ley 1801/2016-Ley 84/1989 (IV-P-021).
- Entidad nueva `AutoInicio` (documento formal IV-F-364, calco de la ya existente `ActuoArchivo`), cuyo registro es el evento que abre el expediente y lo clasifica como serie `109.01.01.40.44` (Conservación Total) en vez de `109.01.01.21` (Derechos de Petición, selección/eliminación parcial).
- Rol nuevo **Jurídica**, responsable de crear/gestionar el Auto de Inicio (Inspección sigue cerrando con el Auto de Archivo).
- Al día de este registro, el modelo de datos base (Fase 1 de 9) ya está desplegado y validado; falta diferir la generación de `Case.cExpediente` hasta el Auto de Inicio, el flujo de UI para crearlo, la sincronización entre `Expediente` y varios `Case`, y la plantilla oficial del PDF (fases 2-9, documentadas en el mismo registro de ajuste).

## 8. Puntos abiertos restantes

1. Definir si se requiere calcular y mostrar **plazos legales** por etapa (los tiempos de la tabla "Flujos de trabajo" de cada procedimiento: 1 día, 2 días, 5 días, 10-30 días, 90 días, 3 meses, etc.) como alertas/vencimientos en el CRM.
2. Decidir si la nomenclatura de archivos adjuntos (AAMMDD + tipología, sin tildes/espacios) se debe **validar o generar automáticamente** al subir documentos, o queda como lineamiento manual para los funcionarios.
3. Evaluar si conviene registrar el **código de serie/subserie TRD** en cada `Case` individual (no solo en el `Expediente`) para trazabilidad y futuros reportes de transferencia documental — ya contemplado como posible campo `cSerieDocumental` en el plan de implementación, pendiente de decidir si se persiste o se calcula al vuelo.
4. Conseguir la plantilla oficial (Word/PDF) del **Auto de Inicio (IV-F-364)** — no existe todavía en `formatos/`, es necesaria para generar el documento igual que ya se hace con `ActuoArchivo.docx`.
