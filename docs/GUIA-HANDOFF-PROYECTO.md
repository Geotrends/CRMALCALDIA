# Guía de handoff — CRM Ambiental Alcaldía de Envigado

Documento **principal** para quien continúe el desarrollo, mantenimiento o despliegue.  
Los inventarios exhaustivos (archivo por archivo) están en `docs/handoff/`.

| Dato | Valor |
|------|--------|
| **Repositorio** | [github.com/Geotrends/CRMALCALDIA](https://github.com/Geotrends/CRMALCALDIA) |
| **Rama de trabajo** | `main` (única rama de integración y producción) |
| **Stack** | EspoCRM 8.x + PostgreSQL 16 + Docker |
| **Producción** | Dokploy (rebuild de imagen Docker) |
| **Versión deploy actual** | Ver `.deploy-version` en la raíz del repo |
| **Zona horaria** | `America/Bogota` |

---

## Cómo está organizada la documentación

| Documento | Contenido |
|-----------|-----------|
| **Esta guía** (`docs/GUIA-HANDOFF-PROYECTO.md`) | Visión, estructura, reglas, flujos, deploy, checklist |
| [Anexo A — Helpers JS](handoff/ANEXO-A-HELPERS.md) | **42** helpers, uno a uno |
| [Anexo B — Views / templates](handoff/ANEXO-B-VIEWS-TEMPLATES.md) | **48** views + **19** `.tpl` + handlers |
| [Anexo C — Campos Case](handoff/ANEXO-C-CAMPOS-CASE.md) | **80** campos + links + layouts Case |
| [Anexo D — Hooks](handoff/ANEXO-D-HOOKS.md) | **37** hooks PHP |
| [Anexo E — Backend PHP](handoff/ANEXO-E-BACKEND-PHP.md) | Tools, Controllers, EntryPoints, Entities, Jobs, Classes |
| [Anexo F — Scripts](handoff/ANEXO-F-SCRIPTS.md) | Todos los scripts en `scripts/` |
| [Anexo G — CSS / loaders / Python](handoff/ANEXO-G-CSS-FRONTEND-ASSETS.md) | CSS 01–24, loaders, scripts Python, formatos |
| [Anexo H — Metadata / i18n](handoff/ANEXO-H-METADATA-RESOURCES.md) | entityDefs, clientDefs, layouts, i18n |
| [Almacenamiento BD y archivos](ALMACENAMIENTO-BD-Y-ARCHIVOS.md) | Contenedores/volúmenes + rutas de documentos |
| [Consultas SQL](CONSULTAS-BD-VALIDACION.md) | Validación BD en Dokploy/pgAdmin |
| [Cumplimiento objetivos](ESTADO-CUMPLIMIENTO-OBJETIVOS.md) | Objetivos vs implementación |

---

## Índice

1. [Visión general del sistema](#1-visión-general-del-sistema)
2. [Estructura del repositorio (raíz)](#2-estructura-del-repositorio-raíz)
3. [Capa custom: `espocrm-custom/`](#3-capa-custom-espocrm-custom)
4. [Backend PHP: controladores, entidades, entry points](#4-backend-php-controladores-entidades-entry-points)
5. [Hooks (lógica al guardar)](#5-hooks-lógica-al-guardar)
6. [Tools (servicios de negocio)](#6-tools-servicios-de-negocio)
7. [Classes (ACL, filtros, record hooks)](#7-classes-acl-filtros-record-hooks)
8. [Metadata y layouts (`Resources/`)](#8-metadata-y-layouts-resources)
9. [Frontend JavaScript y CSS](#9-frontend-javascript-y-css)
10. [Scripts Python (generación documental)](#10-scripts-python-generación-documental)
11. [Carpeta `scripts/` (deploy, roles, migraciones)](#11-carpeta-scripts-deploy-roles-migraciones)
12. [Base de datos y SQL](#12-base-de-datos-y-sql)
13. [Plantillas y exportaciones](#13-plantillas-y-exportaciones)
14. [Docker y despliegue](#14-docker-y-despliegue)
15. [Roles, permisos y reglas de negocio](#15-roles-permisos-y-reglas-de-negocio)
16. [Flujo completo del caso](#16-flujo-completo-del-caso)
17. [Notificaciones](#17-notificaciones)
18. [Documentos generados automáticamente](#18-documentos-generados-automáticamente)
19. [Documentación existente](#19-documentación-existente)
20. [Checklist para el nuevo desarrollador](#20-checklist-para-el-nuevo-desarrollador)
21. [Archivos que más se modifican](#21-archivos-que-más-se-modifican)
22. [Anexos de inventario completo](#22-anexos-de-inventario-completo)

---

## 1. Visión general del sistema

El CRM gestiona el **ciclo de vida de quejas ambientales** de la Secretaría de Medio Ambiente de Envigado:

1. **Inspección** registra la queja (peticionario, infractor, descripción).
2. **Radicación** asigna número oficial y expediente.
3. **Asignación** designa un patrullero.
4. **Patrullaje** realiza visita de campo y diligencia el acta.
5. **Inspección** aprueba la visita y puede diligenciar el auto de archivo.
6. El caso se cierra (`Finalizado` / `Proceso cerrado`).

No es una aplicación desde cero: es una **extensión profunda de EspoCRM**. La metadata JSON define entidades, pantallas y permisos; el PHP custom añade hooks y servicios; el JavaScript custom adapta la UI por rol.

**En runtime**, el contenido de `espocrm-custom/` se copia a:

- Backend: `/var/www/html/custom/Espo/Custom`
- Frontend: `/var/www/html/client/custom`

---

## 2. Estructura del repositorio (raíz)

```
CRMALCALDIA/
├── espocrm-custom/     # TODO el código custom (PHP + JS + metadata + Python)
├── scripts/            # Deploy, roles, permisos, migraciones, reparaciones
├── formatos/           # Plantillas Word/Excel oficiales (fuente de PDFs)
├── exports/            # Excel maestro excelAlcaldia.xlsx (catálogos)
├── docker/             # Dockerfile, entrypoint, proxy WebSocket
├── sql/                # esquema.sql — referencia PostgreSQL (no migración activa)
├── docs/               # Documentación operativa
├── backups/            # Plantilla env.txt para Dokploy
├── docker-compose.yml          # Stack producción
├── docker-compose.dev.yml      # Override dev (volúmenes montados)
├── docker-compose.tools.yml    # pgAdmin local opcional
├── .deploy-version     # Huella para forzar redeploy del custom
├── .env.example        # Plantilla de variables
└── README.md           # Guía rápida de instalación y deploy
```

| Carpeta / archivo | Qué contiene y para qué sirve |
|-------------------|-------------------------------|
| **`espocrm-custom/`** | Núcleo del proyecto: hooks, servicios, vistas, CSS, metadata JSON, scripts Python. |
| **`scripts/`** | Scripts PHP ejecutados en cada deploy (roles, permisos, catálogos). Shell de deploy y verificación. |
| **`formatos/`** | `FormatoSolicitud.doc`, `ActaVisita2.docx`, `ActuoArchivo.docx`, `ActaVisita.xlsx`. Se copian al contenedor en deploy. |
| **`exports/`** | Destino de `excelAlcaldia.xlsx`. En repo solo `.gitkeep`; el Excel se genera en runtime. |
| **`docker/`** | Imagen con LibreOffice + Python; auto-deploy al arrancar contenedor. |
| **`sql/`** | Volcado `esquema.sql` (~9500 líneas). Referencia y diagnóstico; **no** es la fuente de verdad (esa es la metadata EspoCRM). |
| **`docs/`** | Consultas SQL, cumplimiento de objetivos, esta guía. |
| **`.deploy-version`** | Texto corto que el contenedor compara. **Actualizar en cada cambio** de frontend/metadata relevante. |

---

## 3. Capa custom: `espocrm-custom/`

```
espocrm-custom/
├── Controllers/        # APIs REST custom (acciones Case, Party, Document…)
├── Entities/           # Clases PHP de entidades propias
├── EntryPoints/        # URLs directas para descargar PDF/Excel (sin API REST)
├── Hooks/              # Lógica ejecutada al crear/guardar registros
├── Tools/              # Servicios de negocio reutilizables (por dominio)
├── Classes/            # ACL, filtros de listado, RecordHooks, Select filters
├── Jobs/               # Tareas programadas (cron EspoCRM)
├── Resources/
│   ├── metadata/       # entityDefs, clientDefs, layouts, scopes, logicDefs…
│   ├── i18n/           # Traducciones es_ES (principal), es_MX, en_US
│   └── layouts/        # Diseño de formularios y listas por entidad
└── files/
    ├── client/custom/  # Frontend: views, helpers, CSS, templates, loaders
    ├── scripts/        # Python: generación PDF y Excel
    └── templates/      # Plantillas Word/PDF dentro del contenedor
```

---

## 4. Backend PHP: controladores, entidades, entry points

### 4.1 Controllers (`Controllers/`)

| Archivo | Acciones / propósito |
|---------|----------------------|
| `CaseObj.php` | `alcaldiaProfile`, `createDefaults`, `radicadoConsecutivo`, `buscarParte`, `calendarEvents`, `timeline`, `cronograma`, `panelesDetalle`, `confirmarVisitaRealizada`, `confirmarVisitaAprobada` |
| `Account.php` | `casosAsociados`, `expediente` (terceros jurídicos) |
| `Contact.php` | `casosAsociados`, `expediente` (terceros naturales) |
| `ActaVisita.php` | CRUD extendido de actas |
| `ActuoArchivo.php` | CRUD extendido de autos de archivo |
| `ComunicacionCaso.php` | `partesCaso`, `agendaUsuario` |
| `AsignacionHistorial.php` | Historial de asignaciones |
| `Document.php` | `excelAlcaldiaPreview` |
| `User.php` | `historialActuaciones` |

### 4.2 Entidades propias (`Entities/`)

| Clase PHP | Entidad EspoCRM | Descripción |
|-----------|-----------------|-------------|
| `ActaVisita.php` | `ActaVisita` | Acta de visita de campo vinculada a un Case |
| `ActuoArchivo.php` | `ActuoArchivo` | Auto de archivo (cierre documental) |
| `ComunicacionCaso.php` | `ComunicacionCaso` | Comunicaciones oficiales del caso |
| `AsignacionHistorial.php` | `AsignacionHistorial` | Log de cambios de responsable (patrullero) |

Entidades estándar **extendidas** vía metadata (no tienen clase PHP propia): `Case`, `Account`, `Contact`, `Document`, `User`, `Meeting`, `Task`, `Team`.

### 4.3 Entry points (`EntryPoints/`)

URLs directas del tipo `?entryPoint=Nombre&id=...` para descargar documentos sin pasar por la API REST.

| Archivo | Función |
|---------|---------|
| `FormatoSolicitud.php` | PDF formato solicitud por ID de caso |
| `FormatoActaVisita.php` | PDF acta por ID de acta |
| `FormatoActaVisitaCaso.php` | PDF acta por ID de caso |
| `FormatoActuoArchivo.php` | PDF auto por ID de actuo |
| `FormatoActuoArchivoCaso.php` | PDF auto por ID de caso |
| `ExcelAlcaldiaDownload.php` | Descarga `excelAlcaldia.xlsx` |
| `ExcelAlcaldiaViewerFile.php` | Sirve archivo para visor Excel |
| `ExcelAlcaldiaViewerPreview.php` | HTML preview del Excel |
| `ReporteGerencial.php` | Reporte gerencial PDF o XLSX |

### 4.4 Jobs (`Jobs/`)

| Archivo | Propósito |
|---------|-----------|
| `CheckCaseVencimientoAlerts.php` | Job programado (cron): revisa fechas de vencimiento y dispara alertas en campana |

---

## 5. Hooks (lógica al guardar)

Los hooks son clases PHP que EspoCRM ejecuta automáticamente al **crear** o **guardar** registros. El orden importa cuando varios hooks afectan el mismo evento (campo `public static int $order`).

### 5.1 `Hooks/CaseObj/` — Casos (25 hooks)

| Hook | Cuándo actúa | Qué hace |
|------|--------------|----------|
| `AutoGenerateRadicadoOnSave.php` | Guardar caso | Genera número de radicado automático (modo Automático) |
| `BuildDireccionEstructuradaOnSave.php` | Guardar caso | Construye dirección estructurada computada |
| `ClearInfractorWhenUnknownOnSave.php` | Guardar caso | Limpia datos de infractor si tipo = "No se conoce" |
| `ExportCaseExcelAlcaldiaOnSave.php` | Guardar caso | Escribe fila en Excel cuando hay radicado + expediente |
| `FormatPartyDocumentOnSave.php` | Guardar caso | Normaliza formato cédula/NIT |
| `GenerateFormatoSolicitudOnSave.php` | Guardar caso | Genera PDF de solicitud |
| `LimitAsignadorCaseEdit.php` | Guardar caso | Rol Asignación: solo puede editar `assignedUser` y motivo reasignación |
| `LimitRadicacionCaseEdit.php` | Guardar caso | Rol Radicación: solo radicado/expediente |
| `LogAsignacionHistorial.php` | Guardar caso | Registra cada cambio de patrullero asignado |
| `NormalizeCaseEnumPlaceholders.php` | Guardar caso | Convierte "Seleccione una opción" a null |
| `NotifyInspeccionAndAsignadorOnRadicado.php` | Guardar caso | Radicación completa → notifica Inspección y Asignación |
| `NotifyOnCaseFinalizado.php` | Guardar caso | Finalizado/Cerrado → notifica gestores y patrullero |
| `NotifyOnFechaVencimientoChange.php` | Guardar caso | Alerta campana si vencido o ≤3 días |
| `NotifyPatrulleroAssignment.php` | Guardar caso | Asignar patrullero → notifica patrullero e Inspección |
| `NotifyRadicacionOnCaseCreated.php` | Crear caso | Inspección crea caso → notifica Radicación |
| `PopulateSeguimientoFieldsOnSave.php` | Guardar caso | Puebla campos de seguimiento (fechas, días, responsables) |
| `ProtectRadicadoForNonRadicacionUsers.php` | Guardar caso | Protege campos de radicado de usuarios no-Radicación |
| `RestrictRadicadoUntilRadicacionOnSave.php` | Guardar caso | Sin rol Radicación no persiste radicado hasta radicación oficial |
| `SanitizeCaseGestionLinksOnSave.php` | Guardar caso | Sanitiza vínculos Recibida por / Remitido a |
| `SetAsignadoOnPatrulleroAssignment.php` | Guardar caso | Asignar patrullero en caso radicado → estado **Asignado** |
| `SetRadicadoOnPostRadicacion.php` | Guardar caso | Al radicar: estado **Radicado**, fecha, etc. |
| `SuppressNativeCaseNotifications.php` | Guardar caso | Elimina notificaciones nativas EspoCRM (usa las custom) |
| `SyncCasePartyDefaultsOnSave.php` | Guardar caso | Sincroniza defaults de partes del caso |
| `SyncPerjudicanteParty.php` | Guardar caso | Sincroniza infractor con Contact/Account |
| `SyncPeticionarioToContact.php` | Guardar caso | Sincroniza peticionario con Contact |
| `ValidatePersonaTipoOnSave.php` | Guardar caso | Valida coherencia tipo persona / documento |

### 5.2 `Hooks/ActaVisita/` — Actas de visita

| Hook | Orden | Qué hace |
|------|-------|----------|
| `FillFromCase.php` | 5 | Pre-llena campos del acta desde el caso padre |
| `GenerateFormatoActaVisitaOnSave.php` | — | Genera PDF del acta al guardar |
| `ExportActaVisitaExcelOnSave.php` | — | Actualiza fila en `excelAlcaldia.xlsx` |
| `NotifyInspeccionOnActaDiligenciada.php` | 47 | Notifica a Inspección al diligenciar acta (antes del cambio de estado) |
| `SetEnProcesoOnActaVisita.php` | 48 | Caso pasa a **Visita realizada** cuando el acta tiene contenido |

### 5.3 `Hooks/ActuoArchivo/` — Autos de archivo

| Hook | Qué hace |
|------|----------|
| `FillFromCase.php` | Pre-llena auto desde el caso (radicado, referencia, inspector) |
| `GenerateFormatoActuoArchivoOnSave.php` | Genera PDF del auto al guardar |

### 5.4 Otros hooks

| Carpeta | Archivo | Qué hace |
|---------|---------|----------|
| `Account/` | `PreventDuplicateNit.php` | Impide NIT duplicado en cuentas |
| `Contact/` | `PreventDuplicateDocument.php` | Impide cédula duplicada en contactos |
| `ComunicacionCaso/` | `FillFromCase.php` | Pre-llena comunicación desde el caso |
| `User/` | `ApplyAlcaldiaLocaleDefaults.php` | Locale/zona horaria Bogotá a usuarios nuevos |

---

## 6. Tools (servicios de negocio)

Carpeta `Tools/` — clases PHP reutilizables llamadas desde hooks, controllers y entry points.

### `Tools/CaseObj/` — Lógica central del caso

| Clase | Responsabilidad |
|-------|-----------------|
| `CaseActaVisitaHelper.php` | Criterios de transición de estado por acta (Asignado → Visita realizada → aprobada) |
| `CaseRadicadoHelper.php` | Utilidades radicado/expediente (`isRadicadoCompleto`, etc.) |
| `CaseTimelineService.php` | Datos de la línea de tiempo de estados |
| `CaseCronogramaService.php` | Datos del panel cronograma |
| `CaseCreateDefaultsService.php` | Valores por defecto al crear caso |
| `CaseEnumNormalizer.php` | Normalización de enums |
| `CaseNotificationDuplicateGuard.php` | Evita notificaciones duplicadas |
| `CasePartyNameHelper.php` | Nombres legibles peticionario/infractor |
| `CaseVencimientoHelper.php` | Clasificación alertas de vencimiento |
| `CaseVisitaAprobadaNotifier.php` | Notificación al patrullero cuando Inspección aprueba visita |
| `CaseAlertNotifier.php` | Emisor de alertas de vencimiento |
| `DireccionEstructuradaBuilder.php` | Construcción de dirección estructurada |
| `ExcelAlcaldiaExporter.php` | Exporta caso a Excel maestro |
| `ExcelAlcaldiaDocumentSync.php` | Sincroniza Excel como Documento en CRM |
| `ExcelAlcaldiaPreviewService.php` | Preview HTML del Excel |
| `FormatoSolicitudGenerator.php` / `FormatoSolicitudAttacher.php` | PDF solicitud |
| `InfractorUnknownHelper.php` | Lógica "infractor desconocido" |
| `RadicadoCatalog.php` | Catálogo siglas (AIR, EPV, FDO, HID, RSO, SUE…) |
| `RadicadoConsecutivoService.php` | Consecutivo de radicado por siglas/año |
| `ReporteGerencialGenerator.php` / `ReporteGerencialService.php` | Reporte gerencial del tablero |
| `AlcaldiaNotificationHtml.php` | HTML de notificaciones institucionales |

### `Tools/ActaVisita/`

| Clase | Responsabilidad |
|-------|-----------------|
| `FormatoActaVisitaGenerator.php` | Orquesta generación PDF acta (Python + LibreOffice) |
| `FormatoActaVisitaAttacher.php` | Adjunta PDF generado al registro ActaVisita |

### `Tools/ActuoArchivo/`

| Clase | Responsabilidad |
|-------|-----------------|
| `FormatoActuoArchivoGenerator.php` | Generación PDF auto de archivo |
| `FormatoActuoArchivoAttacher.php` | Adjunta PDF al registro ActuoArchivo |

### `Tools/Party/` — Terceros (peticionario / infractor)

| Clase | Responsabilidad |
|-------|-----------------|
| `PartyRegistryService.php` | Lookup por documento (API `buscarParte`) |
| `PartyExpedienteService.php` | Expediente consolidado de tercero |
| `PartyCasosService.php` | Casos asociados a tercero |
| `DocumentNormalizer.php` | Normalización cédula/NIT |

### `Tools/User/`

| Clase | Responsabilidad |
|-------|-----------------|
| `AlcaldiaUserProfile.php` | Detección de roles (`isInspeccion`, `isPatrullero`, etc.) |
| `UserHistorialService.php` | Historial de actuaciones del usuario |

### `Tools/App/`

| Clase | Responsabilidad |
|-------|-----------------|
| `AlcaldiaDateTimeHelper.php` | Fechas/horas en zona Bogotá |
| `AlcaldiaLocaleDefaults.php` | Defaults de idioma y formato |

### `Tools/Calendar/`

| Clase | Responsabilidad |
|-------|-----------------|
| `CaseCalendarEventService.php` | Eventos de calendario derivados de casos |

---

## 7. Classes (ACL, filtros, record hooks)

Carpeta `Classes/` — extensiones del framework EspoCRM para permisos y validación temprana.

| Subcarpeta | Archivos | Propósito |
|------------|----------|-----------|
| `Acl/CaseObj/` | `AssignmentChecker.php` | Reglas ACL de asignación de casos |
| `AssignmentNotificators/` | `CaseObj.php` | Notificador de asignación nativo (complementa hooks) |
| `Record/CaseObj/` | `CreateInputFilter.php`, `UpdateInputFilter.php` | Filtros de entrada al crear/editar caso |
| `RecordHooks/CaseObj/` | `EarlyBeforeCreate.php`, `EarlyClearInfractorWhenUnknown.php`, `EarlyNormalizeCaseEnums.php` | Validación antes de persistir |
| `RecordHooks/ActaVisita/` | `EarlyBeforeCreate.php` | Validación creación acta |
| `RecordHooks/ActuoArchivo/` | `EarlyBeforeCreate.php` | Validación creación actuo |
| `Select/Account/` | `ConCasosAsociados.php`, `CaseFieldEquals.php` | Filtros de listado |
| `Select/Contact/` | Idem | Filtros de listado |
| `Select/ComunicacionCaso/` | `Mandatory.php` | Filtro ACL obligatorio |
| `Select/Document/` | `ActaVisita`, `ActuoArchivo`, `ExcelOficial`, `FormatoSolicitud`, `TodosPlantillas` | Filtros por tipo documental |
| `Select/Task/` | `Mandatory.php` | Filtro ACL |
| `Select/User/` | `Patrulleros.php` | Filtro para listar solo patrulleros |

---

## 8. Metadata y layouts (`Resources/`)

La metadata JSON es la **fuente de verdad** de campos, pantallas y permisos en EspoCRM.

### 8.1 `Resources/metadata/`

| Subcarpeta | Contenido |
|------------|-----------|
| `entityDefs/` | Definición de campos y relaciones por entidad (`Case.json` tiene 80+ campos `c*`) |
| `clientDefs/` | Vistas custom, paneles laterales, kanban, modales |
| `scopes/` | Alta de entidades custom (tab, icono, ACL) |
| `layouts/` | Referencia a layouts en `Resources/layouts/` |
| `recordDefs/` | Comportamiento de registro (`Case`, `ActaVisita`, `ActuoArchivo`) |
| `logicDefs/` | Reglas de visibilidad condicional (actualmente vacío en Case) |
| `formula/` | Fórmulas calculadas |
| `notificationDefs/` | Definición de notificaciones |
| `aclDefs/` | Reglas ACL adicionales |
| `selectDefs/` | Filtros de listado |
| `app/` | `client.json` (CSS/JS globales), `clientNavbar.json`, `clientRoutes.json`, `excelAlcaldiaOptions.json`, `scheduledJobs.json` |

### 8.2 `Resources/layouts/` — Diseño de pantallas

Layouts por entidad: `list`, `detail`, `edit`, `filters`, `kanban`, `sidePanelsDetail`, `sidePanelsEdit`, `detailSmall`, etc.

**Case** es la entidad con más layouts custom:

| Panel en `detail.json` | Contenido |
|------------------------|-----------|
| Solicitud de queja | Peticionario, dirección, canal de reporte |
| Perjudicante | Infractor (natural, jurídica o desconocido) |
| Clasificación y seguimiento | Recurso/tema, asunto, zona, vencimiento, actuaciones |
| Queja y gestión | Descripción, respuesta inmediata, Recibida por / Remitido a |
| Radicación | Número radicado, expediente |
| Asignación | Patrullero asignado, motivo reasignación |
| Acta de visita | Campo custom `acta-visita-action` (checkbox + botones) |
| Auto de archivo | Campo custom `actuo-archivo-action` (solo Inspección, post-aprobación) |
| Formato generado | Lista PDFs: solicitud, acta, auto |

### 8.3 `Resources/i18n/`

| Locale | Uso |
|--------|-----|
| `es_ES` | **Principal** — todas las etiquetas de pantalla |
| `es_MX` | Variante parcial |
| `en_US` | Fallback parcial |

Archivos por entidad: `Case.json`, `ActaVisita.json`, `ActuoArchivo.json`, `Global.json`, etc.

### 8.4 Entidades custom (scopes)

| Entidad | Descripción |
|---------|-------------|
| `Case` | Caso ambiental (entidad estándar EspoCRM extendida) |
| `ActaVisita` | Acta de visita de campo |
| `ActuoArchivo` | Auto de archivo |
| `ComunicacionCaso` | Comunicación oficial del caso |
| `AsignacionHistorial` | Historial de asignaciones |

---

## 9. Frontend JavaScript y CSS

### 9.1 Registro global (`Resources/metadata/app/client.json`)

**CSS cargado:**

```json
"cssList": [
  "client/custom/res/css/main.css",
  "client/custom/res/css/22-ui-toasts.css",
  "client/custom/res/css/23-buttons.css"
]
```

**Scripts cargados al inicio (`scriptList`):**

| Loader | Función |
|--------|---------|
| `promise-console-guard.js` | Suprime ruido de promesas rechazadas en consola |
| `theme-buttons.js` | Botones píldora verde; carga CSS 22/23 inline de respaldo |
| `theme-login.js` | Pantalla login (logo Envigado, botón verde) |
| `i18n-personas.js` | Traducciones menú («Crear caso», etc.) |
| `case-list-radicado-fix.js` | Corrección visual radicado en listas |
| `notification-views.js` | Registra vistas custom de notificaciones |
| `ui-toasts.js` | Toasts y confirmaciones laterales |
| `theme-navbar.js` | Navbar lateral, campana, CSS inline de respaldo |
| `session-security.js` | Cierre de sesión por inactividad (10 min) |

### 9.2 Arquitectura JavaScript (patrón AMD EspoCRM)

```
define('custom:views/...', ['dep1', 'dep2'], function (Dep1, Dep2) { ... })
```

| Capa | Ruta | Rol |
|------|------|-----|
| **Loaders** | `src/loader/` | Se ejecutan al cargar la app; parchean comportamiento global |
| **Views** | `src/views/` | Extienden vistas EspoCRM (`clientDefs` → `views` / `recordViews`) |
| **Helpers** | `src/helpers/` | Lógica reutilizable importada por views |
| **Templates** | `res/templates/` | Handlebars (`.tpl`) referenciados desde views |
| **Handlers** | `src/handlers/` | Handlers puntuales (ej. `task-default-assigned-user.js`) |

### 9.3 Helpers clave por dominio

#### Caso y documentos

| Helper | Función |
|--------|---------|
| `case-create-form.js` | Oculta paneles solo-detalle al crear; defaults de fecha y enlaces |
| `case-create-optional-fields.js` | Todos los campos opcionales al crear |
| `case-documentos.js` | Lista PDFs en panel "Formato generado" |
| `case-status-colors.js` | Colores e iconos por estado |
| `case-status-timeline.js` | Lógica línea de tiempo |
| `case-fetch-cache.js` | Caché de fetch acta/actuo por caso |
| `case-radicado-label.js` | Etiqueta de título con radicado |

#### Flujos por rol

| Helper | Rol | Función |
|--------|-----|---------|
| `inspeccion-case-flow.js` | Inspección | Oculta asignación; protege radicado |
| `radicacion-case-flow.js` | Radicación | Modo radicar: solo campos radicado/expediente |
| `radicacion-fields.js` | Todos | Detección de rol, perfil, campos radicado |
| `asignador-case-flow.js` | Asignación | Modo asignar: solo patrullero |
| `asignador-assignment-ui.js` | Asignación | UI del botón asignar |
| `patrullero-acta.js` | Patrullaje | Permisos y estado del acta |

#### Acta y actuo

| Helper | Función |
|--------|---------|
| `acta-visita-action.js` (view) | Panel acta: checkbox visita, aprobación, botones |
| `acta-visita-modal.js` | Modal crear/editar acta |
| `acta-visita-case-status.js` | Estado del acta vinculado al caso |
| `actuo-archivo-action.js` (view) | Panel auto: llenar/editar/imprimir |
| `actuo-archivo-modal.js` | Modal crear/editar actuo |
| `actuo-archivo-case-status.js` | Estado del actuo vinculado al caso |
| `formato-actuo-archivo-case-access.js` | Quién puede gestionar/descargar auto |
| `formato-acta-visita-case-access.js` | Quién puede descargar acta |
| `formato-solicitud-access.js` | Quién puede descargar solicitud |

#### Terceros y formularios

| Helper | Función |
|--------|---------|
| `persona-tipo-fields.js` | Natural/jurídica/desconocido; etiquetas dinámicas |
| `party-document-lookup.js` | Búsqueda de tercero por documento |
| `direccion-estructurada.js` | Construcción dirección desde campos estructurados |
| `nit-input.js` | Validación formato NIT |
| `numeric-input.js` | Solo números en teléfono/vía |

#### Notificaciones y UI

| Helper | Función |
|--------|---------|
| `alcaldia-notification-message.js` | Textos y flags de notificaciones custom |
| `safe-ui-promise.js` | Re-render seguro sin errores de promesa |
| `silent-ajax.js` | Peticiones AJAX sin toast de error |

### 9.4 Views principales

| Área | Archivos | Notas |
|------|----------|-------|
| **Case** | `list.js`, `detail.js`, `edit.js`, `record/detail.js`, `record/edit.js` | Vistas principales del caso |
| **Case fields** | `acta-visita-action.js`, `actuo-archivo-action.js`, `formato-generado-docs.js`, `numero-radicado.js`… | Campos custom en formularios |
| **Case panels** | `status-timeline.js`, `case-cronograma.js`, `comunicaciones-caso.js` | Paneles laterales |
| **Notification** | `badge.js`, `panel.js`, `items/radicado.js` | Campana custom |
| **Document** | `excel-onlyoffice-viewer.js` | Visor Excel |
| **Party** | `casos-relacion.js`, `expediente-tercero.js` | Paneles en Contact/Account |
| **Home** | `home.js` + `dashboard.js` | Tablero Chart.js embebido |

### 9.5 CSS — módulos (`files/client/custom/res/css/`)

`main.css` importa todos los módulos numerados:

| Archivo | Estiliza |
|---------|----------|
| `01-variables.css` | Design tokens (verde `#eefaf5`→`#d8f3e8`, texto `#1a5c47`) |
| `02-base.css` | Tipografía y fondo global |
| `03-components.css` | Botones, badges, cards, tablas reutilizables |
| `04-espo-shell.css` | Shell EspoCRM: listas, kanban base |
| `05-home.css` | Pantalla inicio y tablero embebido |
| `06-case.css` | Casos: detalle, edición, listas, estados con iconos |
| `07-panels.css` | Paneles custom (radicación, formatos, actas) |
| `08-dashboard.css` | Tablero Chart.js (iframe standalone) |
| `09-navbar.css` | Navbar lateral slim, campana con contador |
| `10-page-headers.css` | Encabezados de página unificados |
| `11-full-width-layout.css` | Ancho completo en todas las secciones |
| `12-case-timeline.css` | Línea de tiempo horizontal |
| `13-case-cronograma.css` | Cronograma del caso |
| `14-case-stream.css` | Stream/flujo; paneles acta y actuo |
| `15-login.css` | Login split (formulario + imagen hero) |
| `16-task.css` | Tareas y kanban |
| `17-team.css` | Equipos y tarjetas de miembros |
| `18-calendar.css` | Calendario |
| `19-form-sections.css` | Secciones de formulario en gris |
| `20-case-kanban.css` | Kanban de casos |
| `21-scroll-layout.css` | Un solo scroll vertical (`#content`) |
| `22-ui-toasts.css` | Toasts y confirmaciones (también en cssList directo) |
| `23-buttons.css` | Botones píldora y badges (también en cssList directo) |
| `24-document-categories.css` | Iconos de categoría documental |

> **Producción:** `theme-navbar.js` y `theme-buttons.js` inyectan CSS inline adicional para evitar caché obsoleta del navegador.

### 9.6 Templates Handlebars (`res/templates/`)

17 archivos `.tpl` para paneles, campos y modales. Ejemplos:

- `case/fields/acta-visita-action.tpl`
- `case/fields/actuo-archivo-action.tpl`
- `case/fields/formato-generado-docs.tpl`
- `notification/items/radicado.tpl`

### 9.7 Dashboard (`dashboard.html` + `dashboard.js`)

Tablero gerencial embebido en Home vía iframe. Carga datos por API y renderiza gráficos Chart.js.

---

## 10. Scripts Python (generación documental)

Ubicación: `espocrm-custom/files/scripts/`

| Script | Propósito |
|--------|-----------|
| `fill-formato-solicitud.py` | Superpone datos sobre PDF plantilla solicitud (PyMuPDF) |
| `fill-formato-acta-visita.py` | Superpone datos sobre PDF plantilla acta |
| `fill-formato-actuo-archivo.py` | Superpone datos sobre PDF plantilla auto |
| `upsert-excel-alcaldia.py` | Escribe/actualiza fila en `excelAlcaldia.xlsx` |
| `render-excel-alcaldia-preview.py` | Genera HTML preview del Excel |
| `generate-reporte-gerencial.py` | Reporte gerencial Excel/HTML |
| `pdf-overlay-utils.py` | Utilidades compartidas de superposición PDF |
| `calibrate-actuo-archivo-layout.py` | Calibración coordenadas PDF auto |
| `generate-actuo-layout-from-docx.py` | Genera layout desde DOCX |
| `remove-crm-rows-excel-alcaldia.py` | Limpieza filas CRM en Excel |

**Archivos JSON de coordenadas** (posición de campos en PDF):

- `formato-solicitud-layout.json`
- `formato-acta-visita-layout.json`
- `formato-actuo-archivo-layout.json`

**Plantillas en contenedor** (`files/templates/`): copiadas desde `formatos/` en deploy; LibreOffice genera `*-template.pdf` si no existen.

---

## 11. Carpeta `scripts/` (deploy, roles, migraciones)

### 11.1 Deploy

| Script | Propósito |
|--------|-----------|
| `deploy-custom.sh` | Deploy local: copia custom, rebuild EspoCRM, ejecuta pasos configuración |
| `deploy-custom-dokploy.sh` | Deploy en producción (dentro del contenedor) |
| `force-deploy-now.sh` | Fuerza redeploy manual |
| `verify-custom-deploy.sh` | Verifica ~40 checkpoints post-deploy |
| `includes/deploy-steps.sh` | Manifiesto de pasos de setup |
| `includes/deploy-stamp.sh` | Sellado de versión aplicada |
| `includes/deploy-rebuild.php` | Rebuild/clear-cache EspoCRM |
| `includes/purge-obsolete-custom.sh` | Elimina archivos custom obsoletos |
| `includes/wait-for-espocrm.sh` | Espera instalación EspoCRM |

**Pasos que ejecuta cada deploy** (definidos en `deploy-steps.sh`):

1. Credenciales admin
2. Roles operativos (Inspección, Radicación, Asignación, Patrullaje)
3. Usuarios enrutamiento (Recibida por / Remitido a)
4. Catálogos Excel Alcaldía
5. Placeholders en desplegables
6. Campos Case opcionales
7. Menú lateral, WebSocket, locale Bogotá
8. Seguridad sesión (10 min)
9. Calendario, Kanban, Home tablero
10. Permisos por rol (4 scripts en `roles/`)
11. Permisos ComunicacionCaso, Task, Meeting
12. Plantillas documentales y Excel oficial
13. Job alertas vencimiento
14. Vínculos caso ↔ tercero

### 11.2 Roles (`scripts/roles/`)

| Script | Rol configurado |
|--------|-----------------|
| `configure-role-inspeccion.php` | Inspección — crear casos, aprobar visitas, actuo |
| `configure-role-radicacion.php` | Radicación — solo radicado/expediente |
| `configure-role-asignacion.php` | Asignación — solo panel asignación |
| `configure-role-patrullaje.php` | Patrullaje — actas, casos asignados |

Otros: `seed-alcaldia-roles.php`, `configure-full-access-all-roles.php`, `configure-comunicacion-caso-permissions.php`, etc.

### 11.3 Migraciones legacy (solo BD antigua)

| Script | Propósito |
|--------|-----------|
| `needs-legacy-db-migrations.php` | Detecta si aplican |
| `migrate-drop-case-categoria-tipo.php` | Elimina columnas obsoletas |
| `migrate-case-canonical-fields.php` | Campos canónicos |
| `migrate-case-party-field-names.php` | Nombres campos partes |
| `sync-case-party-links.php` | Vínculos caso ↔ tercero |

### 11.4 Utilidades y reparación

| Script | Propósito |
|--------|-----------|
| `reset-operational-data.php` | Vacía datos operativos (conserva usuarios/roles) |
| `wipe-business-data.php` | Wipe total (una vez por servidor) |
| `repair-case-en-proceso-to-visita-realizada.php` | Migra estados legacy |
| `diagnose-visita-aprobada.php` | Diagnóstico flujo visita aprobada |
| `format-nits-in-database.php` | Formatea NITs en BD |

**Reset operativo** (en contenedor `espocrm`, NO `espocrm-db`):

```bash
ESPO_CONFIRM_RESET=1 php /opt/bootstrap/repo/scripts/reset-operational-data.php
```

---

## 12. Base de datos y SQL

### Convenciones PostgreSQL

| Regla | Detalle |
|-------|---------|
| Tabla casos | `"case"` (comillas obligatorias en SQL) |
| Campos custom | Prefijo `c_` en BD (ej. `c_numero_radicado`) |
| Borrado lógico | `deleted = false` en consultas |
| IDs | 17 caracteres (formato EspoCRM) |

### Tablas custom principales

| Tabla | Descripción |
|-------|-------------|
| `"case"` | Casos ambientales (80+ columnas `c_*`) |
| `acta_visita` | Actas de visita |
| `actuo_archivo` | Autos de archivo |
| `comunicacion_caso` | Comunicaciones |
| `asignacion_historial` | Historial asignaciones |

### Estados del caso (`status`)

1. `Pendiente de radicacion` (default al crear)
2. `Radicado`
3. `Asignado`
4. `En proceso` (legacy)
5. `Visita realizada`
6. `Visita aprobada`
7. `Finalizado`
8. `Proceso cerrado`

Consultas de validación: ver `docs/CONSULTAS-BD-VALIDACION.md`.

---

## 13. Plantillas y exportaciones

### `formatos/` (fuente en repo)

| Archivo | Uso |
|---------|-----|
| `FormatoSolicitud.doc` | Plantilla solicitud → PDF |
| `ActaVisita2.docx` | Plantilla acta de visita → PDF |
| `ActaVisita.xlsx` | Export Excel complementario |
| `ActuoArchivo.docx` | Plantilla auto de archivo → PDF |

### `exports/`

- `excelAlcaldia.xlsx` — maestro de catálogos y exportación institucional (generado en runtime).

---

## 14. Docker y despliegue

### Imagen (`docker/espocrm/Dockerfile`)

- Base: `espocrm/espocrm`
- Paquetes: PostgreSQL client, Python3, openpyxl, PyMuPDF, LibreOffice, python3-uno
- Apache: módulos proxy WebSocket
- Copia en build: `espocrm-custom/`, `scripts/`, `formatos/`, `sql/`, `.deploy-version`
- `ENV ESPO_RUN_AUTO_DEPLOY=1`

### Servicios (`docker-compose.yml`)

| Servicio | Función |
|----------|---------|
| `espocrm-db` | PostgreSQL 16 |
| `espocrm` | Apache + EspoCRM + auto-deploy (:8080) |
| `espocrm-daemon` | Cola de trabajos |
| `espocrm-websocket` | Notificaciones tiempo real (:8081) |
| `espocrm-init` | Primer deploy tras instalación |

### Flujo de publicación

```
git push origin main
  → Dokploy Redeploy (rebuild imagen)
  → entrypoint compara .deploy-version
  → deploy-custom-dokploy.sh
  → Ctrl+Shift+R en navegador
```

### Comandos locales

```bash
# Primera vez
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build

# Aplicar cambios sin rebuild
bash scripts/deploy-custom.sh

# Verificar
bash scripts/verify-custom-deploy.sh
```

---

## 15. Roles, permisos y reglas de negocio

### Usuarios de prueba

| Rol | Usuario | Contraseña | Puede hacer |
|-----|---------|------------|-------------|
| Inspección | `inspeccion` | `inspeccion2026` | Crear casos, aprobar visitas, diligenciar actuo, cerrar |
| Radicación | `radicacion` | `radicacion2026` | Ver todos; editar solo radicado/expediente |
| Asignación | `asignacion` | `asignacion2026` | Ver todos; editar solo asignación patrullero |
| Patrullaje | `patrullaje` | `patrullaje2026` | Casos asignados; crear/editar actas |

Detección de rol en backend: `Tools/User/AlcaldiaUserProfile.php` → API `Case/action/alcaldiaProfile`.

### Reglas por rol (frontend)

| Rol | Helper principal | Restricción UI |
|-----|------------------|----------------|
| Inspección | `inspeccion-case-flow.js` | No ve asignación; radicado read-only salvo permiso |
| Radicación | `radicacion-case-flow.js` | Modo radicar: solo radicado/expediente |
| Asignación | `asignador-case-flow.js` | Modo asignar: solo patrullero |
| Patrullaje | `patrullero-acta.js` | Solo casos asignados; panel acta |

### Reglas por rol (backend — hooks)

| Rol | Hook | Restricción servidor |
|-----|------|----------------------|
| Radicación | `LimitRadicacionCaseEdit.php` | Solo persiste campos radicado |
| Asignación | `LimitAsignadorCaseEdit.php` | Solo persiste asignación |
| Todos | `ProtectRadicadoForNonRadicacionUsers.php` | Protege radicado |

### Paneles ocultos al crear caso

Definidos en `case-create-form.js`:

- Radicación, Acta de visita, Auto de archivo, Formatos generados

---

## 16. Flujo completo del caso

```
Inspección crea caso
  → Pendiente de radicación
  → PDF solicitud generado
  → Notifica Radicación

Radicación completa radicado + expediente
  → Radicado
  → Fila en Excel
  → Notifica Inspección y Asignación

Asignación asigna patrullero
  → Asignado
  → Notifica patrullero e Inspección
  → Log en AsignacionHistorial

Patrullaje marca "Voy a realizar la visita" + diligencia acta
  → Visita realizada
  → PDF acta generado
  → Notifica Inspección

Inspección aprueba visita (checkbox)
  → Visita aprobada
  → Notifica patrullero
  → Aparece panel Auto de archivo

Inspección diligencia auto de archivo
  → PDF auto en Formatos generados
  → Botón cambia a "Editar"

Cierre del caso
  → Finalizado / Proceso cerrado
  → Notifica gestores
```

### Detalle panel Acta de visita

| Paso | Quién | Acción |
|------|-------|--------|
| 1 | Patrullaje/Inspección | Marcar "Voy a realizar la visita" |
| 2 | Patrullaje/Inspección | Llenar acta (digital o manual) |
| 3 | Inspección | Marcar "Visita aprobada" |

Archivo clave: `views/case/fields/acta-visita-action.js`

### Detalle panel Auto de archivo

| Condición | Comportamiento |
|-----------|----------------|
| Estado < Visita aprobada | Panel oculto |
| Visita aprobada + Inspección | Panel visible: Llenar / Imprimir manual |
| Actuo diligenciado | Botón "Editar"; PDF en Formatos generados |

Archivo clave: `views/case/fields/actuo-archivo-action.js`

---

## 17. Notificaciones

| Evento | Destinatarios | Mecanismo |
|--------|---------------|-----------|
| Caso creado | Radicación | `NotifyRadicacionOnCaseCreated` |
| Radicado completado | Inspección, Asignación | `NotifyInspeccionAndAsignadorOnRadicado` |
| Patrullero asignado | Patrullero, Inspección | `NotifyPatrulleroAssignment` |
| Acta diligenciada | Inspección | `NotifyInspeccionOnActaDiligenciada` |
| Visita aprobada | Patrullero | `CaseVisitaAprobadaNotifier` |
| Vencimiento próximo/vencido | Usuarios relevantes | `NotifyOnFechaVencimientoChange` + Job cron |
| Caso finalizado | Gestores + patrullero | `NotifyOnCaseFinalizado` |

- UI custom: `views/notification/badge.js`, `panel.js`
- Plantilla: `res/templates/notification/items/radicado.tpl`
- Textos: `helpers/alcaldia-notification-message.js`
- Anti-duplicados: `CaseNotificationDuplicateGuard.php`
- Notificaciones nativas EspoCRM suprimidas: `SuppressNativeCaseNotifications`

---

## 18. Documentos generados automáticamente

| Documento | Cuándo se genera | Tecnología |
|-----------|------------------|------------|
| Formato solicitud PDF | Al guardar caso (crear) | Python + PyMuPDF |
| Acta visita PDF | Al guardar acta con contenido | Python + PyMuPDF |
| Auto archivo PDF | Al guardar actuo con motivo + referencia | Python + PyMuPDF |
| Excel Alcaldía (fila) | Al radicar / al guardar acta | Python openpyxl |
| Reporte gerencial | Desde tablero Home | Python openpyxl |

### Panel "Formato generado" (detalle caso)

| Documento | Cuándo aparece |
|-----------|----------------|
| Formato de solicitud | Caso con radicado |
| Acta de visita | Acta diligenciada |
| Auto de archivo | Actuo diligenciado (Visita aprobada en adelante) |

Lógica: `helpers/case-documentos.js`

---

## 19. Documentación existente

| Archivo | Contenido |
|---------|-----------|
| `docs/GUIA-HANDOFF-PROYECTO.md` | Esta guía (visión + reglas + flujos) |
| `docs/handoff/ANEXO-A-…H.md` | Inventarios exhaustivos (helpers, views, campos, hooks, backend, scripts, CSS, metadata) |
| `docs/CONSULTAS-BD-VALIDACION.md` | Consultas SQL para validar datos en PostgreSQL |
| `docs/ALMACENAMIENTO-BD-Y-ARCHIVOS.md` | Contenedores/volúmenes + rutas de PDFs, fotos, Excel y adjuntos |
| `docs/ESTADO-CUMPLIMIENTO-OBJETIVOS.md` | Objetivos del proyecto vs. lo implementado |
| `README.md` | Instalación, Docker, Dokploy, usuarios de prueba |
| `backups/despliegue-inicial/env.txt` | Plantilla de variables para Dokploy |

---

## 20. Checklist para el nuevo desarrollador

### Primer día

- [ ] Clonar repo, copiar `.env.example` → `.env`
- [ ] Levantar stack: `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build`
- [ ] Esperar `espocrm-init` y revisar logs
- [ ] Login con `inspeccion` / `inspeccion2026`
- [ ] Recorrer flujo completo: crear → radicar → asignar → acta → aprobar → actuo
- [ ] Leer `docs/ESTADO-CUMPLIMIENTO-OBJETIVOS.md`
- [ ] Leer `docs/CONSULTAS-BD-VALIDACION.md`

### Al hacer cambios

| Tipo de cambio | Qué hacer |
|----------------|-----------|
| PHP hooks / metadata | `bash scripts/deploy-custom.sh` (local) |
| JS/CSS visible en prod | Actualizar `.deploy-version` |
| Roles/permisos | Re-ejecutar script en `scripts/roles/` |
| Verificar | `bash scripts/verify-custom-deploy.sh` |
| Publicar | `git push origin main` → Dokploy rebuild → Ctrl+Shift+R |

### Errores frecuentes

| Problema | Causa probable | Solución |
|----------|----------------|----------|
| Cambios no se ven en prod | Sin rebuild o caché | Redeploy + Ctrl+Shift+R + `.deploy-version` |
| Auto-deploy omitido | Versión igual | Bump `.deploy-version` |
| Reset en contenedor equivocado | Ejecutado en `espocrm-db` | Usar contenedor `espocrm` |
| Permisos rotos | Deploy incompleto | Re-ejecutar `configure-role-*.php` |

---

## 21. Archivos que más se modifican

| Si necesitas cambiar… | Archivos principales |
|----------------------|----------------------|
| Campos o pantallas | `Resources/metadata/entityDefs/`, `Resources/layouts/` |
| Lógica al guardar | `Hooks/`, `Tools/` |
| UI por rol | `files/client/custom/src/helpers/*-case-flow.js` |
| Panel acta / actuo | `views/case/fields/acta-visita-action.js`, `actuo-archivo-action.js` |
| Formatos generados | `helpers/case-documentos.js` |
| Estilos | `res/css/`, loaders `theme-*.js` |
| Notificaciones | `Hooks/CaseObj/Notify*.php`, `alcaldia-notification-message.js` |
| PDFs / Excel | `files/scripts/*.py`, `Tools/*/Formato*Generator.php` |
| Deploy | `scripts/includes/deploy-steps.sh`, `.deploy-version` |
| Traducciones | `Resources/i18n/es_ES/` |

---

## 22. Anexos de inventario completo

Usar estos anexos cuando se necesite **localizar un archivo concreto** (no solo entender el flujo).

| Anexo | Contenido | Conteo |
|-------|-----------|--------|
| [A — Helpers](handoff/ANEXO-A-HELPERS.md) | Todos los helper AMD | 42 |
| [B — Views / templates](handoff/ANEXO-B-VIEWS-TEMPLATES.md) | Views + handlers + `.tpl` | 48 + 19 |
| [C — Campos Case](handoff/ANEXO-C-CAMPOS-CASE.md) | Diccionario de campos y links | 80 campos |
| [D — Hooks](handoff/ANEXO-D-HOOKS.md) | Todos los hooks PHP | 37 |
| [E — Backend PHP](handoff/ANEXO-E-BACKEND-PHP.md) | Tools, Controllers, EntryPoints, Classes… | completo |
| [F — Scripts](handoff/ANEXO-F-SCRIPTS.md) | Deploy, roles, utilidades | completo |
| [G — CSS / loaders / Python](handoff/ANEXO-G-CSS-FRONTEND-ASSETS.md) | Estilos, loaders, generación documental | 25 CSS |
| [H — Metadata / i18n](handoff/ANEXO-H-METADATA-RESOURCES.md) | entityDefs, layouts, traducciones | completo |

---

*CRM Ambiental — Secretaría de Medio Ambiente, Alcaldía de Envigado · Geotrends · Documentación de handoff.*
