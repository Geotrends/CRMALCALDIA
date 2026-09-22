# Plan de implementación del modelo funcional (InspeccionAmbiental-Workflow)

**Última actualización:** 2026-09-22
**Fuente del modelo objetivo:** repo `InspeccionAmbiental-Workflow` (BPMN + `90_MODELO_CRM/`), tratado como fuente de verdad del flujo/procedimiento; este documento traduce ese modelo a un plan de implementación incremental sobre el CRM ya operativo.
**Relación con otros documentos:** este es el plan a futuro. El detalle de cada cambio ya hecho vive en `docs/ajustes/` (un registro por ajuste, con archivos afectados y validación). `docs/GUIA-HANDOFF-PROYECTO.md` sigue siendo la guía general de arquitectura.

## Por qué un plan incremental

El modelo objetivo define ~35 entidades conceptuales; el CRM actual, antes de este plan, implementaba el flujo con una sola entidad `Case` cargando casi todo el estado (recepción, asignación, visita técnica y cierre en un solo campo `status`). Migrar todo de una vez es alto riesgo para un sistema en producción. Se acordó con el usuario avanzar por fases, empezando por separar responsabilidades en el núcleo antes de construir las rutas jurídicas específicas.

## Estado por fase

### Fase 0 — Higiene técnica ✅ Hecho
Unificación de hooks duplicados entre `Hooks/CaseObj/` y `Classes/RecordHooks/CaseObj/`. Ver [`docs/ajustes/2026-09-22-fase0-unificacion-hooks-duplicados.md`](ajustes/2026-09-22-fase0-unificacion-hooks-duplicados.md).

### Fase 1 — Núcleo: separar estados por entidad ✅ Hecho (validado localmente, no desplegado a producción)
- Entidades `GestionTecnica` y `DecisionRutaJuridica`.
- `Case.status` simplificado (10 → 8 valores), con la separación de estados por entidad.
- `Destino` y `RelacionCasos` (agrupación operativa de casos, sin fusionarlos).
- Acción "Relacionar con otro caso" y navegación real al Expediente desde el Case.
- Ver [`2026-09-22-fase1-gestion-tecnica-decision-ruta-juridica.md`](ajustes/2026-09-22-fase1-gestion-tecnica-decision-ruta-juridica.md) y [`2026-09-22-destino-relacion-casos.md`](ajustes/2026-09-22-destino-relacion-casos.md).

**Pendiente dentro de esta fase:**
- Ejecutar `scripts/migrate-case-status-gestion-tecnica.php` contra la base de producción (solo listo, no corrido).
- Configurar ACL fina por rol para `GestionTecnica`/`DecisionRutaJuridica`/`Destino`/`RelacionCasos` (hoy tienen acceso completo todos los roles operativos, vía `scripts/configure-full-access-all-roles.php`, como el resto de entidades del proyecto — no se restringió por rol todavía).
- Panel embebido de `GestionTecnica`/`DecisionRutaJuridica` en el detalle del Case (hoy se navegan desde su propio menú/lista estándar; el usuario eligió esta opción para no construir un panel custom prematuramente).
- Actualizar `docs/GUIA-HANDOFF-PROYECTO.md` y `docs/MANUAL-USUARIO-CRM-AMBIENTAL.md` con las entidades y el flujo nuevos.
- Desplegar a Dokploy (todo el trabajo de Fase 0 y 1 está solo en el entorno Docker local).

### Fase 2 — Rutas jurídicas 🔲 No iniciada
Cada ruta necesita, como mínimo: subestados propios dentro de `Expediente`/`ActuacionJuridica`, formatos específicos, y en las rutas de Policía, las entidades `Audiencia` + `OrdenPolicia` + `MedidaCorrectiva` (el modelo es explícito: estas tres figuras nunca se convierten automáticamente unas en otras). Prioridad acordada con el usuario (las tres, sin orden fijo definido todavía):
- Recursos Naturales (competencia municipal) — la más cercana a lo que ya existe (similar al Auto de Archivo actual).
- Maltrato / Convivencia Animal + Registro Canino de Manejo Especial — tres procedimientos separados aunque suenen parecidos, no deben compartir entidad.
- Proceso Verbal Inmediato / Abreviado (Código de Policía) — la más pesada: trae `Audiencia`, `SuspensionAudiencia`, `GrabacionAudiencia`, `Recurso`, `MovimientoExpediente`.

### Fase 3 — Medidas correctivas, cierre formal y RNMC 🔲 No iniciada
- `MedidaCorrectiva` + `EjecucionMedidaCorrectiva` + `VerificacionCumplimiento`.
- `CierreExpediente` con checklist de pendientes (hoy `ActuoArchivo` cierra sin verificar medidas/recursos/notificaciones pendientes).
- `ActuacionRNMC` — solo si la Alcaldía confirma el mecanismo de integración; el modelo marca esto explícitamente como "por validar", no debe automatizarse sin confirmación institucional.

## Lo que el modelo dice que NO se debe automatizar

El repo fuente es explícito: varias transiciones requieren decisión humana explícita, nunca automática (agrupar casos → abrir expediente; resultado técnico desfavorable → apertura de expediente; auto de archivo → cierre de caso). Y hay puntos marcados "POR VALIDAR" institucionalmente (Formato 022, integración DÉBORA, integración RNMC, FILMA, ALIB/ALIBC) que deben implementarse como campos/catálogos configurables, no como reglas de negocio duras, hasta confirmación de la Alcaldía.

## Convención de seguimiento

Cada cambio que avance este plan debe registrarse en `docs/ajustes/` siguiendo `PLANTILLA-AJUSTE.md`, y este documento debe actualizarse para mover la fase correspondiente de 🔲 a ✅ (o a "en curso") y enlazar el registro nuevo.
