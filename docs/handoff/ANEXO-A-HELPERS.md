# Anexo A — Helpers JavaScript (inventario completo)


Todos los módulos en `espocrm-custom/files/client/custom/src/helpers/` (AMD `custom:helpers/...`).


**Total: 42 helpers.**


| Archivo | Propósito |
|---------|-----------|
| `acta-visita-case-status.js` | Estado del acta vinculada al caso; fetch y detección de diligenciada. |
| `acta-visita-from-case.js` | Defaults de ActaVisita a partir del Case (radicado, partes, dirección). |
| `acta-visita-modal.js` | Abre modal crear/editar ActaVisita desde el case. |
| `actuo-archivo-case-status.js` | Estado del actuo vinculado al caso; fetch y detección diligenciado. |
| `actuo-archivo-from-case.js` | Defaults de ActuoArchivo a partir del Case. |
| `actuo-archivo-modal.js` | Abre modal crear/editar ActuoArchivo (solo Inspección cuando visita aprobada). |
| `alcaldia-notification-message.js` | Render Handlebars/textos y flags de notificaciones custom. |
| `asignador-assignment-ui.js` | UI del modo Asignar (botón primario, assignedUser editable). |
| `asignador-case-flow.js` | Flujo rol Asignación: body class, paneles, reasignación. |
| `case-create-form.js` | Al crear caso: oculta paneles detalle-only; defaults fecha y Recibida por/Remitido a. |
| `case-create-optional-fields.js` | Marca todos los campos como no obligatorios al crear. |
| `case-cronograma.js` | Consume y formatea datos del cronograma (API). |
| `case-detail-panels.js` | Orquesta carga cacheada de timeline + cronograma en detalle. |
| `case-documentos.js` | Construye lista de PDFs del panel Formato generado. |
| `case-fetch-cache.js` | Caché in-flight de fetch Acta/Actuo por caseId. |
| `case-party-name.js` | Arma nombre completo natural/jurídica para partes. |
| `case-radicado-label.js` | Etiqueta de título con radicado (listas/detalle/header). |
| `case-status-colors.js` | Paleta, orden e iconos CSS de estados del caso. |
| `case-status-timeline.js` | Cliente de timeline de estados (API + normalización). |
| `comunicacion-caso-from-case.js` | Defaults de ComunicacionCaso desde Case. |
| `comunicacion-caso-modal.js` | Modal crear/editar comunicación desde el case. |
| `direccion-estructurada.js` | Armado UI y valor computado de dirección estructurada. |
| `excel-alcaldia-onlyoffice-access.js` | Reglas de acceso al documento Excel oficial. |
| `excel-alcaldia-sticky-header.js` | Header sticky del visor Excel HTML. |
| `excel-alcaldia-viewer-loader.js` | Carga preview Excel vía API. |
| `formato-acta-visita-access.js` | Permiso descarga formato desde entidad ActaVisita. |
| `formato-acta-visita-case-access.js` | Permiso descarga acta desde Case. |
| `formato-actuo-archivo-access.js` | Permiso descarga formato desde entidad ActuoArchivo. |
| `formato-actuo-archivo-case-access.js` | Quién gestiona/descarga auto desde Case (Inspección + estados ready). |
| `formato-solicitud-access.js` | Quién descarga formato de solicitud. |
| `inspeccion-case-flow.js` | Flujo Inspección: oculta asignación; radicado read-only. |
| `nit-input.js` | Normalización/validación NIT 900.123.456-7. |
| `numeric-input.js` | Solo dígitos en teléfonos/números de vía. |
| `party-document-lookup.js` | Lookup por documento (API buscarParte) y autollenado. |
| `patrullero-acta.js` | Reglas patrullero: uso de herramientas de acta, post-radicado. |
| `persona-tipo-fields.js` | Natural/jurídica/desconocido; etiquetas y visibilidad campos. |
| `radicacion-case-flow.js` | Modo radicar: solo campos radicado/expediente. |
| `radicacion-fields.js` | Detección de roles/perfil alcaldía y campos radicado. |
| `radicado-catalog.js` | Prefijo ENV, modos automático/manual, siglas. |
| `safe-ui-promise.js` | Absorb/reRender seguro de vistas sin promesas ruinosas. |
| `silent-ajax.js` | GET AJAX silencioso (403 → null, sin toast). |
| `team-member-cards.js` | HTML de tarjetas de miembros de equipo. |

---

*Ver también la guía principal: [`../GUIA-HANDOFF-PROYECTO.md`](../GUIA-HANDOFF-PROYECTO.md).*
