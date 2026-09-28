# Ajuste: El clic en la notificación abre el caso (y no cierra el panel sin navegar)

| Campo | Detalle |
|---|---|
| Fecha | 2026-09-28 |
| Estado | Validado localmente |
| Responsable | Claude Code (sesión con Jonathan Ochoa) |
| Áreas o roles impactados | Todos los roles (panel de notificaciones) |
| Versión de despliegue | local (Docker, no desplegado a Dokploy) |

## Problema reportado

Como Radicador, al hacer clic en "X creó una solicitud de queja", la notificación desaparecía y no llevaba al caso.

## Causa

1. **Carrera al abrir la campanita.** `panel.js → markAllAsRead()` marcaba todo como leído, volvía a pedir la lista (`collection.fetch()`) y la repintaba (`reRender()`). Si el clic caía durante ese repintado, el elemento clicado ya no existía en el DOM. El detector de "clic fuera del panel" (`badge.js`, `mouseup.notification`) no lo encontraba dentro del panel y lo cerraba, y el clic se perdía.
2. Solo la palabra del enlace ("Caso") navegaba; el resto de la tarjeta no hacía nada.
3. El panel solo se cerraba al navegar en pantallas móviles.
4. Al abrir el caso como Radicador, la petición a `VisitaHistorial` responde 403 (el Radicador no tiene acceso a esa entidad). `SilentAjax` ya lo absorbía, pero la promesa interna quedaba rechazada sin capturar y dejaba un error en la consola.

## Cambio

| Acción | Ruta | Propósito |
|---|---|---|
| Modificado | `espocrm-custom/files/client/custom/src/views/notification/panel.js` | `markAllAsRead` ya no vuelve a pedir la lista ni la repinta: solo marca los modelos como leídos. |
| Modificado | `espocrm-custom/files/client/custom/src/views/notification/badge.js` | Ignora clics sobre nodos ya retirados del DOM. Cierra el panel al navegar en todas las pantallas. |
| Modificado | `espocrm-custom/files/client/custom/src/views/notification/items/radicado.js` | Clic en cualquier parte de la tarjeta → abre `data.recordUrl` (o `relatedType/relatedId`). Los enlaces internos (usuario, caso) y el botón de eliminar conservan su comportamiento. |
| Modificado | `espocrm-custom/files/client/custom/res/css/32-notification-actions.css` | Cursor de mano en la tarjeta. Margen derecho para que el texto no quede debajo del ícono de eliminar. |
| Modificado | `espocrm-custom/files/client/custom/src/helpers/silent-ajax.js` | Captura la promesa rechazada (sin error en consola por el 403). |

## Validación (Playwright, usuario `radicacion`)

| Escenario | Resultado |
|---|---|
| Abrir la campanita y hacer clic a los 300 ms en el cuerpo de la tarjeta | Abre `#Case/view/<id>` y el panel se cierra |
| Abrir la campanita y hacer clic a los 300 ms en el enlace del caso | Abre `#Case/view/<id>` y el panel se cierra |
| Errores de página en consola | Ninguno |
| Casos de prueba | Eliminados |

## Pendiente detectado

- Cuando el caso no tiene radicado ni peticionario, la notificación lo nombra solo "Caso". Se podría mostrar el asunto o la fecha de recepción.
- El Radicador no tiene lectura sobre `VisitaHistorial`. No afecta la vista, pero si esa sección debe verse, hay que ajustar el ACL.

## Despliegue y reversión

Local: `docker cp` de los 5 archivos a `/var/www/html/client/custom` y `clear_cache.php`. Los usuarios deben recargar el navegador (Ctrl/Cmd+Shift+R). Reversión: revertir el commit.
