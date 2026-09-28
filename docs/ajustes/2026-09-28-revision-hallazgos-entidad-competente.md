# Ajuste: "Entidad competente" solo se habilita con "Remisión por competencia"

| Campo | Detalle |
|---|---|
| Fecha | 2026-09-28 |
| Estado | Validado localmente |
| Responsable | Claude Code (sesión con Jonathan Ochoa) |
| Áreas o roles impactados | Quien revisa hallazgos: Admin, Director Técnico, Inspección, Apoyo Jurídico (permisos sin cambios por decisión del usuario) |
| Versión de despliegue | local (Docker, no desplegado a Dokploy) |

## Objetivo

En "Revisión técnico-jurídica" (tarjeta de la visita), el campo "Entidad competente" solo debe activarse al elegir "Remisión por competencia" en "Definición de trámite".

## Cambio

| Acción | Ruta | Propósito |
|---|---|---|
| Modificado | `espocrm-custom/files/client/custom/src/views/case/fields/decision-juridica.js` | Con otra opción, el campo queda deshabilitado, vacío y con el texto "Solo aplica para remisión por competencia". Con "Remisión por competencia" se habilita. |
| Modificado | `espocrm-custom/files/client/custom/res/css/33-case-asignacion.css` | Estilo del campo deshabilitado. |
| Modificado | `espocrm-custom/Controllers/CaseObj.php` (`guardarDefinicionTramite`) | Solo guarda `cEntidadRemision` en el caso cuando la decisión es remisión. Antes, cualquier otra decisión la sobrescribía con vacío y borraba la entidad registrada en la revisión de competencia (Parcial). En el acta queda la entidad solo si es remisión. |

## Validación

Playwright como `admin` en `RAD-P-002`, sin guardar:

| Selección | Entidad competente |
|---|---|
| (vacía) | deshabilitada, "Solo aplica para remisión por competencia" |
| Remisión por competencia | habilitada |
| Cierre de atención (tras escribir "Corantioquia") | deshabilitada y vaciada |

## Corrección (mismo día): error al guardar sin motivación

**Reporte:** al pulsar "Guardar definición de trámite" con "Visita complementaria" y sin motivación, apareció el aviso "Bad request · Seleccione la definiciÃ³n de trÃ¡mite e indique la motivaciÃ³n de la revisiÃ³n."

**Causas:**
1. No había validación en el navegador: el error solo llegaba desde el servidor (400).
2. El servidor envía el motivo en la cabecera `X-Status-Reason` en UTF-8 y el navegador lo lee como Latin-1. Esto afectaba a **todos** los mensajes de error con tildes del CRM.
3. Se mostraba el título técnico de EspoCRM ("Bad request").

**Cambio:**

| Acción | Ruta | Propósito |
|---|---|---|
| Modificado | `espocrm-custom/files/client/custom/src/views/case/fields/decision-juridica.js` | Antes de enviar, valida la definición, la motivación y (si es remisión) la entidad. Marca el campo en rojo, le da el foco y explica qué falta, sin llamar al servidor. |
| Modificado | `espocrm-custom/files/client/custom/src/loader/ui-toasts.js` | Repara el texto mal decodificado en todos los avisos. Los títulos técnicos se muestran en español ("Revise la información", "Sin permiso", "No encontrado", "Ocurrió un error"). |
| Modificado | `espocrm-custom/files/client/custom/res/css/33-case-asignacion.css` | Estilo del campo con error. |

**Validación (Playwright, `asignacion`, `RAD-P-002`, sin guardar):**
- "Visita complementaria" sin motivación → aviso "Escriba la motivación de la revisión…", campo en rojo y 0 peticiones al servidor.
- Error forzado del servidor → "Revise la información · Seleccione la definición de trámite e indique la motivación de la revisión." (tildes correctas).

## Despliegue y reversión

Local: `docker cp`, `clear-cache` y `update-app-timestamp`. Reversión: revertir el commit.
