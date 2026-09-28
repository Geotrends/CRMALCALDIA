# Ajuste: Panel de Asignación muestra el responsable actual y el histórico de reasignaciones

| Campo | Detalle |
|---|---|
| Fecha | 2026-09-28 |
| Estado | Validado localmente |
| Responsable | Claude Code (sesión con Jonathan Ochoa) |
| Áreas o roles impactados | Director Técnico y Administrador (ven y reasignan), Inspección (solo lectura) |
| Versión de despliegue | local (Docker, no desplegado a Dokploy) |

## Problema reportado

En el panel "Asignación" del caso, después de asignar solo se veía el botón "Asignar responsable" y "Motivo de reasignación: Ninguno". No se veía a quién quedó asignado el caso. Al reasignar, debe cambiar el responsable visible y quedar el cambio en un histórico.

## Causa

1. `case-detail-side-panels.js → mountAssignmentSidecarLauncher` leía el nombre del responsable de un `<input>` que no existe en modo detalle. Por eso el botón siempre decía "Asignar responsable" y nunca aparecía el nombre.
2. El resumen del encabezado (`compact-form-sections.js`) buscaba el atributo `assignedUser`, pero en EspoCRM el nombre del enlace está en `assignedUserName`. Por eso decía "Sin información registrada".
3. **El histórico no se estaba guardando.** `Hooks/CaseObj/LogAsignacionHistorial.php` solo registraba si el caso tenía radicado **y** expediente. Desde que el Expediente se vincula al abrir la actuación (mucho después de asignar), ninguna asignación quedaba en `AsignacionHistorial`.

## Cambio

| Acción | Ruta | Propósito |
|---|---|---|
| Modificado | `espocrm-custom/Hooks/CaseObj/LogAsignacionHistorial.php` | Registra con solo tener número de radicado. |
| Modificado | `espocrm-custom/files/client/custom/src/helpers/case-detail-side-panels.js` | Tarjeta "Responsable actual" (nombre con enlace, fecha y quién asignó). Botón "Asignar responsable" o "Reasignar responsable" según el caso. "Histórico de asignaciones" (asignación / reasignación, anterior → nuevo, fecha, quién y motivo) leído de `AsignacionHistorial`. Se refresca solo al cambiar `assignedUserId` o al sincronizar el modelo. Oculta la celda suelta "Motivo de reasignación", que ahora se lee en el histórico. |
| Modificado | `espocrm-custom/files/client/custom/src/helpers/compact-form-sections.js` | El resumen del encabezado usa `assignedUserName`. |
| Modificado | `espocrm-custom/files/client/custom/res/css/06-case.css` | Estilos de la tarjeta y la línea de tiempo del histórico. La regla que ocultaba todo menos el botón ahora también respeta la tarjeta. Oculta la celda del motivo. |

La edición no cambia: el botón abre el mismo diálogo de asignación de siempre (`AsignadorAssignmentUi.openAssignmentEditPage`), que exige motivo al reasignar.

## Validación

Caso de prueba: `receptor` lo crea, `radicacion` lo radica, `asignacion` lo asigna a `patrullaje` y luego lo reasigna a `tecnico` con el motivo "El patrullero está en vacaciones".

| Verificación | Resultado |
|---|---|
| `AsignacionHistorial` | 2 registros: "Sin asignar → Patrullero Ambiental" y "Patrullero Ambiental → Técnico Operativo" con su motivo |
| Encabezado del panel | "Técnico Operativo" |
| Tarjeta | Responsable actual "Técnico Operativo", con fecha de asignación y "por Director Técnico" |
| Histórico | Las dos entradas en orden descendente, con el motivo en la reasignación |
| Errores en consola | Ninguno |

Las asignaciones y reasignaciones se hicieron por API. La interfaz se revisó después de recargar. El refresco automático tras reasignar desde el diálogo (listener de `change:assignedUserId` / `sync`) no se probó con el diálogo abierto.

## Limitaciones

- Los casos asignados antes de este ajuste no tienen histórico (nunca se guardó). Para ellos solo se ve el responsable actual.
- La tarjeta y el histórico los ven el Director Técnico, el Admin y el rol Inspección (ver la sección siguiente). Los demás roles siguen viendo el campo estándar de responsable.

## Segunda iteración (mismo día)

**Reporte:** "aún no se actualiza, y sí quiero que lo vean Admin e Inspección". Captura del caso `RAD-P-002`: encabezado "Sin información registrada" y sin tarjeta.

**Qué se encontró:**
- La captura era de un usuario Admin o Inspección. La tarjeta solo se montaba para el Director Técnico.
- En un navegador limpio, el encabezado sí mostraba "Patrullero Ambiental". Lo de la captura era el navegador con la versión anterior en caché.
- `RAD-P-002` se asignó a las 15:15, antes de la corrección del histórico (15:19), y por eso no tiene histórico.
- En el stream de `RAD-P-002`, a las 15:22 el Director "reasignó" y solo cambió el motivo ("Ajuste"): el diálogo de reasignación venía precargado con el responsable actual y dejaba guardar sin elegir a otra persona.

**Cambio:**

| Acción | Ruta | Propósito |
|---|---|---|
| Modificado | `espocrm-custom/files/client/custom/src/helpers/case-detail-side-panels.js` | Admin (con botón de reasignar) e Inspección (solo lectura) ven la misma tarjeta con el histórico (clase `alcaldia-asignacion-card-host`). |
| Modificado | `espocrm-custom/files/client/custom/src/helpers/inspeccion-case-flow.js` | A Inspección ya no se le oculta el panel de Asignación en casos existentes (solo en la creación). |
| Modificado | `espocrm-custom/files/client/custom/src/helpers/asignador-assignment-ui.js` | Al reasignar: muestra "Responsable actual: X", el campo "Nuevo responsable" empieza vacío y bloquea guardar si se elige al mismo responsable. |
| Modificado | `espocrm-custom/files/client/custom/res/css/06-case.css` | Los estilos de la tarjeta ya no dependen del panel del Director. Estilos para el panel de Admin/Inspección y para la línea "Responsable actual" del diálogo. |

**Validación (Playwright):**

| Escenario | Resultado |
|---|---|
| `admin` abre `RAD-P-002` | Tarjeta "Responsable actual: Patrullero Ambiental" + botón "Reasignar responsable" |
| `inspeccion` abre `RAD-P-002` | La misma tarjeta, sin botón |
| `asignacion` reasigna desde el diálogo: elige otro usuario en el selector, escribe el motivo y guarda | `PATCH` con el nuevo `assignedUserId` y el motivo. La tarjeta y el histórico se actualizan solos, sin recargar. |
| Diálogo de reasignación | Campo vacío, con "Responsable actual: …" visible |
| Caso de prueba | Eliminado |

## Tercera iteración (mismo día): el navegador seguía mostrando la versión anterior

**Reporte:** como Director Técnico, en `RAD-P-002` seguía apareciendo "Asignar responsable" y la celda "Motivo de reasignación: Ajuste", aun recargando.

**Causa (caché del navegador, no del código):**
- EspoCRM pide los módulos JS personalizados (`custom:helpers/...`) y los CSS de `client.json` con `?r=<appTimestamp>`, y además los guarda en el Cache Storage del navegador (`espo`).
- `appTimestamp` estaba fijo desde el 2026-09-22. Ni `rebuild` ni `clear-cache` lo cambian (solo cambian `cacheTimestamp`). Por eso un navegador que ya tenía el archivo seguía usando la copia anterior. Los navegadores de prueba (Playwright) partían limpios y no lo reflejaban.
- Los CSS importados con `@import` dentro de `main.css` (como `06-case.css`) se piden **sin** versión y Apache no envía `Cache-Control` (`mod_headers` inactivo).

**Cambio:**

| Acción | Ruta | Propósito |
|---|---|---|
| Modificado | `scripts/deploy-custom-dokploy.sh` | Tras el `rebuild` / `clear-cache` final ejecuta `command.php update-app-timestamp`, para que cada despliegue invalide el JS y CSS del cliente en todos los navegadores. |
| Creado | `espocrm-custom/files/client/custom/res/css/33-case-asignacion.css` | Estilos de la tarjeta, del histórico y del diálogo (se movieron desde `06-case.css`), en un archivo con versión. Incluye una regla que gana a la del `06-case.css` que ocultaba todo menos el botón, incluso si el navegador aún tiene ese archivo viejo. |
| Modificado | `espocrm-custom/Resources/metadata/app/client.json` | Registra `33-case-asignacion.css` en `cssList`. |
| Modificado | `espocrm-custom/files/client/custom/res/css/06-case.css` | Se quitan los bloques movidos. |
| Modificado | `espocrm-custom/files/client/custom/src/helpers/case-detail-side-panels.js` | La celda "Motivo de reasignación" se oculta con estilo en línea `!important` (otra regla del panel forzaba `display: block`). |

Local: se ejecutó `update-app-timestamp` (ahora `?r=1790609857` o posterior). Se verificó que el navegador pide `33-case-asignacion.css?r=…` y `case-detail-side-panels.js?r=…` con la marca nueva, y que como Director en `RAD-P-002` se ve "Responsable actual: Patrullero Ambiental" + "Reasignar responsable", sin la celda del motivo.

**Regla para cambios futuros de frontend:** después de copiar archivos a `client/custom` en local, ejecutar `php command.php update-app-timestamp`. En Dokploy ya lo hace el script de despliegue. Los CSS nuevos van registrados en `client.json`, no como `@import` en `main.css`.

## Cuarta iteración (mismo día): el Administrador no podía guardar asignaciones en algunos casos

**Reporte:** "el administrador debe ver las asignaciones e incluso poder modificarlas".

**Qué se encontró:** el Admin ya veía la tarjeta y el botón, pero al guardar el servidor respondía **400** en casos radicados con datos del peticionario o del perjudicante incompletos ("Seleccione el tipo de peticionario (persona natural o jurídica)"). `Hooks/CaseObj/ValidatePersonaTipoOnSave.php` revalida las partes en **todo** guardado del Admin. Para Radicación, Director Técnico y Patrullero esa validación se omite.

**Cambio:**

| Acción | Ruta | Propósito |
|---|---|---|
| Modificado | `espocrm-custom/Hooks/CaseObj/ValidatePersonaTipoOnSave.php` | Si el Admin solo cambia la asignación (cambia `assignedUserId` y ningún campo de las partes), no se revalidan las partes. Si edita datos del peticionario o del perjudicante, la validación sigue aplicando. |

**Validación:**

| Escenario | Resultado |
|---|---|
| Admin asigna por API un caso radicado con partes incompletas | 200 (antes 400) |
| Admin edita el nombre del peticionario en ese mismo caso | 400 (la validación de partes se conserva) |
| Admin, en la interfaz: reasigna a Profesional y luego a Patrullero desde el diálogo, con motivo | `PATCH` 200 las dos veces. La tarjeta muestra el nuevo responsable "Asignado … por Administrador". El histórico muestra las 3 entradas con sus motivos. |
| Caso de prueba | Eliminado |

## Quinta iteración (mismo día): el Admin no encontraba el panel

**Reporte:** captura del Admin en `RAD-P-002` sin el panel de Asignación a la vista.

**Causa:** para el Director Técnico el panel se mueve arriba de la columna lateral. Para Admin e Inspección se dejaba en su posición por defecto, al fondo de la columna izquierda.

**Cambio:** `case-detail-side-panels.js` ahora mueve el panel al inicio de la columna lateral, antes de "Línea de tiempo", también para Admin e Inspección. Verificado con Playwright en `RAD-P-002` para `admin` e `inspeccion`.

## Despliegue y reversión

Local: `docker cp` del hook y de los 3 archivos de cliente, más `clear_cache.php`. Los usuarios deben recargar con Cmd/Ctrl+Shift+R. Reversión: revertir el commit.
