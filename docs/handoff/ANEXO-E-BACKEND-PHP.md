# Anexo E — Backend PHP (Tools, Controllers, EntryPoints, Entities, Jobs, Classes)


## Entities


- `ActaVisita.php`
- `ActuoArchivo.php`
- `AsignacionHistorial.php`
- `ComunicacionCaso.php`

## Controllers


- `Account.php`
- `ActaVisita.php`
- `ActuoArchivo.php`
- `AsignacionHistorial.php`
- `CaseObj.php`
- `ComunicacionCaso.php`
- `Contact.php`
- `Document.php`
- `User.php`

## EntryPoints


- `ExcelAlcaldiaDownload.php`
- `ExcelAlcaldiaViewerFile.php`
- `ExcelAlcaldiaViewerPreview.php`
- `FormatoActaVisita.php`
- `FormatoActaVisitaCaso.php`
- `FormatoActuoArchivo.php`
- `FormatoActuoArchivoCaso.php`
- `FormatoSolicitud.php`
- `ReporteGerencial.php`

## Jobs


- `CheckCaseVencimientoAlerts.php`

## Tools


**Total: 37.**


| Clase | Propósito |
|-------|-----------|
| `ActaVisita/FormatoActaVisitaAttacher.php` | Adjunta PDF acta al registro. |
| `ActaVisita/FormatoActaVisitaGenerator.php` | Orquesta PDF acta (Python). |
| `ActuoArchivo/FormatoActuoArchivoAttacher.php` | Adjunta PDF auto. |
| `ActuoArchivo/FormatoActuoArchivoGenerator.php` | Orquesta PDF auto (digital/manual). |
| `App/AlcaldiaDateTimeHelper.php` | Fechas zona Bogotá. |
| `App/AlcaldiaLocaleDefaults.php` | Defaults idioma/formato. |
| `Calendar/CaseCalendarEventService.php` | Eventos calendario desde casos. |
| `CaseObj/AlcaldiaNotificationHtml.php` | HTML notificaciones. |
| `CaseObj/CaseActaVisitaHelper.php` | Transiciones estado por acta. |
| `CaseObj/CaseAlertNotifier.php` | Emisor alertas vencimiento. |
| `CaseObj/CaseCreateDefaultsService.php` | Defaults al crear caso. |
| `CaseObj/CaseCronogramaService.php` | API cronograma. |
| `CaseObj/CaseEnumNormalizer.php` | Normaliza enums. |
| `CaseObj/CaseNotificationDuplicateGuard.php` | Anti-duplicados notificación. |
| `CaseObj/CasePartyNameHelper.php` | Nombres partes. |
| `CaseObj/CaseRadicadoHelper.php` | Radicado/expediente helpers. |
| `CaseObj/CaseTimelineService.php` | API timeline. |
| `CaseObj/CaseVencimientoHelper.php` | Clasifica vencimientos. |
| `CaseObj/CaseVisitaAprobadaNotifier.php` | Notifica al aprobar visita. |
| `CaseObj/DireccionEstructuradaBuilder.php` | Builder dirección. |
| `CaseObj/ExcelAlcaldiaDocumentSync.php` | Sync Excel → Document. |
| `CaseObj/ExcelAlcaldiaExporter.php` | Export fila Excel. |
| `CaseObj/ExcelAlcaldiaPreviewService.php` | Preview Excel HTML. |
| `CaseObj/FormatoSolicitudAttacher.php` | Adjunta PDF solicitud. |
| `CaseObj/FormatoSolicitudGenerator.php` | Genera PDF solicitud. |
| `CaseObj/InfractorUnknownHelper.php` | Infractor desconocido. |
| `CaseObj/RadicadoCatalog.php` | Catálogo siglas. |
| `CaseObj/RadicadoConsecutivoService.php` | Consecutivo radicado. |
| `CaseObj/ReporteGerencialGenerator.php` | Genera reporte gerencial. |
| `CaseObj/ReporteGerencialService.php` | Datos reporte gerencial. |
| `Party/DocumentNormalizer.php` | Normaliza cédula/NIT. |
| `Party/PartyCaseFilterHelper.php` | Filtros casos por tercero. |
| `Party/PartyCasosService.php` | Casos asociados. |
| `Party/PartyExpedienteService.php` | Expediente tercero. |
| `Party/PartyRegistryService.php` | Lookup documento (buscarParte). |
| `User/AlcaldiaUserProfile.php` | Detección roles. |
| `User/UserHistorialService.php` | Historial actuaciones usuario. |

## Classes (ACL / Select / RecordHooks)


**Total: 21.**


- `Acl/CaseObj/AssignmentChecker.php`
- `AssignmentNotificators/CaseObj.php`
- `Record/CaseObj/CreateInputFilter.php`
- `Record/CaseObj/UpdateInputFilter.php`
- `RecordHooks/ActaVisita/EarlyBeforeCreate.php`
- `RecordHooks/ActuoArchivo/EarlyBeforeCreate.php`
- `RecordHooks/CaseObj/EarlyBeforeCreate.php`
- `RecordHooks/CaseObj/EarlyClearInfractorWhenUnknown.php`
- `RecordHooks/CaseObj/EarlyNormalizeCaseEnums.php`
- `Select/Account/PrimaryFilters/ConCasosAsociados.php`
- `Select/Account/Where/ItemConverters/CaseFieldEquals.php`
- `Select/ComunicacionCaso/AccessControlFilters/Mandatory.php`
- `Select/Contact/PrimaryFilters/ConCasosAsociados.php`
- `Select/Contact/Where/ItemConverters/CaseFieldEquals.php`
- `Select/Document/PrimaryFilters/ActaVisita.php`
- `Select/Document/PrimaryFilters/ActuoArchivo.php`
- `Select/Document/PrimaryFilters/ExcelOficial.php`
- `Select/Document/PrimaryFilters/FormatoSolicitud.php`
- `Select/Document/PrimaryFilters/TodosPlantillas.php`
- `Select/Task/AccessControlFilters/Mandatory.php`
- `Select/User/PrimaryFilters/Patrulleros.php`

---

*Guía: [`../GUIA-HANDOFF-PROYECTO.md`](../GUIA-HANDOFF-PROYECTO.md).*
