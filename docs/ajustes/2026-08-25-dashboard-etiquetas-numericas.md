# Etiquetas numéricas en gráficas del Dashboard

| Campo | Detalle |
|---|---|
| Fecha | 2026-08-25 |
| Estado | Desplegado y validado técnicamente |
| Versión de despliegue | `front-dashboard-ocultar-ceros-v1-2026-08-25` |

## Objetivo

Mostrar de forma directa el valor que representa cada gráfica del Dashboard, sin requerir pasar el cursor para consultar el tooltip.

## Alcance

- Embudo: conserva sus valores visibles por etapa.
- Barras verticales y horizontales: muestra el valor sobre o junto a cada barra cuando es mayor que cero.
- Línea: muestra el valor únicamente en puntos con datos mayores que cero.
- Donut y polar: muestra el total central, una línea externa con “categoría: valor” para cada segmento visible y el valor individual en la leyenda cuando es mayor que cero.
- En series de fechas se ocultan los ceros para conservar legibilidad.

## Diseño técnico

Se registró un plugin propio y liviano de Chart.js dentro del Dashboard. No se añadió una dependencia externa ni se cambió el origen de los datos. La leyenda circular se genera explícitamente por serie para evitar etiquetas incompletas.

## Archivos afectados

| Acción | Ruta | Propósito |
|---|---|---|
| Modificado | `espocrm-custom/files/client/custom/dashboard.js` | Plugin y opciones de etiquetas numéricas. |
| Modificado | `.deploy-version` | Reaplica el frontend personalizado. |

## Validación

| Escenario probado | Resultado | Evidencia |
|---|---|---|
| Sintaxis y despliegue | Correcto | `node --check`, despliegue del custom y `php bin/command app-check` finalizaron correctamente. |
