# Ajuste: Menú lateral global — grupos por proceso

| Campo | Detalle |
|---|---|
| Fecha | 2026-09-22 |
| Estado | Validado localmente |
| Responsable | Claude Code (sesión con Jonathan Ochoa) |
| Áreas o roles impactados | Todos (menú global, aún sin diferenciar por rol) |
| Versión de despliegue | local (Docker, no desplegado a Dokploy) |

## Objetivo

El usuario pidió facilitar el acceso al CRM organizando el menú lateral en grupos y subgrupos según el proceso/expediente/acción de cada funcionario. Primer paso: reorganizar el menú global (`tabList`) para que las ~35 entidades construidas en la Fase 2b (antes invisibles en el menú, solo accesibles por URL directa o paneles relacionados) queden agrupadas por proceso BPMN. El filtrado por rol (que cada quien vea solo su grupo, con vistas preseleccionadas por estado) queda como un paso siguiente, no incluido en este ajuste.

## Alcance funcional

Se agregaron 5 grupos nuevos al menú global (antes solo existían "Gestión" y "Actividades"), manteniendo el mismo estilo visual de divisores ya usado:

- **Gestión** (ampliado): se agregaron `AutoInicio` y `ActuoArchivo`, que ya existían en el CRM pero no estaban en el menú.
- **Gestión Técnica** (nuevo): GestionTecnica, ActaVisita, IntervencionTecnica, ProgramacionVisita, EvaluacionResultado, RecomendacionTecnica, Compromiso, VerificacionCumplimiento.
- **Proceso Verbal Abreviado** (nuevo): DecisionRutaJuridica, Audiencia, SuspensionAudiencia, GrabacionAudiencia, OrdenPolicia, MedidaCorrectiva, EjecucionMedidaCorrectiva, NotificacionActo, Recurso, MovimientoExpediente.
- **Policía y RNMC** (nuevo): OrdenComparendo, ActuacionPoliciaInmediata, ActuacionRNMC, ReporteRNMC.
- **Otras rutas** (nuevo): RemisionAutoridad, RegistroCaninoManejoEspecial, PermisoCaninoManejoEspecial, ActuacionMaltratoAnimal, ObligacionPecuniaria.
- **Seguimiento** (nuevo): AlertaProceso.
- **Actividades** (sin cambios): Calendar, Task, Team.

Total: 48 entradas en el `tabList` (antes 13).

## Diseño y decisión técnica

- El `tabList` global se define en DOS scripts que corren en el pipeline de despliegue (`scripts/includes/deploy-steps.sh`, en ese orden): `configure-global-tablist.php` (paso 1) y `configure-full-access-all-roles.php` (paso 2, más completo, es el que gana porque corre después). Se actualizaron AMBOS con la misma lista para evitar que queden desincronizados y confundan a quien lea el código en el futuro.
- Esto es solo el **menú global** (lo que ve cualquier usuario sin `tabList` propio en su Role/Preferences — hoy todos los roles usan el global, confirmado por el log "usa menú global" que imprime el script). El filtrado por rol (menús distintos por rol + vistas preseleccionadas por estado, como se discutió con el usuario) es un ajuste separado, no incluido aquí.
- No se tocó ningún ACL, campo, hook ni comportamiento de las entidades — es puramente el orden/agrupación del menú.

## Archivos afectados

| Acción | Ruta | Propósito |
|---|---|---|
| Modificado | `scripts/configure-full-access-all-roles.php` | `$globalTabList` ampliado a 48 entradas con 5 grupos nuevos |
| Modificado | `scripts/configure-global-tablist.php` | Mismo `$tabList` replicado para consistencia |

## Riesgos y dependencias

- Ninguno de los grupos nuevos tiene todavía un icono/color de menú personalizado más allá del que cada entidad ya trae en su `clientDefs` — la presentación depende de esos iconos ya definidos al construir cada entidad.
- El menú sigue siendo el mismo para todos los roles; con 48 entradas, roles con poca necesidad de navegación (p. ej. Patrullero Ambiental) verán grupos irrelevantes para su trabajo hasta que se implemente el filtrado por rol.

## Validación

| Escenario probado | Resultado | Evidencia u observación |
|---|---|---|
| `php -l` sobre ambos scripts modificados | Correcto | Sin errores de sintaxis |
| Ejecución de ambos scripts dentro del contenedor | Correcto | "tabList global configurado (48 entradas)" y "tabList global actualizado (48 entradas)" |
| `GET /api/v1/App/user` (usuario `admin`) → `settings.tabList` | Correcto | Los 7 grupos y 48 entradas aparecen en el orden esperado |
| `GET /api/v1/<Entidad>` para las 33 entidades del menú | Correcto (200 todas) | Ninguna entrada del menú apunta a un endpoint roto |
| Revisión de logs tras aplicar | Correcto | Sin `ERROR`/`Exception`/`Fatal` |

## Despliegue y reversión

Aplicado en Docker local ejecutando ambos scripts dentro del contenedor + `php clear_cache.php`. Pendiente desplegar a Dokploy (se aplica automáticamente en el próximo deploy vía `deploy-steps.sh`, que ya invoca ambos scripts). Reversión: revertir el commit de este ajuste.

## Documentación relacionada

| Documento | Acción requerida | Estado |
|---|---|---|
| `docs/PLAN-MODELO-FUNCIONAL-INSPECCION-AMBIENTAL.md` | Registrar como paso 1 de "menú accesible por rol"; el paso 2 (filtrado por rol + vistas por estado) queda pendiente | Pendiente |
