# Ajuste: Fase 2 — Ambiental Preventiva / Remisión, campos de medida preventiva en RemisionAutoridad

| Campo | Detalle |
|---|---|
| Fecha | 2026-09-22 |
| Estado | Validado localmente |
| Responsable | Claude Code (sesión con Jonathan Ochoa) |
| Áreas o roles impactados | Inspector Ambiental, Apoyo Jurídico |
| Versión de despliegue | local (Docker, no desplegado a Dokploy) |

## Objetivo

Continuar la Fase 2 cubriendo la ruta "Ambiental Preventiva / Remisión a Autoridad Ambiental" (`ambiental_preventiva_remision_v1.1.bpmn`, versión activa según `viewer/public/config.json`) — la otra rama directa de Recursos Naturales.

## Alcance funcional

Se investigó el BPMN antes de programar. Hallazgo clave: el flujo tiene una compuerta ("¿procede medida preventiva municipal?") con dos ramas — con medida previa (elaborar/imponer el acto, luego remitir) o sin medida (remitir antecedentes directamente) — y **ambas ramas convergen en el mismo paso "Registrar RemisiónAutoridad"**. Ni el BPMN ni el modelo de dominio (`domain.json`) definen una entidad separada para la medida preventiva ambiental — es un vacío también en el modelo fuente, no solo en el CRM.

Decisión: en vez de crear una entidad nueva (`MedidaPreventivaAmbiental`), se extendió `RemisionAutoridad` con campos opcionales para la medida preventiva, porque es más fiel a cómo el propio BPMN modela la convergencia de ambas ramas en un solo registro.

**Ambigüedad del repo fuente, no resuelta por decisión propia**: el paso de cierre de esta ruta (`callActivity` A8) referencia por nombre un proceso ("Cierre Formal y Documental del Expediente v1.0") que no coincide con el que está marcado como versión ACTIVA en `config.json` para ese dominio ("Auto de Archivo y Cierre Documental del Expediente v1.1"). No se intentó resolver esta ambigüedad adivinando — se sigue usando `ActuoArchivo`, que ya cubre el cierre en el CRM de forma genérica para todas las rutas.

## Diseño y decisión técnica

Campos nuevos en `RemisionAutoridad`:
- `medidaPreventivaImpuesta` (bool, default false) — si se impuso medida preventiva municipal antes de remitir.
- `medidaPreventivaFundamento` (text) — fundamento normativo y alcance de la medida.
- `medidaPreventivaFechaImposicion` (date).
- `medidaPreventivaDocumento` (file) — el acto/documento de la medida (IV-F-117 u otro cuando aplique).

Sin entidad nueva, sin cambios de ACL (ya cubierto por la configuración de `RemisionAutoridad` del ajuste anterior).

## Archivos afectados

| Acción | Ruta | Propósito |
|---|---|---|
| Modificado | `Resources/metadata/entityDefs/RemisionAutoridad.json` | 4 campos nuevos de medida preventiva |
| Modificado | `Resources/layouts/RemisionAutoridad/detail.json`, `edit.json` | Panel "Medida preventiva (si aplica)" |
| Modificado | `Resources/i18n/es_ES/RemisionAutoridad.json` | Etiquetas de los campos nuevos |

## Riesgos y dependencias

- El formato "Oficio a Autoridad Ambiental" (`oficioDocumento`) sigue marcado **POR VALIDAR** institucionalmente en `formatos.json` — no se hardcodeó ningún nombre/código de plantilla.
- Los `callActivity` A4 (Notificación y Ejecutoria) y A8 (Cierre) del BPMN no tienen `calledElement` explícito en el XML fuente; se asume que ya están cubiertos por los flujos/entidades genéricos existentes del CRM, no se modeló nada específico para ellos en este ajuste.

## Validación

| Escenario probado | Resultado | Evidencia u observación |
|---|---|---|
| Crear una `RemisionAutoridad` con `medidaPreventivaImpuesta: true` y fundamento, con el usuario `inspector` | Correcto | Respuesta 200, campos guardados correctamente |

## Despliegue y reversión

Desplegado en Docker local. Pendiente desplegar a Dokploy. Reversión: revertir el commit de este ajuste (son campos opcionales, sin riesgo de romper registros existentes de `RemisionAutoridad`).

## Documentación relacionada

| Documento | Acción requerida | Estado |
|---|---|---|
| `docs/PLAN-MODELO-FUNCIONAL-INSPECCION-AMBIENTAL.md` | Marcar avance de Fase 2 | Pendiente |
