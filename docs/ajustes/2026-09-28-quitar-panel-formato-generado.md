# Ajuste: Se quita el panel «Formato generado» del caso

| Campo | Detalle |
|---|---|
| Fecha | 2026-09-28 |
| Estado | Validado localmente |
| Responsable | Claude Code (sesión con Jonathan Ochoa) |
| Áreas o roles impactados | Todos los perfiles |
| Versión de despliegue | local (Docker, no desplegado a Dokploy) |

## Objetivo

Pedido del usuario: "quita formato generado de todos los perfiles".

## Cambio

- **Diseño del caso:** se retira el panel **"Formato generado"** (campo `cFormatoSolicitudPdf` con la vista `formato-generado-docs`) de `Resources/layouts/Case/detail.json`. Antes solo Patrullaje lo tenía oculto; ahora no aparece a ningún perfil.
- **Cliente:** en `case-detail-side-panels.js`, lo que ocultaba el panel para Patrullaje ahora lo elimina si llegara a existir.
- **Qué se conserva:** los formatos siguen generándose y descargándose desde su paso (Auto de Inicio, citación, resolución IV-F-117, notificaciones, Auto de Archivo). El campo y la vista se conservan por si se vuelven a necesitar.

## Validación

- Como Admin, Jurídica y Radicador, el detalle de un caso ya no muestra "Formato generado".

## Reversión

Volver a agregar la fila `formatoGenerado` al diseño `Case/detail.json`.
