# Ajuste: Tablero de control con los indicadores del flujo (competencia, visitas, decisión y cierre)

| Campo | Detalle |
|---|---|
| Fecha | 2026-09-28 |
| Estado | Validado localmente |
| Responsable | Claude Code (sesión con Jonathan Ochoa) |
| Áreas o roles impactados | Todos los que ven el tablero |
| Versión de despliegue | local (Docker, no desplegado a Dokploy) |

## Problema

El tablero no conocía los estados y pasos agregados hoy. Con 2 casos ("Remitido por competencia" y "Pendiente de respuesta final"), "En gestión", "Finalizados" y el embudo daban 0, y no había ningún indicador de competencia, visitas, decisiones o cierre.

## Indicadores

| Tarjeta | Regla |
|---|---|
| Competencia por revisar (nueva) | Casos "Radicado" sin competencia confirmada |
| En gestión (corregida) | Incluye "Pendiente de respuesta final" y "Remitido por competencia" |
| Visitas pendientes (nueva) | Casos "Asignado", o "En gestión técnica" con gestión técnica en curso (visita complementaria) |
| Visitas realizadas (nueva) | Actas diligenciadas (se cuentan visitas, no casos) |
| Por definir trámite (nueva) | Casos en gestión técnica / revisión cuya última acta diligenciada no tiene revisión técnico-jurídica |
| Por finalizar (nueva) | "Pendiente de respuesta final" + "Remitido por competencia" |
| Remisiones sin enviar (nueva) | `RemisionAutoridad` en "Preparación" |
| Finalizados | "Finalizado" + "Proceso cerrado" (texto de ayuda corregido) |

Se conservan Total, Pendientes de radicación, Vencidos, Próximos a vencer y Procesos policivos. En pantallas anchas, 7 columnas (dos filas completas).

## Gráficos

- **Embudo del proceso:** 9 etapas, agregando "Pendiente de respuesta final" y "Remitido por competencia".
- **Visitas (nuevo, dona):** Pendientes / Realizadas sin revisar / Revisadas.
- **Decisiones de trámite (nuevo, barras horizontales):** Visita complementaria, Cierre de atención, Remisión por competencia, Apertura de actuación, según las revisiones registradas.
- **Competencia (nuevo, dona):** Total / Parcial / Ninguna / Por revisar (casos radicados).

Todos respetan los filtros del tablero. Las actas, gestiones técnicas y remisiones se cargan aparte. Si el rol no puede leer alguna de esas entidades, el indicador muestra "–" y el gráfico "Sin acceso…".

## Cambio

| Acción | Ruta |
|---|---|
| Modificado | `espocrm-custom/files/client/custom/dashboard.html` (tarjetas y gráficos nuevos) |
| Modificado | `espocrm-custom/files/client/custom/dashboard.js` (estados nuevos, `fetchDatosApoyo`, `calcularFlujo`, gráficos) |
| Modificado | `espocrm-custom/files/client/custom/res/css/08-dashboard.css` (íconos, 7 columnas) |

## Validación (Playwright, `admin`)

Total 2 · Pend. radicación 0 · Competencia por revisar 0 · En gestión 2 · Visitas pendientes 0 · Visitas realizadas 4 (3 de `RAD-P-002` + 1 de `RAD-P-001`) · Por definir 0 · Por finalizar 2 · Remisiones sin enviar 1 (`RAD-P-002`) · Finalizados 0. Embudo: 1 "Pendiente de respuesta final" y 1 "Remitido por competencia". Visitas: 4 revisadas. Decisiones: Visita complementaria 2, Cierre 1, Remisión 1. Competencia: Total 2.

## Pendiente

- Las etiquetas de valor de las donas se superponen con la leyenda (comportamiento del plugin de etiquetas que ya se veía en "Semáforo de vencimiento").
- El tablero carga como máximo 200 casos, actas, gestiones y remisiones (el mismo límite que ya tenía para los casos).

## Despliegue y reversión

Local: `docker cp`, `clear-cache` y `update-app-timestamp`. Reversión: revertir el commit.
