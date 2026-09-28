# Ajuste: Revisión de hallazgos con un solo botón que guarda y ejecuta la definición

| Campo | Detalle |
|---|---|
| Fecha | 2026-09-28 |
| Estado | Validado localmente |
| Responsable | Claude Code (sesión con Jonathan Ochoa) |
| Áreas o roles impactados | Quien revisa hallazgos (Admin, Director Técnico, Inspección, Apoyo Jurídico; permisos sin cambios) |
| Versión de despliegue | local (Docker, no desplegado a Dokploy) |

## Problema

En "Revisión técnico-jurídica" había botones que se solapaban:
- **Guardar definición de trámite:** guardaba la decisión y pasaba el caso a "Revisión de hallazgos", pero no la ejecutaba.
- **Registrar revisión de hallazgos:** solo cambiaba el estado (redundante con lo anterior).
- Después aparecían 4 botones sueltos ("Solicitar visita complementaria", "Cerrar atención", "Remitir por competencia", "Abrir Auto de Inicio"), y nada impedía ejecutar una acción distinta de la definición guardada.

## Comportamiento nuevo

Queda **un solo botón**, deshabilitado hasta elegir la definición, cuyo texto cambia según ella:

| Definición | Botón | Qué hace tras confirmar |
|---|---|---|
| Visita complementaria | Guardar y solicitar visita complementaria | `guardarDefinicionTramite` + `prepararNuevaVisita`: visita N° N, avisos con motivo y alerta de 5 días hábiles |
| Cierre de atención | Guardar y cerrar sin proceso | `guardarDefinicionTramite` + `cerrarSinProceso` → "Proceso cerrado" |
| Remisión por competencia | Guardar y remitir por competencia | `guardarDefinicionTramite` + `remitirPorCompetencia` → "Remitido por competencia" + `RemisionAutoridad` + aviso de oficio |
| Apertura de actuación | Guardar y abrir Auto de Inicio | `guardarDefinicionTramite` y abre el formulario del Auto de Inicio |

Antes de enviar se valida la definición, la motivación y (en remisión) la entidad, marcando el campo en rojo. Luego se pide una confirmación específica de cada acción.

**Mejora de paso:** "Remitir por competencia" después de la visita ahora también crea la `RemisionAutoridad` ("tras revisión de hallazgos", estado Preparación, con la entidad y la motivación) y avisa a Aux. Inspección, Inspección y Admin para preparar el oficio. Antes solo cambiaba el estado. Se reutiliza `CaseCompetenciaService::registrarRemision()`.

## Cambio

| Acción | Ruta | Propósito |
|---|---|---|
| Modificado | `espocrm-custom/files/client/custom/res/templates/case/fields/decision-juridica.tpl` | Un solo botón `ejecutarDefinicion`. Se quitan "Guardar definición de trámite", "Registrar revisión de hallazgos" y los 4 botones sueltos. |
| Modificado | `espocrm-custom/files/client/custom/src/views/case/fields/decision-juridica.js` | Tabla `ACCIONES` (definición → texto, ícono, endpoint, confirmación). `actionEjecutarDefinicion`: valida, confirma, guarda y ejecuta. |
| Modificado | `espocrm-custom/Controllers/CaseObj.php` | `remitirPorCompetencia` registra la remisión. Se recolocó el comentario del método, que había quedado suelto. |
| Modificado | `espocrm-custom/Tools/CaseObj/CaseCompetenciaService.php` | `registrarRemision()` público y origen `Hallazgos`. |
| Modificado | `espocrm-custom/files/client/custom/src/helpers/alcaldia-notification-message.js` | Texto del aviso de remisión tras hallazgos. |

Los endpoints `confirmarVisitaAprobada` y `guardarDefinicionTramite` siguen existiendo en el servidor. El primero ya no se usa desde esta pantalla.

## Validación (Playwright, `asignacion`)

Cuatro casos de prueba con acta diligenciada y firmada adjunta:

| Definición | Botón | Resultado |
|---|---|---|
| (ninguna) | "Seleccione la definición de trámite", deshabilitado | — |
| Visita complementaria | "Guardar y solicitar visita complementaria" | Caso "En gestión técnica" (visita N° 2) |
| Cierre de atención | "Guardar y cerrar sin proceso" | "Proceso cerrado" |
| Remisión (Corantioquia) | "Guardar y remitir por competencia" | "Remitido por competencia"; remisión "tras revisión de hallazgos" a Corantioquia en Preparación; `auxinspeccion` recibe "Remisión por competencia pendiente de oficio" |
| Apertura de actuación | "Guardar y abrir Auto de Inicio" | Se abre el formulario del Auto de Inicio; el caso queda en "Revisión de hallazgos" con la definición guardada |

En ningún caso aparecieron los botones anteriores. Datos de prueba eliminados.

## Despliegue y reversión

Local: `docker cp`, `clear-cache` y `update-app-timestamp`. Reversión: revertir el commit.
