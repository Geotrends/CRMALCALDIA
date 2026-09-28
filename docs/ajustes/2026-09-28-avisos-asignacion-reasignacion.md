# Ajuste: Avisos de asignación y reasignación (B3)

| Campo | Detalle |
|---|---|
| Fecha | 2026-09-28 |
| Estado | Validado localmente |
| Responsable | Claude Code (sesión con Jonathan Ochoa) |
| Áreas o roles impactados | Responsable asignado, responsable anterior, Inspección, Administrador |
| Versión de despliegue | local (Docker, no desplegado a Dokploy) |

## Objetivo

Paso B3 de [`FLUJOS-Y-NOTIFICACIONES-POR-CAMINO.md`](../FLUJOS-Y-NOTIFICACIONES-POR-CAMINO.md). Decisiones del usuario: al asignar se avisa al **responsable asignado** y al **Admin**; **Inspección recibe copia**; en una **reasignación se avisa también al responsable anterior**.

## Destinatarios

| Evento | Destinatario | Texto en la campanita |
|---|---|---|
| Asignación | Nuevo responsable | "X te asignó el caso …" |
| Asignación | Inspección + Admin | "X asignó el caso … a Y" |
| Reasignación | Nuevo responsable | "X te reasignó el caso …. Motivo: …" |
| Reasignación | Responsable anterior | "X reasignó el caso … a B; ya no está a tu cargo. Motivo: …" |
| Reasignación | Inspección + Admin | "X reasignó el caso … de A a B. Motivo: …" |

Nunca se avisa a quien hace la asignación. Si un observador (Inspección o Admin) es a la vez el responsable nuevo o el anterior, recibe solo el aviso personal.

## Causa de lo que había

`Hooks/CaseObj/NotifyPatrulleroAssignment.php`:
- Solo se disparaba si quien asignaba tenía perfil Asignador.
- Buscaba Inspección solo por los nombres viejos del rol.
- Guardaba con `skipAll` (avisos sin fecha).
- No avisaba al responsable anterior.
- La clave de duplicados era fija por caso durante 5 minutos, así que una segunda reasignación seguida perdía su aviso.

## Cambio

| Acción | Ruta | Propósito |
|---|---|---|
| Reescrito | `espocrm-custom/Hooks/CaseObj/NotifyPatrulleroAssignment.php` | Destinatarios según la tabla. Se dispara con cualquier usuario que asigne un caso radicado. Clave de duplicados por transición (`case.assigned.<destinatario>:<anterior>><nuevo>`). Guarda con fecha. Incluye en los datos `isReasignacion`, el responsable anterior y el motivo. |
| Modificado | `espocrm-custom/files/client/custom/src/helpers/alcaldia-notification-message.js` | Textos de asignación / reasignación / "ya no está a tu cargo" con el motivo. Los nombres de usuario se recortan (algunos traían un espacio final). |

## Validación

El Director confirma la competencia, asigna a `patrullaje` y reasigna a `profesional` con el motivo "Requiere medición técnica".

| Usuario | Avisos |
|---|---|
| `patrullaje` | "te asignó el caso" y, tras la reasignación, "reasignó el caso … a Profesional Universitario; ya no está a tu cargo. Motivo: Requiere medición técnica" |
| `profesional` | "te reasignó el caso …. Motivo: Requiere medición técnica" |
| `inspeccion` | "asignó el caso … a Patrullero Ambiental" y "reasignó el caso … de Patrullero Ambiental a Profesional Universitario. Motivo: …" |
| `admin` | Los mismos dos avisos que Inspección |
| `asignacion` (quien asignó) | Ninguno de estos avisos |

Todos con fecha. Caso de prueba eliminado.

**Nota de pruebas:** al borrar casos de prueba, EspoCRM envía un aviso nativo "ha eliminado: caso …" a sus seguidores. Se eliminaron esos avisos para los casos "PRUEBA…" de esta sesión.

## Despliegue y reversión

Local: `docker cp` del hook y del helper de mensajes, `clear-cache` y `update-app-timestamp`. En Dokploy lo hace `deploy-custom-dokploy.sh`. Reversión: revertir el commit.
