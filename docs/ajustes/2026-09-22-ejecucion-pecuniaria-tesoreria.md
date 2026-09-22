# Ajuste: Ejecución Pecuniaria / Tesorería — entidad ObligacionPecuniaria

| Campo | Detalle |
|---|---|
| Fecha | 2026-09-22 |
| Estado | Validado localmente |
| Responsable | Claude Code (sesión con Jonathan Ochoa) |
| Áreas o roles impactados | Inspector Ambiental, Apoyo Jurídico, Secretario de Despacho |
| Versión de despliegue | local (Docker, no desplegado a Dokploy) |

## Objetivo

Bloque 4 del cierre de los 28 BPMN de `config.json`: cubrir `tesoreria_ejecucion_pecuniaria_v1.1.bpmn` (id `tesoreria-ejecucion`, N3), el subproceso que remite y da seguimiento al cobro de una obligación pecuniaria (multa) derivada de una `MedidaCorrectiva` ya en firme.

## Alcance funcional

- **Brecha real del modelo fuente**: a diferencia de los demás bloques, `domain.json` NO define ninguna entidad para este subproceso (ni "ObligacionPecuniaria", ni "CobroCoactivo", ni similar) — es la única brecha estructural detectada en el modelo de dominio, no solo del CRM. Por lo tanto `ObligacionPecuniaria` es **diseño propio basado en la narrativa del BPMN**, no un modelo confirmado por `domain.json`, y así queda documentado.
- El flujo BPMN (TES01–TES07) valida la decisión en firme, prepara y remite a Tesorería, registra en el sistema de recaudo (integración "por validar" explícita en el propio BPMN), genera una alerta de control a 30 días, gestiona el pago/cobro y actualiza el expediente. El propio BPMN es deliberadamente cauteloso: **la alerta de 30 días es un control operativo, no dispara automáticamente cobro coactivo ni declara mora** — cualquier acción posterior requiere validación humana. Por eso `fechaAlertaControl` es un campo manual sin ninguna automatización, y `estadoRecaudo` no incluye ningún flujo forzado de transición.
- El paso de remisión a Tesorería (TES02/TES03: oficio, fecha, dependencia destino, fecha de recibido) es estructuralmente idéntico a `RemisionAutoridad`, ya construida en este CRM (Fase 2, Recursos Naturales). Su campo `autoridadDestino` es texto libre, así que "Secretaría de Hacienda - Tesorería" cabe sin ningún cambio a esa entidad — se reutilizó en vez de duplicar esos campos.
- Tesorería/Secretaría de Hacienda es un actor explícitamente externo según el modelo (`scripts/seed-modelo-roles-bpmn.php` ya documentaba esto desde antes de este bloque: "no se crean roles para actores explícitamente externos... Secretaría de Hacienda/Tesorería: el modelo indica que normalmente no requieren usuario interno completo"). Por eso el registro y seguimiento de `ObligacionPecuniaria` lo hacen Inspector Ambiental/Apoyo Jurídico (lado "Inspección/Jurídica" del BPMN), reflejando manualmente lo que Tesorería informa por fuera del CRM — no se creó ningún rol ni usuario para Tesorería.

## Diseño y decisión técnica

- `ObligacionPecuniaria`: `case`/`expediente` (opcionales), `medidaCorrectiva` y `ejecucionMedidaCorrectiva` (opcionales, origen), `sujetoObligado`, `concepto`, `valor` (float simple — no se usó el tipo `currency` de EspoCRM porque no existe ningún precedente de ese tipo en el resto del proyecto, se prefirió no introducir un patrón nuevo sin validar), `fechaEjecutoria`, `fechaExigibilidad`, `documentoSoporteEjecutoria`, `remisionTesoreria` (belongsTo `RemisionAutoridad`, reutilización), `referenciaExternaRecaudo` (texto libre, integración con sistema financiero municipal marcada "por validar" en el modelo fuente), `fechaAlertaControl` (manual, sin automatización), `estadoRecaudo` (enum PROPUESTA_CRM: Remitida/Registrada en Tesorería/Pendiente de pago/En seguimiento/Pagada/En acuerdo de pago/En cobro coactivo/Cerrada — el propio BPMN deja este catálogo abierto: "pagado, pendiente, en seguimiento, en cobro, acuerdo u otro estado definido institucionalmente"), `observaciones`, `fechaActualizacionExpediente`.
- Se agregaron únicamente links recíprocos hasMany (sin tocar ningún otro campo/hook) en `Case`, `Expediente`, `MedidaCorrectiva`, `EjecucionMedidaCorrectiva` y `RemisionAutoridad`.

## Archivos afectados

| Acción | Ruta | Propósito |
|---|---|---|
| Creado | `Resources/metadata/entityDefs/ObligacionPecuniaria.json`, `Entities/ObligacionPecuniaria.php`, `Controllers/ObligacionPecuniaria.php`, `Resources/metadata/scopes/ObligacionPecuniaria.json`, `Resources/metadata/clientDefs/ObligacionPecuniaria.json`, `Resources/i18n/es_ES/ObligacionPecuniaria.json`, `Resources/layouts/ObligacionPecuniaria/*` | Definición de la entidad |
| Modificado | `Resources/metadata/entityDefs/{Case,Expediente,MedidaCorrectiva,EjecucionMedidaCorrectiva,RemisionAutoridad}.json` + sus i18n | Links recíprocos `obligacionesPecuniarias`/`obligacionPecuniaria` |
| Modificado | `scripts/roles/configure-roles-modelo-preliminar.php` | ACL Inspector Ambiental (crea/edita todo), Secretario de Despacho (lectura) |
| Modificado | `scripts/configure-full-access-all-roles.php` | Agregada la entidad al `$scopes` de acceso completo (incluye Apoyo Jurídico) |

## Riesgos y dependencias

- `estadoRecaudo` es un catálogo PROPUESTA_CRM sin respaldo oficial — el propio BPMN deja el estado final abierto a definición institucional, revisar si en una validación posterior se define un catálogo cerrado.
- La integración con el sistema financiero/recaudo municipal está marcada "por validar" en el modelo fuente; `referenciaExternaRecaudo` es solo un campo de referencia manual, no hay integración real.
- No se automatizó ninguna transición de estado ni la fecha de alerta, siguiendo la advertencia explícita del BPMN contra automatizar cobro coactivo o declaración de mora.

## Validación

| Escenario probado | Resultado | Evidencia u observación |
|---|---|---|
| `php -l` sobre los 2 archivos PHP nuevos (dentro del contenedor) | Correcto | Sin errores de sintaxis |
| Validación JSON + ausencia de claves duplicadas en los 19 archivos tocados | Correcto | Verificado con `json.loads` y `object_pairs_hook` |
| `docker compose build && up --force-recreate` + revisión de logs | Correcto | Sin `ERROR`/`Exception`/`Fatal` |
| `GET /api/v1/ObligacionPecuniaria` (usuario `inspector`) | Correcto (200) tras aplicar ACL | |
| `MedidaCorrectiva` → `ObligacionPecuniaria` (usuario `inspector`) | Correcto | IDs reales encadenados |
| `RemisionAutoridad` (autoridadDestino="Secretaría de Hacienda - Tesorería") → vinculada como `remisionTesoreriaId` en `ObligacionPecuniaria` | Correcto | Reutilización sin ningún cambio a `RemisionAutoridad` |

## Despliegue y reversión

Desplegado en Docker local (`docker compose build espocrm && docker compose up -d --force-recreate espocrm espocrm-daemon espocrm-websocket`), `php clear_cache.php`/`rebuild.php`, y re-ejecución de los scripts de ACL dentro del contenedor. Pendiente desplegar a Dokploy. Reversión: revertir el commit de este ajuste.

## Documentación relacionada

| Documento | Acción requerida | Estado |
|---|---|---|
| `docs/PLAN-MODELO-FUNCIONAL-INSPECCION-AMBIENTAL.md` | Marcar "Ejecución Pecuniaria / Tesorería" como ✅ en el inventario de 28 BPMN | Pendiente |
