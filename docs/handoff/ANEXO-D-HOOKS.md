# Anexo D — Hooks PHP (inventario completo)


**Total: 37 hooks** en `espocrm-custom/Hooks/`.


| Ruta | Propósito |
|------|-----------|
| `Account/PreventDuplicateNit.php` | Impide NIT duplicado en Account. |
| `ActaVisita/ExportActaVisitaExcelOnSave.php` | Actualiza Excel Alcaldía al guardar acta. |
| `ActaVisita/FillFromCase.php` | Pre-llena acta desde Case. |
| `ActaVisita/GenerateFormatoActaVisitaOnSave.php` | Genera PDF acta al guardar. |
| `ActaVisita/NotifyInspeccionOnActaDiligenciada.php` | Notifica Inspección al diligenciar acta (order 47). |
| `ActaVisita/SetEnProcesoOnActaVisita.php` | Pasa caso a Visita realizada (order 48). |
| `ActuoArchivo/FillFromCase.php` | Pre-llena actuo desde Case; estado Diligenciada si hay contenido. |
| `ActuoArchivo/GenerateFormatoActuoArchivoOnSave.php` | Genera PDF auto al guardar. |
| `CaseObj/AutoGenerateRadicadoOnSave.php` | Genera radicado automático. |
| `CaseObj/BuildDireccionEstructuradaOnSave.php` | Construye dirección estructurada. |
| `CaseObj/ClearInfractorWhenUnknownOnSave.php` | Limpia infractor si No se conoce. |
| `CaseObj/ExportCaseExcelAlcaldiaOnSave.php` | Escribe fila Excel si radicado+expediente. |
| `CaseObj/FormatPartyDocumentOnSave.php` | Formatea cédula/NIT. |
| `CaseObj/GenerateFormatoSolicitudOnSave.php` | Genera PDF solicitud. |
| `CaseObj/LimitAsignadorCaseEdit.php` | Asignación: solo assignedUser/motivo. |
| `CaseObj/LimitRadicacionCaseEdit.php` | Radicación: solo radicado/expediente. |
| `CaseObj/LogAsignacionHistorial.php` | Log cambios de patrullero. |
| `CaseObj/NormalizeCaseEnumPlaceholders.php` | Placeholder → null. |
| `CaseObj/NotifyInspeccionAndAsignadorOnRadicado.php` | Notifica al radicar. |
| `CaseObj/NotifyOnCaseFinalizado.php` | Notifica al finalizar. |
| `CaseObj/NotifyOnFechaVencimientoChange.php` | Alertas vencimiento. |
| `CaseObj/NotifyPatrulleroAssignment.php` | Notifica asignación patrullero. |
| `CaseObj/NotifyRadicacionOnCaseCreated.php` | Notifica Radicación al crear. |
| `CaseObj/PopulateSeguimientoFieldsOnSave.php` | Puebla campos seguimiento Excel. |
| `CaseObj/ProtectRadicadoForNonRadicacionUsers.php` | Protege radicado. |
| `CaseObj/RestrictRadicadoUntilRadicacionOnSave.php` | No persiste radicado sin rol. |
| `CaseObj/SanitizeCaseGestionLinksOnSave.php` | Sanitiza Recibida por/Remitido a. |
| `CaseObj/SetAsignadoOnPatrulleroAssignment.php` | Estado Asignado al asignar. |
| `CaseObj/SetRadicadoOnPostRadicacion.php` | Estado Radicado al completar radicación. |
| `CaseObj/SuppressNativeCaseNotifications.php` | Suprime notificaciones nativas. |
| `CaseObj/SyncCasePartyDefaultsOnSave.php` | Defaults de links de partes. |
| `CaseObj/SyncPerjudicanteParty.php` | Sync infractor Contact/Account. |
| `CaseObj/SyncPeticionarioToContact.php` | Sync peticionario Contact. |
| `CaseObj/ValidatePersonaTipoOnSave.php` | Valida tipo persona/documento. |
| `ComunicacionCaso/FillFromCase.php` | Pre-llena comunicación. |
| `Contact/PreventDuplicateDocument.php` | Impide cédula duplicada. |
| `User/ApplyAlcaldiaLocaleDefaults.php` | Locale Bogotá en usuarios nuevos. |

---

*Guía: [`../GUIA-HANDOFF-PROYECTO.md`](../GUIA-HANDOFF-PROYECTO.md).*
