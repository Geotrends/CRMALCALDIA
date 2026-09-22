# Ajuste: Menú por rol — cada quien ve solo su grupo de proceso

| Campo | Detalle |
|---|---|
| Fecha | 2026-09-22 |
| Estado | Validado localmente |
| Responsable | Claude Code (sesión con Jonathan Ochoa) |
| Áreas o roles impactados | Inspección, Radicación, Asignación, Patrullaje, Jurídica, Secretario de Despacho, Dirección de Bienestar Animal, Auxiliar Administrativo · Inspección |
| Versión de despliegue | local (Docker, no desplegado a Dokploy) |

## Objetivo

Paso 2 de "hacer fácil el acceso a la gente": tras agrupar el menú global por proceso (ajuste anterior), este ajuste hace que **cada rol solo vea los grupos que le corresponden**. Se confirmó con el usuario que EspoCRM oculta automáticamente del menú lateral cualquier tab donde el ACL del rol niegue lectura — por eso la implementación es puramente de ACL, no de `tabList` por rol.

## Alcance funcional

Matriz confirmada con el usuario:

| Rol | Grupos visibles (además de Gestión/Actividades, que ve todo el mundo) |
|---|---|
| Inspección | Gestión Técnica, Seguimiento |
| Radicación (Auxiliar Administrativo · Radicador) | Policía y RNMC (solo `ActuacionRNMC`/`OrdenComparendo`, su lane real del BPMN), Seguimiento |
| Asignación (Director Técnico) | Seguimiento |
| Patrullaje (Patrullero Ambiental) | Gestión Técnica, Policía y RNMC (solo lo ya asignado a su lane: `OrdenPolicia`/`MedidaCorrectiva`/`OrdenComparendo`/`ActuacionPoliciaInmediata`), Seguimiento |
| Jurídica (Apoyo Jurídico) | Proceso Verbal Abreviado, Policía y RNMC, Otras rutas, Seguimiento |
| Inspector Ambiental | Todos los grupos (ya los tenía completos desde bloques anteriores — el rol que decide/firma en cada ruta) |
| Secretario de Despacho | Todos los grupos, en solo lectura (supervisión) |
| Dirección de Bienestar Animal | Otras rutas (Convivencia/Maltrato Animal), Seguimiento |
| Auxiliar Administrativo · Inspección | Proceso Verbal Abreviado (solo `NotificacionActo`/`Recurso`, su función real de "gestiona notificaciones"), Seguimiento |
| Auxiliar Administrativo · Receptor | Sin grupos nuevos (mantiene únicamente su acceso ya existente a `RegistroCaninoManejoEspecial` para RPC02-RPC03, no se le quitó) |

## Diseño y decisión técnica

- **Hallazgo importante durante la implementación**: existen roles legado sin usar en la base de datos (`Radicación`, `Asignación`, `Jurídica`, `Patrullaje`) separados de los roles realmente asignados a los usuarios (`Auxiliar Administrativo · Radicador`, `Director Técnico`, `Apoyo Jurídico`, `Patrullero Ambiental`, respectivamente). El primer intento de este script buscó por esos nombres en el orden equivocado y modificó los roles vacíos sin usar en vez de los reales — se corrigió el orden de búsqueda para que coincida exactamente con el que ya usa cada `roles/configure-role-*.php`, y se verificó con `App/user` real de cada usuario que el ACL efectivo quedó correcto.
- Cinco roles (Inspección, Radicación, Asignación, Patrullaje, Jurídica) reciben "acceso completo" entidad por entidad desde `configure-full-access-all-roles.php` (diseño histórico previo a esta sesión) — por eso veían TODO el menú nuevo por defecto. Se creó `scripts/configure-menu-visibilidad-por-rol.php`, que corre DESPUÉS de los scripts `roles/configure-role-*.php` y pone en "sin acceso" (`create/read/edit/delete/stream = no`) los grupos que no le corresponden a cada uno de esos 5 roles, sin tocar ninguna entidad que un script anterior ya hubiera configurado explícitamente (para no pisar decisiones ya tomadas en bloques anteriores — p. ej. `ActaVisita` de Jurídica, o `OrdenPolicia`/`MedidaCorrectiva` de Patrullaje).
- Los 9 roles "bare" del modelo BPMN (Profesional Universitario, Técnico Operativo, Inspector Ambiental, Secretario de Despacho, Dirección de Bienestar Animal, Auxiliar Administrativo · Inspección/Receptor, Superadministrador/Administrador funcional CRM) funcionan como lista blanca (solo ven lo que se les concede explícitamente) — ya estaban alineados con la matriz salvo 3 vacíos menores, completados en este ajuste: Secretario (le faltaban `ActaVisita`, `SuspensionAudiencia`, `GrabacionAudiencia`, `RegistroCaninoManejoEspecial`, `PermisoCaninoManejoEspecial`, `ActuacionMaltratoAnimal` en solo lectura), Dirección de Bienestar Animal (le faltaban las 3 entidades de Convivencia/Maltrato Animal + `AlertaProceso`), Auxiliar Administrativo · Inspección (le faltaban `NotificacionActo`/`Recurso`, su función real de gestión de notificaciones según `matriz_roles_v1.0.md`).
- Se agregó el nuevo script a `scripts/includes/deploy-steps.sh`, inmediatamente después de `roles/configure-roles-modelo-preliminar.php`, para que el pipeline de despliegue lo aplique automáticamente en el orden correcto.

## Archivos afectados

| Acción | Ruta | Propósito |
|---|---|---|
| Creado | `scripts/configure-menu-visibilidad-por-rol.php` | Oculta del menú los grupos irrelevantes en los 5 roles de "acceso completo" |
| Modificado | `scripts/roles/configure-roles-modelo-preliminar.php` | Completa 3 vacíos: Secretario, Dirección de Bienestar Animal, Auxiliar Administrativo · Inspección |
| Modificado | `scripts/includes/deploy-steps.sh` | Nuevo paso en el pipeline de despliegue |

## Riesgos y dependencias

- La restricción es a nivel de ACL de entidad completa, no de campo ni de estado — sigue pendiente la segunda capa discutida con el usuario (que cada vista, al entrar, muestre por defecto solo los registros en el estado que le corresponde actuar a ese rol, no el histórico completo).
- `Auxiliar Administrativo · Receptor` se dejó con su acceso a `RegistroCaninoManejoEspecial` intacto aunque la matriz inicial decía "sin grupos nuevos" — es una excepción deliberada porque ese acceso ya respondía a una tarea real del BPMN (RPC02-RPC03) construida en un bloque anterior, no un descuido.
- Si en el futuro se renombra o crea un nuevo rol con un nombre distinto a los ya contemplados en `$roleAliases`, hay que actualizar también este script (mismo riesgo que ya existía en los demás `configure-role-*.php`).

## Validación

| Escenario probado | Resultado | Evidencia u observación |
|---|---|---|
| `php -l` sobre el script nuevo y el modificado | Correcto | Sin errores de sintaxis |
| Primera ejecución (orden de alias incorrecto) | Detectado y corregido | El script reportó "aplicado" pero sobre roles legado sin usar; se verificó vía `App/user` real y no coincidía — se corrigió el orden de búsqueda |
| Segunda ejecución (orden corregido) + verificación `GET /api/v1/App/user` para los 5 roles de acceso completo | Correcto | ACL efectivo coincide exactamente con la matriz confirmada |
| Verificación de los 3 roles bare completados (Secretario, Dirección de Bienestar Animal, Auxiliar Administrativo · Inspección) | Correcto | Grupos visibles coinciden con la matriz |
| Revisión de logs tras aplicar | Correcto | Sin `ERROR`/`Exception`/`Fatal` |

## Despliegue y reversión

Aplicado en Docker local ejecutando el script dentro del contenedor + `php clear_cache.php`. Se agregó al pipeline de despliegue (`deploy-steps.sh`) para que se aplique automáticamente en Dokploy en el próximo deploy. Reversión: revertir el commit de este ajuste (y quitar el paso de `deploy-steps.sh`).

## Documentación relacionada

| Documento | Acción requerida | Estado |
|---|---|---|
| `docs/PLAN-MODELO-FUNCIONAL-INSPECCION-AMBIENTAL.md` | Registrar como paso 2 de "menú accesible por rol"; el paso 3 (vistas preseleccionadas por estado) sigue pendiente | Pendiente |
