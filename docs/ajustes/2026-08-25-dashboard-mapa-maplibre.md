# Contenedor cartográfico MapLibre en Dashboard

| Campo | Detalle |
|---|---|
| Fecha | 2026-08-25 |
| Estado | Validado técnicamente en local |
| Áreas o roles impactados | Todos los perfiles con acceso al Dashboard |
| Versión de despliegue | `front-dashboard-mapa-restaurar-barrios-v1-2026-08-25` |

## Objetivo

Incorporar un contenedor de mapa interactivo al Dashboard para preparar la visualización territorial de los casos de inspección y vigilancia.

## Alcance funcional

- Se añade el bloque **Mapa de inspección y vigilancia** al final de las gráficas del Dashboard.
- El mapa inicia centrado en Envigado y ofrece un selector entre **OpenStreetMap** y **Satelital**.
- El mapa muestra los polígonos de barrios de Envigado y los colorea según el número de casos cuyo `cBarrioPeticionario` coincide con cada barrio. Al seleccionar un polígono se muestra el total agregado.
- Incluye navegación, escala y atribución de las fuentes cartográficas.
- No se muestran puntos de casos ni se hace geocodificación: la escala temporal de visualización es el barrio.

## Diseño y decisión técnica

El Dashboard es una página autónoma dentro de un iframe; por ello MapLibre se carga únicamente en `dashboard.html` y no se introduce en el núcleo ni en los recursos globales de EspoCRM. Se usa el módulo ES de MapLibre GL JS y estilos raster intercambiables: OpenStreetMap y Esri World Imagery. La atribución se mantiene visible. Los polígonos se consultan desde la capa pública `Barrios Envigado` y se cruzan en el navegador con el campo existente `cBarrioPeticionario`; no se crean campos, tablas ni coordenadas individuales.

Al cambiar de mapa base, MapLibre elimina las fuentes y capas añadidas al estilo anterior. Se programó la restauración de los polígonos de Envigado cuando el nuevo estilo termina de cargar (`idle`), manteniendo los conteos derivados de los filtros activos.

## Archivos afectados

| Acción | Ruta | Propósito |
|---|---|---|
| Modificado | `espocrm-custom/files/client/custom/dashboard.html` | Carga MapLibre, contenedor, selector, estado y leyenda. |
| Creado | `espocrm-custom/files/client/custom/dashboard-map.js` | Inicializa MapLibre, carga barrios y agrega los conteos. |
| Modificado | `espocrm-custom/files/client/custom/dashboard.js` | Entrega al mapa los casos que ya usa el Dashboard. |
| Modificado | `espocrm-custom/files/client/custom/res/css/08-dashboard.css` | Apariencia adaptable del mapa y su selector. |
| Modificado | `.deploy-version` | Solicita reaplicar el frontend personalizado. |
| Modificado | `docs/ajustes/README.md` | Índice del ajuste. |

## Riesgos y dependencias

- Requiere acceso del navegador a `unpkg.com`, `tile.openstreetmap.org` y los servicios de Esri.
- La política pública de teselas de OpenStreetMap exige atribución y un uso razonable; si el volumen aumenta se debe contratar/proveer un servidor de teselas adecuado.
- La vista satelital actual es una capa de Esri. Antes de un uso institucional masivo se debe confirmar la licencia y, si aplica, sustituirla por el proveedor contratado por la Alcaldía.
- La correspondencia depende de los nombres de barrio en el catálogo del CRM y en la capa territorial; se normalizan tildes y se incluyen equivalencias conocidas. Los valores que no coincidan no se representan en ningún polígono.
- La capa territorial es un servicio externo y su disponibilidad debe revisarse antes de producción.

## Pendientes

1. Validar que los nombres del catálogo de barrios del CRM coincidan completamente con la cartografía institucional.
2. Incorporar filtros globales por estado, vencimiento, recurso y barrio para recalcular todas las gráficas y el mapa.
3. Acordar los niveles de precisión y permisos antes de un futuro uso de coordenadas.
4. Evaluar alojamiento propio o proveedor de teselas para producción de alto tráfico.

## Validación

| Escenario probado | Resultado | Evidencia u observación |
|---|---|---|
| Integridad sintáctica de los módulos del Dashboard | Correcto | `node --check` para `dashboard.js` y `dashboard-map.js`; `git diff --check` correcto. |
| Disponibilidad de recursos externos | Correcto | Respuestas HTTP 200 para la capa GeoJSON pública de barrios, MapLibre y las teselas de OpenStreetMap y Esri. |
| Despliegue y estado de EspoCRM | Correcto | `deploy-custom-dokploy.sh` y `php bin/command app-check` finalizaron correctamente. |
| Carga de mapa, selector y redimensionamiento del iframe | Pendiente | Requiere inspección visual autenticada en navegador. |

## Despliegue y reversión

Desplegar mediante el flujo `deploy-custom-dokploy.sh`, que reconstruye recursos y limpia caché. Para revertir, retirar el bloque del mapa, `dashboard-map.js` y restaurar el valor anterior de `.deploy-version`; no se aplican cambios de datos ni de metadata.

## Documentación relacionada

| Documento | Acción requerida | Estado |
|---|---|---|
| `docs/ajustes/README.md` | Actualizado con el registro | Correcto |
