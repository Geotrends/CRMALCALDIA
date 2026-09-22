# Conteo de casos sin radicado en asignación

| Campo | Detalle |
|---|---|
| Fecha | 2026-08-25 |
| Estado | Desplegado y validado técnicamente |
| Versión de despliegue | `front-dashboard-conteo-sin-radicado-v1-2026-08-25` |

## Objetivo

Evitar que los casos activos sin número de radicado desaparezcan de la gráfica de asignación del Dashboard.

## Alcance

- La gráfica polar **Asignación de casos** ahora incluye la serie `Sin radicado`.
- Su total representa todos los casos activos de la selección actual: con patrullero, sin asignar y sin radicado.
- El indicador de la tarjeta informa los casos sin asignar o, cuando aplique, los pendientes de radicar.
- La gráfica **Radicados por día** mantiene su propósito y continúa mostrando solo los registros con número de radicado.

## Regla aplicada

Un caso se considera radicado cuando tiene valor en `cNumeroRadicado`. La ausencia de expediente no invalida un número de radicado existente para los conteos del Dashboard.

## Archivos afectados

| Acción | Ruta | Propósito |
|---|---|---|
| Modificado | `espocrm-custom/files/client/custom/dashboard.js` | Conteo, serie y aviso de casos sin radicado. |
| Modificado | `.deploy-version` | Fuerza la actualización del frontend personalizado. |

## Datos y compatibilidad

No se crearon campos, tablas ni se modificaron casos. El ajuste usa los campos existentes `cNumeroRadicado`, `status` y `assignedUserId`.

## Validación

| Escenario probado | Resultado | Evidencia |
|---|---|---|
| Sintaxis, despliegue y salud de EspoCRM | Correcto | `node --check`, despliegue del custom, comprobación de presencia del código y `php bin/command app-check` finalizaron correctamente. |
