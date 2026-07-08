# Anexo G — CSS, loaders y scripts Python


## CSS


**Total: 25 archivos.**


| Archivo | Estiliza |
|---------|----------|
| `01-variables.css` | Design tokens verde institucional. |
| `02-base.css` | Tipografía y fondo. |
| `03-components.css` | Componentes reutilizables. |
| `04-espo-shell.css` | Shell EspoCRM. |
| `05-home.css` | Home / tablero. |
| `06-case.css` | Casos lista/detalle/estados. |
| `07-panels.css` | Paneles custom. |
| `08-dashboard.css` | Dashboard Chart.js. |
| `09-navbar.css` | Navbar y campana. |
| `10-page-headers.css` | Encabezados. |
| `11-full-width-layout.css` | Ancho completo. |
| `12-case-timeline.css` | Timeline. |
| `13-case-cronograma.css` | Cronograma. |
| `14-case-stream.css` | Stream; acta/actuo. |
| `15-login.css` | Login. |
| `16-task.css` | Tareas. |
| `17-team.css` | Equipos. |
| `18-calendar.css` | Calendario. |
| `19-form-sections.css` | Secciones formulario. |
| `20-case-kanban.css` | Kanban casos. |
| `21-scroll-layout.css` | Scroll único. |
| `22-ui-toasts.css` | Toasts (también cssList). |
| `23-buttons.css` | Botones píldora (también cssList). |
| `24-document-categories.css` | Iconos categorías Document. |
| `main.css` | Punto de entrada; @import 01–24. |

## Loaders (`src/loader/`)


- `case-list-radicado-fix.js`
- `i18n-personas.js`
- `notification-views.js`
- `promise-console-guard.js`
- `session-security.js`
- `theme-buttons.js`
- `theme-login.js`
- `theme-navbar.js`
- `ui-toasts.js`

## Python / layouts JSON (`files/scripts/`)


- `calibrate-actuo-archivo-layout.py`
- `fill-formato-acta-visita.py`
- `fill-formato-actuo-archivo.py`
- `fill-formato-solicitud.py`
- `formato-acta-visita-layout.json`
- `formato-actuo-archivo-layout.json`
- `formato-solicitud-layout.json`
- `generate-actuo-layout-from-docx.py`
- `generate-reporte-gerencial.py`
- `pdf-overlay-utils.py`
- `remove-crm-rows-excel-alcaldia.py`
- `render-excel-alcaldia-preview.py`
- `upsert-excel-alcaldia.py`

## formatos/ (fuente repo)


- `ActaVisita.xlsx`
- `ActaVisita2.docx`
- `ActuoArchivo.docx`
- `FormatoSolicitud.doc`

---

*Guía: [`../GUIA-HANDOFF-PROYECTO.md`](../GUIA-HANDOFF-PROYECTO.md).*
