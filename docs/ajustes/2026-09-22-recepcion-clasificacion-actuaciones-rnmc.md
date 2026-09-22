# Ajuste: Recepción y Clasificación de Actuaciones RNMC — entidad ActuacionRNMC (28/28 BPMN)

| Campo | Detalle |
|---|---|
| Fecha | 2026-09-22 |
| Estado | Validado localmente |
| Responsable | Claude Code (sesión con Jonathan Ochoa) |
| Áreas o roles impactados | Auxiliar Administrativo · Radicador, Inspector Ambiental, Secretario de Despacho |
| Versión de despliegue | local (Docker, no desplegado a Dokploy) |

## Objetivo

Bloque 5 (último) del cierre de los 28 BPMN activos de `config.json`: cubrir `recepcion_clasificacion_rnmc_v1.0.bpmn` (id `recepcion-clasificacion-rnmc`, N1), el proceso que clasifica actuaciones **entrantes** al municipio desde el Registro Nacional de Medidas Correctivas (RNMC) / Policía Nacional (comparendos, objeciones, apelaciones, informes) y las enruta hacia apertura de expediente, PVA, recursos de segunda instancia, ejecución pecuniaria, remisión a otra autoridad o cierre.

## Alcance funcional

- **Anomalía detectada y confirmada con el usuario antes de construir**: en `config.json` este diagrama aparece con `status: "ACTIVO"` pero `active: false` — es el único caso así entre los 28. Se decidió proceder a construirlo de todas formas, sin investigar más a fondo la anomalía (decisión explícita del usuario).
- **Corrección de una premisa inicial**: este proceso NO es el mismo que ya cubre la entidad `ReporteRNMC` (que documenta el reporte SALIENTE del municipio hacia el RNMC cuando impone una medida — art. 172 par. 2 Ley 1801). Son direcciones opuestas del mismo dominio. `ReporteRNMC` sigue sin construirse (había quedado diferida desde la Fase 2, ver `2026-09-22-fase2-pva-orden-medidas-notificacion-recurso.md`) y el usuario decidió explícitamente dejarla fuera de este bloque — solo se construyó `ActuacionRNMC` (la entrante), que es el diagrama 28/28 realmente pendiente.
- `ActuacionRNMC` no está definida en `domain.json` (la fuente central de entidades): vive en un módulo lateral del repo fuente (`rnmc.json`), sin relaciones formales declaradas hacia `Case`/`Expediente`/etc. — se completaron esas relaciones al construir la entidad en el CRM, siguiendo el detalle de campos que sí trae `rnmc.json`.
- Reutilización de entidades ya existentes en este CRM en vez de duplicar campos: `OrdenComparendo` (link opcional, cuando el comparendo entrante ya está registrado en el CRM por otra vía), `Recurso` (link opcional, cuando la actuación proviene de una apelación de PVI que ya se resuelve como recurso de segunda instancia), `DecisionRutaJuridica` (link opcional, cuando la ruta decidida por el Inspector desemboca en la decisión de ruta jurídica ya existente).
- Ningún catálogo de estados oficial existe para esta entidad en el modelo fuente (`estadoRNMC` es una PROPUESTA_CRM inferida del flujo narrativo del BPMN).

## Diseño y decisión técnica

- `ActuacionRNMC`: campos de origen y trazabilidad (`identificadorRNMC`, `numeroComparendo`, `numeroExpedienteRNMC`, `fechaExpedicionComparendo`, `fechaRecepcionMunicipio`), clasificación (`tipoIngresoRNMC` con las 7 opciones oficiales de `rnmc.json`, `materias` multiselección con las 9 opciones oficiales, `hechoMaterial`, `comportamientoCodigo`/`articulo`/`numeral`/`medidaSenalada`/`multaGeneralTipo`), objeción y apelación (`objecionPresentada`, `fechaObjecion`, `esObjecionOportuna`, `apelacionPVI`, `recursoApelacion`, `fechaRemisionPVI`), competencia y ruta (`fechaRecepcionInspector`, `competenciaInspector`, `rutaDecidida` con las 7 opciones oficiales, `decisionRuta`), soporte (`ordenComparendoDocumento`, `documentosSoporte`) y `responsableInspector`.
- Todas las opciones de enum (`tipoIngresoRNMC`, `materias`, `objecionPresentada`, `esObjecionOportuna`, `competenciaInspector`, `rutaDecidida`) son literales tomadas del checklist oficial de `rnmc.json`, no inventadas.
- `estadoRNMC` es la única PROPUESTA_CRM (Recibida/En clasificación/En validación de objeción/Remitida a otra autoridad/Con ruta definida/Actualizada en RNMC/Cerrada), inferida del flujo del BPMN.

## Archivos afectados

| Acción | Ruta | Propósito |
|---|---|---|
| Creado | `Resources/metadata/entityDefs/ActuacionRNMC.json`, `Entities/ActuacionRNMC.php`, `Controllers/ActuacionRNMC.php`, `Resources/metadata/scopes/ActuacionRNMC.json`, `Resources/metadata/clientDefs/ActuacionRNMC.json`, `Resources/i18n/es_ES/ActuacionRNMC.json`, `Resources/layouts/ActuacionRNMC/*` | Definición de la entidad |
| Modificado | `Resources/metadata/entityDefs/{Case,Expediente,OrdenComparendo,Recurso,DecisionRutaJuridica}.json` + sus i18n | Links recíprocos `actuacionesRNMC` |
| Modificado | `scripts/roles/configure-roles-modelo-preliminar.php` | ACL Inspector Ambiental (crea/edita todo), Secretario de Despacho (lectura) |
| Modificado | `scripts/roles/configure-role-radicacion.php` | ACL Auxiliar Administrativo · Radicador: crea/edita propio en `ActuacionRNMC` y `OrdenComparendo` (lane "Recepción/Administración" del BPMN) |
| Modificado | `scripts/configure-full-access-all-roles.php` | Agregada la entidad al `$scopes` de acceso completo |

## Riesgos y dependencias

- `estadoRNMC` es un catálogo PROPUESTA_CRM — el modelo fuente no lo cierra formalmente.
- La integración técnica municipio↔RNMC sigue "por validar" según el propio modelo fuente; el CRM solo conserva el registro manual y sus soportes, no hay sincronización automática con el sistema nacional.
- `ReporteRNMC` (el proceso de salida, distinto de este) queda pendiente de construir en un ajuste aparte, por decisión explícita del usuario.
- Varios comportamientos del catálogo legal de `rnmc.json` tienen validaciones jurídicas pendientes ("REVISAR_MEDIDA"/"NUMERAL_OBLIGATORIO") — no se cargó ese catálogo como datos maestros en el CRM, `comportamientoCodigo`/`articulo`/`numeral` quedaron como texto libre.

## Validación

| Escenario probado | Resultado | Evidencia u observación |
|---|---|---|
| `php -l` sobre los 2 archivos PHP nuevos (dentro del contenedor) | Correcto | Sin errores de sintaxis |
| Validación JSON + ausencia de claves duplicadas en los 19 archivos tocados | Correcto | Verificado con `json.loads` y `object_pairs_hook` |
| `docker compose build && up --force-recreate` + revisión de logs | Correcto | Sin `ERROR`/`Exception`/`Fatal` |
| `GET /api/v1/ActuacionRNMC` (usuario `radicacion`) | Correcto (200) tras aplicar ACL | |
| `Case` → `ActuacionRNMC` (usuario `radicacion`, lane "Recepción/Administración") | Correcto | IDs reales encadenados |
| `ActuacionRNMC` → `ordenComparendoId`/`recursoApelacionId` (usuario `inspector`, lane "Inspector") | Correcto | Reutilización de `OrdenComparendo` y `Recurso` ya creados en bloques anteriores, sin ningún cambio a esas entidades más allá del link recíproco |

## Despliegue y reversión

Desplegado en Docker local (`docker compose build espocrm && docker compose up -d --force-recreate espocrm espocrm-daemon espocrm-websocket`), `php clear_cache.php`/`rebuild.php`, y re-ejecución de los scripts de ACL dentro del contenedor. Pendiente desplegar a Dokploy. Reversión: revertir el commit de este ajuste.

## Documentación relacionada

| Documento | Acción requerida | Estado |
|---|---|---|
| `docs/PLAN-MODELO-FUNCIONAL-INSPECCION-AMBIENTAL.md` | Marcar "Recepción y Clasificación de Actuaciones RNMC" como ✅ y cerrar el inventario de 28 BPMN (28/28) | Pendiente |
