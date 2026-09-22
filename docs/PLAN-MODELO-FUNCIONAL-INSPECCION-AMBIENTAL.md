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
- Roles y usuarios alineados a `90_MODELO_CRM/matriz_roles_v1.0.md`: 4 roles operativos migrados a su nombre oficial (mismo ACL), 9 roles nuevos creados con ACL preliminar a nivel de entidad, un usuario de prueba por rol.
- Ver [`2026-09-22-fase1-gestion-tecnica-decision-ruta-juridica.md`](ajustes/2026-09-22-fase1-gestion-tecnica-decision-ruta-juridica.md), [`2026-09-22-destino-relacion-casos.md`](ajustes/2026-09-22-destino-relacion-casos.md) y [`2026-09-22-roles-nombres-bpmn.md`](ajustes/2026-09-22-roles-nombres-bpmn.md).

**Pendiente dentro de esta fase:**
- Ejecutar `scripts/migrate-case-status-gestion-tecnica.php` contra la base de producción (solo listo, no corrido).
- Configurar ACL fina por rol para `GestionTecnica`/`DecisionRutaJuridica`/`Destino`/`RelacionCasos` (hoy tienen acceso completo todos los roles operativos, vía `scripts/configure-full-access-all-roles.php`, como el resto de entidades del proyecto — no se restringió por rol todavía).
- Afinar el ACL preliminar de los 9 roles nuevos del modelo (permisos a nivel de campo, no solo de entidad; filtrar Case por tipo de asunto donde aplique).
- Decidir si se separa el rol `Inspección` en sus 3 funciones reales del modelo (Auxiliar·Inspección, Profesional, Inspector) — hoy siguen fusionadas.
- Panel embebido de `GestionTecnica`/`DecisionRutaJuridica` en el detalle del Case (hoy se navegan desde su propio menú/lista estándar; el usuario eligió esta opción para no construir un panel custom prematuramente).
- Actualizar `docs/GUIA-HANDOFF-PROYECTO.md` y `docs/MANUAL-USUARIO-CRM-AMBIENTAL.md` con las entidades y el flujo nuevos.
- Desplegar a Dokploy (todo el trabajo de Fase 0 y 1 está solo en el entorno Docker local).

### Fase 2 — Rutas jurídicas 🟡 En curso

**Recursos Naturales (competencia municipal) — primer corte hecho.** Se investigó el BPMN activo (`recursos_naturales_municipal_v1.4.bpmn`) antes de programar: la ruta es en esencia un enrutador — 2 de sus 3 desenlaces (Policiva/PVA, Ambiental Preventiva) delegan a otros procesos N2 que todavía no existen en el CRM; el tercero (Auto de Archivo) ya existe. Lo único nuevo construido: entidad `RemisionAutoridad` (remisión a otra autoridad, con seguimiento). El campo `resultado` de `DecisionRutaJuridica` (de Fase 1) ya cubría las 3 ramas de la decisión sin haberlo planeado así. Ver [`2026-09-22-fase2-recursos-naturales-remision-autoridad.md`](ajustes/2026-09-22-fase2-recursos-naturales-remision-autoridad.md).

**Ambiental Preventiva / Remisión a Autoridad Ambiental — hecho.** Es la otra rama directa de Recursos Naturales. Su compuerta de "¿procede medida preventiva municipal?" converge, con o sin medida, en el mismo registro de `RemisionAutoridad` — por eso se extendió esa entidad con campos opcionales de medida preventiva en vez de crear una entidad nueva (ni el BPMN ni `domain.json` definen una entidad propia para eso). Ver [`2026-09-22-fase2-ambiental-preventiva-medida-preventiva.md`](ajustes/2026-09-22-fase2-ambiental-preventiva-medida-preventiva.md).

**Proceso Verbal Abreviado · Convivencia — N2 completo.** Se investigaron los 7 BPMN activos de esta ruta (N2 principal + los 6 N3: Audiencia, Determinación de Medidas Correctivas, Gestión y Ejecución de Medidas Correctivas, Orden de Policía, Notificación y Ejecutoria, Recursos y Segunda Instancia) antes de programar. Entidades construidas: `Audiencia`, `SuspensionAudiencia`, `GrabacionAudiencia`, `OrdenPolicia`, `MedidaCorrectiva`, `EjecucionMedidaCorrectiva`, `NotificacionActo`, `Recurso`, `MovimientoExpediente` (esta última, hallazgo no anticipado: el BPMN de Recursos y Segunda Instancia exige explícitamente crear/cerrar un `MovimientoExpediente` al remitir/devolver el expediente físico en segunda instancia). Se omitió `ActuacionJuridica` como entidad intermedia (simplificación deliberada). Ver [`2026-09-22-fase2-pva-audiencia.md`](ajustes/2026-09-22-fase2-pva-audiencia.md) y [`2026-09-22-fase2-pva-orden-medidas-notificacion-recurso.md`](ajustes/2026-09-22-fase2-pva-orden-medidas-notificacion-recurso.md).

Con esto, las 3 ramas de Recursos Naturales tienen construcción real (Auto de Archivo ya existía; Remisión a Autoridad y Ambiental Preventiva completas; PVA con su N2 completo).

Pendiente de Fase 2 (sin orden fijo definido):
- Maltrato / Convivencia Animal + Registro Canino de Manejo Especial — tres procedimientos separados aunque suenen parecidos, no deben compartir entidad.
- `VerificacionCumplimiento` — entidad relacionada con `OrdenPolicia`/`MedidaCorrectiva`/`RecomendacionTecnica` en el modelo, no construida todavía: tiene una dependencia obligatoria (`intervencionTecnicaId` no opcional) que requiere resolverse antes de modelarla.
- `ReporteRNMC` — sigue en Fase 3 (medidas correctivas, cierre formal y RNMC), como estaba planeado.
- Vacíos reales detectados en el modelo fuente (no inventar, confirmar antes de dar por definitivo): `estados.md` no define catálogo oficial de estados para `OrdenPolicia` ni tenía uno para `SuspensionAudiencia` (ambos con estados propuestos, a validar); ninguno de los BPMN N3 de esta ruta usa `callActivity` de forma consistente (algunos solo referencian el subproceso siguiente en texto); `formatos.json` no tiene ningún formato IV-F confirmado para Determinación ni para Gestión y Ejecución de Medidas Correctivas.

### Fase 3 — Medidas correctivas, cierre formal y RNMC 🔲 No iniciada
- `MedidaCorrectiva` + `EjecucionMedidaCorrectiva` + `VerificacionCumplimiento`.
- `CierreExpediente` con checklist de pendientes (hoy `ActuoArchivo` cierra sin verificar medidas/recursos/notificaciones pendientes).
- `ActuacionRNMC` — solo si la Alcaldía confirma el mecanismo de integración; el modelo marca esto explícitamente como "por validar", no debe automatizarse sin confirmación institucional.

## Lo que el modelo dice que NO se debe automatizar

El repo fuente es explícito: varias transiciones requieren decisión humana explícita, nunca automática (agrupar casos → abrir expediente; resultado técnico desfavorable → apertura de expediente; auto de archivo → cierre de caso). Y hay puntos marcados "POR VALIDAR" institucionalmente (Formato 022, integración DÉBORA, integración RNMC, FILMA, ALIB/ALIBC) que deben implementarse como campos/catálogos configurables, no como reglas de negocio duras, hasta confirmación de la Alcaldía.

## Convención de seguimiento

Cada cambio que avance este plan debe registrarse en `docs/ajustes/` siguiendo `PLANTILLA-AJUSTE.md`, y este documento debe actualizarse para mover la fase correspondiente de 🔲 a ✅ (o a "en curso") y enlazar el registro nuevo.
