# Ajuste: Reporte a la base nacional RNMC — entidad ReporteRNMC

| Campo | Detalle |
|---|---|
| Fecha | 2026-09-22 |
| Estado | Validado localmente |
| Responsable | Claude Code (sesión con Jonathan Ochoa) |
| Áreas o roles impactados | Inspector Ambiental, Secretario de Despacho |
| Versión de despliegue | local (Docker, no desplegado a Dokploy) |

## Objetivo

Cerrar el cabo suelto que quedó diferido desde la Fase 2 (`2026-09-22-fase2-pva-orden-medidas-notificacion-recurso.md`): la entidad `ReporteRNMC`, que documenta el **reporte saliente** del municipio hacia el Registro Nacional de Medidas Correctivas (RNMC) cuando impone una Medida Correctiva u Orden de Policía (art. 172 parágrafo 2, Ley 1801 de 2016). Es la contraparte de `ActuacionRNMC` (bloque anterior, actuaciones **entrantes** desde el RNMC) — con esto queda cerrado el dominio RNMC completo en ambas direcciones.

## Alcance funcional

- `ReporteRNMC` sí tiene ficha completa en `domain.json` (a diferencia de `ActuacionRNMC`, que vivía en un módulo lateral): `medidaCorrectivaId?`, `ordenComparendoId?`, `fechaReporte`, `medio`, `responsableId`, `identificadorExterno?`, `documentoConstanciaId?`, `estado`.
- `estado` usa el catálogo oficial de `estados.md` sección 17 (Pendiente/Reportado/Constancia cargada/Error de reporte/Por validar integración) — el propio modelo advierte que "la forma técnica de integración del Municipio con RNMC permanece POR VALIDAR", por eso no hay ninguna automatización de reporte, es un registro manual con su soporte.
- `medio` (medio de reporte) no tiene catálogo cerrado en el modelo fuente, se dejó como texto libre en vez de inventar un enum.
- Se reutilizan `MedidaCorrectiva` y `OrdenComparendo` (ambas ya construidas) como orígenes opcionales, tal como indica la relación `MedidaCorrectiva -> ReporteRNMC` (1:0..N) de `domain.json` y el campo `ordenComparendoId?` de la propia entidad.

## Diseño y decisión técnica

- `ReporteRNMC`: `medidaCorrectiva`/`ordenComparendo` (belongsTo opcionales), `fechaReporte` (requerido), `medio` (texto libre, requerido), `responsable` (belongsTo User, requerido), `identificadorExterno` (opcional), `documentoConstancia` (file, opcional), `estado` (enum oficial de 5 valores).
- Se agregaron únicamente links recíprocos hasMany (`reportesRNMC`) en `MedidaCorrectiva` y `OrdenComparendo`, sin tocar ningún otro campo/hook existente.

## Archivos afectados

| Acción | Ruta | Propósito |
|---|---|---|
| Creado | `Resources/metadata/entityDefs/ReporteRNMC.json`, `Entities/ReporteRNMC.php`, `Controllers/ReporteRNMC.php`, `Resources/metadata/scopes/ReporteRNMC.json`, `Resources/metadata/clientDefs/ReporteRNMC.json`, `Resources/i18n/es_ES/ReporteRNMC.json`, `Resources/layouts/ReporteRNMC/*` | Definición de la entidad |
| Modificado | `Resources/metadata/entityDefs/MedidaCorrectiva.json`, `Resources/i18n/es_ES/MedidaCorrectiva.json` | Link recíproco `reportesRNMC` |
| Modificado | `Resources/metadata/entityDefs/OrdenComparendo.json`, `Resources/i18n/es_ES/OrdenComparendo.json` | Link recíproco `reportesRNMC` |
| Modificado | `scripts/roles/configure-roles-modelo-preliminar.php` | ACL Inspector Ambiental (crea/edita todo), Secretario de Despacho (lectura) |
| Modificado | `scripts/configure-full-access-all-roles.php` | Agregada la entidad al `$scopes` de acceso completo |

## Riesgos y dependencias

- La integración técnica real con el sistema RNMC sigue "por validar" según el propio modelo fuente; este registro es puramente manual/documental.
- Se detectó (no corregido en este ajuste, por estar fuera de su alcance) que el rol Inspector Ambiental tiene `User: read=own` en el ACL preliminar, lo que le impide vincular como `responsable` a un usuario distinto de sí mismo en cualquier entidad que use un link a `User` — es una limitación preexistente del ACL preliminar general, no específica de `ReporteRNMC`.

## Validación

| Escenario probado | Resultado | Evidencia u observación |
|---|---|---|
| Validación JSON + ausencia de claves duplicadas en los 13 archivos tocados | Correcto | Verificado con `json.loads` y `object_pairs_hook` |
| `php -l` sobre los 2 archivos PHP nuevos (dentro del contenedor) | Correcto | Sin errores de sintaxis |
| `docker compose build && up --force-recreate` + revisión de logs | Correcto | Sin `ERROR`/`Exception`/`Fatal` |
| `GET /api/v1/ReporteRNMC` (usuario `inspector`) | Correcto (200) tras aplicar ACL | |
| `MedidaCorrectiva` + `OrdenComparendo` → `ReporteRNMC` (usuario `inspector`) | Correcto | IDs reales encadenados, ambos orígenes reutilizados sin cambios a esas entidades más allá del link recíproco |

## Despliegue y reversión

Desplegado en Docker local (`docker compose build espocrm && docker compose up -d --force-recreate espocrm espocrm-daemon espocrm-websocket`), `php clear_cache.php`/`rebuild.php`, y re-ejecución de los scripts de ACL dentro del contenedor. Pendiente desplegar a Dokploy. Reversión: revertir el commit de este ajuste.

## Documentación relacionada

| Documento | Acción requerida | Estado |
|---|---|---|
| `docs/PLAN-MODELO-FUNCIONAL-INSPECCION-AMBIENTAL.md` | Registrar el cierre del dominio RNMC completo (entrante + saliente) | Pendiente |
