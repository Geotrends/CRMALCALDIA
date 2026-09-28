# Ajuste: Notificar al Radicador cuando cualquier usuario crea un caso

| Campo | Detalle |
|---|---|
| Fecha | 2026-09-28 |
| Estado | Validado localmente |
| Responsable | Claude Code (sesión con Jonathan Ochoa) |
| Áreas o roles impactados | Auxiliar Administrativo · Radicador |
| Versión de despliegue | local (Docker, no desplegado a Dokploy) |

## Objetivo

Paso A1 de [`FLUJOS-Y-NOTIFICACIONES-POR-CAMINO.md`](../FLUJOS-Y-NOTIFICACIONES-POR-CAMINO.md). Al crear un caso como Administrador, al Radicador no le llegaba nada a la campanita. Regla pedida: **cualquier usuario que pueda crear un caso** genera un aviso para el Radicador.

## Causa

`Hooks/CaseObj/NotifyRadicacionOnCaseCreated.php` tenía tres problemas:
1. Solo notificaba si quien creaba era admin o tenía el rol Inspección.
2. Buscaba el rol por los nombres viejos (`Radicación` / `Radicacion`). Desde [`2026-09-22-roles-nombres-bpmn.md`](2026-09-22-roles-nombres-bpmn.md), el rol se llama `Auxiliar Administrativo · Radicador`, así que no encontraba a ningún usuario.
3. Guardaba la notificación con `skipAll`. Por eso quedaba sin `createdAt` (sin fecha en la campanita) y se saltaba los hooks nativos de Notification.

## Cambio

| Acción | Ruta | Propósito |
|---|---|---|
| Modificado | `espocrm-custom/Tools/User/AlcaldiaUserProfile.php` | Nuevo `findActiveRadicacionUserIds()`, que busca el rol bajo todos sus nombres (`NAMES_RADICACION`). |
| Modificado | `espocrm-custom/Hooks/CaseObj/NotifyRadicacionOnCaseCreated.php` | Quita el filtro por rol del creador, usa el helper nuevo y guarda la notificación sin `skipAll`. |

Se mantiene: no se notifica al propio creador, se sigue avisando también a las cuentas admin, y el control de duplicados se conserva.

## Validación

| Escenario | Resultado |
|---|---|
| `receptor` crea un caso → `radicacion` recibe "Nueva solicitud de queja" | Correcto (antes no llegaba) |
| `inspeccion` crea un caso → `radicacion` recibe el aviso con fecha y hora | Correcto |
| `juridica` / `asignacion` intentan crear un caso | 403 por ACL (no tienen permiso de crear casos; sin cambios) |
| Casos de prueba | Eliminados |

## Pendiente detectado (no corregido aquí)

- Otros 7 notifiers guardan con `skipAll` y tampoco llevan fecha: `CaseVisitaAprobadaNotifier`, `AfterUpdateNotifyAsignacion`, `NotifyInspeccionOnActaDiligenciada`, `NotifyAsignadorYJuridicaOnDiligenciada`, `NotifyInspeccionOnRadicado`, `NotifyPatrulleroAssignment` y `SuppressNativeCaseNotifications` (este último elimina notificaciones, así que puede no aplicar). Se revisan al probar cada paso.
- Varios notifiers buscan los roles de Asignador y Jurídica solo por sus nombres viejos (sin `Director Técnico` / `Apoyo Jurídico`): el mismo problema que aquí. Se corrigen al probar B3 y E3.

## Despliegue y reversión

Local: `docker cp` de los 2 archivos al contenedor y `clear_cache.php`. Para Dokploy se aplica con el despliegue normal. Reversión: revertir el commit.
