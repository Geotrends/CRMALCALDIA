# Ajuste: Formulario de Acta de visita en dos columnas y sin contenedor duplicado

| Campo | Detalle |
|---|---|
| Fecha | 2026-09-28 |
| Estado | Validado localmente |
| Responsable | Claude Code (sesión con Jonathan Ochoa) |
| Áreas o roles impactados | Patrullero / responsable técnico (crear y ver el acta) |
| Versión de despliegue | local (Docker, no desplegado a Dokploy) |

## Objetivo

"Crear acta de visita" debe tener contenedores como los de Casos y campos en dos columnas, para que sean más compactos.

## Qué había

- Todas las filas del layout eran de un solo campo a lo ancho (`fullWidth`), incluso los cortos (teléfono, barrio, cédulas…).
- Arriba aparecía el panel lateral estándar de EspoCRM ("Funcionario que realizó la visita" + "Equipos"), sin título y duplicando el Funcionario de "Información general".

## Cambio

| Acción | Ruta | Propósito |
|---|---|---|
| Modificado | `espocrm-custom/Resources/layouts/ActaVisita/edit.json`, `detail.json` | Pares de campos: Funcionario y Fecha de la visita; Caso y Radicado; Estado y Modo de diligenciamiento; Expediente y Fecha; Posible afectante y Teléfono; Dirección y Barrio; Zona; Nombre y C.C. del funcionario; Cargo; Nombre y C.C. del establecimiento; Cargo; Fecha de revisión. A lo ancho: autorización de datos, adjuntos y textos largos. Se conservan las secciones, sus nombres y los `readOnly`. |
| Modificado | `espocrm-custom/Resources/metadata/clientDefs/ActaVisita.json` | `defaultSidePanelDisabled: true`: quita el contenedor duplicado. El Funcionario sigue en "Información general". |

## Validación

Playwright como `patrullaje` en `RAD-P-002` → "CARGAR ACTAS DE VISITA": el modal abre directo en "Información general", con los campos en dos columnas y sin el contenedor duplicado.

## Ampliación (mismo día): resumen en el encabezado de cada sección y funcionario precargado

Igual que en las secciones del Caso, cada sección del acta muestra un resumen a la derecha del título, que se actualiza al editar:

| Sección | Resumen |
|---|---|
| Información general | Fecha de la visita · Funcionario · Modo de diligenciamiento |
| Formato diligenciado a mano | "N archivo(s) cargado(s)" o "Sin acta escaneada" |
| Datos y resultados de la visita | Posible afectante · Barrio · N foto(s) |

Además, el "Funcionario que realizó la visita" viene precargado con el usuario que abre el formulario (antes se completaba solo al guardar y el campo aparecía vacío). Se puede cambiar.

| Acción | Ruta | Propósito |
|---|---|---|
| Creado | `espocrm-custom/files/client/custom/src/helpers/acta-visita-section-summary.js` | Arma y actualiza el resumen de cada sección. |
| Modificado | `espocrm-custom/files/client/custom/src/views/modals/acta-visita.js`, `src/views/acta-visita/record/edit.js`, `src/views/acta-visita/record/detail.js` | Agregan el resumen al plegar las secciones. El modal precarga el funcionario. |
| Creado | `espocrm-custom/files/client/custom/res/css/35-acta-visita-summary.css` (+ `client.json`) | Estilo del resumen (el mismo del Caso). |

Validación (Playwright, `patrullaje`, modal "Crear acta de visita" de `RAD-P-002`): resúmenes "28.09.2026 · Patrullero Ambiental · Digital", "Sin acta escaneada" y "Bartolomé · El Dorado". Al cambiar el posible afectante pasa a "Discoteca El Ruido · El Dorado". El funcionario aparece precargado. No se guardó ningún acta.

## Efectos y pendientes

- El campo "Equipos" (teams) del acta ya no se muestra, porque solo estaba en el panel lateral quitado. Si se usa, se puede agregar al layout.
- **Detectado, no corregido:** la dirección armada automáticamente incluye el texto del marcador, p. ej. "CL 86 A Seleccione una opción # 50 Seleccione una opción…". Se ve también en el resumen de "2. Dirección del peticionario" del caso. Viene del armado de la dirección estructurada cuando algún componente queda en "Seleccione una opción".

## Despliegue y reversión

Local: `docker cp`, `clear-cache` y `update-app-timestamp`. Reversión: revertir el commit.
