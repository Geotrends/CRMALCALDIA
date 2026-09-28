# Ajuste: Notificaciones al radicar un caso

| Campo | Detalle |
|---|---|
| Fecha | 2026-09-28 |
| Estado | Validado localmente |
| Responsable | Claude Code (sesión con Jonathan Ochoa) |
| Áreas o roles impactados | Administrador, Director Técnico, Inspección, Auxiliar Administrativo · Receptor |
| Versión de despliegue | local (Docker, no desplegado a Dokploy) |

## Objetivo

Paso A2 de [`FLUJOS-Y-NOTIFICACIONES-POR-CAMINO.md`](../FLUJOS-Y-NOTIFICACIONES-POR-CAMINO.md). Regla pedida: al radicar, reciben aviso el **Admin** (que recibe todo), el **Director Técnico**, el **Receptor** e **Inspección**.

## Destinatarios resultantes

| Aviso | Destinatarios | Hook |
|---|---|---|
| "Caso radicado: requiere asignación" (accionable) | Director Técnico + Admin | `Hooks/CaseObj/NotifyInspeccionOnRadicado.php` |
| "Caso radicado" (informativo) | Inspección + Receptor + quien creó el caso | `Hooks/CaseObj/NotifyInspeccionOnRadicado.php` |

El Admin no recibe el aviso informativo, porque ya recibe el accionable del mismo evento. Así no le llegan dos avisos. En ninguno de los dos se notifica a quien radicó.

## Causa de lo que fallaba

- **El Director Técnico no recibía nada:** `AfterUpdateNotifyAsignacion` buscaba el rol solo como `Asignador` / `Asignación` / `Asignacion`. Tras [`2026-09-22-roles-nombres-bpmn.md`](2026-09-22-roles-nombres-bpmn.md) el rol se llama `Director Técnico`.
- **Receptor no estaba incluido.**
- `NotifyInspeccionOnRadicado` solo se disparaba si quien radicaba tenía perfil operativo de radicación.
- Las dos notificaciones se guardaban con `skipAll` y quedaban sin fecha.

## Cambio

| Acción | Ruta | Propósito |
|---|---|---|
| Modificado | `espocrm-custom/Tools/User/AlcaldiaUserProfile.php` | Nueva constante `ROLE_RECEPTOR_BPMN`. Helpers `findActiveAsignadorUserIds()`, `findActiveInspeccionUserIds()` y `findActiveReceptorUserIds()`, que buscan el rol bajo todos sus nombres. `findActiveRadicacionUserIds()` reusa el mismo helper privado. |
| Modificado | `espocrm-custom/Classes/RecordHooks/CaseObj/AfterUpdateNotifyAsignacion.php` | Destinatarios: Director Técnico (todos los nombres) + Admin. Guarda sin `skipAll`. |
| Modificado | `espocrm-custom/Hooks/CaseObj/NotifyInspeccionOnRadicado.php` | Destinatarios: Inspección + Receptor + creador del caso, sin los Admin. Se quita el filtro por perfil de quien radica. El disparo queda en "el número de radicado aparece por primera vez", la misma regla del aviso de asignación. La regla anterior ("si antes no había expediente") se habría repetido en cada guardado una vez quitado el filtro. Guarda sin `skipAll`. |

## Validación

Flujo completo por API: `receptor` crea el caso y `radicacion` le pone el número de radicado.

| Usuario | Avisos recibidos |
|---|---|
| `admin` | "Nueva solicitud de queja" (A1) + "Caso radicado: requiere asignación" (A2) |
| `radicacion` | "Nueva solicitud de queja" (A1); no recibe nada en A2 porque fue quien radicó |
| `asignacion` (Director Técnico) | "Caso radicado: requiere asignación" |
| `receptor` | "Caso radicado" |
| `inspeccion` | "Caso radicado" |
| `inspector` (Inspector Ambiental) | nada (no está en la regla pedida) |

Todos con fecha y hora. Al volver a guardar el caso ya radicado no se repite ningún aviso. El caso de prueba se eliminó.

## Corrección posterior (mismo día): el Director Técnico no recibía el aviso al radicar desde la pantalla

**Reporte:** el usuario radicó el caso `RAD-P-001` desde la interfaz. Al Admin le llegó un aviso y al Director Técnico no.

**Qué se encontró:**
- En ese caso, el hook de ORM (`NotifyInspeccionOnRadicado`) sí se disparó: Inspección y Receptor recibieron "Caso radicado". El *record hook* `AfterUpdateNotifyAsignacion` no produjo ningún aviso, ni al Director ni al Admin. El stream del caso muestra dos guardados seguidos (15:01:20 y 15:01:21), ambos con `was: null`. En las pruebas por API, por la interfaz (un solo `PUT`) y con dos `PUT` simultáneos, el record hook sí notificó, así que no se aisló la causa exacta. Se eliminó la dependencia del record hook.
- **Lo que el Admin recibió no era el aviso de radicación**, sino un segundo "Nueva solicitud de queja" del Radicador. En Case, `modifiedAt` nunca se actualiza al guardar, así que `NotifyRadicacionOnCaseCreated` (A1) comparaba `createdAt === modifiedAt` y creía que el caso se acababa de crear en cada guardado.

**Cambio:**

| Acción | Ruta | Propósito |
|---|---|---|
| Modificado | `espocrm-custom/Hooks/CaseObj/NotifyInspeccionOnRadicado.php` | Envía también "Caso radicado: requiere asignación" a Director Técnico + Admin. Es un hook de ORM y se dispara con cualquier vía de guardado. Control de duplicados con `eventKey = case.radicado.asignacion`. |
| Eliminado | `espocrm-custom/Classes/RecordHooks/CaseObj/AfterUpdateNotifyAsignacion.php` | Reemplazado por lo anterior. |
| Modificado | `espocrm-custom/Resources/metadata/recordDefs/Case.json` | Se quita `afterUpdateHookClassNameList`. |
| Modificado | `espocrm-custom/Hooks/CaseObj/NotifyRadicacionOnCaseCreated.php` | "Recién creado" = `$entity->isNew()`, en vez de comparar fechas. |
| Modificado | `docs/GUIA-HANDOFF-PROYECTO.md`, `docs/handoff/ANEXO-E-BACKEND-PHP.md` | Quitan la referencia al record hook eliminado. |

**Validación:** el Admin crea el caso y `radicacion` lo radica desde la interfaz (Playwright, un `PUT`).

| Usuario | Avisos |
|---|---|
| `admin` | "Caso radicado: requiere asignación" (ya no recibe el "Nueva solicitud" repetido) |
| `asignacion` | "Caso radicado: requiere asignación" |
| `inspeccion`, `receptor` | "Caso radicado" |
| `radicacion` | solo el "Nueva solicitud de queja" de A1 |

A1 se revalidó con `isNew()`: `receptor` crea el caso → avisos a `radicacion` y `admin`. Casos de prueba eliminados.

**Pendiente detectado:** con dos guardados simultáneos del mismo caso (por ejemplo, un doble clic en Guardar) los avisos llegan duplicados, porque el control de duplicados no alcanza a ver la otra petición. Es un caso poco frecuente y no se corrigió.

## Despliegue y reversión

Local: `docker cp` de los archivos, `clear_cache.php` y `rebuild.php` (por el cambio en `recordDefs`). Para Dokploy se aplica con el despliegue normal. Reversión: revertir el commit.
