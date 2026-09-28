# Ajuste: La apertura elige la ruta jurídica N2 (reemplaza "Régimen del trámite")

| Campo | Detalle |
|---|---|
| Fecha | 2026-09-28 |
| Estado | Validado localmente |
| Responsable | Claude Code (sesión con Jonathan Ochoa) |
| Áreas o roles impactados | Admin, Director Técnico, Inspector Ambiental y Apoyo Jurídico (deciden la apertura); Apoyo Jurídico (prepara el Auto); Inspector Ambiental (firma) |
| Versión de despliegue | local (Docker, no desplegado a Dokploy) |

## Objetivo

Al decidir la apertura ([ajuste de apertura](2026-09-28-apertura-expediente-auto-inicio.md)) se pedía un "Régimen del trámite" con dos valores: Ley 1801 o Ley 1333. Eso no corresponde a los BPMN:

- La compuerta **ER-D04** de Evaluación de Resultado (`evaluacion_resultado_v1.1`) y la salida de `06_APERTURA_EXPEDIENTE` llevan a una **ruta N2** de `07_RUTAS_JURIDICAS`.
- La Ley 1333 (sancionatorio ambiental) es de la autoridad ambiental. En el CRM se atiende con la **Remisión por competencia** (C9), no con una apertura.

Ahora la apertura elige la ruta jurídica. La ruta define los pasos del expediente y el formato del Auto de Inicio.

## Decisiones del usuario

1. "La guía son los BPMN": la apertura dice qué pasos siguen. Se aprueba ofrecer las 4 rutas N2, sugerir una y quitar la Ley 1333 de la apertura.
2. Maltrato animal: el BPMN no describe un formato de Auto de Inicio. El IV-F-364 está vinculado solo a apertura, PVA, recursos naturales y convivencia con animales. Para maltrato se genera un **borrador provisional marcado "POR VALIDAR"**.

## Cambio

### Rutas y pasos del expediente (`ExpedientePasosCatalog`)

| Ruta jurídica (BPMN N2) | Pasos del expediente después de "Abierto" | Formato del Auto |
|---|---|---|
| Proceso Verbal Abreviado · Convivencia (Ley 1801/2016) | Citación → Audiencia pública → Práctica de pruebas → Decisión: orden de policía o medida correctiva → Notificación y recursos → Cumplimiento de la orden o medida → Auto de Archivo | IV-F-364 oficial |
| Recursos Naturales · competencia municipal (Ley 1801/2016) | Consolidación técnica y antecedentes → Valoración de competencia municipal y concurrencia ambiental → pasos del PVA | IV-F-364 oficial |
| Conductas de convivencia con animales (Ley 1801/2016) | Clasificación de la conducta (artículo y numeral) → pasos del PVA | IV-F-364 oficial |
| Proceso Verbal de Maltrato Animal (Ley 84/1989 - Ley 2455/2025) | Atención y verificación de urgencia → Aprehensión material preventiva (si aplica) → Clasificación jurídica: maltrato leve o posible delito → Remisión a Fiscalía / GELMA (si aplica) → Audiencia de maltrato animal → Decisión de fondo → Notificación y recursos → Cumplimiento y seguimiento → Auto de Archivo | Borrador "POR VALIDAR" |

- Los días de cada paso son de referencia y no amplían el término legal.
- Los dos regímenes anteriores se conservan solo para los expedientes ya creados.

### Ruta sugerida (la persona la confirma o la cambia)

| Clasificación del caso | Ruta sugerida |
|---|---|
| Asunto con "maltrato" | Maltrato Animal |
| Asunto con "animales" o "tenencia" | Conductas de convivencia con animales |
| Recurso FLORA, HÍDRICO, SUELO, FAUNA SILVESTRE o ESPACIO PUBLICOS VERDES; o asunto de árboles, forestal, cauce, vertimientos, suelos de protección, movimientos en masa, zona verde o vegetación | Recursos Naturales |
| Lo demás (ruido, residuos, escombros, ornato, etc.) | Proceso Verbal Abreviado |

### Pantalla y registro

- **Bloque "Apertura de expediente":** el campo se llama **Ruta jurídica**, con las 4 rutas. La sugerida viene preseleccionada y marcada "(sugerida)".
- **Registros:**
  - `DecisionRutaJuridica.resultado` toma el valor de la ruta: Ruta policiva, Ruta Recursos Naturales - Competencia Municipal, Ruta Tenencia Animal o Ruta Maltrato Animal.
  - El Expediente y el Auto de Inicio guardan la ruta en `tipoTramite`.
  - El Auto toma la ruta del expediente aunque llegue con "Sin definir".
- **Formato:**
  - Para maltrato, el formato cita la Ley 84 de 1989 (mod. Ley 2455 de 2025).
  - En los datos del formato ya no aparece el texto "Seleccione una opción" en dirección ni barrio.
- **Línea de tiempo:** las 4 rutas se muestran como trámite policivo.

### Archivos

- `espocrm-custom/Tools/Expediente/ExpedientePasosCatalog.php`
- `espocrm-custom/Tools/CaseObj/CaseAperturaService.php`
- `espocrm-custom/Tools/CaseObj/CaseTimelineService.php`
- `espocrm-custom/Hooks/AutoInicio/SyncExpedienteAndCase.php`
- `espocrm-custom/Resources/metadata/entityDefs/Expediente.json` y `AutoInicio.json` (opciones de `tipoTramite` y pasos en `Expediente.estado`)
- `espocrm-custom/Resources/i18n/es_ES/Expediente.json` y `AutoInicio.json`
- `espocrm-custom/files/scripts/fill-formato-auto-inicio.py`
- `espocrm-custom/files/client/custom/src/helpers/case-detail-side-panels.js`
- `espocrm-custom/files/client/custom/res/css/33-case-asignacion.css`

## Validación (local, API + navegador)

- **Ruta sugerida:** ruido → PVA · maltrato → Maltrato Animal · árbol (FLORA) → Recursos Naturales · tenencia de animales → Conductas con animales.
- **Ruta rechazada:** decidir con la Ley 1333 responde 400 "Seleccione la ruta jurídica."
- **Flujo completo (decidir → Auto → enviar a firma → firmar):**
  - PVA y Recursos Naturales generan el IV-F-364 con dirección vacía (antes decía "Seleccione una opción").
  - Maltrato genera el borrador "POR VALIDAR" con la Ley 84/1989.
  - En los tres casos el expediente queda **Abierto** con la ruta, y la línea de tiempo muestra el trámite policivo.
- **Navegador (`juridica`):** el selector muestra "Conductas de convivencia con animales (Ley 1801/2016) (sugerida)".
- **Datos de prueba:** los casos de prueba se eliminaron.

## Pendientes

- **Maltrato animal:** validar con la Inspección el formato del acto de apertura (hoy es un borrador).
- **Siguiente tramo:** los pasos de cada ruta (citación, audiencia, decisión, notificación y recursos, cumplimiento, archivo), empezando por el PVA.

## Despliegue y reversión

- **Local:** `docker cp`, `rebuild` (cambian las opciones de los enums), `clear-cache` y `update-app-timestamp`.
- **Reversión:** revertir el commit. Los expedientes creados con las nuevas rutas quedarían con un `tipoTramite` fuera de la lista.
