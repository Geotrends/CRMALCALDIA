# Ajuste: Tablero agrupado por partes del proceso, con indicadores y gráficos nuevos

| Campo | Detalle |
|---|---|
| Fecha | 2026-09-29 |
| Estado | Validado localmente |
| Responsable | Claude Code (sesión con Jonathan Ochoa) |
| Áreas o roles impactados | Quienes consultan el Dashboard |
| Versión de despliegue | push a `main` (Dokploy) |

## Objetivo

Pedido del usuario: "revisa todas las variables que hoy se pueden medir y están para mostrar en el Dashboard; las que faltan agrégalas y actualízalas; si puedes, agrupa las cards por partes del proceso; añade gráficos que falten y sirvan para el storytelling".

**Antes:**
- 13 indicadores en una sola fila y 12 gráficos, solo del caso.
- Nada del proceso de Policía.
- Solo se leían los primeros **200 casos**.

## Cambio

**Datos**
- **Casos:** se leen **todos**, con paginación de 200 en 200 hasta 5.000, y se incluye el nombre del responsable.
- **Endpoint nuevo `Case/action/dashboardProceso`** (`Tools/Dashboard/DashboardProcesoService.php`):
  - **tiempos:** por caso, las fechas de registro, radicación, asignación, primera visita, definición, finalización y vencimiento;
  - **proceso:** expedientes (ruta, paso actual o "Archivado", en preparación, paso vencido, casos vinculados), audiencias (estado y tipo de suspensión), medidas vigentes (tipo, familia, estado, RNMC), multas (valor y estado del recaudo), recursos (tipo y resultado) y órdenes de Policía.
- **Filtros:** el tablero aplica sus filtros actuales (período, fechas, estado, recurso, barrio, responsable) también al proceso, a través de los casos de cada expediente.

**Grupos**, cada uno con una frase de lectura que se calcula con los datos filtrados:

| Grupo | Indicadores | Gráficos |
|---|---|---|
| **Panorama** | 4–5 frases: casos activos y cerrados, vencidos, etapa más lenta, casos en proceso de Policía y % respondido a tiempo | Embudo (estado actual) · **Tendencia mensual** (ingresados y finalizados) · **Tiempo promedio por etapa** |
| 1 · Ingreso y radicación | Total, Pend. radicación, **Radicados**, **Ingresados este mes** | Canal, Recurso, Ingreso diario, Radicados por día, Barrio |
| 2 · Competencia y asignación | Competencia por revisar, **Sin responsable**, En gestión, **Días a la asignación** | Competencia, Asignación, **Carga por responsable** |
| 3 · Gestión técnica | Visitas pendientes y realizadas, **Días a la visita** | Visitas |
| 4 · Definición y cierre | Por definir, Por finalizar, Remisiones sin enviar, Finalizados, **Días al cierre** | Decisiones de trámite |
| 5 · Proceso de Policía | Casos con proceso, **Expedientes abiertos**, **Pasos vencidos**, **Audiencias próximas (7 días)**, **Medidas impuestas**, **Multas remitidas ($)**, **Recaudado ($)**, **Órdenes incumplidas**, **RNMC pendiente**, **Expedientes archivados** | **Expedientes por paso**, **Ruta jurídica**, **Audiencias** (realizada, inasistencia, suspendida por prueba, aplazada), **Recursos** (confirma, modifica, revoca), **Medidas por tipo**, **Multas en millones** (remitido, recaudado, en cobro coactivo, por recaudar) · tabla de procesos abiertos |
| 6 · Oportunidad | Vencidos, Próx. a vencer, **% finalizados a tiempo** | Semáforo |
| 7 · Territorio | — | Mapa |

- **Tiempos:** son promedios en **días calendario**, calculados sobre los casos que ya tienen las dos fechas de la etapa.

**Archivos**
- `files/client/custom/dashboard.html` (estructura por grupos)
- `dashboard.js` (`renderLectura`, `dibujarSeries`, paginación)
- `res/css/08-dashboard.css` (grupos, lectura y cuadrículas)
- `Controllers/CaseObj.php` (`dashboardProceso`)
- `Tools/Dashboard/DashboardProcesoService.php`

## Validación (local, con datos de prueba ya eliminados)

- **Proceso de Policía:** con dos casos de prueba (uno con decisión, dos multas pagadas por 5,2 millones, decomiso y recurso confirmado; otro en decisión), el grupo mostró 3 expedientes abiertos, 1 paso vencido, 3 medidas, 3 RNMC pendientes, recaudo de $ 5.200.000 y recursos "Confirma".
- **Lectura del panorama:** "4 caso(s) llegaron a proceso de Policía; 1 ya están archivados", "La etapa más lenta es Visita → definición".
- **Endpoint:** responde en unos 0,4 s con los datos locales.

## Pendientes

- Los reportes PDF y Excel ("Reporte gerencial") todavía no incluyen los indicadores nuevos del proceso de Policía.
- Las etiquetas externas de las donas pueden cruzarse con la leyenda cuando hay una sola categoría; venía del diseño anterior.
