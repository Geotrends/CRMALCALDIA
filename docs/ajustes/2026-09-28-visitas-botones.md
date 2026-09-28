# Ajuste: Botones del panel Visitas

| Campo | Detalle |
|---|---|
| Fecha | 2026-09-28 |
| Estado | Validado localmente |
| Responsable | Claude Code (sesión con Jonathan Ochoa) |
| Áreas o roles impactados | Patrullero / responsable técnico (panel Visitas del caso) |
| Versión de despliegue | local (Docker, no desplegado a Dokploy) |

## Objetivo

Pedido del usuario para el panel "Visitas":
- "Descargar Word prellenado" pasa a ser **"Descargar Documento para visita"**.
- "Cargar actas de visita" pasa a ser **"CARGAR ACTAS DE VISITA"**, en otro color.

## Cambio

| Acción | Ruta | Propósito |
|---|---|---|
| Modificado | `espocrm-custom/Resources/i18n/es_ES/Case.json` | Etiquetas `descargarActaVisitaWord` y `llenarActaVisitaDigital`. La ayuda `actaVisitaManualHelp` ya no menciona el "Word prellenado". |
| Modificado | `espocrm-custom/files/client/custom/res/templates/case/fields/acta-visita-action.tpl` | Clase `case-acta-cargar-btn` e ícono de subir archivo en lugar del portátil. |
| Modificado | `espocrm-custom/files/client/custom/res/css/33-case-asignacion.css` | El botón usa el verde institucional del menú (`--crm-primary`, `#3b615d` en el tema), con texto y ícono blancos. Selector más específico que la regla dorada de `.btn-primary` en `27-post-login-reference.css`. |

## Validación

Playwright como `patrullaje` en `RAD-P-002`: el panel muestra "Descargar Documento para visita", la ayuda actualizada y "CARGAR ACTAS DE VISITA" en verde institucional con ícono de subir archivo.

## Despliegue y reversión

Local: `docker cp`, `clear-cache` y `update-app-timestamp`. Reversión: revertir el commit.
