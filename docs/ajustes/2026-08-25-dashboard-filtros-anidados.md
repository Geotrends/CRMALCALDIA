# Filtros anidados del Dashboard

| Campo | Detalle |
|---|---|
| Fecha | 2026-08-25 |
| Estado | Validado técnicamente en local |
| Áreas o roles impactados | Todos los perfiles con acceso al Dashboard |
| Versión de despliegue | `front-dashboard-filtros-fecha-v1-2026-08-25` |

## Objetivo

Hacer que los KPIs, gráficas y el mapa de barrios respondan a una selección común de casos, mediante filtros dependientes al estilo de una herramienta de inteligencia de negocio.

## Alcance funcional

- Filtros de vencimiento: todos, vencidos, próximos a vencer y sin fecha de vencimiento.
- Rango de fecha **desde/hasta**, aplicado a `cFechaCaso` (o a la fecha de creación cuando el caso no la tenga).
- Filtros de estado, recurso/tema, barrio y responsable.
- Las opciones de cada filtro se recalculan usando las demás selecciones activas; esto evita opciones sin resultados y permite encadenar el análisis.
- El botón “Limpiar filtros” restablece el Dashboard completo.
- El mapa recibe el mismo conjunto filtrado y recalcula sus conteos agregados por barrio.

## Decisión técnica

La primera versión filtra en el navegador la lista de casos que ya consume el Dashboard. No se modifican metadata, permisos, entidades, tablas ni se crean campos. La consulta mantiene el límite permitido de 200 registros; si el volumen operativo lo supera debe implementarse una API de agregación/paginación en backend antes de considerar los indicadores como totales institucionales. Se retiró la selección explícita de `assignedUserName` y se conserva el tamaño de página anterior, porque la combinación introducida en la versión previa devolvió 403; el filtro usa el nombre normal devuelto por EspoCRM o el identificador asignado como respaldo.

## Archivos afectados

| Acción | Ruta | Propósito |
|---|---|---|
| Modificado | `espocrm-custom/files/client/custom/dashboard.html` | Barra de filtros y resumen de selección. |
| Modificado | `espocrm-custom/files/client/custom/dashboard.js` | Filtros dependientes, recálculo de indicadores y entrega de selección al mapa. |
| Modificado | `espocrm-custom/files/client/custom/res/css/08-dashboard.css` | Estilos adaptables de la barra de filtros. |
| Modificado | `.deploy-version` | Solicita reaplicar el frontend personalizado. |
| Modificado | `docs/ajustes/README.md` | Índice del ajuste. |

## Riesgos y pendientes

1. Validar visualmente el encadenamiento de filtros con datos reales de cada rol.
2. Reemplazar el límite temporal de 500 por agregaciones en backend cuando el volumen lo requiera.
3. Definir filtros de rango de fecha del caso como siguiente ampliación; la versión actual se enfoca en vencimientos para mantener una lectura operativa clara.

## Validación

| Escenario probado | Resultado | Evidencia u observación |
|---|---|---|
| Sintaxis y despliegue | Correcto | `node --check`, `git diff --check`, despliegue del custom y `php bin/command app-check` finalizaron correctamente. |
| Recalcular gráficas y mapa | Pendiente | Requiere navegador autenticado con casos. |

## Despliegue y reversión

Desplegar con `deploy-custom-dokploy.sh`, que reconstruye recursos y limpia caché. La reversión consiste en retirar la barra y la lógica de filtros; no existen cambios de datos que revertir.
