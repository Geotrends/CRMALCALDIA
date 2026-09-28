# Ajuste: El acta de visita ya no nace con una "decisión" por defecto

| Campo | Detalle |
|---|---|
| Fecha | 2026-09-28 |
| Estado | Validado localmente |
| Responsable | Claude Code (sesión con Jonathan Ochoa) |
| Áreas o roles impactados | Todos los que ven la tarjeta de visitas del caso |
| Versión de despliegue | local (Docker, no desplegado a Dokploy) |

## Problema reportado

En `RAD-P-002`, la tarjeta "Visita 1" mostraba "Revisión técnico-jurídica · Decisión: Visita complementaria" sin que nadie hubiera definido el trámite.

## Causa

`ActaVisita.cDecisionTramite` es una lista sin opción vacía. EspoCRM asigna la **primera opción** ("Visita complementaria") al crear un registro. El acta de `RAD-P-002`, creada por el Patrullero, nació así, sin revisor, sin fecha de revisión y sin motivación. La tarjeta mostraba la "Decisión" solo porque el campo tenía valor. En el caso, la decisión seguía sin definir.

## Cambio

| Acción | Ruta | Propósito |
|---|---|---|
| Modificado | `espocrm-custom/Resources/metadata/entityDefs/ActaVisita.json` | `cDecisionTramite`: opción vacía y `default: ""`. |
| Modificado | `espocrm-custom/files/client/custom/src/views/case/fields/acta-visita-action.js` | La tarjeta muestra la revisión solo si además hay revisor (`cRevisadoPor`) o fecha de revisión (`fechaAprobacion`). |
| Creado | `scripts/fix-acta-decision-sin-revision.php` + paso en `scripts/includes/deploy-steps.sh` | Limpia las actas con decisión pero sin revisor ni fecha. Idempotente; se ejecuta en cada despliegue. |

## Validación

- Script local: "Acta visita — Rad. RAD-P-002: decisión sin revisión eliminada. Actas corregidas: 1."
- Acta nueva creada por API: `cDecisionTramite` vacío.
- Playwright como `patrullaje` en `RAD-P-002`: la tarjeta muestra "Visita 1 · Diligenciada · … · Editar acta", sin "Decisión".
- Caso de prueba eliminado.

## Despliegue y reversión

Local: `docker cp`, `rebuild`, `clear-cache`, el script y `update-app-timestamp`. En Dokploy el script corre dentro del despliegue. Reversión: revertir el commit.
