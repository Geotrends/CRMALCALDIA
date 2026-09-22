# Ajuste: Destino, Relación de casos, menú y acción "Relacionar con otro caso"

| Campo | Detalle |
|---|---|
| Fecha | 2026-09-22 |
| Estado | Validado localmente |
| Responsable | Claude Code (sesión con Jonathan Ochoa) |
| Áreas o roles impactados | Todos los roles operativos (navegación); Inspección/Radicación principalmente para el uso funcional |
| Versión de despliegue | local (Docker, no desplegado a Dokploy) |

## Objetivo

Completar el núcleo del modelo funcional (después de GestionTecnica/DecisionRutaJuridica) agregando `Destino` (sujeto/lugar reportado) y `RelacionCasos` (agrupación operativa de casos relacionados, sin fusionarlos ni crear efecto jurídico), y dar una UI real para navegar el Expediente vinculado a un caso — hasta ahora solo existía como texto informativo.

## Alcance funcional

- Campo `destino` (link) en `Case`, para asociar el caso a un establecimiento/persona/inmueble/lugar/actividad/fuente ya registrado o crear uno nuevo desde el mismo formulario.
- Entidad `RelacionCasos` con tipo (mismo hecho, misma fuente, misma ubicación, continuación, reincidencia, posible duplicado) y estado (activa, en seguimiento, resuelta, histórica, descartada).
- Acción **"Relacionar con otro caso"** en el detalle del Case: el usuario busca directamente otro caso ya radicado y el sistema crea (o reutiliza) el registro `RelacionCasos` que los agrupa, abriendo de inmediato su formulario para completar tipo/observaciones. Se agregó después de una aclaración con el usuario: el diseño inicial (campo `linkMultiple` apuntando a `RelacionCasos`) no calzaba con el flujo mental real de "estoy en el caso A, busco el caso B, digo que son similares".
- Panel de Expediente en el detalle del Case ahora muestra un link navegable al expediente vinculado, no solo un texto de estado.
- `Relación de casos` y `Expediente` agregados al menú lateral (antes solo se llegaba a Expediente indirectamente).

## Diseño y decisión técnica

- `Destino`: entidad simple, reutiliza el mismo catálogo de barrios que ya existe en `Case`.
- `RelacionCasos.casos`: relación N:M nativa de EspoCRM (`hasMany` en ambos lados vía `relationName: caseRelacionCasos`), no se modeló como entidad de relación con atributos propios (el modelo objetivo lo permite pero no se necesitó para esta fase).
- Acción `Case/action/relacionarConCaso` (backend, `Controllers/CaseObj.php`): valida que los dos casos existan y sean distintos, busca si ya existe una `RelacionCasos` que contenga a ambos (recorriendo las relaciones existentes del caso origen) para no duplicar, y si no existe la crea con nombre autogenerado a partir de los radicados.
- Frontend: botón que abre el buscador nativo de EspoCRM (`views/modals/select-records`) filtrado a `Case` excluyendo el caso actual; al seleccionar, llama la acción del backend y abre el modal de edición estándar de `RelacionCasos` (`views/modals/edit`) para que el usuario complete tipo/observaciones en el mismo flujo.
- Panel de Expediente: se usa el atributo `expedienteName` que EspoCRM ya provee automáticamente para todo campo `link`/belongsTo, sin necesitar una consulta adicional.
- Menú: este proyecto define el `tabList` global mediante un script (`scripts/configure-full-access-all-roles.php`) que se corre en cada deploy, no mediante la configuración de metadata `app/client.json`. Se agregaron `RelacionCasos` y `Expediente` ahí, y se cambió `"tab": false` a `"tab": true` en sus `scopes/*.json` (ese flag sí es respetado en tiempo de ejecución por el navbar, no solo por el editor de tabs del admin).

## Archivos afectados

| Acción | Ruta | Propósito |
|---|---|---|
| Creado | `Resources/metadata/entityDefs/Destino.json`, `RelacionCasos.json` | Definición de entidades |
| Creado | `Entities/Destino.php`, `RelacionCasos.php` | Clases ORM |
| Creado | `Controllers/Destino.php`, `Controllers/RelacionCasos.php` | Controllers mínimos (requeridos, ver ajuste de Fase 1) |
| Creado | `Resources/metadata/scopes/*`, `clientDefs/*`, `layouts/Destino/*`, `layouts/RelacionCasos/*`, `i18n/es_ES/Destino.json`, `i18n/es_ES/RelacionCasos.json` | Soporte estándar EspoCRM |
| Modificado | `Resources/metadata/entityDefs/Case.json` | Links `destino`, `relacionesCasos`; campo virtual `cPanelRelacionCasos` |
| Modificado | `Resources/layouts/Case/detail.json`, `edit.json` | Nuevo panel "Destino y relación con otros casos" |
| Nuevo | `Controllers/CaseObj.php` → `postActionRelacionarConCaso` | Crear/reutilizar la relación entre dos casos |
| Nuevo | `files/client/custom/src/views/case/fields/relacion-casos-action.js`, `res/templates/case/fields/relacion-casos-action.tpl` | Botón "Relacionar con otro caso" |
| Modificado | `files/client/custom/src/views/case/fields/expediente-info.js`, `res/templates/case/fields/expediente-info.tpl`, `res/css/30-case-detail-compact.css` | Link navegable al expediente vinculado |
| Modificado | `scripts/configure-full-access-all-roles.php` | ACL de las 4 entidades nuevas de esta sesión; menú lateral (`RelacionCasos`, `Expediente`) |
| Modificado | `Resources/metadata/scopes/Expediente.json`, `RelacionCasos.json` | `"tab": true` para que aparezcan en el menú |
| Modificado | `Resources/i18n/es_ES/Global.json` | Nombres de scope para el menú (`Expediente`, `RelacionCasos`) |

## Riesgos y dependencias

- El mismo bloqueo de "Controller faltante" de la Fase 1 se repitió aquí para `Destino`/`RelacionCasos` — ya está documentado como patrón obligatorio a repetir en cualquier entidad custom nueva.
- La detección de "relación ya existente" recorre en PHP todas las `RelacionCasos` del caso origen y sus casos vinculados; aceptable para el volumen actual, pero si el número de relaciones por caso crece mucho convendría una consulta más directa.

## Validación

| Escenario probado | Resultado | Evidencia u observación |
|---|---|---|
| `GET /api/v1/RelacionCasos`, `/Destino` | Correcto (200) tras agregar los Controllers | Antes devolvían 404 |
| `POST Case/action/relacionarConCaso` entre dos casos reales | Correcto | Crea el registro con nombre autogenerado y ambos casos vinculados |
| Repetir la misma acción con los mismos dos casos | Correcto | Devuelve `alreadyRelated: true`, no duplica |
| Menú lateral muestra "Relación de casos" y "Expediente" | Correcto | Confirmado en `data/config.php` del contenedor (`tabList`) |

## Despliegue y reversión

Desplegado en Docker local. Pendiente desplegar a Dokploy. Reversión: revertir los commits de este ajuste; si ya se crearon registros de `Destino`/`RelacionCasos` en producción, evaluar si deben conservarse antes de revertir el schema.

## Documentación relacionada

| Documento | Acción requerida | Estado |
|---|---|---|
| `docs/GUIA-HANDOFF-PROYECTO.md` | Actualizar (nuevas entidades, nuevo panel del Case) | Pendiente |
| `docs/MANUAL-USUARIO-CRM-AMBIENTAL.md` | Agregar sección de uso de "Relacionar con otro caso" | Pendiente |
