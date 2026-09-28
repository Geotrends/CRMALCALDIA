# Ajuste: Nombre y rol del usuario en la barra superior

| Campo | Detalle |
|---|---|
| Fecha | 2026-09-28 |
| Estado | Validado localmente |
| Responsable | Claude Code (sesión con Jonathan Ochoa) |
| Áreas o roles impactados | Todos los usuarios |
| Versión de despliegue | local (Docker, no desplegado a Dokploy) |

## Objetivo

Mostrar en todas las pantallas, a la izquierda del buscador, el nombre y el rol del usuario conectado.

## Cambio

| Acción | Ruta | Propósito |
|---|---|---|
| Creado | `espocrm-custom/files/client/custom/src/views/site/navbar/user-identity.js` | Vista de la barra con el nombre (en negrita) y los roles debajo, unidos con " · ". Enlaza al perfil del usuario (`#User/view/<id>`). Los roles salen de `RadicacionFields.ensureProfile()` (`Case/action/alcaldiaProfile`, ya cacheado en sesión). Un admin sin roles aparece como "Administrador". |
| Modificado | `espocrm-custom/Resources/metadata/app/clientNavbar.json` | Nuevo elemento `userIdentity` con `order: 1`, antes del buscador (`globalSearch`, order 5). |
| Creado | `espocrm-custom/files/client/custom/res/css/34-navbar-user-identity.css` | Estilos: texto alineado a la derecha, recorte con puntos suspensivos y ancho máximo de 260 px. Sobrescribe el estilo de botón circular de 38 px que el tema aplica a cada `li > a` de la barra. |
| Modificado | `espocrm-custom/Resources/metadata/app/client.json` | Registra el CSS nuevo (con versión `?r=`). |

## Validación (Playwright)

| Usuario | Se muestra |
|---|---|
| `admin` | Administrador · Administrador |
| `radicacion` | Auxiliar Administrativo · Radicador |
| `asignacion` | Director Técnico |
| `patrullaje` | Patrullero Ambiental |
| `bienestaranimal` | Dirección de Bienestar Animal |

Sin errores en consola. En los usuarios de prueba el nombre coincide con el rol porque así se crearon. Con personas reales se verá el nombre de la persona y debajo su rol.

## Limitaciones

- Oculto en pantallas de móvil (`hidden-xs`) para no desbordar la barra.
- Si un rol no tuviera acceso a `Case/action/alcaldiaProfile`, se usa el perfil de respaldo y podría mostrarse sin rol.

## Despliegue y reversión

Local: `docker cp` de los archivos, `rebuild`, `clear-cache` y `update-app-timestamp`. En Dokploy lo hace `deploy-custom-dokploy.sh`. Reversión: revertir el commit.
