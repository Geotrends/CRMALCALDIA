# Anexo C — Diccionario de campos Case


Fuente: `Resources/metadata/entityDefs/Case.json` + i18n `es_ES/Case.json`.


**Total campos en entityDefs: 80.**


## Identificación / estándar


| Campo | Tipo | Etiqueta ES | Flags |
|-------|------|-------------|-------|
| `name` | — |  |  |
| `description` | — | Descripción |  |
| `status` | — |  |  |
| `assignedUser` | — | Asignado a |  |
| `priority` | enum |  |  |
| `type` | enum |  |  |
| `teams` | linkMultiple |  |  |
| `number` | — |  |  |

## Fechas principales


| Campo | Tipo | Etiqueta ES | Flags |
|-------|------|-------------|-------|
| `cFechaCaso` | datetime |  |  |
| `cFechaVencimiento` | date | Fecha de vencimiento |  |

## Radicación


| Campo | Tipo | Etiqueta ES | Flags |
|-------|------|-------------|-------|
| `cNumeroRadicado` | varchar | Radicado y expediente |  |
| `cExpediente` | varchar | Expediente |  |
| `cRadicadoModo` | enum | Modo de radicado |  |
| `cRadicadoSiglas` | enum | Siglas de recurso |  |
| `cRadicadoAnio` | varchar | Año del radicado |  |

## Peticionario


| Campo | Tipo | Etiqueta ES | Flags |
|-------|------|-------------|-------|
| `cTipoPersonaPeticionario` | enum | Tipo de peticionario |  |
| `cDocumentoPeticionario` | varchar | Documento del peticionario |  |
| `cNombrePeticionario` | varchar | Nombre(s) del peticionario |  |
| `cApellidoPeticionario` | varchar | Apellido(s) del peticionario |  |
| `cViaPrincipalPeticionario` | enum | Vía principal del peticionario |  |
| `cNumViaPrincipalPeticionario` | varchar | N° vía principal del peticionario |  |
| `cLetraViaPrincipalPeticionario` | enum | Letra del peticionario |  |
| `cCuadranteViaPrincipalPeticionario` | enum | Cuadrante del peticionario |  |
| `cGeneradoraPeticionario` | varchar | Generadora del peticionario |  |
| `cLetraGeneradoraPeticionario` | enum | Letra generadora del peticionario |  |
| `cCuadranteGeneradoraPeticionario` | enum | Cuadrante del peticionario |  |
| `cPlacaPeticionario` | varchar | Placa del peticionario |  |
| `cBloquePeticionario` | varchar | Bloque del peticionario |  |
| `cInteriorPeticionario` | varchar | Interior del peticionario |  |
| `cDireccionPeticionario` | varchar | Dirección del peticionario | readOnly |
| `cTelefonoPeticionario` | varchar | Teléfono del peticionario |  |
| `cMunicipioPeticionario` | varchar | Municipio del peticionario | readOnly, utility |
| `cBarrioPeticionario` | enum | Barrio del peticionario |  |
| `cCorreoPeticionario` | varchar | Correo del peticionario |  |
| `cCanalDeReportePeticionario` | enum | Canal de reporte del peticionario |  |
| `contact` | — | Persona natural (peticionario) | readOnly, utility |
| `account` | — | Persona jurídica (peticionario) | readOnly, utility |
| `cZonaAlcaldiaPeticionario` | enum | Zona del peticionario |  |

## Perjudicante / infractor


| Campo | Tipo | Etiqueta ES | Flags |
|-------|------|-------------|-------|
| `cTipoPersonaPerjudicante` | enum | Tipo de perjudicante |  |
| `cDocumentoPerjudicante` | varchar | Documento del perjudicante |  |
| `cNombrePerjudicante` | varchar | Nombre(s) del perjudicante |  |
| `cApellidoPerjudicante` | varchar | Apellido(s) del perjudicante |  |
| `cPerjudicanteContact` | link | Persona natural (perjudicante) | readOnly, utility |
| `cPerjudicanteCuenta` | link | Persona jurídica (perjudicante) | readOnly, utility |
| `cTelefonoPerjudicante` | varchar | Teléfono del perjudicante |  |
| `cViaPrincipalPerjudicante` | enum | Vía principal del perjudicante |  |
| `cNumViaPrincipalPerjudicante` | varchar | N° vía principal del perjudicante |  |
| `cLetraViaPrincipalPerjudicante` | enum | Letra del perjudicante |  |
| `cCuadranteViaPrincipalPerjudicante` | enum | Cuadrante del perjudicante |  |
| `cGeneradoraPerjudicante` | varchar | Generadora del perjudicante |  |
| `cLetraGeneradoraPerjudicante` | enum | Letra generadora del perjudicante |  |
| `cCuadranteGeneradoraPerjudicante` | enum | Cuadrante del perjudicante |  |
| `cPlacaPerjudicante` | varchar | Placa del perjudicante |  |
| `cBloquePerjudicante` | varchar | Bloque del perjudicante |  |
| `cInteriorPerjudicante` | varchar | Interior del perjudicante |  |
| `cDireccionPerjudicante` | varchar | Dirección del perjudicante | readOnly |
| `cCorreoPerjudicante` | varchar | Correo del perjudicante |  |
| `cBarrioPerjudicante` | enum | Barrio del perjudicante |  |

## Clasificación Excel / seguimiento


| Campo | Tipo | Etiqueta ES | Flags |
|-------|------|-------------|-------|
| `cRecursoTema` | enum | Recurso / tema |  |
| `cAsunto` | enum | Asunto |  |
| `cZonaAlcaldiaPeticionario` | enum | Zona del peticionario |  |
| `cUltimaActuacion` | enum | Última actuación |  |
| `cProximaActuacion` | enum | Próxima actuación |  |
| `cPredio` | varchar | Predio |  |
| `cFechaActuacionInicial` | date | Fecha de actuación inicial |  |
| `cDiasAtencion` | int | Días de atención | readOnly |
| `cFechaUltimaActuacion` | date | Fecha de última actuación |  |
| `cRespUltimaActuacion` | link | Responsable de última actuación | readOnly |
| `cPeriodoAtencion` | varchar | Periodo de atención |  |
| `cInspectorResponsable` | link | Inspector responsable | readOnly |
| `cRespProximaActuacion` | link | Responsable de próxima actuación | readOnly |
| `cPqrsCobro` | varchar | PQRS o Cobro |  |
| `cAlertaPqrsCobro` | varchar | Alerta / PQRS o Cobro |  |
| `cObservaciones` | text | Observaciones |  |

## Queja y gestión


| Campo | Tipo | Etiqueta ES | Flags |
|-------|------|-------------|-------|
| `cRespuestaInmediata` | text | Respuesta inmediata |  |
| `cRecibidaPor` | link | Recibida por |  |
| `cRemitidoA` | link | Remitido a |  |
| `cMotivoReasignacion` | text | Motivo de reasignación |  |

## Documentos / paneles UI


| Campo | Tipo | Etiqueta ES | Flags |
|-------|------|-------------|-------|
| `cFormatoSolicitudPdf` | file | Formato de solicitud (PDF) | readOnly |
| `cPanelActaVisita` | varchar |  | readOnly, utility, notStorable |
| `cPanelActuoArchivo` | varchar |  | readOnly, utility, notStorable |

## Links (relaciones)


| Link | Tipo | Entidad |
|------|------|---------|
| `cRecibidaPor` | belongsTo | `User` |
| `cRemitidoA` | belongsTo | `User` |
| `actasVisita` | hasMany | `ActaVisita` |
| `actuosArchivo` | hasMany | `ActuoArchivo` |
| `asignacionesHistorial` | hasMany | `AsignacionHistorial` |
| `comunicacionesCaso` | hasMany | `ComunicacionCaso` |
| `cPerjudicanteContact` | belongsTo | `Contact` |
| `cPerjudicanteCuenta` | belongsTo | `Account` |
| `cRespUltimaActuacion` | belongsTo | `User` |
| `cInspectorResponsable` | belongsTo | `User` |
| `cRespProximaActuacion` | belongsTo | `User` |

## Layouts Case (`Resources/layouts/Case/`)


- `defaultSidePanel.json`
- `detail.json`
- `detailSmall.json`
- `edit.json`
- `filters.json`
- `kanban.json`
- `list.json`
- `listForParty.json`
- `sidePanelsDetail.json`
- `sidePanelsEdit.json`

---

*Guía principal: [`../GUIA-HANDOFF-PROYECTO.md`](../GUIA-HANDOFF-PROYECTO.md).*
