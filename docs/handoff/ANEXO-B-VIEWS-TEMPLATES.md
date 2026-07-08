# Anexo B — Views, templates y handlers


## Views (`src/views/`)


**Total: 48 archivos.**


| Ruta relativa | Propósito |
|--------------|-----------|
| `acta-visita/fields/case.js` | Link Case en ActaVisita. |
| `acta-visita/record/detail.js` | Detalle ActaVisita. |
| `acta-visita/record/panels/formato-acta-visita.js` | Descarga PDF acta. |
| `actuo-archivo/record/panels/formato-actuo-archivo.js` | Descarga PDF auto. |
| `calendar/calendar.js` | Calendario custom. |
| `calendar/modals/day-events.js` | Modal eventos del día. |
| `calendar/modals/edit.js` | Modal edición evento. |
| `case/detail.js` | Detalle Case: título con radicado. |
| `case/edit.js` | Edición Case (wrapper). |
| `case/fields/acta-visita-action.js` | Panel Acta: check visita, aprobación, botones. |
| `case/fields/actuo-archivo-action.js` | Panel Auto archivo (Inspección post-aprobación). |
| `case/fields/assigned-user.js` | Usuario asignado (filtros patrulleros). |
| `case/fields/c-motivo-reasignacion.js` | Motivo reasignación. |
| `case/fields/direccion-computada.js` | Dirección readOnly computada. |
| `case/fields/documento-perjudicante.js` | Documento perjudicante + lookup. |
| `case/fields/documento-peticionario.js` | Documento peticionario + lookup. |
| `case/fields/expediente.js` | Campo expediente. |
| `case/fields/formato-generado-docs.js` | Lista PDFs generados. |
| `case/fields/numero-radicado.js` | Campo radicado compuesto. |
| `case/fields/status.js` | Estado con colores/iconos. |
| `case/list.js` | Lista Case. |
| `case/record/detail.js` | Record detail: flujos por rol, botones radicar/asignar. |
| `case/record/edit.js` | Record edit: create-form, optional fields, direcciones, parties. |
| `case/record/panels/actuo-archivo.js` | Panel lateral legacy auto (deshabilitado en clientDefs). |
| `case/record/panels/case-cronograma.js` | Panel cronograma. |
| `case/record/panels/comunicaciones-caso.js` | Panel comunicaciones. |
| `case/record/panels/status-timeline.js` | Panel línea de tiempo. |
| `comunicacion-caso/fields/destinatario-sugerencias.js` | Sugerencias destinatario. |
| `document/record/panels/excel-onlyoffice-viewer.js` | Visor Excel en Document. |
| `fields/nit-formatted.js` | Campo NIT formateado. |
| `fields/numeric-only.js` | Campo solo números. |
| `fields/party-document.js` | Documento de tercero genérico. |
| `fields/phone-numeric.js` | Teléfono solo dígitos. |
| `home.js` | Home con iframe dashboard. |
| `meeting/record/panels/attendees.js` | Asistentes reunión. |
| `modals/acta-visita.js` | Modal ActaVisita. |
| `modals/actuo-archivo.js` | Modal ActuoArchivo. |
| `modals/excel-alcaldia-viewer.js` | Modal visor Excel. |
| `notification/badge.js` | Campana con contador. |
| `notification/fields/container.js` | Contenedor item notificación. |
| `notification/items/radicado.js` | Item notificación radicado. |
| `notification/panel.js` | Panel campana. |
| `notification/record/list.js` | Lista notificaciones. |
| `party/record/panels/casos-relacion.js` | Casos asociados Contact/Account. |
| `party/record/panels/expediente-tercero.js` | Expediente consolidado tercero. |
| `team/record/list.js` | Lista equipos. |
| `team/record/panels/users-cards.js` | Tarjetas miembros. |
| `user/record/panels/historial-usuario.js` | Historial actuaciones usuario. |

## Handlers (`src/handlers/`)


- `task-default-assigned-user.js` — handler de acción puntual (default assignedUser en Task).

## Templates Handlebars (`res/templates/`)


**Total: 19 templates.**


- `acta-visita/record/panels/formato-acta-visita.tpl`
- `actuo-archivo/record/panels/formato-actuo-archivo.tpl`
- `calendar/modals/day-events.tpl`
- `case/fields/acta-visita-action.tpl`
- `case/fields/actuo-archivo-action.tpl`
- `case/fields/formato-generado-docs.tpl`
- `case/fields/numero-radicado/edit.tpl`
- `case/fields/numero-radicado/list-link.tpl`
- `case/fields/numero-radicado/list.tpl`
- `case/record/panels/actuo-archivo.tpl`
- `case/record/panels/case-cronograma.tpl`
- `case/record/panels/comunicaciones-caso.tpl`
- `case/record/panels/status-timeline.tpl`
- `comunicacion-caso/fields/destinatario-sugerencias.tpl`
- `document/record/panels/excel-onlyoffice-viewer.tpl`
- `modals/excel-alcaldia-viewer.tpl`
- `notification/items/radicado.tpl`
- `party/record/panels/expediente-tercero.tpl`
- `user/record/panels/historial-usuario.tpl`

## Assets frontend adicionales


- `dashboard.html` + `dashboard.js` — tablero Chart.js embebido en Home
- `lib/xlsx.mini.min.js` — SheetJS para visor Excel
- `res/img/` — `logo-envigado.png`, `logo-sma.svg`, `login-hero.jpg`

---

*Guía principal: [`../GUIA-HANDOFF-PROYECTO.md`](../GUIA-HANDOFF-PROYECTO.md).*
